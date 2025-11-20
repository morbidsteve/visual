import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import {
  Box,
  Paper,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LayersIcon from '@mui/icons-material/Layers';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GridOnIcon from '@mui/icons-material/GridOn';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import type { NetworkNode, NetworkEdge } from '../types/network';
import { cytoscapeStylesheet, cytoscapeLayout } from '../utils/cytoscapeConfig';
import {
  loadTopologyConfig,
  createClusteredElements,
  getClusteringStrategy,
  getSubnetStats,
  type TopologyConfig
} from '../utils/subnetClustering';

interface EnhancedNetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  loading?: boolean;
  onNodeSelect?: (node: NetworkNode | null) => void;
  onEdgeSelect?: (edge: NetworkEdge | null) => void;
  onRefresh?: () => void;
}

type LayoutType = 'cose' | 'grid' | 'circle' | 'concentric';
type ClusterMode = 'auto' | 'none' | 'subnet' | 'collapsed' | 'aggregated';

const EnhancedNetworkGraph: React.FC<EnhancedNetworkGraphProps> = ({
  nodes,
  edges,
  loading = false,
  onNodeSelect,
  onEdgeSelect,
  onRefresh
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [topology, setTopology] = useState<TopologyConfig>(loadTopologyConfig());
  const [clusterMode, setClusterMode] = useState<ClusterMode>('auto');
  const [layoutType, setLayoutType] = useState<LayoutType>('cose');
  const [subnetMenuAnchor, setSubnetMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSubnetStats, setSelectedSubnetStats] = useState<any>(null);
  const [collapsedSubnets, setCollapsedSubnets] = useState<Set<string>>(new Set());

  // Listen for topology config changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTopology(loadTopologyConfig());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: cytoscapeStylesheet,
      layout: cytoscapeLayout,
      minZoom: 0.05,
      maxZoom: 4,
      wheelSensitivity: 0.15
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();

      // Check if it's a subnet node
      if (nodeData.type === 'subnet') {
        handleSubnetClick(nodeData, event.originalEvent as MouseEvent);
        return;
      }

      // Regular host node
      cy.elements().removeClass('highlighted');
      node.addClass('highlighted');
      node.connectedEdges().addClass('highlighted');
      onNodeSelect?.(nodeData as NetworkNode);
    });

    // Edge click handler
    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const edgeData = edge.data();

      cy.elements().removeClass('highlighted');
      edge.addClass('highlighted');
      edge.connectedNodes().addClass('highlighted');
      onEdgeSelect?.(edgeData as NetworkEdge);
    });

    // Background click
    cy.on('tap', (event) => {
      if (event.target === cy) {
        cy.elements().removeClass('highlighted');
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
      }
    });

    // Double-click subnet to toggle collapse/expand
    cy.on('dbltap', 'node[type="subnet"]', (event) => {
      const node = event.target;
      const subnetId = node.data('id');
      toggleSubnetCollapse(subnetId);
    });

    return () => {
      cy.destroy();
    };
  }, []);

  // Update graph when data or clustering changes
  useEffect(() => {
    if (!cyRef.current || loading) return;

    const cy = cyRef.current;

    // Determine clustering strategy
    let strategy: 'none' | 'subnet' | 'collapsed' | 'aggregated' = 'subnet';
    if (clusterMode === 'auto') {
      strategy = getClusteringStrategy(nodes.length);
    } else {
      strategy = clusterMode as 'none' | 'subnet' | 'collapsed' | 'aggregated';
    }

    // Create clustered elements
    const elements = createClusteredElements(nodes, edges, topology, strategy);

    // Frontend safety check: Validate edges reference existing nodes
    const nodeIds = new Set(elements.filter(el => !('source' in el.data)).map(el => el.data.id));
    const validElements = elements.filter(el => {
      // Keep all nodes
      if (!('source' in el.data)) return true;

      // For edges, check if source and target nodes exist
      const hasSource = nodeIds.has((el.data as any).source);
      const hasTarget = nodeIds.has((el.data as any).target);

      if (!hasSource || !hasTarget) {
        console.warn(`Frontend filtered invalid edge ${el.data.id}: source=${hasSource}, target=${hasTarget}`);
        return false;
      }
      return true;
    });

    // Update graph
    cy.elements().remove();
    cy.add(validElements);

    // Apply collapsed state
    collapsedSubnets.forEach(subnetId => {
      const children = cy.nodes(`[parent="${subnetId}"]`);
      children.addClass('hidden');
      const parent = cy.getElementById(subnetId);
      parent.data('collapsed', true);
    });

    // Run layout
    runLayout(layoutType);
  }, [nodes, edges, topology, clusterMode, layoutType, collapsedSubnets, loading]);

  const handleSubnetClick = (subnetData: any, event: MouseEvent) => {
    // Show subnet stats in a menu
    const stats = getSubnetStats(subnetData.cidr, nodes, edges);
    setSelectedSubnetStats({
      ...subnetData,
      stats
    });
    setSubnetMenuAnchor(event.target as HTMLElement);
  };

  const toggleSubnetCollapse = (subnetId: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const parent = cy.getElementById(subnetId);
    const children = cy.nodes(`[parent="${subnetId}"]`);

    const isCollapsed = collapsedSubnets.has(subnetId);

    if (isCollapsed) {
      // Expand
      children.removeClass('hidden');
      parent.data('collapsed', false);
      setCollapsedSubnets(prev => {
        const next = new Set(prev);
        next.delete(subnetId);
        return next;
      });
    } else {
      // Collapse
      children.addClass('hidden');
      parent.data('collapsed', true);
      setCollapsedSubnets(prev => new Set(prev).add(subnetId));
    }

    // Re-run layout
    setTimeout(() => runLayout(layoutType), 100);
  };

  const runLayout = (type: LayoutType) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    const layouts = {
      cose: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        componentSpacing: 150,
        nestingFactor: 1.2,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      grid: {
        name: 'grid',
        animate: true,
        animationDuration: 500,
        avoidOverlap: true,
        padding: 30,
        position: (node: any) => {
          // Subnets should create their own grid sections
          return undefined;
        }
      },
      circle: {
        name: 'circle',
        animate: true,
        animationDuration: 500,
        avoidOverlap: true,
        radius: undefined,
        spacingFactor: 1.5
      },
      concentric: {
        name: 'concentric',
        animate: true,
        animationDuration: 500,
        avoidOverlap: true,
        concentric: (node: any) => {
          if (node.data('type') === 'subnet') return 10;
          return node.data('connections') || 1;
        },
        levelWidth: () => 2,
        spacingFactor: 1.5
      }
    };

    cy.layout(layouts[type]).run();
    cy.fit(undefined, 50);
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleLayoutChange = (_: any, newLayout: LayoutType | null) => {
    if (newLayout) {
      setLayoutType(newLayout);
    }
  };

  const handleClusterModeChange = (_: any, newMode: ClusterMode | null) => {
    if (newMode) {
      setClusterMode(newMode);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const activeStrategy = clusterMode === 'auto'
    ? getClusteringStrategy(nodes.length)
    : clusterMode;

  return (
    <Paper
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a'
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography color="white">Loading network topology...</Typography>
        </Box>
      )}

      {/* Top Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 100
        }}
      >
        {/* Layout Selection */}
        <Box>
          <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
            Layout
          </Typography>
          <ToggleButtonGroup
            value={layoutType}
            exclusive
            onChange={handleLayoutChange}
            size="small"
            sx={{ display: 'flex' }}
          >
            <ToggleButton value="cose">
              <Tooltip title="Force-directed"><AccountTreeIcon fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="grid">
              <Tooltip title="Grid"><GridOnIcon fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="circle">
              <Tooltip title="Circle"><BubbleChartIcon fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="concentric">
              <Tooltip title="Concentric"><LayersIcon fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {/* Clustering Mode */}
        <Box>
          <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
            Clustering
          </Typography>
          <ToggleButtonGroup
            value={clusterMode}
            exclusive
            onChange={handleClusterModeChange}
            orientation="vertical"
            size="small"
          >
            <Tooltip title="Auto (based on node count)">
              <ToggleButton value="auto">Auto</ToggleButton>
            </Tooltip>
            <Tooltip title="Show all nodes">
              <ToggleButton value="none">None</ToggleButton>
            </Tooltip>
            <Tooltip title="Group by subnet">
              <ToggleButton value="subnet">Subnet</ToggleButton>
            </Tooltip>
            <Tooltip title="Collapse inactive subnets">
              <ToggleButton value="collapsed">Collapsed</ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        <Chip
          label={`Strategy: ${activeStrategy}`}
          size="small"
          color="primary"
          sx={{ fontSize: '0.7rem' }}
        />
      </Paper>

      {/* Zoom Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: 0.5,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          zIndex: 100
        }}
      >
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={onRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider />
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Center">
          <IconButton size="small" onClick={handleCenter}>
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Graph Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: loading ? 0.3 : 1
        }}
      />

      {/* Legend */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          padding: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          maxWidth: 250,
          zIndex: 100
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Network Info
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption">
            Hosts: {nodes.length}
          </Typography>
          <Typography variant="caption">
            Connections: {edges.length}
          </Typography>
          <Typography variant="caption">
            Subnets: {topology.subnets.length}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Typography variant="caption" fontWeight="bold" display="block">
          Subnet Types
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
          <LegendItem color="#2196F3" label="Internal" />
          <LegendItem color="#FF9800" label="DMZ" />
          <LegendItem color="#F44336" label="External" />
          <LegendItem color="#9C27B0" label="Management" />
        </Box>

        <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
          Double-click subnet to expand/collapse
        </Typography>
      </Paper>

      {/* Subnet Stats Menu */}
      <Menu
        anchorEl={subnetMenuAnchor}
        open={Boolean(subnetMenuAnchor)}
        onClose={() => setSubnetMenuAnchor(null)}
      >
        {selectedSubnetStats && (
          <Box sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="h6" gutterBottom>
              {selectedSubnetStats.label}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2">
              <strong>CIDR:</strong> {selectedSubnetStats.cidr}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {selectedSubnetStats.subnetType}
            </Typography>
            {selectedSubnetStats.vlan && (
              <Typography variant="body2">
                <strong>VLAN:</strong> {selectedSubnetStats.vlan}
              </Typography>
            )}
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">
              <strong>Hosts:</strong> {selectedSubnetStats.stats?.hostCount || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Active:</strong> {selectedSubnetStats.stats?.activeHosts || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Connections:</strong> {selectedSubnetStats.stats?.totalConnections || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Inbound:</strong> {formatBytes(selectedSubnetStats.stats?.inboundBytes || 0)}
            </Typography>
            <Typography variant="body2">
              <strong>Outbound:</strong> {formatBytes(selectedSubnetStats.stats?.outboundBytes || 0)}
            </Typography>
            {selectedSubnetStats.stats?.topProtocols?.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" fontWeight="bold">Top Protocols:</Typography>
                {selectedSubnetStats.stats.topProtocols.map((p: any) => (
                  <Typography key={p.protocol} variant="caption" display="block">
                    {p.protocol}: {p.count}
                  </Typography>
                ))}
              </>
            )}
            <Divider sx={{ my: 1 }} />
            <MenuItem
              onClick={() => {
                toggleSubnetCollapse(selectedSubnetStats.id);
                setSubnetMenuAnchor(null);
              }}
            >
              {collapsedSubnets.has(selectedSubnetStats.id) ? 'Expand' : 'Collapse'} Subnet
            </MenuItem>
          </Box>
        )}
      </Menu>
    </Paper>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box
      sx={{
        width: 16,
        height: 16,
        backgroundColor: color,
        border: '2px dashed rgba(0,0,0,0.3)',
        borderRadius: 0.5
      }}
    />
    <Typography variant="caption">{label}</Typography>
  </Box>
);

export default EnhancedNetworkGraph;
