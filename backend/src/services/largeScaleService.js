const { esClient } = require('../config/elasticsearch');

/**
 * Service optimized for large-scale deployments (110k+ hosts)
 * Uses pagination, streaming, and optimized queries
 */
class LargeScaleService {
  constructor() {
    this.indexPattern = process.env.ES_INDEX_PATTERN || 'zeek-*';
    this.maxResultWindow = 100000; // ES default max_result_window
  }

  /**
   * Get paginated connections with all metadata fields
   * Optimized for 110k+ connections
   */
  async getPaginatedConnections(filters = {}, page = 0, pageSize = 1000) {
    const {
      timeRange = 24,
      sourceIp,
      destIp,
      subnet,
      protocol,
      destPort,
      minDestPort,
      maxDestPort,
      service,
      connState,
      minDuration,
      maxDuration,
      minOrigBytes,
      maxOrigBytes,
      minRespBytes,
      maxRespBytes,
      external,
      internal,
      vlan,
      communityId
    } = filters;

    const must = [];
    const filter = [];

    // Time range
    must.push({
      range: {
        '@timestamp': {
          gte: `now-${timeRange}h`,
          lte: 'now'
        }
      }
    });

    // IP filters
    if (sourceIp) {
      filter.push({ term: { 'id.orig_h': sourceIp } });
    }
    if (destIp) {
      filter.push({ term: { 'id.resp_h': destIp } });
    }
    if (subnet) {
      filter.push({
        bool: {
          should: [
            { prefix: { 'id.orig_h': subnet } },
            { prefix: { 'id.resp_h': subnet } }
          ]
        }
      });
    }

    // Protocol/Service filters
    if (protocol) {
      filter.push({ term: { 'proto': protocol } });
    }
    if (service) {
      filter.push({ term: { 'service': service } });
    }
    if (connState) {
      filter.push({ term: { 'conn_state': connState } });
    }

    // Port filters
    if (destPort) {
      filter.push({ term: { 'id.resp_p': destPort } });
    }
    if (minDestPort || maxDestPort) {
      const portRange = {};
      if (minDestPort) portRange.gte = minDestPort;
      if (maxDestPort) portRange.lte = maxDestPort;
      filter.push({ range: { 'id.resp_p': portRange } });
    }

    // Duration filters
    if (minDuration || maxDuration) {
      const durationRange = {};
      if (minDuration) durationRange.gte = minDuration;
      if (maxDuration) durationRange.lte = maxDuration;
      filter.push({ range: { 'duration': durationRange } });
    }

    // Byte filters
    if (minOrigBytes || maxOrigBytes) {
      const origBytesRange = {};
      if (minOrigBytes) origBytesRange.gte = minOrigBytes;
      if (maxOrigBytes) origBytesRange.lte = maxOrigBytes;
      filter.push({ range: { 'orig_bytes': origBytesRange } });
    }
    if (minRespBytes || maxRespBytes) {
      const respBytesRange = {};
      if (minRespBytes) respBytesRange.gte = minRespBytes;
      if (maxRespBytes) respBytesRange.lte = maxRespBytes;
      filter.push({ range: { 'resp_bytes': respBytesRange } });
    }

    // Local/External filters
    if (internal !== undefined) {
      filter.push({ term: { 'local_orig': internal } });
    }
    if (external !== undefined) {
      filter.push({ term: { 'local_resp': !external } });
    }

    // VLAN filter
    if (vlan) {
      filter.push({ term: { 'vlan': vlan } });
    }

    // Community ID filter
    if (communityId) {
      filter.push({ term: { 'community_id': communityId } });
    }

    try {
      // Use search_after for deep pagination (better than from/size)
      const queryBody = {
        query: {
          bool: { must, filter }
        },
        sort: [
          { '@timestamp': { order: 'desc' } },
          { '_id': { order: 'asc' } } // Tie-breaker
        ],
        size: pageSize,
        _source: [
          '@timestamp',
          'uid',
          'id.orig_h',
          'id.orig_p',
          'id.resp_h',
          'id.resp_p',
          'proto',
          'service',
          'duration',
          'orig_bytes',
          'resp_bytes',
          'conn_state',
          'local_orig',
          'local_resp',
          'missed_bytes',
          'history',
          'orig_pkts',
          'resp_pkts',
          'orig_ip_bytes',
          'resp_ip_bytes',
          'tunnel_parents',
          'community_id',
          'vlan',
          'inner_vlan',
          'orig_l2_addr',
          'resp_l2_addr'
        ]
      };

      // For pagination beyond first page, use Point in Time (PIT) for efficiency
      let response;
      if (page === 0) {
        response = await esClient.search({
          index: this.indexPattern,
          body: queryBody
        });
      } else {
        // For deep pagination, we'd use PIT here
        // Simplified for now - in production, implement PIT for scale
        queryBody.from = page * pageSize;
        response = await esClient.search({
          index: this.indexPattern,
          body: queryBody
        });
      }

      const connections = response.hits.hits.map(hit => ({
        id: hit._source.uid || hit._id,
        timestamp: hit._source['@timestamp'],
        sourceIp: hit._source.id?.orig_h,
        sourcePort: hit._source.id?.orig_p,
        destIp: hit._source.id?.resp_h,
        destPort: hit._source.id?.resp_p,
        protocol: hit._source.proto,
        service: hit._source.service,
        duration: hit._source.duration,
        origBytes: hit._source.orig_bytes || 0,
        respBytes: hit._source.resp_bytes || 0,
        origPackets: hit._source.orig_pkts || 0,
        respPackets: hit._source.resp_pkts || 0,
        origIpBytes: hit._source.orig_ip_bytes,
        respIpBytes: hit._source.resp_ip_bytes,
        connState: hit._source.conn_state,
        localOrig: hit._source.local_orig,
        localResp: hit._source.local_resp,
        missedBytes: hit._source.missed_bytes,
        history: hit._source.history,
        tunnelParents: hit._source.tunnel_parents,
        communityId: hit._source.community_id,
        vlan: hit._source.vlan,
        innerVlan: hit._source.inner_vlan,
        origL2Addr: hit._source.orig_l2_addr,
        respL2Addr: hit._source.resp_l2_addr,
        // Additional fields for large scale
        _score: hit._score,
        _index: hit._index,
        _sortValues: hit.sort // For search_after pagination
      }));

      // Get total count (expensive for large datasets, cap at 10k for performance)
      const total = typeof response.hits.total === 'object'
        ? Math.min(response.hits.total.value, this.maxResultWindow)
        : response.hits.total;

      return {
        connections,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: connections.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching paginated connections:', error);
      throw error;
    }
  }

  /**
   * Get connection count only (fast)
   * Useful for showing "X of Y connections" without fetching data
   */
  async getConnectionCount(filters = {}) {
    // Build same query as getPaginatedConnections but only count
    const { timeRange = 24, sourceIp, destIp, protocol, service } = filters;

    const must = [];
    const filter = [];

    must.push({
      range: {
        '@timestamp': {
          gte: `now-${timeRange}h`,
          lte: 'now'
        }
      }
    });

    if (sourceIp) filter.push({ term: { 'id.orig_h': sourceIp } });
    if (destIp) filter.push({ term: { 'id.resp_h': destIp } });
    if (protocol) filter.push({ term: { 'proto': protocol } });
    if (service) filter.push({ term: { 'service': service } });

    try {
      const response = await esClient.count({
        index: this.indexPattern,
        body: {
          query: {
            bool: { must, filter }
          }
        }
      });

      return response.count;
    } catch (error) {
      console.error('Error counting connections:', error);
      return 0;
    }
  }

  /**
   * Stream connections for export (handles millions of rows)
   * Uses scroll API for efficient streaming
   */
  async *streamConnections(filters = {}, scrollSize = 5000) {
    const { timeRange = 24 } = filters;

    const must = [{
      range: {
        '@timestamp': {
          gte: `now-${timeRange}h`,
          lte: 'now'
        }
      }
    }];

    try {
      // Initialize scroll
      let response = await esClient.search({
        index: this.indexPattern,
        scroll: '5m',
        size: scrollSize,
        body: {
          query: {
            bool: { must }
          },
          _source: true
        }
      });

      let scrollId = response._scroll_id;

      while (response.hits.hits.length > 0) {
        // Yield batch of connections
        yield response.hits.hits.map(hit => hit._source);

        // Get next batch
        response = await esClient.scroll({
          scroll_id: scrollId,
          scroll: '5m'
        });

        scrollId = response._scroll_id;
      }

      // Clear scroll
      if (scrollId) {
        await esClient.clearScroll({ scroll_id: scrollId });
      }
    } catch (error) {
      console.error('Error streaming connections:', error);
      throw error;
    }
  }

  /**
   * Get aggregated metrics for large datasets
   * Optimized for 110k+ hosts
   */
  async getAggregatedMetrics(filters = {}) {
    const { timeRange = 24 } = filters;

    try {
      const response = await esClient.search({
        index: this.indexPattern,
        size: 0,
        body: {
          query: {
            bool: {
              must: [{
                range: {
                  '@timestamp': {
                    gte: `now-${timeRange}h`,
                    lte: 'now'
                  }
                }
              }]
            }
          },
          aggs: {
            total_connections: {
              value_count: { field: '_id' }
            },
            unique_sources: {
              cardinality: { field: 'id.orig_h', precision_threshold: 40000 } // Increased for 110k hosts
            },
            unique_destinations: {
              cardinality: { field: 'id.resp_h', precision_threshold: 40000 }
            },
            total_bytes_sent: {
              sum: { field: 'orig_bytes' }
            },
            total_bytes_received: {
              sum: { field: 'resp_bytes' }
            },
            protocols: {
              terms: { field: 'proto', size: 20 }
            },
            top_talkers: {
              terms: { field: 'id.orig_h', size: 100, order: { total_bytes: 'desc' } },
              aggs: {
                total_bytes: {
                  sum: { field: 'orig_bytes' }
                }
              }
            },
            top_destinations: {
              terms: { field: 'id.resp_h', size: 100 }
            },
            connection_states: {
              terms: { field: 'conn_state', size: 20 }
            }
          }
        }
      });

      return {
        totalConnections: response.aggregations.total_connections.value,
        uniqueSources: response.aggregations.unique_sources.value,
        uniqueDestinations: response.aggregations.unique_destinations.value,
        totalBytesSent: response.aggregations.total_bytes_sent.value,
        totalBytesReceived: response.aggregations.total_bytes_received.value,
        protocols: response.aggregations.protocols.buckets,
        topTalkers: response.aggregations.top_talkers.buckets,
        topDestinations: response.aggregations.top_destinations.buckets,
        connectionStates: response.aggregations.connection_states.buckets
      };
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      throw error;
    }
  }
}

module.exports = new LargeScaleService();
