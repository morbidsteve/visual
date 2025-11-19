const express = require('express');
const kibanaService = require('../services/kibanaService');

const router = express.Router();

/**
 * POST /api/kibana/discover
 * Generate Kibana Discover URL for a connection
 */
router.post('/discover', (req, res) => {
  const { connection } = req.body;

  if (!connection || !connection.sourceIp || !connection.destIp) {
    return res.status(400).json({ error: 'Invalid connection data' });
  }

  const url = kibanaService.getDiscoverUrl(connection);
  res.json({ url });
});

/**
 * GET /api/kibana/discover/ip/:ip
 * Generate Kibana Discover URL for an IP
 */
router.get('/discover/ip/:ip', (req, res) => {
  const { ip } = req.params;
  const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 24;

  const url = kibanaService.getDiscoverUrlForIp(ip, timeRange);
  res.json({ url });
});

/**
 * GET /api/kibana/dashboard/:id?
 * Get Kibana Dashboard URL
 */
router.get('/dashboard/:id?', (req, res) => {
  const { id } = req.params;
  const url = kibanaService.getDashboardUrl(id);
  res.json({ url });
});

/**
 * GET /api/kibana/security/host/:hostname
 * Get Kibana Security Host URL
 */
router.get('/security/host/:hostname', (req, res) => {
  const { hostname } = req.params;
  const url = kibanaService.getSecurityHostUrl(hostname);
  res.json({ url });
});

/**
 * GET /api/kibana/security/alerts/:ip
 * Get Kibana Alerts URL for IP
 */
router.get('/security/alerts/:ip', (req, res) => {
  const { ip } = req.params;
  const url = kibanaService.getAlertsUrl(ip);
  res.json({ url });
});

/**
 * GET /api/kibana/network-map
 * Get Kibana Network Map URL
 */
router.get('/network-map', (req, res) => {
  const url = kibanaService.getNetworkMapUrl();
  res.json({ url });
});

module.exports = router;
