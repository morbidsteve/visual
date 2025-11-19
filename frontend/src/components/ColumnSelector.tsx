import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { ZEEK_FIELDS, ZEEK_FIELD_CATEGORIES, getFieldsByCategory } from '../utils/zeekFields';

interface ColumnSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const DEFAULT_COLUMNS = [
  'ts',
  'id.orig_h',
  'id.orig_p',
  'id.resp_h',
  'id.resp_p',
  'proto',
  'service',
  'orig_bytes',
  'resp_bytes',
  'conn_state'
];

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  open,
  onClose,
  selectedColumns,
  onColumnsChange
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedColumns);

  useEffect(() => {
    setTempSelected(selectedColumns);
  }, [selectedColumns]);

  const handleToggle = (fieldName: string) => {
    if (tempSelected.includes(fieldName)) {
      setTempSelected(tempSelected.filter(c => c !== fieldName));
    } else {
      setTempSelected([...tempSelected, fieldName]);
    }
  };

  const handleSelectAll = () => {
    const allFields = ZEEK_FIELDS.map(f => f.name);
    setTempSelected(allFields);
  };

  const handleDeselectAll = () => {
    setTempSelected([]);
  };

  const handleResetToDefault = () => {
    setTempSelected(DEFAULT_COLUMNS);
  };

  const handleSave = () => {
    onColumnsChange(tempSelected);
    localStorage.setItem('network-visualizer-columns', JSON.stringify(tempSelected));
    onClose();
  };

  const categories = ZEEK_FIELD_CATEGORIES;
  const currentCategory = categories[activeTab];
  const categoryFields = currentCategory ? getFieldsByCategory(currentCategory.id) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Table Columns</Typography>
          <Chip
            label={`${tempSelected.length} selected`}
            color={tempSelected.length === 0 ? 'error' : 'primary'}
            size="small"
          />
        </Box>
      </DialogTitle>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
        {categories.map((cat, idx) => (
          <Tab key={cat.id} label={`${cat.icon} ${cat.name}`} />
        ))}
      </Tabs>

      <DialogContent>
        {tempSelected.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No columns selected. Table will be empty. Select at least one column.
          </Alert>
        )}

        {tempSelected.length > 20 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {tempSelected.length} columns selected. Many columns may impact performance.
          </Alert>
        )}

        <FormGroup>
          {categoryFields.map(field => (
            <FormControlLabel
              key={field.name}
              control={
                <Checkbox
                  checked={tempSelected.includes(field.name)}
                  onChange={() => handleToggle(field.name)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{field.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {field.description}
                  </Typography>
                </Box>
              }
            />
          ))}
        </FormGroup>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="small" onClick={handleDeselectAll}>
            Deselect All
          </Button>
          <Button size="small" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            Apply
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnSelector;
export { DEFAULT_COLUMNS };
