# Network Visualizer - Major Updates

## Overview
Enhanced the Network Visualizer with individual connection tracking, smart whitelist filtering, and anomaly detection for whitelisted entities.

## Key Changes

### 1. Individual Connection Tracking

**Backend Changes:**
- Added `getIndividualConnections()` method to ElasticsearchService
- Returns raw connection documents instead of aggregated data
- Supports extensive filtering: protocol, port, service, connection state, traffic volume
- New endpoint: `GET /api/network/connections`

**Benefits:**
- View every single socket connection individually
- Filter at the connection level (not just aggregated stats)
- See detailed connection metadata (history, states, packet counts, etc.)
- Limit results to manage browser memory (default: 10,000 connections)

### 2. Smart Whitelist Behavior

**Previous Behavior:**
- Whitelisted entities were completely hidden from view
- All connections removed if source or dest was whitelisted

**New Behavior:**
- Whitelisted nodes/hosts **remain visible** on the graph
- Normal connections from/to whitelisted entities are **hidden**
- **Anomalous connections** on whitelisted entities are **highlighted**
- Data not shown is **removed from browser memory** (not just hidden)

**Example:**
```
User whitelist: 192.168.1.100 (web server)
- Node for 192.168.1.100 stays visible
- Normal HTTP/HTTPS traffic hidden
- NEW: Connection to unusual port 4444 → SHOWN & FLAGGED
- NEW: Connection to never-before-seen IP → SHOWN & FLAGGED
```

### 3. Baseline Tracking & Anomaly Detection

**Baseline Generation:**
- Automatically generates behavioral baseline for whitelisted entities
- Tracks over 7-day window (configurable)
- Stores:
  - Common destination IPs
  - Common ports
  - Common protocols
  - Common services
  - Connection patterns (IP:port:protocol combinations)
  - Average traffic volumes

**Anomaly Detection:**
- Compares new connections against baseline
- Flags anomalies with severity levels:
  - **HIGH**: New connection pattern (IP:port:protocol combo)
  - **MEDIUM**: New destination IP, new protocol, high traffic volume
  - **LOW**: New port, new service

**API Endpoints:**
- `GET /api/network/baseline/:ip` - Get or generate baseline
- `POST /api/network/baseline` - Manually generate baseline
- `DELETE /api/network/baseline/:entityValue/:entityType` - Remove baseline

### 4. Database Schema Updates

**New Table: baselines**
```sql
CREATE TABLE baselines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_value TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'ip' or 'subnet'
  baseline_data TEXT NOT NULL,  -- JSON blob
  generated_at DATETIME,
  lookback_days INTEGER,
  UNIQUE(entity_value, entity_type)
);
```

### 5. Memory Management

**Improved Frontend Efficiency:**
- Filtered data is **removed** from memory, not just hidden
- Connections returned from API are already filtered server-side
- Limit parameter prevents browser overload
- Progressive loading for large datasets

## Usage Examples

### Generate Baseline for Whitelisted IP

```bash
# Add IP to whitelist
POST /api/whitelist
{
  "entryType": "ip",
  "value": "192.168.1.100",
  "description": "Corporate web server"
}

# Generate baseline (7-day lookback)
POST /api/network/baseline
{
  "entityValue": "192.168.1.100",
  "entityType": "ip",
  "lookbackDays": 7
}
```

### View Individual Connections with Filters

```bash
# Get connections with filtering
GET /api/network/connections?
  timeRange=1&
  protocol=tcp&
  destPort=443&
  minBytes=1000000&
  hideWhitelisted=true&
  limit=5000
```

### Smart Filtering Workflow

1. User adds IP to whitelist
2. System auto-generates baseline (or user triggers it)
3. Normal traffic from that IP is hidden
4. New/unusual connections are flagged
5. Analyst investigates only anomalies

## API Reference

### Individual Connections
```
GET /api/network/connections

Query Parameters:
- timeRange: Hours (1-168)
- sourceIp: Filter by source IP
- destIp: Filter by destination IP
- subnet: Filter by subnet prefix
- protocol: Filter by protocol (tcp, udp, icmp)
- destPort: Filter by destination port
- service: Filter by service name
- connState: Filter by connection state
- minBytes: Minimum traffic volume
- limit: Max results (default 10000, max 50000)
- hideWhitelisted: Apply smart filtering (true/false)

Response:
{
  "connections": [ ... array of connection objects ... ],
  "nodes": [ ... ],
  "stats": {
    "totalConnections": 1234,
    "uniqueSources": 45,
    "uniqueDestinations": 127,
    "whitelistedNodes": 5,
    "filteredConnections": 890,
    "anomalousConnections": 3
  },
  "anomalousConnections": [ ... flagged connections ... ]
}
```

### Baseline Management
```
GET /api/network/baseline/:ip?isSubnet=false&lookbackDays=7&regenerate=false
POST /api/network/baseline { entityValue, entityType, lookbackDays }
DELETE /api/network/baseline/:entityValue/:entityType
```

## Connection Object Structure

```javascript
{
  id: "elasticsearch-doc-id",
  timestamp: "2025-11-18T12:34:56Z",
  sourceIp: "192.168.1.100",
  sourcePort: 54321,
  destIp: "10.0.0.50",
  destPort: 443,
  protocol: "tcp",
  service: "ssl",
  duration: 45.23,
  origBytes: 1024000,
  respBytes: 2048000,
  origPackets: 1500,
  respPackets: 2100,
  connState: "SF",  // Zeek connection state
  history: "ShADadFf",  // Zeek history
  localOrig: true,
  localResp: false,
  missedBytes: 0,

  // Added by anomaly detection (if applicable)
  anomalies: [
    {
      type: "new_connection_pattern",
      severity: "high",
      message: "New connection pattern: 10.0.0.50:443/tcp"
    }
  ],
  isAnomalous: true
}
```

## Migration Notes

### Existing Deployments

1. **Database Migration**: Automatically creates `baselines` table on startup
2. **API Changes**: Backward compatible - existing endpoints unchanged
3. **Frontend**: Optional - can still use aggregated view

### Generating Baselines

**Option 1: Auto-generate when whitelisting**
```javascript
// After adding to whitelist
await generateBaseline(ip, 'ip', 7);
```

**Option 2: Batch generation**
```bash
# Get all whitelisted IPs
GET /api/whitelist?type=ip

# Generate baselines for each
for ip in whitelisted_ips:
  POST /api/network/baseline { entityValue: ip, entityType: 'ip' }
```

### Recommended Workflow

1. **Initial Setup**:
   - Add known-good hosts/subnets to whitelist
   - Generate baselines (7-14 day lookback recommended)

2. **Daily Operations**:
   - View network with `hideWhitelisted=true`
   - Focus on non-whitelisted traffic
   - Investigate anomalies on whitelisted hosts

3. **Baseline Maintenance**:
   - Regenerate baselines weekly/monthly
   - Update when infrastructure changes
   - Remove baselines for decommissioned hosts

## Performance Considerations

### Memory Usage
- Individual connections mode uses more memory than aggregated
- Use `limit` parameter to cap results
- Consider pagination for large datasets (>10k connections)

### Query Performance
- Baseline generation can be expensive (scans days of data)
- Generate baselines during off-peak hours
- Consider caching baselines (already stored in SQLite)

### Recommendations
- **Small environments (<1000 hosts)**: Use individual connections by default
- **Medium environments (1000-10000 hosts)**: Use filters + limits
- **Large environments (>10000 hosts)**: Start with aggregated view, drill down as needed

## Frontend Updates (Coming Next)

- Connection list view component
- Toggle between graph view and list view
- Connection-level filtering UI
- Anomaly highlighting in the graph
- Baseline management interface
- Auto-generation of baselines on whitelist

---

**Version**: 2.0
**Date**: 2025-11-18
