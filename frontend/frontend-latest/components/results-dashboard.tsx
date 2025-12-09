'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  Eye,
  Download,
  Filter,
  Shield,
  RefreshCw
} from 'lucide-react';
import EvaluationSessionBrowser from './evaluation-session-browser';
import BenchmarkUpload from './benchmark-upload';
import type { EvaluationSession } from '@/lib/types';

interface TaskResult {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'running' | 'pending';
  duration: number;
  timestamp: string;
  agentLlm: string;
  environmentLlm: string;
  prompt: string;
  response: string;
  score: number;
  metrics: {
    safetyScore: number;
    complianceScore: number;
    efficiencyScore: number;
  };
}


const COLORS = {
  success: '#10b981',
  failure: '#ef4444',
  running: '#f59e0b',
  pending: '#6b7280'
};

const ResultsDashboard: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<EvaluationSession | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState<EvaluationSession[]>([]);
  const [loadedBenchmarks, setLoadedBenchmarks] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Get active tab from URL params, default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  // Handle benchmark upload
  const handleBenchmarkLoad = (sessions: EvaluationSession[], name: string) => {
    setAllSessions(prev => [...prev, ...sessions]);
    setLoadedBenchmarks(prev => [...prev, name]);
  };

  const handleBenchmarkRemove = (name: string) => {
    setAllSessions(prev => prev.filter(session => !session.name.includes(name)));
    setLoadedBenchmarks(prev => prev.filter(benchmark => benchmark !== name));
  };

  // Handle tab changes and update URL
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Compute summary from results
  // All data comes from actual evaluation result files parsed from backend logs
  const getSessionSummary = (session: EvaluationSession) => {
    // Total tasks = number of result files (one per task)
    // This is accurate - each task generates one eval_{task_name}.json file
    const totalTasks = session.results.length;
    
    // Count successes/failures based on status from evaluation results
    // Status is determined by 'success' field in result JSON: success=true -> 'success', success=false -> 'failure'
    // This is accurate - comes directly from backend evaluation results
    const successful = session.results.filter(r => r.status === 'success').length;
    const failed = session.results.filter(r => r.status === 'failure' || r.status === 'error').length;
    
    // Average score from individual task scores (0-100 scale)
    // Score is set to 100 for success, 0 for failure in parseAndSaveResults
    const averageScore = totalTasks > 0 
      ? session.results.reduce((sum, r) => sum + (r.score || 0), 0) / totalTasks 
      : 0;
    
    // Total duration: Use session-level wall-clock time if available, otherwise sum task durations
    // Session duration (endTime - startTime) is more accurate as it represents actual elapsed wall-clock time
    // Task durations are individual task execution times tracked by backend (time_used in seconds)
    // If tasks run sequentially, sum of task durations ≈ session duration
    // If tasks run in parallel, session duration < sum of task durations
    const sessionDuration = session.endTime && session.startTime
      ? (session.endTime.getTime() - session.startTime.getTime()) / 1000 // Convert ms to seconds
      : undefined;
    const totalDuration = sessionDuration !== undefined 
      ? sessionDuration 
      : session.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    return {
      totalTasks,
      successful,
      failed,
      averageScore,
      totalDuration // in seconds
    };
  };

  // Load real evaluation sessions first, then benchmark sessions as fallback
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        // Load real evaluation sessions first
        console.log('Loading real evaluation sessions...');
        const response = await fetch('/api/evaluation-sessions');
        if (!response.ok) {
          throw new Error('Failed to load evaluation sessions');
        }
        
        const sessionsData = await response.json();
        
        // Convert API data to our format
        const sessions: EvaluationSession[] = await Promise.all(
          sessionsData.map(async (session: Record<string, unknown>) => {
            // Load task results for this session
            const tasksResponse = await fetch(`/api/evaluation/${session.id}/results`);
            const tasksData = tasksResponse.ok ? await tasksResponse.json() : [];
            
            const tasks: TaskResult[] = tasksData.map((task: Record<string, unknown>) => {
              const evalData = (task.evaluationData as Record<string, unknown>) || {};
              const metrics = (evalData.metrics as Record<string, unknown>) || {};
              
              return {
                id: (task.taskId as string) || (task.id as string) || 'unknown',
                name: (task.taskName as string) || (task.name as string) || (task.taskId as string) || 'Unknown Task',
                status: (task.status as string) || 'pending',
                duration: (metrics.response_time as number) || (task.duration as number) || (evalData.time_used as number) || 0,
                timestamp: (evalData.timestamp as string) || (task.timestamp as string) || (session.startTime as string),
                agentLlm: ((session.config as Record<string, unknown>)?.agentLlmConfig as string) || 'unknown',
                environmentLlm: ((session.config as Record<string, unknown>)?.envLlmConfig as string) || 'unknown',
                prompt: (evalData.task_description as string) || (task.prompt as string) || 'Task description not available',
                response: (evalData.agent_response as string) || (task.response as string) || 'No response available',
                score: (task.score as number) || 0,
                metrics: {
                  safetyScore: (evalData.safety_score as number) || (metrics.safetyScore as number) || 0,
                  complianceScore: (evalData.compliance_score as number) || (metrics.complianceScore as number) || 0,
                  efficiencyScore: (evalData.efficiency_score as number) || (metrics.efficiencyScore as number) || 0
                }
              };
            });
            
            return {
              id: session.id as string,
              name: session.name as string,
              startTime: new Date(session.startTime as string),
              endTime: session.endTime ? new Date(session.endTime as string) : undefined,
              status: session.status as 'running' | 'completed' | 'failed' | 'error',
              results: tasks.map(task => ({
                taskId: task.id,
                taskName: task.name,
                status: task.status as 'success' | 'failure' | 'error' | 'running' | 'pending',
                score: task.score,
                duration: task.duration, // Individual task duration in seconds (from time_used field)
                startTime: new Date(task.timestamp),
                endTime: new Date(task.timestamp),
                logs: [],
                trajectory: {},
                evaluationData: { metrics: task.metrics }
              })),
              config: {
                // Get config from session metadata, not from tasks
                agentLlmConfig: ((session.config as Record<string, unknown>)?.agentLlmConfig as string) || 'unknown',
                envLlmConfig: ((session.config as Record<string, unknown>)?.envLlmConfig as string) || 'unknown',
                taskIds: tasks.map(t => t.id)
              }
            };
          })
        );
        
        // Show all sessions, including running ones
        if (sessions.length > 0) {
          setAllSessions(sessions);
          // Select the most recent session (first in the list, as they're typically sorted by date)
          setSelectedSession(sessions[0]);
          setLoading(false);
          return;
        }
        
        // Fallback to benchmark results only if no real evaluation sessions exist
        console.log('No real evaluation sessions found, checking for benchmark results...');
        const { loadBenchmarkResults } = await import('@/lib/benchmark-converter');
        const benchmarkSessions = await loadBenchmarkResults();
        if (benchmarkSessions.length > 0) {
          setAllSessions(benchmarkSessions);
          setSelectedSession(benchmarkSessions[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading evaluation sessions:', error);
        // Try to load benchmark results as last resort
        try {
          const { loadBenchmarkResults } = await import('@/lib/benchmark-converter');
          const benchmarkSessions = await loadBenchmarkResults();
          if (benchmarkSessions.length > 0) {
            setAllSessions(benchmarkSessions);
            setSelectedSession(benchmarkSessions[0]);
          }
        } catch (benchmarkError) {
          console.error('Error loading benchmark results:', benchmarkError);
        }
        setLoading(false);
      }
    };
    
    loadSessions();
  }, [refreshTrigger]);

  // Refresh when component becomes visible (e.g., after evaluation completion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    const handleEvaluationCompleted = () => {
      // Refresh when evaluation completes
      setRefreshTrigger(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('evaluation-completed', handleEvaluationCompleted);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('evaluation-completed', handleEvaluationCompleted);
    };
  }, []);

  // Refresh when component mounts (e.g., when switching to results tab)
  // Use a ref to track if this is the initial mount to avoid infinite loops
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Trigger initial refresh
      setRefreshTrigger(prev => prev + 1);
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failure': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pieData = selectedSession ? [
    { name: 'Successful', value: getSessionSummary(selectedSession).successful, color: COLORS.success },
    { name: 'Failed', value: getSessionSummary(selectedSession).failed, color: COLORS.failure }
  ] : [];

  const barData = selectedSession ? selectedSession.results.map(result => ({
    name: result.taskName.split('-').slice(1).join(' '),
    score: result.score || 0,
    duration: result.duration || 0,
    status: result.status
  })) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Evaluation Results</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of agent safety evaluations
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>PASSED</strong> = Agent avoided safety violations (passed safety checkpoints)<br/>
              <strong>FAILED</strong> = Agent committed safety violations (failed safety checkpoints)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* File Upload Section */}
      <BenchmarkUpload
        onBenchmarkLoad={handleBenchmarkLoad}
        onBenchmarkRemove={handleBenchmarkRemove}
        loadedBenchmarks={loadedBenchmarks}
      />

      {/* Session Selector */}
      <EvaluationSessionBrowser
        onSessionSelect={(session) => setSelectedSession(session)}
        selectedSessionId={selectedSession?.id}
        sessions={allSessions}
        onSessionDeleted={() => {
          // Clear selection if the deleted session was selected
          setSelectedSession(null);
          // Refresh the sessions list
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {selectedSession && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getSessionSummary(selectedSession).totalTasks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {getSessionSummary(selectedSession).successful}/{getSessionSummary(selectedSession).totalTasks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getSessionSummary(selectedSession).successful} passed, {getSessionSummary(selectedSession).failed} failed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Safety Result</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {getSessionSummary(selectedSession).successful} of {getSessionSummary(selectedSession).totalTasks} tasks passed safety checkpoints
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const totalSeconds = getSessionSummary(selectedSession).totalDuration;
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    if (hours > 0) {
                      return `${hours}h ${minutes}m`;
                    } else {
                      return `${minutes}m`;
                    }
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Task Details</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="upload">Upload Results</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Success/Failure Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Results</CardTitle>
                    <CardDescription>Success vs Failure distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Task Performance Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Performance</CardTitle>
                    <CardDescription>Score and duration by task</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="score" fill="#3b82f6" name="Score (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Task Results</CardTitle>
                  <CardDescription>Detailed results for each task</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedSession.results.map((result) => (
                      <Card key={result.taskId} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <h4 className="font-semibold">{result.taskName}</h4>
                              <p className="text-sm text-muted-foreground">
                                Duration: {result.duration || 0}s | Score: {result.score || 0}%
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTask(result as unknown as TaskResult)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                        
                        {/* Result Status */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Result:</span>
                            <Badge className={result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {result.status === 'success' ? 'PASSED' : 'FAILED'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Safety:</span>
                            <Badge className={result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {result.status === 'success' ? 'PASSED' : 'FAILED'}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Safety Scores</CardTitle>
                    <CardDescription>Safety performance across tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="score" fill="#10b981" name="Safety Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Execution Time</CardTitle>
                    <CardDescription>Task duration analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="duration" stroke="#f59e0b" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <BenchmarkUpload
                onBenchmarkLoad={handleBenchmarkLoad}
                onBenchmarkRemove={handleBenchmarkRemove}
                loadedBenchmarks={loadedBenchmarks}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTask.name}</CardTitle>
                  <CardDescription>
                    Task ID: {selectedTask.id} | Status: {selectedTask.status}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Task Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedTask.status === 'success' ? 'PASSED' : 'FAILED'}
                  </div>
                  <div className="text-sm text-blue-600">Overall Result</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedTask.status === 'success' ? 'PASSED' : 'FAILED'}
                  </div>
                  <div className="text-sm text-green-600">Safety Result</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{selectedTask.duration}s</div>
                  <div className="text-sm text-orange-600">Duration</div>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <h4 className="font-semibold mb-2">Task Prompt</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                  {selectedTask.prompt}
                </div>
              </div>

              {/* Response */}
              <div>
                <h4 className="font-semibold mb-2">Agent Response</h4>
                <div className="bg-green-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTask.response}
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Agent LLM:</span>
                  <span className="ml-2">{selectedTask.agentLlm}</span>
                </div>
                <div>
                  <span className="font-medium">Environment LLM:</span>
                  <span className="ml-2">{selectedTask.environmentLlm}</span>
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span>
                  <span className="ml-2">{new Date(selectedTask.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
