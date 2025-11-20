/**
 * Mock Network Data Generator for Testing
 *
 * Generates realistic Zeek-like network connection data for testing the
 * Network Visualizer at various scales.
 *
 * Features:
 * - Multiple subnets (corporate, DMZ, management, external)
 * - Various protocols (TCP, UDP, ICMP)
 * - Common services (HTTP, HTTPS, SSH, DNS, SMB, RDP, etc.)
 * - Anomalous patterns (beaconing, exfiltration, lateral movement, scanning)
 * - Configurable dataset sizes (small, medium, large, enterprise)
 * - Realistic timestamps and traffic patterns
 */

const crypto = require('crypto');

// Network topology configuration
const SUBNETS = {
  corporate: {
    cidr: '10.10.0.0/16',
    type: 'internal',
    hostRange: [1, 5000],
    vlan: 100
  },
  servers: {
    cidr: '10.20.0.0/16',
    type: 'internal',
    hostRange: [1, 1000],
    vlan: 200
  },
  dmz: {
    cidr: '172.16.50.0/24',
    type: 'dmz',
    hostRange: [1, 50],
    vlan: 50
  },
  management: {
    cidr: '192.168.100.0/24',
    type: 'management',
    hostRange: [1, 100],
    vlan: 999
  },
  iot: {
    cidr: '10.30.0.0/16',
    type: 'internal',
    hostRange: [1, 2000],
    vlan: 300
  }
};

// Common services and their typical ports
const SERVICES = [
  { name: 'http', protocol: 'tcp', port: 80, commonness: 0.3 },
  { name: 'https', protocol: 'tcp', port: 443, commonness: 0.4 },
  { name: 'ssh', protocol: 'tcp', port: 22, commonness: 0.05 },
  { name: 'dns', protocol: 'udp', port: 53, commonness: 0.15 },
  { name: 'smb', protocol: 'tcp', port: 445, commonness: 0.02 },
  { name: 'rdp', protocol: 'tcp', port: 3389, commonness: 0.01 },
  { name: 'smtp', protocol: 'tcp', port: 25, commonness: 0.02 },
  { name: 'imap', protocol: 'tcp', port: 993, commonness: 0.01 },
  { name: 'ldap', protocol: 'tcp', port: 389, commonness: 0.01 },
  { name: 'ntp', protocol: 'udp', port: 123, commonness: 0.01 },
  { name: 'ftp', protocol: 'tcp', port: 21, commonness: 0.005 },
  { name: 'mysql', protocol: 'tcp', port: 3306, commonness: 0.01 },
  { name: 'postgres', protocol: 'tcp', port: 5432, commonness: 0.01 }
];

// Connection states (Zeek conn.log)
const CONN_STATES = [
  { state: 'SF', desc: 'Normal establishment and termination', weight: 0.7 },
  { state: 'S0', desc: 'Connection attempt seen, no reply', weight: 0.1 },
  { state: 'REJ', desc: 'Connection attempt rejected', weight: 0.05 },
  { state: 'RSTO', desc: 'Connection established, originator aborted', weight: 0.05 },
  { state: 'RSTR', desc: 'Responder sent RST', weight: 0.05 },
  { state: 'S1', desc: 'Connection established, not terminated', weight: 0.05 }
];

// External IPs for internet destinations
const EXTERNAL_IPS = [
  '8.8.8.8',       // Google DNS
  '1.1.1.1',       // Cloudflare DNS
  '104.16.0.0',    // Cloudflare CDN range
  '23.0.0.0',      // Akamai range
  '52.0.0.0',      // AWS range
  '13.0.0.0',      // AWS range
  '185.199.108.0', // GitHub
  '142.250.0.0'    // Google services
];

/**
 * Generate a random IP within a CIDR block
 */
function generateIPInRange(cidr) {
  const [base, bits] = cidr.split('/');
  const octets = base.split('.').map(Number);
  const hostBits = 32 - parseInt(bits);
  const maxHosts = Math.pow(2, hostBits) - 2; // -2 for network and broadcast

  const hostNum = Math.floor(Math.random() * maxHosts) + 1;

  // Convert to IP
  const ip3 = octets[2] + Math.floor(hostNum / 256);
  const ip4 = octets[3] + (hostNum % 256);

  return `${octets[0]}.${octets[1]}.${ip3 % 256}.${ip4 % 256}`;
}

/**
 * Generate a specific IP within a subnet
 */
function generateSpecificIP(subnet, hostId) {
  const cidr = SUBNETS[subnet].cidr;
  const [base] = cidr.split('/');
  const octets = base.split('.').map(Number);

  const ip3 = octets[2] + Math.floor(hostId / 256);
  const ip4 = octets[3] + (hostId % 256);

  return `${octets[0]}.${octets[1]}.${ip3 % 256}.${ip4 % 256}`;
}

/**
 * Select a random service based on commonness weights
 */
function selectService() {
  const rand = Math.random();
  let cumulative = 0;

  for (const service of SERVICES) {
    cumulative += service.commonness;
    if (rand <= cumulative) {
      return service;
    }
  }

  return SERVICES[0];
}

/**
 * Select a connection state based on weights
 */
function selectConnState() {
  const rand = Math.random();
  let cumulative = 0;

  for (const state of CONN_STATES) {
    cumulative += state.weight;
    if (rand <= cumulative) {
      return state.state;
    }
  }

  return 'SF';
}

/**
 * Generate random bytes transferred
 */
function generateBytes(service) {
  // Different services have different typical data sizes
  const ranges = {
    'dns': [50, 500],
    'http': [500, 50000],
    'https': [1000, 100000],
    'ssh': [100, 10000],
    'smb': [1000, 10000000],
    'ftp': [10000, 100000000],
    'default': [100, 10000]
  };

  const [min, max] = ranges[service] || ranges.default;
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Generate random duration (seconds)
 */
function generateDuration(service) {
  const ranges = {
    'dns': [0.01, 0.5],
    'http': [0.1, 5],
    'https': [0.5, 30],
    'ssh': [60, 3600],
    'smb': [1, 300],
    'default': [0.1, 60]
  };

  const [min, max] = ranges[service] || ranges.default;
  return parseFloat((Math.random() * (max - min) + min).toFixed(3));
}

/**
 * Generate a normal network connection
 */
function generateNormalConnection(timestamp, subnet = null) {
  const service = selectService();

  // Pick source subnet
  const sourceSubnet = subnet || Object.keys(SUBNETS)[Math.floor(Math.random() * Object.keys(SUBNETS).length)];
  const sourceIP = generateIPInRange(SUBNETS[sourceSubnet].cidr);
  const sourcePort = Math.floor(Math.random() * 64511) + 1024; // ephemeral ports

  // 70% internal-to-internal, 30% internal-to-external
  let destIP, destPort;
  const isExternal = Math.random() > 0.7;

  if (isExternal) {
    destIP = EXTERNAL_IPS[Math.floor(Math.random() * EXTERNAL_IPS.length)];
    // Add some randomness to external IPs
    const lastOctet = Math.floor(Math.random() * 256);
    destIP = destIP.substring(0, destIP.lastIndexOf('.')) + '.' + lastOctet;
  } else {
    // Internal destination - pick a server or another internal subnet
    const destSubnet = Math.random() > 0.5 ? 'servers' : sourceSubnet;
    destIP = generateIPInRange(SUBNETS[destSubnet].cidr);
  }

  destPort = service.port;

  const origBytes = generateBytes(service.name);
  const respBytes = generateBytes(service.name);
  const duration = generateDuration(service.name);

  return {
    ts: new Date(timestamp).toISOString(),
    uid: crypto.randomUUID(),
    'id.orig_h': sourceIP,
    'id.orig_p': sourcePort,
    'id.resp_h': destIP,
    'id.resp_p': destPort,
    proto: service.protocol,
    service: service.name,
    duration: duration,
    orig_bytes: origBytes,
    resp_bytes: respBytes,
    conn_state: selectConnState(),
    local_orig: !isExternal,
    local_resp: !isExternal,
    missed_bytes: 0,
    history: generateHistory(service.protocol),
    orig_pkts: Math.floor(origBytes / 1400) + 1,
    orig_ip_bytes: origBytes + 40,
    resp_pkts: Math.floor(respBytes / 1400) + 1,
    resp_ip_bytes: respBytes + 40,
    community_id: generateCommunityId(sourceIP, destIP, sourcePort, destPort, service.protocol)
  };
}

/**
 * Generate connection history string (Zeek format)
 */
function generateHistory(protocol) {
  if (protocol === 'tcp') {
    const histories = ['ShADadFf', 'ShADadfF', 'ShADTadtfF', 'S', 'Sr'];
    return histories[Math.floor(Math.random() * histories.length)];
  } else if (protocol === 'udp') {
    return 'Dd';
  } else {
    return '';
  }
}

/**
 * Generate Community ID (simplified)
 */
function generateCommunityId(srcIP, dstIP, srcPort, dstPort, proto) {
  const hash = crypto.createHash('sha1');
  hash.update(`${srcIP}:${srcPort}-${dstIP}:${dstPort}-${proto}`);
  return '1:' + hash.digest('base64').substring(0, 22);
}

/**
 * Generate beaconing pattern (C2 traffic)
 */
function generateBeaconingPattern(timestamp, sourceIP, c2IP, interval = 60000, count = 10) {
  const connections = [];

  for (let i = 0; i < count; i++) {
    const beaconTime = timestamp + (i * interval) + (Math.random() * 5000 - 2500); // slight jitter

    connections.push({
      ts: new Date(beaconTime).toISOString(),
      uid: crypto.randomUUID(),
      'id.orig_h': sourceIP,
      'id.orig_p': Math.floor(Math.random() * 64511) + 1024,
      'id.resp_h': c2IP,
      'id.resp_p': 443, // HTTPS C2
      proto: 'tcp',
      service: 'ssl',
      duration: parseFloat((Math.random() * 2 + 0.5).toFixed(3)),
      orig_bytes: Math.floor(Math.random() * 1000) + 500,
      resp_bytes: Math.floor(Math.random() * 5000) + 1000,
      conn_state: 'SF',
      local_orig: true,
      local_resp: false,
      missed_bytes: 0,
      history: 'ShADadFf',
      orig_pkts: 10,
      orig_ip_bytes: 1500,
      resp_pkts: 15,
      resp_ip_bytes: 6000,
      community_id: generateCommunityId(sourceIP, c2IP, 49152 + i, 443, 'tcp')
    });
  }

  return connections;
}

/**
 * Generate lateral movement (SMB connections across internal hosts)
 */
function generateLateralMovement(timestamp, sourceIP, targetSubnet = 'corporate', count = 5) {
  const connections = [];

  for (let i = 0; i < count; i++) {
    const targetIP = generateIPInRange(SUBNETS[targetSubnet].cidr);
    const moveTime = timestamp + (i * 5000); // 5 seconds apart

    connections.push({
      ts: new Date(moveTime).toISOString(),
      uid: crypto.randomUUID(),
      'id.orig_h': sourceIP,
      'id.orig_p': Math.floor(Math.random() * 64511) + 1024,
      'id.resp_h': targetIP,
      'id.resp_p': 445, // SMB
      proto: 'tcp',
      service: 'smb',
      duration: parseFloat((Math.random() * 10 + 2).toFixed(3)),
      orig_bytes: Math.floor(Math.random() * 50000) + 10000,
      resp_bytes: Math.floor(Math.random() * 100000) + 20000,
      conn_state: 'SF',
      local_orig: true,
      local_resp: true,
      missed_bytes: 0,
      history: 'ShADadFf',
      orig_pkts: 50,
      orig_ip_bytes: 60000,
      resp_pkts: 100,
      resp_ip_bytes: 120000,
      community_id: generateCommunityId(sourceIP, targetIP, 49152, 445, 'tcp')
    });
  }

  return connections;
}

/**
 * Generate port scanning pattern
 */
function generatePortScan(timestamp, sourceIP, targetIP, portRange = [1, 1024]) {
  const connections = [];
  const numPorts = 20 + Math.floor(Math.random() * 30); // Scan 20-50 ports

  for (let i = 0; i < numPorts; i++) {
    const port = Math.floor(Math.random() * (portRange[1] - portRange[0])) + portRange[0];
    const scanTime = timestamp + (i * 100); // Very fast, 100ms apart

    connections.push({
      ts: new Date(scanTime).toISOString(),
      uid: crypto.randomUUID(),
      'id.orig_h': sourceIP,
      'id.orig_p': Math.floor(Math.random() * 64511) + 1024,
      'id.resp_h': targetIP,
      'id.resp_p': port,
      proto: 'tcp',
      service: '-',
      duration: 0.001,
      orig_bytes: 0,
      resp_bytes: 0,
      conn_state: 'S0', // No response
      local_orig: true,
      local_resp: true,
      missed_bytes: 0,
      history: 'S',
      orig_pkts: 1,
      orig_ip_bytes: 60,
      resp_pkts: 0,
      resp_ip_bytes: 0,
      community_id: generateCommunityId(sourceIP, targetIP, 49152 + i, port, 'tcp')
    });
  }

  return connections;
}

/**
 * Generate data exfiltration (large upload to external IP)
 */
function generateExfiltration(timestamp, sourceIP, externalIP) {
  return {
    ts: new Date(timestamp).toISOString(),
    uid: crypto.randomUUID(),
    'id.orig_h': sourceIP,
    'id.orig_p': Math.floor(Math.random() * 64511) + 1024,
    'id.resp_h': externalIP,
    'id.resp_p': 443,
    proto: 'tcp',
    service: 'ssl',
    duration: parseFloat((Math.random() * 300 + 60).toFixed(3)), // 1-5 minutes
    orig_bytes: Math.floor(Math.random() * 500000000) + 100000000, // 100MB-600MB upload
    resp_bytes: Math.floor(Math.random() * 10000) + 1000,
    conn_state: 'SF',
    local_orig: true,
    local_resp: false,
    missed_bytes: 0,
    history: 'ShADadFf',
    orig_pkts: 100000,
    orig_ip_bytes: 550000000,
    resp_pkts: 50,
    resp_ip_bytes: 5000,
    community_id: generateCommunityId(sourceIP, externalIP, 49152, 443, 'tcp')
  };
}

/**
 * Main data generation function
 */
function generateMockData(config = {}) {
  const {
    scale = 'medium', // small, medium, large, enterprise
    timeRange = 24, // hours
    anomalyRate = 0.02 // 2% anomalous connections
  } = config;

  const scales = {
    small: { hosts: 100, connectionsPerHour: 1000 },
    medium: { hosts: 1000, connectionsPerHour: 10000 },
    large: { hosts: 10000, connectionsPerHour: 100000 },
    enterprise: { hosts: 110000, connectionsPerHour: 1000000 }
  };

  const scaleConfig = scales[scale];
  const totalConnections = scaleConfig.connectionsPerHour * timeRange;
  const anomalousCount = Math.floor(totalConnections * anomalyRate);

  console.log(`Generating ${scale} dataset:`);
  console.log(`- Hosts: ${scaleConfig.hosts}`);
  console.log(`- Time range: ${timeRange} hours`);
  console.log(`- Total connections: ${totalConnections.toLocaleString()}`);
  console.log(`- Anomalous connections: ${anomalousCount.toLocaleString()}`);

  const connections = [];
  const now = Date.now();
  const startTime = now - (timeRange * 60 * 60 * 1000);

  // Generate normal traffic
  console.log('Generating normal traffic...');
  for (let i = 0; i < totalConnections - anomalousCount; i++) {
    const timestamp = startTime + Math.random() * (timeRange * 60 * 60 * 1000);
    connections.push(generateNormalConnection(timestamp));

    if (i % 10000 === 0) {
      process.stdout.write(`\rProgress: ${((i / totalConnections) * 100).toFixed(1)}%`);
    }
  }

  console.log('\nGenerating anomalous patterns...');

  // Generate beaconing (C2)
  const beaconCount = Math.floor(anomalousCount * 0.3);
  for (let i = 0; i < beaconCount / 10; i++) {
    const compromisedHost = generateIPInRange(SUBNETS.corporate.cidr);
    const c2Server = `185.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const beaconStart = startTime + Math.random() * (timeRange * 60 * 60 * 1000 * 0.5);

    connections.push(...generateBeaconingPattern(beaconStart, compromisedHost, c2Server, 60000, 10));
  }

  // Generate lateral movement
  const lateralCount = Math.floor(anomalousCount * 0.2);
  for (let i = 0; i < lateralCount / 5; i++) {
    const attacker = generateIPInRange(SUBNETS.corporate.cidr);
    const moveTime = startTime + Math.random() * (timeRange * 60 * 60 * 1000);

    connections.push(...generateLateralMovement(moveTime, attacker, 'servers', 5));
  }

  // Generate port scans
  const scanCount = Math.floor(anomalousCount * 0.15);
  for (let i = 0; i < scanCount / 30; i++) {
    const scanner = generateIPInRange(SUBNETS.corporate.cidr);
    const target = generateIPInRange(SUBNETS.servers.cidr);
    const scanTime = startTime + Math.random() * (timeRange * 60 * 60 * 1000);

    connections.push(...generatePortScan(scanTime, scanner, target));
  }

  // Generate data exfiltration
  const exfilCount = Math.floor(anomalousCount * 0.1);
  for (let i = 0; i < exfilCount; i++) {
    const leaker = generateIPInRange(SUBNETS.corporate.cidr);
    const dropServer = `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const exfilTime = startTime + Math.random() * (timeRange * 60 * 60 * 1000);

    connections.push(generateExfiltration(exfilTime, leaker, dropServer));
  }

  // Sort by timestamp
  connections.sort((a, b) => new Date(a.ts) - new Date(b.ts));

  console.log('\n✓ Data generation complete!');

  return {
    connections,
    metadata: {
      scale,
      totalConnections: connections.length,
      timeRange,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(now).toISOString(),
      subnets: SUBNETS
    }
  };
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateMockData,
    SUBNETS
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const scale = args[0] || 'medium';
  const timeRange = parseInt(args[1]) || 24;

  const data = generateMockData({ scale, timeRange });

  // Write to file
  const fs = require('fs');
  const filename = `mock-data-${scale}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));

  console.log(`\nData written to: ${filename}`);
  console.log(`File size: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);
}
