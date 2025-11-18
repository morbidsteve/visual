import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Drawer,
  IconButton,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetworkGraph from './components/NetworkGraph';
import FilterPanel from './components/FilterPanel';
import NodeDetails from './components/NodeDetails';
import WhitelistManager from './components/WhitelistManager';
import SearchBar from './components/SearchBar';
import { useNetworkTopology } from './hooks/useNetworkData';
import type { NetworkNode, NetworkEdge, NetworkFilters } from './types/network';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const AppContent: React.FC = () => {
  const [filters, setFilters] = useState<NetworkFilters>({ hideWhitelisted: false });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const [whitelistDrawerOpen, setWhitelistDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const { data, isLoading, isError, error, refetch } = useNetworkTopology(filters);

  const handleNodeSelect = (node: NetworkNode | null) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeSelect = (edge: NetworkEdge | null) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleRefresh = () => {
    refetch();
    setSnackbar({ open: true, message: 'Refreshing network topology...', severity: 'success' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <MenuIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            Network Visualizer
          </Typography>

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <SearchBar />
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton color="inherit" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Manage Whitelist">
              <IconButton color="inherit" onClick={() => setWhitelistDrawerOpen(true)}>
                <PlaylistAddCheckIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Error Alert */}
      {isError && (
        <Alert severity="error" onClose={() => {}}>
          Failed to load network data: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Sidebar - Filters */}
          <Grid item xs={12} md={2.5} sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}>
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              stats={data?.stats}
            />
          </Grid>

          {/* Center - Network Graph */}
          <Grid item xs={12} md={7} sx={{ height: '100%' }}>
            <NetworkGraph
              nodes={data?.nodes || []}
              edges={data?.edges || []}
              loading={isLoading}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
            />
          </Grid>

          {/* Right Sidebar - Details */}
          <Grid item xs={12} md={2.5} sx={{ height: '100%', borderLeft: 1, borderColor: 'divider' }}>
            <NodeDetails
              node={selectedNode}
              edge={selectedEdge}
              onClose={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Whitelist Drawer */}
      <Drawer
        anchor="right"
        open={whitelistDrawerOpen}
        onClose={() => setWhitelistDrawerOpen(false)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <WhitelistManager />
      </Drawer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
