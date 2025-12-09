'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, CheckSquare, Square, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAllTasks, getTaskDetails } from '@/lib/api';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScenarioViewer } from './ScenarioViewer';

interface TaskBrowserProps {
  selectedTasks: string[];
  onSelectionChange: (tasks: string[]) => void;
}

export function TaskBrowser({ selectedTasks, onSelectionChange }: TaskBrowserProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getAllTasks();
      setTasks(data);
      setLoading(false);
    };
    fetchTasks();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category || 'Other'));
    const sortedCats = Array.from(cats).sort();
    
    // Move Core Security (NEW) and Multi-Agent Security (NEW) to the top
    const coreSecurityIndex = sortedCats.findIndex(cat => cat.includes('Core Security'));
    const multiAgentIndex = sortedCats.findIndex(cat => cat.includes('Multi-Agent Security'));
    
    if (coreSecurityIndex > -1) {
      const coreSecurity = sortedCats.splice(coreSecurityIndex, 1)[0];
      sortedCats.unshift(coreSecurity);
    }
    
    if (multiAgentIndex > -1) {
      const multiAgent = sortedCats.splice(multiAgentIndex, 1)[0];
      // Insert after Core Security if it exists, otherwise at the top
      const insertIndex = sortedCats.findIndex(cat => cat.includes('Core Security')) + 1;
      sortedCats.splice(insertIndex, 0, multiAgent);
    }
    
    return sortedCats;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || task.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tasks, searchQuery, selectedCategory]);

  const toggleSelectAndView = async (task: Task) => {
    const taskId = task.id;
    if (selectedTasks.includes(taskId)) {
      onSelectionChange(selectedTasks.filter(id => id !== taskId));
    } else {
      onSelectionChange([...selectedTasks, taskId]);
    }

    // Open details when a task is clicked
    await viewTaskDetails(task);
  };

  const selectAll = async () => {
    onSelectionChange(filteredTasks.map(t => t.id));
    if (filteredTasks.length > 0) {
      // Show the first task's details when selecting all
      await viewTaskDetails(filteredTasks[0]);
    }
  };

  const deselectAll = () => {
    onSelectionChange([]);
    setSelectedTask(null);
  };

  const viewTaskDetails = async (task: Task) => {
    try {
      setLoadingDetails(true);
      // Always set a minimal selected task so the right panel shows a skeleton immediately
      setSelectedTask({ id: task.id, name: task.name, path: task.path, category: task.category });
      const details = await getTaskDetails(task.id);
      if (details) {
        setSelectedTask(details);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Task List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                {selectedTasks.length} of {filteredTasks.length} selected
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Task List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {(() => {
                  const coreSecurityTasks = filteredTasks.filter(task => task.category?.includes('Core Security'));
                  const multiAgentTasks = filteredTasks.filter(task => task.category?.includes('Multi-Agent Security'));
                  const otherTasks = filteredTasks.filter(task => 
                    !task.category?.includes('Core Security') && 
                    !task.category?.includes('Multi-Agent Security')
                  );
                  
                  return (
                    <div>
                      {/* Core Security Tasks Section */}
                      {coreSecurityTasks.length > 0 && (
                        <div>
                          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-green-200 dark:border-green-800 pb-2 mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              Core Security Tasks (NEW) - Critical Vulnerabilities
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {coreSecurityTasks.length} critical security tasks added
                            </div>
                          </div>
                          {coreSecurityTasks.map((task, index) => {
                            const isCoreSecurity = task.category?.includes('Core Security');
                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.01 }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                  isCoreSecurity && "ring-2 ring-green-200 dark:ring-green-800 bg-green-50/50 dark:bg-green-950/20",
                                  selectedTasks.includes(task.id)
                                    ? isCoreSecurity 
                                      ? "border-green-500 bg-green-100 dark:bg-green-900/30"
                                      : "border-primary bg-primary/5"
                                    : isCoreSecurity
                                      ? "border-green-300 hover:border-green-400 hover:bg-green-100/50 dark:border-green-700 dark:hover:border-green-600 dark:hover:bg-green-900/30"
                                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                                )}
                                onClick={() => toggleSelectAndView(task)}
                              >
                                <div className="flex-shrink-0">
                                  {selectedTasks.includes(task.id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium truncate">{task.name}</div>
                                    {isCoreSecurity && (
                                      <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 text-white">
                                        NEW
                                      </Badge>
                                    )}
                                  </div>
                                  {task.category && (
                                    <Badge 
                                      variant={isCoreSecurity ? "destructive" : "secondary"} 
                                      className="mt-1"
                                    >
                                      {task.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewTaskDetails(task);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Multi-Agent Security Tasks Section */}
                      {multiAgentTasks.length > 0 && (
                        <div>
                          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800 pb-2 mb-3 mt-6">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              Multi-Agent Security Tasks (NEW) - Coordination Vulnerabilities
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {multiAgentTasks.length} multi-agent coordination tasks
                            </div>
                          </div>
                          {multiAgentTasks.map((task, index) => {
                            const isMultiAgent = task.category?.includes('Multi-Agent Security');
                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.01 }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                  isMultiAgent && "ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50/50 dark:bg-blue-950/20",
                                  selectedTasks.includes(task.id)
                                    ? isMultiAgent 
                                      ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                                      : "border-primary bg-primary/5"
                                    : isMultiAgent
                                      ? "border-blue-300 hover:border-blue-400 hover:bg-blue-100/50 dark:border-blue-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/30"
                                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                                )}
                                onClick={() => toggleSelectAndView(task)}
                              >
                                <div className="flex-shrink-0">
                                  {selectedTasks.includes(task.id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium truncate">{task.name}</div>
                                    {isMultiAgent && (
                                      <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-600 text-white">
                                        NEW
                                      </Badge>
                                    )}
                                  </div>
                                  {task.category && (
                                    <Badge 
                                      variant={isMultiAgent ? "default" : "secondary"} 
                                      className={cn("mt-1", isMultiAgent && "bg-blue-500 hover:bg-blue-600")}
                                    >
                                      {task.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewTaskDetails(task);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Other Tasks Section */}
                      {otherTasks.length > 0 && (
                        <div>
                          {(coreSecurityTasks.length > 0 || multiAgentTasks.length > 0) && (
                            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border pb-2 mb-3 mt-6">
                              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                                Other Safety Tasks
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {otherTasks.length} existing safety tasks
                              </div>
                            </div>
                          )}
                          {otherTasks.map((task, index) => {
                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.01 }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                  selectedTasks.includes(task.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                                )}
                                onClick={() => toggleSelectAndView(task)}
                              >
                                <div className="flex-shrink-0">
                                  {selectedTasks.includes(task.id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{task.name}</div>
                                  {task.category && (
                                    <Badge variant="secondary" className="mt-1">
                                      {task.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewTaskDetails(task);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Details */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Details</CardTitle>
            {selectedTask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedTask ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedTask.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTask.category && (
                    <Badge variant="secondary">{selectedTask.category}</Badge>
                  )}
                  {selectedTask.metrics?.dependencyCount !== undefined && (
                    <Badge variant="outline">Deps: {selectedTask.metrics.dependencyCount}</Badge>
                  )}
                  {selectedTask.metrics?.checkpointCount !== undefined && (
                    <Badge variant="outline">Checkpoints: {selectedTask.metrics.checkpointCount}</Badge>
                  )}
                  {selectedTask.metrics?.scenarioCount !== undefined && (
                    <Badge variant="outline">Scenarios: {selectedTask.metrics.scenarioCount}</Badge>
                  )}
                </div>
              </div>

              <details className="rounded-lg border">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">Task Description</summary>
                <div className="prose prose-sm dark:prose-invert max-w-none p-3 pt-0">
                  {selectedTask.taskMd ? (
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {selectedTask.taskMd}
                    </pre>
                  ) : (
                    <div className="text-xs text-muted-foreground">No task description found.</div>
                  )}
                </div>
              </details>

              <details className="rounded-lg border">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">Checkpoints</summary>
                <div className="prose prose-sm dark:prose-invert max-w-none p-3 pt-0">
                  {selectedTask.checkpointsMd ? (
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {selectedTask.checkpointsMd}
                    </pre>
                  ) : (
                    <div className="text-xs text-muted-foreground">No checkpoints available.</div>
                  )}
                </div>
              </details>

              {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                <details className="rounded-lg border">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">Dependencies</summary>
                  <div className="p-3 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.dependencies.map(dep => (
                        <Badge key={dep} variant="outline">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {Boolean(selectedTask.scenarios) && (
                <details className="rounded-lg border">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">Scenarios</summary>
                  <div className="p-3 pt-0">
                    <ScenarioViewer scenarios={selectedTask.scenarios} />
                  </div>
                </details>
              )}

              {selectedTask.evaluatorLogic && (
                <details className="rounded-lg border">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">Evaluator Logic</summary>
                  <div className="p-3 pt-0">
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {selectedTask.evaluatorLogic}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Select a task to view details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

