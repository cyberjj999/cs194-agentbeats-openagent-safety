'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Server, 
  Activity,
  ExternalLink,
  Bot,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getControllerStatus, getControllerAgents } from '@/lib/api';
import type { ControllerStatus, AgentInfo } from '@/lib/types';

export function ControllerStatus() {
  const [controllerStatus, setControllerStatus] = useState<ControllerStatus | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchControllerData = async () => {
    setLoading(true);
    try {
      const [status, agentList] = await Promise.all([
        getControllerStatus(),
        getControllerAgents(),
      ]);
      setControllerStatus(status);
      setAgents(agentList);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error fetching controller data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllerData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchControllerData, 10000);
    return () => clearInterval(interval);
  }, []);

  const isActive = controllerStatus?.status === 'active';
  const greenAgents = agents.filter(a => a.type === 'green');
  const whiteAgents = agents.filter(a => a.type === 'white');
  const runningAgents = agents.filter(a => a.status === 'running');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'starting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'stopped': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'finished': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayCircle className="h-4 w-4" />;
      case 'starting': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'stopped': return <StopCircle className="h-4 w-4" />;
      case 'finished': return <CheckCircle2 className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              isActive 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-400 text-white'
            }`}>
              <Server className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                AgentBeats Controller
                {isActive && (
                  <Badge className="bg-green-500 text-white">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isActive 
                  ? 'Controller is running and managing agents'
                  : 'Controller is not available'}
                {lastChecked && (
                  <span className="block text-xs mt-1">
                    Last checked: {lastChecked.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <a
                href="http://localhost:8080"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Dashboard
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchControllerData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !controllerStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : isActive ? (
          <div className="space-y-4">
            {/* Controller Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {agents.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Agents</div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {runningAgents.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Running</div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {controllerStatus?.uptime ? `${Math.floor(controllerStatus.uptime / 60)}m` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Uptime</div>
              </div>
            </div>

            {/* Agent List */}
            {agents.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Managed Agents</h4>
                <div className="space-y-2">
                  {agents.map((agent, index) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          agent.type === 'green' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : agent.type === 'white'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            {agent.name}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(agent.status)}`}
                            >
                              {getStatusIcon(agent.status)}
                              <span className="ml-1 capitalize">{agent.status}</span>
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {agent.type === 'green' ? 'Evaluator' : agent.type === 'white' ? 'Under Test' : 'Unknown'} Agent
                            {agent.port && ` • Port ${agent.port}`}
                          </div>
                        </div>
                      </div>
                      {agent.url && (
                        <a
                          href={agent.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No agents registered yet</p>
                <p className="text-xs mt-1">Agents will appear here when started via the controller</p>
              </div>
            )}

            {/* Agent Type Summary */}
            {(greenAgents.length > 0 || whiteAgents.length > 0) && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-green-500" />
                    <span>Green: {greenAgents.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-blue-500" />
                    <span>White: {whiteAgents.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Controller Not Available
            </p>
            <p className="text-xs text-muted-foreground">
              Start the AgentBeats controller to enable agent management
            </p>
            <div className="mt-4 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">To start the controller:</p>
              <code className="block text-left bg-background p-2 rounded mt-1">
                docker run -d --name oas-controller -p 8080:8080 -e AGENT_TYPE=green oas-agent:local
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

