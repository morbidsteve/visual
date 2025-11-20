import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { NetworkFilters } from '../types/network';

interface ThreatHuntingPresetsProps {
  onFilterApply: (filters: NetworkFilters) => void;
  currentFilters: NetworkFilters;
}

interface ThreatPreset {
  category: string;
  name: string;
  icon: string;
  description: string;
  filters: Partial<NetworkFilters>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitreAttack?: string;
}

const threatPresets: ThreatPreset[] = [
  // Lateral Movement
  {
    category: 'Lateral Movement',
    name: 'SMB Lateral Movement',
    icon: '🔀',
    description: 'SMB connections to multiple internal hosts (potential lateral movement)',
    filters: { protocol: 'tcp', destPort: 445, service: 'smb' },
    severity: 'high',
    mitreAttack: 'T1021.002'
  },
  {
    category: 'Lateral Movement',
    name: 'RDP Lateral Movement',
    icon: '🖥️',
    description: 'RDP connections between internal hosts',
    filters: { protocol: 'tcp', destPort: 3389 },
    severity: 'high',
    mitreAttack: 'T1021.001'
  },
  {
    category: 'Lateral Movement',
    name: 'WinRM Activity',
    icon: '⚙️',
    description: 'Windows Remote Management connections',
    filters: { protocol: 'tcp', destPort: 5985 },
    severity: 'medium',
    mitreAttack: 'T1021.006'
  },

  // Command & Control
  {
    category: 'Command & Control',
    name: 'Uncommon Ports',
    icon: '🚪',
    description: 'Connections on uncommon high ports (possible C2)',
    filters: { protocol: 'tcp', minDestPort: 49152 },
    severity: 'medium',
    mitreAttack: 'T1071'
  },
  {
    category: 'Command & Control',
    name: 'Long-Duration Connections',
    icon: '⏳',
    description: 'Connections lasting >1 hour (possible beaconing)',
    filters: { minDuration: 3600 },
    severity: 'medium',
    mitreAttack: 'T1071.001'
  },
  {
    category: 'Command & Control',
    name: 'External DNS',
    icon: '🌐',
    description: 'DNS queries to external resolvers (potential data exfil or C2)',
    filters: { protocol: 'udp', destPort: 53, external: true },
    severity: 'medium',
    mitreAttack: 'T1071.004'
  },

  // Reconnaissance
  {
    category: 'Reconnaissance',
    name: 'Port Scanning',
    icon: '🔍',
    description: 'Single source scanning multiple ports on one host',
    filters: { connState: 'REJ' },
    severity: 'high',
    mitreAttack: 'T1046'
  },
  {
    category: 'Reconnaissance',
    name: 'Network Scanning',
    icon: '📡',
    description: 'Failed connection attempts (reconnaissance activity)',
    filters: { connState: 'S0' },
    severity: 'high',
    mitreAttack: 'T1595'
  },
  {
    category: 'Reconnaissance',
    name: 'LDAP Queries',
    icon: '📚',
    description: 'LDAP directory queries (potential enumeration)',
    filters: { protocol: 'tcp', destPort: 389 },
    severity: 'low',
    mitreAttack: 'T1087.002'
  },

  // Data Exfiltration
  {
    category: 'Exfiltration',
    name: 'Large Uploads',
    icon: '📤',
    description: 'Large outbound data transfers (>100MB)',
    filters: { minOrigBytes: 104857600, external: true },
    severity: 'critical',
    mitreAttack: 'T1041'
  },
  {
    category: 'Exfiltration',
    name: 'FTP Exfiltration',
    icon: '📁',
    description: 'FTP connections to external hosts',
    filters: { protocol: 'tcp', destPort: 21, external: true },
    severity: 'high',
    mitreAttack: 'T1048.002'
  },
  {
    category: 'Exfiltration',
    name: 'Uncommon Protocols',
    icon: '❓',
    description: 'ICMP or other unusual protocols to external hosts',
    filters: { protocol: 'icmp', external: true },
    severity: 'medium',
    mitreAttack: 'T1048'
  },

  // Credential Access
  {
    category: 'Credential Access',
    name: 'Kerberos Anomalies',
    icon: '🎫',
    description: 'Unusual Kerberos activity (potential golden ticket)',
    filters: { protocol: 'tcp', destPort: 88 },
    severity: 'high',
    mitreAttack: 'T1558'
  },
  {
    category: 'Credential Access',
    name: 'NTLM Traffic',
    icon: '🔐',
    description: 'NTLM authentication attempts',
    filters: { service: 'ntlm' },
    severity: 'medium',
    mitreAttack: 'T1550.002'
  },

  // Persistence
  {
    category: 'Persistence',
    name: 'SSH From External',
    icon: '🚪',
    description: 'SSH connections from external IPs',
    filters: { protocol: 'tcp', destPort: 22, external: true },
    severity: 'critical',
    mitreAttack: 'T1021.004'
  },
  {
    category: 'Persistence',
    name: 'VNC Connections',
    icon: '🖼️',
    description: 'VNC remote desktop connections',
    filters: { protocol: 'tcp', destPort: 5900 },
    severity: 'high',
    mitreAttack: 'T1021.005'
  },

  // Exploitation
  {
    category: 'Exploitation',
    name: 'SQL Injection Attempts',
    icon: '💉',
    description: 'Database connections with unusual patterns',
    filters: { protocol: 'tcp', destPort: 3306 },
    severity: 'high',
    mitreAttack: 'T1190'
  },
  {
    category: 'Exploitation',
    name: 'Web Shells',
    icon: '🐚',
    description: 'HTTP POST to unusual endpoints',
    filters: { protocol: 'tcp', service: 'http', minOrigBytes: 1024 },
    severity: 'critical',
    mitreAttack: 'T1505.003'
  },

  // Off-Hours Activity
  {
    category: 'Anomalous Timing',
    name: 'After Hours Activity',
    icon: '🌙',
    description: 'Network activity during non-business hours',
    filters: { timeRange: 24 },
    severity: 'medium',
    mitreAttack: 'T1029'
  },

  // TOR/VPN/Proxy
  {
    category: 'Anonymization',
    name: 'TOR Connections',
    icon: '🧅',
    description: 'Connections to TOR network',
    filters: { protocol: 'tcp', destPort: 9001 },
    severity: 'high',
    mitreAttack: 'T1090.003'
  },
  {
    category: 'Anonymization',
    name: 'SOCKS Proxy',
    icon: '🔌',
    description: 'SOCKS proxy connections',
    filters: { protocol: 'tcp', destPort: 1080 },
    severity: 'high',
    mitreAttack: 'T1090.001'
  }
];

const ThreatHuntingPresets: React.FC<ThreatHuntingPresetsProps> = ({
  onFilterApply,
  currentFilters
}) => {
  const categories = Array.from(new Set(threatPresets.map(p => p.category)));

  const isPresetActive = (preset: ThreatPreset): boolean => {
    return Object.entries(preset.filters).every(([key, value]) => {
      return currentFilters[key as keyof NetworkFilters] === value;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        🎯 Threat Hunting Presets
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pre-configured filters to detect adversary tactics, techniques, and procedures (TTPs)
      </Typography>

      {categories.map(category => {
        const categoryPresets = threatPresets.filter(p => p.category === category);
        return (
          <Accordion key={category} defaultExpanded={category === 'Lateral Movement'}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" fontWeight="bold">
                {category} ({categoryPresets.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {categoryPresets.map((preset, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="caption" display="block" fontWeight="bold">
                            {preset.description}
                          </Typography>
                          {preset.mitreAttack && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              MITRE ATT&CK: {preset.mitreAttack}
                            </Typography>
                          )}
                        </Box>
                      }
                      arrow
                    >
                      <Chip
                        label={`${preset.icon} ${preset.name}`}
                        onClick={() => onFilterApply(preset.filters as NetworkFilters)}
                        color={isPresetActive(preset) ? getSeverityColor(preset.severity) : 'default'}
                        variant={isPresetActive(preset) ? 'filled' : 'outlined'}
                        sx={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: isPresetActive(preset) ? undefined : 'action.hover'
                          }
                        }}
                      />
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Paper sx={{ p: 2, mt: 2, backgroundColor: 'info.light' }}>
        <Typography variant="caption" display="block" fontWeight="bold">
          💡 Pro Tip: Combine Threat Hunting Presets
        </Typography>
        <Typography variant="caption" display="block">
          Apply a preset, then add additional filters in the sidebar to narrow down results.
          Export findings for investigation in Kibana or your SIEM.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ThreatHuntingPresets;
