const express = require('express');
const { query, body, validationResult } = require('express-validator');
const elasticsearchService = require('../services/elasticsearchService');
const whitelistService = require('../services/whitelistService');

const router = express.Router();

/**
 * GET /api/network/topology
 * Get network topology data
 */
router.get('/topology',
  [
    query('timeRange').optional().isInt({ min: 1, max: 168 }),
    query('sourceIp').optional().isIP(),
    query('destIp').optional().isIP(),
    query('subnet').optional(),
    query('minBytes').optional().isInt({ min: 0 }),
    query('hideWhitelisted').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const filters = {
        timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : undefined,
        sourceIp: req.query.sourceIp,
        destIp: req.query.destIp,
        subnet: req.query.subnet,
        minBytes: req.query.minBytes ? parseInt(req.query.minBytes) : undefined
      };

      let data = await elasticsearchService.getNetworkTopology(filters);

      // Filter whitelisted entries if requested
      const hideWhitelisted = req.query.hideWhitelisted === 'true';
      if (hideWhitelisted) {
        data = whitelistService.filterWhitelistedData(data);
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching network topology:', error);
      res.status(500).json({ error: 'Failed to fetch network topology' });
    }
  }
);

/**
 * GET /api/network/connection/:sourceIp/:destIp
 * Get detailed connection information
 */
router.get('/connection/:sourceIp/:destIp',
  [
    query('timeRange').optional().isInt({ min: 1, max: 168 })
  ],
  async (req, res) => {
    const { sourceIp, destIp } = req.params;
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 1;

    try {
      const connections = await elasticsearchService.getConnectionDetails(
        sourceIp,
        destIp,
        timeRange
      );
      res.json(connections);
    } catch (error) {
      console.error('Error fetching connection details:', error);
      res.status(500).json({ error: 'Failed to fetch connection details' });
    }
  }
);

/**
 * GET /api/network/search
 * Search network data
 */
router.get('/search',
  [
    query('q').notEmpty(),
    query('timeRange').optional().isInt({ min: 1, max: 168 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 24;
      const results = await elasticsearchService.searchNetwork(req.query.q, timeRange);
      res.json(results);
    } catch (error) {
      console.error('Error searching network:', error);
      res.status(500).json({ error: 'Failed to search network' });
    }
  }
);

/**
 * GET /api/network/connections
 * Get individual connections (not aggregated)
 */
router.get('/connections',
  [
    query('timeRange').optional().isInt({ min: 1, max: 168 }),
    query('sourceIp').optional().isIP(),
    query('destIp').optional().isIP(),
    query('subnet').optional(),
    query('minBytes').optional().isInt({ min: 0 }),
    query('protocol').optional(),
    query('destPort').optional().isInt({ min: 1, max: 65535 }),
    query('service').optional(),
    query('connState').optional(),
    query('limit').optional().isInt({ min: 1, max: 50000 }),
    query('hideWhitelisted').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const filters = {
        timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : undefined,
        sourceIp: req.query.sourceIp,
        destIp: req.query.destIp,
        subnet: req.query.subnet,
        minBytes: req.query.minBytes ? parseInt(req.query.minBytes) : undefined,
        protocol: req.query.protocol,
        destPort: req.query.destPort ? parseInt(req.query.destPort) : undefined,
        service: req.query.service,
        connState: req.query.connState,
        limit: req.query.limit ? parseInt(req.query.limit) : 10000
      };

      let data = await elasticsearchService.getIndividualConnections(filters);

      // Apply smart filtering if requested
      const hideWhitelisted = req.query.hideWhitelisted === 'true';
      if (hideWhitelisted) {
        data = whitelistService.filterWhitelistedData(
          { nodes: data.nodes, edges: [], stats: data.stats },
          data.connections,
          elasticsearchService
        );
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  }
);

/**
 * GET /api/network/baseline/:ip
 * Get or generate baseline for an IP or subnet
 */
router.get('/baseline/:ip',
  [
    query('isSubnet').optional().isBoolean(),
    query('lookbackDays').optional().isInt({ min: 1, max: 30 }),
    query('regenerate').optional().isBoolean()
  ],
  async (req, res) => {
    const { ip } = req.params;
    const isSubnet = req.query.isSubnet === 'true';
    const lookbackDays = req.query.lookbackDays ? parseInt(req.query.lookbackDays) : 7;
    const regenerate = req.query.regenerate === 'true';

    try {
      const entityType = isSubnet ? 'subnet' : 'ip';

      // Check if baseline exists
      let baseline = whitelistService.getBaseline(ip, entityType);

      // Generate if doesn't exist or regenerate requested
      if (!baseline || regenerate) {
        console.log(`Generating baseline for ${ip} (${entityType})...`);
        const baselineData = await elasticsearchService.getConnectionBaseline(ip, isSubnet, lookbackDays);
        whitelistService.saveBaseline(ip, entityType, baselineData, lookbackDays);
        baseline = { entity_value: ip, entity_type: entityType, baseline_data: baselineData };
      }

      res.json(baseline);
    } catch (error) {
      console.error('Error getting/generating baseline:', error);
      res.status(500).json({ error: 'Failed to get baseline' });
    }
  }
);

/**
 * POST /api/network/baseline
 * Generate baseline for entity
 */
router.post('/baseline',
  [
    body('entityValue').notEmpty(),
    body('entityType').isIn(['ip', 'subnet']),
    body('lookbackDays').optional().isInt({ min: 1, max: 30 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { entityValue, entityType, lookbackDays = 7 } = req.body;
      const isSubnet = entityType === 'subnet';

      const baselineData = await elasticsearchService.getConnectionBaseline(
        entityValue,
        isSubnet,
        lookbackDays
      );

      whitelistService.saveBaseline(entityValue, entityType, baselineData, lookbackDays);

      res.json({
        success: true,
        baseline: { entity_value: entityValue, entity_type: entityType, baseline_data: baselineData }
      });
    } catch (error) {
      console.error('Error generating baseline:', error);
      res.status(500).json({ error: 'Failed to generate baseline' });
    }
  }
);

/**
 * DELETE /api/network/baseline/:entityValue/:entityType
 * Delete baseline
 */
router.delete('/baseline/:entityValue/:entityType',
  async (req, res) => {
    try {
      const { entityValue, entityType } = req.params;
      const deleted = whitelistService.deleteBaseline(entityValue, entityType);

      if (deleted) {
        res.json({ success: true, message: 'Baseline deleted' });
      } else {
        res.status(404).json({ error: 'Baseline not found' });
      }
    } catch (error) {
      console.error('Error deleting baseline:', error);
      res.status(500).json({ error: 'Failed to delete baseline' });
    }
  }
);

module.exports = router;
