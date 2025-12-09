'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Brain, 
  Play, 
  BarChart3,
  Github,
  ExternalLink 
} from 'lucide-react';
import { ServiceHealthCheck } from '@/components/service-health-check';
import { ControllerStatus } from '@/components/controller-status';
import { ControllerIndicator } from '@/components/controller-indicator';
import { ModelSelector } from '@/components/model-selector';
import { TaskBrowser } from '@/components/task-browser';
import { EvaluationRunner } from '@/components/evaluation-runner';
import ResultsDashboard from '@/components/results-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'configure' | 'evaluate' | 'results'>('dashboard');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [agentLlmConfig, setAgentLlmConfig] = useState('');
  const [envLlmConfig, setEnvLlmConfig] = useState('');

  type TabId = 'dashboard' | 'configure' | 'evaluate' | 'results';
  
  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'configure' as TabId, label: 'Configure', icon: Brain },
    { id: 'evaluate' as TabId, label: 'Evaluate', icon: Play },
    { id: 'results' as TabId, label: 'Results', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AgentBeats × OpenAgentSafety
                </h1>
                <p className="text-xs text-muted-foreground">
                  Comprehensive Agent Safety Evaluation Platform
                </p>
              </div>
            </motion.div>

            <div className="flex items-center gap-3">
              <ControllerIndicator />
              <Badge variant="secondary" className="hidden sm:flex">
                v2.0.0
              </Badge>
              <a
                href="https://github.com/agentbeats/agentbeats"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Github className="h-4 w-4" />
                  <span className="hidden sm:inline">GitHub</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                    ${isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Hero Section */}
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to the Safety Evaluation Platform</CardTitle>
                <CardDescription className="text-base">
                  Evaluate AI agents across 374+ safety tasks in high-risk simulations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">374+</div>
                    <div className="text-sm text-muted-foreground mt-1">Safety Tasks</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">3</div>
                    <div className="text-sm text-muted-foreground mt-1">Models Available</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">8</div>
                    <div className="text-sm text-muted-foreground mt-1">Services Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AgentBeats Controller Status */}
            <ControllerStatus />

            {/* Service Health */}
            <ServiceHealthCheck />

            {/* Quick Start Guide */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
                <CardDescription>Get started with your first evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-sm">Check Service Health</div>
                      <div className="text-xs text-muted-foreground">
                        Ensure all required services are running properly
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-sm">Configure LLMs</div>
                      <div className="text-xs text-muted-foreground">
                        Select your agent and environment LLM configurations
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      3
                    </div>
                    <div>
                      <div className="font-medium text-sm">Select Tasks</div>
                      <div className="text-xs text-muted-foreground">
                        Choose one or more safety tasks to evaluate
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      4
                    </div>
                    <div>
                      <div className="font-medium text-sm">Run Evaluation</div>
                      <div className="text-xs text-muted-foreground">
                        Start the evaluation and monitor progress in real-time
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'configure' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Select your LLM configurations and tasks for evaluation
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ModelSelector
                title="Agent LLM"
                description="Select the LLM for the agent being evaluated"
                value={agentLlmConfig}
                onChange={setAgentLlmConfig}
              />
              <ModelSelector
                title="Environment LLM"
                description="Select the LLM for NPCs and evaluators"
                value={envLlmConfig}
                onChange={setEnvLlmConfig}
              />
            </div>

            <TaskBrowser
              selectedTasks={selectedTasks}
              onSelectionChange={setSelectedTasks}
            />

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={() => setActiveTab('evaluate')}
                disabled={selectedTasks.length === 0 || !agentLlmConfig || !envLlmConfig}
              >
                Continue to Evaluation
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Keep EvaluationRunner always mounted so logs persist when switching tabs */}
        <div style={{ display: activeTab === 'evaluate' ? 'block' : 'none' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle>Run Evaluation</CardTitle>
                <CardDescription>
                  Monitor your evaluation progress and view results in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Agent LLM:</span>{' '}
                    <Badge>{agentLlmConfig || 'Not selected'}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environment LLM:</span>{' '}
                    <Badge>{envLlmConfig || 'Not selected'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AgentBeats Controller Status (for real-time monitoring during evaluation) */}
            <ControllerStatus />

            <EvaluationRunner
              selectedTasks={selectedTasks}
              agentLlmConfig={agentLlmConfig}
              envLlmConfig={envLlmConfig}
              onComplete={() => {
                // Don't auto-navigate, just notify
                console.log('Evaluation completed');
              }}
              onNavigateToResults={() => {
                setActiveTab('results');
              }}
            />
          </motion.div>
        </div>

        {activeTab === 'results' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ResultsDashboard />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              © 2025 AgentBeats × OpenAgentSafety. Built with Next.js, MagicUI, and Framer Motion.
            </div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
