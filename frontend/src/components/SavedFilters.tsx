import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import type { NetworkFilters } from '../types/network';

interface SavedFiltersProps {
  open: boolean;
  onClose: () => void;
  currentFilters: NetworkFilters;
  onLoadFilter: (filters: NetworkFilters) => void;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: NetworkFilters;
  createdAt: string;
}

const SavedFilters: React.FC<SavedFiltersProps> = ({
  open,
  onClose,
  currentFilters,
  onLoadFilter
}) => {
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem('network-visualizer-saved-filters');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSave = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: currentFilters,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('network-visualizer-saved-filters', JSON.stringify(updated));
    setFilterName('');
  };

  const handleDelete = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('network-visualizer-saved-filters', JSON.stringify(updated));
  };

  const handleLoad = (filter: SavedFilter) => {
    onLoadFilter(filter.filters);
    onClose();
  };

  const getFilterSummary = (filters: NetworkFilters): string => {
    const parts = [];
    if (filters.timeRange) parts.push(`${filters.timeRange}h`);
    if (filters.protocol) parts.push(filters.protocol.toUpperCase());
    if (filters.destPort) parts.push(`:${filters.destPort}`);
    if (filters.service) parts.push(filters.service);
    if (filters.minBytes) parts.push(`>${filters.minBytes}B`);
    if (filters.hideWhitelisted) parts.push('No Whitelist');

    return parts.join(' | ') || 'All traffic';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Saved Filters</DialogTitle>
      <DialogContent>
        {/* Save Current Filter */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Save Current Filter
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!filterName.trim()}
            >
              Save
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Current: {getFilterSummary(currentFilters)}
          </Typography>
        </Box>

        {/* Saved Filters List */}
        {savedFilters.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
            No saved filters yet
          </Typography>
        ) : (
          <List>
            {savedFilters.map((filter) => (
              <ListItem
                key={filter.id}
                button
                onClick={() => handleLoad(filter)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={filter.name}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {getFilterSummary(filter.filters).split(' | ').map((part, idx) => (
                        <Chip key={idx} label={part} size="small" variant="outlined" />
                      ))}
                      <Chip
                        label={new Date(filter.createdAt).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(filter.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavedFilters;
