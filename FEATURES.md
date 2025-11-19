# Network Visualizer - Complete Feature Guide

## Overview

The Network Visualizer now includes powerful capabilities for viewing individual socket connections, smart whitelist filtering with anomaly detection, and comprehensive baseline management. This guide explains all the features you requested and how to use them.

---

## Core Enhancements

### 1. Individual Connection Viewing

**What it does:**
- Shows every single socket connection (not aggregated)
- Each connection displayed as a separate row with full details
- No more averaging - see actual socket-level data

**How to use:**
1. Click the **List View** icon in the top toolbar (looks like a list icon)
2. See every connection with details:
   - Timestamp
   - Source IP:Port → Destination IP:Port
   - Protocol (TCP/UDP/ICMP)
   - Service (http, ssh, dns, etc.)
   - Bytes sent/received
   - Connection state
   - Anomaly flags (if any)
3. Click any row to expand and see full details:
   - Duration
   - Packet counts
   - Connection history (Zeek format)
   - All detected anomalies with severity levels

**Memory Management:**
- Default limit: 10,000 connections
- Adjustable via filter panel (100 - 50,000)
- Data not shown is NOT sent to browser (server-side filtering)

---

### 2. Smart Whitelist Filtering

**Previous behavior:**
- Whitelisted hosts were completely hidden
- Couldn't see if they were doing anything unusual

**New behavior:**
- **Whitelisted nodes stay visible on graph**
- **Normal connections are hidden** (removed from browser memory)
- **Anomalous connections are shown and highlighted**

**Example workflow:**
```
1. Whitelist 192.168.1.100 (corporate web server)
2. Generate baseline for 192.168.1.100
3. Enable "Hide whitelisted traffic"

Result:
- Node for 192.168.1.100 appears on graph
- Normal HTTP/HTTPS traffic → HIDDEN (not in browser)
- Connection to unusual port 4444 → SHOWN WITH RED FLAG
- Connection to never-before-seen IP → SHOWN WITH ALERT
```

**Key benefit:**
- Filter out 99% of noise
- Only see what matters
- No memory wasted on known-good traffic

---

### 3. Baseline Tracking & Anomaly Detection

**What it does:**
- Learns normal behavior for whitelisted entities
- Flags deviations as anomalies
- Automatic severity scoring

**How it works:**
1. When you whitelist an IP/subnet, generate a baseline
2. Baseline captures 7 days of normal behavior:
   - Common destination IPs
   - Common ports
   - Common protocols
   - Common services
   - Typical traffic volumes
   - Connection patterns (IP:port:protocol combos)

3. New connections are compared against baseline
4. Anomalies flagged with severity:
   - **HIGH**: New connection pattern (never-seen IP:port:proto combo)
   - **MEDIUM**: New destination IP, new protocol, 10x normal traffic
   - **LOW**: New port, new service

**How to use:**
1. Add IP to whitelist (Whitelist icon → Add Entry)
2. Click Baselines icon → Find your IP
3. Click "Generate Baseline"
4. Choose lookback period (7 days recommended)
5. Wait for generation (may take time for large datasets)
6. Enable "Hide whitelisted traffic" filter
7. See only anomalies highlighted in red

**Baseline Management:**
- View baseline details (common IPs, ports, protocols)
- Regenerate baselines (weekly/monthly recommended)
- Delete outdated baselines
- Auto-generated on whitelist (optional)

---

### 4. View Toggle (Graph vs List)

**Graph View:**
- Visual network topology
- See relationships between hosts
- Drag nodes, zoom, pan
- Best for understanding network structure

**List View:**
- Table of individual connections
- Sortable columns
- Expandable rows
- Best for detailed investigation

**Toggle anytime:**
- Click Graph icon or List icon in toolbar
- Filters persist across views
- Same data, different visualization

---

## Feature Comparison Table

| Feature | Graph View | List View |
|---------|-----------|-----------|
| View network topology | ✓ | ✗ |
| See individual connections | ✗ | ✓ |
| Drag nodes around | ✓ | ✗ |
| Sort by timestamp | ✗ | ✓ |
| Filter by protocol | ✓ | ✓ |
| Filter by port | ✗ | ✓ |
| Filter by service | ✗ | ✓ |
| Filter by connection state | ✗ | ✓ |
| See anomaly details | Limited | Full |
| Pagination | ✗ | ✓ |
| Memory efficient | Moderate | High (with limits) |

---

## Advanced Filtering

### Connection-Level Filters (List View Only)

**Protocol Filter:**
- TCP, UDP, ICMP
- Dropdown selection

**Destination Port:**
- Specific port number (e.g., 443 for HTTPS)
- Useful for finding all SSL connections

**Service:**
- Service name (http, ssh, dns, etc.)
- Zeek-identified service

**Connection State:**
- Zeek states: SF, S0, REJ, RSTO, etc.
- SF = Normal completion
- S0 = Connection attempt rejected
- REJ = Connection rejected

**Result Limit:**
- Slider: 100 - 50,000 connections
- Prevents browser overload
- Server-side limit enforcement

### IP Filters (Both Views)

- **Source IP**: Filter by originating host
- **Destination IP**: Filter by target host
- **Subnet**: Filter by subnet prefix (e.g., "192.168.1")

### Traffic Volume Filter

- **Minimum Bytes**: Show only high-volume connections
- Example: Set to 1000000 to see only connections >1MB

### Time Range

- Slider: 1 hour to 7 days
- Default: 24 hours

---

## API Endpoints Reference

### Individual Connections
```
GET /api/network/connections

Query Parameters:
  timeRange=24           # Hours
  sourceIp=192.168.1.100
  destIp=10.0.0.50
  protocol=tcp
  destPort=443
  service=ssl
  connState=SF
  minBytes=1000000
  limit=10000
  hideWhitelisted=true

Response:
{
  "connections": [...],
  "nodes": [...],
  "stats": {
    "totalConnections": 5432,
    "uniqueSources": 45,
    "uniqueDestinations": 234,
    "whitelistedNodes": 3,
    "filteredConnections": 4890,
    "anomalousConnections": 12
  },
  "anomalousConnections": [...]
}
```

### Baseline Management
```
# Get/generate baseline
GET /api/network/baseline/:ip?isSubnet=false&lookbackDays=7&regenerate=false

# Generate baseline manually
POST /api/network/baseline
{
  "entityValue": "192.168.1.100",
  "entityType": "ip",
  "lookbackDays": 7
}

# Delete baseline
DELETE /api/network/baseline/:entityValue/:entityType
```

---

## Recommended Workflows

### Workflow 1: Initial Setup (Clean Network)
1. Start in Graph View
2. Identify known-good infrastructure (DNS, gateways, etc.)
3. Add to whitelist (IP or subnet)
4. Generate baselines (7-14 day lookback)
5. Enable "Hide whitelisted traffic"
6. Focus on remaining unknown traffic

### Workflow 2: Investigating Anomalies
1. Enable "Hide whitelisted traffic"
2. Switch to List View
3. Sort by timestamp (newest first)
4. Look for rows highlighted in red
5. Expand row to see anomaly details
6. Investigate flagged connections
7. Either:
   - Whitelist if benign
   - Alert on if malicious

### Workflow 3: Hunting for Specific Activity
1. Switch to List View
2. Apply filters:
   - Protocol: TCP
   - Destination Port: 4444 (backdoor port)
   - Time Range: Last 7 days
3. Review all matching connections
4. Investigate anomalies

### Workflow 4: Daily SOC Operations
1. Morning: Check anomalousConnections count in stats
2. If count > 0:
   - Switch to List View
   - Enable "Hide whitelisted"
   - Review red-highlighted connections
3. For each anomaly:
   - Expand row
   - Read anomaly details
   - Investigate as needed
4. Weekly: Regenerate baselines

---

## Performance Tips

### For Small Environments (<1000 hosts)
- Use List View by default
- Set limit to 50,000
- No need to optimize

### For Medium Environments (1000-10,000 hosts)
- Start with filters (time range, subnet, etc.)
- Set limit to 10,000
- Use whitelisting aggressively

### For Large Environments (>10,000 hosts)
- Start in Graph View
- Apply subnet filters first
- Switch to List View for specific investigations
- Set limit to 1,000-5,000
- Generate baselines during off-peak hours

### Memory Optimization
- Lower the limit slider
- Apply more filters
- Enable "Hide whitelisted"
- Server filters data before sending to browser

---

## Troubleshooting

### "No connections showing in List View"
- Check filters (especially time range)
- Verify Zeek data exists for selected period
- Try clearing all filters
- Check limit isn't too low

### "Baseline generation taking too long"
- Reduce lookback period (try 3 days instead of 7)
- Run during off-peak hours
- Check Elasticsearch performance

### "Too many connections loading"
- Reduce limit slider
- Apply more specific filters
- Narrow time range
- Enable "Hide whitelisted"

### "Anomalies not showing"
- Verify baseline exists for whitelisted entity
- Check baseline isn't too recent (needs training data)
- Regenerate baseline if infrastructure changed
- Confirm "Hide whitelisted" is enabled

---

## Future Enhancements (Ideas)

- Export connections to CSV
- Scheduled baseline regeneration
- Anomaly notification/alerting
- Machine learning for pattern detection
- Custom anomaly rules
- Connection replay/timeline view
- Integration with SIEM platforms

---

## Summary

**What you asked for:**
1. ✅ View individual socket connections (not aggregated)
2. ✅ Filter at connection level
3. ✅ Remove filtered data from browser memory
4. ✅ Keep whitelisted hosts visible
5. ✅ Hide normal whitelisted connections
6. ✅ Show only anomalous connections on whitelisted hosts

**What you got:**
All of the above, plus:
- Baseline tracking system
- Anomaly severity scoring
- Dual view modes (graph + list)
- Advanced filtering UI
- Baseline management interface
- Real-time statistics
- Full TypeScript type safety
- Responsive design
- Auto-refresh
- Pagination

**Result:**
- Focus on what matters
- Filter out noise automatically
- See anomalies instantly
- Investigate efficiently
- Manage baselines easily
- Scale to any environment size

---

**Happy Hunting! 🎯**
