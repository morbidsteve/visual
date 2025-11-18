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
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useWhitelist, useAddToWhitelist, useRemoveFromWhitelist } from '../hooks/useNetworkData';
import type { WhitelistEntry } from '../types/network';

const WhitelistManager: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    entryType: WhitelistEntry['entry_type'];
    value: string;
    description: string;
  }>({
    entryType: 'ip',
    value: '',
    description: ''
  });

  const { data: whitelist = [], isLoading } = useWhitelist();
  const addToWhitelist = useAddToWhitelist();
  const removeFromWhitelist = useRemoveFromWhitelist();

  const handleAdd = async () => {
    if (!newEntry.value) return;

    try {
      await addToWhitelist.mutateAsync(newEntry);
      setDialogOpen(false);
      setNewEntry({ entryType: 'ip', value: '', description: '' });
    } catch (error) {
      console.error('Failed to add to whitelist:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this entry from the whitelist?')) {
      await removeFromWhitelist.mutateAsync(id);
    }
  };

  const getEntryTypeColor = (type: string) => {
    const colors: Record<string, any> = {
      ip: 'primary',
      subnet: 'secondary',
      connection: 'success',
      protocol: 'warning'
    };
    return colors[type] || 'default';
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Whitelist Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          size="small"
        >
          Add Entry
        </Button>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : whitelist.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No whitelist entries yet. Add entries to filter out known-good traffic.
          </Typography>
        ) : (
          <List>
            {whitelist.map((entry) => (
              <ListItem key={entry.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={entry.entry_type}
                        size="small"
                        color={getEntryTypeColor(entry.entry_type)}
                      />
                      <Typography variant="body1" fontWeight="bold">
                        {entry.value}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      {entry.description && (
                        <Typography variant="body2" color="text.secondary">
                          {entry.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Added: {new Date(entry.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(entry.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Whitelist Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Entry Type</InputLabel>
              <Select
                value={newEntry.entryType}
                label="Entry Type"
                onChange={(e) =>
                  setNewEntry({ ...newEntry, entryType: e.target.value as WhitelistEntry['entry_type'] })
                }
              >
                <MenuItem value="ip">IP Address</MenuItem>
                <MenuItem value="subnet">Subnet</MenuItem>
                <MenuItem value="connection">Connection</MenuItem>
                <MenuItem value="protocol">Protocol</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Value"
              fullWidth
              value={newEntry.value}
              onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              placeholder={
                newEntry.entryType === 'ip'
                  ? '192.168.1.100'
                  : newEntry.entryType === 'subnet'
                  ? '192.168.1.0/24'
                  : newEntry.entryType === 'connection'
                  ? '192.168.1.100->10.0.0.50:443'
                  : 'tcp'
              }
              helperText={
                newEntry.entryType === 'connection'
                  ? 'Format: source_ip->dest_ip:port'
                  : undefined
              }
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              placeholder="Optional description"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!newEntry.value || addToWhitelist.isPending}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default WhitelistManager;
