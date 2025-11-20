#!/bin/bash

# Network Visualizer Development Server Startup
# Starts both backend and frontend servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Network Visualizer - Development Server            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js v18 or v20 LTS first."
    echo "See README.md for installation instructions."
    exit 1
fi

# Check Node.js version
NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 18 ] || [ "$NODE_MAJOR" -gt 20 ]; then
    echo -e "${YELLOW}⚠ Warning: Node.js $(node --version) detected${NC}"
    echo -e "${YELLOW}  Recommended: Node.js v18 or v20 LTS${NC}"
    echo ""
fi

# Check if dependencies are installed
if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd "$SCRIPT_DIR/backend"
    npm install
fi

if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm install --legacy-peer-deps
fi

# Check if Elasticsearch is running
if ! curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Elasticsearch not detected at http://localhost:9200${NC}"
    echo -e "${YELLOW}  You may need to run the quickstart script first:${NC}"
    echo -e "${CYAN}    cd backend/scripts && ./quickstart.sh medium${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Kill any remaining node processes started by this script
    jobs -p | xargs -r kill 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "${GREEN}Starting development servers...${NC}"
echo ""

# Start backend server
echo -e "${CYAN}Starting backend on http://localhost:3001...${NC}"
cd "$SCRIPT_DIR/backend"

# Set environment variables for local Elasticsearch
export ES_NODE=http://localhost:9200
export ES_USERNAME=""
export ES_PASSWORD=""

npm start > "$SCRIPT_DIR/.backend.log" 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check logs at: $SCRIPT_DIR/.backend.log"
    tail -n 20 "$SCRIPT_DIR/.backend.log"
    exit 1
fi
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"

# Start frontend server
echo -e "${CYAN}Starting frontend on http://localhost:3000...${NC}"
cd "$SCRIPT_DIR/frontend"
npm start > "$SCRIPT_DIR/.frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "Check logs at: $SCRIPT_DIR/.frontend.log"
    tail -n 20 "$SCRIPT_DIR/.frontend.log"
    exit 1
fi
echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Development Servers Running                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Access the application:${NC}"
echo -e "  🌐 Frontend:    ${CYAN}http://localhost:3000${NC}"
echo -e "  🔧 Backend API: ${CYAN}http://localhost:3001${NC}"
echo -e "  🔍 Elasticsearch: ${CYAN}http://localhost:9200${NC}"
echo -e "  📊 Kibana:      ${CYAN}http://localhost:5601${NC}"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f $SCRIPT_DIR/.backend.log"
echo -e "  Frontend: tail -f $SCRIPT_DIR/.frontend.log"
echo ""
echo -e "${YELLOW}Press ${RED}Ctrl+C${YELLOW} to stop all servers${NC}"
echo ""

# Follow logs (interleaved)
tail -f "$SCRIPT_DIR/.backend.log" "$SCRIPT_DIR/.frontend.log" 2>/dev/null || {
    # If tail -f fails, just wait
    wait
}
