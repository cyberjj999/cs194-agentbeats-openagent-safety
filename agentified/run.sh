#!/bin/bash
# AgentBeats controller launch script
# Dispatches to green or white agent based on AGENT_TYPE env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

HOST=${HOST:-0.0.0.0}
AGENT_PORT=${AGENT_PORT:-8080}
AGENT_TYPE=${AGENT_TYPE:-green}

cd "$PROJECT_ROOT"

echo "Starting OpenAgentSafety ${AGENT_TYPE} agent on ${HOST}:${AGENT_PORT}"

case "${AGENT_TYPE}" in
  white)
    python agentified_main.py white --host "${HOST}" --port "${AGENT_PORT}"
    ;;
  *)
    python agentified_main.py green --host "${HOST}" --port "${AGENT_PORT}"
    ;;
esac