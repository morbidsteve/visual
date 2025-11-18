import axios from 'axios';
import type { NetworkTopology, NetworkFilters, WhitelistEntry, ConnectionDetail } from '../types/network';

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
