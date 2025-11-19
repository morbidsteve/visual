import React from 'react';
import { Box, Chip, Stack, Tooltip } from '@mui/material';
import type { NetworkFilters } from '../types/network';

interface QuickFiltersProps {
  onFilterApply: (filters: NetworkFilters) => void;
  currentFilters: NetworkFilters;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({ onFilterApply, currentFilters }) => {
  const presets = [
    {
      label: 'SSH Traffic',
      icon: '🔐',
      filters: { protocol: 'tcp', destPort: 22 }
    },
    {
      label: 'HTTP/HTTPS',
      icon: '🌐',
      filters: { protocol: 'tcp', service: 'http' }
    },
    {
      label: 'DNS Queries',
      icon: '📡',
      filters: { protocol: 'udp', destPort: 53 }
    },
    {
      label: 'External Only',
      icon: '🌍',
      filters: { /* Will be handled specially */ },
      special: 'external'
    },
    {
      label: 'High Volume',
      icon: '📊',
      filters: { minBytes: 10000000 } // 10MB+
    },
    {
      label: 'Failed Connections',
      icon: '❌',
      filters: { connState: 'REJ' }
    },
    {
      label: 'Database Traffic',
      icon: '🗄️',
      filters: { protocol: 'tcp', destPort: 3306 }
    },
    {
      label: 'RDP',
      icon: '🖥️',
      filters: { protocol: 'tcp', destPort: 3389 }
    },
    {
      label: 'Last Hour',
      icon: '⏰',
      filters: { timeRange: 1 }
    },
    {
      label: 'Anomalies Only',
      icon: '⚠️',
      filters: { hideWhitelisted: true },
      special: 'anomalies'
    }
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    if (preset.special === 'external') {
      // This would need custom logic in parent component
      onFilterApply({ ...currentFilters, ...preset.filters });
    } else if (preset.special === 'anomalies') {
      onFilterApply({ hideWhitelisted: true });
    } else {
      onFilterApply({ ...currentFilters, ...preset.filters });
    }
  };

  const isActive = (preset: typeof presets[0]) => {
    if (preset.special === 'anomalies') {
      return currentFilters.hideWhitelisted === true;
    }

    return Object.entries(preset.filters).every(
      ([key, value]) => currentFilters[key as keyof NetworkFilters] === value
    );
  };

  return (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', backgroundColor: '#f5f5f5' }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {presets.map((preset) => (
          <Tooltip key={preset.label} title={`Filter: ${preset.label}`}>
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </Box>
              }
              onClick={() => handlePresetClick(preset)}
              color={isActive(preset) ? 'primary' : 'default'}
              variant={isActive(preset) ? 'filled' : 'outlined'}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );
};

export default QuickFilters;
