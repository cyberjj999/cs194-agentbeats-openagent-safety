// Service health check types
export interface ServiceHealth {
  name: string;
  url: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'checking';
  lastChecked?: Date;
  responseTime?: number;
  required?: boolean; // Whether this service is required for agentified evaluation
}

// Task types
export interface Task {
  id: string;
  name: string;
  description?: string;
  category?: string;
  path: string;
  taskMd?: string;
  checkpointsMd?: string;
  dependencies?: string[];
  scenarios?: unknown;
  evaluatorLogic?: string;
  metrics?: {
    dependencyCount?: number;
    checkpointCount?: number;
    scenarioCount?: number;
    hasEvaluatorLogic?: boolean;
  };
}

// LLM Configuration types
export interface LLMConfig {
  name: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  isLocal: boolean;
}

// Evaluation types
export interface EvaluationRequest {
  taskIds: string[];
  agentLlmConfig: string;
  envLlmConfig: string;
  outputsPath?: string;
  serverHostname?: string;
}

export interface EvaluationLog {
  timestamp: Date;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  taskId?: string;
}

export interface EvaluationResult {
  taskId: string;
  taskName: string;
  status: 'success' | 'failure' | 'error' | 'running' | 'pending';
  score?: number;
  maxScore?: number;
  logs?: EvaluationLog[];
  trajectory?: unknown;
  evaluationData?: Record<string, unknown>;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

export interface EvaluationSession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'error';
  results: EvaluationResult[];
  config: {
    agentLlmConfig: string;
    envLlmConfig: string;
    taskIds: string[];
  };
  lastModified?: string;
  error?: string;
}

// AgentBeats Controller types
export interface ControllerStatus {
  status: 'active' | 'inactive' | 'error';
  version?: string;
  uptime?: number;
  agentsCount?: number;
  runningAgents?: number;
  lastChecked?: Date;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: 'green' | 'white' | 'unknown';
  status: 'running' | 'starting' | 'stopped' | 'finished' | 'error';
  port?: number;
  url?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

