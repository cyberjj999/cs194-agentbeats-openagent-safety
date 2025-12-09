#!/bin/bash
# Startup script for AgentBeats controller within the container

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STATE_DIR="${STATE_DIR:-.ab}"
AGENT_STATE_DIR="${STATE_DIR}/agents"

if [ -d "${AGENT_STATE_DIR}" ]; then
    echo "Cleaning up stale agent state in ${AGENT_STATE_DIR}..."
    rm -rf "${AGENT_STATE_DIR:?}/"*
fi

mkdir -p "${AGENT_STATE_DIR}"

echo "Starting AgentBeats controller..."
exec agentbeats run_ctrl
