import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkApi, whitelistApi } from '../services/api';
import type { WhitelistEntry, Baseline } from '../types/network';

const BaselineManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WhitelistEntry | null>(null);
  const [lookbackDays, setLookbackDays] = useState(7);

  // Fetch whitelisted entries
  const { data: whitelistedEntries = [] } = useQuery({
    queryKey: ['whitelist'],
    queryFn: () => whitelistApi.getAll()
  });

  // Generate baseline mutation
  const generateBaseline = useMutation({
    mutationFn: ({ entityValue, entityType, lookbackDays }: {
      entityValue: string;
      entityType: 'ip' | 'subnet';
      lookbackDays: number;
    }) => networkApi.generateBaseline(entityValue, entityType, lookbackDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
      setDialogOpen(false);
      setSelectedEntry(null);
    }
  });

  // Delete baseline mutation
  const deleteBaseline = useMutation({
    mutationFn: ({ entityValue, entityType }: {
      entityValue: string;
      entityType: 'ip' | 'subnet';
    }) => networkApi.deleteBaseline(entityValue, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
    }
  });

  const handleGenerateBaseline = (entry: WhitelistEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  const handleConfirmGenerate = () => {
    if (!selectedEntry) return;

    const entityType = selectedEntry.entry_type === 'subnet' ? 'subnet' : 'ip';
    generateBaseline.mutate({
      entityValue: selectedEntry.value,
      entityType,
      lookbackDays
    });
  };

  const handleDeleteBaseline = (entry: WhitelistEntry) => {
    if (window.confirm(`Delete baseline for ${entry.value}?`)) {
      const entityType = entry.entry_type === 'subnet' ? 'subnet' : 'ip';
      deleteBaseline.mutate({
        entityValue: entry.value,
        entityType
      });
    }
  };

  // Filter to only IP and subnet entries
  const eligibleEntries = whitelistedEntries.filter(
    e => e.entry_type === 'ip' || e.entry_type === 'subnet'
  );

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Baseline Management</Typography>
        <Typography variant="caption" color="text.secondary">
          {eligibleEntries.length} eligible entities
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Baselines track normal behavior for whitelisted entities. Anomalies are flagged when new patterns are detected.
        </Alert>

        {eligibleEntries.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No whitelisted IPs or subnets yet. Add entities to the whitelist first.
          </Typography>
        ) : (
          <List>
            {eligibleEntries.map((entry) => (
              <BaselineEntryItem
                key={entry.id}
                entry={entry}
                onGenerate={() => handleGenerateBaseline(entry)}
                onDelete={() => handleDeleteBaseline(entry)}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Generate Baseline Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Baseline</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Entity"
              value={selectedEntry?.value || ''}
              disabled
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Lookback Period</InputLabel>
              <Select
                value={lookbackDays}
                label="Lookback Period"
                onChange={(e) => setLookbackDays(e.target.value as number)}
              >
                <MenuItem value={1}>1 Day</MenuItem>
                <MenuItem value={3}>3 Days</MenuItem>
                <MenuItem value={7}>7 Days (Recommended)</MenuItem>
                <MenuItem value={14}>14 Days</MenuItem>
                <MenuItem value={30}>30 Days</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="warning">
              Generating baselines for large time windows may take some time. The baseline will capture normal connection patterns, ports, protocols, and traffic volumes.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmGenerate}
            variant="contained"
            disabled={generateBaseline.isPending}
            startIcon={generateBaseline.isPending ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const BaselineEntryItem: React.FC<{
  entry: WhitelistEntry;
  onGenerate: () => void;
  onDelete: () => void;
}> = ({ entry, onGenerate, onDelete }) => {
  const entityType = entry.entry_type === 'subnet' ? 'subnet' : 'ip';

  // Fetch baseline for this entry
  const { data: baseline, isLoading, refetch } = useQuery<Baseline>({
    queryKey: ['baseline', entry.value, entityType],
    queryFn: () => networkApi.getBaseline(entry.value, entityType === 'subnet', 7, false),
    retry: false
  });

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Chip
            label={entry.entry_type}
            size="small"
            color={entry.entry_type === 'ip' ? 'primary' : 'secondary'}
          />
          <Typography variant="body1" fontWeight="bold" sx={{ flex: 1 }}>
            {entry.value}
          </Typography>
          {baseline && (
            <Chip label="Baseline Active" size="small" color="success" variant="outlined" />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : baseline ? (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Generated: {new Date(baseline.generated_at).toLocaleString()}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
              Lookback: {baseline.lookback_days} days
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Common Destinations
                </Typography>
                <Typography variant="body2">
                  {baseline.baseline_data.commonDestinations.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Common Ports
                </Typography>
                <Typography variant="body2">
                  {baseline.baseline_data.commonPorts.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Connection Patterns
                </Typography>
                <Typography variant="body2">
                  {baseline.baseline_data.connectionPatterns.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Protocols
                </Typography>
                <Typography variant="body2">
                  {baseline.baseline_data.commonProtocols.map(p => p.protocol).join(', ')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
              >
                Regenerate
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onDelete}
              >
                Delete
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No baseline generated yet
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onGenerate}
            >
              Generate Baseline
            </Button>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default BaselineManager;
