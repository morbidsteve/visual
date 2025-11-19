import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import BugReportIcon from '@mui/icons-material/BugReport';
import ComputerIcon from '@mui/icons-material/Computer';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Connection } from '../types/network';

interface VelociraptorCorrelationPanelProps {
  connection: Connection | null;
  onClose: () => void;
}

interface CorrelationResult {
  clientId: string;
  clientName: string;
  processId: number;
  processName: string;
  processPath: string;
  user: string;
  localPort: number;
  state: string;
  timestamp: string;
}

interface ClientInfo {
  clientId: string;
  hostname: string;
  os: string;
  osVersion: string;
  lastSeen: string;
  macAddresses: string[];
  labels: string[];
  agentVersion: string;
}

interface ProcessInfo {
  pid: number;
  name: string;
  path: string;
  cmdline: string;
  user: string;
  createTime: string;
  connections: number;
}

interface TimelineEvent {
  timestamp: string;
  type: 'file' | 'process' | 'network' | 'registry';
  action: string;
  details: string;
}

interface HuntResult {
  huntId: string;
  artifact: string;
  status: 'created' | 'running' | 'completed';
  matches: number;
}

const VelociraptorCorrelationPanel: React.FC<VelociraptorCorrelationPanelProps> = ({
  connection,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [triageData, setTriageData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [huntDialogOpen, setHuntDialogOpen] = useState(false);
  const [huntIndicator, setHuntIndicator] = useState('');
  const [huntResult, setHuntResult] = useState<HuntResult | null>(null);

  const handleCorrelate = async () => {
    if (!connection) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/velociraptor/correlate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIp: connection.sourceIp,
          destIp: connection.destIp,
          destPort: connection.destPort,
          timestamp: connection.timestamp
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Correlation failed');
      }

      const data = await response.json();
      setCorrelation(data);

      // Fetch additional client info
      if (data.clientId) {
        await fetchClientInfo(data.clientId);
        await fetchProcessList(data.clientId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientInfo = async (clientId: string) => {
    try {
      const response = await fetch(`/api/velociraptor/client-info/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch client info:', err);
    }
  };

  const fetchProcessList = async (clientId: string) => {
    try {
      const response = await fetch(`/api/velociraptor/processes/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setProcesses(data.processes || []);
      }
    } catch (err) {
      console.error('Failed to fetch process list:', err);
    }
  };

  const fetchTimeline = async (clientId: string) => {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/velociraptor/timeline/${clientId}?startTime=${startTime}&endTime=${endTime}`
      );

      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    }
  };

  const handleTriage = async () => {
    if (!connection) return;

    setLoading(true);
    try {
      const response = await fetch('/api/velociraptor/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: connection.sourceIp })
      });

      if (response.ok) {
        const data = await response.json();
        setTriageData(data);
      }
    } catch (err) {
      console.error('Triage failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHunt = async () => {
    if (!huntIndicator) return;

    setLoading(true);
    try {
      // Determine indicator type
      const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(huntIndicator);
      const isHash = /^[a-f0-9]{32,64}$/i.test(huntIndicator);
      const indicatorType = isIp ? 'ip' : isHash ? 'hash' : 'domain';

      const response = await fetch('/api/velociraptor/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorType,
          indicatorValue: huntIndicator
        })
      });

      if (response.ok) {
        const data = await response.json();
        setHuntResult(data);
      }
    } catch (err) {
      console.error('Hunt creation failed:', err);
    } finally {
      setLoading(false);
      setHuntDialogOpen(false);
    }
  };

  if (!connection) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Select a connection to view Velociraptor correlation
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NetworkCheckIcon /> Velociraptor Correlation
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Connection Summary */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Network Connection
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          <Chip label={`${connection.sourceIp}:${connection.sourcePort}`} size="small" icon={<ComputerIcon />} />
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>→</Typography>
          <Chip label={`${connection.destIp}:${connection.destPort}`} size="small" />
          <Chip label={connection.protocol.toUpperCase()} size="small" color="primary" />
          {connection.service && <Chip label={connection.service} size="small" variant="outlined" />}
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
          onClick={handleCorrelate}
          disabled={loading}
        >
          Correlate to Process
        </Button>
        <Button
          variant="outlined"
          startIcon={<BugReportIcon />}
          onClick={handleTriage}
          disabled={loading || !correlation}
        >
          Quick Triage
        </Button>
        <Button
          variant="outlined"
          startIcon={<TimelineIcon />}
          onClick={() => correlation?.clientId && fetchTimeline(correlation.clientId)}
          disabled={loading || !correlation}
        >
          View Timeline
        </Button>
        <Button
          variant="outlined"
          onClick={() => setHuntDialogOpen(true)}
        >
          Create Hunt
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Correlation Failed</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Hunt Result Alert */}
      {huntResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setHuntResult(null)}>
          <AlertTitle>Hunt Created</AlertTitle>
          Hunt ID: {huntResult.huntId} - Artifact: {huntResult.artifact}
        </Alert>
      )}

      {/* Correlation Result */}
      {correlation && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              Process Correlation Found
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell><strong>Client ID</strong></TableCell>
                  <TableCell>{correlation.clientId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Hostname</strong></TableCell>
                  <TableCell>{correlation.clientName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Process ID</strong></TableCell>
                  <TableCell>{correlation.processId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Process Name</strong></TableCell>
                  <TableCell>
                    <Chip label={correlation.processName} size="small" icon={<FolderIcon />} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Process Path</strong></TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {correlation.processPath}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell>
                    <Chip label={correlation.user} size="small" icon={<PersonIcon />} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Local Port</strong></TableCell>
                  <TableCell>{correlation.localPort}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>State</strong></TableCell>
                  <TableCell>
                    <Chip
                      label={correlation.state}
                      size="small"
                      color={correlation.state === 'ESTABLISHED' ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Client Info */}
      {clientInfo && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Client Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell><strong>Hostname</strong></TableCell>
                  <TableCell>{clientInfo.hostname}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Operating System</strong></TableCell>
                  <TableCell>{clientInfo.os} {clientInfo.osVersion}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Last Seen</strong></TableCell>
                  <TableCell>{new Date(clientInfo.lastSeen).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>MAC Addresses</strong></TableCell>
                  <TableCell>
                    {clientInfo.macAddresses.map((mac, i) => (
                      <Chip key={i} label={mac} size="small" sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Labels</strong></TableCell>
                  <TableCell>
                    {clientInfo.labels.map((label, i) => (
                      <Chip key={i} label={label} size="small" color="primary" sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Agent Version</strong></TableCell>
                  <TableCell>{clientInfo.agentVersion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Process List */}
      {processes.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Running Processes ({processes.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {processes.slice(0, 20).map((proc, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${proc.name} (PID: ${proc.pid})`}
                    secondary={
                      <Typography variant="caption" component="span">
                        {proc.path} - User: {proc.user}
                        {proc.connections > 0 && ` - ${proc.connections} connections`}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {processes.length > 20 && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                  ... and {processes.length - 20} more
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Host Timeline ({timeline.length} events)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {timeline.slice(0, 50).map((event, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    {event.type === 'file' && <FolderIcon fontSize="small" />}
                    {event.type === 'process' && <ComputerIcon fontSize="small" />}
                    {event.type === 'network' && <NetworkCheckIcon fontSize="small" />}
                    {event.type === 'registry' && <WarningIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${event.action} - ${event.type}`}
                    secondary={
                      <>
                        <Typography variant="caption" component="span" display="block">
                          {new Date(event.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" component="span">
                          {event.details}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Triage Data */}
      {triageData && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Quick Triage Results</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="info" sx={{ mb: 2 }}>
              Collected essential incident response data from host
            </Alert>
            <Typography variant="body2" component="pre" sx={{
              bgcolor: 'background.default',
              p: 2,
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 400
            }}>
              {JSON.stringify(triageData, null, 2)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Hunt Creation Dialog */}
      <Dialog open={huntDialogOpen} onClose={() => setHuntDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Velociraptor Hunt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Search for an indicator across all Velociraptor clients
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Indicator (IP, Domain, or Hash)"
            fullWidth
            value={huntIndicator}
            onChange={(e) => setHuntIndicator(e.target.value)}
            placeholder="e.g., 192.168.1.100 or malicious.com or abc123..."
            helperText="Auto-detects type based on format"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHuntDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleHunt} variant="contained" disabled={!huntIndicator || loading}>
            Create Hunt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VelociraptorCorrelationPanel;
