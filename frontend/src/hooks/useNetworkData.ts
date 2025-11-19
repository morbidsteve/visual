import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkApi, whitelistApi } from '../services/api';
import type { NetworkFilters, WhitelistEntry } from '../types/network';

const REFRESH_INTERVAL = parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '30000');

export const useNetworkTopology = (filters: NetworkFilters = {}) => {
  return useQuery({
    queryKey: ['network-topology', filters],
    queryFn: () => networkApi.getTopology(filters),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL - 5000
  });
};

export const useConnectionDetails = (sourceIp: string, destIp: string, timeRange: number = 1) => {
  return useQuery({
    queryKey: ['connection-details', sourceIp, destIp, timeRange],
    queryFn: () => networkApi.getConnectionDetails(sourceIp, destIp, timeRange),
    enabled: !!sourceIp && !!destIp
  });
};

export const useNetworkSearch = (query: string, timeRange: number = 24) => {
  return useQuery({
    queryKey: ['network-search', query, timeRange],
    queryFn: () => networkApi.search(query, timeRange),
    enabled: query.length > 0
  });
};

export const useNetworkConnections = (filters: NetworkFilters = {}) => {
  return useQuery({
    queryKey: ['network-connections', filters],
    queryFn: () => networkApi.getConnections(filters),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL - 5000
  });
};

export const useWhitelist = (type?: string) => {
  return useQuery({
    queryKey: ['whitelist', type],
    queryFn: () => whitelistApi.getAll(type)
  });
};

export const useAddToWhitelist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryType,
      value,
      description
    }: {
      entryType: WhitelistEntry['entry_type'];
      value: string;
      description?: string;
    }) => whitelistApi.add(entryType, value, description || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      queryClient.invalidateQueries({ queryKey: ['network-topology'] });
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
    }
  });
};

export const useRemoveFromWhitelist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => whitelistApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      queryClient.invalidateQueries({ queryKey: ['network-topology'] });
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
    }
  });
};
