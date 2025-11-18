const { esClient } = require('../config/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.indexPattern = process.env.ES_INDEX_PATTERN || 'zeek-*';
    this.dataWindowHours = parseInt(process.env.DATA_WINDOW_HOURS || '24');
  }

  /**
   * Get network topology data from Zeek connection logs
   */
  async getNetworkTopology(filters = {}) {
    const { timeRange, sourceIp, destIp, subnet, minBytes } = filters;

    const must = [];

    // Time range filter
    const hoursAgo = timeRange || this.dataWindowHours;
    must.push({
      range: {
        '@timestamp': {
          gte: `now-${hoursAgo}h`,
          lte: 'now'
        }
      }
    });

    // IP filters
    if (sourceIp) {
      must.push({ term: { 'id.orig_h': sourceIp } });
    }
    if (destIp) {
      must.push({ term: { 'id.resp_h': destIp } });
    }
    if (subnet) {
      must.push({
        bool: {
          should: [
            { prefix: { 'id.orig_h': subnet } },
            { prefix: { 'id.resp_h': subnet } }
          ]
        }
      });
    }

    // Traffic volume filter
    if (minBytes) {
      must.push({
        range: {
          'orig_bytes': { gte: minBytes }
        }
      });
    }

    try {
      const response = await esClient.search({
        index: this.indexPattern,
        size: 0, // We only need aggregations
        body: {
          query: {
            bool: { must }
          },
          aggs: {
            // Aggregate connections
            connections: {
              composite: {
                size: 10000,
                sources: [
                  { source_ip: { terms: { field: 'id.orig_h' } } },
                  { dest_ip: { terms: { field: 'id.resp_h' } } },
                  { dest_port: { terms: { field: 'id.resp_p' } } },
                  { protocol: { terms: { field: 'proto' } } }
                ]
              },
              aggs: {
                total_bytes: { sum: { field: 'orig_bytes' } },
                total_packets: { sum: { field: 'orig_pkts' } },
                conn_count: { value_count: { field: '_id' } },
                services: { terms: { field: 'service', size: 10 } },
                conn_states: { terms: { field: 'conn_state', size: 20 } }
              }
            },
            // Get unique source IPs
            unique_sources: {
              cardinality: { field: 'id.orig_h' }
            },
            // Get unique destination IPs
            unique_destinations: {
              cardinality: { field: 'id.resp_h' }
            },
            // Top protocols
            top_protocols: {
              terms: { field: 'proto', size: 20 }
            },
            // Top services
            top_services: {
              terms: { field: 'service', size: 50 }
            }
          }
        }
      });

      return this.formatTopologyData(response);
    } catch (error) {
      console.error('Error querying Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Format Elasticsearch response into network topology structure
   */
  formatTopologyData(esResponse) {
    const nodes = new Map();
    const edges = [];
    const stats = {
      uniqueSources: esResponse.aggregations.unique_sources.value,
      uniqueDestinations: esResponse.aggregations.unique_destinations.value,
      protocols: esResponse.aggregations.top_protocols.buckets,
      services: esResponse.aggregations.top_services.buckets
    };

    // Process connections
    const connections = esResponse.aggregations.connections.buckets;

    connections.forEach(bucket => {
      const sourceIp = bucket.key.source_ip;
      const destIp = bucket.key.dest_ip;
      const destPort = bucket.key.dest_port;
      const protocol = bucket.key.protocol;
      const bytes = bucket.total_bytes.value;
      const packets = bucket.total_packets.value;
      const connCount = bucket.conn_count.value;
      const services = bucket.services.buckets.map(b => b.key);
      const connStates = bucket.conn_states.buckets;

      // Add source node
      if (!nodes.has(sourceIp)) {
        nodes.set(sourceIp, {
          id: sourceIp,
          ip: sourceIp,
          type: this.classifyNode(sourceIp),
          subnet: this.getSubnet(sourceIp),
          isInternal: this.isInternalIp(sourceIp),
          totalBytesSent: 0,
          totalBytesReceived: 0,
          connections: 0
        });
      }
      nodes.get(sourceIp).totalBytesSent += bytes;
      nodes.get(sourceIp).connections += connCount;

      // Add destination node
      if (!nodes.has(destIp)) {
        nodes.set(destIp, {
          id: destIp,
          ip: destIp,
          type: this.classifyNode(destIp, destPort, services),
          subnet: this.getSubnet(destIp),
          isInternal: this.isInternalIp(destIp),
          totalBytesSent: 0,
          totalBytesReceived: 0,
          connections: 0
        });
      }
      nodes.get(destIp).totalBytesReceived += bytes;
      nodes.get(destIp).connections += connCount;

      // Add edge
      edges.push({
        id: `${sourceIp}-${destIp}-${destPort}-${protocol}`,
        source: sourceIp,
        target: destIp,
        destPort,
        protocol,
        bytes,
        packets,
        connections: connCount,
        services,
        connStates: connStates.map(b => ({ state: b.key, count: b.doc_count }))
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
      stats
    };
  }

  /**
   * Classify node type based on IP and behavior
   */
  classifyNode(ip, port = null, services = []) {
    // Router/Gateway detection (common gateway IPs)
    if (ip.endsWith('.1') || ip.endsWith('.254')) {
      return 'router';
    }

    // Server detection based on services
    if (services.includes('http') || services.includes('https') || services.includes('ssl')) {
      return 'web_server';
    }
    if (services.includes('dns')) {
      return 'dns_server';
    }
    if (services.includes('ssh')) {
      return 'server';
    }

    // Common server ports
    if (port) {
      const serverPorts = [80, 443, 22, 21, 25, 53, 3389, 3306, 5432, 6379, 9200];
      if (serverPorts.includes(port)) {
        return 'server';
      }
    }

    return 'host';
  }

  /**
   * Extract /24 subnet from IP
   */
  getSubnet(ip) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return 'unknown';
  }

  /**
   * Check if IP is internal (RFC 1918)
   */
  isInternalIp(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    return false;
  }

  /**
   * Get detailed connection information
   */
  async getConnectionDetails(sourceIp, destIp, timeRange = 1) {
    try {
      const response = await esClient.search({
        index: this.indexPattern,
        size: 100,
        body: {
          query: {
            bool: {
              must: [
                { term: { 'id.orig_h': sourceIp } },
                { term: { 'id.resp_h': destIp } },
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${timeRange}h`,
                      lte: 'now'
                    }
                  }
                }
              ]
            }
          },
          sort: [{ '@timestamp': 'desc' }]
        }
      });

      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      console.error('Error getting connection details:', error);
      throw error;
    }
  }

  /**
   * Search for specific IPs or patterns
   */
  async searchNetwork(query, timeRange = 24) {
    try {
      const response = await esClient.search({
        index: this.indexPattern,
        size: 1000,
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    query: `*${query}*`,
                    fields: ['id.orig_h', 'id.resp_h', 'service', 'proto']
                  }
                },
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${timeRange}h`,
                      lte: 'now'
                    }
                  }
                }
              ]
            }
          }
        }
      });

      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      console.error('Error searching network:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();
