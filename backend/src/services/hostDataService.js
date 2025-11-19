const { esClient } = require('../config/elasticsearch');

class HostDataService {
  constructor() {
    this.indexPattern = process.env.ES_HOST_INDEX_PATTERN || 'endpoint-*,beats-*';
  }

  /**
   * Get host/endpoint data for an IP address
   * Supports Elastic Agent, Beats, Osquery, etc.
   */
  async getHostData(ip, timeRange = 24) {
    try {
      const response = await esClient.search({
        index: this.indexPattern,
        size: 100,
        body: {
          query: {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      { term: { 'host.ip': ip } },
                      { term: { 'source.ip': ip } },
                      { term: { 'destination.ip': ip } }
                    ]
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
          },
          sort: [{ '@timestamp': 'desc' }],
          aggs: {
            processes: {
              terms: { field: 'process.name', size: 50 }
            },
            users: {
              terms: { field: 'user.name', size: 20 }
            },
            event_types: {
              terms: { field: 'event.type', size: 20 }
            }
          }
        }
      });

      const hits = response.hits.hits.map(hit => hit._source);

      return {
        ip,
        hostInfo: this.extractHostInfo(hits),
        processes: response.aggregations.processes.buckets.map(b => ({
          name: b.key,
          count: b.doc_count
        })),
        users: response.aggregations.users.buckets.map(b => ({
          name: b.key,
          count: b.doc_count
        })),
        eventTypes: response.aggregations.event_types.buckets.map(b => ({
          type: b.key,
          count: b.doc_count
        })),
        recentEvents: hits.slice(0, 20)
      };
    } catch (error) {
      console.error('Error getting host data:', error);
      return null;
    }
  }

  extractHostInfo(hits) {
    if (hits.length === 0) return null;

    const latest = hits[0];

    return {
      hostname: latest.host?.hostname || latest.host?.name || 'Unknown',
      os: {
        name: latest.host?.os?.name,
        family: latest.host?.os?.family,
        version: latest.host?.os?.version,
        platform: latest.host?.os?.platform
      },
      agent: {
        type: latest.agent?.type,
        version: latest.agent?.version
      },
      architecture: latest.host?.architecture,
      mac: latest.host?.mac,
      domain: latest.host?.domain,
      uptime: latest.host?.uptime
    };
  }

  /**
   * Get process information for a connection
   */
  async getProcessForConnection(sourceIp, destIp, destPort, timestamp) {
    try {
      // Look for process events around the connection time
      const response = await esClient.search({
        index: this.indexPattern,
        size: 10,
        body: {
          query: {
            bool: {
              must: [
                { term: { 'source.ip': sourceIp } },
                { term: { 'destination.ip': destIp } },
                { term: { 'destination.port': destPort } },
                {
                  range: {
                    '@timestamp': {
                      gte: new Date(new Date(timestamp) - 60000).toISOString(), // 1 min before
                      lte: new Date(new Date(timestamp) + 60000).toISOString()  // 1 min after
                    }
                  }
                }
              ]
            }
          },
          sort: [{ '@timestamp': 'asc' }]
        }
      });

      if (response.hits.hits.length === 0) return null;

      const event = response.hits.hits[0]._source;

      return {
        name: event.process?.name,
        pid: event.process?.pid,
        executable: event.process?.executable,
        commandLine: event.process?.command_line,
        hash: event.process?.hash,
        user: event.user?.name,
        parent: {
          name: event.process?.parent?.name,
          pid: event.process?.parent?.pid
        }
      };
    } catch (error) {
      console.error('Error getting process for connection:', error);
      return null;
    }
  }

  /**
   * Get threat intelligence for an IP
   */
  async getThreatIntel(ip) {
    try {
      const response = await esClient.search({
        index: 'threat-*,ti-*',
        size: 10,
        body: {
          query: {
            bool: {
              should: [
                { term: { 'threat.indicator.ip': ip } },
                { term: { 'indicator.ip': ip } }
              ]
            }
          }
        }
      });

      return response.hits.hits.map(hit => ({
        type: hit._source.threat?.indicator?.type || hit._source.indicator?.type,
        confidence: hit._source.threat?.indicator?.confidence || hit._source.confidence,
        severity: hit._source.threat?.indicator?.severity || hit._source.severity,
        description: hit._source.threat?.indicator?.description || hit._source.description,
        source: hit._source.threat?.feed?.name || hit._source.feed,
        firstSeen: hit._source.threat?.indicator?.first_seen || hit._source.first_seen,
        lastSeen: hit._source.threat?.indicator?.last_seen || hit._source.last_seen
      }));
    } catch (error) {
      // Threat intel index might not exist
      return [];
    }
  }
}

module.exports = new HostDataService();
