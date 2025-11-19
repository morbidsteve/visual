import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearIcon from '@mui/icons-material/Clear';
import { ZEEK_FIELDS, ZEEK_FIELD_CATEGORIES, CONN_STATES, SERVICES, PROTOCOLS, getFieldsByCategory } from '../utils/zeekFields';
import type { NetworkFilters } from '../types/network';

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string | number;
  valueType: 'string' | 'number' | 'boolean' | 'ip' | 'port';
}

interface AdvancedFilterBuilderProps {
  onApplyFilters: (filters: NetworkFilters) => void;
  currentFilters: NetworkFilters;
}

const OPERATORS = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'notEquals', label: 'Not Equals' }
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'notEquals', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'between', label: 'Between' }
  ],
  boolean: [
    { value: 'equals', label: 'Is' }
  ],
  ip: [
    { value: 'equals', label: 'Equals' },
    { value: 'subnet', label: 'In Subnet' },
    { value: 'notEquals', label: 'Not Equals' }
  ],
  port: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'between', label: 'Between' }
  ]
};

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({ onApplyFilters, currentFilters }) => {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('network');

  const addRule = (fieldName?: string) => {
    const field = fieldName ? ZEEK_FIELDS.find(f => f.name === fieldName) : ZEEK_FIELDS[0];
    if (!field) return;

    const newRule: FilterRule = {
      id: `rule-${Date.now()}-${Math.random()}`,
      field: field.name,
      operator: OPERATORS[field.type][0].value,
      value: '',
      valueType: field.type
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const clearAllRules = () => {
    setRules([]);
  };

  const applyFilters = () => {
    const filters: any = { ...currentFilters };

    rules.forEach(rule => {
      const field = ZEEK_FIELDS.find(f => f.name === rule.field);
      if (!field || !rule.value) return;

      // Map Zeek field names to NetworkFilters properties
      switch (rule.field) {
        case 'id.orig_h':
          filters.sourceIp = rule.value;
          break;
        case 'id.resp_h':
          filters.destIp = rule.value;
          break;
        case 'id.resp_p':
          if (rule.operator === 'equals') {
            filters.destPort = Number(rule.value);
          } else if (rule.operator === 'gt') {
            filters.minDestPort = Number(rule.value);
          } else if (rule.operator === 'lt') {
            filters.maxDestPort = Number(rule.value);
          }
          break;
        case 'proto':
          filters.protocol = rule.value as string;
          break;
        case 'service':
          filters.service = rule.value as string;
          break;
        case 'conn_state':
          filters.connState = rule.value as string;
          break;
        case 'duration':
          if (rule.operator === 'gte') {
            filters.minDuration = Number(rule.value);
          } else if (rule.operator === 'lte') {
            filters.maxDuration = Number(rule.value);
          }
          break;
        case 'orig_bytes':
          if (rule.operator === 'gte') {
            filters.minOrigBytes = Number(rule.value);
          } else if (rule.operator === 'lte') {
            filters.maxOrigBytes = Number(rule.value);
          }
          break;
        case 'resp_bytes':
          if (rule.operator === 'gte') {
            filters.minRespBytes = Number(rule.value);
          } else if (rule.operator === 'lte') {
            filters.maxRespBytes = Number(rule.value);
          }
          break;
        case 'local_orig':
          filters.internal = rule.value === 'true';
          break;
        case 'local_resp':
          filters.external = rule.value === 'false';
          break;
      }
    });

    onApplyFilters(filters as NetworkFilters);
  };

  const getOperatorsForField = (fieldName: string) => {
    const field = ZEEK_FIELDS.find(f => f.name === fieldName);
    if (!field) return OPERATORS.string;
    return OPERATORS[field.type] || OPERATORS.string;
  };

  const renderValueInput = (rule: FilterRule) => {
    const field = ZEEK_FIELDS.find(f => f.name === rule.field);
    if (!field) return null;

    // Special inputs for specific fields
    if (rule.field === 'proto') {
      return (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
          >
            {PROTOCOLS.map(proto => (
              <MenuItem key={proto} value={proto}>{proto.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (rule.field === 'service') {
      return (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
          >
            {SERVICES.map(service => (
              <MenuItem key={service} value={service}>{service}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (rule.field === 'conn_state') {
      return (
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <Select
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
          >
            {CONN_STATES.map(state => (
              <MenuItem key={state.value} value={state.value}>
                <Tooltip title={state.description} arrow>
                  <span>{state.label}</span>
                </Tooltip>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (field.type === 'boolean') {
      return (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
          >
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Default text/number input
    return (
      <TextField
        size="small"
        type={field.type === 'number' || field.type === 'port' ? 'number' : 'text'}
        value={rule.value}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
        placeholder={`Enter ${field.displayName.toLowerCase()}`}
        sx={{ minWidth: 200 }}
      />
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Advanced Filter Builder</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearAllRules}
            disabled={rules.length === 0}
          >
            Clear All
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={applyFilters}
            disabled={rules.length === 0}
          >
            Apply Filters
          </Button>
        </Box>
      </Box>

      {/* Current Rules */}
      {rules.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Rules ({rules.length})
          </Typography>
          {rules.map((rule) => {
            const field = ZEEK_FIELDS.find(f => f.name === rule.field);
            const operator = getOperatorsForField(rule.field).find(o => o.value === rule.operator);

            return (
              <Box
                key={rule.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  p: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}
              >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Field</InputLabel>
                  <Select
                    value={rule.field}
                    label="Field"
                    onChange={(e) => {
                      const newField = ZEEK_FIELDS.find(f => f.name === e.target.value);
                      if (newField) {
                        updateRule(rule.id, {
                          field: newField.name,
                          valueType: newField.type,
                          operator: OPERATORS[newField.type][0].value,
                          value: ''
                        });
                      }
                    }}
                  >
                    {ZEEK_FIELDS.filter(f => f.filterable).map(f => (
                      <MenuItem key={f.name} value={f.name}>{f.displayName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={rule.operator}
                    label="Operator"
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                  >
                    {getOperatorsForField(rule.field).map(op => (
                      <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {renderValueInput(rule)}

                <IconButton
                  size="small"
                  onClick={() => removeRule(rule.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Field Categories */}
      <Typography variant="subtitle2" gutterBottom>
        Add Filter by Category
      </Typography>
      {ZEEK_FIELD_CATEGORIES.map(category => {
        const categoryFields = getFieldsByCategory(category.id).filter(f => f.filterable);
        if (categoryFields.length === 0) return null;

        return (
          <Accordion key={category.id} defaultExpanded={category.id === 'network'}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {category.icon} {category.name} ({categoryFields.length} fields)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {categoryFields.map(field => (
                  <Tooltip key={field.name} title={field.description} arrow>
                    <Chip
                      label={field.displayName}
                      size="small"
                      onClick={() => addRule(field.name)}
                      icon={<AddIcon />}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Paper>
  );
};

export default AdvancedFilterBuilder;
