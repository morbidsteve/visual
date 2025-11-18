export interface NetworkNode {
  id: string;
  ip: string;
  type: 'host' | 'server' | 'web_server' | 'dns_server' | 'router' | 'firewall' | 'switch';
  subnet: string;
  isInternal: boolean;
  totalBytesSent: number;
  totalBytesReceived: number;
  connections: number;
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
