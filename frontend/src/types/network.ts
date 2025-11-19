export interface NetworkNode {
  id: string;
  ip: string;
  type: 'host' | 'server' | 'web_server' | 'dns_server' | 'router' | 'firewall' | 'switch';
  subnet: string;
  isInternal: boolean;
  totalBytesSent: number;
  totalBytesReceived: number;
  connections: number;
  isWhitelisted?: boolean;
  hasBaseline?: boolean;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  destPort: number;
  protocol: string;
  bytes: number;
  packets: number;
  connections: number;
  services: string[];
  connStates: Array<{ state: string; count: number }>;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    uniqueSources: number;
    uniqueDestinations: number;
    protocols: Array<{ key: string; doc_count: number }>;
    services: Array<{ key: string; doc_count: number }>;
    filteredNodes?: number;
    filteredEdges?: number;
  };
}

export interface WhitelistEntry {
  id: number;
  entry_type: 'ip' | 'subnet' | 'connection' | 'protocol';
  value: string;
  description: string;
  created_at: string;
  created_by: string;
}

export interface NetworkFilters {
  timeRange?: number;
  sourceIp?: string;
  destIp?: string;
  subnet?: string;
  minBytes?: number;
  hideWhitelisted?: boolean;
  protocol?: string;
  destPort?: number;
  minDestPort?: number;
  maxDestPort?: number;
  service?: string;
  connState?: string;
  limit?: number;
  minDuration?: number;
  maxDuration?: number;
  minOrigBytes?: number;
  maxOrigBytes?: number;
  minRespBytes?: number;
  maxRespBytes?: number;
  external?: boolean;
  internal?: boolean;
}

export interface ConnectionDetail {
  '@timestamp': string;
  id: {
    orig_h: string;
    orig_p: number;
    resp_h: string;
    resp_p: number;
  };
  proto: string;
  service?: string;
  duration?: number;
  orig_bytes?: number;
  resp_bytes?: number;
  conn_state?: string;
  orig_pkts?: number;
  resp_pkts?: number;
}

export interface Connection {
  id: string;
  timestamp: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: string;
  service?: string;
  duration?: number;
  origBytes: number;
  respBytes: number;
  origPackets: number;
  respPackets: number;
  connState?: string;
  localOrig?: boolean;
  localResp?: boolean;
  missedBytes?: number;
  history?: string;
  anomalies?: Anomaly[];
  isAnomalous?: boolean;
  raw?: any;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface ConnectionsResponse {
  connections: Connection[];
  nodes: NetworkNode[];
  total: number;
  stats: {
    totalConnections: number;
    uniqueSources: number;
    uniqueDestinations: number;
    whitelistedNodes?: number;
    filteredConnections?: number;
    anomalousConnections?: number;
  };
  anomalousConnections?: Connection[];
}

export interface Baseline {
  id?: number;
  entity_value: string;
  entity_type: 'ip' | 'subnet';
  baseline_data: BaselineData;
  generated_at: string;
  lookback_days: number;
}

export interface BaselineData {
  ip: string;
  isSubnet: boolean;
  lookbackDays: number;
  generatedAt: string;
  commonDestinations: Array<{ ip: string; count: number }>;
  commonSources: Array<{ ip: string; count: number }>;
  commonPorts: Array<{ port: number; count: number }>;
  commonProtocols: Array<{ protocol: string; count: number }>;
  commonServices: Array<{ service: string; count: number }>;
  connectionPatterns: Array<{
    destIp: string;
    destPort: number;
    protocol: string;
    count: number;
    avgBytes: number;
  }>;
}
