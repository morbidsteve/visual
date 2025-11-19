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
  Snackbar,
  Tabs,
  Tab,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TimelineIcon from '@mui/icons-material/Timeline';
import SaveIcon from '@mui/icons-material/Save';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import MapIcon from '@mui/icons-material/Map';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EnhancedNetworkGraph from './components/EnhancedNetworkGraph';
import EnhancedFilterPanel from './components/EnhancedFilterPanel';
import NodeDetails from './components/NodeDetails';
import WhitelistManager from './components/WhitelistManager';
import BaselineManager from './components/BaselineManager';
import SearchBar from './components/SearchBar';
import ConnectionListView from './components/ConnectionListView';
import VirtualizedConnectionList from './components/VirtualizedConnectionList';
import Dashboard from './components/Dashboard';
import QuickFilters from './components/QuickFilters';
import SavedFilters from './components/SavedFilters';
import MemoryMonitor from './components/MemoryMonitor';
import SettingsDialog from './components/SettingsDialog';
import ThreatHuntingPresets from './components/ThreatHuntingPresets';
import TimelineView from './components/TimelineView';
import AdvancedFilterBuilder from './components/AdvancedFilterBuilder';
import TopologyManager from './components/TopologyManager';
import VelociraptorCorrelationPanel from './components/VelociraptorCorrelationPanel';
import { useNetworkTopology, useNetworkConnections } from './hooks/useNetworkData';
import { useWebSocket } from './hooks/useWebSocket';
import type { NetworkNode, NetworkEdge, NetworkFilters, Connection } from './types/network';
import type { AppSettings } from './components/SettingsDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const AppContent: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'graph' | 'list' | 'timeline'>('dashboard');
  const [filters, setFilters] = useState<NetworkFilters>({ hideWhitelisted: false, limit: 10000 });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<'whitelist' | 'baseline' | 'threats' | 'advanced-filters'>('whitelist');
  const [useVirtualizedList, setUseVirtualizedList] = useState(false);
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topologyManagerOpen, setTopologyManagerOpen] = useState(false);
  const [correlationPanelOpen, setCorrelationPanelOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch data based on view
  const graphData = useNetworkTopology(filters);
  const connectionData = useNetworkConnections(filters);

  // Use appropriate data based on view
  const { data, isLoading, isError, error, refetch } = view === 'graph' ? graphData : connectionData;

  // WebSocket for real-time updates
  const {
    connected: wsConnected,
    newConnections: wsNewConnections,
    anomalies: wsAnomalies,
    connectionCount: wsConnectionCount,
    clearNewConnections,
    clearAnomalies
  } = useWebSocket();

  const handleLoadFilter = (loadedFilters: NetworkFilters) => {
    setFilters(loadedFilters);
    setSnackbar({ open: true, message: 'Filter loaded successfully', severity: 'success' });
  };

  const handleClearData = () => {
    // Reset filters to reduce data load
    setFilters({ hideWhitelisted: false, limit: 1000, timeRange: 1 });
    setSnackbar({ open: true, message: 'Data cleared. Filters reset to last hour with 1000 connection limit.', severity: 'success' });
    refetch();
  };

  const connectionCount = view === 'graph'
    ? (data?.edges?.length || 0)
    : (data?.connections?.length || 0);

  // Show notification when new anomalies detected
  React.useEffect(() => {
    if (wsAnomalies.length > 0 && wsConnected) {
      const highSeverityCount = wsAnomalies.filter(a =>
        a.anomalies?.some(an => an.severity === 'high')
      ).length;

      setSnackbar({
        open: true,
        message: `${wsAnomalies.length} new anomal${wsAnomalies.length === 1 ? 'y' : 'ies'} detected${highSeverityCount > 0 ? ` (${highSeverityCount} high severity)` : ''}`,
        severity: highSeverityCount > 0 ? 'error' : 'warning'
      });

      // Auto-clear after showing notification
      setTimeout(() => clearAnomalies(), 5000);
    }
  }, [wsAnomalies.length, wsConnected, clearAnomalies]);

  // Show notification when new connections arrive (if count is significant)
  React.useEffect(() => {
    if (wsConnectionCount > 10 && wsConnected) {
      setSnackbar({
        open: true,
        message: `${wsConnectionCount} new connections detected`,
        severity: 'info'
      });

      // Auto-refresh data to show new connections
      setTimeout(() => {
        refetch();
        clearNewConnections();
      }, 3000);
    }
  }, [wsConnectionCount, wsConnected, refetch, clearNewConnections]);

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
    setSnackbar({ open: true, message: 'Refreshing data...', severity: 'success' });
  };

  const handleDrawerOpen = (content: 'whitelist' | 'baseline' | 'threats' | 'advanced-filters') => {
    setDrawerContent(content);
    setDrawerOpen(true);
  };

  const handleSettingsSaved = (settings: AppSettings) => {
    setAppSettings(settings);
    setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <MenuIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 2 }}>
            Network Visualizer
          </Typography>

          {/* WebSocket Status Indicator */}
          <Chip
            label={wsConnected ? 'Live' : 'Offline'}
            size="small"
            color={wsConnected ? 'success' : 'default'}
            sx={{
              mr: 2,
              fontWeight: 'bold',
              animation: wsConnected ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 }
              }
            }}
          />

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <SearchBar />
          </Box>

          {/* View Toggle */}
          <Box sx={{ mx: 2 }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, newView) => newView && setView(newView)}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <ToggleButton value="dashboard" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' } }}>
                <Tooltip title="Dashboard"><DashboardIcon /></Tooltip>
              </ToggleButton>
              <ToggleButton value="graph" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' } }}>
                <Tooltip title="Graph View"><AccountTreeIcon /></Tooltip>
              </ToggleButton>
              <ToggleButton value="list" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' } }}>
                <Tooltip title="List View"><ListAltIcon /></Tooltip>
              </ToggleButton>
              <ToggleButton value="timeline" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' } }}>
                <Tooltip title="Timeline View"><TimelineIcon /></Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Network Topology">
              <IconButton color="inherit" onClick={() => setTopologyManagerOpen(true)}>
                <MapIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Velociraptor Correlation">
              <IconButton color="inherit" onClick={() => setCorrelationPanelOpen(true)}>
                <NetworkCheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Threat Hunting">
              <IconButton color="inherit" onClick={() => handleDrawerOpen('threats')}>
                <SecurityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save Filter">
              <IconButton color="inherit" onClick={() => setSavedFiltersOpen(true)}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton color="inherit" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Manage Whitelist">
              <IconButton color="inherit" onClick={() => handleDrawerOpen('whitelist')}>
                <PlaylistAddCheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Manage Baselines">
              <IconButton color="inherit" onClick={() => handleDrawerOpen('baseline')}>
                <TimelineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
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

      {/* Quick Filters */}
      {view !== 'dashboard' && view !== 'timeline' && (
        <QuickFilters
          onFilterApply={setFilters}
          currentFilters={filters}
        />
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Sidebar - Filters */}
          {view !== 'dashboard' && view !== 'timeline' && (
            <Grid item xs={12} md={2.5} sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}>
              <EnhancedFilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                stats={data?.stats}
                showConnectionFilters={view === 'list'}
              />
            </Grid>
          )}

          {/* Center - Main View */}
          <Grid
            item
            xs={12}
            md={view === 'dashboard' || view === 'timeline' ? 12 : 7}
            sx={{ height: '100%' }}
          >
            {view === 'dashboard' ? (
              <Dashboard
                data={data}
                loading={isLoading}
              />
            ) : view === 'timeline' ? (
              <TimelineView
                connections={data?.connections || []}
                loading={isLoading}
              />
            ) : view === 'graph' ? (
              <EnhancedNetworkGraph
                nodes={data?.nodes || []}
                edges={data?.edges || []}
                loading={isLoading}
                onNodeSelect={handleNodeSelect}
                onEdgeSelect={handleEdgeSelect}
                onRefresh={handleRefresh}
              />
            ) : (
              // Auto-switch to virtualized list for large datasets (>10k connections)
              (data?.connections?.length || 0) > 10000 || useVirtualizedList ? (
                <VirtualizedConnectionList
                  connections={data?.connections || []}
                  loading={isLoading}
                />
              ) : (
                <ConnectionListView
                  connections={data?.connections || []}
                  loading={isLoading}
                />
              )
            )}
          </Grid>

          {/* Right Sidebar - Details */}
          {view !== 'dashboard' && view !== 'timeline' && (
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
          )}
        </Grid>
      </Box>

      {/* Drawer for Whitelist/Baseline/Threat Hunting/Advanced Filters */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: drawerContent === 'threats' || drawerContent === 'advanced-filters' ? 800 : 500 } }}
      >
        <Tabs
          value={drawerContent}
          onChange={(_, value) => setDrawerContent(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Threat Hunting" value="threats" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Advanced Filters" value="advanced-filters" />
          <Tab label="Whitelist" value="whitelist" />
          <Tab label="Baselines" value="baseline" />
        </Tabs>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {drawerContent === 'threats' && (
            <ThreatHuntingPresets onFilterApply={setFilters} currentFilters={filters} />
          )}
          {drawerContent === 'advanced-filters' && (
            <AdvancedFilterBuilder onApplyFilters={setFilters} currentFilters={filters} />
          )}
          {drawerContent === 'whitelist' && <WhitelistManager />}
          {drawerContent === 'baseline' && <BaselineManager />}
        </Box>
      </Drawer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      {/* Saved Filters Dialog */}
      <SavedFilters
        open={savedFiltersOpen}
        onClose={() => setSavedFiltersOpen(false)}
        currentFilters={filters}
        onLoadFilter={handleLoadFilter}
      />

      {/* Memory Monitor */}
      <MemoryMonitor
        connectionCount={connectionCount}
        onClearRequested={handleClearData}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsSaved={handleSettingsSaved}
      />

      {/* Topology Manager Dialog */}
      <Dialog
        open={topologyManagerOpen}
        onClose={() => setTopologyManagerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Network Topology Configuration</DialogTitle>
        <DialogContent>
          <TopologyManager />
        </DialogContent>
      </Dialog>

      {/* Velociraptor Correlation Panel Dialog */}
      <Dialog
        open={correlationPanelOpen}
        onClose={() => setCorrelationPanelOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Velociraptor Endpoint Correlation</DialogTitle>
        <DialogContent>
          <VelociraptorCorrelationPanel
            connection={selectedConnection}
            onClose={() => {
              setCorrelationPanelOpen(false);
              setSelectedConnection(null);
            }}
          />
        </DialogContent>
      </Dialog>
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
