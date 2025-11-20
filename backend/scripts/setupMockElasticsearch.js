/**
 * Elasticsearch Setup and Mock Data Loader
 *
 * Sets up Elasticsearch indices with proper mappings for Zeek data
 * and loads generated mock data for testing.
 *
 * Usage:
 *   node setupMockElasticsearch.js [scale] [timeRange]
 *
 * Examples:
 *   node setupMockElasticsearch.js small 1    # 100 hosts, 1 hour
 *   node setupMockElasticsearch.js medium 24  # 1000 hosts, 24 hours
 *   node setupMockElasticsearch.js large 24   # 10000 hosts, 24 hours
 */

const { Client } = require('@elastic/elasticsearch');
const { generateMockData } = require('./generateMockData');
require('dotenv').config();

// Elasticsearch client configuration
const getElasticsearchClient = () => {
  const config = {
    node: process.env.ES_NODE || 'http://localhost:9200'
  };

  // Basic auth
  if (process.env.ES_USERNAME && process.env.ES_PASSWORD) {
    config.auth = {
      username: process.env.ES_USERNAME,
      password: process.env.ES_PASSWORD
    };
  }

  // API key auth
  if (process.env.ES_API_KEY) {
    config.auth = {
      apiKey: process.env.ES_API_KEY
    };
  }

  // Cloud ID
  if (process.env.ES_CLOUD_ID) {
    config.cloud = {
      id: process.env.ES_CLOUD_ID
    };
  }

  // Disable SSL verification for development
  if (process.env.NODE_ENV === 'development') {
    config.tls = {
      rejectUnauthorized: false
    };
  }

  return new Client(config);
};

// Index name based on current date
const getIndexName = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `zeek-conn-${year}.${month}.${day}`;
};

// Zeek connection log mapping
const ZEEK_MAPPING = {
  properties: {
    '@timestamp': { type: 'date' },
    ts: { type: 'date' },
    uid: { type: 'keyword' },
    'id.orig_h': { type: 'ip' },
    'id.orig_p': { type: 'integer' },
    'id.resp_h': { type: 'ip' },
    'id.resp_p': { type: 'integer' },
    proto: { type: 'keyword' },
    service: { type: 'keyword' },
    duration: { type: 'float' },
    orig_bytes: { type: 'long' },
    resp_bytes: { type: 'long' },
    conn_state: { type: 'keyword' },
    local_orig: { type: 'boolean' },
    local_resp: { type: 'boolean' },
    missed_bytes: { type: 'long' },
    history: { type: 'keyword' },
    orig_pkts: { type: 'long' },
    orig_ip_bytes: { type: 'long' },
    resp_pkts: { type: 'long' },
    resp_ip_bytes: { type: 'long' },
    tunnel_parents: { type: 'keyword' },
    community_id: { type: 'keyword' }
  }
};

/**
 * Create index with proper mapping
 */
async function createIndex(client, indexName) {
  console.log(`Creating index: ${indexName}`);

  try {
    // Check if index exists
    const exists = await client.indices.exists({ index: indexName });

    if (exists) {
      console.log(`Index ${indexName} already exists. Deleting...`);
      await client.indices.delete({ index: indexName });
    }

    // Create index
    await client.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s',
          'index.max_result_window': 100000
        },
        mappings: ZEEK_MAPPING
      }
    });

    console.log(`✓ Index ${indexName} created successfully`);
  } catch (error) {
    console.error('Error creating index:', error.message);
    throw error;
  }
}

/**
 * Create index template for future indices
 */
async function createIndexTemplate(client) {
  console.log('Creating index template for zeek-* indices...');

  try {
    await client.indices.putIndexTemplate({
      name: 'zeek-conn-template',
      body: {
        index_patterns: ['zeek-*'],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            refresh_interval: '30s',
            'index.max_result_window': 100000
          },
          mappings: ZEEK_MAPPING
        }
      }
    });

    console.log('✓ Index template created successfully');
  } catch (error) {
    console.error('Error creating template:', error.message);
  }
}

/**
 * Bulk index connections into Elasticsearch
 */
async function bulkIndexConnections(client, indexName, connections, batchSize = 1000) {
  console.log(`\nIndexing ${connections.length.toLocaleString()} connections...`);

  const batches = [];
  for (let i = 0; i < connections.length; i += batchSize) {
    batches.push(connections.slice(i, i + batchSize));
  }

  let indexed = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const body = [];

    for (const conn of batch) {
      // Index action
      body.push({
        index: {
          _index: indexName
        }
      });

      // Document with @timestamp for Kibana compatibility
      body.push({
        '@timestamp': conn.ts,
        ...conn
      });
    }

    try {
      const response = await client.bulk({ body, refresh: false });

      if (response.errors) {
        const erroredDocs = response.items.filter(item => item.index?.error);
        console.error(`Batch ${i + 1} had ${erroredDocs.length} errors`);
      }

      indexed += batch.length;
      process.stdout.write(`\rProgress: ${((indexed / connections.length) * 100).toFixed(1)}% (${indexed.toLocaleString()}/${connections.length.toLocaleString()})`);
    } catch (error) {
      console.error(`\nError indexing batch ${i + 1}:`, error.message);
    }
  }

  console.log('\n✓ Bulk indexing complete');

  // Refresh index to make documents searchable
  console.log('Refreshing index...');
  await client.indices.refresh({ index: indexName });
  console.log('✓ Index refreshed');
}

/**
 * Verify indexed data
 */
async function verifyData(client, indexName) {
  console.log('\nVerifying indexed data...');

  try {
    // Count total documents
    const count = await client.count({ index: indexName });
    console.log(`✓ Total documents: ${count.count.toLocaleString()}`);

    // Sample query
    const sample = await client.search({
      index: indexName,
      size: 1,
      body: {
        sort: [{ ts: 'desc' }]
      }
    });

    if (sample.hits.hits.length > 0) {
      console.log('✓ Sample document retrieved successfully');
      console.log('  Latest connection:', sample.hits.hits[0]._source['id.orig_h'], '→', sample.hits.hits[0]._source['id.resp_h']);
    }

    // Aggregations test
    const agg = await client.search({
      index: indexName,
      size: 0,
      body: {
        aggs: {
          protocols: {
            terms: { field: 'proto', size: 10 }
          },
          services: {
            terms: { field: 'service', size: 10 }
          }
        }
      }
    });

    console.log('\n✓ Protocol distribution:');
    agg.aggregations.protocols.buckets.forEach(bucket => {
      console.log(`  ${bucket.key}: ${bucket.doc_count.toLocaleString()}`);
    });

    console.log('\n✓ Top services:');
    agg.aggregations.services.buckets.slice(0, 5).forEach(bucket => {
      console.log(`  ${bucket.key}: ${bucket.doc_count.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error verifying data:', error.message);
  }
}

/**
 * Create network topology document
 */
async function createTopologyDoc(client, metadata) {
  const topologyIndex = 'network-topology';

  try {
    // Create topology index if doesn't exist
    const exists = await client.indices.exists({ index: topologyIndex });

    if (!exists) {
      await client.indices.create({
        index: topologyIndex,
        body: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              subnets: {
                type: 'nested',
                properties: {
                  cidr: { type: 'keyword' },
                  type: { type: 'keyword' },
                  vlan: { type: 'integer' }
                }
              }
            }
          }
        }
      });
    }

    // Index topology document
    await client.index({
      index: topologyIndex,
      id: 'current-topology',
      body: {
        '@timestamp': new Date().toISOString(),
        subnets: Object.entries(metadata.subnets).map(([name, config]) => ({
          name,
          cidr: config.cidr,
          type: config.type,
          vlan: config.vlan
        })),
        generated_at: new Date().toISOString()
      }
    });

    console.log('\n✓ Network topology document created');
  } catch (error) {
    console.error('Error creating topology document:', error.message);
  }
}

/**
 * Main setup function
 */
async function setup(scale = 'medium', timeRange = 24) {
  console.log('='.repeat(60));
  console.log('Elasticsearch Mock Data Setup');
  console.log('='.repeat(60));

  const client = getElasticsearchClient();

  try {
    // Test connection
    console.log('\nTesting Elasticsearch connection...');
    const info = await client.info();
    console.log(`✓ Connected to Elasticsearch ${info.version.number}`);
    console.log(`  Cluster: ${info.cluster_name}`);

    // Create index template
    await createIndexTemplate(client);

    // Generate mock data
    console.log(`\nGenerating ${scale} mock data (${timeRange}h time range)...`);
    const { connections, metadata } = generateMockData({ scale, timeRange });

    // Create index
    const indexName = getIndexName();
    await createIndex(client, indexName);

    // Bulk index data
    await bulkIndexConnections(client, indexName, connections);

    // Create topology document
    await createTopologyDoc(client, metadata);

    // Verify data
    await verifyData(client, indexName);

    console.log('\n' + '='.repeat(60));
    console.log('✓ Setup complete!');
    console.log('='.repeat(60));
    console.log(`\nIndex: ${indexName}`);
    console.log(`Connections: ${connections.length.toLocaleString()}`);
    console.log(`Time range: ${metadata.startTime} to ${metadata.endTime}`);
    console.log('\nYou can now use the Network Visualizer to explore this data!');
    console.log('\nSuggested Kibana queries:');
    console.log(`  - All connections: GET ${indexName}/_search`);
    console.log(`  - By protocol: GET ${indexName}/_search?q=proto:tcp`);
    console.log(`  - By service: GET ${indexName}/_search?q=service:https`);

  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const scale = args[0] || 'medium';
  const timeRange = parseInt(args[1]) || 24;

  const validScales = ['small', 'medium', 'large', 'enterprise'];
  if (!validScales.includes(scale)) {
    console.error(`Invalid scale. Must be one of: ${validScales.join(', ')}`);
    process.exit(1);
  }

  setup(scale, timeRange)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { setup, getElasticsearchClient };
