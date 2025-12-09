#!/bin/bash
# Test script to verify OpenAgentSafety services are running

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "Testing OpenAgentSafety Services"
echo "=============================================="
echo ""

FAILED=0

# Test function
test_service() {
    local name=$1
    local url=$2
    local required=${3:-true}
    
    echo -n "Testing $name... "
    if curl -s --max-time 5 "$url" &> /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗ FAILED (REQUIRED)${NC}"
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${YELLOW}⚠ Not available (optional)${NC}"
            return 0
        fi
    fi
}

# Test Docker
echo "Checking Docker..."
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker is running${NC}"
else
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi

# Test Docker containers
echo ""
echo "Checking Docker containers..."
REQUIRED_CONTAINERS=("gitlab" "rocketchat" "owncloud" "rocketchat-mongodb" "redis-stack")
# Note: Plane may not be in docker-compose.yml but is required - check if it's started separately
OPTIONAL_CONTAINERS=()
for container in "${REQUIRED_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "${GREEN}✓ Container '$container' is running${NC}"
    else
        echo -e "${RED}✗ Container '$container' is NOT running (REQUIRED)${NC}"
        FAILED=$((FAILED + 1))
    fi
done
for container in "${OPTIONAL_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "${GREEN}✓ Container '$container' is running${NC}"
    else
        echo -e "${YELLOW}⚠ Container '$container' is NOT running (optional)${NC}"
    fi
done

# Test services
echo ""
echo "Testing service endpoints..."

test_service "Ollama Server" "http://localhost:11434" true
test_service "API Server" "http://localhost:2999" true
test_service "RocketChat" "http://localhost:3000" true
# GitLab may take 5-10 minutes to fully start - check with longer timeout
echo -n "Testing GitLab (may take time to initialize)... "
if curl -s --max-time 10 "http://localhost:8929" &> /dev/null || curl -s --max-time 10 "http://localhost:8929/-/health" &> /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    # Check if container is running - if yes, it's just not ready yet
    if docker ps --format "{{.Names}}" | grep -q "^gitlab$"; then
        echo -e "${YELLOW}⚠ Starting (container running, service initializing)${NC}"
        echo "   GitLab can take 5-10 minutes to fully start on first run"
    else
        echo -e "${RED}✗ FAILED (REQUIRED)${NC}"
        FAILED=$((FAILED + 1))
    fi
fi
test_service "ownCloud" "http://localhost:8092" true
test_service "Plane" "http://localhost:8091" true  # REQUIRED - tasks use Plane API

# Test API server health checks
echo ""
echo "Testing API server health checks..."
if curl -s http://localhost:2999/api/healthcheck/rocketchat &> /dev/null; then
    echo -e "${GREEN}✓ RocketChat health check OK${NC}"
else
    echo -e "${YELLOW}⚠ RocketChat health check not available${NC}"
fi

if curl -s http://localhost:2999/api/healthcheck/gitlab &> /dev/null; then
    echo -e "${GREEN}✓ GitLab health check OK${NC}"
else
    echo -e "${YELLOW}⚠ GitLab health check not available${NC}"
fi

if curl -s http://localhost:2999/api/healthcheck/owncloud &> /dev/null; then
    echo -e "${GREEN}✓ ownCloud health check OK${NC}"
else
    echo -e "${YELLOW}⚠ ownCloud health check not available${NC}"
fi

# Summary
echo ""
echo "=============================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All required services are running!${NC}"
    echo "You can now run evaluations."
    exit 0
else
    echo -e "${RED}$FAILED required service(s) are not running${NC}"
    echo ""
    echo "To start services, run:"
    echo "  ./setup_all.sh"
    echo ""
    echo "Or start Docker services manually:"
    echo "  cd scenarios/openagentsafety/services"
    echo "  docker compose up -d"
    exit 1
fi

