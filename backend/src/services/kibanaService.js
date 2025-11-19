const crypto = require('crypto');

class KibanaService {
  constructor() {
    this.kibanaUrl = process.env.KIBANA_URL || 'https://kibana:5601';
    this.kibanaSpace = process.env.KIBANA_SPACE || 'default';
    this.indexPattern = process.env.ES_INDEX_PATTERN || 'zeek-*';
  }

  /**
   * Generate Kibana Discover URL for a specific connection
   */
  getDiscoverUrl(connection) {
    const baseUrl = `${this.kibanaUrl}/s/${this.kibanaSpace}/app/discover`;

    // Build query filter
    const filters = [
      {
        meta: {
          index: this.indexPattern,
          alias: null,
          negate: false,
          disabled: false
        },
        query: {
          bool: {
            must: [
              { term: { 'id.orig_h': connection.sourceIp } },
              { term: { 'id.resp_h': connection.destIp } },
              { term: { 'id.resp_p': connection.destPort } }
            ]
          }
        }
      }
    ];

    // Time range around the connection
    const time = {
      from: new Date(new Date(connection.timestamp) - 300000).toISOString(), // 5 min before
      to: new Date(new Date(connection.timestamp) + 300000).toISOString(),   // 5 min after
      mode: 'absolute'
    };

    const state = {
      filters,
      query: {
        query: '',
        language: 'kuery'
      },
      index: this.indexPattern
    };

    const encodedState = encodeURIComponent(JSON.stringify(state));
    const encodedTime = encodeURIComponent(JSON.stringify(time));

    return `${baseUrl}#/?_g=(time:${encodedTime})&_a=(filters:!(),index:'${this.indexPattern}',query:(language:kuery,query:'id.orig_h:${connection.sourceIp} AND id.resp_h:${connection.destIp} AND id.resp_p:${connection.destPort}'))`;
  }

  /**
   * Generate Kibana Discover URL for an IP address
   */
  getDiscoverUrlForIp(ip, timeRange = 24) {
    const baseUrl = `${this.kibanaUrl}/s/${this.kibanaSpace}/app/discover`;

    const query = `id.orig_h:${ip} OR id.resp_h:${ip}`;

    return `${baseUrl}#/?_g=(time:(from:now-${timeRange}h,to:now))&_a=(filters:!(),index:'${this.indexPattern}',query:(language:kuery,query:'${query}'))`;
  }

  /**
   * Generate Kibana Dashboard URL (if you have pre-built dashboards)
   */
  getDashboardUrl(dashboardId = null) {
    if (!dashboardId) {
      return `${this.kibanaUrl}/s/${this.kibanaSpace}/app/dashboards`;
    }

    return `${this.kibanaUrl}/s/${this.kibanaSpace}/app/dashboards#/view/${dashboardId}`;
  }

  /**
   * Generate Kibana Security URL for host investigation
   */
  getSecurityHostUrl(hostname) {
    const baseUrl = `${this.kibanaUrl}/s/${this.kibanaSpace}/app/security/hosts`;

    return `${baseUrl}/${hostname}`;
  }

  /**
   * Generate Kibana Network Map URL
   */
  getNetworkMapUrl() {
    return `${this.kibanaUrl}/s/${this.kibanaSpace}/app/security/network`;
  }

  /**
   * Generate timeline investigation URL
   */
  getTimelineUrl(filters = {}) {
    const baseUrl = `${this.kibanaUrl}/s/${this.kibanaSpace}/app/security/timelines`;

    // You can add pre-filled timeline filters here
    return baseUrl;
  }

  /**
   * Generate SIEM Cases URL
   */
  getCasesUrl() {
    return `${this.kibanaUrl}/s/${this.kibanaSpace}/app/security/cases`;
  }

  /**
   * Generate Alerts URL filtered by IP
   */
  getAlertsUrl(ip) {
    const baseUrl = `${this.kibanaUrl}/s/${this.kibanaSpace}/app/security/alerts`;
    const query = `source.ip:${ip} OR destination.ip:${ip}`;

    return `${baseUrl}?query=(language:kuery,query:'${query}')`;
  }
}

module.exports = new KibanaService();
