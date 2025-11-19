const express = require('express');
const { query, validationResult } = require('express-validator');
const hostDataService = require('../services/hostDataService');

const router = express.Router();

/**
 * GET /api/host/:ip
 * Get host/endpoint data for an IP
 */
router.get('/:ip',
  [
    query('timeRange').optional().isInt({ min: 1, max: 168 })
  ],
  async (req, res) => {
    const { ip } = req.params;
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 24;

    try {
      const hostData = await hostDataService.getHostData(ip, timeRange);

      if (!hostData) {
        return res.status(404).json({ error: 'No host data found for this IP' });
      }

      res.json(hostData);
    } catch (error) {
      console.error('Error fetching host data:', error);
      res.status(500).json({ error: 'Failed to fetch host data' });
    }
  }
);

/**
 * GET /api/host/:ip/threat-intel
 * Get threat intelligence for an IP
 */
router.get('/:ip/threat-intel',
  async (req, res) => {
    const { ip } = req.params;

    try {
      const threatIntel = await hostDataService.getThreatIntel(ip);
      res.json(threatIntel);
    } catch (error) {
      console.error('Error fetching threat intel:', error);
      res.status(500).json({ error: 'Failed to fetch threat intelligence' });
    }
  }
);

/**
 * POST /api/host/process-lookup
 * Find process for a specific connection
 */
router.post('/process-lookup',
  async (req, res) => {
    const { sourceIp, destIp, destPort, timestamp } = req.body;

    if (!sourceIp || !destIp || !destPort || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const processInfo = await hostDataService.getProcessForConnection(
        sourceIp,
        destIp,
        destPort,
        timestamp
      );

      if (!processInfo) {
        return res.status(404).json({ error: 'No process information found' });
      }

      res.json(processInfo);
    } catch (error) {
      console.error('Error fetching process info:', error);
      res.status(500).json({ error: 'Failed to fetch process information' });
    }
  }
);

module.exports = router;
