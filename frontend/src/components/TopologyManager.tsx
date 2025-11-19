import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import RouterIcon from '@mui/icons-material/Router';
import DevicesIcon from '@mui/icons-material/Devices';
import CloudIcon from '@mui/icons-material/Cloud';

interface Subnet {
  id: string;
  cidr: string;
  name: string;
  description: string;
  type: 'internal' | 'dmz' | 'external' | 'management';
  vlan?: number;
  color?: string;
  collapsed: boolean;
  hostCount?: number;
}

interface HostGroup {
  id: string;
  name: string;
  description: string;
  type: 'servers' | 'workstations' | 'infrastructure' | 'iot' | 'custom';
  hosts: string[];
  subnet?: string;
  icon?: string;
  color?: string;
}

interface TopologyManagerProps {
  open: boolean;
  onClose: () => void;
  onTopologyUpdate?: (subnets: Subnet[], groups: HostGroup[]) => void;
}

const DEFAULT_SUBNETS: Subnet[] = [
  { id: '1', cidr: '10.0.0.0/24', name: 'Management', description: 'Network management devices', type: 'management', vlan: 10, color: '#9C27B0', collapsed: false },
  { id: '2', cidr: '10.0.1.0/24', name: 'Servers', description: 'Production servers', type: 'internal', vlan: 20, color: '#2196F3', collapsed: false },
  { id: '3', cidr: '10.0.2.0/24', name: 'Workstations', description: 'Employee workstations', type: 'internal', vlan: 30, color: '#4CAF50', collapsed: true },
  { id: '4', cidr: '192.168.1.0/24', name: 'DMZ', description: 'Public-facing services', type: 'dmz', vlan: 40, color: '#FF9800', collapsed: false }
];

const TopologyManager: React.FC<TopologyManagerProps> = ({ open, onClose, onTopologyUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [subnets, setSubnets] = useState<Subnet[]>(DEFAULT_SUBNETS);
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | null>(null);
  const [editingGroup, setEditingGroup] = useState<HostGroup | null>(null);
  const [newSubnet, setNewSubnet] = useState<Partial<Subnet>>({});
  const [newGroup, setNewGroup] = useState<Partial<HostGroup>>({});

  // Load from localStorage
  useEffect(() => {
    // Try loading from new format first
    const savedTopology = localStorage.getItem('network-visualizer-topology');

    if (savedTopology) {
      try {
        const topology = JSON.parse(savedTopology);
        if (topology.subnets) {
          // Convert from simple format back to full format
          setSubnets(topology.subnets.map((s: any, idx: number) => ({
            id: `subnet-${idx}`,
            cidr: s.cidr,
            name: s.name,
            description: '',
            type: s.type || 'internal',
            vlan: s.vlan,
            color: s.color,
            collapsed: s.collapsed || false
          })));
        }
        if (topology.hostGroups) {
          setHostGroups(topology.hostGroups.map((g: any, idx: number) => ({
            id: `group-${idx}`,
            name: g.name,
            description: '',
            hosts: g.hosts || [],
            icon: g.icon || '🖥️',
            color: g.color || '#2196F3'
          })));
        }
        return; // Don't try legacy format
      } catch (e) {
        console.error('Failed to load topology config:', e);
      }
    }

    // Fall back to legacy format
    const savedSubnets = localStorage.getItem('network-topology-subnets');
    const savedGroups = localStorage.getItem('network-topology-groups');

    if (savedSubnets) {
      try {
        setSubnets(JSON.parse(savedSubnets));
      } catch (e) {
        console.error('Failed to load subnets:', e);
      }
    }

    if (savedGroups) {
      try {
        setHostGroups(JSON.parse(savedGroups));
      } catch (e) {
        console.error('Failed to load host groups:', e);
      }
    }
  }, [open]);

  const handleSave = () => {
    // Save to localStorage in the format expected by subnet clustering
    const topologyConfig = {
      subnets: subnets.map(s => ({
        cidr: s.cidr,
        name: s.name,
        type: s.type,
        vlan: s.vlan,
        color: s.color,
        collapsed: s.collapsed || false
      })),
      hostGroups: hostGroups.map(g => ({
        name: g.name,
        hosts: g.hosts,
        icon: g.icon,
        color: g.color
      }))
    };

    localStorage.setItem('network-visualizer-topology', JSON.stringify(topologyConfig));

    // Also save to legacy keys for compatibility
    localStorage.setItem('network-topology-subnets', JSON.stringify(subnets));
    localStorage.setItem('network-topology-groups', JSON.stringify(hostGroups));

    // Dispatch storage event to notify other components
    window.dispatchEvent(new Event('storage'));

    // Notify parent
    if (onTopologyUpdate) {
      onTopologyUpdate(subnets, hostGroups);
    }

    onClose();
  };

  const addSubnet = () => {
    if (!newSubnet.cidr || !newSubnet.name) return;

    const subnet: Subnet = {
      id: Date.now().toString(),
      cidr: newSubnet.cidr,
      name: newSubnet.name,
      description: newSubnet.description || '',
      type: newSubnet.type || 'internal',
      vlan: newSubnet.vlan,
      color: newSubnet.color || '#2196F3',
      collapsed: false
    };

    setSubnets([...subnets, subnet]);
    setNewSubnet({});
  };

  const deleteSubnet = (id: string) => {
    setSubnets(subnets.filter(s => s.id !== id));
  };

  const toggleSubnetCollapse = (id: string) => {
    setSubnets(subnets.map(s =>
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    ));
  };

  const addHostGroup = () => {
    if (!newGroup.name) return;

    const group: HostGroup = {
      id: Date.now().toString(),
      name: newGroup.name,
      description: newGroup.description || '',
      type: newGroup.type || 'custom',
      hosts: [],
      subnet: newGroup.subnet,
      color: newGroup.color || '#4CAF50'
    };

    setHostGroups([...hostGroups, group]);
    setNewGroup({});
  };

  const deleteHostGroup = (id: string) => {
    setHostGroups(hostGroups.filter(g => g.id !== id));
  };

  const getSubnetTypeColor = (type: string) => {
    switch (type) {
      case 'management': return '#9C27B0';
      case 'internal': return '#2196F3';
      case 'dmz': return '#FF9800';
      case 'external': return '#F44336';
      default: return '#757575';
    }
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'servers': return '🖥️';
      case 'workstations': return '💻';
      case 'infrastructure': return '🔧';
      case 'iot': return '📱';
      default: return '📁';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouterIcon />
          <Typography variant="h6">Network Topology Manager</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Configure subnets and host groups for intelligent visualization of thousands of hosts
        </Typography>
      </DialogTitle>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Subnets" icon={<CloudIcon />} iconPosition="start" />
        <Tab label="Host Groups" icon={<DevicesIcon />} iconPosition="start" />
        <Tab label="Visualization Settings" />
      </Tabs>

      <DialogContent sx={{ minHeight: 500 }}>
        {/* Subnets Tab */}
        {activeTab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Define your network subnets. The graph will automatically cluster hosts by subnet for better visualization of large networks.
            </Alert>

            {/* Add New Subnet */}
            <Card sx={{ mb: 2, bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Add New Subnet</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    label="CIDR"
                    placeholder="10.0.0.0/24"
                    value={newSubnet.cidr || ''}
                    onChange={(e) => setNewSubnet({ ...newSubnet, cidr: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Name"
                    placeholder="Production Servers"
                    value={newSubnet.name || ''}
                    onChange={(e) => setNewSubnet({ ...newSubnet, name: e.target.value })}
                  />
                  <FormControl size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newSubnet.type || 'internal'}
                      label="Type"
                      onChange={(e) => setNewSubnet({ ...newSubnet, type: e.target.value as any })}
                    >
                      <MenuItem value="internal">Internal</MenuItem>
                      <MenuItem value="dmz">DMZ</MenuItem>
                      <MenuItem value="management">Management</MenuItem>
                      <MenuItem value="external">External</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="number"
                    label="VLAN"
                    value={newSubnet.vlan || ''}
                    onChange={(e) => setNewSubnet({ ...newSubnet, vlan: parseInt(e.target.value) })}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Description"
                    value={newSubnet.description || ''}
                    onChange={(e) => setNewSubnet({ ...newSubnet, description: e.target.value })}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addSubnet}
                    disabled={!newSubnet.cidr || !newSubnet.name}
                  >
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Existing Subnets */}
            <Typography variant="subtitle2" gutterBottom>
              Configured Subnets ({subnets.length})
            </Typography>
            <List>
              {subnets.map((subnet) => (
                <ListItem
                  key={subnet.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box sx={{ width: 10, height: 40, bgcolor: subnet.color || getSubnetTypeColor(subnet.type), borderRadius: 1, mr: 2 }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{subnet.name}</Typography>
                        <Chip label={subnet.cidr} size="small" />
                        <Chip label={subnet.type.toUpperCase()} size="small" color="primary" variant="outlined" />
                        {subnet.vlan && <Chip label={`VLAN ${subnet.vlan}`} size="small" />}
                        <Chip
                          label={subnet.collapsed ? 'Collapsed on Map' : 'Expanded on Map'}
                          size="small"
                          color={subnet.collapsed ? 'default' : 'success'}
                          onClick={() => toggleSubnetCollapse(subnet.id)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Box>
                    }
                    secondary={subnet.description}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => deleteSubnet(subnet.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Host Groups Tab */}
        {activeTab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Group hosts by function for better organization. Groups can contain specific IPs or entire subnets.
            </Alert>

            {/* Add New Group */}
            <Card sx={{ mb: 2, bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Add New Host Group</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    label="Group Name"
                    placeholder="Web Servers"
                    value={newGroup.name || ''}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  />
                  <FormControl size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newGroup.type || 'custom'}
                      label="Type"
                      onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value as any })}
                    >
                      <MenuItem value="servers">Servers</MenuItem>
                      <MenuItem value="workstations">Workstations</MenuItem>
                      <MenuItem value="infrastructure">Infrastructure</MenuItem>
                      <MenuItem value="iot">IoT Devices</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>Subnet</InputLabel>
                    <Select
                      value={newGroup.subnet || ''}
                      label="Subnet"
                      onChange={(e) => setNewGroup({ ...newGroup, subnet: e.target.value })}
                    >
                      <MenuItem value="">None</MenuItem>
                      {subnets.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.name} ({s.cidr})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Description"
                    value={newGroup.description || ''}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addHostGroup}
                    disabled={!newGroup.name}
                  >
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Existing Groups */}
            <Typography variant="subtitle2" gutterBottom>
              Configured Host Groups ({hostGroups.length})
            </Typography>
            <List>
              {hostGroups.map((group) => (
                <ListItem
                  key={group.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography variant="h6" sx={{ mr: 2 }}>{getGroupTypeIcon(group.type)}</Typography>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{group.name}</Typography>
                        <Chip label={group.type} size="small" />
                        {group.subnet && (
                          <Chip
                            label={`In ${subnets.find(s => s.id === group.subnet)?.name}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={group.description}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => deleteHostGroup(group.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Visualization Settings Tab */}
        {activeTab === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Intelligent Clustering:</strong> The graph automatically groups hosts for optimal visualization.
            </Alert>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">How Clustering Works</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  <strong>Automatic Grouping Rules:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    • <strong>1-10 hosts:</strong> Show all individual nodes
                  </ListItem>
                  <ListItem>
                    • <strong>11-100 hosts:</strong> Group by subnet (show subnet nodes)
                  </ListItem>
                  <ListItem>
                    • <strong>101-1,000 hosts:</strong> Group by subnet + collapse inactive
                  </ListItem>
                  <ListItem>
                    • <strong>1,000+ hosts:</strong> Group by subnet + show only active/anomalous
                  </ListItem>
                </List>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" paragraph>
                  <strong>Collapsed Subnets:</strong> Marked as "Collapsed on Map" will always show as single node.
                  Click the subnet node in graph view to expand and see individual hosts.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Color Coding</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#9C27B0', borderRadius: 1 }} />
                    <Typography variant="body2">Management Network</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#2196F3', borderRadius: 1 }} />
                    <Typography variant="body2">Internal Network</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#FF9800', borderRadius: 1 }} />
                    <Typography variant="body2">DMZ</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#F44336', borderRadius: 1 }} />
                    <Typography variant="body2">External/Internet</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: 1 }} />
                    <Typography variant="body2">Normal Activity</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#F44336', borderRadius: 1, border: '2px solid #000' }} />
                    <Typography variant="body2">Anomalous Activity</Typography>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Interactive Controls</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  <strong>In Graph View:</strong>
                </Typography>
                <List dense>
                  <ListItem>• <strong>Click subnet node</strong> → Expand to show individual hosts</ListItem>
                  <ListItem>• <strong>Double-click subnet</strong> → Collapse back to single node</ListItem>
                  <ListItem>• <strong>Right-click host</strong> → Quick actions (whitelist, investigate, correlate)</ListItem>
                  <ListItem>• <strong>Hover over edge</strong> → See connection details</ListItem>
                  <ListItem>• <strong>Mouse wheel</strong> → Zoom in/out</ListItem>
                  <ListItem>• <strong>Drag nodes</strong> → Rearrange layout</ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
          Save Topology
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TopologyManager;
export type { Subnet, HostGroup };
