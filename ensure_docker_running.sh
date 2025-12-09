#!/bin/bash

# Quick script to ensure Docker is running and functional
# Run this before/after operations that might break Docker

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Docker command exists
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Function to verify Docker is functional
verify_docker() {
    if docker version --format '{{.Server.Version}}' &> /dev/null; then
        return 0
    fi
    if docker ps &> /dev/null; then
        return 0
    fi
    return 1
}

# Check if Docker is running
if ! verify_docker; then
    echo -e "${YELLOW}Docker daemon is not running. Starting Docker Desktop...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        echo "Waiting for Docker to start (this may take 30-60 seconds)..."
        
        MAX_WAIT=120
        ELAPSED=0
        INTERVAL=3
        
        while [ $ELAPSED -lt $MAX_WAIT ]; do
            if verify_docker; then
                echo -e "${GREEN}✓ Docker is now running${NC}"
                docker ps
                exit 0
            fi
            sleep $INTERVAL
            ELAPSED=$((ELAPSED + INTERVAL))
            
            if [ $((ELAPSED % 15)) -eq 0 ]; then
                echo "  Still waiting... ($ELAPSED seconds)"
            fi
        done
        
        echo -e "${RED}Error: Docker failed to start after $MAX_WAIT seconds${NC}"
        echo "Please start Docker Desktop manually"
        exit 1
    else
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        echo "Please start Docker manually: sudo systemctl start docker"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker is running${NC}"
    docker ps
    exit 0
fi






