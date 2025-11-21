import React, { useState, useEffect } from 'react';
import {
  Box,
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  LinearProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface MemoryMonitorProps {
  connectionCount: number;
  onClearRequested?: () => void;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const MemoryMonitor: React.FC<MemoryMonitorProps> = ({ connectionCount, onClearRequested }) => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    // Check if performance.memory is available (Chrome/Edge only)
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });

        // Show warning if memory usage is above 80%
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80 && !warningDismissed) {
          setShowWarning(true);
        }
      }
    };

    // Check memory every 10 seconds
    checkMemory();
    const interval = setInterval(checkMemory, 10000);

    return () => clearInterval(interval);
  }, [warningDismissed]);

  // Reset warning dismissal when connection count changes significantly
  const connectionCountThousands = Math.floor(connectionCount / 1000);
  useEffect(() => {
    setWarningDismissed(false);
  }, [connectionCountThousands]);

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getMemoryUsagePercent = (): number => {
    if (!memoryInfo) return 0;
    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  };

  const getEstimatedConnectionMemory = (): string => {
    // Rough estimate: ~2KB per connection (includes JS object overhead)
    const estimatedBytes = connectionCount * 2048;
    return formatBytes(estimatedBytes);
  };

  const getSeverity = (): 'info' | 'warning' | 'error' => {
    const percent = getMemoryUsagePercent();
    if (percent > 90) return 'error';
    if (percent > 80) return 'warning';
    return 'info';
  };

  const handleClear = () => {
    if (onClearRequested) {
      onClearRequested();
    }
    setShowWarning(false);
    setWarningDismissed(true);
    setShowDetailsDialog(false);
  };

  const getRecommendations = (): string[] => {
    const recommendations = [];
    const percent = getMemoryUsagePercent();

    if (connectionCount > 50000) {
      recommendations.push('Consider reducing the time range or adding more specific filters');
    }

    if (percent > 80) {
      recommendations.push('Clear old data or export connections and reset the view');
    }

    if (connectionCount > 10000 && !localStorage.getItem('network-visualizer-saved-filters')) {
      recommendations.push('Use Quick Filters or save custom filters to reduce data load');
    }

    if (percent > 90) {
      recommendations.push('URGENT: Memory critically high. Clear data immediately to prevent browser crash');
    }

    return recommendations;
  };

  if (!memoryInfo) {
    return null; // Memory API not available
  }

  return (
    <>
      {/* Warning Snackbar */}
      <Snackbar
        open={showWarning && !warningDismissed}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mb: 2, mr: 2 }}
      >
        <Alert
          severity={getSeverity()}
          icon={<WarningIcon />}
          onClose={() => {
            setShowWarning(false);
            setWarningDismissed(true);
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="inherit" onClick={() => setShowDetailsDialog(true)}>
                Details
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={handleClear}
                startIcon={<DeleteSweepIcon />}
              >
                Clear
              </Button>
            </Box>
          }
        >
          <AlertTitle>High Memory Usage</AlertTitle>
          Memory usage is at {getMemoryUsagePercent().toFixed(1)}% with {connectionCount.toLocaleString()} connections loaded.
          Consider reducing filters or clearing old data.
        </Alert>
      </Snackbar>

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color={getSeverity()} />
            Memory Usage Details
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Browser Memory
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(getMemoryUsagePercent(), 100)}
              color={getSeverity()}
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {formatBytes(memoryInfo.usedJSHeapSize)} / {formatBytes(memoryInfo.jsHeapSizeLimit)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getMemoryUsagePercent().toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Load
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Connections Loaded"
                  secondary={connectionCount.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Estimated Memory"
                  secondary={getEstimatedConnectionMemory()}
                />
              </ListItem>
            </List>
          </Box>

          {getRecommendations().length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations
              </Typography>
              <List dense>
                {getRecommendations().map((rec, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={rec}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: rec.includes('URGENT') ? 'error' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>
            Close
          </Button>
          {onClearRequested && (
            <Button
              onClick={handleClear}
              variant="contained"
              color={getSeverity()}
              startIcon={<DeleteSweepIcon />}
            >
              Clear Data
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemoryMonitor;
