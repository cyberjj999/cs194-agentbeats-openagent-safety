FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    AGENT_PORT=8080 \
    PORT=8080 \
    PIP_NO_CACHE_DIR=1

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies (docker cli for spawning task containers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for caching
COPY agentified/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Copy project files (build context should be repo root)
COPY pyproject.toml README.md MANIFEST.in /app/
COPY agentified /app/agentified
COPY agentified_main.py /app/agentified_main.py
COPY src /app/src
# Copy only minimal scenarios for faster builds (AgentBeats integration testing)
# Skip large data files - only copy structure and config files
COPY scenarios/templates /app/scenarios/templates
COPY scenarios/official /app/scenarios/official
COPY scenarios/sdk_demos /app/scenarios/sdk_demos
# Copy openagentsafety structure but exclude large data files via .dockerignore
COPY scenarios/openagentsafety /app/scenarios/openagentsafety
COPY scripts /app/scripts

# Note: We do NOT install the local agentbeats package (-e /app) because:
# 1. The agentified code doesn't import from it
# 2. It would override earthshaker's 'agentbeats' command entry point
# 3. We only need earthshaker for 'agentbeats run_ctrl'

WORKDIR /app/agentified

# Make helper scripts executable
RUN chmod +x run.sh start_controller.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/status || exit 1

CMD ["./start_controller.sh"]

