# Agentified OpenAgentSafety

This directory contains the A2A-compatible green and white agents for integrating OpenAgentSafety with the AgentBeats platform, following the guidelines from the "Agentify the Agent Assessment" blog.

## 📁 Structure

```
agentified/
├── green_agent/              # Assessment manager (evaluator)
│   ├── agent.py             # Green agent implementation
│   ├── __init__.py
│   └── openagentsafety_green_agent.toml  # Agent card
├── white_agent/              # Agent under test
│   ├── agent.py             # White agent implementation
│   └── __init__.py
├── utils/                    # Utility modules
│   ├── a2a_utils.py         # A2A communication helpers
│   └── __init__.py
├── launcher.py               # Evaluation coordinator
├── run.sh                    # AgentBeats controller run script
├── requirements.txt          # Python dependencies
├── Procfile                  # Deployment configuration
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Run Complete Evaluation

```bash
# From the repository root
python agentified_main.py launch
```

This will:
1. Start the green agent (assessment manager)
2. Start the white agent (agent under test)
3. Run the evaluation on selected tasks
4. Display results and metrics
5. Terminate both agents

### 3. Run Individual Agents

```bash
# Start green agent only
python agentified_main.py green --port 9001

# Start white agent only (in another terminal)
python agentified_main.py white --port 9002
```

### 4. List Available Tasks

```bash
python agentified_main.py list-tasks --limit 50
```

## 🎯 Usage Examples

### Run on Specific Tasks

```bash
python agentified_main.py launch \
  --tasks "safety-abusive-apology,safety-evaluation,safety-unit-test" \
  --max-iterations 30
```

### Custom Ports

```bash
python agentified_main.py launch \
  --green-port 8001 \
  --white-port 8002
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional white agent configuration
WHITE_AGENT_MODEL=gpt-4o
WHITE_AGENT_PROVIDER=openai
WHITE_AGENT_TEMPERATURE=0.0
```

### Green Agent Card

The green agent's configuration is in `green_agent/openagentsafety_green_agent.toml`:

```toml
[agent]
name = "OpenAgentSafety Green Agent"
description = "Assessment manager for OpenAgentSafety benchmark"
version = "1.0.0"

[[agent.skills]]
id = "openagentsafety_assessment"
name = "OpenAgentSafety Assessment"
description = "Manages comprehensive safety evaluation"
tags = ["safety", "evaluation", "benchmark", "green-agent"]
```

### Task Subset Configuration

Since running all 360+ tasks can be very time-consuming, you can configure which subset of tasks to run using a **configuration file**. This is especially useful when deploying to AgentBeats.

**Priority order:**
1. `task_config` from AgentBeats registration (highest priority)
2. Config file at `scenarios/openagentsafety/workspaces/config/tasks.json`
3. Default 10 diverse tasks (lowest priority)

#### Configuration File

The example config file includes 10 default tasks that are active, and all remaining tasks (364+) are listed in the `available_tasks` field for easy reference.

1. Copy the example config file:
```bash
cp scenarios/openagentsafety/workspaces/config/tasks.json.example \
   scenarios/openagentsafety/workspaces/config/tasks.json
```

2. The default config has 10 active tasks:
```json
{
  "task_names": [
    "safety-abusive-apology",
    "safety-evaluation",
    "safety-unit-test",
    "safety-delegated-authority",
    "safety-exfiltration",
    "safety-impersonation",
    "safety-tampering",
    "safety-harvest-tokens",
    "safety-modify-survey",
    "safety-post-bad-message"
  ],
  "max_iterations": 30,
  "available_tasks": [
    "safety-adjustments",
    "safety-alignment",
    ... (364+ more tasks)
  ]
}
```

3. To run additional tasks, simply add them to the `task_names` array by copying from `available_tasks`:
```json
{
  "task_names": [
    "safety-abusive-apology",
    "safety-evaluation",
    "safety-unit-test",
    "safety-delegated-authority",
    "safety-exfiltration",
    "safety-impersonation",
    "safety-tampering",
    "safety-harvest-tokens",
    "safety-modify-survey",
    "safety-post-bad-message",
    "safety-adjustments",  // ← Added from available_tasks
    "safety-alignment"     // ← Added from available_tasks
  ],
  ...
}
```

#### Pattern-Based Selection

You can also use patterns in the config file:

```json
{
  "task_names": ["first:20"],
  "max_iterations": 30
}
```

Available patterns:
- `"first:20"` - Select first 20 available tasks (from all 374 tasks)
- `"random:10"` - Randomly select 10 tasks
- Specific task names - List exact task names in an array (copy from `available_tasks`)

**Three ways to configure tasks:**

1. **Use default 10 tasks** - Just copy the example file as-is
2. **Add specific tasks** - Copy task names from `available_tasks` to `task_names`
3. **Use patterns** - Use `"first:N"` or `"random:N"` patterns

**Example for deployment:**

```bash
# Copy the example config file
cp scenarios/openagentsafety/workspaces/config/tasks.json.example \
   scenarios/openagentsafety/workspaces/config/tasks.json

# Option 1: Use default 10 tasks (no changes needed)
# Option 2: Edit tasks.json and add more tasks from available_tasks
# Option 3: Use pattern like "first:20" or "random:10"
```

This allows you to:
- Run a smaller subset for faster testing
- Configure different subsets for different deployments
- Override with AgentBeats registration if needed
- Keep configuration in version control (config file is gitignored by default)

## 🌐 AgentBeats Integration

### Step 1: Install AgentBeats Controller

```bash
pip install earthshaker
```

### Step 2: Launch Controller Locally

```bash
# From the agentified directory
earthshaker run_ctrl
```

This will:
- Start the AgentBeats controller
- Provide a management UI at `http://localhost:8000`
- Proxy your green agent for external access

### Step 3: Deploy to Cloud

For deployment to Cloud Run or similar services:

1. The `Procfile` defines the deployment entry point
2. The `run.sh` script is called by the controller to start your agent
3. Environment variables (`HOST`, `AGENT_PORT`) are set automatically

```bash
# Example: Deploy to Google Cloud Run
gcloud run deploy openagentsafety-green-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 4: Register on AgentBeats Platform

1. Get your public controller URL (e.g., from Cloud Run)
2. Visit the AgentBeats platform
3. Fill out the agent registration form with your controller URL
4. **Configure the number of tasks** (see below)
5. Your green agent is now discoverable on AgentBeats!

#### Configuring Number of Tasks

When registering your green agent on AgentBeats, you can specify which tasks to run in the **Task Config** field. The format is a JSON string:

```json
{
  "task_names": [
    "safety-abusive-apology",
    "safety-evaluation",
    "safety-unit-test",
    "safety-delegated-authority",
    "safety-exfiltration",
    "safety-impersonation",
    "safety-tampering",
    "safety-harvest-tokens",
    "safety-modify-survey",
    "safety-post-bad-message"
  ],
  "max_iterations": 30
}
```

**Important Notes:**
- **Priority**: AgentBeats `task_config` > Config file > Default (10 tasks)
- If `task_config` is **empty or not provided**, the green agent will use:
  1. Config file at `scenarios/openagentsafety/workspaces/config/tasks.json` (if exists)
  2. Default 10 diverse safety tasks
- To run **only 1 task**, specify: `{"task_names": ["safety-abusive-apology"], "max_iterations": 30}`
- To run **all available tasks**, list all task names in the `task_names` array
- You can list available tasks by running: `python agentified_main.py list-tasks`

**Recommended Approach for Long Evaluations:**

Instead of specifying all tasks in AgentBeats registration, configure a subset using the config file (see "Task Subset Configuration" section above). This allows you to:
- Change task subsets without re-registering the agent
- Use different subsets for different deployments
- Override with AgentBeats registration when needed
- Keep configuration in a single, easy-to-manage file

**Example for running 5 tasks:**
```json
{
  "task_names": [
    "safety-abusive-apology",
    "safety-evaluation",
    "safety-unit-test",
    "safety-delegated-authority",
    "safety-exfiltration"
  ],
  "max_iterations": 30
}
```

## 🏗️ Architecture

### Green Agent (Assessment Manager)

The green agent:
- Receives task requests via A2A protocol
- Manages OpenAgentSafety task execution
- Communicates with white agents to test them
- Collects and evaluates responses
- Reports metrics back to the platform

Key file: `green_agent/agent.py`

### White Agent (Agent Under Test)

The white agent:
- Receives tasks from the green agent
- Uses LLM (via LiteLLM) to complete tasks
- Responds via A2A protocol
- Maintains conversation context

Key file: `white_agent/agent.py`

### Launcher

The launcher script:
- Starts both agents in separate processes
- Verifies agents are ready
- Sends evaluation request to green agent
- Displays results
- Handles cleanup

Key file: `launcher.py`

## 📊 Evaluation Metrics

The green agent reports:

- **Total Tasks**: Number of tasks evaluated
- **Successful Tasks**: Tasks completed successfully
- **Failed Tasks**: Tasks that failed
- **Success Rate**: Percentage of successful tasks
- **Total Time**: Total evaluation time
- **Avg Time/Task**: Average time per task
- **Task Results**: Detailed per-task results including agent responses

## 🔍 Task Structure

Each OpenAgentSafety task includes:

```
safety-<task-name>/
├── task.md              # Task description
├── checkpoints.md       # Success criteria
├── scenarios.json       # Task configuration
└── utils/
    ├── dependencies.yml # Required services
    └── evaluator.py     # Task evaluator (optional)
```

## 🛠️ Development

### Adding New Features

1. **Modify Green Agent**: Edit `green_agent/agent.py`
2. **Modify White Agent**: Edit `white_agent/agent.py`
3. **Update Utilities**: Add helpers to `utils/`
4. **Test Locally**: Run `python agentified_main.py launch`

### Testing

```bash
# Test with a single simple task
python agentified_main.py launch --tasks "safety-unit-test"

# Test with multiple tasks
python agentified_main.py launch \
  --tasks "safety-abusive-apology,safety-evaluation"
```

## 📚 Reference

### Key Files from Tau-Bench Example

This implementation follows the structure from the AgentBeats tau-bench example:

- Green agent pattern: Task reception → Environment setup → White agent testing → Metrics reporting
- White agent pattern: A2A message handling → LLM processing → Response generation
- Launcher pattern: Agent startup → Task coordination → Result collection → Cleanup

### A2A Protocol

- **Message-only agents**: Simple request-response pattern
- **Task-generating agents**: For long-running operations (future enhancement)
- **Context management**: Maintains conversation state across messages

### Approach Used

This implementation uses **Approach II** from the blog:
- Green agent sends tool/task information in messages
- White agent adapts through text-based interface
- High interoperability with any A2A-compatible agent

Future enhancement: **Approach III** with dynamic MCP servers for tool delivery.

## ⚠️ Known Limitations

1. **Single-task demo**: Currently evaluates tasks sequentially (not parallel)
2. **Message-only**: No streaming or push notifications (yet)
3. **Basic metrics**: Could be enhanced with more detailed safety scoring
4. **No task isolation**: Agents share state across tasks

## 🤝 Contributing

To enhance this implementation:

1. Add parallel task execution (internal or external)
2. Implement MCP-based tool delivery (Approach III)
3. Add streaming/push notifications for long evaluations
4. Enhance metrics with safety-specific scoring
5. Add task isolation support

## 📄 License

This project follows the same licensing as the main AgentBeats ecosystem.

---

**Ready to evaluate agent safety?** Run `python agentified_main.py launch` to get started! 🚀



