import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  LinearProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { Connection } from '../types/network';

interface TimelineViewProps {
  connections: Connection[];
  loading?: boolean;
}

interface TimeSlot {
  timestamp: Date;
  connections: Connection[];
  totalBytes: number;
  anomalyCount: number;
  uniqueSources: number;
  uniqueDestinations: number;
  protocols: Record<string, number>;
}

type GroupingInterval = '1min' | '5min' | '15min' | '1hour' | '6hour' | '1day';
type ViewMode = 'heatmap' | 'graph' | 'list';

const TimelineView: React.FC<TimelineViewProps> = ({ connections, loading }) => {
  const [grouping, setGrouping] = useState<GroupingInterval>('15min');
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const getIntervalMs = (interval: GroupingInterval): number => {
    const intervals = {
      '1min': 60 * 1000,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '6hour': 6 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000
    };
    return intervals[interval];
  };

  const timeSlots = useMemo(() => {
    if (!connections || connections.length === 0) return [];

    const intervalMs = getIntervalMs(grouping);
    const slotsMap = new Map<number, TimeSlot>();

    connections.forEach(conn => {
      const timestamp = new Date(conn.timestamp);
      const slotKey = Math.floor(timestamp.getTime() / intervalMs) * intervalMs;

      if (!slotsMap.has(slotKey)) {
        slotsMap.set(slotKey, {
          timestamp: new Date(slotKey),
          connections: [],
          totalBytes: 0,
          anomalyCount: 0,
          uniqueSources: new Set<string>() as any,
          uniqueDestinations: new Set<string>() as any,
          protocols: {}
        });
      }

      const slot = slotsMap.get(slotKey)!;
      slot.connections.push(conn);
      slot.totalBytes += conn.origBytes + conn.respBytes;
      if (conn.isAnomalous) slot.anomalyCount++;
      (slot.uniqueSources as any as Set<string>).add(conn.sourceIp);
      (slot.uniqueDestinations as any as Set<string>).add(conn.destIp);
      slot.protocols[conn.protocol] = (slot.protocols[conn.protocol] || 0) + 1;
    });

    // Convert sets to counts
    const slots = Array.from(slotsMap.values()).map(slot => ({
      ...slot,
      uniqueSources: (slot.uniqueSources as any as Set<string>).size,
      uniqueDestinations: (slot.uniqueDestinations as any as Set<string>).size
    }));

    return slots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [connections, grouping]);

  const maxBytesInSlot = useMemo(() => {
    return Math.max(...timeSlots.map(s => s.totalBytes), 1);
  }, [timeSlots]);

  const maxConnectionsInSlot = useMemo(() => {
    return Math.max(...timeSlots.map(s => s.connections.length), 1);
  }, [timeSlots]);

  const detectBeaconing = (): { isBeaconing: boolean; interval?: number; confidence: string } => {
    if (timeSlots.length < 3) return { isBeaconing: false, confidence: 'low' };

    // Calculate intervals between slots with connections
    const intervals: number[] = [];
    for (let i = 1; i < timeSlots.length; i++) {
      if (timeSlots[i].connections.length > 0 && timeSlots[i - 1].connections.length > 0) {
        intervals.push(timeSlots[i].timestamp.getTime() - timeSlots[i - 1].timestamp.getTime());
      }
    }

    if (intervals.length < 3) return { isBeaconing: false, confidence: 'low' };

    // Calculate variance
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    // Low coefficient of variation indicates regular intervals (beaconing)
    if (coefficientOfVariation < 0.2 && intervals.length >= 5) {
      return { isBeaconing: true, interval: Math.round(mean), confidence: 'high' };
    } else if (coefficientOfVariation < 0.4 && intervals.length >= 3) {
      return { isBeaconing: true, interval: Math.round(mean), confidence: 'medium' };
    }

    return { isBeaconing: false, confidence: 'low' };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beaconingDetection = useMemo(() => detectBeaconing(), [timeSlots]);

  const getSlotColor = (slot: TimeSlot): string => {
    if (slot.anomalyCount > 0) return '#f44336'; // Red for anomalies
    const intensity = slot.totalBytes / maxBytesInSlot;
    if (intensity > 0.8) return '#ff9800'; // Orange for high traffic
    if (intensity > 0.5) return '#2196f3'; // Blue for medium
    if (intensity > 0.2) return '#4caf50'; // Green for low
    return '#e0e0e0'; // Gray for minimal
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Analyzing temporal patterns...
        </Typography>
      </Box>
    );
  }

  if (connections.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No connections to display
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Timeline Analysis ({connections.length} connections)
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="heatmap">Heatmap</ToggleButton>
            <ToggleButton value="graph">Graph</ToggleButton>
            <ToggleButton value="list">List</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Grouping</InputLabel>
            <Select
              value={grouping}
              label="Time Grouping"
              onChange={(e) => setGrouping(e.target.value as GroupingInterval)}
            >
              <MenuItem value="1min">1 Minute</MenuItem>
              <MenuItem value="5min">5 Minutes</MenuItem>
              <MenuItem value="15min">15 Minutes</MenuItem>
              <MenuItem value="1hour">1 Hour</MenuItem>
              <MenuItem value="6hour">6 Hours</MenuItem>
              <MenuItem value="1day">1 Day</MenuItem>
            </Select>
          </FormControl>

          {beaconingDetection.isBeaconing && (
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              sx={{ flexGrow: 1 }}
            >
              <strong>Possible Beaconing Detected!</strong> Regular intervals (~{Math.round(beaconingDetection.interval! / 1000)}s) with {beaconingDetection.confidence} confidence
            </Alert>
          )}
        </Box>
      </Box>

      {/* Timeline Heatmap */}
      {viewMode === 'heatmap' && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {timeSlots.map((slot, idx) => (
              <Tooltip
                key={idx}
                title={
                  <Box>
                    <Typography variant="caption" display="block" fontWeight="bold">
                      {formatDate(slot.timestamp)} {formatTime(slot.timestamp)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Connections: {slot.connections.length}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Traffic: {formatBytes(slot.totalBytes)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Sources: {slot.uniqueSources} | Dests: {slot.uniqueDestinations}
                    </Typography>
                    {slot.anomalyCount > 0 && (
                      <Typography variant="caption" display="block" color="error">
                        ⚠️ {slot.anomalyCount} anomalies
                      </Typography>
                    )}
                  </Box>
                }
                arrow
              >
                <Box
                  onClick={() => setSelectedSlot(slot)}
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: getSlotColor(slot),
                    cursor: 'pointer',
                    borderRadius: 1,
                    border: selectedSlot === slot ? '2px solid black' : 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      zIndex: 1
                    }
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="Anomalies" sx={{ bgcolor: '#f44336', color: 'white' }} size="small" />
            <Chip label="High Traffic" sx={{ bgcolor: '#ff9800', color: 'white' }} size="small" />
            <Chip label="Medium Traffic" sx={{ bgcolor: '#2196f3', color: 'white' }} size="small" />
            <Chip label="Low Traffic" sx={{ bgcolor: '#4caf50', color: 'white' }} size="small" />
            <Chip label="Minimal" sx={{ bgcolor: '#e0e0e0' }} size="small" />
          </Box>

          {/* Selected Slot Details */}
          {selectedSlot && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                {formatDate(selectedSlot.timestamp)} {formatTime(selectedSlot.timestamp)} - Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Connections</Typography>
                  <Typography variant="h6">{selectedSlot.connections.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Traffic</Typography>
                  <Typography variant="h6">{formatBytes(selectedSlot.totalBytes)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Anomalies</Typography>
                  <Typography variant="h6" color={selectedSlot.anomalyCount > 0 ? 'error' : 'inherit'}>
                    {selectedSlot.anomalyCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Unique Sources</Typography>
                  <Typography variant="h6">{selectedSlot.uniqueSources}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Unique Destinations</Typography>
                  <Typography variant="h6">{selectedSlot.uniqueDestinations}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Protocols</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(selectedSlot.protocols).map(([proto, count]) => (
                      <Chip key={proto} label={`${proto.toUpperCase()}: ${count}`} size="small" />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* Graph View */}
      {viewMode === 'graph' && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <svg width="100%" height="400">
            {/* X-axis */}
            <line x1="50" y1="350" x2="95%" y2="350" stroke="#999" strokeWidth="2" />

            {/* Y-axis */}
            <line x1="50" y1="50" x2="50" y2="350" stroke="#999" strokeWidth="2" />

            {/* Data points */}
            {timeSlots.map((slot, idx) => {
              const x = 50 + ((idx / timeSlots.length) * 90) + '%';
              const normalizedHeight = (slot.connections.length / maxConnectionsInSlot) * 280;
              const y = 350 - normalizedHeight;

              return (
                <g key={idx}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width="10"
                    height={normalizedHeight}
                    fill={slot.anomalyCount > 0 ? '#f44336' : '#2196f3'}
                    opacity="0.8"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedSlot(slot)}
                  />
                  {/* Anomaly marker */}
                  {slot.anomalyCount > 0 && (
                    <circle cx={`calc(${x} + 5px)`} cy={y - 5} r="4" fill="#f44336" />
                  )}
                </g>
              );
            })}

            {/* Y-axis label */}
            <text x="10" y="200" transform="rotate(-90 10 200)" fontSize="12" fill="#666">
              Connections
            </text>

            {/* X-axis label */}
            <text x="50%" y="380" textAnchor="middle" fontSize="12" fill="#666">
              Time
            </text>
          </svg>
        </Box>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {timeSlots.map((slot, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                m: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                borderLeft: slot.anomalyCount > 0 ? '4px solid #f44336' : 'none'
              }}
              onClick={() => setSelectedSlot(slot)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {formatDate(slot.timestamp)} {formatTime(slot.timestamp)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {slot.connections.length} connections • {formatBytes(slot.totalBytes)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {slot.anomalyCount > 0 && (
                    <Chip
                      icon={<WarningIcon />}
                      label={`${slot.anomalyCount} anomalies`}
                      color="error"
                      size="small"
                    />
                  )}
                  <Chip
                    label={`${slot.uniqueSources} sources`}
                    size="small"
                    variant="outlined"
                  />
                  {slot.totalBytes > maxBytesInSlot * 0.8 && (
                    <TrendingUpIcon color="error" />
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default TimelineView;
