const db = require('../config/database');

class WhitelistService {
  /**
   * Add entry to whitelist
   */
  addEntry(entryType, value, description = '', createdBy = 'system') {
    try {
      const stmt = db.prepare(`
        INSERT INTO whitelist (entry_type, value, description, created_by)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(entryType, value, description, createdBy);
      return { id: result.lastInsertRowid, entryType, value, description };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Entry already exists in whitelist');
      }
      throw error;
    }
  }

  /**
   * Remove entry from whitelist
   */
  removeEntry(id) {
    const stmt = db.prepare('DELETE FROM whitelist WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all whitelist entries
   */
  getAllEntries(entryType = null) {
    let query = 'SELECT * FROM whitelist';
    if (entryType) {
      query += ' WHERE entry_type = ?';
      const stmt = db.prepare(query);
      return stmt.all(entryType);
    }
    const stmt = db.prepare(query);
    return stmt.all();
  }

  /**
   * Check if entry is whitelisted
   */
  isWhitelisted(entryType, value) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM whitelist
      WHERE entry_type = ? AND value = ?
    `);
    const result = stmt.get(entryType, value);
    return result.count > 0;
  }

  /**
   * Check if IP is in whitelisted subnet
   */
  isIpWhitelisted(ip) {
    // Check exact IP match
    if (this.isWhitelisted('ip', ip)) {
      return true;
    }

    // Check subnet matches
    const subnets = this.getAllEntries('subnet');
    for (const subnet of subnets) {
      if (this.ipInSubnet(ip, subnet.value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if connection is whitelisted
   */
  isConnectionWhitelisted(sourceIp, destIp, destPort = null) {
    const connectionKey = destPort
      ? `${sourceIp}->${destIp}:${destPort}`
      : `${sourceIp}->${destIp}`;

    return this.isWhitelisted('connection', connectionKey);
  }

  /**
   * Helper: Check if IP is in subnet (simple CIDR check)
   */
  ipInSubnet(ip, subnet) {
    // Handle null/undefined inputs
    if (!ip || !subnet || typeof ip !== 'string' || typeof subnet !== 'string') {
      return false;
    }

    const [subnetIp, bits] = subnet.split('/');
    if (!bits) return ip === subnetIp;

    const ipNum = this.ipToNumber(ip);
    const subnetNum = this.ipToNumber(subnetIp);
    const mask = -1 << (32 - parseInt(bits));

    return (ipNum & mask) === (subnetNum & mask);
  }

  /**
   * Convert IP to number for comparison
   */
  ipToNumber(ip) {
    // Handle null/undefined IP
    if (!ip || typeof ip !== 'string') {
      return 0;
    }

    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Save baseline for entity
   */
  saveBaseline(entityValue, entityType, baselineData, lookbackDays = 7) {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO baselines (entity_value, entity_type, baseline_data, lookback_days, generated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      stmt.run(entityValue, entityType, JSON.stringify(baselineData), lookbackDays);
      return true;
    } catch (error) {
      console.error('Error saving baseline:', error);
      throw error;
    }
  }

  /**
   * Get baseline for entity
   */
  getBaseline(entityValue, entityType) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM baselines
        WHERE entity_value = ? AND entity_type = ?
      `);
      const result = stmt.get(entityValue, entityType);
      if (result) {
        return {
          ...result,
          baseline_data: JSON.parse(result.baseline_data)
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting baseline:', error);
      throw error;
    }
  }

  /**
   * Get all baselines
   */
  getAllBaselines() {
    try {
      const stmt = db.prepare('SELECT * FROM baselines');
      const results = stmt.all();
      return results.map(r => ({
        ...r,
        baseline_data: JSON.parse(r.baseline_data)
      }));
    } catch (error) {
      console.error('Error getting baselines:', error);
      throw error;
    }
  }

  /**
   * Delete baseline
   */
  deleteBaseline(entityValue, entityType) {
    try {
      const stmt = db.prepare('DELETE FROM baselines WHERE entity_value = ? AND entity_type = ?');
      const result = stmt.run(entityValue, entityType);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting baseline:', error);
      throw error;
    }
  }

  /**
   * Filter network data - SMART MODE
   * - Keep whitelisted nodes visible
   * - Hide their normal connections
   * - Show only anomalous connections on whitelisted entities
   */
  filterWhitelistedData(networkData, connections = null, elasticsearchService = null) {
    const { nodes, edges, stats } = networkData;

    // If individual connections are provided, use smart filtering
    if (connections && elasticsearchService) {
      return this.smartFilterWithAnomalies(nodes, connections, elasticsearchService, stats);
    }

    // Otherwise use simple filtering (keep nodes, hide edges)
    const whitelistedNodes = new Set();

    // Collect whitelisted IPs
    nodes.forEach(node => {
      if (this.isIpWhitelisted(node.ip)) {
        whitelistedNodes.add(node.id);
      }
    });

    // Filter edges: remove edges between whitelisted nodes
    const filteredEdges = edges.filter(edge => {
      // If connection is explicitly whitelisted, hide it
      if (this.isConnectionWhitelisted(edge.source, edge.target, edge.destPort)) {
        return false;
      }

      // If both source AND target are whitelisted, hide the edge
      if (whitelistedNodes.has(edge.source) && whitelistedNodes.has(edge.target)) {
        return false;
      }

      return true;
    });

    // Mark whitelisted nodes
    const processedNodes = nodes.map(node => ({
      ...node,
      isWhitelisted: whitelistedNodes.has(node.id)
    }));

    return {
      nodes: processedNodes,
      edges: filteredEdges,
      stats: {
        ...stats,
        whitelistedNodes: whitelistedNodes.size,
        filteredEdges: edges.length - filteredEdges.length
      }
    };
  }

  /**
   * Smart filtering with anomaly detection
   * Shows only anomalous connections on whitelisted entities
   */
  smartFilterWithAnomalies(nodes, connections, elasticsearchService, stats) {
    const whitelistedEntities = new Map();
    const anomalousConnections = [];

    // Collect whitelisted entities and their baselines
    nodes.forEach(node => {
      if (this.isIpWhitelisted(node.ip)) {
        const baseline = this.getBaseline(node.ip, 'ip');
        whitelistedEntities.set(node.ip, baseline);
      }
    });

    // Check subnets
    const subnetEntries = this.getAllEntries('subnet');
    subnetEntries.forEach(entry => {
      const baseline = this.getBaseline(entry.value, 'subnet');
      whitelistedEntities.set(entry.value, baseline);
    });

    // Filter connections
    const filteredConnections = [];
    connections.forEach(conn => {
      // Check if source or dest is whitelisted
      const sourceWhitelisted = this.isIpWhitelisted(conn.sourceIp);
      const destWhitelisted = this.isIpWhitelisted(conn.destIp);

      // Check if connection is explicitly whitelisted
      const connectionWhitelisted = this.isConnectionWhitelisted(
        conn.sourceIp,
        conn.destIp,
        conn.destPort
      );

      if (connectionWhitelisted) {
        return; // Skip this connection entirely
      }

      // If source is whitelisted, check for anomalies
      if (sourceWhitelisted) {
        const baseline = whitelistedEntities.get(conn.sourceIp);
        if (baseline && baseline.baseline_data) {
          const anomalies = elasticsearchService.detectAnomalies(conn, baseline.baseline_data);
          if (anomalies.length > 0) {
            conn.anomalies = anomalies;
            conn.isAnomalous = true;
            filteredConnections.push(conn);
            anomalousConnections.push(conn);
          }
          // If no anomalies, skip (normal whitelisted traffic)
        } else {
          // No baseline yet, show the connection
          filteredConnections.push(conn);
        }
      }
      // If dest is whitelisted, check for anomalies
      else if (destWhitelisted) {
        const baseline = whitelistedEntities.get(conn.destIp);
        if (baseline && baseline.baseline_data) {
          const anomalies = elasticsearchService.detectAnomalies(conn, baseline.baseline_data);
          if (anomalies.length > 0) {
            conn.anomalies = anomalies;
            conn.isAnomalous = true;
            filteredConnections.push(conn);
            anomalousConnections.push(conn);
          }
        } else {
          filteredConnections.push(conn);
        }
      }
      // Neither whitelisted, show the connection
      else {
        filteredConnections.push(conn);
      }
    });

    // Mark nodes
    const processedNodes = nodes.map(node => ({
      ...node,
      isWhitelisted: this.isIpWhitelisted(node.ip),
      hasBaseline: whitelistedEntities.has(node.ip)
    }));

    return {
      nodes: processedNodes,
      connections: filteredConnections,
      anomalousConnections,
      stats: {
        ...stats,
        whitelistedNodes: whitelistedEntities.size,
        filteredConnections: connections.length - filteredConnections.length,
        anomalousConnections: anomalousConnections.length
      }
    };
  }
}

module.exports = new WhitelistService();
