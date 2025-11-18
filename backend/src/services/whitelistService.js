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
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Filter network data to remove whitelisted entries
   */
  filterWhitelistedData(networkData) {
    const { nodes, edges, stats } = networkData;

    // Get all whitelisted IPs (including subnet expansions)
    const whitelistedIps = new Set();

    // Add individual IPs
    this.getAllEntries('ip').forEach(entry => {
      whitelistedIps.add(entry.value);
    });

    // Filter nodes
    const filteredNodes = nodes.filter(node => {
      return !this.isIpWhitelisted(node.ip);
    });

    const remainingNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter edges
    const filteredEdges = edges.filter(edge => {
      // Remove if source or dest is whitelisted
      if (!remainingNodeIds.has(edge.source) || !remainingNodeIds.has(edge.target)) {
        return false;
      }

      // Check if connection is whitelisted
      if (this.isConnectionWhitelisted(edge.source, edge.target, edge.destPort)) {
        return false;
      }

      return true;
    });

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: {
        ...stats,
        filteredNodes: nodes.length - filteredNodes.length,
        filteredEdges: edges.length - filteredEdges.length
      }
    };
  }
}

module.exports = new WhitelistService();
