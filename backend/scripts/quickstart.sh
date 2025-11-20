#!/bin/bash

# Quick Start Script for Network Visualizer Development
# Sets up Elasticsearch with mock data for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCALE="${1:-medium}"  # small, medium, large, enterprise
TIME_RANGE="${2:-24}" # hours

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Network Visualizer - Quick Start Setup             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Print configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  Scale: $SCALE"
echo "  Time Range: $TIME_RANGE hours"
echo ""

# Validate scale
if [[ ! "$SCALE" =~ ^(small|medium|large|enterprise)$ ]]; then
    echo -e "${RED}✗ Invalid scale. Must be one of: small, medium, large, enterprise${NC}"
    exit 1
fi

# Check if Docker is running
echo -e "${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Start Elasticsearch and Kibana
echo -e "${YELLOW}Starting Elasticsearch and Kibana...${NC}"
cd "$PROJECT_ROOT"

if docker-compose -f docker-compose.dev.yml ps | grep -q "network-viz-elasticsearch"; then
    echo "Elasticsearch container already running"
else
    docker-compose -f docker-compose.dev.yml up -d
    echo ""
    echo -e "${YELLOW}Waiting for Elasticsearch to be ready...${NC}"
    sleep 10

    # Wait for health check
    MAX_TRIES=30
    TRIES=0
    while [ $TRIES -lt $MAX_TRIES ]; do
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Elasticsearch is ready${NC}"
            break
        fi
        TRIES=$((TRIES + 1))
        echo -n "."
        sleep 2
    done

    if [ $TRIES -eq $MAX_TRIES ]; then
        echo -e "${RED}✗ Elasticsearch failed to start${NC}"
        exit 1
    fi
fi
echo ""

# Install Node.js dependencies if needed
echo -e "${YELLOW}Checking Node.js dependencies...${NC}"
cd "$PROJECT_ROOT/backend"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Set environment variables for local Elasticsearch
export ES_URL=http://localhost:9200
export ES_USERNAME=""
export ES_PASSWORD=""

# Generate and load mock data
echo -e "${YELLOW}Generating and loading mock data...${NC}"
echo "This may take a few minutes depending on the scale."
echo ""

cd "$PROJECT_ROOT/backend"
node scripts/setupMockElasticsearch.js "$SCALE" "$TIME_RANGE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ Setup Complete!                                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Services:${NC}"
    echo "  Elasticsearch: http://localhost:9200"
    echo "  Kibana: http://localhost:5601"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Start the backend:"
    echo -e "     ${BLUE}cd backend && npm start${NC}"
    echo ""
    echo "  2. Start the frontend:"
    echo -e "     ${BLUE}cd frontend && npm run dev${NC}"
    echo ""
    echo "  3. Open the Network Visualizer:"
    echo -e "     ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo -e "${YELLOW}Elasticsearch Configuration:${NC}"
    echo "  URL: http://localhost:9200"
    echo "  Username: (leave blank)"
    echo "  Password: (leave blank)"
    echo "  Index Pattern: zeek-*"
    echo ""
    echo -e "${YELLOW}Tips:${NC}"
    echo "  - Click the Map icon to configure network topology"
    echo "  - Use the Threat Hunting panel to test anomaly detection"
    echo "  - Try the different clustering modes in Graph View"
    echo ""
    echo -e "${YELLOW}To stop services:${NC}"
    echo -e "  ${BLUE}docker-compose -f docker-compose.dev.yml down${NC}"
    echo ""
else
    echo -e "${RED}✗ Setup failed${NC}"
    exit 1
fi
