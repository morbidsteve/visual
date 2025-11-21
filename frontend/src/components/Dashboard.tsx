import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  Speed,
  Computer,
  Router
} from '@mui/icons-material';
import type { ConnectionsResponse } from '../types/network';
import { formatBytes, formatNumber } from '../utils/cytoscapeConfig';

interface DashboardProps {
  data: ConnectionsResponse | null;
  loading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, loading }) => {
  if (!data) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  const stats = data.stats;
  const anomalies = data.anomalousConnections || [];
  const connections = data.connections || [];

  // Calculate additional metrics
  const totalTraffic = connections.reduce((sum, c) => sum + c.origBytes + c.respBytes, 0);
  const _avgConnectionSize = connections.length > 0 ? totalTraffic / connections.length : 0;

  // Protocol breakdown
  const protocolCounts = connections.reduce((acc, c) => {
    acc[c.protocol] = (acc[c.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // External vs Internal
  const externalConnections = connections.filter(c =>
    !isInternalIp(c.sourceIp) || !isInternalIp(c.destIp)
  ).length;
  const internalConnections = connections.length - externalConnections;

  // Top talkers
  const talkers = connections.reduce((acc, c) => {
    acc[c.sourceIp] = (acc[c.sourceIp] || 0) + c.origBytes + c.respBytes;
    return acc;
  }, {} as Record<string, number>);

  const topTalkers = Object.entries(talkers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Top destinations
  const destinations = connections.reduce((acc, c) => {
    acc[c.destIp] = (acc[c.destIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDestinations = Object.entries(destinations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Anomaly severity breakdown
  const _severityCounts = anomalies.reduce((acc, a) => {
    const severity = a.anomalies?.[0]?.severity || 'low';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Network Overview
      </Typography>

      {/* Key Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Connections"
            value={formatNumber(stats.totalConnections || 0)}
            icon={<Router />}
            color="#1976d2"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Anomalies"
            value={stats.anomalousConnections || 0}
            icon={<Warning />}
            color="#f44336"
            trend={stats.anomalousConnections && stats.anomalousConnections > 0 ? 'up' : undefined}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Unique Sources"
            value={formatNumber(stats.uniqueSources)}
            icon={<Computer />}
            color="#4caf50"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Traffic"
            value={formatBytes(totalTraffic)}
            icon={<Speed />}
            color="#ff9800"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Protocol Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Protocol Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(protocolCounts).map(([protocol, count]) => (
                <Box key={protocol} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{protocol.toUpperCase()}</Typography>
                    <Typography variant="body2">
                      {count} ({Math.round((count / connections.length) * 100)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(count / connections.length) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Internal vs External */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Connection Types
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Internal</Typography>
                  <Typography variant="body2">
                    {internalConnections} ({Math.round((internalConnections / connections.length) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(internalConnections / connections.length) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="success"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">External</Typography>
                  <Typography variant="body2">
                    {externalConnections} ({Math.round((externalConnections / connections.length) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(externalConnections / connections.length) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="warning"
                />
              </Box>

              {stats.filteredConnections && stats.filteredConnections > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Filtered (Hidden)</Typography>
                    <Typography variant="body2">
                      {stats.filteredConnections}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.filteredConnections / (connections.length + stats.filteredConnections)) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                    color="info"
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Lists Row */}
      <Grid container spacing={3}>
        {/* Top Talkers */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Top Talkers (by traffic)
            </Typography>
            <List dense>
              {topTalkers.map(([ip, bytes], idx) => (
                <ListItem key={ip}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={idx + 1} size="small" />
                        <Typography variant="body2" fontFamily="monospace">
                          {ip}
                        </Typography>
                      </Box>
                    }
                    secondary={formatBytes(bytes)}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Destinations */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Top Destinations
            </Typography>
            <List dense>
              {topDestinations.map(([ip, count], idx) => (
                <ListItem key={ip}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={idx + 1} size="small" />
                        <Typography variant="body2" fontFamily="monospace">
                          {ip}
                        </Typography>
                      </Box>
                    }
                    secondary={`${count} connections`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Anomalies */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Recent Anomalies
              {anomalies.length > 0 && (
                <Chip label={anomalies.length} size="small" color="error" />
              )}
            </Typography>

            {anomalies.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No anomalies detected
              </Typography>
            ) : (
              <List dense>
                {anomalies.slice(0, 5).map((conn, idx) => (
                  <React.Fragment key={conn.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontFamily="monospace">
                            {conn.sourceIp} → {conn.destIp}:{conn.destPort}
                          </Typography>
                        }
                        secondary={
                          <Chip
                            label={conn.anomalies?.[0]?.type || 'anomaly'}
                            size="small"
                            color={
                              conn.anomalies?.[0]?.severity === 'high' ? 'error' :
                              conn.anomalies?.[0]?.severity === 'medium' ? 'warning' : 'info'
                            }
                          />
                        }
                      />
                    </ListItem>
                    {idx < Math.min(4, anomalies.length - 1) && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down';
  loading?: boolean;
}> = ({ title, value, icon, color, trend, loading }) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {loading ? '-' : value}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.8 }}>
            {icon}
          </Box>
        </Box>
        {trend && (
          <Box sx={{ mt: 1 }}>
            <Chip
              label={trend === 'up' ? 'Increasing' : 'Decreasing'}
              size="small"
              color={trend === 'up' ? 'error' : 'success'}
              icon={<TrendingUp />}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function
const isInternalIp = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
};

export default Dashboard;
