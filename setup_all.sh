#!/bin/bash

# AgentBeats + OpenAgentSafety Integration Setup
# 3-Step Setup: OpenAgentSafety → AgentBeats Controller → Integration

set -e

echo "=============================================="
echo "AgentBeats + OpenAgentSafety Integration Setup"
echo "=============================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to ensure Docker stays running (call this before/after critical operations)
ensure_docker_running() {
    if ! verify_docker_functional; then
        echo -e "${YELLOW}Docker daemon stopped. Restarting...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Docker
            sleep 10
            # Wait up to 60 seconds for Docker to come back
            for i in {1..12}; do
                if verify_docker_functional; then
                    echo -e "${GREEN}✓ Docker daemon restarted${NC}"
                    return 0
                fi
                sleep 5
            done
            echo -e "${RED}Error: Docker daemon failed to restart${NC}"
            return 1
        fi
    fi
    return 0
}

# Function to kill processes on specific ports (but avoid killing Docker processes)
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "Port $port is in use by $service_name. Killing processes..."
        # Get PIDs using the port, but exclude Docker-related processes
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pids" ]; then
            for pid in $pids; do
                # Check if this is a Docker process - if so, skip it
                local proc_name=$(ps -p $pid -o comm= 2>/dev/null || echo "")
                if echo "$proc_name" | grep -qi "docker\|com.docker"; then
                    echo "  Skipping Docker process (PID $pid) on port $port"
                    continue
                fi
                # Kill non-Docker processes
                kill -9 $pid > /dev/null 2>&1 || true
            done
        fi
        sleep 1
        
        # Verify Docker is still running after killing processes
        ensure_docker_running || {
            echo -e "${RED}Error: Docker daemon stopped after killing processes on port $port${NC}"
            echo "Please restart Docker Desktop and try again"
            exit 1
        }
    fi
}

# Function to verify Docker is actually functional (not just socket exists)
verify_docker_functional() {
    # Try to get server version to verify Docker is fully operational
    if docker version --format '{{.Server.Version}}' &> /dev/null; then
        return 0
    fi
    # Fallback: try docker ps
    if docker ps &> /dev/null; then
        return 0
    fi
    return 1
}

# Function to check and start Docker daemon
check_docker_daemon() {
    echo -e "${BLUE}Checking Docker daemon...${NC}"
    
    # Check if Docker command exists
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        echo "Please install Docker Desktop from: https://www.docker.com/get-started"
        exit 1
    fi
    
    # Check if Docker daemon is running and functional
    if ! verify_docker_functional; then
        echo -e "${YELLOW}Docker daemon is not running or not fully ready. Attempting to start it...${NC}"
        
        # Try to start Docker Desktop on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "Starting Docker Desktop..."
            open -a Docker
            echo "Waiting for Docker daemon to fully initialize (this may take 60-120 seconds)..."
            echo "  Docker Desktop needs time to start the VM and initialize all services..."
            
            # Wait for Docker to be ready (max 4 minutes - Docker Desktop can be slow)
            MAX_WAIT=240
            ELAPSED=0
            INTERVAL=3
            
            while [ $ELAPSED -lt $MAX_WAIT ]; do
                # First check if docker info works
                if docker info &> /dev/null; then
                    # Then verify Docker is actually functional
                    if verify_docker_functional; then
                        echo -e "${GREEN}✓ Docker daemon is now running and functional${NC}"
                        return 0
                    else
                        # Docker info works but not fully functional yet
                        if [ $((ELAPSED % 15)) -eq 0 ]; then
                            echo "  Docker is starting but not fully ready yet... ($ELAPSED seconds)"
                        fi
                    fi
                fi
                sleep $INTERVAL
                ELAPSED=$((ELAPSED + INTERVAL))
                
                if [ $((ELAPSED % 15)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
                    echo "  Still waiting for Docker daemon... ($ELAPSED seconds)"
                fi
            done
            
            # Last attempt: check if socket path issue exists (Docker Desktop 4.13+ changed socket location)
            if [ -S "$HOME/Library/Containers/com.docker.docker/Data/docker.raw.sock" ]; then
                echo -e "${YELLOW}Attempting to use alternative socket path...${NC}"
                export DOCKER_HOST="unix://$HOME/Library/Containers/com.docker.docker/Data/docker.raw.sock"
                sleep 5
                if verify_docker_functional; then
                    echo -e "${GREEN}✓ Docker daemon is now running (using alternative socket)${NC}"
                    echo -e "${YELLOW}Note: Consider adding this to your shell profile:${NC}"
                    echo "  export DOCKER_HOST=unix://$HOME/Library/Containers/com.docker.docker/Data/docker.raw.sock"
                    return 0
                fi
            fi
            
            echo -e "${RED}Error: Docker daemon failed to start after $MAX_WAIT seconds${NC}"
            echo "Please check Docker Desktop manually:"
            echo "  1. Open Docker Desktop application"
            echo "  2. Wait for the whale icon to show 'Docker is running'"
            echo "  3. Try running: docker ps"
            exit 1
        else
            # For Linux, try to start Docker service
            if command -v systemctl &> /dev/null; then
                echo "Attempting to start Docker service..."
                sudo systemctl start docker 2>/dev/null || {
                    echo -e "${RED}Error: Could not start Docker service${NC}"
                    echo "Please start Docker manually: sudo systemctl start docker"
                    exit 1
                }
                sleep 5
                if verify_docker_functional; then
                    echo -e "${GREEN}✓ Docker daemon is now running${NC}"
                    return 0
                fi
            fi
            
            echo -e "${RED}Error: Docker daemon is not running${NC}"
            echo "Please start Docker manually and try again"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Docker daemon is running and functional${NC}"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    for cmd in python3; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}Error: $cmd is not installed${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
}

# STEP 1: Setup Python environment
setup_environment() {
    echo -e "\n${BLUE}STEP 1: Setting up Python environment${NC}"
    echo "=============================================="
    
    # Setup virtual environment
    echo "Setting up Python virtual environment..."
    VENV_DIR="$SCRIPT_DIR/.venv"
    
    if [ -d "$VENV_DIR" ]; then
        echo "✓ Virtual environment already exists"
        source "$VENV_DIR/bin/activate"
    else
        echo "Creating virtual environment..."
        python3 -m venv "$VENV_DIR"
        source "$VENV_DIR/bin/activate"
    fi
    
    # Install dependencies (needed for API server and other services)
    echo "Installing Python dependencies..."
    pip install -e . > /dev/null 2>&1 || {
        echo -e "${YELLOW}Warning: Some dependencies may have failed (continuing anyway)${NC}"
    }
    
    echo -e "${GREEN}✓ Virtual environment ready${NC}"
}

# STEP 2: Setup OpenAgentSafety
setup_openagentsafety() {
    echo -e "\n${BLUE}STEP 2: Setting up OpenAgentSafety${NC}"
    echo "=============================================="
    
    # Verify Docker is still running and functional (safety check)
    echo "Verifying Docker daemon is still functional..."
    if ! verify_docker_functional; then
        echo -e "${YELLOW}Docker daemon appears to have stopped. Attempting to reconnect...${NC}"
        # Try to restart Docker Desktop on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Docker
            echo "Waiting for Docker to restart (30 seconds)..."
            sleep 30
            if ! verify_docker_functional; then
                echo -e "${RED}Error: Docker daemon stopped running and could not be restarted${NC}"
                echo "Please ensure Docker Desktop is running and try again"
                exit 1
            fi
            echo -e "${GREEN}✓ Docker daemon reconnected${NC}"
        else
            echo -e "${RED}Error: Docker daemon stopped running${NC}"
            echo "Please ensure Docker is running and try again"
            exit 1
        fi
    fi
    
    # Check if docker compose is available
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: docker compose is not available${NC}"
        exit 1
    fi
    
    SERVICES_DIR="$SCRIPT_DIR/scenarios/openagentsafety/services"
    
    if [ ! -f "$SERVICES_DIR/docker-compose.yml" ]; then
        echo -e "${RED}Error: docker-compose.yml not found at $SERVICES_DIR${NC}"
        exit 1
    fi
    
    # Kill any processes using OpenAgentSafety ports (from previous mock services or other instances)
    echo "Clearing port conflicts..."
    kill_port 2999 "API Server"
    kill_port 3000 "RocketChat"
    kill_port 8929 "GitLab"
    kill_port 8091 "Plane"
    kill_port 8092 "ownCloud"
    
    # Stop and remove existing containers (including stopped ones)
    echo "Stopping and removing existing OpenAgentSafety containers..."
    cd "$SERVICES_DIR"
    
    # Force remove all containers defined in docker-compose.yml
    docker compose down --remove-orphans 2>/dev/null || true
    ensure_docker_running || exit 1
    
    # Also remove containers by name if they exist (in case compose down didn't catch them)
    echo "  Checking for existing containers..."
    for container in gitlab owncloud owncloud-collabora rocketchat rocketchat-mongodb redis-stack redis-stack-npc-data-population; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            echo "    Removing existing container: $container"
            docker rm -f "$container" 2>/dev/null || true
        fi
    done
    
    # Verify containers are removed
    sleep 1
    remaining=$(docker ps -a --format "{{.Names}}" | grep -E "^(gitlab|owncloud|owncloud-collabora|rocketchat|rocketchat-mongodb|redis-stack|redis-stack-npc-data-population)$" | wc -l | tr -d ' ')
    if [ "$remaining" -gt 0 ]; then
        echo -e "${YELLOW}Warning: Some containers still exist, forcing removal...${NC}"
        docker rm -f $(docker ps -a --format "{{.Names}}" | grep -E "^(gitlab|owncloud|owncloud-collabora|rocketchat|rocketchat-mongodb|redis-stack|redis-stack-npc-data-population)$") 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Containers cleaned up${NC}"
    
    # Set environment variables for docker-compose
    export GITLAB_PORT=8929
    export HOST_PORT=3000
    export BIND_IP=0.0.0.0
    export PORT=3000
    export ROOT_URL=http://the-agent-company.com:3000
    export MONGODB_ADVERTISED_HOSTNAME=mongodb
    export MONGODB_INITIAL_PRIMARY_PORT_NUMBER=27017
    export MONGODB_REPLICA_SET_NAME=rs0
    export MONGODB_DATABASE=rocketchat
    
    # Start Docker services
    echo "Starting OpenAgentSafety Docker services..."
    echo "  • RocketChat:  http://localhost:3000"
    echo "  • GitLab:      http://localhost:8929"
    echo "  • ownCloud:    http://localhost:8092"
    echo "  • MongoDB:     (internal)"
    echo "  • Redis:       (internal)"
    echo ""
    echo "Note: Plane service (port 8091) is started by the API Server, not Docker"
    echo "Note: API Server (port 2999) will start separately and includes Plane"
    echo ""
    echo "This may take 2-10 minutes on first run (downloading images)..."
    
    docker compose up -d --remove-orphans
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to start Docker services${NC}"
        echo "Check Docker Desktop is running and has enough resources"
        exit 1
    fi
    
    # Verify Docker is still running after compose operations
    ensure_docker_running || exit 1
    
    echo -e "${GREEN}✓ Docker containers started${NC}"
    
    # Start API server (separate from Docker)
    echo "Starting API server..."
    if command -v tmux &> /dev/null; then
        tmux kill-session -t openagentsafety-api 2>/dev/null || true
        tmux new-session -d -s openagentsafety-api "cd '$SCRIPT_DIR' && source '$VENV_DIR/bin/activate' && python3 services/api_server.py"
        echo -e "${GREEN}✓ API server started in tmux session${NC}"
    else
        nohup bash -c "cd '$SCRIPT_DIR' && source '$VENV_DIR/bin/activate' && python3 services/api_server.py" > "$SCRIPT_DIR/api_server.log" 2>&1 &
        echo $! > "$SCRIPT_DIR/.api_server.pid"
        echo -e "${GREEN}✓ API server started (PID: $(cat $SCRIPT_DIR/.api_server.pid))${NC}"
    fi
    
    # Wait for services to be ready
    echo "Waiting for OpenAgentSafety services to be ready..."
    echo "This may take 2-10 minutes (services need to initialize)..."
    
    MAX_WAIT=600  # 10 minutes max
    ELAPSED=0
    INTERVAL=10
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        # Check API server (includes Plane service)
        if curl -s http://localhost:2999 &> /dev/null; then
            # Check Plane directly (started by API server)
            if curl -s http://localhost:8091 &> /dev/null; then
                # Check individual Docker services via API server health checks
                if curl -s http://localhost:2999/api/healthcheck/rocketchat &> /dev/null && \
                   curl -s http://localhost:2999/api/healthcheck/gitlab &> /dev/null && \
                   curl -s http://localhost:2999/api/healthcheck/owncloud &> /dev/null; then
                    echo -e "${GREEN}✓ All OpenAgentSafety services are ready (including Plane)${NC}"
                    break
                fi
            fi
        fi
        
        if [ $((ELAPSED % 30)) -eq 0 ]; then
            echo "  Still waiting... ($ELAPSED seconds elapsed)"
        fi
        
        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    done
    
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo -e "${YELLOW}Warning: Some services may still be initializing${NC}"
        echo "Check status with: docker ps"
        echo "Check API server: curl http://localhost:2999"
    fi
    
    cd "$SCRIPT_DIR"
}

# STEP 2: Setup AgentBeats Controller
setup_controller() {
    echo -e "\n${BLUE}STEP 2: Setting up AgentBeats Controller${NC}"
    echo "=============================================="
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Warning: Docker not found. Skipping AgentBeats Controller setup.${NC}"
        echo "Install Docker to use the controller: https://www.docker.com/get-started"
        return
    fi
    
    # Kill existing controller containers
    if docker ps -a --filter "name=openagentsafety-ctrl" --format "{{.Names}}" | grep -q "openagentsafety-ctrl"; then
        echo "Stopping existing controller containers..."
        docker stop openagentsafety-ctrl openagentsafety-ctrl-white > /dev/null 2>&1 || true
        docker rm openagentsafety-ctrl openagentsafety-ctrl-white > /dev/null 2>&1 || true
    fi
    
    # Kill ports if in use
    kill_port 8080 "AgentBeats Controller"
    kill_port 8081 "AgentBeats White Controller"
    
    # Check if Docker image exists
    if ! docker images --format "{{.Repository}}" | grep -q "^openagentsafety-controller$"; then
        echo "Building AgentBeats Controller Docker image..."
        cd "$SCRIPT_DIR"
        docker build -t openagentsafety-controller -f agentified/Dockerfile . > /dev/null 2>&1 || {
            echo -e "${RED}Error: Failed to build controller Docker image${NC}"
            return
        }
        echo -e "${GREEN}✓ Controller Docker image built${NC}"
    else
        echo -e "${GREEN}✓ Controller Docker image already exists${NC}"
    fi
    
    # Start green agent controller
    echo "Starting AgentBeats Controller (Green Agent)..."
    OPENAI_API_KEY=${OPENAI_API_KEY:-"dummy-key-for-testing"}
    docker run -d \
        -p 8080:8080 \
        --name openagentsafety-ctrl \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e HOST=0.0.0.0 \
        -e PORT=8080 \
        openagentsafety-controller > /dev/null 2>&1 || {
        echo -e "${RED}Error: Failed to start controller container${NC}"
        return
    }
    
    echo -e "${GREEN}✓ Green Controller container started${NC}"
    
    # Wait for green controller to be ready
    echo "Waiting for AgentBeats Controller (Green)..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/status &> /dev/null; then
            echo -e "${GREEN}✓ AgentBeats Controller (Green) is ready${NC}"
            break
        fi
        sleep 2
    done
    
    # Start white agent controller on port 8081
    echo "Starting AgentBeats Controller (White Agent)..."
    docker run -d \
        -p 8081:8080 \
        --name openagentsafety-ctrl-white \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e AGENT_TYPE=white \
        -e HOST=0.0.0.0 \
        -e PORT=8080 \
        openagentsafety-controller > /dev/null 2>&1 || {
        echo -e "${RED}Error: Failed to start white controller container${NC}"
        return
    }
    
    echo -e "${GREEN}✓ White Controller container started${NC}"
    
    # Wait for white controller to be ready
    echo "Waiting for AgentBeats Controller (White)..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/status &> /dev/null; then
            echo -e "${GREEN}✓ AgentBeats Controller (White) is ready${NC}"
            break
        fi
        sleep 2
    done
}

# STEP 3: Setup Integration (Ollama + Frontend)
setup_integration() {
    echo -e "\n${BLUE}STEP 3: Setting up Integration${NC}"
    echo "=============================================="
    
    # Setup Ollama
    echo "Setting up Ollama for local model evaluation..."
    if ! command -v ollama &> /dev/null; then
        echo -e "${YELLOW}Warning: Ollama not found. Install it from: https://ollama.ai/${NC}"
        echo "Ollama is required for running evaluations with local models."
    else
        # Kill existing Ollama processes
        kill_port 11434 "Ollama"
        
        # Check if Ollama is running
        if ! curl -s http://localhost:11434 &> /dev/null; then
            echo "Starting Ollama server (http://localhost:11434)..."
            if command -v tmux &> /dev/null; then
                tmux kill-session -t ollama 2>/dev/null || true
                tmux new-session -d -s ollama "ollama serve"
                echo -e "${GREEN}✓ Ollama started in tmux session${NC}"
            else
                nohup ollama serve > "$SCRIPT_DIR/ollama.log" 2>&1 &
                echo $! > "$SCRIPT_DIR/.ollama.pid"
                echo -e "${GREEN}✓ Ollama started (PID: $(cat $SCRIPT_DIR/.ollama.pid))${NC}"
            fi
            
            # Wait for Ollama to be ready
            echo "Waiting for Ollama server..."
            for i in {1..30}; do
                if curl -s http://localhost:11434 &> /dev/null; then
                    echo -e "${GREEN}✓ Ollama server is ready${NC}"
                    break
                fi
                if [ $i -eq 30 ]; then
                    echo -e "${RED}Warning: Ollama server health check timed out${NC}"
                fi
                sleep 2
            done
        else
            echo -e "${GREEN}✓ Ollama is already running${NC}"
        fi
    fi
    
    # Setup Integration Frontend (Next.js)
    echo "Setting up integration frontend..."
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}Warning: npm not found. Skipping Next.js frontend.${NC}"
        echo "Install Node.js to use the web UI: https://nodejs.org/"
    else
        # Install dependencies if needed
        if [ ! -d "$SCRIPT_DIR/frontend/frontend-latest/node_modules" ]; then
            echo "Installing Next.js dependencies..."
            cd "$SCRIPT_DIR/frontend/frontend-latest" && npm install
            cd "$SCRIPT_DIR"
        fi
        
        # Kill existing frontend processes
        kill_port 3001 "Next.js Frontend"
        
        # Start Next.js frontend
        echo "Starting integration frontend (http://localhost:3001)..."
        if command -v tmux &> /dev/null; then
            tmux kill-session -t agentbeats-frontend 2>/dev/null || true
            tmux new-session -d -s agentbeats-frontend "cd '$SCRIPT_DIR/frontend/frontend-latest' && PORT=3001 npm run dev"
            echo -e "${GREEN}✓ Integration frontend started in tmux session${NC}"
        else
            nohup bash -c "cd '$SCRIPT_DIR/frontend/frontend-latest' && PORT=3001 npm run dev" > "$SCRIPT_DIR/frontend.log" 2>&1 &
            echo $! > "$SCRIPT_DIR/.frontend.pid"
            echo -e "${GREEN}✓ Integration frontend started (PID: $(cat $SCRIPT_DIR/.frontend.pid))${NC}"
        fi
    fi
}

# Main execution
main() {
    check_docker_daemon
    check_prerequisites
    setup_environment
    setup_openagentsafety
    setup_controller
    setup_integration
    
    echo ""
    echo "=============================================="
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "=============================================="
    echo ""
    echo "Services running:"
    echo ""
    echo "STEP 1 - OpenAgentSafety:"
    echo "  • API Server:          http://localhost:2999 (includes Plane on 8091)"
    echo "  • RocketChat:           http://localhost:3000"
    echo "  • GitLab:               http://localhost:8929"
    echo "  • ownCloud:             http://localhost:8092"
    echo "  • Plane:                http://localhost:8091 (started by API Server)"
    echo ""
    echo "STEP 2 - AgentBeats Controller:"
    echo "  • Green Controller:     http://localhost:8080"
    echo "  • White Controller:     http://localhost:8081"
    echo ""
    echo "STEP 3 - Integration:"
    echo "  • Ollama:              http://localhost:11434"
    echo "  • Frontend:            http://localhost:3001"
    echo ""
    echo "To run evaluations:"
    echo "  • Use the frontend: http://localhost:3001"
    echo "  • Quick CLI: ./eval (runs all models, all tasks)"
    echo "  • Advanced CLI: python3 run_evaluation_cli.py --models <model1,model2> --tasks <task1,task2>"
    echo "  • CLI Examples:"
    echo "    - ./eval"
    echo "    - ./eval --models gemma3,llama3.2 --tasks safety-data-privacy"
    echo "    - ./eval --all-models --tasks safety-abusive-apology"
    echo ""
    echo "To stop all services:"
    echo "  ./teardown_all.sh"
    echo "=============================================="
}

# Run main function
main

