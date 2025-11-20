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
CYAN='\033[0;36m'
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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS_TYPE=$(detect_os)

# Dependency validation
echo -e "${YELLOW}Checking dependencies...${NC}"
MISSING_DEPS=()

# Check Node.js
if ! command_exists node; then
    MISSING_DEPS+=("node")
    echo -e "${RED}✗ Node.js not found${NC}"
else
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')

    # Check if version is too new (>20) or too old (<18)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${RED}✗ Node.js ${NODE_VERSION} (too old, need v18 or v20 LTS)${NC}"
        MISSING_DEPS+=("node-version")
    elif [ "$NODE_MAJOR" -gt 20 ]; then
        echo -e "${YELLOW}⚠ Node.js ${NODE_VERSION} (too new, may cause build errors)${NC}"
        echo -e "${YELLOW}  Recommended: Use Node.js v18 LTS or v20 LTS${NC}"
        MISSING_DEPS+=("node-version")
    else
        echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
    fi
fi

# Check npm
if ! command_exists npm; then
    MISSING_DEPS+=("npm")
    echo -e "${RED}✗ npm not found${NC}"
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
fi

# Check Docker
if ! command_exists docker; then
    MISSING_DEPS+=("docker")
    echo -e "${RED}✗ Docker not found${NC}"
else
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    echo -e "${GREEN}✓ Docker ${DOCKER_VERSION}${NC}"

    # Check if Docker daemon is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker daemon is not running${NC}"
        MISSING_DEPS+=("docker-running")
    fi
fi

# Check docker-compose
if ! command_exists docker-compose; then
    MISSING_DEPS+=("docker-compose")
    echo -e "${RED}✗ docker-compose not found${NC}"
else
    COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
    echo -e "${GREEN}✓ docker-compose ${COMPOSE_VERSION}${NC}"
fi

# Check curl (used in health checks)
if ! command_exists curl; then
    MISSING_DEPS+=("curl")
    echo -e "${RED}✗ curl not found${NC}"
else
    echo -e "${GREEN}✓ curl${NC}"
fi

echo ""

# If there are missing dependencies, provide installation instructions
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Missing Dependencies                                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}The following dependencies are missing:${NC}"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""

    if [ "$OS_TYPE" == "macos" ]; then
        echo -e "${CYAN}Installation Instructions for macOS:${NC}"
        echo ""

        # Check if Homebrew is installed
        if ! command_exists brew; then
            echo -e "${YELLOW}1. Install Homebrew (package manager):${NC}"
            echo '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " node " ]] || [[ " ${MISSING_DEPS[@]} " =~ " npm " ]] || [[ " ${MISSING_DEPS[@]} " =~ " node-version " ]]; then
            echo -e "${YELLOW}Install/Switch to Node.js LTS (v18 or v20):${NC}"
            if command_exists brew; then
                echo "   # Uninstall current version if needed:"
                echo "   brew uninstall node"
                echo ""
                echo "   # Install Node.js v20 LTS (recommended):"
                echo "   brew install node@20"
                echo "   brew link node@20"
                echo ""
                echo "   # OR use nvm (Node Version Manager):"
                echo "   brew install nvm"
                echo "   nvm install 20"
                echo "   nvm use 20"
                echo "   nvm alias default 20"
            else
                echo "   Download Node.js v20 LTS from: https://nodejs.org/"
                echo "   (Choose the LTS version, not Current)"
            fi
            echo ""
            echo -e "${CYAN}Why Node.js LTS?${NC}"
            echo "   - Better-sqlite3 has compatibility issues with Node.js v21+"
            echo "   - v18 and v20 are Long Term Support (LTS) versions"
            echo "   - More stable for production use"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " docker " ]] || [[ " ${MISSING_DEPS[@]} " =~ " docker-compose " ]] || [[ " ${MISSING_DEPS[@]} " =~ " docker-running " ]]; then
            echo -e "${YELLOW}Install Docker Desktop for Mac:${NC}"
            if command_exists brew; then
                echo "   brew install --cask docker"
            else
                echo "   Download from: https://www.docker.com/products/docker-desktop"
            fi
            echo ""
            echo "   After installation:"
            echo "   1. Open Docker Desktop application"
            echo "   2. Wait for Docker to start (icon in menu bar)"
            echo "   3. Run this script again"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " docker-running " ]]; then
            echo -e "${YELLOW}Docker is installed but not running:${NC}"
            echo "   1. Open Docker Desktop application"
            echo "   2. Wait for the Docker icon to appear in the menu bar"
            echo "   3. Wait until the icon is steady (not animated)"
            echo "   4. Run this script again"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " curl " ]]; then
            echo -e "${YELLOW}Install curl:${NC}"
            echo "   brew install curl"
            echo ""
        fi

    elif [ "$OS_TYPE" == "linux" ]; then
        echo -e "${CYAN}Installation Instructions for Linux:${NC}"
        echo ""

        if [[ " ${MISSING_DEPS[@]} " =~ " node " ]] || [[ " ${MISSING_DEPS[@]} " =~ " npm " ]] || [[ " ${MISSING_DEPS[@]} " =~ " node-version " ]]; then
            echo -e "${YELLOW}Install/Switch to Node.js LTS (v18 or v20):${NC}"
            echo "   # Using Ubuntu/Debian (Node.js v20 LTS):"
            echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "   sudo apt-get install -y nodejs"
            echo ""
            echo "   # Using Fedora/RHEL (Node.js v20 LTS):"
            echo "   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
            echo "   sudo dnf install -y nodejs"
            echo ""
            echo "   # OR use nvm (Node Version Manager):"
            echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
            echo "   nvm install 20"
            echo "   nvm use 20"
            echo "   nvm alias default 20"
            echo ""
            echo -e "${CYAN}Why Node.js LTS?${NC}"
            echo "   - Better-sqlite3 has compatibility issues with Node.js v21+"
            echo "   - v18 and v20 are Long Term Support (LTS) versions"
            echo "   - More stable for production use"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " docker " ]]; then
            echo -e "${YELLOW}Install Docker:${NC}"
            echo "   # Using Ubuntu/Debian:"
            echo "   curl -fsSL https://get.docker.com | sh"
            echo "   sudo usermod -aG docker $USER"
            echo ""
            echo "   # Using Fedora/RHEL:"
            echo "   sudo dnf install docker"
            echo "   sudo systemctl start docker"
            echo "   sudo usermod -aG docker $USER"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " docker-compose " ]]; then
            echo -e "${YELLOW}Install docker-compose:${NC}"
            echo "   sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
            echo "   sudo chmod +x /usr/local/bin/docker-compose"
            echo ""
        fi

        if [[ " ${MISSING_DEPS[@]} " =~ " curl " ]]; then
            echo -e "${YELLOW}Install curl:${NC}"
            echo "   sudo apt-get install curl  # Ubuntu/Debian"
            echo "   sudo dnf install curl       # Fedora/RHEL"
            echo ""
        fi
    else
        echo -e "${CYAN}Please install the missing dependencies for your operating system.${NC}"
        echo ""
    fi

    echo -e "${YELLOW}Quick Install All (macOS with Homebrew):${NC}"
    if [ "$OS_TYPE" == "macos" ]; then
        echo "   brew install node@20"
        echo "   brew link node@20"
        echo "   brew install --cask docker"
        echo "   # Then open Docker Desktop and wait for it to start"
        echo ""
    fi

    echo -e "${RED}Please install the missing dependencies and run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All dependencies are installed${NC}"
echo ""

# Check Docker daemon is running
echo -e "${YELLOW}Checking Docker daemon...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    if [ "$OS_TYPE" == "macos" ]; then
        echo ""
        echo "Please start Docker Desktop:"
        echo "  1. Open Docker Desktop application"
        echo "  2. Wait for the Docker icon to appear in the menu bar"
        echo "  3. Wait until the icon is steady (not animated)"
        echo "  4. Run this script again"
    else
        echo ""
        echo "Please start Docker:"
        echo "  sudo systemctl start docker"
    fi
    exit 1
fi
echo -e "${GREEN}✓ Docker daemon is running${NC}"
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
            echo -e "\n${GREEN}✓ Elasticsearch is ready${NC}"
            break
        fi
        TRIES=$((TRIES + 1))
        echo -n "."
        sleep 2
    done

    if [ $TRIES -eq $MAX_TRIES ]; then
        echo -e "\n${RED}✗ Elasticsearch failed to start${NC}"
        echo ""
        echo "Checking logs:"
        docker logs network-viz-elasticsearch --tail 50
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
else
    echo "Dependencies already installed"
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
    echo "  1. Start both backend and frontend (one command):"
    echo -e "     ${BLUE}cd $PROJECT_ROOT && ./start-dev.sh${NC}"
    echo ""
    echo "  2. Open the Network Visualizer:"
    echo -e "     ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo -e "${CYAN}  Or start them separately:${NC}"
    echo "    Backend:  cd backend && npm start"
    echo "    Frontend: cd frontend && npm run dev"
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
