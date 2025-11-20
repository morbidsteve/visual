# Network Visualizer - Deployment & Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Network Topology Setup](#network-topology-setup)
7. [Velociraptor Integration](#velociraptor-integration)
8. [Large-Scale Deployment (110k+ Hosts)](#large-scale-deployment)
9. [Performance Tuning](#performance-tuning)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The Network Visualizer is an enterprise-grade Security Operations Center (SOC) platform designed to handle massive network environments with 110,000+ hosts. It provides:

- **Real-time network visualization** with automatic clustering
- **Advanced threat hunting** with MITRE ATT&CK mapping
- **Endpoint correlation** via Velociraptor integration
- **High-performance data handling** with virtual scrolling and streaming
- **Comprehensive metadata filtering** across all Zeek fields
- **Intuitive UX** with saved filters, quick actions, and dashboards

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │  Dashboard   │  Graph View  │  List View (Virtualized) │ │
│  ├──────────────┼──────────────┼──────────────────────────┤ │
│  │ Threat Hunt  │   Timeline   │  Topology Manager        │ │
│  ├──────────────┴──────────────┴──────────────────────────┤ │
│  │         Velociraptor Correlation Panel                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────────────┬─────────────────┬───────────────────┐ │
│  │ Network Service  │ Large-Scale API │ Velociraptor API  │ │
│  ├──────────────────┼─────────────────┼───────────────────┤ │
│  │ WebSocket Svc    │ Whitelist Mgmt  │ Baseline Tracking │ │
│  └──────────────────┴─────────────────┴───────────────────┘ │
└────────────────────────┬─────────────────┬──────────────────┘
                         │                 │
        ┌────────────────┴──────┐   ┌─────┴──────────────────┐
        │  Elasticsearch/Kibana │   │  Velociraptor Server   │
        │     (Zeek Data)       │   │   (Endpoint Data)      │
        └───────────────────────┘   └────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Material-UI (MUI) for components
- Cytoscape.js for graph visualization
- React-Window for virtual scrolling
- TanStack Query for data fetching

**Backend:**
- Node.js 18+ with Express
- Elasticsearch client for Zeek data
- WebSocket for real-time updates
- Axios for Velociraptor API

**Data Sources:**
- Elasticsearch (Zeek network logs)
- Velociraptor (endpoint monitoring)

---

## Prerequisites

### System Requirements

**Frontend Server:**
- 2+ CPU cores
- 4GB RAM minimum (8GB recommended)
- 10GB disk space
- Modern web browser (Chrome, Firefox, Edge)

**Backend Server:**
- 4+ CPU cores (8+ for 110k hosts)
- 16GB RAM minimum (32GB+ for 110k hosts)
- 50GB disk space
- Node.js 18.x or later

**Elasticsearch Cluster:**
- 3+ nodes (for HA)
- 32GB+ RAM per node
- SSD storage recommended
- Elasticsearch 7.x or 8.x

**Velociraptor Server (Optional):**
- 4+ CPU cores
- 8GB+ RAM
- Velociraptor 0.6.x or later

### Network Requirements

- Backend can reach Elasticsearch (default: 9200)
- Backend can reach Velociraptor API (default: 8000)
- Frontend can reach Backend (default: 3001)
- WebSocket connectivity (ws:// or wss://)

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/network-visualizer.git
cd network-visualizer
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env <<EOF
# Elasticsearch Configuration
ES_NODE=https://your-elasticsearch:9200
ES_USERNAME=elastic
ES_PASSWORD=your-password
ES_INDEX_PATTERN=zeek-*
# Optional: Elastic Cloud
# ES_CLOUD_ID=your-cloud-id
# ES_API_KEY=your-api-key

# Server Configuration
PORT=3001
NODE_ENV=production

# Velociraptor Integration (Optional)
VELOCIRAPTOR_URL=https://your-velociraptor:8000
VELOCIRAPTOR_API_KEY=your-api-key

# WebSocket Configuration
WS_ENABLED=true
WS_REFRESH_INTERVAL=30000
EOF

# Start backend
npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure API endpoint
# Edit src/config.ts if needed (default: http://localhost:3001)

# Build for production
npm run build

# Or run development server
npm start
```

### 4. Production Deployment

**Using Nginx:**

```nginx
# /etc/nginx/sites-available/network-visualizer

server {
    listen 80;
    server_name network-viz.your-domain.com;

    # Frontend
    location / {
        root /var/www/network-visualizer/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

**Using Docker Compose:**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - ES_NODE=https://elasticsearch:9200
      - ES_USERNAME=elastic
      - ES_PASSWORD=${ES_PASSWORD}
      - VELOCIRAPTOR_URL=https://velociraptor:8000
      - VELOCIRAPTOR_API_KEY=${VELOCIRAPTOR_API_KEY}
    depends_on:
      - elasticsearch
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms8g -Xmx8g"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

volumes:
  esdata:
```

---

## Configuration

### Application Settings

Access via UI: **Settings Icon** (top right) → Opens 6-tab configuration dialog

#### 1. Elasticsearch Tab
- **URL**: `https://your-elasticsearch:9200`
- **Username/Password**: Basic auth credentials
- **Index Pattern**: `zeek-*` (default) or custom pattern
- **Cloud ID** (optional): For Elastic Cloud deployments
- **API Key** (optional): Alternative to username/password

#### 2. Kibana Tab
- **URL**: `https://your-kibana:5601`
- **Enable Integration**: Link to Kibana dashboards

#### 3. WebSocket Tab
- **URL**: `ws://your-backend:3001/ws` (auto-configured)
- **Enable Real-time Updates**: Toggle on/off
- **Reconnect Attempts**: 10 (default)

#### 4. General Tab
- **Default View**: Dashboard | Graph | List | Timeline
- **Default Time Range**: 1h, 6h, 24h, 7d (default: 24h)
- **Default Connection Limit**: 1000-100000 (default: 10000)
- **Auto Refresh**: Enable/disable
- **Refresh Interval**: 30s, 1m, 5m, 15m

#### 5. Performance Tab
- **Enable Memory Warnings**: Alert at 80% heap usage
- **Memory Warning Threshold**: 80% (default)
- **Max Connections in Memory**: 100000 (triggers virtualization)

#### 6. Security Tab
- **Enable Anomaly Detection**: ML-based anomaly flagging
- **Anomaly Sensitivity**: Low | Medium | High
- **Auto-whitelist Known Good**: Reduce false positives

---

## Network Topology Setup

### Purpose

Define your network structure so the visualizer can:
- **Intelligently cluster** thousands of hosts
- **Color-code** subnets by function (DMZ, internal, management)
- **Collapse/expand** subnets interactively
- **Apply security context** to connections

### Accessing Topology Manager

Click **Map Icon** (🗺️) in top toolbar → Opens Topology Configuration Dialog

### Configuring Subnets

#### Add a Subnet

1. Click **"Add Subnet"** button
2. Fill in details:
   - **CIDR**: `10.10.0.0/16` (subnet in CIDR notation)
   - **Name**: `Corporate Network`
   - **Type**: Internal | DMZ | External | Management
   - **VLAN** (optional): `100`
   - **Color** (optional): `#4CAF50` (custom color for visualization)
   - **Collapsed**: Whether to show as single node initially

#### Subnet Types

| Type       | Use Case                          | Default Color |
|------------|-----------------------------------|---------------|
| Internal   | Corporate networks, workstations  | Blue          |
| DMZ        | Public-facing servers             | Orange        |
| External   | Internet, partner networks        | Red           |
| Management | Out-of-band management            | Purple        |

#### Example Configuration

```javascript
// Saved in localStorage: 'network-visualizer-topology'
{
  "subnets": [
    {
      "cidr": "10.10.0.0/16",
      "name": "Corporate Network",
      "type": "internal",
      "vlan": 100,
      "collapsed": true
    },
    {
      "cidr": "172.16.50.0/24",
      "name": "DMZ Web Servers",
      "type": "dmz",
      "vlan": 50,
      "collapsed": false
    },
    {
      "cidr": "192.168.100.0/24",
      "name": "Management Network",
      "type": "management",
      "vlan": 999,
      "collapsed": true
    }
  ],
  "hostGroups": [
    {
      "name": "Domain Controllers",
      "hosts": ["10.10.1.10", "10.10.1.11"],
      "icon": "🔐",
      "color": "#9C27B0"
    },
    {
      "name": "Web Servers",
      "hosts": ["172.16.50.10", "172.16.50.11", "172.16.50.12"],
      "icon": "🌐",
      "color": "#FF9800"
    }
  ]
}
```

### Host Groups

Create logical groups of hosts (e.g., "Domain Controllers", "Database Servers"):

1. Click **Host Groups** tab
2. Click **"Add Group"**
3. Fill in:
   - **Name**: `Database Servers`
   - **Hosts**: List of IPs or IP ranges
   - **Icon**: Emoji for visual identification
   - **Color**: Custom color

### Clustering Rules

The visualizer **automatically** applies clustering based on dataset size:

| Dataset Size   | Clustering Behavior                                      |
|----------------|----------------------------------------------------------|
| 1-10 hosts     | Show all individual nodes, no clustering                 |
| 11-100 hosts   | Group by subnet, show subnet nodes                       |
| 101-1,000      | Group by subnet + collapse inactive subnets              |
| 1,000-10,000   | Group by subnet + show only active/anomalous hosts       |
| 10,000+        | Use List View (virtualized), Graph view on-demand only   |

**Interactive Controls in Graph View:**
- **Click subnet node**: Expand to show individual hosts
- **Double-click**: Collapse back to subnet
- **Right-click**: Show subnet summary (connection count, top talkers)

---

## Velociraptor Integration

### What is Velociraptor?

Velociraptor is an endpoint visibility tool that provides:
- Running process lists
- Network connections per host
- File system monitoring
- Registry changes
- Timeline of events

### Why Integrate?

**Network-to-Endpoint Correlation:**

When you see a suspicious network connection in the visualizer, you can:
1. Click **"Correlate to Process"**
2. See which **process** made that connection
3. View **user**, **command line**, **file path**
4. Get **host timeline** around that time
5. Create a **hunt** across all endpoints for that indicator

### Setup

#### 1. Install Velociraptor Server

Follow [Velociraptor documentation](https://docs.velociraptor.app/)

#### 2. Generate API Key

```bash
# On Velociraptor server
velociraptor config api_client --name network-visualizer > api-client.yaml
```

#### 3. Configure Backend

Edit `.env` file:

```bash
VELOCIRAPTOR_URL=https://your-velociraptor.com:8000
VELOCIRAPTOR_API_KEY=your-base64-api-key
```

Or use the **Settings Dialog** in UI (Settings Icon → Velociraptor tab)

#### 4. Verify Integration

Click **Network Check Icon** (🔍) in toolbar → Opens Velociraptor panel

Click **"Test Connection"** → Should show "Enabled ✓"

### Using Correlation

#### Correlate Connection to Process

1. In **List View**, click a connection row
2. Click **Network Check Icon** to open correlation panel
3. Click **"Correlate to Process"**

**Result:**
```
Client ID: C.a8f3e2c1d9b4a7e6
Hostname: WORKSTATION-42
Process ID: 5432
Process Name: chrome.exe
Process Path: C:\Program Files\Google\Chrome\chrome.exe
User: CORP\john.doe
Local Port: 49871
State: ESTABLISHED
```

#### Quick Triage

Collect essential IR data from a host:
1. Open correlation panel
2. Click **"Quick Triage"**

**Collected Data:**
- Running processes
- Network connections
- Logged-in users
- Startup items
- Scheduled tasks
- Recent file modifications

#### View Host Timeline

Get chronological events:
1. Click **"View Timeline"**
2. Select time range (default: last 24h)

**Event Types:**
- File created/modified/deleted
- Process started/stopped
- Network connection established
- Registry key modified

#### Create Hunt

Search all endpoints for an indicator:
1. Click **"Create Hunt"**
2. Enter indicator:
   - **IP**: `192.168.1.100`
   - **Domain**: `malicious.com`
   - **Hash**: `abc123def456...`
3. Click **"Create Hunt"**

Hunt runs across **all Velociraptor clients**, returns matches.

---

## Large-Scale Deployment

### Design for 110,000+ Hosts

The system is architected for massive scale:

#### Frontend Optimizations

1. **Virtual Scrolling**
   - Uses `react-window` library
   - Renders only visible rows (~20 at a time)
   - Supports 110k+ rows without browser freeze
   - Memory usage: ~12MB (vs 512MB for full DOM)

2. **Auto-switching**
   - Connections > 10k → Automatically uses virtualized list
   - Toggle manually: Settings → Performance → Max Connections

3. **Memory Monitoring**
   - Real-time heap usage tracking
   - Warning at 80% threshold
   - Suggests clearing filters or reducing time range

4. **Column Selection**
   - Choose exactly which columns to display
   - Fewer columns = faster rendering
   - Saved to localStorage

#### Backend Optimizations

1. **Pagination**
   - Default page size: 1000 connections
   - Max page size: 10,000 connections
   - Uses Elasticsearch Point-in-Time (PIT) for deep pagination

2. **Streaming Export**
   - `GET /api/large-scale/stream-export`
   - Streams millions of rows as NDJSON
   - Memory-efficient (processes in batches)

3. **Fast Counts**
   - `GET /api/large-scale/count`
   - Returns count only (no data fetch)
   - Use for "X of Y connections" display

4. **Aggregated Metrics**
   - `GET /api/large-scale/metrics`
   - Pre-computed stats (top talkers, protocols, etc.)
   - No need to fetch all connections

#### Elasticsearch Optimizations

1. **Index Settings**

```json
PUT zeek-*/_settings
{
  "index": {
    "max_result_window": 100000,
    "refresh_interval": "30s",
    "number_of_replicas": 1
  }
}
```

2. **Index Lifecycle Management (ILM)**

```json
PUT _ilm/policy/zeek-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

3. **Field Mappings**

Ensure Zeek fields are properly mapped:

```json
PUT _index_template/zeek-template
{
  "index_patterns": ["zeek-*"],
  "template": {
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "id.orig_h": { "type": "ip" },
        "id.resp_h": { "type": "ip" },
        "id.orig_p": { "type": "integer" },
        "id.resp_p": { "type": "integer" },
        "proto": { "type": "keyword" },
        "service": { "type": "keyword" },
        "orig_bytes": { "type": "long" },
        "resp_bytes": { "type": "long" },
        "conn_state": { "type": "keyword" },
        "community_id": { "type": "keyword" }
      }
    }
  }
}
```

### Scaling Guidelines

| Metric                    | Small      | Medium       | Large         | Enterprise    |
|---------------------------|------------|--------------|---------------|---------------|
| **Hosts**                 | <1,000     | 1k-10k       | 10k-50k       | 50k-110k+     |
| **Connections/day**       | <1M        | 1M-10M       | 10M-100M      | 100M-1B       |
| **Elasticsearch Nodes**   | 1          | 3            | 5-10          | 10-20+        |
| **RAM per ES Node**       | 8GB        | 16GB         | 32GB          | 64GB+         |
| **Backend Instances**     | 1          | 2 (HA)       | 3-5           | 5-10+         |
| **Retention Period**      | 30 days    | 60 days      | 90 days       | 180+ days     |

---

## Performance Tuning

### Frontend Tuning

1. **Reduce Time Range**
   - Default: 24h
   - For 110k hosts: Use 1h or 6h initially
   - Expand as needed

2. **Use Filters**
   - Filter by subnet, protocol, or service
   - Reduces dataset size significantly
   - Example: `protocol=tcp AND destPort=22` (SSH only)

3. **Limit Connections**
   - Settings → General → Default Connection Limit
   - Recommended: 10,000 for initial load
   - Use pagination for more

4. **Enable Virtualization**
   - Automatically enabled for >10k connections
   - Manually enable: Toggle in List View toolbar

5. **Select Fewer Columns**
   - Click **Column Icon** in List View
   - Deselect unused columns
   - Saves memory and improves rendering

### Backend Tuning

1. **Increase Node.js Heap**

```bash
# In production
NODE_OPTIONS="--max-old-space-size=8192" npm start
```

2. **Enable Clustering**

```javascript
// server.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
} else {
  // Start Express app
}
```

3. **Cache Aggregations**

Use Redis for caching metrics:

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getMetrics(filters) {
  const cacheKey = JSON.stringify(filters);
  const cached = await client.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const metrics = await largeScaleService.getAggregatedMetrics(filters);
  await client.setex(cacheKey, 300, JSON.stringify(metrics)); // 5min cache

  return metrics;
}
```

### Elasticsearch Tuning

1. **Increase Heap Size**

```bash
# config/jvm.options
-Xms16g
-Xmx16g  # Set to 50% of RAM, max 32GB
```

2. **Optimize Queries**

Use filters instead of queries when possible:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "proto": "tcp" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

3. **Use Composite Aggregations**

For large cardinality aggregations:

```json
{
  "aggs": {
    "sources": {
      "composite": {
        "size": 10000,
        "sources": [
          { "ip": { "terms": { "field": "id.orig_h" } } }
        ]
      }
    }
  }
}
```

4. **Enable Index Sorting**

```json
PUT zeek-*/_settings
{
  "index": {
    "sort.field": "@timestamp",
    "sort.order": "desc"
  }
}
```

---

## Security Considerations

### Authentication & Authorization

**Current State:** Basic authentication via Elasticsearch credentials

**Recommended Enhancements:**

1. **Add Nginx Auth**

```nginx
location / {
    auth_basic "Network Visualizer";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

2. **Implement JWT Authentication**

```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

3. **RBAC (Role-Based Access Control)**

```javascript
// Define roles
const roles = {
  analyst: ['read'],
  senior_analyst: ['read', 'hunt', 'triage'],
  admin: ['read', 'hunt', 'triage', 'whitelist', 'settings']
};

function checkPermission(action) {
  return (req, res, next) => {
    if (roles[req.user.role].includes(action)) {
      next();
    } else {
      res.sendStatus(403);
    }
  };
}
```

### Network Security

1. **Use HTTPS**

```bash
# Generate SSL certificate
sudo certbot --nginx -d network-viz.your-domain.com
```

2. **Enable WSS (WebSocket Secure)**

```javascript
// backend/services/websocketService.js
const https = require('https');
const fs = require('fs');

const server = https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
}, app);
```

3. **Firewall Rules**

```bash
# Only allow specific IPs
sudo ufw allow from 10.10.0.0/16 to any port 3001
sudo ufw allow from 192.168.1.0/24 to any port 3001
```

### Data Security

1. **Encrypt Elasticsearch at Rest**

```yaml
# elasticsearch.yml
xpack.security.encryption_keys:
  data: "your-256-bit-key"
```

2. **Sanitize User Input**

```javascript
const validator = require('validator');

function sanitizeFilters(filters) {
  if (filters.sourceIp && !validator.isIP(filters.sourceIp)) {
    throw new Error('Invalid IP address');
  }
  // ... sanitize other fields
}
```

3. **Audit Logging**

```javascript
// Log all API requests
app.use((req, res, next) => {
  console.log({
    timestamp: new Date(),
    user: req.user?.username,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});
```

---

## Troubleshooting

### Common Issues

#### 1. Elasticsearch Connection Failed

**Symptoms:**
- Backend logs: `WARNING: Elasticsearch connection failed`
- Frontend: "Failed to load network data"

**Solutions:**

```bash
# Test connectivity
curl -k -u elastic:password https://your-elasticsearch:9200

# Check credentials in .env
cat backend/.env | grep ES_

# Verify Elasticsearch is running
systemctl status elasticsearch

# Check Elasticsearch logs
tail -f /var/log/elasticsearch/elasticsearch.log
```

#### 2. Velociraptor Integration Not Working

**Symptoms:**
- Correlation panel shows "Disabled ✗"
- API calls return 500 errors

**Solutions:**

```bash
# Verify API key is set
cat backend/.env | grep VELOCIRAPTOR_API_KEY

# Test Velociraptor API
curl -k -H "Authorization: Bearer $VELOCIRAPTOR_API_KEY" \
  https://your-velociraptor:8000/api/v1/GetServerInfo

# Check Velociraptor logs
journalctl -u velociraptor -f
```

#### 3. WebSocket Not Connecting

**Symptoms:**
- "Offline" indicator in UI
- No real-time updates

**Solutions:**

```bash
# Check WebSocket endpoint
wscat -c ws://localhost:3001/ws

# Verify firewall allows WebSocket
sudo ufw status | grep 3001

# Check Nginx config for WebSocket proxy
nginx -t
cat /etc/nginx/sites-available/network-visualizer | grep -A5 "location /ws"
```

#### 4. Graph View Not Rendering

**Symptoms:**
- Blank graph area
- Console errors about Cytoscape

**Solutions:**

```javascript
// Check browser console
// If "Container is not defined", ensure containerRef is set

// Reduce dataset size
// Graph view recommended for <1000 nodes
// Use List View for larger datasets
```

#### 5. Memory Warnings in Browser

**Symptoms:**
- "Memory usage high" alert
- Browser becomes slow/unresponsive

**Solutions:**

1. **Reduce time range** (24h → 1h)
2. **Apply filters** to reduce dataset
3. **Lower connection limit** (Settings → General)
4. **Clear browser cache** and refresh
5. **Enable virtualized list** for large datasets

#### 6. Slow Query Performance

**Symptoms:**
- Queries take >5 seconds
- Elasticsearch CPU/memory high

**Solutions:**

```bash
# Check index health
GET _cat/indices/zeek-*?v

# Check shard distribution
GET _cat/shards/zeek-*?v

# Optimize indices
POST zeek-*/_forcemerge?max_num_segments=1

# Check slow queries
GET zeek-*/_search
{
  "profile": true,
  "query": { ... }
}
```

---

## Best Practices

### Operational

1. **Start Small, Scale Up**
   - Begin with 1h time range
   - Add filters to reduce noise
   - Gradually expand time range as needed

2. **Use Saved Filters**
   - Create filters for common investigations
   - Share with team via export/import
   - Name filters descriptively

3. **Leverage Threat Presets**
   - 23 pre-built MITRE ATT&CK filters
   - One-click detection of common threats
   - Customize presets for your environment

4. **Regular Baseline Updates**
   - Update baselines weekly
   - Capture normal traffic patterns
   - Improves anomaly detection accuracy

5. **Monitor Memory Usage**
   - Keep an eye on memory monitor
   - Clear data if usage >80%
   - Adjust connection limits in settings

### Security

1. **Whitelist Known Good**
   - Internal DNS servers
   - Patch management systems
   - Monitoring infrastructure
   - Reduces alert fatigue

2. **Correlate Everything**
   - Network connection → Process → File → Timeline
   - Use Velociraptor for full context
   - Document findings in case notes

3. **Hunt Proactively**
   - Run threat hunting presets daily
   - Look for anomalous timing (after-hours activity)
   - Investigate beaconing patterns

4. **Create Hunts for IOCs**
   - When you find a threat, hunt for it everywhere
   - Use Velociraptor hunts across all endpoints
   - Track hunt results in tickets

### Performance

1. **Optimize Elasticsearch**
   - Use ILM to manage index lifecycle
   - Delete old indices (>90 days)
   - Monitor shard count (<20 shards/GB RAM)

2. **Cache Aggressively**
   - Use Redis for metrics caching
   - Cache subnet configurations
   - Cache threat intel feeds

3. **Load Balance**
   - Run multiple backend instances
   - Use Nginx for load balancing
   - Distribute across availability zones

4. **Monitor Everything**
   - Elasticsearch cluster health
   - Backend API latency
   - Frontend bundle size
   - WebSocket connection count

### Maintenance

1. **Regular Backups**

```bash
# Snapshot Elasticsearch indices
PUT _snapshot/backup/zeek-snapshot-$(date +%Y%m%d)
{
  "indices": "zeek-*",
  "ignore_unavailable": true,
  "include_global_state": false
}

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  backend/.env \
  /etc/nginx/sites-available/network-visualizer
```

2. **Update Dependencies**

```bash
# Backend
cd backend
npm audit
npm update

# Frontend
cd frontend
npm audit fix
npm update
```

3. **Log Rotation**

```bash
# /etc/logrotate.d/network-visualizer
/var/log/network-visualizer/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload network-visualizer
    endscript
}
```

4. **Health Checks**

```bash
# Create monitoring script
#!/bin/bash
# check-health.sh

# Backend health
if ! curl -sf http://localhost:3001/health > /dev/null; then
    echo "Backend unhealthy"
    systemctl restart network-visualizer-backend
fi

# Elasticsearch health
if ! curl -sf http://localhost:9200/_cluster/health > /dev/null; then
    echo "Elasticsearch unhealthy"
    # Alert ops team
fi

# Velociraptor health
if ! curl -sf https://localhost:8000/api/v1/GetServerInfo > /dev/null; then
    echo "Velociraptor unhealthy"
    # Alert ops team
fi
```

---

## Additional Resources

- [Threat Hunting Guide](./THREAT_HUNTING_GUIDE.md)
- [Large-Scale Deployment Guide](./LARGE_SCALE_GUIDE.md)
- [Zeek Documentation](https://docs.zeek.org/)
- [Velociraptor Documentation](https://docs.velociraptor.app/)
- [Elasticsearch Reference](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/network-visualizer/issues
- Documentation: https://docs.your-domain.com/network-visualizer
- Slack: #network-visualizer (internal)

---

*Last Updated: 2024*
*Version: 2.0*
