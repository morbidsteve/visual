const axios = require('axios');

/**
 * Velociraptor Integration Service
 * Correlates network connections with endpoint data (processes, files, registry, etc.)
 */
class VelociraptorService {
  constructor() {
    this.baseUrl = process.env.VELOCIRAPTOR_URL || 'https://localhost:8000';
    this.apiKey = process.env.VELOCIRAPTOR_API_KEY || '';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      console.warn('Velociraptor integration disabled: No API key configured');
    }
  }

  /**
   * Get axios instance with auth
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      // In production, configure SSL properly
      httpsAgent: process.env.NODE_ENV === 'development' ? new (require('https').Agent)({
        rejectUnauthorized: false
      }) : undefined
    });
  }

  /**
   * Search for client by IP address
   */
  async findClientByIP(ipAddress) {
    if (!this.enabled) return null;

    try {
      const client = this.getClient();

      // Search clients by last IP
      const response = await client.post('/api/v1/SearchClients', {
        query: `host.last_ip =~ "${ipAddress}"`,
        limit: 10
      });

      if (response.data && response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      }

      return null;
    } catch (error) {
      console.error(`Error finding Velociraptor client for IP ${ipAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Get process list for a client
   */
  async getProcessList(clientId) {
    if (!this.enabled) return [];

    try {
      const client = this.getClient();

      // Collect Windows.System.Pslist artifact
      const response = await client.post('/api/v1/CollectArtifact', {
        client_id: clientId,
        artifacts: ['Windows.System.Pslist'],
        specs: [{
          artifact: 'Windows.System.Pslist'
        }]
      });

      const flowId = response.data.flow_id;

      // Wait for collection to complete (simplified - in production use polling)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get results
      const resultsResponse = await client.get(`/api/v1/GetFlowResults/${clientId}/${flowId}/Windows.System.Pslist`);

      return resultsResponse.data.rows || [];
    } catch (error) {
      console.error(`Error getting process list for client ${clientId}:`, error.message);
      return [];
    }
  }

  /**
   * Correlate network connection to process
   * Returns the process that likely made the connection
   */
  async correlateConnectionToProcess(sourceIp, destIp, destPort, timestamp) {
    if (!this.enabled) return null;

    try {
      // Find client for source IP
      const client = await this.findClientByIP(sourceIp);
      if (!client) {
        return { error: 'No Velociraptor client found for this IP' };
      }

      // Get network connections from client at that time
      const velociClient = this.getClient();
      const response = await velociClient.post('/api/v1/CollectArtifact', {
        client_id: client.client_id,
        artifacts: ['Windows.Network.Netstat'],
        specs: [{
          artifact: 'Windows.Network.Netstat'
        }]
      });

      const flowId = response.data.flow_id;

      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get results
      const resultsResponse = await velociClient.get(
        `/api/v1/GetFlowResults/${client.client_id}/${flowId}/Windows.Network.Netstat`
      );

      const connections = resultsResponse.data.rows || [];

      // Find matching connection
      const match = connections.find(conn =>
        conn.RemoteAddr === destIp &&
        conn.RemotePort === destPort
      );

      if (match) {
        return {
          clientId: client.client_id,
          clientName: client.os_info?.hostname,
          processId: match.Pid,
          processName: match.Name,
          processPath: match.Path,
          user: match.Username,
          localPort: match.LocalPort,
          state: match.State,
          timestamp: match.Timestamp
        };
      }

      return { error: 'No matching connection found in Velociraptor data' };
    } catch (error) {
      console.error('Error correlating connection to process:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get file details for a process
   */
  async getProcessFileDetails(clientId, processPath) {
    if (!this.enabled) return null;

    try {
      const client = this.getClient();

      // Collect file metadata
      const response = await client.post('/api/v1/CollectArtifact', {
        client_id: clientId,
        artifacts: ['Windows.Analysis.EvidenceOfExecution'],
        specs: [{
          artifact: 'Windows.Analysis.EvidenceOfExecution',
          parameters: {
            env: [{
              key: 'TargetGlob',
              value: processPath
            }]
          }
        }]
      });

      const flowId = response.data.flow_id;

      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get results
      const resultsResponse = await client.get(
        `/api/v1/GetFlowResults/${clientId}/${flowId}/Windows.Analysis.EvidenceOfExecution`
      );

      return resultsResponse.data.rows || [];
    } catch (error) {
      console.error('Error getting file details:', error.message);
      return null;
    }
  }

  /**
   * Hunt for indicator across all clients
   * Useful for finding if other hosts contacted the same malicious IP
   */
  async huntForIndicator(indicatorType, indicatorValue) {
    if (!this.enabled) return [];

    try {
      const client = this.getClient();

      let artifact = '';
      let parameters = {};

      switch (indicatorType) {
        case 'ip':
          artifact = 'Windows.Network.Netstat';
          parameters = {
            RemoteAddressRegex: indicatorValue
          };
          break;
        case 'domain':
          artifact = 'Windows.Network.DNSCache';
          parameters = {
            DomainRegex: indicatorValue
          };
          break;
        case 'hash':
          artifact = 'Windows.Detection.BinaryHashes';
          parameters = {
            HashValue: indicatorValue
          };
          break;
        default:
          return { error: 'Unsupported indicator type' };
      }

      // Create hunt
      const response = await client.post('/api/v1/CreateHunt', {
        description: `Hunt for ${indicatorType}: ${indicatorValue}`,
        artifacts: [artifact],
        specs: [{
          artifact,
          parameters
        }]
      });

      return {
        huntId: response.data.hunt_id,
        message: 'Hunt created successfully',
        artifact
      };
    } catch (error) {
      console.error('Error creating hunt:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get client information (OS, hostname, users, etc.)
   */
  async getClientInfo(clientId) {
    if (!this.enabled) return null;

    try {
      const client = this.getClient();

      const response = await client.get(`/api/v1/GetClient/${clientId}`);

      return {
        clientId: response.data.client_id,
        hostname: response.data.os_info?.hostname,
        os: response.data.os_info?.system,
        release: response.data.os_info?.release,
        architecture: response.data.os_info?.machine,
        fqdn: response.data.os_info?.fqdn,
        lastSeen: response.data.last_seen_at,
        lastIp: response.data.last_ip,
        mac: response.data.last_mac,
        labels: response.data.labels
      };
    } catch (error) {
      console.error('Error getting client info:', error.message);
      return null;
    }
  }

  /**
   * Get timeline of events for a host
   * Correlates with network connections
   */
  async getHostTimeline(clientId, startTime, endTime) {
    if (!this.enabled) return [];

    try {
      const client = this.getClient();

      // Collect timeline artifacts
      const response = await client.post('/api/v1/CollectArtifact', {
        client_id: clientId,
        artifacts: [
          'Windows.Timeline.MFT',
          'Windows.EventLogs.PowershellScriptblock',
          'Windows.System.TaskScheduler'
        ],
        specs: [
          {
            artifact: 'Windows.Timeline.MFT',
            parameters: {
              env: [
                { key: 'StartDate', value: startTime },
                { key: 'EndDate', value: endTime }
              ]
            }
          }
        ]
      });

      const flowId = response.data.flow_id;

      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get results
      const resultsResponse = await client.get(
        `/api/v1/GetFlowResults/${clientId}/${flowId}/Windows.Timeline.MFT`
      );

      return resultsResponse.data.rows || [];
    } catch (error) {
      console.error('Error getting host timeline:', error.message);
      return [];
    }
  }

  /**
   * Quick triage: Get essential data for incident response
   */
  async quickTriage(ipAddress) {
    if (!this.enabled) {
      return { error: 'Velociraptor not configured' };
    }

    try {
      // Find client
      const clientData = await this.findClientByIP(ipAddress);
      if (!clientData) {
        return { error: 'Host not found in Velociraptor' };
      }

      const clientId = clientData.client_id;

      // Collect multiple artifacts in parallel
      const client = this.getClient();

      const artifacts = [
        'Windows.System.Pslist',
        'Windows.Network.Netstat',
        'Windows.System.Users',
        'Windows.Sys.StartupItems'
      ];

      const collectPromises = artifacts.map(artifact =>
        client.post('/api/v1/CollectArtifact', {
          client_id: clientId,
          artifacts: [artifact],
          specs: [{ artifact }]
        })
      );

      const collections = await Promise.all(collectPromises);

      // Return flow IDs for frontend to poll
      return {
        clientId,
        hostname: clientData.os_info?.hostname,
        collections: collections.map((c, i) => ({
          artifact: artifacts[i],
          flowId: c.data.flow_id
        }))
      };
    } catch (error) {
      console.error('Error in quick triage:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = new VelociraptorService();
