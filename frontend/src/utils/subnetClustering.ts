import type { NetworkNode, NetworkEdge } from '../types/network';
import { Netmask } from 'netmask';

export interface Subnet {
  cidr: string;
  name: string;
  type: 'internal' | 'dmz' | 'external' | 'management';
  vlan?: number;
  color?: string;
  collapsed: boolean;
}

export interface HostGroup {
  name: string;
  hosts: string[];
  icon: string;
  color: string;
}

export interface TopologyConfig {
  subnets: Subnet[];
  hostGroups: HostGroup[];
}

// Subnet type colors
const SUBNET_COLORS = {
  internal: '#2196F3',    // Blue
  dmz: '#FF9800',         // Orange
  external: '#F44336',    // Red
  management: '#9C27B0'   // Purple
};

// Load topology configuration from localStorage
export const loadTopologyConfig = (): TopologyConfig => {
  try {
    const saved = localStorage.getItem('network-visualizer-topology');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load topology config:', error);
  }

  return { subnets: [], hostGroups: [] };
};

// Check if an IP belongs to a subnet
export const ipInSubnet = (ip: string, cidr: string): boolean => {
  try {
    const block = new Netmask(cidr);
    return block.contains(ip);
  } catch (error) {
    return false;
  }
};

// Find which subnet an IP belongs to
export const findSubnetForIP = (ip: string, subnets: Subnet[]): Subnet | null => {
  for (const subnet of subnets) {
    if (ipInSubnet(ip, subnet.cidr)) {
      return subnet;
    }
  }
  return null;
};

// Group nodes by subnet
export const groupNodesBySubnet = (
  nodes: NetworkNode[],
  config: TopologyConfig
): Map<string, NetworkNode[]> => {
  const subnetGroups = new Map<string, NetworkNode[]>();
  const ungrouped: NetworkNode[] = [];

  // Initialize groups for configured subnets
  config.subnets.forEach(subnet => {
    subnetGroups.set(subnet.cidr, []);
  });

  // Assign nodes to subnets
  nodes.forEach(node => {
    const subnet = findSubnetForIP(node.ip, config.subnets);
    if (subnet) {
      const group = subnetGroups.get(subnet.cidr);
      if (group) {
        group.push(node);
      }
    } else {
      ungrouped.push(node);
    }
  });

  // Add ungrouped nodes to a special group
  if (ungrouped.length > 0) {
    subnetGroups.set('ungrouped', ungrouped);
  }

  return subnetGroups;
};

// Create subnet parent nodes for Cytoscape compound graphs
export const createSubnetParents = (
  config: TopologyConfig,
  nodeCount: Map<string, number>
): any[] => {
  const parents: any[] = [];

  config.subnets.forEach(subnet => {
    const count = nodeCount.get(subnet.cidr) || 0;
    if (count === 0) return; // Skip empty subnets

    parents.push({
      data: {
        id: `subnet-${subnet.cidr}`,
        label: `${subnet.name}\n${subnet.cidr}\n(${count} hosts)`,
        type: 'subnet',
        subnetType: subnet.type,
        cidr: subnet.cidr,
        vlan: subnet.vlan,
        color: subnet.color || SUBNET_COLORS[subnet.type],
        collapsed: subnet.collapsed,
        hostCount: count
      },
      classes: ['subnet', `subnet-${subnet.type}`]
    });
  });

  // Create parent for ungrouped nodes
  const ungroupedCount = nodeCount.get('ungrouped') || 0;
  if (ungroupedCount > 0) {
    parents.push({
      data: {
        id: 'subnet-ungrouped',
        label: `Ungrouped\n(${ungroupedCount} hosts)`,
        type: 'subnet',
        subnetType: 'external',
        color: '#757575',
        collapsed: false,
        hostCount: ungroupedCount
      },
      classes: ['subnet', 'subnet-ungrouped']
    });
  }

  return parents;
};

// Determine clustering strategy based on total node count
export const getClusteringStrategy = (totalNodes: number): 'none' | 'subnet' | 'collapsed' | 'aggregated' => {
  if (totalNodes <= 10) {
    return 'none'; // Show all individual nodes
  } else if (totalNodes <= 100) {
    return 'subnet'; // Group by subnet, all visible
  } else if (totalNodes <= 1000) {
    return 'collapsed'; // Group by subnet, collapse inactive
  } else {
    return 'aggregated'; // Show only subnet nodes, hide individual hosts
  }
};

// Create Cytoscape elements with subnet clustering
export const createClusteredElements = (
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  config: TopologyConfig,
  strategy: 'none' | 'subnet' | 'collapsed' | 'aggregated' = 'subnet'
): any[] => {
  const elements: any[] = [];

  if (strategy === 'none') {
    // No clustering, show all nodes as is
    nodes.forEach(node => {
      elements.push({
        data: {
          ...node,
          id: node.id,
          label: node.ip,
          size: Math.max(20, Math.min(60, Math.log(node.connections + 1) * 15))
        }
      });
    });
  } else {
    // Group nodes by subnet
    const subnetGroups = groupNodesBySubnet(nodes, config);
    const nodeCounts = new Map<string, number>();

    subnetGroups.forEach((groupNodes, cidr) => {
      nodeCounts.set(cidr, groupNodes.length);
    });

    // Create subnet parent nodes
    const parents = createSubnetParents(config, nodeCounts);
    elements.push(...parents);

    // Add individual nodes
    if (strategy === 'aggregated') {
      // Only create subnet nodes, individual nodes are hidden
      // Edges will connect to subnet nodes
    } else {
      // Add individual nodes as children of subnets
      subnetGroups.forEach((groupNodes, cidr) => {
        const subnet = config.subnets.find(s => s.cidr === cidr);
        const parentId = cidr === 'ungrouped' ? 'subnet-ungrouped' : `subnet-${cidr}`;

        groupNodes.forEach(node => {
          const isCollapsed = strategy === 'collapsed' && subnet?.collapsed;

          elements.push({
            data: {
              ...node,
              id: node.id,
              parent: parentId,
              label: node.ip,
              size: Math.max(15, Math.min(40, Math.log(node.connections + 1) * 10)),
              hidden: isCollapsed
            },
            classes: isCollapsed ? ['hidden'] : []
          });
        });
      });
    }
  }

  // Add edges
  edges.forEach(edge => {
    const width = Math.max(1, Math.min(10, Math.log(edge.bytes + 1) * 0.5));

    elements.push({
      data: {
        ...edge,
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: `${edge.protocol}:${edge.destPort}`,
        width
      }
    });
  });

  return elements;
};

// Get subnet summary statistics
export const getSubnetStats = (
  subnetCidr: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): {
  hostCount: number;
  activeHosts: number;
  totalConnections: number;
  inboundBytes: number;
  outboundBytes: number;
  topProtocols: { protocol: string; count: number }[];
} => {
  const config = loadTopologyConfig();
  const subnetNodes = nodes.filter(node => {
    const subnet = findSubnetForIP(node.ip, config.subnets);
    return subnet?.cidr === subnetCidr;
  });

  const nodeIds = new Set(subnetNodes.map(n => n.id));
  const subnetEdges = edges.filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));

  const activeHosts = subnetNodes.filter(n => n.connections > 0).length;
  const totalConnections = subnetEdges.length;

  const inboundBytes = subnetEdges
    .filter(e => nodeIds.has(e.target))
    .reduce((sum, e) => sum + (e.bytes || 0), 0);

  const outboundBytes = subnetEdges
    .filter(e => nodeIds.has(e.source))
    .reduce((sum, e) => sum + (e.bytes || 0), 0);

  const protocolCounts = new Map<string, number>();
  subnetEdges.forEach(e => {
    const count = protocolCounts.get(e.protocol) || 0;
    protocolCounts.set(e.protocol, count + 1);
  });

  const topProtocols = Array.from(protocolCounts.entries())
    .map(([protocol, count]) => ({ protocol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    hostCount: subnetNodes.length,
    activeHosts,
    totalConnections,
    inboundBytes,
    outboundBytes,
    topProtocols
  };
};
