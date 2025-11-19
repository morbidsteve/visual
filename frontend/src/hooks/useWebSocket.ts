import { useState, useEffect, useRef, useCallback } from 'react';
import type { Connection } from '../types/network';

interface WebSocketMessage {
  type: 'connected' | 'new_connections' | 'anomaly_alert' | 'stats_update' | 'error';
  message?: string;
  connections?: Connection[];
  anomalies?: Connection[];
  anomalousCount?: number;
  count?: number;
  stats?: any;
  timestamp: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  newConnections: Connection[];
  anomalies: Connection[];
  lastUpdate: string | null;
  connectionCount: number;
  error: string | null;
  clearNewConnections: () => void;
  clearAnomalies: () => void;
}

export const useWebSocket = (url: string = 'ws://localhost:3001/ws'): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [newConnections, setNewConnections] = useState<Connection[]>([]);
  const [anomalies, setAnomalies] = useState<Connection[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    try {
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('WebSocket connection confirmed:', message.message);
              break;

            case 'new_connections':
              if (message.connections && message.connections.length > 0) {
                setNewConnections(prev => {
                  // Keep only last 100 new connections to prevent memory buildup
                  const updated = [...message.connections!, ...prev].slice(0, 100);
                  return updated;
                });
                setConnectionCount(message.connections.length);
                setLastUpdate(message.timestamp);
              }
              break;

            case 'anomaly_alert':
              if (message.anomalies && message.anomalies.length > 0) {
                setAnomalies(prev => {
                  // Keep only last 50 anomalies
                  const updated = [...message.anomalies!, ...prev].slice(0, 50);
                  return updated;
                });
              }
              break;

            case 'stats_update':
              // Stats update - could be used to update dashboard in real-time
              console.log('Stats update:', message.stats);
              break;

            case 'error':
              console.error('WebSocket error message:', message.message);
              setError(message.message || 'Unknown error');
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const clearNewConnections = useCallback(() => {
    setNewConnections([]);
    setConnectionCount(0);
  }, []);

  const clearAnomalies = useCallback(() => {
    setAnomalies([]);
  }, []);

  return {
    connected,
    newConnections,
    anomalies,
    lastUpdate,
    connectionCount,
    error,
    clearNewConnections,
    clearAnomalies
  };
};
