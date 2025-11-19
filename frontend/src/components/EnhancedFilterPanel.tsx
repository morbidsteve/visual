import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControlLabel,
  Switch,
  Slider,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import type { NetworkFilters } from '../types/network';

interface EnhancedFilterPanelProps {
  filters: NetworkFilters;
  onFiltersChange: (filters: NetworkFilters) => void;
  stats?: {
    uniqueSources: number;
    uniqueDestinations: number;
    totalConnections?: number;
    filteredNodes?: number;
    filteredEdges?: number;
    filteredConnections?: number;
    anomalousConnections?: number;
  };
  showConnectionFilters?: boolean;
}

const EnhancedFilterPanel: React.FC<EnhancedFilterPanelProps> = ({
  filters,
  onFiltersChange,
  stats,
  showConnectionFilters = false
}) => {
  const [localFilters, setLocalFilters] = useState<NetworkFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleClear = () => {
    const cleared: NetworkFilters = { hideWhitelisted: false };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const handleChange = (key: keyof NetworkFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeFilterCount = Object.entries(localFilters).filter(
    ([key, value]) => value !== undefined && value !== '' && value !== false
  ).length;

  return (
    <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          <Typography variant="h6">Filters</Typography>
          {activeFilterCount > 0 && (
            <Chip label={activeFilterCount} size="small" color="primary" />
          )}
        </Box>
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClear}
          disabled={activeFilterCount === 0}
        >
          Clear
        </Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Network Statistics
          </Typography>
          {stats.totalConnections !== undefined && (
            <Typography variant="body2">
              Connections: {stats.totalConnections}
            </Typography>
          )}
          <Typography variant="body2">
            Sources: {stats.uniqueSources}
          </Typography>
          <Typography variant="body2">
            Destinations: {stats.uniqueDestinations}
          </Typography>
          {stats.filteredConnections !== undefined && stats.filteredConnections > 0 && (
            <Typography variant="body2" color="primary">
              Filtered: {stats.filteredConnections} connections
            </Typography>
          )}
          {stats.anomalousConnections !== undefined && stats.anomalousConnections > 0 && (
            <Typography variant="body2" color="error">
              Anomalies: {stats.anomalousConnections}
            </Typography>
          )}
        </Box>
      )}

      {/* Time Range */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Time Range</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" gutterBottom>
              Last {localFilters.timeRange || 24} hours
            </Typography>
            <Slider
              value={localFilters.timeRange || 24}
              onChange={(_, value) => handleChange('timeRange', value)}
              min={1}
              max={168}
              step={1}
              marks={[
                { value: 1, label: '1h' },
                { value: 24, label: '24h' },
                { value: 168, label: '7d' }
              ]}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* IP Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>IP Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Source IP"
              placeholder="192.168.1.100"
              size="small"
              fullWidth
              value={localFilters.sourceIp || ''}
              onChange={(e) => handleChange('sourceIp', e.target.value)}
            />
            <TextField
              label="Destination IP"
              placeholder="10.0.0.50"
              size="small"
              fullWidth
              value={localFilters.destIp || ''}
              onChange={(e) => handleChange('destIp', e.target.value)}
            />
            <TextField
              label="Subnet"
              placeholder="192.168.1"
              size="small"
              fullWidth
              value={localFilters.subnet || ''}
              onChange={(e) => handleChange('subnet', e.target.value)}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Connection Filters */}
      {showConnectionFilters && (
        <>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Protocol & Service</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Protocol</InputLabel>
                  <Select
                    value={localFilters.protocol || ''}
                    label="Protocol"
                    onChange={(e) => handleChange('protocol', e.target.value || undefined)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="tcp">TCP</MenuItem>
                    <MenuItem value="udp">UDP</MenuItem>
                    <MenuItem value="icmp">ICMP</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Destination Port"
                  placeholder="443"
                  size="small"
                  type="number"
                  fullWidth
                  value={localFilters.destPort || ''}
                  onChange={(e) => handleChange('destPort', parseInt(e.target.value) || undefined)}
                />

                <TextField
                  label="Service"
                  placeholder="http, ssh, dns..."
                  size="small"
                  fullWidth
                  value={localFilters.service || ''}
                  onChange={(e) => handleChange('service', e.target.value)}
                />

                <TextField
                  label="Connection State"
                  placeholder="SF, S0, REJ..."
                  size="small"
                  fullWidth
                  value={localFilters.connState || ''}
                  onChange={(e) => handleChange('connState', e.target.value)}
                  helperText="Zeek connection state"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Result Limit</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Max connections: {localFilters.limit || 10000}
                </Typography>
                <Slider
                  value={localFilters.limit || 10000}
                  onChange={(_, value) => handleChange('limit', value)}
                  min={100}
                  max={50000}
                  step={100}
                  marks={[
                    { value: 100, label: '100' },
                    { value: 10000, label: '10k' },
                    { value: 50000, label: '50k' }
                  ]}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Traffic Volume */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Traffic Volume</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            label="Minimum Bytes"
            placeholder="1000000"
            size="small"
            type="number"
            fullWidth
            value={localFilters.minBytes || ''}
            onChange={(e) => handleChange('minBytes', parseInt(e.target.value) || undefined)}
            helperText="Show only connections with traffic above this threshold"
          />
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Whitelist */}
      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={localFilters.hideWhitelisted || false}
              onChange={(e) => handleChange('hideWhitelisted', e.target.checked)}
            />
          }
          label="Hide whitelisted traffic"
        />
        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
          Shows only anomalous connections on whitelisted hosts
        </Typography>
      </Box>

      {/* Apply Button */}
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 3 }}
        onClick={handleApply}
      >
        Apply Filters
      </Button>
    </Paper>
  );
};

export default EnhancedFilterPanel;
