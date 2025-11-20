# Mock Data Setup Guide

## Overview

This guide explains how to set up Elasticsearch with realistic mock network data for development and testing of the Network Visualizer.

The mock data generator creates realistic Zeek-like network connection logs with:
- **Multiple subnets** (corporate, servers, DMZ, management, IoT)
- **Realistic traffic patterns** (HTTP, HTTPS, SSH, DNS, SMB, RDP, etc.)
- **Anomalous patterns** for threat hunting testing (beaconing, lateral movement, port scanning, exfiltration)
- **Configurable scale** (100 to 110,000+ hosts)
- **Time-based data** (configurable time range)

---

## Prerequisites

Before running the quick start script, ensure you have the following installed:

### Required Software

- **Node.js** (v18 LTS or v20 LTS) - [Download](https://nodejs.org/)
  - ⚠️ **Important**: Use LTS versions only (v18 or v20)
  - ❌ **Do NOT use** v21, v22, v23, v25, etc. (will cause build errors)
  - ✅ **Recommended**: Node.js v20 LTS for best compatibility
- **npm** (comes with Node.js)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **docker-compose** (included with Docker Desktop)
- **curl** (usually pre-installed on Mac/Linux)

### Installation on macOS

The quickstart script will automatically detect missing dependencies and provide installation instructions. For manual installation:

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js v20 LTS (recommended)
brew install node@20
brew link node@20

# OR if you need to manage multiple Node versions
brew install nvm
nvm install 20
nvm use 20
nvm alias default 20

# Install Docker Desktop
brew install --cask docker

# Open Docker Desktop and wait for it to start
# Look for the Docker icon in your menu bar
```

**If you already have Node.js installed but it's the wrong version:**
```bash
# Check your current version
node --version

# If it shows v21+ or v25+, uninstall and install LTS
brew uninstall node
brew install node@20
brew link node@20
```

### Installation on Linux

```bash
# Install Node.js v20 LTS (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# OR Install Node.js v20 LTS (Fedora/RHEL)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# OR use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20
nvm alias default 20

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for Docker group changes to take effect
```

---

## Quick Start (Recommended)

The fastest way to get started:

```bash
# From project root
cd backend/scripts
./quickstart.sh medium 24
```

**The script will automatically:**
1. ✓ Check all required dependencies (Node.js, npm, Docker, docker-compose, curl)
2. ✓ Provide installation instructions for any missing dependencies
3. ✓ Verify Docker daemon is running
4. ✓ Start Elasticsearch and Kibana in Docker
5. ✓ Generate 1,000 hosts worth of data over 24 hours (~240k connections)
6. ✓ Create proper indices and mappings
7. ✓ Load all data into Elasticsearch
8. ✓ Verify the data

**Time**: ~5-10 minutes depending on scale

**If Dependencies Are Missing:**
The script will detect and show exactly what's needed:
```
✗ Node.js not found
✗ npm not found
✓ Docker 24.0.5
✗ Docker daemon is not running

Installation Instructions for macOS:
  brew install node
  brew install --cask docker
  # Then open Docker Desktop and wait for it to start
```

---

## Dataset Scales

| Scale | Hosts | Connections/Hour | 24h Total | Use Case |
|-------|-------|------------------|-----------|----------|
| **small** | 100 | 1,000 | ~24k | Quick testing, feature development |
| **medium** | 1,000 | 10,000 | ~240k | Standard development, UI testing |
| **large** | 10,000 | 100,000 | ~2.4M | Performance testing, clustering |
| **enterprise** | 110,000 | 1,000,000 | ~24M | Stress testing, large-scale features |

### Choosing a Scale

- **Development**: Use `small` or `medium` for fast iteration
- **Testing threat hunting**: Use `medium` (has good anomaly coverage)
- **Testing graph clustering**: Use `large` (tests auto-clustering)
- **Testing 110k+ hosts**: Use `enterprise` (full scale)

---

## Network Topology

The mock data includes the following subnets:

### Configured Subnets

| Subnet | CIDR | Type | VLAN | Hosts | Purpose |
|--------|------|------|------|-------|---------|
| **Corporate** | 10.10.0.0/16 | Internal | 100 | 1-5000 | Employee workstations |
| **Servers** | 10.20.0.0/16 | Internal | 200 | 1-1000 | Production servers |
| **DMZ** | 172.16.50.0/24 | DMZ | 50 | 1-50 | Public-facing services |
| **Management** | 192.168.100.0/24 | Management | 999 | 1-100 | Network management |
| **IoT** | 10.30.0.0/16 | Internal | 300 | 1-2000 | IoT devices |

**To configure in UI:**
1. Click Map icon (🗺️)
2. Add subnets tab
3. Paste CIDR, name, type, VLAN
4. Save

---

## Generated Data Details

### Normal Traffic Patterns

**Common Services** (70% of traffic):
- HTTP (80/tcp) - 30%
- HTTPS (443/tcp) - 40%
- DNS (53/udp) - 15%
- SSH (22/tcp) - 5%
- SMB (445/tcp) - 2%
- RDP (3389/tcp) - 1%
- Email (SMTP/IMAP) - 3%
- Database (MySQL/PostgreSQL) - 2%
- Other services - 2%

**Traffic Distribution:**
- 70% Internal-to-internal
- 30% Internal-to-external

**Connection States:**
- 70% SF (normal establishment)
- 10% S0 (no reply)
- 5% REJ (rejected)
- 15% Other states (RSTO, RSTR, S1)

### Anomalous Patterns (2% of traffic)

**Beaconing (C2 Communication)** - 30% of anomalies
- Regular intervals (~60 seconds with jitter)
- Small data transfers
- HTTPS to external IPs
- 10 connections per pattern
- **Detection**: Use Timeline View → Look for regular patterns

**Lateral Movement** - 20% of anomalies
- SMB connections across internal hosts
- Rapid succession (5 seconds apart)
- Server-to-server or workstation-to-server
- **Detection**: Threat Hunting → "SMB Lateral Movement"

**Port Scanning** - 15% of anomalies
- 20-50 ports scanned rapidly (100ms apart)
- S0 connection state (no reply)
- Sequential port ranges
- **Detection**: Threat Hunting → "Port Scanning Activity"

**Data Exfiltration** - 10% of anomalies
- Large uploads (100MB-600MB)
- HTTPS to external IPs
- Long duration (1-5 minutes)
- **Detection**: Threat Hunting → "Large Data Upload"

**Other Anomalies** - 25%
- Failed connections
- Unusual port combinations
- After-hours activity

---

## Setup Methods

### Method 1: Quick Start Script (Recommended)

**Single command setup:**

```bash
cd backend/scripts
./quickstart.sh [scale] [timeRange]
```

**Examples:**

```bash
# Small dataset, 1 hour
./quickstart.sh small 1

# Medium dataset, 24 hours (default)
./quickstart.sh medium 24

# Large dataset, 72 hours
./quickstart.sh large 72

# Enterprise scale, 24 hours
./quickstart.sh enterprise 24
```

**What it does:**
1. Validates Docker is running
2. Starts Elasticsearch + Kibana containers
3. Waits for services to be healthy
4. Generates mock data
5. Creates indices with proper mappings
6. Bulk loads data into Elasticsearch
7. Verifies data and prints statistics

---

### Method 2: Manual Setup

#### Step 1: Start Elasticsearch

**Option A: Docker Compose (Recommended)**

```bash
# From project root
docker-compose -f docker-compose.dev.yml up -d

# Wait for health check
curl http://localhost:9200/_cluster/health
```

**Option B: Existing Elasticsearch**

Use your existing Elasticsearch instance. Configure in `.env`:

```bash
ES_URL=https://your-elasticsearch:9200
ES_USERNAME=your-username
ES_PASSWORD=your-password
# OR
ES_API_KEY=your-api-key
```

#### Step 2: Generate Data

```bash
cd backend
node scripts/generateMockData.js [scale] [timeRange]
```

This creates a JSON file: `mock-data-{scale}-{timestamp}.json`

**Example output:**
```
Generating medium dataset:
- Hosts: 1000
- Time range: 24 hours
- Total connections: 240,000
- Anomalous connections: 4,800
Generating normal traffic...
Progress: 100.0%
Generating anomalous patterns...
✓ Data generation complete!

Data written to: mock-data-medium-1234567890.json
File size: 145.32 MB
```

#### Step 3: Load Data into Elasticsearch

```bash
cd backend
node scripts/setupMockElasticsearch.js [scale] [timeRange]
```

**Example output:**
```
Elasticsearch Mock Data Setup
============================================================

Testing Elasticsearch connection...
✓ Connected to Elasticsearch 8.11.0
  Cluster: docker-cluster

Creating index template for zeek-* indices...
✓ Index template created successfully

Generating medium mock data (24h time range)...
[...generation progress...]

Creating index: zeek-conn-2024.11.19
✓ Index zeek-conn-2024.11.19 created successfully

Indexing 240,000 connections...
Progress: 100.0% (240,000/240,000)
✓ Bulk indexing complete
Refreshing index...
✓ Index refreshed

Verifying indexed data...
✓ Total documents: 240,000
✓ Sample document retrieved successfully
  Latest connection: 10.10.123.45 → 8.8.8.8

✓ Protocol distribution:
  tcp: 204,000
  udp: 36,000

✓ Top services:
  https: 96,000
  http: 72,000
  dns: 36,000
  ssh: 12,000
  smb: 4,800

✓ Network topology document created

============================================================
✓ Setup complete!
============================================================

Index: zeek-conn-2024.11.19
Connections: 240,000
Time range: 2024-11-18T02:00:00.000Z to 2024-11-19T02:00:00.000Z

You can now use the Network Visualizer to explore this data!
```

---

## Starting the Application

### Backend

```bash
cd backend

# Make sure .env is configured
cat > .env <<EOF
ES_URL=http://localhost:9200
ES_INDEX_PATTERN=zeek-*
PORT=3001
NODE_ENV=development
EOF

# Start
npm start
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║   Network Visualizer Backend                          ║
║   Port: 3001                                          ║
║   Environment: development                            ║
║   Elasticsearch: Connected ✓                          ║
║   Velociraptor: Disabled ✗                            ║
║   WebSocket: ws://localhost:3001/ws                   ║
╚════════════════════════════════════════════════════════╝
```

### Frontend

```bash
cd frontend
npm run dev
```

Open: http://localhost:3000

---

## Configuration in UI

### Elasticsearch Settings

1. Click **Settings Icon** (⚙️) in top right
2. **Elasticsearch tab:**
   - URL: `http://localhost:9200`
   - Username: *(leave blank for Docker setup)*
   - Password: *(leave blank for Docker setup)*
   - Index Pattern: `zeek-*`
3. Click **Save**

### Network Topology

1. Click **Map Icon** (🗺️)
2. **Subnets tab** → Add each subnet:
   ```
   CIDR: 10.10.0.0/16
   Name: Corporate Network
   Type: Internal
   VLAN: 100
   ```
3. Repeat for all 5 subnets (see table above)
4. Click **Save**

---

## Testing Features

### 1. Dashboard View

- Click **Dashboard** button
- Should show:
  - Total connections
  - Anomalies detected
  - Protocol distribution chart
  - Top talkers
  - Recent anomalies

### 2. Graph View

- Click **Graph** button
- Should show:
  - Subnet grouping (if configured)
  - Color-coded by subnet type
  - Click subnet to see stats
  - Double-click to expand/collapse

**Test Clustering:**
- Change clustering mode (Auto/None/Subnet/Collapsed)
- Try different layouts (Force/Grid/Circle/Concentric)

### 3. List View

- Click **List** button
- Should show virtualized list of connections
- Test filters:
  - Protocol: TCP
  - Service: https
  - Dest Port: 443

### 4. Threat Hunting

- Click **Security Icon** (🔒)
- Try presets:
  - **SMB Lateral Movement**: Should find lateral movement patterns
  - **Beaconing Detection**: Use Timeline view after filtering
  - **Port Scanning Activity**: Should find scan patterns
  - **Large Data Upload**: Should find exfiltration patterns

### 5. Timeline View

- Click **Timeline** button
- Select a single source IP with multiple connections
- Look for:
  - Regular intervals (beaconing)
  - Burst patterns (scanning)
  - Connection clusters

---

## Data Volumes and Performance

### Small Scale (100 hosts, 24h)

- **Connections**: ~24,000
- **Index size**: ~15 MB
- **Load time**: ~30 seconds
- **Query time**: <100ms
- **Memory**: <512 MB

### Medium Scale (1,000 hosts, 24h)

- **Connections**: ~240,000
- **Index size**: ~150 MB
- **Load time**: ~3 minutes
- **Query time**: <500ms
- **Memory**: ~1 GB

### Large Scale (10,000 hosts, 24h)

- **Connections**: ~2,400,000
- **Index size**: ~1.5 GB
- **Load time**: ~15 minutes
- **Query time**: <2 seconds
- **Memory**: ~4 GB

### Enterprise Scale (110,000 hosts, 24h)

- **Connections**: ~24,000,000
- **Index size**: ~15 GB
- **Load time**: ~2 hours
- **Query time**: <10 seconds
- **Memory**: ~8 GB

**Note**: Use `large` or `enterprise` scales only when specifically testing large-scale performance.

---

## Troubleshooting

### Elasticsearch won't start

```bash
# Check Docker logs
docker logs network-viz-elasticsearch

# Common fix: Increase Docker memory
# Docker Desktop → Settings → Resources → Memory: 4GB+
```

### Connection refused to Elasticsearch

```bash
# Verify it's running
curl http://localhost:9200

# Check firewall
sudo ufw allow 9200
```

### Data generation is slow

This is normal for `large` and `enterprise` scales:
- Small: ~10 seconds
- Medium: ~30 seconds
- Large: ~2 minutes
- Enterprise: ~20 minutes

Use `small` or `medium` for development.

### Out of memory during bulk indexing

Reduce batch size in `setupMockElasticsearch.js`:

```javascript
await bulkIndexConnections(client, indexName, connections, 500); // Reduced from 1000
```

### No anomalies detected

Anomalies are 2% of traffic by default. With small datasets, you may have only a few.

**To increase anomaly rate:**

Edit `generateMockData.js`:
```javascript
const { connections, metadata } = generateMockData({
  scale: 'medium',
  timeRange: 24,
  anomalyRate: 0.1 // 10% instead of 2%
});
```

---

## Cleanup

### Stop and remove containers

```bash
docker-compose -f docker-compose.dev.yml down

# Also remove volumes (deletes all data)
docker-compose -f docker-compose.dev.yml down -v
```

### Delete indices

```bash
curl -X DELETE http://localhost:9200/zeek-*
curl -X DELETE http://localhost:9200/network-topology
```

### Delete generated files

```bash
rm backend/mock-data-*.json
```

---

## Advanced Usage

### Custom Anomaly Patterns

Edit `generateMockData.js` to add custom patterns:

```javascript
// Add custom lateral movement pattern
function generateCustomLateralMovement(timestamp, attackerIP) {
  // Your custom logic
}

// Add to anomalous patterns section
connections.push(...generateCustomLateralMovement(timestamp, attackerIP));
```

### Multiple Time Periods

Generate data for different time periods:

```bash
# Last 7 days
node scripts/setupMockElasticsearch.js medium 168

# Last 30 days
node scripts/setupMockElasticsearch.js medium 720
```

**Note**: Each run creates a new index with current date. Old indices remain.

### Export Data for Sharing

```bash
# Generate data
node scripts/generateMockData.js medium 24

# Share the JSON file
scp mock-data-medium-*.json teammate@server:/path/

# Teammate can load it:
node scripts/setupMockElasticsearch.js medium 24
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
          discovery.type: single-node
          xpack.security.enabled: false
        ports:
          - 9200:9200

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Setup mock data
        run: cd backend && node scripts/setupMockElasticsearch.js small 1

      - name: Run tests
        run: cd backend && npm test
```

---

## Best Practices

1. **Use appropriate scale for task:**
   - Feature development → `small`
   - UI testing → `medium`
   - Performance testing → `large`
   - Stress testing → `enterprise`

2. **Generate fresh data daily** for active development (prevents stale timestamps)

3. **Configure network topology** in UI after data load for best graph visualization

4. **Start with small scale** to verify setup, then scale up

5. **Monitor Docker resources** - Elasticsearch needs at least 2GB RAM

6. **Use time range wisely** - 24h is usually sufficient, 7d+ for timeline testing

7. **Check Kibana** (http://localhost:5601) to verify data structure if issues arise

---

## FAQ

**Q: Can I use existing Elasticsearch?**
A: Yes, just configure `ES_URL` in `.env`. The scripts work with any Elasticsearch 7.x or 8.x.

**Q: How do I reset the data?**
A: Run `./quickstart.sh [scale] [timeRange]` again. It deletes and recreates the index.

**Q: Can I add more subnets?**
A: Yes! Edit `SUBNETS` object in `generateMockData.js` and regenerate.

**Q: Why are timestamps recent?**
A: Mock data is generated relative to "now". Data from 24h ago to current time.

**Q: Can I generate data for a specific date?**
A: Modify the `startTime` in `generateMockData()` function to use a fixed timestamp.

**Q: Does this work on Windows?**
A: Yes, but use PowerShell or Git Bash for the shell script. Or run Node commands directly.

**Q: How do I know if it worked?**
A: Check:
1. `curl http://localhost:9200/zeek-*/_count` → Should show document count
2. Open Kibana → Dev Tools → `GET zeek-*/_search`
3. Open Network Visualizer → Dashboard → Should show connections

---

## Support

For issues:
1. Check Elasticsearch logs: `docker logs network-viz-elasticsearch`
2. Check backend logs when running `npm start`
3. Verify health: `curl http://localhost:9200/_cluster/health`
4. Check index exists: `curl http://localhost:9200/_cat/indices?v`

---

**Last Updated**: 2024
**Version**: 1.0
