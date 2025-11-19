const express = require('express');
const router = express.Router();
const velociraptorService = require('../services/velociraptorService');

/**
 * GET /api/velociraptor/client/:ip
 * Find Velociraptor client by IP address
 */
router.get('/client/:ip', async (req, res) => {
  try {
    const { ip } = req.params;

    const client = await velociraptorService.findClientByIP(ip);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: `No Velociraptor client found for IP ${ip}`
      });
    }

    res.json(client);
  } catch (error) {
    console.error('Error in /api/velociraptor/client/:ip:', error);
    res.status(500).json({
      error: 'Failed to find client',
      message: error.message
    });
  }
});

/**
 * POST /api/velociraptor/correlate
 * Correlate network connection to endpoint process
 */
router.post('/correlate', async (req, res) => {
  try {
    const { sourceIp, destIp, destPort, timestamp } = req.body;

    if (!sourceIp || !destIp || !destPort) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'sourceIp, destIp, and destPort are required'
      });
    }

    const correlation = await velociraptorService.correlateConnectionToProcess(
      sourceIp,
      destIp,
      destPort,
      timestamp
    );

    res.json(correlation);
  } catch (error) {
    console.error('Error in /api/velociraptor/correlate:', error);
    res.status(500).json({
      error: 'Failed to correlate connection',
      message: error.message
    });
  }
});

/**
 * GET /api/velociraptor/processes/:clientId
 * Get process list for a client
 */
router.get('/processes/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const processes = await velociraptorService.getProcessList(clientId);

    res.json({ processes });
  } catch (error) {
    console.error('Error in /api/velociraptor/processes/:clientId:', error);
    res.status(500).json({
      error: 'Failed to get process list',
      message: error.message
    });
  }
});

/**
 * GET /api/velociraptor/client-info/:clientId
 * Get detailed client information
 */
router.get('/client-info/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const info = await velociraptorService.getClientInfo(clientId);

    if (!info) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    res.json(info);
  } catch (error) {
    console.error('Error in /api/velociraptor/client-info/:clientId:', error);
    res.status(500).json({
      error: 'Failed to get client info',
      message: error.message
    });
  }
});

/**
 * POST /api/velociraptor/hunt
 * Create a hunt for an indicator across all clients
 */
router.post('/hunt', async (req, res) => {
  try {
    const { indicatorType, indicatorValue } = req.body;

    if (!indicatorType || !indicatorValue) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'indicatorType and indicatorValue are required'
      });
    }

    const hunt = await velociraptorService.huntForIndicator(indicatorType, indicatorValue);

    res.json(hunt);
  } catch (error) {
    console.error('Error in /api/velociraptor/hunt:', error);
    res.status(500).json({
      error: 'Failed to create hunt',
      message: error.message
    });
  }
});

/**
 * GET /api/velociraptor/timeline/:clientId
 * Get timeline of events for a host
 */
router.get('/timeline/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { startTime, endTime } = req.query;

    const timeline = await velociraptorService.getHostTimeline(
      clientId,
      startTime,
      endTime
    );

    res.json({ timeline });
  } catch (error) {
    console.error('Error in /api/velociraptor/timeline/:clientId:', error);
    res.status(500).json({
      error: 'Failed to get timeline',
      message: error.message
    });
  }
});

/**
 * POST /api/velociraptor/triage
 * Quick triage for incident response
 */
router.post('/triage', async (req, res) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'ipAddress is required'
      });
    }

    const triage = await velociraptorService.quickTriage(ipAddress);

    res.json(triage);
  } catch (error) {
    console.error('Error in /api/velociraptor/triage:', error);
    res.status(500).json({
      error: 'Failed to perform triage',
      message: error.message
    });
  }
});

/**
 * GET /api/velociraptor/health
 * Check if Velociraptor integration is enabled and healthy
 */
router.get('/health', async (req, res) => {
  try {
    const enabled = velociraptorService.enabled;

    res.json({
      enabled,
      baseUrl: enabled ? velociraptorService.baseUrl : null,
      message: enabled ? 'Velociraptor integration active' : 'Velociraptor integration disabled (no API key)'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check health',
      message: error.message
    });
  }
});

module.exports = router;
