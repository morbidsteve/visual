const WebSocket = require('ws');
const elasticsearchService = require('./elasticsearchService');
const whitelistService = require('./whitelistService');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.lastCheckTimestamp = new Date();
    this.pollingInterval = null;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      console.log('WebSocket client connected from:', req.socket.remoteAddress);
      this.clients.add(ws);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Network Visualizer real-time feed',
        timestamp: new Date().toISOString()
      }));

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Start polling for new connections
    this.startPolling();

    console.log('WebSocket service initialized');
  }

  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Client can subscribe to specific filters
        ws.filters = data.filters;
        ws.send(JSON.stringify({
          type: 'subscribed',
          filters: data.filters,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  startPolling() {
    // Poll Elasticsearch every 5 seconds for new connections
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewConnections();
    }, 5000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async checkForNewConnections() {
    if (this.clients.size === 0) return;

    try {
      const now = new Date();
      const secondsAgo = Math.ceil((now - this.lastCheckTimestamp) / 1000);

      // Query for new connections since last check
      const newConnections = await elasticsearchService.getIndividualConnections({
        timeRange: secondsAgo / 3600, // Convert to hours
        limit: 1000
      });

      if (newConnections.connections && newConnections.connections.length > 0) {
        // Check for anomalies
        const anomalousConnections = newConnections.connections.filter(c => c.isAnomalous);

        // Broadcast to all connected clients
        this.broadcast({
          type: 'new_connections',
          connections: newConnections.connections,
          anomalousCount: anomalousConnections.length,
          timestamp: now.toISOString()
        });

        // Send specific anomaly alerts
        if (anomalousConnections.length > 0) {
          this.broadcast({
            type: 'anomaly_alert',
            anomalies: anomalousConnections,
            count: anomalousConnections.length,
            timestamp: now.toISOString()
          });
        }
      }

      this.lastCheckTimestamp = now;
    } catch (error) {
      console.error('Error checking for new connections:', error);
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send stats update
  async broadcastStats() {
    try {
      const topology = await elasticsearchService.getNetworkTopology({ timeRange: 1 });

      this.broadcast({
        type: 'stats_update',
        stats: topology.stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting stats:', error);
    }
  }

  shutdown() {
    this.stopPolling();

    this.clients.forEach((client) => {
      client.close();
    });

    if (this.wss) {
      this.wss.close();
    }

    console.log('WebSocket service shut down');
  }
}

module.exports = new WebSocketService();
