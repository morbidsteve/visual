import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { NetworkNode, NetworkEdge } from '../types/network';
import { formatBytes, formatNumber } from '../utils/cytoscapeConfig';
import { useAddToWhitelist } from '../hooks/useNetworkData';

interface NodeDetailsProps {
  node?: NetworkNode | null;
  edge?: NetworkEdge | null;
  onClose: () => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, edge, onClose }) => {
  const addToWhitelist = useAddToWhitelist();

  if (!node && !edge) {
    return (
      <Paper sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">
          Select a node or connection to view details
        </Typography>
      </Paper>
    );
  }

  const handleWhitelist = async () => {
    if (node) {
      await addToWhitelist.mutateAsync({
        entryType: 'ip',
        value: node.ip,
        description: `Auto-whitelisted from graph (${node.type})`
      });
    } else if (edge) {
      await addToWhitelist.mutateAsync({
        entryType: 'connection',
        value: `${edge.source}->${edge.target}:${edge.destPort}`,
        description: `Auto-whitelisted connection (${edge.protocol})`
      });
    }
  };

  return (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {node ? 'Node Details' : 'Connection Details'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        {node && <NodeDetailsContent node={node} onWhitelist={handleWhitelist} />}
        {edge && <EdgeDetailsContent edge={edge} onWhitelist={handleWhitelist} />}
      </Box>
    </Paper>
  );
};

const NodeDetailsContent: React.FC<{ node: NetworkNode; onWhitelist: () => void }> = ({
  node,
  onWhitelist
}) => (
  <Box>
    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
      {node.ip}
    </Typography>

    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Chip label={node.type.replace('_', ' ').toUpperCase()} size="small" color="primary" />
      <Chip label={node.isInternal ? 'Internal' : 'External'} size="small" />
      <Chip label={node.subnet} size="small" variant="outlined" />
    </Box>

    <List dense>
      <ListItem>
        <ListItemText
          primary="Total Connections"
          secondary={formatNumber(node.connections)}
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Bytes Sent"
          secondary={formatBytes(node.totalBytesSent)}
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Bytes Received"
          secondary={formatBytes(node.totalBytesReceived)}
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Total Traffic"
          secondary={formatBytes(node.totalBytesSent + node.totalBytesReceived)}
        />
      </ListItem>
    </List>

    <Divider sx={{ my: 2 }} />

    <Tooltip title="Add this IP to whitelist">
      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        fullWidth
        onClick={onWhitelist}
      >
        Whitelist IP
      </Button>
    </Tooltip>
  </Box>
);

const EdgeDetailsContent: React.FC<{ edge: NetworkEdge; onWhitelist: () => void }> = ({
  edge,
  onWhitelist
}) => (
  <Box>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Connection
    </Typography>
    <Typography variant="body1" fontWeight="bold" gutterBottom>
      {edge.source} → {edge.target}
    </Typography>

    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Chip label={`${edge.protocol.toUpperCase()}:${edge.destPort}`} size="small" color="primary" />
      {edge.services.map((service, idx) => (
        <Chip key={idx} label={service} size="small" variant="outlined" />
      ))}
    </Box>

    <List dense>
      <ListItem>
        <ListItemText
          primary="Total Connections"
          secondary={formatNumber(edge.connections)}
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Total Bytes"
          secondary={formatBytes(edge.bytes)}
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary="Total Packets"
          secondary={formatNumber(edge.packets)}
        />
      </ListItem>
    </List>

    {edge.connStates.length > 0 && (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Connection States
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {edge.connStates.map((state, idx) => (
            <Chip
              key={idx}
              label={`${state.state}: ${state.count}`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      </>
    )}

    <Divider sx={{ my: 2 }} />

    <Tooltip title="Add this connection to whitelist">
      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        fullWidth
        onClick={onWhitelist}
      >
        Whitelist Connection
      </Button>
    </Tooltip>
  </Box>
);

export default NodeDetails;
