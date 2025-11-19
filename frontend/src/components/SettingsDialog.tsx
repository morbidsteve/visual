import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: AppSettings) => void;
}

export interface AppSettings {
  elasticsearch: {
    url: string;
    username: string;
    password: string;
    index: string;
    cloudId?: string;
    apiKey?: string;
  };
  kibana: {
    url: string;
    enabled: boolean;
  };
  websocket: {
    url: string;
    enabled: boolean;
    reconnectAttempts: number;
  };
  general: {
    defaultView: 'dashboard' | 'graph' | 'list';
    defaultTimeRange: number;
    defaultLimit: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  performance: {
    enableMemoryWarnings: boolean;
    memoryWarningThreshold: number;
    maxConnections: number;
  };
  security: {
    enableAnomalyDetection: boolean;
    anomalySensitivity: 'low' | 'medium' | 'high';
    autoWhitelist: boolean;
  };
}

const defaultSettings: AppSettings = {
  elasticsearch: {
    url: 'http://localhost:9200',
    username: '',
    password: '',
    index: 'zeek-*',
    cloudId: '',
    apiKey: ''
  },
  kibana: {
    url: 'http://localhost:5601',
    enabled: true
  },
  websocket: {
    url: 'ws://localhost:3001/ws',
    enabled: true,
    reconnectAttempts: 10
  },
  general: {
    defaultView: 'dashboard',
    defaultTimeRange: 24,
    defaultLimit: 10000,
    autoRefresh: true,
    refreshInterval: 30000
  },
  performance: {
    enableMemoryWarnings: true,
    memoryWarningThreshold: 80,
    maxConnections: 50000
  },
  security: {
    enableAnomalyDetection: true,
    anomalySensitivity: 'medium',
    autoWhitelist: false
  }
};

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('network-visualizer-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('network-visualizer-settings', JSON.stringify(settings));
    setHasChanges(false);
    if (onSettingsSaved) {
      onSettingsSaved(settings);
    }
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus(null);
    try {
      // This would normally test the backend connection
      // For now, just validate the URL format
      const url = new URL(settings.elasticsearch.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('URL must use http:// or https://');
      }
      setTestStatus({ type: 'success', message: 'Connection settings validated' });
    } catch (e) {
      setTestStatus({ type: 'error', message: `Invalid configuration: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  };

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = JSON.parse(JSON.stringify(prev));
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Settings</Typography>
          {hasChanges && <Chip label="Unsaved Changes" color="warning" size="small" />}
        </Box>
      </DialogTitle>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
        <Tab label="Elasticsearch" />
        <Tab label="Kibana" />
        <Tab label="WebSocket" />
        <Tab label="General" />
        <Tab label="Performance" />
        <Tab label="Security" />
      </Tabs>

      <DialogContent sx={{ minHeight: 400 }}>
        {/* Elasticsearch Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Elasticsearch Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure connection to your Elasticsearch cluster for Zeek network data
            </Typography>

            <TextField
              fullWidth
              label="Elasticsearch URL"
              value={settings.elasticsearch.url}
              onChange={(e) => updateSetting('elasticsearch.url', e.target.value)}
              placeholder="http://localhost:9200"
              sx={{ mb: 2 }}
              helperText="URL of your Elasticsearch instance"
            />

            <TextField
              fullWidth
              label="Index Pattern"
              value={settings.elasticsearch.index}
              onChange={(e) => updateSetting('elasticsearch.index', e.target.value)}
              placeholder="zeek-*"
              sx={{ mb: 2 }}
              helperText="Index pattern for Zeek connection logs"
            />

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption">Authentication</Typography>
            </Divider>

            <TextField
              fullWidth
              label="Username"
              value={settings.elasticsearch.username}
              onChange={(e) => updateSetting('elasticsearch.username', e.target.value)}
              placeholder="elastic"
              sx={{ mb: 2 }}
              autoComplete="username"
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={settings.elasticsearch.password}
              onChange={(e) => updateSetting('elasticsearch.password', e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption">OR Elastic Cloud</Typography>
            </Divider>

            <TextField
              fullWidth
              label="Cloud ID (optional)"
              value={settings.elasticsearch.cloudId}
              onChange={(e) => updateSetting('elasticsearch.cloudId', e.target.value)}
              placeholder="deployment:dXMtY2VudHJhbC0xLmF3cy5..."
              sx={{ mb: 2 }}
              helperText="Use Cloud ID for Elastic Cloud deployments"
            />

            <TextField
              fullWidth
              label="API Key (optional)"
              type={showApiKey ? 'text' : 'password'}
              value={settings.elasticsearch.apiKey}
              onChange={(e) => updateSetting('elasticsearch.apiKey', e.target.value)}
              sx={{ mb: 2 }}
              helperText="Alternative to username/password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                      {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              variant="outlined"
              onClick={handleTestConnection}
              fullWidth
              sx={{ mt: 2 }}
            >
              Test Connection
            </Button>

            {testStatus && (
              <Alert severity={testStatus.type} sx={{ mt: 2 }} icon={testStatus.type === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}>
                {testStatus.message}
              </Alert>
            )}
          </Box>
        )}

        {/* Kibana Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Kibana Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enable deep-linking to Kibana for packet-level investigation
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.kibana.enabled}
                  onChange={(e) => updateSetting('kibana.enabled', e.target.checked)}
                />
              }
              label="Enable Kibana Integration"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Kibana URL"
              value={settings.kibana.url}
              onChange={(e) => updateSetting('kibana.url', e.target.value)}
              placeholder="http://localhost:5601"
              disabled={!settings.kibana.enabled}
              helperText="Base URL for your Kibana instance"
            />
          </Box>
        )}

        {/* WebSocket Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Real-Time Updates (WebSocket)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure WebSocket connection for live network updates
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.websocket.enabled}
                  onChange={(e) => updateSetting('websocket.enabled', e.target.checked)}
                />
              }
              label="Enable Real-Time Updates"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="WebSocket URL"
              value={settings.websocket.url}
              onChange={(e) => updateSetting('websocket.url', e.target.value)}
              placeholder="ws://localhost:3001/ws"
              disabled={!settings.websocket.enabled}
              sx={{ mb: 2 }}
              helperText="WebSocket endpoint for real-time connection streaming"
            />

            <TextField
              fullWidth
              type="number"
              label="Max Reconnect Attempts"
              value={settings.websocket.reconnectAttempts}
              onChange={(e) => updateSetting('websocket.reconnectAttempts', parseInt(e.target.value))}
              disabled={!settings.websocket.enabled}
              inputProps={{ min: 1, max: 20 }}
              helperText="Number of reconnection attempts before giving up"
            />
          </Box>
        )}

        {/* General Tab */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              General Settings
            </Typography>

            <TextField
              fullWidth
              select
              label="Default View"
              value={settings.general.defaultView}
              onChange={(e) => updateSetting('general.defaultView', e.target.value)}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="dashboard">Dashboard</option>
              <option value="graph">Graph</option>
              <option value="list">List</option>
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Default Time Range (hours)"
              value={settings.general.defaultTimeRange}
              onChange={(e) => updateSetting('general.defaultTimeRange', parseInt(e.target.value))}
              inputProps={{ min: 1, max: 720 }}
              sx={{ mb: 2 }}
              helperText="Default time range for queries (1-720 hours)"
            />

            <TextField
              fullWidth
              type="number"
              label="Default Connection Limit"
              value={settings.general.defaultLimit}
              onChange={(e) => updateSetting('general.defaultLimit', parseInt(e.target.value))}
              inputProps={{ min: 100, max: 50000, step: 100 }}
              sx={{ mb: 2 }}
              helperText="Maximum connections to load by default"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.general.autoRefresh}
                  onChange={(e) => updateSetting('general.autoRefresh', e.target.checked)}
                />
              }
              label="Auto Refresh"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Refresh Interval (ms)"
              value={settings.general.refreshInterval}
              onChange={(e) => updateSetting('general.refreshInterval', parseInt(e.target.value))}
              inputProps={{ min: 5000, max: 300000, step: 1000 }}
              disabled={!settings.general.autoRefresh}
              helperText="How often to refresh data (5000-300000ms)"
            />
          </Box>
        )}

        {/* Performance Tab */}
        {activeTab === 4 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Performance & Memory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure memory limits and performance warnings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.performance.enableMemoryWarnings}
                  onChange={(e) => updateSetting('performance.enableMemoryWarnings', e.target.checked)}
                />
              }
              label="Enable Memory Warnings"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Memory Warning Threshold (%)"
              value={settings.performance.memoryWarningThreshold}
              onChange={(e) => updateSetting('performance.memoryWarningThreshold', parseInt(e.target.value))}
              inputProps={{ min: 50, max: 95 }}
              disabled={!settings.performance.enableMemoryWarnings}
              sx={{ mb: 2 }}
              helperText="Show warning when browser memory usage exceeds this percentage"
            />

            <TextField
              fullWidth
              type="number"
              label="Max Connections Allowed"
              value={settings.performance.maxConnections}
              onChange={(e) => updateSetting('performance.maxConnections', parseInt(e.target.value))}
              inputProps={{ min: 1000, max: 100000, step: 1000 }}
              sx={{ mb: 2 }}
              helperText="Hard limit on connections that can be loaded"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Lower limits improve performance but may hide data. Recommended: 10,000-25,000 for most deployments.
            </Alert>
          </Box>
        )}

        {/* Security Tab */}
        {activeTab === 5 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Security & Threat Detection
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.enableAnomalyDetection}
                  onChange={(e) => updateSetting('security.enableAnomalyDetection', e.target.checked)}
                />
              }
              label="Enable Anomaly Detection"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              select
              label="Anomaly Sensitivity"
              value={settings.security.anomalySensitivity}
              onChange={(e) => updateSetting('security.anomalySensitivity', e.target.value)}
              SelectProps={{ native: true }}
              disabled={!settings.security.enableAnomalyDetection}
              sx={{ mb: 2 }}
              helperText="Higher sensitivity = more anomalies detected (more false positives)"
            >
              <option value="low">Low (fewer alerts, higher confidence)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (more alerts, lower confidence)</option>
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.autoWhitelist}
                  onChange={(e) => updateSetting('security.autoWhitelist', e.target.checked)}
                />
              }
              label="Auto-Whitelist Common Patterns"
              sx={{ mb: 2 }}
            />

            <Alert severity="warning" sx={{ mt: 2 }}>
              Auto-whitelisting may hide legitimate threats. Only enable in mature environments with established baselines.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} startIcon={<RestoreIcon />} color="error">
          Reset to Defaults
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
