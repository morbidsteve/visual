# Network Visualizer - Threat Hunting & Configuration Guide

## Overview

This guide covers the advanced threat hunting capabilities and configuration management features of the Network Visualizer, designed specifically for Security Operations Center (SOC) analysts and incident responders.

---

## Table of Contents

1. [Configuration Management](#configuration-management)
2. [Threat Hunting Presets](#threat-hunting-presets)
3. [Timeline Analysis](#timeline-analysis)
4. [Adversary Detection Workflows](#adversary-detection-workflows)
5. [MITRE ATT&CK Mapping](#mitre-attck-mapping)
6. [Best Practices](#best-practices)

---

## Configuration Management

### Accessing Settings

Click the **Settings** icon (⚙️) in the main toolbar to open the configuration dialog.

### Settings Tabs

#### 1. Elasticsearch Tab
Configure connection to your Elasticsearch cluster:

- **Elasticsearch URL**: HTTP/HTTPS URL of your ES instance
  - Example: `http://localhost:9200`
  - Example: `https://my-cluster.elastic-cloud.com:9243`

- **Index Pattern**: Index pattern for Zeek connection logs
  - Default: `zeek-*`
  - Supports wildcards: `network-logs-*`, `conn-*`

- **Authentication**:
  - **Username/Password**: Basic authentication
  - **Cloud ID**: For Elastic Cloud deployments
    - Format: `deployment:dXMtY2VudHJhbC0xLmF3cy5...`
  - **API Key**: Alternative to username/password
    - More secure for production

- **Test Connection**: Validates URL format before saving

#### 2. Kibana Tab
Enable deep-linking to Kibana for detailed investigation:

- **Enable Kibana Integration**: Toggle on/off
- **Kibana URL**: Base URL for your Kibana instance
  - Example: `http://localhost:5601`
  - Used to generate deep-links from connections

#### 3. WebSocket Tab
Configure real-time connection streaming:

- **Enable Real-Time Updates**: Toggle live updates on/off
- **WebSocket URL**: Backend WebSocket endpoint
  - Default: `ws://localhost:3001/ws`
  - Change if backend is on different host/port
- **Max Reconnect Attempts**: Number of reconnection tries
  - Default: 10
  - Range: 1-20

#### 4. General Tab
Application preferences:

- **Default View**: View shown on startup
  - Options: Dashboard, Graph, List, Timeline

- **Default Time Range**: Initial query time window
  - In hours (1-720)
  - Example: 24 = last 24 hours

- **Default Connection Limit**: Max connections to load
  - Range: 100-50,000
  - Affects initial load performance

- **Auto Refresh**: Automatically refresh data
  - Toggle on/off

- **Refresh Interval**: How often to auto-refresh
  - In milliseconds (5,000-300,000)
  - Example: 30000 = 30 seconds

#### 5. Performance Tab
Memory and performance tuning:

- **Enable Memory Warnings**: Browser memory alerts
  - Recommended: ON for Chrome/Edge users

- **Memory Warning Threshold**: Warning trigger point
  - Percentage of heap limit (50-95%)
  - Default: 80%

- **Max Connections Allowed**: Hard limit on data load
  - Range: 1,000-100,000
  - Prevents browser crashes
  - Recommended: 10,000-25,000

#### 6. Security Tab
Threat detection configuration:

- **Enable Anomaly Detection**: Baseline-based anomaly detection
  - Toggle on/off

- **Anomaly Sensitivity**: Detection threshold
  - **Low**: Fewer alerts, higher confidence (fewer false positives)
  - **Medium**: Balanced (recommended)
  - **High**: More alerts, lower confidence (more false positives)

- **Auto-Whitelist Common Patterns**: Automatically whitelist frequent traffic
  - ⚠️ WARNING: Only enable in mature environments
  - May hide legitimate threats

### Saving Settings

- Click **Save Settings** to persist configuration
- Settings stored in browser `localStorage`
- **Reset to Defaults**: Restores factory settings (cannot be undone)

---

## Threat Hunting Presets

### Accessing Threat Hunting

Click the **Security** icon (🛡️) in the main toolbar to open the Threat Hunting drawer.

### Preset Categories

#### 1. Lateral Movement
Detect attackers moving between systems:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| SMB Lateral Movement | SMB connections to multiple internal hosts | T1021.002 | High |
| RDP Lateral Movement | RDP connections between internal hosts | T1021.001 | High |
| WinRM Activity | Windows Remote Management connections | T1021.006 | Medium |

**When to use:**
- After initial compromise is suspected
- When investigating privilege escalation
- During post-exploitation analysis

**What to look for:**
- Single source connecting to many destinations
- Connections to admin shares (IPC$, ADMIN$, C$)
- Unusual accounts accessing remote systems

#### 2. Command & Control (C2)
Identify attacker infrastructure communication:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| Uncommon Ports | Connections on high ports (>49152) | T1071 | Medium |
| Long-Duration Connections | Connections lasting >1 hour | T1071.001 | Medium |
| External DNS | DNS queries to external resolvers | T1071.004 | Medium |

**When to use:**
- When malware is suspected
- Investigating beaconing behavior
- Looking for data exfiltration channels

**What to look for:**
- Regular intervals (beaconing) - use Timeline View
- Connections to cloud providers (AWS, Azure, GCP)
- Encrypted traffic to unusual destinations

#### 3. Reconnaissance
Detect network and system enumeration:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| Port Scanning | Single source scanning multiple ports | T1046 | High |
| Network Scanning | Failed connection attempts | T1595 | High |
| LDAP Queries | Directory service queries | T1087.002 | Low |

**When to use:**
- Early in attack lifecycle
- Pre-compromise detection
- Identifying external threat actors

**What to look for:**
- Sequential port connections
- Many rejected (REJ) connections
- Connections from unexpected sources

#### 4. Data Exfiltration
Detect data theft:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| Large Uploads | Outbound transfers >100MB | T1041 | Critical |
| FTP Exfiltration | FTP to external hosts | T1048.002 | High |
| Uncommon Protocols | ICMP to external hosts | T1048 | Medium |

**When to use:**
- After compromise confirmation
- Data breach investigation
- Identifying sensitive data movement

**What to look for:**
- Large uploads during off-hours (use Timeline View)
- Connections to file-sharing sites
- DNS tunneling (many small DNS queries)

#### 5. Credential Access
Identify credential theft and abuse:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| Kerberos Anomalies | Unusual Kerberos activity | T1558 | High |
| NTLM Traffic | NTLM authentication attempts | T1550.002 | Medium |

**When to use:**
- Investigating pass-the-hash attacks
- Golden/silver ticket detection
- Credential dumping follow-up

#### 6. Persistence
Detect attacker foothold mechanisms:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| SSH From External | SSH from external IPs | T1021.004 | Critical |
| VNC Connections | VNC remote desktop | T1021.005 | High |

**When to use:**
- Looking for backdoors
- Investigating unauthorized access
- Compliance auditing (unauthorized remote access)

#### 7. Exploitation
Detect exploitation attempts:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| SQL Injection Attempts | Database connections with unusual patterns | T1190 | High |
| Web Shells | HTTP POST to unusual endpoints | T1505.003 | Critical |

**When to use:**
- Web application compromise investigation
- Vulnerability exploitation detection

#### 8. Anomalous Timing
Detect activity during unusual times:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| After Hours Activity | Network activity during non-business hours | T1029 | Medium |

**When to use:**
- Insider threat detection
- Automated malware detection (often runs 24/7)

#### 9. Anonymization
Detect use of anonymization tools:

| Preset | Description | MITRE ATT&CK | Severity |
|--------|-------------|--------------|----------|
| TOR Connections | Connections to TOR network | T1090.003 | High |
| SOCKS Proxy | SOCKS proxy connections | T1090.001 | High |

**When to use:**
- Data exfiltration investigation
- Identifying attacker infrastructure
- Policy violation detection

### Using Threat Hunting Presets

1. **Click a preset chip** to apply the filter
2. **Active presets** are highlighted with color-coding by severity
3. **Combine with manual filters** in the sidebar for precision
4. **Export results** for further investigation
5. **Switch to Timeline View** to analyze temporal patterns

---

## Timeline Analysis

### Accessing Timeline View

Click the **Timeline** icon in the view toggle (top toolbar).

### Features

#### Time Grouping
Aggregate connections into time slots:

- **1 Minute**: Granular analysis (for short investigations)
- **5 Minutes**: Default for recent activity
- **15 Minutes**: Good balance for hourly analysis
- **1 Hour**: Daily overview
- **6 Hours**: Weekly trends
- **1 Day**: Monthly patterns

#### Visualization Modes

**1. Heatmap (Default)**
- Grid of color-coded squares
- Each square = one time slot
- Colors indicate:
  - **Red**: Anomalies detected
  - **Orange**: High traffic (>80% of max)
  - **Blue**: Medium traffic (50-80%)
  - **Green**: Low traffic (20-50%)
  - **Gray**: Minimal traffic (<20%)
- **Hover** for details
- **Click** to select slot and see details below

**2. Graph**
- Bar chart visualization
- Y-axis: Connection count
- X-axis: Time
- Red bars: Anomalies
- Click bars for details

**3. List**
- Chronological list of time slots
- Shows: time, connection count, traffic, sources
- Anomaly indicators on left border
- Traffic trend indicators (↑ for high volume)

### Beaconing Detection

**Automatic detection** of regular communication patterns (C2 beaconing):

- **Algorithm**: Analyzes intervals between connection clusters
- **Confidence Levels**:
  - **High**: <20% variance, ≥5 intervals
  - **Medium**: <40% variance, ≥3 intervals
  - **Low**: >40% variance or <3 intervals

**Alert Example:**
```
⚠️ Possible Beaconing Detected! Regular intervals (~300s) with high confidence
```

**What to do:**
1. Note the interval (e.g., every 5 minutes)
2. Switch to List View and find affected connections
3. Identify source and destination
4. Investigate destination IP (threat intel)
5. Check if it's legitimate (e.g., NTP, monitoring)
6. If malicious: isolate host, block C2 IP

### Time Slot Details

When you select a time slot, see:

- **Connections**: Total count
- **Total Traffic**: Bytes sent/received
- **Anomalies**: Number of anomalous connections
- **Unique Sources**: Distinct source IPs
- **Unique Destinations**: Distinct destination IPs
- **Protocols**: Breakdown by protocol (TCP, UDP, ICMP)

---

## Adversary Detection Workflows

### Workflow 1: Suspected Breach Investigation

**Scenario:** Alert from AV/EDR about potential compromise

**Steps:**
1. **Open Settings** → Set time range to last 24 hours
2. **Threat Hunting** → Click "Port Scanning"
3. Check for reconnaissance from suspected host
4. **Threat Hunting** → Click "Lateral Movement - SMB"
5. Look for spread to other systems
6. **Timeline View** → Group by 15min
7. Identify when activity started
8. **Threat Hunting** → Click "Large Uploads"
9. Check for data exfiltration
10. **Export** all findings to CSV for reporting

### Workflow 2: Beaconing Detection

**Scenario:** Looking for C2 communication

**Steps:**
1. **Timeline View** → Group by 5min
2. Look for regular patterns in heatmap
3. If beaconing alert appears → investigate
4. Click time slots with high consistency
5. Note source and destination IPs
6. **Threat Hunting** → "Uncommon Ports"
7. Check if beaconing is on high ports
8. **List View** → Export connections for analysis
9. Run threat intel on destination IP
10. Block C2 infrastructure at firewall

### Workflow 3: Insider Threat Detection

**Scenario:** Unusual activity from internal user

**Steps:**
1. **Threat Hunting** → "After Hours Activity"
2. **Timeline View** → Group by 1 hour
3. Identify time slots with activity during 2AM-6AM
4. Check unique sources in those slots
5. **Threat Hunting** → "Large Uploads"
6. Look for data exfiltration from that source
7. **Threat Hunting** → "External DNS" or "SOCKS Proxy"
8. Check for anonymization attempts
9. Correlate with HR data (recent termination?)
10. Escalate to management/legal

### Workflow 4: APT Hunt

**Scenario:** Proactive hunt for advanced persistent threats

**Steps:**
1. **Settings** → Time range: 30 days
2. **Threat Hunting** → "Kerberos Anomalies"
3. Look for golden ticket indicators
4. **Threat Hunting** → "WinRM Activity"
5. Check for remote execution
6. **Timeline View** → Group by 1 day
7. Look for consistent low-volume C2 over weeks
8. **Threat Hunting** → "SSH From External"
9. Check for persistence via SSH backdoors
10. **Saved Filters** → Save "APT Hunt" configuration
11. Run weekly on schedule

### Workflow 5: Ransomware Detection

**Scenario:** Suspected ransomware activity

**Steps:**
1. **Threat Hunting** → "SMB Lateral Movement"
2. Look for rapid spread across network
3. **Timeline View** → Group by 1min (recent activity)
4. Identify spike in SMB connections
5. Note source IP (patient zero)
6. **Threat Hunting** → "Network Scanning"
7. Check if attacker did recon first
8. **List View** → Export all SMB connections
9. Identify all affected hosts
10. Isolate entire subnet if needed

---

## MITRE ATT&CK Mapping

### Coverage by Tactic

| Tactic | Techniques Covered | Preset Count |
|--------|-------------------|--------------|
| Initial Access | T1190, T1133 | 2 |
| Execution | T1059 | - |
| Persistence | T1021.004, T1021.005, T1505.003 | 3 |
| Privilege Escalation | T1068 | - |
| Defense Evasion | T1090.001, T1090.003 | 2 |
| Credential Access | T1558, T1550.002 | 2 |
| Discovery | T1046, T1087.002, T1595 | 3 |
| Lateral Movement | T1021.001, T1021.002, T1021.006 | 3 |
| Collection | - | - |
| Command and Control | T1071, T1071.001, T1071.004, T1029 | 4 |
| Exfiltration | T1041, T1048, T1048.002 | 3 |
| Impact | - | - |

**Total:** 23 presets covering 20 MITRE ATT&CK techniques

### Detection Matrix

Use this matrix to plan your threat hunting:

```
[Recon] → [Initial Access] → [Execution] → [Persistence] → [Privilege Escalation]
   ↓            ↓                 ↓              ↓                    ↓
[Discovery] → [Lateral Movement] → [Credential Access] → [Exfiltration]
                                          ↓
                                   [Command & Control]
```

**Hunt Left-to-Right:**
- Start with reconnaissance (Port Scanning, Network Scanning)
- Move to lateral movement (SMB, RDP, WinRM)
- End with exfiltration (Large Uploads, FTP)

---

## Best Practices

### Configuration Best Practices

1. **Elasticsearch Connection**
   - Use API keys instead of passwords in production
   - Enable HTTPS in production (not HTTP)
   - Use read-only user for security
   - Test connection before saving

2. **Performance Tuning**
   - Start with 10,000 connection limit
   - Increase only if needed and memory allows
   - Enable memory warnings (especially Chrome/Edge)
   - Set warning threshold to 80% for most systems

3. **Security Settings**
   - Start with "Medium" anomaly sensitivity
   - Adjust based on false positive rate
   - **Do NOT** enable auto-whitelist until baselines are mature (30+ days)
   - Review anomalies daily before adjusting sensitivity

4. **WebSocket Configuration**
   - Keep enabled for real-time threats
   - Increase reconnect attempts if network is unstable
   - Disable if backend is remote (high latency)

### Threat Hunting Best Practices

1. **Start Broad, Then Narrow**
   - Begin with Dashboard view for overview
   - Apply threat presets to narrow down
   - Add manual filters for precision
   - Export results for documentation

2. **Use Timeline for Temporal Patterns**
   - Always check Timeline for beaconing
   - Look for activity spikes (attacks)
   - Correlate time with known events (patching, maintenance)
   - Compare weekday vs weekend patterns

3. **Combine Multiple Presets**
   - Example: "SMB Lateral Movement" + "Kerberos Anomalies" = pass-the-ticket attack
   - Example: "Port Scanning" + "External DNS" = external attacker recon
   - Document combinations that work in your environment

4. **Establish Baselines First**
   - Run visualizer for 7+ days without filters
   - Whitelist known-good patterns
   - Generate baselines for all internal servers
   - Then start aggressive hunting

5. **Daily Hunting Routine**
   - Morning: Check Dashboard for overnight anomalies
   - Review WebSocket alerts (real-time anomalies)
   - Run 2-3 threat presets (rotate daily)
   - Afternoon: Timeline analysis for beaconing
   - Evening: Export and document findings

6. **Weekly Hunting**
   - Deep dive with 7-day time range
   - Run all lateral movement presets
   - Check for persistence (SSH, VNC)
   - Review memory usage and optimize filters

7. **Monthly Hunting**
   - 30-day time range for APT detection
   - Look for low-and-slow attacks
   - Review and update whitelists
   - Audit configuration settings

### Export and Documentation

1. **Export Formats**
   - **CSV**: For spreadsheet analysis (Excel, Google Sheets)
   - **JSON**: For SIEM integration (Splunk, ELK)
   - **Summary**: For executive reporting

2. **What to Export**
   - All anomalies (daily)
   - Threat hunting findings (per investigation)
   - Baseline violations (weekly)

3. **Documentation Template**
   ```
   Investigation: [Name]
   Date: [YYYY-MM-DD]
   Analyst: [Name]

   Presets Used:
   - [Preset 1]
   - [Preset 2]

   Findings:
   - [Source IP] → [Dest IP] : [Description]
   - [Connection details]

   Severity: [Critical/High/Medium/Low]

   Actions Taken:
   - [Block IP]
   - [Isolate host]
   - [Escalate to IR team]

   Evidence:
   - [Exported CSV file]
   - [Screenshots]
   ```

### Performance Optimization

1. **For Large Deployments (>100k connections/day)**
   - Increase max connections to 25,000
   - Use 1-hour time ranges for hunting
   - Enable memory warnings at 75%
   - Export and clear data frequently

2. **For Small Deployments (<10k connections/day)**
   - Default settings are optimal
   - Can use longer time ranges (7+ days)
   - Less frequent exports needed

3. **Memory Management**
   - Clear browser cache weekly
   - Close other browser tabs during hunting
   - Use Chrome/Edge for memory monitoring
   - Export before loading >20k connections

---

## Troubleshooting

### Issue: "No connections found"

**Causes:**
- Elasticsearch connection failed
- Index pattern incorrect
- No data in time range

**Solutions:**
1. Settings → Elasticsearch → Test Connection
2. Verify index pattern (zeek-*, conn-*, etc.)
3. Increase time range
4. Check Elasticsearch directly: `curl http://localhost:9200/zeek-*/_count`

### Issue: "High memory usage" warning

**Causes:**
- Too many connections loaded
- Long time range with high traffic

**Solutions:**
1. Click "Clear Data" in warning
2. Reduce time range (24h → 1h)
3. Add more filters to reduce dataset
4. Settings → Performance → Lower max connections

### Issue: Beaconing detection false positives

**Causes:**
- Legitimate scheduled tasks (NTP, monitoring, backups)
- Highly regular business processes

**Solutions:**
1. Identify source/destination
2. If legitimate → Whitelist
3. Generate baseline for the source
4. Adjust time grouping (larger intervals)

### Issue: Threat presets not finding anything

**Causes:**
- No malicious activity (good!)
- Activity outside current time range
- Network uses non-standard ports

**Solutions:**
1. Increase time range
2. Check if ports are customized in your environment
3. Combine with manual filters
4. Try "Anomalies Only" quick filter

### Issue: WebSocket not connecting

**Causes:**
- Backend not running
- Firewall blocking WebSocket
- Incorrect URL in settings

**Solutions:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Settings → WebSocket → Check URL
3. Check browser console for errors
4. Try disabling WebSocket (still functional, just not real-time)

---

## Advanced Topics

### Creating Custom Threat Presets

**Future Feature:** User-defined presets

Example custom preset:
```json
{
  "name": "Cryptocurrency Mining",
  "description": "Connections to known mining pools",
  "filters": {
    "destPort": 3333,
    "protocol": "tcp",
    "external": true
  },
  "severity": "high",
  "mitreAttack": "T1496"
}
```

### Integrating with SIEM

**Export to Splunk:**
1. Export connections as JSON
2. Use Splunk HTTP Event Collector
3. Index with sourcetype=zeek:json
4. Create correlation searches

**Export to ELK:**
1. Connections already in Elasticsearch
2. Use visualizer for hunting
3. Create Kibana dashboards for findings
4. Set up Watcher alerts for automation

### API Integration

**Future Feature:** REST API for automation

Example use case:
```bash
# Get anomalies from last hour
curl http://localhost:3001/api/network/connections?hideWhitelisted=true&timeRange=1

# Apply threat preset programmatically
curl -X POST http://localhost:3001/api/hunting/presets/smb-lateral-movement
```

---

## Keyboard Shortcuts

**Future Feature:** Keyboard shortcuts for power users

Planned shortcuts:
- `Ctrl+H`: Open Threat Hunting drawer
- `Ctrl+T`: Switch to Timeline view
- `Ctrl+S`: Open Settings
- `Ctrl+E`: Export current view
- `Ctrl+F`: Focus search bar
- `Ctrl+R`: Refresh data

---

## Feedback and Support

**Found a bug?**
- Report at: https://github.com/anthropics/network-visualizer/issues

**Feature request?**
- Submit at: https://github.com/anthropics/network-visualizer/discussions

**Questions?**
- Community: network-visualizer@example.com
- Documentation: https://docs.example.com/network-visualizer

---

## Changelog

### Version 2.0 (Current)
- Added Threat Hunting presets (23 presets)
- Added Timeline view with beaconing detection
- Added Settings dialog (6 tabs)
- Extended filters (ranges, external/internal flags)
- MITRE ATT&CK mapping

### Version 1.0
- Initial release
- Dashboard, Graph, List views
- Whitelist and baseline management
- Real-time updates via WebSocket
- Memory management

---

**Happy Hunting! 🎯**

Remember: The best defense is a proactive offense. Hunt daily, document thoroughly, and stay ahead of adversaries.
