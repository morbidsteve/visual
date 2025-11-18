const express = require('express');
const { query, validationResult } = require('express-validator');
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

module.exports = router;
