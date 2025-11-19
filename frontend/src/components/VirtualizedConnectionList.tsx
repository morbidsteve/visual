import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Tooltip,
  TableSortLabel,
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { FixedSizeList as List } from 'react-window';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import type { Connection } from '../types/network';
import { formatBytes, formatNumber } from '../utils/cytoscapeConfig';
import { exportToCSV, exportToJSON, exportAnomaliesOnly, exportSummary } from '../utils/exportUtils';
import ColumnSelector, { DEFAULT_COLUMNS } from './ColumnSelector';
import { ZEEK_FIELDS } from '../utils/zeekFields';

interface VirtualizedConnectionListProps {
  connections: Connection[];
  loading?: boolean;
}

type OrderBy = keyof Connection;
type Order = 'asc' | 'desc';
type ViewDensity = 'compact' | 'standard' | 'comfortable';

const VirtualizedConnectionList: React.FC<VirtualizedConnectionListProps> = ({ connections, loading }) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('timestamp');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [viewDensity, setViewDensity] = useState<ViewDensity>('compact');

  // Load saved columns from localStorage or use defaults
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('network-visualizer-columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedConnections = useMemo(() => {
    return [...connections].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return order === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [connections, order, orderBy]);

  const handleExport = (format: 'csv' | 'json' | 'anomalies-csv' | 'anomalies-json' | 'summary') => {
    switch (format) {
      case 'csv':
        exportToCSV(sortedConnections);
        break;
      case 'json':
        exportToJSON(sortedConnections);
        break;
      case 'anomalies-csv':
        exportAnomaliesOnly(sortedConnections, 'csv');
        break;
      case 'anomalies-json':
        exportAnomaliesOnly(sortedConnections, 'json');
        break;
      case 'summary':
        exportSummary(sortedConnections);
        break;
    }
    setExportMenuAnchor(null);
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'medium':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'low':
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getRowHeight = () => {
    switch (viewDensity) {
      case 'compact': return 32;
      case 'comfortable': return 48;
      default: return 40;
    }
  };

  const getCellValue = (conn: Connection, fieldName: string): React.ReactNode => {
    const field = ZEEK_FIELDS.find(f => f.name === fieldName);
    if (!field) return '-';

    switch (fieldName) {
      case 'ts':
        return new Date(conn.timestamp).toLocaleString();
      case 'id.orig_h':
        return <Typography variant="caption" fontFamily="monospace">{conn.sourceIp}</Typography>;
      case 'id.orig_p':
        return conn.sourcePort;
      case 'id.resp_h':
        return <Typography variant="caption" fontFamily="monospace">{conn.destIp}</Typography>;
      case 'id.resp_p':
        return conn.destPort;
      case 'proto':
        return <Chip label={conn.protocol.toUpperCase()} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />;
      case 'service':
        return conn.service ? <Chip label={conn.service} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} /> : '-';
      case 'orig_bytes':
        return formatBytes(conn.origBytes);
      case 'resp_bytes':
        return formatBytes(conn.respBytes);
      case 'duration':
        return conn.duration ? `${conn.duration.toFixed(2)}s` : '-';
      case 'conn_state':
        return conn.connState ? <Chip label={conn.connState} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} /> : '-';
      case 'orig_pkts':
        return formatNumber(conn.origPackets);
      case 'resp_pkts':
        return formatNumber(conn.respPackets);
      case 'local_orig':
        return conn.localOrig ? '✓' : '-';
      case 'local_resp':
        return conn.localResp ? '✓' : '-';
      case 'history':
        return conn.history ? <Typography variant="caption" fontFamily="monospace">{conn.history}</Typography> : '-';
      default:
        return '-';
    }
  };

  // Virtual row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const conn = sortedConnections[index];
    const isAnomalous = conn.isAnomalous;

    return (
      <Box
        style={style}
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: isAnomalous ? 'rgba(255, 0, 0, 0.05)' : index % 2 === 0 ? 'background.default' : 'background.paper',
          '&:hover': {
            backgroundColor: isAnomalous ? 'rgba(255, 0, 0, 0.1)' : 'action.hover'
          },
          px: 1
        }}
      >
        {/* Anomaly indicator */}
        <Box sx={{ width: 30, flexShrink: 0 }}>
          {isAnomalous && conn.anomalies && conn.anomalies.length > 0 && (
            <Tooltip title={`${conn.anomalies.length} anomal${conn.anomalies.length === 1 ? 'y' : 'ies'}`}>
              {getSeverityIcon(conn.anomalies[0].severity)}
            </Tooltip>
          )}
        </Box>

        {/* Dynamic columns */}
        {selectedColumns.map((fieldName, idx) => {
          const field = ZEEK_FIELDS.find(f => f.name === fieldName);
          if (!field) return null;

          const width = fieldName === 'ts' ? 180 :
                       fieldName.includes('bytes') ? 100 :
                       fieldName.includes('ip') || fieldName.includes('_h') ? 140 :
                       fieldName.includes('port') || fieldName.includes('_p') ? 60 :
                       fieldName === 'proto' || fieldName === 'service' ? 80 :
                       fieldName === 'conn_state' ? 70 :
                       100;

          return (
            <Box
              key={idx}
              sx={{
                width,
                flexShrink: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                px: 0.5,
                fontSize: viewDensity === 'compact' ? '0.75rem' : '0.875rem'
              }}
            >
              {getCellValue(conn, fieldName)}
            </Box>
          );
        })}
      </Box>
    );
  }, [sortedConnections, selectedColumns, viewDensity]);

  if (connections.length === 0 && !loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No connections found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try adjusting your filters or time range
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Connections ({connections.length.toLocaleString()})
        </Typography>

        {connections.length > 50000 && (
          <Alert severity="warning" sx={{ mr: 2, py: 0 }} icon={<WarningIcon fontSize="small" />}>
            Large dataset ({connections.length.toLocaleString()} rows) - virtualized rendering active
          </Alert>
        )}

        <ToggleButtonGroup
          value={viewDensity}
          exclusive
          onChange={(_, v) => v && setViewDensity(v)}
          size="small"
          sx={{ mr: 2 }}
        >
          <ToggleButton value="compact">Compact</ToggleButton>
          <ToggleButton value="standard">Standard</ToggleButton>
          <ToggleButton value="comfortable">Comfortable</ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title="Select Columns">
          <IconButton size="small" onClick={() => setColumnSelectorOpen(true)} sx={{ mr: 1 }}>
            <ViewColumnIcon />
          </IconButton>
        </Tooltip>

        <Button
          startIcon={<FileDownloadIcon />}
          onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          size="small"
          variant="outlined"
        >
          Export
        </Button>

        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleExport('csv')}>Export All as CSV</MenuItem>
          <MenuItem onClick={() => handleExport('json')}>Export All as JSON</MenuItem>
          <Divider />
          <MenuItem onClick={() => handleExport('anomalies-csv')}>Export Anomalies Only (CSV)</MenuItem>
          <MenuItem onClick={() => handleExport('anomalies-json')}>Export Anomalies Only (JSON)</MenuItem>
          <Divider />
          <MenuItem onClick={() => handleExport('summary')}>Export Summary with Stats</MenuItem>
        </Menu>
      </Toolbar>

      {/* Column Headers */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: 2,
          borderColor: 'divider',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 1,
          height: 40
        }}
      >
        <Box sx={{ width: 30, flexShrink: 0 }} /> {/* Anomaly column */}

        {selectedColumns.map((fieldName, idx) => {
          const field = ZEEK_FIELDS.find(f => f.name === fieldName);
          if (!field) return null;

          const width = fieldName === 'ts' ? 180 :
                       fieldName.includes('bytes') ? 100 :
                       fieldName.includes('ip') || fieldName.includes('_h') ? 140 :
                       fieldName.includes('port') || fieldName.includes('_p') ? 60 :
                       fieldName === 'proto' || fieldName === 'service' ? 80 :
                       fieldName === 'conn_state' ? 70 :
                       100;

          return (
            <Box
              key={idx}
              sx={{
                width,
                flexShrink: 0,
                px: 0.5,
                cursor: field.sortable ? 'pointer' : 'default'
              }}
              onClick={() => field.sortable && handleSort(fieldName as OrderBy)}
            >
              {field.sortable ? (
                <TableSortLabel
                  active={orderBy === fieldName}
                  direction={orderBy === fieldName ? order : 'asc'}
                  sx={{ color: 'inherit', '&:hover': { color: 'inherit' }, '& .MuiTableSortLabel-icon': { color: 'inherit !important' } }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    {field.displayName}
                  </Typography>
                </TableSortLabel>
              ) : (
                <Typography variant="caption" fontWeight="bold">
                  {field.displayName}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Virtualized List */}
      <List
        height={window.innerHeight - 220} // Adjust based on toolbar/header height
        itemCount={sortedConnections.length}
        itemSize={getRowHeight()}
        width="100%"
        style={{ flex: 1 }}
      >
        {Row}
      </List>

      {/* Column Selector Dialog */}
      <ColumnSelector
        open={columnSelectorOpen}
        onClose={() => setColumnSelectorOpen(false)}
        selectedColumns={selectedColumns}
        onColumnsChange={setSelectedColumns}
      />
    </Paper>
  );
};

export default VirtualizedConnectionList;
