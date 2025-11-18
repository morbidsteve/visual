# Quick Start Guide

Get the Network Visualizer up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Access to an Elasticsearch cluster with Zeek data
- Elasticsearch credentials (username/password or API key)

## Step-by-Step Setup

### 1. Configure Backend

```bash
# Navigate to backend directory
cd backend

# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required settings in `.env`:**
```env
ES_NODE=https://your-elasticsearch-host:9200
ES_USERNAME=your-username
ES_PASSWORD=your-password
ES_INDEX_PATTERN=zeek-*
```

### 2. Start the Application

```bash
# Return to root directory
cd ..

# Start with Docker Compose
docker-compose up -d
```

This will:
- Build and start the backend (port 3001)
- Build and start the frontend (port 80)
- Create a shared network
- Set up persistent storage for whitelist data

### 3. Verify Everything is Running

```bash
# Check container status
docker-compose ps

# Should show both containers running:
# - network-visualizer-backend
# - network-visualizer-frontend

# Check backend logs
docker-compose logs backend

# You should see: "Elasticsearch: Connected ✓"
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost
```

You should see the Network Visualizer interface!

## First Steps

### 1. Adjust Time Range
- Use the left sidebar filter panel
- Set time range to last 1-24 hours (depending on your data)
- Click "Apply Filters"

### 2. Explore the Network Graph
- Pan around by clicking and dragging the background
- Zoom with your mouse wheel
- Click on nodes (IP addresses) to see details
- Click on edges (connections) to see traffic info

### 3. Search for Specific IPs
- Use the search bar at the top
- Type an IP address or service name
- Click results to highlight in the graph

### 4. Create Whitelists
- Click the whitelist icon (top-right)
- Add known-good IPs, subnets, or connections
- Toggle "Hide whitelisted traffic" to filter them out

## Common Issues

### "No data showing in graph"

**Solution:**
1. Verify Elasticsearch connection in backend logs:
   ```bash
   docker-compose logs backend
   ```
2. Check that Zeek data exists for the selected time range
3. Try expanding the time range filter
4. Verify the index pattern matches your data

### "Backend won't start"

**Solution:**
1. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001
   ```
2. Verify `.env` file exists in `backend/` directory
3. Check backend logs for errors:
   ```bash
   docker-compose logs backend
   ```

### "Frontend shows connection error"

**Solution:**
1. Verify backend is running:
   ```bash
   docker-compose ps backend
   ```
2. Check backend health:
   ```bash
   curl http://localhost:3001/health
   ```
3. Restart the frontend:
   ```bash
   docker-compose restart frontend
   ```

### "Elasticsearch connection failed"

**Solution:**
1. Test Elasticsearch from your machine:
   ```bash
   curl -u username:password https://your-elasticsearch:9200
   ```
2. If using self-signed certs, they're automatically accepted (see `rejectUnauthorized: false` in code)
3. Verify credentials in `backend/.env`
4. Check if Elasticsearch is accessible from Docker network

## Stopping the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (WARNING: deletes whitelist data)
docker-compose down -v
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [API Documentation](README.md#api-documentation) to integrate with other tools
- Review [Security Considerations](README.md#security-considerations) before production deployment
- See [k8s/README.md](k8s/README.md) for Kubernetes deployment

## Customization

### Change Refresh Interval

Edit `frontend/.env.example`:
```env
REACT_APP_REFRESH_INTERVAL=60000  # 60 seconds instead of 30
```

Then rebuild:
```bash
docker-compose up -d --build frontend
```

### Change Default Time Window

Edit `backend/.env`:
```env
DATA_WINDOW_HOURS=48  # Show last 48 hours by default
```

Then restart:
```bash
docker-compose restart backend
```

### Adjust Resource Limits

Edit `docker-compose.yml` to add resource limits:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Getting Help

- **Logs**: `docker-compose logs -f`
- **Backend logs**: `docker-compose logs -f backend`
- **Frontend logs**: `docker-compose logs -f frontend`
- **Container shell**: `docker-compose exec backend sh`
- **Full restart**: `docker-compose down && docker-compose up -d`

## Sample Data

If you don't have Zeek data yet:

1. Install Zeek on a test machine
2. Point it at a network interface
3. Configure Zeek to send logs to Elasticsearch (use Filebeat)
4. Index pattern should match your Elasticsearch setup

Example Filebeat config for Zeek:
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /opt/zeek/logs/current/conn.log
  json.keys_under_root: true

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  username: "elastic"
  password: "changeme"
  index: "zeek-%{+yyyy.MM.dd}"
```

---

Ready to visualize your network! 🎯
