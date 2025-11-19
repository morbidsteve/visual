const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/elasticsearch');
const networkRoutes = require('./routes/networkRoutes');
const whitelistRoutes = require('./routes/whitelistRoutes');
const hostRoutes = require('./routes/hostRoutes');
const websocketService = require('./services/websocketService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/network', networkRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/host', hostRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test Elasticsearch connection
    console.log('Testing Elasticsearch connection...');
    const esConnected = await testConnection();

    if (!esConnected) {
      console.warn('WARNING: Elasticsearch connection failed. Server will start but data fetching will fail.');
    }

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║   Network Visualizer Backend                          ║
║   Port: ${PORT}                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║   Elasticsearch: ${esConnected ? 'Connected ✓' : 'Disconnected ✗'}                     ║
║   WebSocket: ws://localhost:${PORT}/ws                ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Initialize WebSocket service
    websocketService.initialize(server);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  websocketService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  websocketService.shutdown();
  process.exit(0);
});
