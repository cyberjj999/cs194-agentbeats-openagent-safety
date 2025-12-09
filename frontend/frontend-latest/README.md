# AgentBeats × OpenAgentSafety Frontend

A beautiful, modern Next.js frontend for the AgentBeats × OpenAgentSafety integration, built with Next.js, MagicUI, and Framer Motion.

## Features

- ✅ **Service Health Monitoring** - Real-time health checks for all services (AgentBeats Controller, Backend, MCP, OpenAgentSafety services)
- 🤖 **Model Selection** - Easy selection of LLM configurations (Ollama local models and cloud APIs)
- 📋 **Task Browser** - Browse, filter, and view details of 356+ safety tasks
- 🎯 **Multi-Task Selection** - Select one or multiple tasks for batch evaluation
- ▶️ **Evaluation Runner** - Start evaluations with real-time logs and progress tracking
- 📊 **Results Viewer** - View success/failure cases with detailed information
- 💾 **Export Functionality** - Export evaluation results as JSON
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **shadcn/ui** - High-quality UI components

## Getting Started

### Prerequisites

1. Ensure all backend services are running:
   ```bash
   cd /path/to/agentbeats-openagentsafety-integration
   ./setup_all.sh
   ```

2. Configure LLMs:
   ```bash
   cd scenarios/openagentsafety/evaluation
   cp config.toml.example config.toml
   # Edit config.toml with your API keys or use Ollama
   ```

### Installation

```bash
cd frontend-nextjs
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_API_SERVER_URL=http://localhost:2999
NEXT_PUBLIC_CONTROLLER_URL=http://localhost:8080  # AgentBeats Controller (optional)
```

## Usage

### 1. Dashboard

- View service health status
- See overall statistics
- Quick start guide

### 2. Configure

- **Select Agent LLM**: Choose the LLM for the agent being evaluated
- **Select Environment LLM**: Choose the LLM for NPCs and evaluators
- **Browse Tasks**: Search, filter, and select tasks by category
- **View Task Details**: See task descriptions, checkpoints, and dependencies

### 3. Evaluate

- Start evaluation with selected tasks and configurations
- Monitor real-time logs
- View results as they complete
- Export results for further analysis

## Project Structure

```
frontend-nextjs/
├── app/
│   ├── api/                    # Next.js API routes
│   │   ├── tasks/             # Task management
│   │   ├── llm-configs/       # LLM configuration
│   │   └── evaluation/        # Evaluation management
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── service-health-check.tsx
│   ├── model-selector.tsx
│   ├── task-browser.tsx
│   └── evaluation-runner.tsx
├── lib/
│   ├── api.ts                 # API client
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utility functions
└── evaluation-sessions/        # Evaluation results storage
```

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/[taskId]` - Get task details

### LLM Configs
- `GET /api/llm-configs` - Get available LLM configurations

### Evaluation
- `POST /api/evaluation/start` - Start evaluation
- `GET /api/evaluation/[sessionId]/results` - Get results
- `GET /api/evaluation/[sessionId]/logs` - Get logs
- `GET /api/evaluation/[sessionId]/export` - Export results

## Features in Detail

### Service Health Monitoring

Real-time monitoring of:
- **Required Services:**
  - OAS API Server (port 2999)
  - RocketChat (port 3000)
  - GitLab (port 8929)
  - ownCloud (port 8092)
  - Plane (port 8091)
  - Ollama Server (port 11434)
- **Optional Services (AgentBeats Integration):**
  - AgentBeats Controller (port 8080) - For agentified agent management
  - AgentBeats Backend (port 9000) - Legacy AgentBeats platform
  - AgentBeats MCP (port 9001) - Legacy AgentBeats platform

Auto-refreshes every 30 seconds with visual indicators.

### Task Browser

- **Search**: Search tasks by name
- **Filter**: Filter by category (Data Leakage, Compliance, Security, etc.)
- **Multi-select**: Select multiple tasks for batch evaluation
- **Details View**: View task.md, checkpoints.md, and dependencies
- **Smooth Animations**: Framer Motion animations for better UX

### Evaluation Runner

- Real-time log streaming
- Progress tracking
- Success/failure indicators
- Export results as JSON
- Session management

## Troubleshooting

### Services Not Healthy

1. Ensure all backend services are running:
   ```bash
   ./setup_all.sh
   ```

2. Check service logs:
   ```bash
   docker ps
   docker logs <container-name>
   ```

### Tasks Not Loading

Ensure the tasks directory exists:
```bash
ls scenarios/openagentsafety/workspaces/tasks/
```

### LLM Configs Not Found

Create and configure the config file:
```bash
cd scenarios/openagentsafety/evaluation
cp config.toml.example config.toml
# Edit config.toml
```

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License - see LICENSE file for details
