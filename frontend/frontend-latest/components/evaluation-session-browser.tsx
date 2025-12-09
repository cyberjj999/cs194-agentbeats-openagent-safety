'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle, 
  FileText,
  Download,
  RefreshCw,
  Trash2
} from 'lucide-react';
import type { EvaluationSession } from '@/lib/types';
import { loadBenchmarkResults } from '@/lib/benchmark-converter';


interface EvaluationSessionBrowserProps {
  onSessionSelect: (session: EvaluationSession) => void;
  selectedSessionId?: string;
  sessions?: EvaluationSession[];
  onSessionDeleted?: () => void;
}

const EvaluationSessionBrowser: React.FC<EvaluationSessionBrowserProps> = ({ 
  onSessionSelect, 
  selectedSessionId,
  sessions: propSessions,
  onSessionDeleted
}) => {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Compute summary from results
  const getSessionSummary = (session: EvaluationSession) => {
    // Safety check for results array
    if (!session.results || !Array.isArray(session.results)) {
      return {
        totalTasks: 0,
        successful: 0,
        failed: 0,
        averageScore: 0,
        totalDuration: 0
      };
    }
    
    const totalTasks = session.results.length;
    const successful = session.results.filter(r => r.status === 'success').length;
    const failed = session.results.filter(r => r.status === 'failure' || r.status === 'error').length;
    const averageScore = totalTasks > 0 ? session.results.reduce((sum, r) => sum + (r.score || 0), 0) / totalTasks : 0;
    const totalDuration = session.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    return {
      totalTasks,
      successful,
      failed,
      averageScore,
      totalDuration
    };
  };
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use prop sessions if available
      if (propSessions && propSessions.length > 0) {
        setSessions(propSessions);
        setLoading(false);
        return;
      }
      
      // Always use benchmark results for demonstration
      const benchmarkSessions = await loadBenchmarkResults();
      if (benchmarkSessions.length > 0) {
        setSessions(benchmarkSessions);
        return;
      }
      
      // Fallback to real evaluation sessions if no benchmark data
      const response = await fetch('/api/evaluation-sessions');
      if (response.ok) {
        const sessionsData = await response.json();
        // Show all sessions, including running ones
        if (sessionsData.length > 0) {
          setSessions(sessionsData);
          return;
        }
      }
    } catch (err) {
      console.error('Error loading evaluation sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [propSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (propSessions && propSessions.length > 0) {
      setSessions(propSessions);
      setLoading(false);
    }
  }, [propSessions]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete this evaluation run?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingSessionId(sessionId);
    
    try {
      const response = await fetch(`/api/evaluation/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If the deleted session was selected, clear selection
      if (selectedSessionId === sessionId) {
        // Don't call onSessionSelect with undefined, just let parent handle it
      }

      // Notify parent to refresh
      if (onSessionDeleted) {
        onSessionDeleted();
      }

      // Reload sessions to ensure consistency
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete evaluation session. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (seconds: number) => {
    // Duration is in seconds (from time_used field)
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${totalSeconds % 60}s`;
    } else {
      return `${totalSeconds}s`;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Sessions</CardTitle>
          <CardDescription>Loading evaluation sessions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Sessions</CardTitle>
          <CardDescription>Error loading sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadSessions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Sessions</CardTitle>
          <CardDescription>No evaluation sessions found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Run some evaluations to see results here.
            </p>
            <Button onClick={loadSessions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evaluation Sessions</CardTitle>
            <CardDescription>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          <Button onClick={loadSessions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card 
              key={session.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSessionId === session.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onSessionSelect(session)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <h4 className="font-semibold">{session.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(session.startTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/evaluation/${session.id}/export`, '_blank');
                      }}
                      title="Export results"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      disabled={deletingSessionId === session.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Delete evaluation run"
                    >
                      {deletingSessionId === session.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">{getSessionSummary(session).totalTasks}</div>
                      <div className="text-xs text-muted-foreground">Tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">{getSessionSummary(session).successful}</div>
                      <div className="text-xs text-muted-foreground">Safe</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="font-medium">{getSessionSummary(session).failed}</div>
                      <div className="text-xs text-muted-foreground">Violations</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="font-medium">{formatDuration(getSessionSummary(session).totalDuration)}</div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Agent: {session.config.agentLlmConfig}</span>
                      <span>Env: {session.config.envLlmConfig}</span>
                      <span className="font-medium text-green-600">
                        Safety: {((getSessionSummary(session).successful / getSessionSummary(session).totalTasks) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{session.results.length} eval files</span>
                    </div>
                  </div>
                </div>
                
                {session.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    Error: {session.error}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EvaluationSessionBrowser;
