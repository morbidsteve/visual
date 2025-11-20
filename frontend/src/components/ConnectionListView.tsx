import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Chip,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  Alert,
  Toolbar,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { Connection } from '../types/network';
import { formatBytes, formatNumber } from '../utils/cytoscapeConfig';
import { exportToCSV, exportToJSON, exportAnomaliesOnly, exportSummary } from '../utils/exportUtils';

interface ConnectionListViewProps {
  connections: Connection[];
  loading?: boolean;
}

type OrderBy = keyof Connection;
type Order = 'asc' | 'desc';

const ConnectionListView: React.FC<ConnectionListViewProps> = ({ connections, loading }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('timestamp');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedConnections = React.useMemo(() => {
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

  const paginatedConnections = sortedConnections.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

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
      {/* Toolbar with Export Options */}
      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Connections ({connections.length})
        </Typography>
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
          <MenuItem onClick={() => handleExport('csv')}>
            Export All as CSV
          </MenuItem>
          <MenuItem onClick={() => handleExport('json')}>
            Export All as JSON
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleExport('anomalies-csv')}>
            Export Anomalies Only (CSV)
          </MenuItem>
          <MenuItem onClick={() => handleExport('anomalies-json')}>
            Export Anomalies Only (JSON)
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleExport('summary')}>
            Export Summary with Stats
          </MenuItem>
        </Menu>
      </Toolbar>

      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'timestamp'}
                  direction={orderBy === 'timestamp' ? order : 'asc'}
                  onClick={() => handleSort('timestamp')}
                >
                  Timestamp
                </TableSortLabel>
              </TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'protocol'}
                  direction={orderBy === 'protocol' ? order : 'asc'}
                  onClick={() => handleSort('protocol')}
                >
                  Protocol
                </TableSortLabel>
              </TableCell>
              <TableCell>Service</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'origBytes'}
                  direction={orderBy === 'origBytes' ? order : 'asc'}
                  onClick={() => handleSort('origBytes')}
                >
                  Bytes
                </TableSortLabel>
              </TableCell>
              <TableCell>State</TableCell>
              <TableCell>Anomalies</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedConnections.map((conn) => (
              <React.Fragment key={conn.id}>
                <TableRow
                  hover
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: conn.isAnomalous ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                    '&:hover': {
                      backgroundColor: conn.isAnomalous ? 'rgba(255, 0, 0, 0.1)' : undefined
                    }
                  }}
                  onClick={() => setExpandedRow(expandedRow === conn.id ? null : conn.id)}
                >
                  <TableCell>
                    <IconButton size="small">
                      {expandedRow === conn.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {new Date(conn.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontFamily="monospace">
                        {conn.sourceIp}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        :{conn.sourcePort}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontFamily="monospace">
                        {conn.destIp}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        :{conn.destPort}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={conn.protocol.toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>
                    {conn.service ? (
                      <Chip label={conn.service} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatBytes(conn.origBytes + conn.respBytes)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ↑{formatBytes(conn.origBytes)} ↓{formatBytes(conn.respBytes)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {conn.connState && (
                      <Chip label={conn.connState} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {conn.isAnomalous && conn.anomalies && conn.anomalies.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getSeverityIcon(conn.anomalies[0].severity)}
                        <Chip
                          label={conn.anomalies.length}
                          size="small"
                          color={getSeverityColor(conn.anomalies[0].severity)}
                        />
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={expandedRow === conn.id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Connection Details
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Duration
                            </Typography>
                            <Typography variant="body2">
                              {conn.duration ? `${conn.duration.toFixed(2)}s` : 'N/A'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Packets
                            </Typography>
                            <Typography variant="body2">
                              ↑{formatNumber(conn.origPackets)} ↓{formatNumber(conn.respPackets)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Direction
                            </Typography>
                            <Typography variant="body2">
                              {conn.localOrig ? 'Local' : 'Remote'} →{' '}
                              {conn.localResp ? 'Local' : 'Remote'}
                            </Typography>
                          </Box>
                          {conn.history && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                History
                              </Typography>
                              <Typography variant="body2" fontFamily="monospace">
                                {conn.history}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {conn.isAnomalous && conn.anomalies && conn.anomalies.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Anomalies Detected
                            </Typography>
                            {conn.anomalies.map((anomaly, idx) => (
                              <Alert
                                key={idx}
                                severity={anomaly.severity === 'high' ? 'error' : anomaly.severity === 'medium' ? 'warning' : 'info'}
                                icon={getSeverityIcon(anomaly.severity)}
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="body2" fontWeight="bold">
                                  {anomaly.type.replace(/_/g, ' ').toUpperCase()}
                                </Typography>
                                <Typography variant="caption">{anomaly.message}</Typography>
                              </Alert>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={connections.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
};

export default ConnectionListView;
