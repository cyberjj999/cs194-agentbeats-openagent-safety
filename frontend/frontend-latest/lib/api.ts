import { ServiceHealth, Task, LLMConfig, EvaluationResult, ControllerStatus, AgentInfo } from './types';

// Service endpoints to check
// NOTE: OpenAgentSafety benchmark tasks require ALL services to be running:
// - Tasks involve NPCs (non-player characters) that interact via RocketChat
// - Tasks require GitLab for code repositories
// - Tasks require ownCloud for file storage
// - Tasks require Plane for project management
// - Tasks run in Docker containers that need to connect to these services
// - The API server orchestrates all services and provides health checks
// NOTE: AgentBeats Controller is required - used for managing agentified agents via web UI
const SERVICES: Omit<ServiceHealth, 'status' | 'lastChecked' | 'responseTime'>[] = [
  { name: 'Ollama Server (REQUIRED)', url: 'http://localhost:11434', port: 11434, required: true },
  { name: 'OAS API Server (REQUIRED)', url: 'http://localhost:2999', port: 2999, required: true },
  { name: 'RocketChat (REQUIRED)', url: 'http://localhost:3000', port: 3000, required: true },
  { name: 'GitLab (REQUIRED)', url: 'http://localhost:8929', port: 8929, required: true },
  { name: 'ownCloud (REQUIRED)', url: 'http://localhost:8092', port: 8092, required: true },
  { name: 'Plane (REQUIRED)', url: 'http://localhost:8091', port: 8091, required: true },
  // AgentBeats Controller (required - for agentified agent management)
  { name: 'AgentBeats Controller (REQUIRED)', url: 'http://localhost:8080/status', port: 8080, required: true },
  // Legacy AgentBeats services (only shown if running - checked dynamically in API route)
  { name: 'AgentBeats Backend', url: 'http://localhost:9000', port: 9000, required: false },
  { name: 'AgentBeats MCP', url: 'http://localhost:9001', port: 9001, required: false },
];

// Health check functions
// NOTE: These now call the server-side API route to avoid CORS issues
export async function checkAllServices(): Promise<ServiceHealth[]> {
  try {
    const response = await fetch('/api/services');
    if (!response.ok) throw new Error('Failed to fetch service health');
    return await response.json();
  } catch (error) {
    console.error('Error checking services:', error);
    // Return all services as unhealthy on error
    return SERVICES.map(service => ({
      ...service,
      status: 'unhealthy' as const,
      lastChecked: new Date(),
      responseTime: 0,
      required: service.required ?? false,
    }));
  }
}

// Task management functions
export async function getAllTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export async function getTaskDetails(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`);
    if (!response.ok) throw new Error('Failed to fetch task details');
    return await response.json();
  } catch (error) {
    console.error('Error fetching task details:', error);
    return null;
  }
}

// LLM configuration functions
export async function getLLMConfigs(): Promise<LLMConfig[]> {
  try {
    const response = await fetch('/api/llm-configs');
    if (!response.ok) throw new Error('Failed to fetch LLM configs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching LLM configs:', error);
    return [];
  }
}

// Evaluation functions
export async function startEvaluation(
  taskIds: string[],
  agentLlmConfig: string,
  envLlmConfig: string
): Promise<{ sessionId: string }> {
  const response = await fetch('/api/evaluation/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskIds,
      agentLlmConfig,
      envLlmConfig,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to start evaluation');
  }
  
  return await response.json();
}

export async function getEvaluationResults(sessionId: string): Promise<EvaluationResult[]> {
  try {
    const response = await fetch(`/api/evaluation/${sessionId}/results`);
    if (!response.ok) throw new Error('Failed to fetch evaluation results');
    return await response.json();
  } catch (error) {
    console.error('Error fetching evaluation results:', error);
    return [];
  }
}

export async function exportEvaluationResults(sessionId: string): Promise<Blob> {
  const response = await fetch(`/api/evaluation/${sessionId}/export`);
  if (!response.ok) throw new Error('Failed to export results');
  return await response.blob();
}

// AgentBeats Controller functions
export async function getControllerStatus(): Promise<ControllerStatus | null> {
  try {
    const response = await fetch('/api/controller/status');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching controller status:', error);
    return null;
  }
}

export async function getControllerAgents(): Promise<AgentInfo[]> {
  try {
    const response = await fetch('/api/controller/agents');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching controller agents:', error);
    return [];
  }
}

