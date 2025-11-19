const express = require('express');
const router = express.Router();
const largeScaleService = require('../services/largeScaleService');

/**
 * GET /api/large-scale/connections
 * Get paginated connections optimized for 110k+ hosts
 */
router.get('/connections', async (req, res) => {
  try {
    const filters = {
      timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : 24,
      sourceIp: req.query.sourceIp,
      destIp: req.query.destIp,
      subnet: req.query.subnet,
      protocol: req.query.protocol,
      destPort: req.query.destPort ? parseInt(req.query.destPort) : undefined,
      minDestPort: req.query.minDestPort ? parseInt(req.query.minDestPort) : undefined,
      maxDestPort: req.query.maxDestPort ? parseInt(req.query.maxDestPort) : undefined,
      service: req.query.service,
      connState: req.query.connState,
      minDuration: req.query.minDuration ? parseFloat(req.query.minDuration) : undefined,
      maxDuration: req.query.maxDuration ? parseFloat(req.query.maxDuration) : undefined,
      minOrigBytes: req.query.minOrigBytes ? parseInt(req.query.minOrigBytes) : undefined,
      maxOrigBytes: req.query.maxOrigBytes ? parseInt(req.query.maxOrigBytes) : undefined,
      minRespBytes: req.query.minRespBytes ? parseInt(req.query.minRespBytes) : undefined,
      maxRespBytes: req.query.maxRespBytes ? parseInt(req.query.maxRespBytes) : undefined,
      external: req.query.external === 'true' ? true : req.query.external === 'false' ? false : undefined,
      internal: req.query.internal === 'true' ? true : req.query.internal === 'false' ? false : undefined,
      vlan: req.query.vlan ? parseInt(req.query.vlan) : undefined,
      communityId: req.query.communityId
    };

    const page = req.query.page ? parseInt(req.query.page) : 0;
    const pageSize = req.query.pageSize ? Math.min(parseInt(req.query.pageSize), 10000) : 1000;

    const result = await largeScaleService.getPaginatedConnections(filters, page, pageSize);

    res.json(result);
  } catch (error) {
    console.error('Error in /api/large-scale/connections:', error);
    res.status(500).json({
      error: 'Failed to fetch connections',
      message: error.message
    });
  }
});

/**
 * GET /api/large-scale/count
 * Get connection count (fast)
 */
router.get('/count', async (req, res) => {
  try {
    const filters = {
      timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : 24,
      sourceIp: req.query.sourceIp,
      destIp: req.query.destIp,
      protocol: req.query.protocol,
      service: req.query.service
    };

    const count = await largeScaleService.getConnectionCount(filters);

    res.json({ count });
  } catch (error) {
    console.error('Error in /api/large-scale/count:', error);
    res.status(500).json({
      error: 'Failed to count connections',
      message: error.message
    });
  }
});

/**
 * GET /api/large-scale/metrics
 * Get aggregated metrics for large datasets
 */
router.get('/metrics', async (req, res) => {
  try {
    const filters = {
      timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : 24
    };

    const metrics = await largeScaleService.getAggregatedMetrics(filters);

    res.json(metrics);
  } catch (error) {
    console.error('Error in /api/large-scale/metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/large-scale/stream-export
 * Stream connections for export (handles millions of rows)
 */
router.get('/stream-export', async (req, res) => {
  try {
    const filters = {
      timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : 24
    };

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', 'attachment; filename=connections-export.ndjson');

    const stream = largeScaleService.streamConnections(filters);

    for await (const batch of stream) {
      // Write batch as newline-delimited JSON
      for (const connection of batch) {
        res.write(JSON.stringify(connection) + '\n');
      }
    }

    res.end();
  } catch (error) {
    console.error('Error in /api/large-scale/stream-export:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to stream export',
        message: error.message
      });
    }
  }
});

module.exports = router;
