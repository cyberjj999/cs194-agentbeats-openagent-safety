'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Download, Terminal, CheckCircle2, XCircle, X, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { startEvaluation, exportEvaluationResults } from '@/lib/api';
import type { EvaluationResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EvaluationRunnerProps {
  selectedTasks: string[];
  agentLlmConfig: string;
  envLlmConfig: string;
  onComplete?: () => void;
  onNavigateToResults?: () => void;
}

export function EvaluationRunner({
  selectedTasks,
  agentLlmConfig,
  envLlmConfig,
  onComplete,
  onNavigateToResults,
}: EvaluationRunnerProps) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onNavigateToResultsRef = useRef(onNavigateToResults);
  
  // Keep the refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onNavigateToResultsRef.current = onNavigateToResults;
  }, [onComplete, onNavigateToResults]);

  // Auto-dismiss notification after 10 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Poll for logs and results while running or after completion detected (to get final results)
  useEffect(() => {
    if (!sessionId) return;
    // Stop polling if completed AND we have results
    if (completed && results.length > 0) return;

    const interval = setInterval(async () => {
      try {
        let processComplete = false;
        let hasResults = false;
        
        // Fetch logs and check for completion message
        const logsResponse = await fetch(`/api/evaluation/${sessionId}/logs`);
        if (logsResponse.ok) {
          const logsText = await logsResponse.text();
          setLogs(logsText);
          
          // Check if logs contain completion message (check for various formats)
          const completionPatterns = [
            'Evaluation completed successfully!',
            '🎉 Evaluation completed successfully!',
            '✅ Evaluation completed successfully!',
            'Evaluation completed successfully',
            'completed successfully',
          ];
          
          if (completionPatterns.some(pattern => logsText.includes(pattern))) {
            processComplete = true;
          }
        }

        // Check session status from metadata
        try {
          const statusResponse = await fetch(`/api/evaluation/${sessionId}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.status === 'completed') {
              processComplete = true;
            }
          }
        } catch (statusError) {
          // Status endpoint might not exist, continue with other checks
        }

        // Fetch results
        let resultsData: EvaluationResult[] = [];
        const resultsResponse = await fetch(`/api/evaluation/${sessionId}/results`);
        if (resultsResponse.ok) {
          resultsData = await resultsResponse.json();
          setResults(resultsData);
          
          if (resultsData.length > 0) {
            hasResults = true;
          }
          
          // Check if evaluation is complete (all tasks have results)
          if (resultsData.length > 0 && resultsData.length === selectedTasks.length) {
            processComplete = true;
          }
        }

        // Only mark as completed and show notification if:
        // 1. Process is complete (logs/metadata show completion) AND
        // 2. We have results (at least some results are available)
        // Use the fetched resultsData length to avoid race conditions with state updates
        if (processComplete && hasResults && !completed && resultsData.length > 0) {
          console.log('Evaluation completion detected with results, updating UI...', resultsData.length);
          setRunning(false);
          setCompleted(true);
          // Use setTimeout to ensure state is updated before showing notification
          setTimeout(() => {
            setShowNotification(true);
          }, 100);
          // Dispatch custom event to notify results dashboard
          window.dispatchEvent(new CustomEvent('evaluation-completed', { 
            detail: { sessionId } 
          }));
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        } else if (processComplete && !hasResults && running) {
          // Process complete but no results yet - stop running state but keep polling for results
          console.log('Evaluation process complete, waiting for results...');
          setRunning(false);
          // Don't set completed=true yet, keep polling for results
        }
      } catch (error) {
        console.error('Error polling evaluation status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [running, sessionId, selectedTasks.length, completed, results.length]);

  const startEval = async () => {
    if (selectedTasks.length === 0) {
      alert('Please select at least one task');
      return;
    }

    if (!agentLlmConfig || !envLlmConfig) {
      alert('Please select both agent and environment LLM configurations');
      return;
    }

    setRunning(true);
    setCompleted(false);
    setLogs('Starting evaluation...\n');
    setResults([]);

    try {
      const response = await startEvaluation(selectedTasks, agentLlmConfig, envLlmConfig);
      setSessionId(response.sessionId);
      setLogs(prev => prev + `\nEvaluation session started: ${response.sessionId}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLogs(prev => prev + `\nError: ${errorMessage}\n`);
      setRunning(false);
      setCompleted(false);
    }
  };

  const stopEval = () => {
    setRunning(false);
    setCompleted(false);
    if (onCompleteRef.current) onCompleteRef.current();
  };

  const exportResults = async () => {
    if (!sessionId) return;

    try {
      const blob = await exportEvaluationResults(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionId}-results.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'failure').length;

  const handleViewResults = () => {
    setShowNotification(false);
    if (onNavigateToResultsRef.current) {
      onNavigateToResultsRef.current();
    }
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
  };

  return (
    <div className="space-y-6">
      {/* Completion Notification - Only show if we have results */}
      <AnimatePresence>
        {showNotification && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 max-w-md"
          >
            <Card className="border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-green-900 dark:text-green-100">
                        Evaluation Completed!
                      </CardTitle>
                      <CardDescription className="text-green-700 dark:text-green-300">
                        {results.length > 0 
                          ? `${results.length} task${results.length !== 1 ? 's' : ''} completed`
                          : 'Processing results...'
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissNotification}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {results.length > 0 ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 text-sm text-green-800 dark:text-green-200">
                      <div className="flex items-center gap-4">
                        <span>✅ {successCount} passed</span>
                        <span>❌ {failureCount} failed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 text-sm text-green-800 dark:text-green-200">
                      Results are being processed. Please wait...
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleViewResults}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDismissNotification}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evaluation Control</CardTitle>
              <CardDescription>
                {running ? 'Evaluation in progress...' : completed ? 'Evaluation completed' : 'Ready to start evaluation'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!running && !completed ? (
                <Button onClick={startEval} disabled={selectedTasks.length === 0}>
                  <Play className="h-4 w-4" />
                  Start Evaluation
                </Button>
              ) : running ? (
                <Button variant="destructive" onClick={stopEval}>
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button onClick={startEval} disabled={selectedTasks.length === 0}>
                  <Play className="h-4 w-4" />
                  Start New Evaluation
                </Button>
              )}
              {sessionId && !running && (
                <Button variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {selectedTasks.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Tasks Selected</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {successCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Successful</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {failureCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Logs */}
      {sessionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <CardTitle>Live Logs</CardTitle>
              </div>
              {running && (
                <Badge variant="secondary">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  Running
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
              <pre className="whitespace-pre-wrap">{logs || 'Waiting for logs...'}</pre>
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>{results.length} tasks completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.taskId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    result.status === 'success'
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                      : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{result.taskName}</div>
                      {result.score !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Score: {result.score}/{result.maxScore}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={result.status === 'success' ? 'success' : 'destructive'}
                  >
                    {result.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
