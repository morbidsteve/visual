const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const esClient = new Client({
  node: process.env.ES_NODE || 'https://elasticsearch:9200',
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || 'changeme'
  },
  tls: {
    rejectUnauthorized: false // Set to true in production with valid certs
  }
});

// Test connection
const testConnection = async () => {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch connection established:', health.cluster_name);
    return true;
  } catch (error) {
    console.error('Elasticsearch connection failed:', error.message);
    return false;
  }
};

module.exports = { esClient, testConnection };
