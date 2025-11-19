# Network Visualizer - Real-Time & Integration Enhancements

## Overview

Major enhancements to make the Network Visualizer production-ready with real-time updates, Kibana integration, and host sensing capabilities.

---

## 1. Real-Time Connection Streaming

### WebSocket Implementation

**Backend:**
- WebSocket server at `ws://localhost:3001/ws`
- Polls Elasticsearch every 5 seconds for new connections
- Broadcasts updates to all connected clients
- Auto-detects and alerts on anomalies in real-time

**Message Types:**
```javascript
// Connection event
{
  type: 'connected',
  message: 'Connected to real-time feed',
  timestamp: '2025-11-19T...'
}

// New connections
{
  type: 'new_connections',
  connections: [...],
  anomalousCount: 5,
  timestamp: '2025-11-19T...'
}

// Anomaly alert
{
  type: 'anomaly_alert',
  anomalies: [...],
  count: 5,
  timestamp: '2025-11-19T...'
}

// Stats update
{
  type: 'stats_update',
  stats: { uniqueSources: 100, ... },
  timestamp: '2025-11-19T...'
}
```

**Frontend Integration:**
```typescript
// Hook: useWebSocket()
const { connected, newConnections, anomalies } = useWebSocket();

// Auto-reconnect on disconnect
// Display toast notifications for new anomalies
// Update connection count in real-time
```

**Benefits:**
- See new connections within 5 seconds
- Instant anomaly notifications
- No manual refresh needed
- Scalable to many concurrent users

---

## 2. Kibana Deep-Link Integration

### Click-to-Investigate

**Features:**
Every connection and IP now has "View in Kibana" buttons that deep-link directly to:

**For Connections:**
- **Discover**: Pre-filtered query showing exact connection
  - Time window: ±5 minutes around connection
  - Filters: source IP, dest IP, dest port
  - Index: zeek-*

**For IPs:**
- **Discover**: All traffic for that IP
- **Security → Hosts**: Host investigation page
- **Security → Alerts**: Alerts involving that IP
- **Network Map**: Visual network map

**For General Investigation:**
- **Dashboards**: Jump to pre-built dashboards
- **Timeline**: Create investigation timeline
- **Cases**: View/create SIEM cases

### API Endpoints

```bash
# Get Kibana URL for a connection
POST /api/kibana/discover
{
  "connection": {
    "sourceIp": "192.168.1.100",
    "destIp": "10.0.0.50",
    "destPort": 443,
    "timestamp": "2025-11-19T12:00:00Z"
  }
}

Response: {
  "url": "https://kibana:5601/s/default/app/discover#/..."
}

# Get Kibana URL for an IP
GET /api/kibana/discover/ip/192.168.1.100?timeRange=24

# Get Security host page
GET /api/kibana/security/host/hostname

# Get alerts for IP
GET /api/kibana/security/alerts/192.168.1.100
```

### Configuration

```env
KIBANA_URL=https://kibana:5601
KIBANA_SPACE=default
```

### UI Integration

**Connection List View:**
- "View in Kibana" button on each row
- Opens in new tab with pre-filled filters

**Node Details Panel:**
- "Investigate in Kibana" button
- Multiple options: Discover, Security, Alerts

**Context Menu:**
- Right-click any IP → "View in Kibana"

---

## 3. Host/Agent Data Integration

### Endpoint Agent Support

**Data Sources:**
- Elastic Agent (endpoint-*)
- Beats (beats-*, metricbeat-*, filebeat-*)
- Osquery
- Any ECS-compliant agent data

**API Endpoints:**

```bash
# Get host data for IP
GET /api/host/192.168.1.100?timeRange=24

Response: {
  "ip": "192.168.1.100",
  "hostInfo": {
    "hostname": "web-server-01",
    "os": {
      "name": "Ubuntu",
      "family": "debian",
      "version": "20.04",
      "platform": "linux"
    },
    "agent": {
      "type": "elastic-agent",
      "version": "8.11.0"
    },
    "architecture": "x86_64",
    "mac": ["00:11:22:33:44:55"],
    "domain": "company.local",
    "uptime": 1234567
  },
  "processes": [
    { "name": "nginx", "count": 150 },
    { "name": "node", "count": 45 }
  ],
  "users": [
    { "name": "www-data", "count": 200 },
    { "name": "root", "count": 15 }
  ],
  "eventTypes": [
    { "type": "network", "count": 500 },
    { "type": "process", "count": 120 }
  ],
  "recentEvents": [...]
}

# Get process for specific connection
POST /api/host/process-lookup
{
  "sourceIp": "192.168.1.100",
  "destIp": "10.0.0.50",
  "destPort": 443,
  "timestamp": "2025-11-19T12:00:00Z"
}

Response: {
  "name": "chrome",
  "pid": 12345,
  "executable": "/usr/bin/chrome",
  "commandLine": "chrome --flag",
  "hash": "sha256:abc123...",
  "user": "john.doe",
  "parent": {
    "name": "bash",
    "pid": 1234
  }
}

# Get threat intelligence for IP
GET /api/host/192.168.1.100/threat-intel

Response: [
  {
    "type": "malicious-ip",
    "confidence": "high",
    "severity": 8,
    "description": "Known C2 server",
    "source": "AlienVault OTX",
    "firstSeen": "2025-11-01T...",
    "lastSeen": "2025-11-18T..."
  }
]
```

### UI Display

**Node Details Panel:**
- Hostname and OS information
- Top processes
- Top users
- Recent events
- Threat intelligence alerts

**Connection List View:**
- Process column showing which process made connection
- User context
- Hover for full details

**Host Card Component:**
- OS icon
- Uptime
- Agent version
- Quick stats

---

## 4. Configuration Requirements

### Elasticsearch Indices

**Zeek Data (existing):**
```
zeek-*
```

**Host/Agent Data (new):**
```
endpoint-*      # Elastic Endpoint
beats-*         # Any Beats data
metricbeat-*    # System metrics
filebeat-*      # File/log data
```

**Threat Intelligence (optional):**
```
threat-*
ti-*
```

### Environment Variables

```env
# Zeek data
ES_INDEX_PATTERN=zeek-*

# Host/agent data
ES_HOST_INDEX_PATTERN=endpoint-*,beats-*

# Kibana
KIBANA_URL=https://kibana:5601
KIBANA_SPACE=default
```

---

## 5. User Workflows

### Workflow 1: Real-Time Anomaly Hunting

1. Open Network Visualizer
2. Switch to List View
3. Enable "Hide whitelisted traffic"
4. WebSocket shows new connections in real-time
5. **ALERT**: Toast notification "5 new anomalies detected"
6. Anomalies appear highlighted in red
7. Click row to expand
8. See anomaly details + process + user
9. Click "View in Kibana" to deep dive
10. Kibana opens with pre-filled query

### Workflow 2: Investigating a Suspicious IP

1. See connection from unknown IP
2. Click IP in connection list
3. Node details panel shows:
   - Host information (if internal)
   - Top processes
   - Recent events
   - **Threat Intel: "Known malicious IP"**
4. Click "Investigate in Kibana"
5. Choose "Security → Alerts"
6. See all alerts involving that IP
7. Create case in Kibana
8. Return to visualizer, whitelist or block

### Workflow 3: Process-Level Investigation

1. See unusual connection to port 4444
2. Expand connection row
3. Click "Show Process"
4. See:
   - Process: `nc` (netcat)
   - User: `www-data`
   - Parent: `bash`
   - Command: `nc -l -p 4444`
5. **RED FLAG**: Web server running netcat
6. Click "View in Kibana"
7. See full process tree
8. Investigate parent processes
9. Determine compromise vector

---

## 6. Performance Considerations

### WebSocket Polling

**Current: 5-second polling**
- Light on Elasticsearch
- Near real-time updates
- Scalable to 100+ concurrent users

**Optimization Options:**
- Increase to 10 seconds if ES is slow
- Decrease to 1 second for ultra-real-time
- Use Elasticsearch watcher for true push

### Host Data Queries

**Caching:**
- Cache host data for 5 minutes
- Refresh on demand
- Use Redis for multi-instance deployments

**Index Optimization:**
- Ensure proper index patterns
- Use data streams for agent data
- ILM policies for data retention

---

## 7. Security Considerations

### Kibana Access Control

Users need appropriate Kibana permissions:
- Read access to Discover
- Access to Security app (if used)
- View dashboards

### Data Sensitivity

**Be aware:**
- Process command lines may contain secrets
- User context reveals organizational structure
- Connection data can be highly sensitive

**Best practices:**
- Use Kibana spaces for tenant isolation
- Implement RBAC in Kibana
- Audit all Kibana access
- Consider data masking

---

## 8. Future Enhancements

### Planned Features

1. **Automatic Case Creation**
   - Auto-create Kibana case for high-severity anomalies
   - Pre-populate with connection details
   - Assign to SOC analysts

2. **Alerting Integration**
   - Send anomalies to Slack/PagerDuty
   - Email digests
   - Webhook notifications

3. **Machine Learning**
   - Use Elastic ML for better anomaly detection
   - Behavioral profiling beyond baselines
   - Anomaly scoring

4. **Response Actions**
   - Block IP directly from UI
   - Isolate host (via Elastic Endpoint)
   - Kill process remotely
   - Update firewall rules

5. **Correlation Engine**
   - Correlate network with logs
   - Multi-stage attack detection
   - Kill chain visualization

6. **Export & Reporting**
   - Export connections to CSV/JSON
   - PDF reports
   - Scheduled reports

---

## 9. Testing the Features

### Test Real-Time Updates

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm start

# Terminal 3: Generate test traffic
# (Use your network tap or test data generator)

# Verify:
# - WebSocket connects (check browser console)
# - New connections appear automatically
# - Anomaly toasts show up
```

### Test Kibana Integration

```bash
# 1. Set KIBANA_URL in backend/.env
KIBANA_URL=https://your-kibana:5601

# 2. Click "View in Kibana" on any connection
# 3. Verify it opens Kibana with correct filters
# 4. Try all deep-link types
```

### Test Host Data

```bash
# 1. Ensure Elastic Agent is deployed
# 2. Set ES_HOST_INDEX_PATTERN in backend/.env
ES_HOST_INDEX_PATTERN=endpoint-*

# 3. Click any internal IP
# 4. Node details should show:
#    - Hostname
#    - OS info
#    - Processes
#    - Users

# 5. Click connection row → "Show Process"
# 6. Should show which process made the connection
```

---

## 10. Deployment Checklist

**Before deploying to production:**

- [ ] Set KIBANA_URL to production Kibana
- [ ] Configure ES_HOST_INDEX_PATTERN correctly
- [ ] Test WebSocket connectivity through firewall
- [ ] Verify Kibana deep-links work
- [ ] Ensure agent data is flowing to ES
- [ ] Test threat intel integration
- [ ] Configure alert thresholds
- [ ] Set up monitoring/logging
- [ ] Document for SOC team
- [ ] Train analysts on new features

---

## Summary

You now have a comprehensive SOC platform with:

✅ Real-time connection streaming (5s latency)
✅ Instant anomaly notifications
✅ One-click Kibana deep-dive
✅ Process-level visibility
✅ User context awareness
✅ Threat intelligence integration
✅ Production-ready WebSocket architecture

**This transforms the visualizer from a static tool into a living, breathing SOC platform!**
