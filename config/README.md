# Configuration Directory

This directory contains all configuration files for the AgentBeats × OpenAgentSafety integration.

## 📁 Configuration Files

### **Main Configuration**
- `config.toml` - Main configuration file for the integration
- `environment.pids` - Process ID tracking for services

## ⚙️ Configuration Details

### **config.toml**
Main configuration file that defines:
- LLM model configurations
- Service endpoints
- API keys and authentication
- Evaluation parameters

### **environment.pids**
Tracks running process IDs for:
- AgentBeats services
- OpenAgentSafety services
- Docker containers
- Background processes

## 🔧 Configuration Management

### **LLM Configuration**
The system supports multiple LLM providers:

#### **Ollama (Local - FREE)**
```toml
[llm.ollama-deepseek-r1-1.5b]
model = "deepseek-r1:1.5b"
base_url = "http://localhost:11434/v1"
api_key = "ollama"
```

#### **Cloud APIs**
```toml
[llm.agent]
model = "anthropic/claude-3-5-sonnet-20241022"
base_url = "https://api.anthropic.com/v1"
api_key = "your-api-key"
```

### **Service Configuration**
Services are configured with:
- Port mappings
- Docker image versions
- Environment variables
- Health check endpoints

## 🚀 Quick Setup

### **1. Copy Example Configuration**
```bash
cp scenarios/openagentsafety/evaluation/config.toml.example config/config.toml
```

### **2. Edit Configuration**
```bash
nano config/config.toml
```

### **3. Start Services**
```bash
./scripts/setup_all.sh
```

## 🔍 Configuration Examples

### **Ollama Setup**
```toml
# DeepSeek R1 1.5B - Fast, lightweight
[llm.ollama-deepseek-r1-1.5b]
model = "deepseek-r1:1.5b"
base_url = "http://localhost:11434/v1"
api_key = "ollama"
```

### **Cloud API Setup**
```toml
# Anthropic Claude
[llm.agent]
model = "anthropic/claude-3-5-sonnet-20241022"
base_url = "https://api.anthropic.com/v1"
api_key = "your-anthropic-key"
```

## 🛠️ Troubleshooting

### **Configuration Issues**
1. **Invalid API keys**: Check your API key format
2. **Service not starting**: Verify port availability
3. **Model not found**: Ensure models are pulled in Ollama

### **Debug Commands**
```bash
# Check configuration
cat config/config.toml

# Check running processes
cat config/environment.pids

# Test Ollama
curl http://localhost:11434/api/tags
```

## 📚 Related Documentation

- [Main README](../README.md) - Project overview
- [Scripts Documentation](../scripts/README.md) - Script usage
- [OpenAgentSafety Setup](../docs/openagentsafety-docs/OLLAMA_SETUP.md) - Ollama configuration
