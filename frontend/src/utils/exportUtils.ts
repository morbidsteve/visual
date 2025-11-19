import type { Connection } from '../types/network';

export const exportToCSV = (connections: Connection[], filename: string = 'connections.csv') => {
  // Define CSV headers
  const headers = [
    'Timestamp',
    'Source IP',
    'Source Port',
    'Dest IP',
    'Dest Port',
    'Protocol',
    'Service',
    'Orig Bytes',
    'Resp Bytes',
    'Total Bytes',
    'Orig Packets',
    'Resp Packets',
    'Duration',
    'Connection State',
    'Local Orig',
    'Local Resp',
    'History',
    'Is Anomalous',
    'Anomaly Types',
    'Anomaly Count'
  ];

  // Convert connections to CSV rows
  const rows = connections.map(conn => [
    new Date(conn.timestamp).toISOString(),
    conn.sourceIp,
    conn.sourcePort,
    conn.destIp,
    conn.destPort,
    conn.protocol,
    conn.service || '',
    conn.origBytes,
    conn.respBytes,
    conn.origBytes + conn.respBytes,
    conn.origPackets || 0,
    conn.respPackets || 0,
    conn.duration || 0,
    conn.connState || '',
    conn.localOrig || false,
    conn.localResp || false,
    conn.history || '',
    conn.isAnomalous || false,
    conn.anomalies?.map(a => a.type).join('; ') || '',
    conn.anomalies?.length || 0
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ].join('\n');

  // Trigger download
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportToJSON = (connections: Connection[], filename: string = 'connections.json', prettify: boolean = true) => {
  const jsonContent = prettify
    ? JSON.stringify(connections, null, 2)
    : JSON.stringify(connections);

  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
};

export const exportAnomaliesOnly = (connections: Connection[], format: 'csv' | 'json' = 'csv') => {
  const anomalousConnections = connections.filter(conn => conn.isAnomalous);

  if (format === 'csv') {
    exportToCSV(anomalousConnections, 'anomalous-connections.csv');
  } else {
    exportToJSON(anomalousConnections, 'anomalous-connections.json');
  }
};

export const exportSummary = (connections: Connection[]) => {
  const summary = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalConnections: connections.length,
      anomalousConnections: connections.filter(c => c.isAnomalous).length
    },
    statistics: {
      protocols: getProtocolBreakdown(connections),
      topSources: getTopSources(connections, 10),
      topDestinations: getTopDestinations(connections, 10),
      totalBytes: connections.reduce((sum, c) => sum + c.origBytes + c.respBytes, 0),
      averageBytes: connections.length > 0
        ? connections.reduce((sum, c) => sum + c.origBytes + c.respBytes, 0) / connections.length
        : 0
    },
    connections
  };

  exportToJSON(summary, 'connections-summary.json');
};

// Helper functions
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const getProtocolBreakdown = (connections: Connection[]) => {
  return connections.reduce((acc, conn) => {
    acc[conn.protocol] = (acc[conn.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

const getTopSources = (connections: Connection[], limit: number) => {
  const sources = connections.reduce((acc, conn) => {
    acc[conn.sourceIp] = (acc[conn.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(sources)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }));
};

const getTopDestinations = (connections: Connection[], limit: number) => {
  const destinations = connections.reduce((acc, conn) => {
    acc[conn.destIp] = (acc[conn.destIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(destinations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }));
};
