import axios from 'axios';
import type {
  NetworkTopology,
  NetworkFilters,
  WhitelistEntry,
  ConnectionDetail,
  ConnectionsResponse,
  Baseline
} from '../types/network';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Network API
export const networkApi = {
  getTopology: async (filters: NetworkFilters = {}): Promise<NetworkTopology> => {
    const params = new URLSearchParams();

    if (filters.timeRange) params.append('timeRange', filters.timeRange.toString());
    if (filters.sourceIp) params.append('sourceIp', filters.sourceIp);
    if (filters.destIp) params.append('destIp', filters.destIp);
    if (filters.subnet) params.append('subnet', filters.subnet);
    if (filters.minBytes) params.append('minBytes', filters.minBytes.toString());
    if (filters.hideWhitelisted !== undefined) {
      params.append('hideWhitelisted', filters.hideWhitelisted.toString());
    }

    const response = await api.get<NetworkTopology>(`/api/network/topology?${params.toString()}`);
    return response.data;
  },

  getConnectionDetails: async (
    sourceIp: string,
    destIp: string,
    timeRange: number = 1
  ): Promise<ConnectionDetail[]> => {
    const response = await api.get<ConnectionDetail[]>(
      `/api/network/connection/${sourceIp}/${destIp}?timeRange=${timeRange}`
    );
    return response.data;
  },

  search: async (query: string, timeRange: number = 24): Promise<any[]> => {
    const response = await api.get(`/api/network/search?q=${encodeURIComponent(query)}&timeRange=${timeRange}`);
    return response.data;
  },

  getConnections: async (filters: NetworkFilters = {}): Promise<ConnectionsResponse> => {
    const params = new URLSearchParams();

    if (filters.timeRange) params.append('timeRange', filters.timeRange.toString());
    if (filters.sourceIp) params.append('sourceIp', filters.sourceIp);
    if (filters.destIp) params.append('destIp', filters.destIp);
    if (filters.subnet) params.append('subnet', filters.subnet);
    if (filters.minBytes) params.append('minBytes', filters.minBytes.toString());
    if (filters.protocol) params.append('protocol', filters.protocol);
    if (filters.destPort) params.append('destPort', filters.destPort.toString());
    if (filters.service) params.append('service', filters.service);
    if (filters.connState) params.append('connState', filters.connState);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.hideWhitelisted !== undefined) {
      params.append('hideWhitelisted', filters.hideWhitelisted.toString());
    }

    const response = await api.get<ConnectionsResponse>(`/api/network/connections?${params.toString()}`);
    return response.data;
  },

  getBaseline: async (
    ip: string,
    isSubnet: boolean = false,
    lookbackDays: number = 7,
    regenerate: boolean = false
  ): Promise<Baseline> => {
    const params = new URLSearchParams();
    params.append('isSubnet', isSubnet.toString());
    params.append('lookbackDays', lookbackDays.toString());
    params.append('regenerate', regenerate.toString());

    const response = await api.get<Baseline>(`/api/network/baseline/${ip}?${params.toString()}`);
    return response.data;
  },

  generateBaseline: async (
    entityValue: string,
    entityType: 'ip' | 'subnet',
    lookbackDays: number = 7
  ): Promise<Baseline> => {
    const response = await api.post<{ success: boolean; baseline: Baseline }>('/api/network/baseline', {
      entityValue,
      entityType,
      lookbackDays
    });
    return response.data.baseline;
  },

  deleteBaseline: async (entityValue: string, entityType: 'ip' | 'subnet'): Promise<void> => {
    await api.delete(`/api/network/baseline/${entityValue}/${entityType}`);
  }
};

// Whitelist API
export const whitelistApi = {
  getAll: async (type?: string): Promise<WhitelistEntry[]> => {
    const url = type ? `/api/whitelist?type=${type}` : '/api/whitelist';
    const response = await api.get<WhitelistEntry[]>(url);
    return response.data;
  },

  add: async (
    entryType: WhitelistEntry['entry_type'],
    value: string,
    description: string = ''
  ): Promise<WhitelistEntry> => {
    const response = await api.post<WhitelistEntry>('/api/whitelist', {
      entryType,
      value,
      description
    });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/whitelist/${id}`);
  },

  check: async (entryType: WhitelistEntry['entry_type'], value: string): Promise<boolean> => {
    const response = await api.post<{ isWhitelisted: boolean }>('/api/whitelist/check', {
      entryType,
      value
    });
    return response.data.isWhitelisted;
  }
};

export default api;
