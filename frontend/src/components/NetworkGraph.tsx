import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { Box, Paper, CircularProgress, Typography } from '@mui/material';
import type { NetworkNode, NetworkEdge } from '../types/network';
import {
  createCytoscapeElements,
  cytoscapeStylesheet,
  cytoscapeLayout
} from '../utils/cytoscapeConfig';

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  loading?: boolean;
  onNodeSelect?: (node: NetworkNode | null) => void;
  onEdgeSelect?: (edge: NetworkEdge | null) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  loading = false,
  onNodeSelect,
  onEdgeSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedElement, setSelectedElement] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: cytoscapeStylesheet,
      layout: cytoscapeLayout,
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.2
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data() as NetworkNode;

      // Deselect all
      cy.elements().removeClass('highlighted');

      // Highlight selected node and connected edges
      node.addClass('highlighted');
      node.connectedEdges().addClass('highlighted');

      setSelectedElement(nodeData.id);
      onNodeSelect?.(nodeData);
    });

    // Edge click handler
    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const edgeData = edge.data() as NetworkEdge;

      // Deselect all
      cy.elements().removeClass('highlighted');

      // Highlight selected edge and connected nodes
      edge.addClass('highlighted');
      edge.connectedNodes().addClass('highlighted');

      setSelectedElement(edgeData.id);
      onEdgeSelect?.(edgeData);
    });

    // Click on background to deselect
    cy.on('tap', (event) => {
      if (event.target === cy) {
        cy.elements().removeClass('highlighted');
        setSelectedElement('');
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
      }
    });

    // Cleanup
    return () => {
      cy.destroy();
    };
  }, []);

  // Update graph when data changes
  useEffect(() => {
    if (!cyRef.current || loading) return;

    const cy = cyRef.current;
    const elements = createCytoscapeElements(nodes, edges);

    // Frontend safety check: Validate edges reference existing nodes
    const nodeIds = new Set(elements.filter(el => !el.data.source).map(el => el.data.id));
    const validElements = elements.filter(el => {
      // Keep all nodes
      if (!el.data.source) return true;

      // For edges, check if source and target nodes exist
      const hasSource = nodeIds.has(el.data.source);
      const hasTarget = nodeIds.has(el.data.target);

      if (!hasSource || !hasTarget) {
        console.warn(`Frontend filtered invalid edge ${el.data.id}: source=${hasSource}, target=${hasTarget}`);
        return false;
      }
      return true;
    });

    // Update elements
    cy.elements().remove();
    cy.add(validElements);

    // Run layout
    cy.layout(cytoscapeLayout).run();

    // Fit to viewport
    cy.fit(undefined, 50);
  }, [nodes, edges, loading]);

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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          maxWidth: 200
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Node Types
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <LegendItem color="#64B5F6" label="Host" />
          <LegendItem color="#81C784" label="Server" />
          <LegendItem color="#4CAF50" label="Web Server" />
          <LegendItem color="#FFB74D" label="DNS Server" />
          <LegendItem color="#F06292" label="Router" />
          <LegendItem color="#E57373" label="Firewall" />
          <LegendItem color="#90A4AE" label="External" />
        </Box>

        <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }} gutterBottom>
          Protocols
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <LegendItem color="#42A5F5" label="TCP" isEdge />
          <LegendItem color="#66BB6A" label="UDP" isEdge />
          <LegendItem color="#FFA726" label="ICMP" isEdge />
        </Box>
      </Paper>

      {/* Controls hint */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
      >
        <Typography variant="caption" display="block">
          Click: Select node/edge
        </Typography>
        <Typography variant="caption" display="block">
          Drag: Pan
        </Typography>
        <Typography variant="caption" display="block">
          Scroll: Zoom
        </Typography>
        <Typography variant="caption" display="block">
          Drag node: Reposition
        </Typography>
      </Paper>
    </Paper>
  );
};

const LegendItem: React.FC<{ color: string; label: string; isEdge?: boolean }> = ({
  color,
  label,
  isEdge = false
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {isEdge ? (
      <Box
        sx={{
          width: 20,
          height: 2,
          backgroundColor: color
        }}
      />
    ) : (
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: color,
          border: '1px solid rgba(0,0,0,0.2)'
        }}
      />
    )}
    <Typography variant="caption">{label}</Typography>
  </Box>
);

export default NetworkGraph;
