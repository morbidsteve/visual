// Zeek connection log field metadata
export interface ZeekField {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'ip' | 'port' | 'timestamp' | 'duration';
  category: 'basic' | 'network' | 'timing' | 'bytes' | 'packets' | 'state' | 'tunnel' | 'ids';
  description: string;
  filterable: boolean;
  sortable: boolean;
  exportable: boolean;
}

export const ZEEK_FIELDS: ZeekField[] = [
  // Basic Connection Info
  { name: 'ts', displayName: 'Timestamp', type: 'timestamp', category: 'basic', description: 'Time when connection started', filterable: true, sortable: true, exportable: true },
  { name: 'uid', displayName: 'UID', type: 'string', category: 'basic', description: 'Unique connection identifier', filterable: true, sortable: false, exportable: true },

  // Network - Source
  { name: 'id.orig_h', displayName: 'Source IP', type: 'ip', category: 'network', description: 'Originating host IP address', filterable: true, sortable: true, exportable: true },
  { name: 'id.orig_p', displayName: 'Source Port', type: 'port', category: 'network', description: 'Originating host port', filterable: true, sortable: true, exportable: true },

  // Network - Destination
  { name: 'id.resp_h', displayName: 'Dest IP', type: 'ip', category: 'network', description: 'Responding host IP address', filterable: true, sortable: true, exportable: true },
  { name: 'id.resp_p', displayName: 'Dest Port', type: 'port', category: 'network', description: 'Responding host port', filterable: true, sortable: true, exportable: true },

  // Protocol & Service
  { name: 'proto', displayName: 'Protocol', type: 'string', category: 'network', description: 'Transport protocol (tcp, udp, icmp)', filterable: true, sortable: true, exportable: true },
  { name: 'service', displayName: 'Service', type: 'string', category: 'network', description: 'Application protocol (http, ssh, dns, etc)', filterable: true, sortable: true, exportable: true },

  // Timing
  { name: 'duration', displayName: 'Duration', type: 'duration', category: 'timing', description: 'Connection duration in seconds', filterable: true, sortable: true, exportable: true },

  // Bytes
  { name: 'orig_bytes', displayName: 'Orig Bytes', type: 'number', category: 'bytes', description: 'Bytes sent by originator', filterable: true, sortable: true, exportable: true },
  { name: 'resp_bytes', displayName: 'Resp Bytes', type: 'number', category: 'bytes', description: 'Bytes sent by responder', filterable: true, sortable: true, exportable: true },
  { name: 'missed_bytes', displayName: 'Missed Bytes', type: 'number', category: 'bytes', description: 'Bytes missed in capture', filterable: true, sortable: true, exportable: true },

  // Packets
  { name: 'orig_pkts', displayName: 'Orig Packets', type: 'number', category: 'packets', description: 'Packets sent by originator', filterable: true, sortable: true, exportable: true },
  { name: 'resp_pkts', displayName: 'Resp Packets', type: 'number', category: 'packets', description: 'Packets sent by responder', filterable: true, sortable: true, exportable: true },

  // IP Bytes
  { name: 'orig_ip_bytes', displayName: 'Orig IP Bytes', type: 'number', category: 'bytes', description: 'IP-level bytes sent by originator', filterable: true, sortable: true, exportable: true },
  { name: 'resp_ip_bytes', displayName: 'Resp IP Bytes', type: 'number', category: 'bytes', description: 'IP-level bytes sent by responder', filterable: true, sortable: true, exportable: true },

  // Connection State
  { name: 'conn_state', displayName: 'Conn State', type: 'string', category: 'state', description: 'Connection state (S0, S1, SF, REJ, etc)', filterable: true, sortable: true, exportable: true },
  { name: 'local_orig', displayName: 'Local Orig', type: 'boolean', category: 'network', description: 'Originator is local to network', filterable: true, sortable: true, exportable: true },
  { name: 'local_resp', displayName: 'Local Resp', type: 'boolean', category: 'network', description: 'Responder is local to network', filterable: true, sortable: true, exportable: true },

  // History
  { name: 'history', displayName: 'History', type: 'string', category: 'state', description: 'Connection state history', filterable: true, sortable: false, exportable: true },

  // Tunnel
  { name: 'tunnel_parents', displayName: 'Tunnel Parents', type: 'string', category: 'tunnel', description: 'UIDs of encapsulating connections', filterable: true, sortable: false, exportable: true },

  // Community ID
  { name: 'community_id', displayName: 'Community ID', type: 'string', category: 'ids', description: 'Community ID flow hash', filterable: true, sortable: false, exportable: true },

  // VLAN
  { name: 'vlan', displayName: 'VLAN', type: 'number', category: 'network', description: 'VLAN identifier', filterable: true, sortable: true, exportable: true },
  { name: 'inner_vlan', displayName: 'Inner VLAN', type: 'number', category: 'network', description: 'Inner VLAN identifier (QinQ)', filterable: true, sortable: true, exportable: true },

  // MAC Addresses
  { name: 'orig_l2_addr', displayName: 'Orig MAC', type: 'string', category: 'network', description: 'Originator MAC address', filterable: true, sortable: false, exportable: true },
  { name: 'resp_l2_addr', displayName: 'Resp MAC', type: 'string', category: 'network', description: 'Responder MAC address', filterable: true, sortable: false, exportable: true },
];

export const ZEEK_FIELD_CATEGORIES = [
  { id: 'basic', name: 'Basic', icon: '📋' },
  { id: 'network', name: 'Network', icon: '🌐' },
  { id: 'timing', name: 'Timing', icon: '⏱️' },
  { id: 'bytes', name: 'Bytes', icon: '📊' },
  { id: 'packets', name: 'Packets', icon: '📦' },
  { id: 'state', name: 'State', icon: '🔄' },
  { id: 'tunnel', name: 'Tunnel', icon: '🚇' },
  { id: 'ids', name: 'IDS', icon: '🔍' }
];

// Connection states and their meanings
export const CONN_STATES = [
  { value: 'S0', label: 'S0 - No response', description: 'Connection attempt seen, no reply' },
  { value: 'S1', label: 'S1 - Established', description: 'Connection established, not terminated' },
  { value: 'SF', label: 'SF - Normal', description: 'Normal establishment and termination' },
  { value: 'REJ', label: 'REJ - Rejected', description: 'Connection attempt rejected' },
  { value: 'S2', label: 'S2 - SYN/ACK', description: 'Connection established, orig SYN seen' },
  { value: 'S3', label: 'S3 - Mid-stream', description: 'Connection established, SYN not seen' },
  { value: 'RSTO', label: 'RSTO - Orig RST', description: 'Originator sent RST' },
  { value: 'RSTR', label: 'RSTR - Resp RST', description: 'Responder sent RST' },
  { value: 'RSTOS0', label: 'RSTOS0 - Orig RST S0', description: 'Orig sent SYN followed by RST, no SYN-ACK' },
  { value: 'RSTRH', label: 'RSTRH - Resp RST', description: 'Responder sent SYN ACK followed by RST' },
  { value: 'SH', label: 'SH - Orig FIN', description: 'Originator sent FIN' },
  { value: 'SHR', label: 'SHR - Resp FIN', description: 'Responder sent FIN' },
  { value: 'OTH', label: 'OTH - Other', description: 'No SYN seen, data transferred' }
];

// Common services
export const SERVICES = [
  'http', 'https', 'ssh', 'ftp', 'ftp-data', 'smtp', 'dns', 'dhcp',
  'ntp', 'snmp', 'ldap', 'smb', 'rdp', 'vnc', 'mysql', 'postgresql',
  'telnet', 'imap', 'pop3', 'ssl', 'ntlm', 'kerberos', 'irc', 'sip'
];

// Protocols
export const PROTOCOLS = ['tcp', 'udp', 'icmp'];

// Get field by name
export const getField = (name: string): ZeekField | undefined => {
  return ZEEK_FIELDS.find(f => f.name === name);
};

// Get fields by category
export const getFieldsByCategory = (category: string): ZeekField[] => {
  return ZEEK_FIELDS.filter(f => f.category === category);
};

// Get filterable fields
export const getFilterableFields = (): ZeekField[] => {
  return ZEEK_FIELDS.filter(f => f.filterable);
};

// Get sortable fields
export const getSortableFields = (): ZeekField[] => {
  return ZEEK_FIELDS.filter(f => f.sortable);
};

// Get exportable fields
export const getExportableFields = (): ZeekField[] => {
  return ZEEK_FIELDS.filter(f => f.exportable);
};
