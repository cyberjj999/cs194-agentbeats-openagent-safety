# Configuring Agents to Use Ollama (Local LLM)

## Current Configuration

**By default, the deployed agents use OpenAI API keys:**
- Model: `gpt-4o`
- Provider: `openai`
- Requires: `OPENAI_API_KEY` environment variable

## Switching to Ollama

The white agent uses **LiteLLM**, which supports Ollama. To use Ollama instead of OpenAI:

### Option 1: Environment Variables (Recommended)

Set these environment variables when deploying:

```bash
# For Ollama models
WHITE_AGENT_MODEL="ollama/llama3.2"  # or "ollama/deepseek-r1:1.5b"
WHITE_AGENT_PROVIDER="ollama"        # Optional, can be inferred from model name
```

### Option 2: Update EC2 Instance

If you want to switch an existing deployment to Ollama:

1. **SSH into the EC2 instance:**
   ```bash
   ssh -i openagentsafety-white-key.pem ec2-user@3.236.141.209
   ```

2. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.2
   # or
   ollama pull deepseek-r1:1.5b
   ```

3. **Update the Docker container:**
   ```bash
   sudo docker stop openagentsafety-white
   sudo docker rm openagentsafety-white
   
   # Get the public IP
   PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
   PUBLIC_URL="http://${PUBLIC_IP}:8080"
   CLOUDRUN_HOST="${PUBLIC_IP}:8080"
   
   # Restart with Ollama configuration
   sudo docker run -d \
       --name openagentsafety-white \
       --restart unless-stopped \
       -p 8080:8080 \
       -v /opt/agentbeats:/app/agentified/.ab \
       --network host \  # Needed to access Ollama on localhost
       -e AGENT_TYPE=white \
       -e HOST=0.0.0.0 \
       -e AGENT_PORT=8080 \
       -e PORT=8080 \
       -e PUBLIC_URL=${PUBLIC_URL} \
       -e CLOUDRUN_HOST=${CLOUDRUN_HOST} \
       -e WHITE_AGENT_MODEL="ollama/llama3.2" \
       -e WHITE_AGENT_PROVIDER="ollama" \
       545313858342.dkr.ecr.us-east-1.amazonaws.com/openagentsafety-white:latest
   ```

### Option 3: Update Deployment Script

Modify `deploy_to_ec2.sh` to include Ollama installation in user data:

```bash
# In the user data script, add:
yum install -y curl
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# And in docker run command, add:
--network host \
-e WHITE_AGENT_MODEL="ollama/llama3.2" \
-e WHITE_AGENT_PROVIDER="ollama" \
```

## Supported Ollama Models

LiteLLM supports any Ollama model. Recommended models:

- `ollama/llama3.2` - Balanced performance (~2GB)
- `ollama/deepseek-r1:1.5b` - Fast, lightweight (~1GB)
- `ollama/gemma3:1b` - Ultra-lightweight (~1GB)
- `ollama/llama3.1:8b` - Better quality (~4.5GB)

## Model Format

LiteLLM automatically detects Ollama models when you use the `ollama/` prefix:

```python
# These are equivalent:
model="ollama/llama3.2"
model="ollama/llama3.2", provider="ollama"
```

## Important Notes

1. **Ollama must be running**: Ollama needs to be installed and running on the EC2 instance
2. **Network access**: The Docker container needs access to Ollama (use `--network host` or expose port 11434)
3. **No API key needed**: Ollama doesn't require API keys
4. **Performance**: Local models are slower than cloud APIs but cost $0
5. **Resource requirements**: 
   - Small models (1-3B): ~4-8GB RAM
   - Medium models (7-8B): ~8-16GB RAM
   - Large models (13B+): ~16-32GB RAM

## Cost Comparison

- **OpenAI GPT-4o**: ~$5-10 per evaluation task
- **Ollama (local)**: $0.00 per task ✅

## Current Deployment Status

**Green Agent** (`13.221.65.97:8080`):
- Uses OpenAI (gpt-4o) - doesn't need LLM, it's the evaluator

**White Agent** (`3.236.141.209:8080`):
- Currently using OpenAI (gpt-4o)
- Can be switched to Ollama by following steps above




