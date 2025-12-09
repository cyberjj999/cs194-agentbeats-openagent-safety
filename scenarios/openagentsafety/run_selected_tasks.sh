    #!/bin/bash

# Task selection and execution script for OpenAgentSafety
# This script allows running specific tasks or task patterns from the OpenAgentSafety benchmark

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKS_DIR="$SCRIPT_DIR/workspaces/tasks"
EVAL_DIR="$SCRIPT_DIR/evaluation"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
AGENT_LLM_CONFIG="agent"
ENV_LLM_CONFIG="env"
OUTPUTS_PATH="$SCRIPT_DIR/evaluation/outputs"
SERVER_HOSTNAME="localhost"
TASK_PATTERN="safety-*"

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS] [TASK_PATTERN]"
    echo ""
    echo "Run OpenAgentSafety evaluation tasks matching the specified pattern."
    echo ""
    echo "Arguments:"
    echo "  TASK_PATTERN          Glob pattern for tasks (default: 'safety-*')"
    echo ""
    echo "Options:"
    echo "  --agent-llm-config    LLM config name for agent (default: 'agent')"
    echo "  --env-llm-config      LLM config name for environment (default: 'env')"
    echo "  --outputs-path        Path to save outputs (default: './evaluation/outputs')"
    echo "  --server-hostname     Server hostname (default: 'localhost')"
    echo "  --list                List matching tasks without running them"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 'safety-*'                    # Run all safety tasks"
    echo "  $0 'safety-leak*'                # Run all leak-related tasks"
    echo "  $0 'safety-abusive-apology'      # Run a single task"
    echo "  $0 --list 'safety-compliance*'   # List compliance tasks"
    echo ""
    echo "Note: Requires config.toml in evaluation/ directory with LLM configurations."
    exit 1
}

# Parse arguments
LIST_ONLY=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --agent-llm-config)
            AGENT_LLM_CONFIG="$2"
            shift 2
            ;;
        --env-llm-config)
            ENV_LLM_CONFIG="$2"
            shift 2
            ;;
        --outputs-path)
            OUTPUTS_PATH="$2"
            shift 2
            ;;
        --server-hostname)
            SERVER_HOSTNAME="$2"
            shift 2
            ;;
        --list)
            LIST_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            TASK_PATTERN="$1"
            shift
            ;;
    esac
done

echo "=============================================="
echo "OpenAgentSafety Task Runner"
echo "=============================================="
echo ""
echo "Task pattern: $TASK_PATTERN"
echo "Agent LLM config: $AGENT_LLM_CONFIG"
echo "Env LLM config: $ENV_LLM_CONFIG"
echo "Outputs path: $OUTPUTS_PATH"
echo "Server hostname: $SERVER_HOSTNAME"
echo ""

# Check if tasks directory exists
if [ ! -d "$TASKS_DIR" ]; then
    echo -e "${RED}Error: Tasks directory not found: $TASKS_DIR${NC}"
    exit 1
fi

# Check if config.toml exists
if [ ! -f "$EVAL_DIR/config.toml" ]; then
    echo -e "${RED}Error: config.toml not found in $EVAL_DIR${NC}"
    echo "Please create it from config.toml.example"
    exit 1
fi

# Find matching tasks
echo -e "${YELLOW}Finding tasks matching pattern '$TASK_PATTERN'...${NC}"
MATCHED_TASKS=()
for task_dir in "$TASKS_DIR"/$TASK_PATTERN/; do
    if [ -d "$task_dir" ]; then
        task_name=$(basename "$task_dir")
        MATCHED_TASKS+=("$task_name")
    fi
done

if [ ${#MATCHED_TASKS[@]} -eq 0 ]; then
    echo -e "${RED}No tasks found matching pattern: $TASK_PATTERN${NC}"
    exit 1
fi

echo -e "${GREEN}Found ${#MATCHED_TASKS[@]} matching task(s):${NC}"
for task in "${MATCHED_TASKS[@]}"; do
    echo "  • $task"
done
echo ""

# If list only mode, exit here
if [ "$LIST_ONLY" = true ]; then
    exit 0
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if poetry is installed (required for OpenHands)
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Error: poetry is not installed${NC}"
    echo "Install with: pip install poetry"
    exit 1
fi

# Check if Python 3.11+ is available
PYTHON_VERSION=$(python3 --version | awk '{print $2}')
MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
if [ "$MAJOR" -lt 3 ] || ([ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 11 ]); then
    echo -e "${RED}Error: Python 3.11+ required (found: $PYTHON_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
echo ""

# Create outputs directory
mkdir -p "$OUTPUTS_PATH"

# Run evaluation for each matched task
TOTAL=${#MATCHED_TASKS[@]}
CURRENT=0
SUCCEEDED=0
FAILED=0

echo "=============================================="
echo "Starting Task Execution"
echo "=============================================="
echo ""

for task_name in "${MATCHED_TASKS[@]}"; do
    CURRENT=$((CURRENT + 1))
    task_path="$TASKS_DIR/$task_name"
    
    echo -e "${BLUE}[$CURRENT/$TOTAL] Running: $task_name${NC}"
    echo "Task path: $task_path"
    
    # Check if evaluation file already exists
    if [ -f "$OUTPUTS_PATH/eval_${task_name}.json" ]; then
        echo -e "${YELLOW}⚠ Evaluation file already exists, skipping...${NC}"
        echo ""
        continue
    fi
    
    # Run evaluation
    cd "$EVAL_DIR"
    # Detect OpenAgentSafety root for poetry (prefer env var, then nearby clone)
    OAS_ROOT=""
    if [ -n "$OPENAGENTSAFETY_ROOT" ] && [ -f "$OPENAGENTSAFETY_ROOT/pyproject.toml" ]; then
        OAS_ROOT="$OPENAGENTSAFETY_ROOT"
    elif [ -d "$SCRIPT_DIR/../../OpenAgentSafety" ] && [ -f "$SCRIPT_DIR/../../OpenAgentSafety/pyproject.toml" ]; then
        OAS_ROOT="$(cd "$SCRIPT_DIR/../../OpenAgentSafety" && pwd)"
    fi

    # Prefer current Python env if it already has OpenHands
    if python3 -c "import openhands" 2>/dev/null; then
        RUN_CMD="python3 \"$EVAL_DIR/run_eval.py\""
    elif [ -n "$OAS_ROOT" ]; then
        # Use poetry from OpenAgentSafety root where dependencies are installed
        RUN_CMD="cd \"$OAS_ROOT\" && poetry run python \"$EVAL_DIR/run_eval.py\""
    else
        echo -e "${RED}OpenHands not found in current Python environment.${NC}"
        echo -e "${YELLOW}Tip:${NC} Activate your venv that has OpenHands, or set OPENAGENTSAFETY_ROOT to your OAS checkout to use Poetry."
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗ Task failed${NC}"
        echo ""
        continue
    fi

    if (eval $RUN_CMD \
        --agent-llm-config "$AGENT_LLM_CONFIG" \
        --env-llm-config "$ENV_LLM_CONFIG" \
        --outputs-path "$OUTPUTS_PATH" \
        --server-hostname "$SERVER_HOSTNAME" \
        --task-path "$task_path"); then
        
        SUCCEEDED=$((SUCCEEDED + 1))
        echo -e "${GREEN}✓ Task completed successfully${NC}"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗ Task failed${NC}"
    fi
    echo ""
done

# Summary
echo "=============================================="
echo "Execution Summary"
echo "=============================================="
echo "Total tasks: $TOTAL"
echo -e "${GREEN}Succeeded: $SUCCEEDED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo "Failed: $FAILED"
fi
echo ""
echo "Results saved to: $OUTPUTS_PATH"
echo "=============================================="

