import cytoscape from 'cytoscape';
import type { NetworkNode, NetworkEdge } from '../types/network';

// Node colors based on type
const NODE_COLORS = {
  host: '#64B5F6',        // Light blue
  server: '#81C784',      // Light green
  web_server: '#4CAF50',  // Green
  dns_server: '#FFB74D',  // Orange
  router: '#F06292',      // Pink
  firewall: '#E57373',    // Red
  switch: '#BA68C8',      // Purple
  external: '#90A4AE'     // Grey
};

// Edge colors based on protocol
const EDGE_COLORS = {
  tcp: '#42A5F5',
  udp: '#66BB6A',
  icmp: '#FFA726',
  default: '#78909C'
};

export const createCytoscapeElements = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
  const cyNodes = nodes.map(node => ({
    data: {
      id: node.id,
      label: node.ip,
      ...node,
      color: node.isInternal ? NODE_COLORS[node.type] : NODE_COLORS.external,
      size: Math.max(20, Math.min(80, Math.log(node.connections + 1) * 15))
    }
  }));

  const cyEdges = edges.map(edge => {
    const width = Math.max(1, Math.min(10, Math.log(edge.bytes + 1) * 0.5));

    return {
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: `${edge.protocol}:${edge.destPort}`,
        ...edge,
        color: EDGE_COLORS[edge.protocol.toLowerCase()] || EDGE_COLORS.default,
        width
      }
    };
  });

  return [...cyNodes, ...cyEdges];
};

export const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
  // Host node styles
  {
    selector: 'node[!type]',
    style: {
      'background-color': 'data(color)',
      'label': 'data(label)',
      'width': 'data(size)',
      'height': 'data(size)',
      'font-size': '10px',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': '#fff',
      'text-outline-color': '#000',
      'text-outline-width': '1.5px',
      'overlay-opacity': 0,
      'border-width': 2,
      'border-color': '#fff',
      'border-opacity': 0.5
    }
  },
  // Subnet parent node styles
  {
    selector: 'node[type="subnet"]',
    style: {
      'background-color': 'data(color)',
      'background-opacity': 0.15,
      'border-width': 3,
      'border-color': 'data(color)',
      'border-opacity': 0.8,
      'border-style': 'dashed',
      'label': 'data(label)',
      'font-size': '14px',
      'font-weight': 'bold',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': 10,
      'color': 'data(color)',
      'text-outline-color': '#fff',
      'text-outline-width': '2px',
      'padding': '20px',
      'shape': 'roundrectangle'
    }
  },
  // Collapsed subnet (only shows parent)
  {
    selector: 'node[type="subnet"][collapsed]',
    style: {
      'background-opacity': 0.8,
      'shape': 'round-rectangle',
      'width': '120px',
      'height': '80px'
    }
  },
  // Hidden child nodes
  {
    selector: 'node.hidden',
    style: {
      'display': 'none'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': '#FFD700',
      'border-width': 4,
      'border-opacity': 1
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-color': '#FF4081',
      'border-width': 4,
      'border-opacity': 1,
      'z-index': 999
    }
  },
  // Edge styles
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.6,
      'label': '',
      'font-size': '10px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'overlay-opacity': 0
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'opacity': 1,
      'label': 'data(label)',
      'z-index': 999,
      'width': 'calc(data(width) * 1.5)'
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'opacity': 1,
      'width': 'calc(data(width) * 2)',
      'z-index': 999
    }
  }
];

export const cytoscapeLayout = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  animationEasing: 'ease-in-out',
  componentSpacing: 100,
  nodeOverlap: 20,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
  randomize: false,
  fit: true,
  padding: 30
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};
