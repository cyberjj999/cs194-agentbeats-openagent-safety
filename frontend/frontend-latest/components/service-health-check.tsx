'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { checkAllServices } from '@/lib/api';
import type { ServiceHealth } from '@/lib/types';

export function ServiceHealthCheck() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServices = async () => {
    setLoading(true);
    const results = await checkAllServices();
    setServices(results);
    setLastChecked(new Date());
    setLoading(false);
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const requiredServices = services.filter(s => s.required);
  const optionalServices = services.filter(s => !s.required);
  const healthyRequired = requiredServices.filter(s => s.status === 'healthy').length;
  const healthyOptional = optionalServices.filter(s => s.status === 'healthy').length;
  const allRequiredHealthy = requiredServices.length > 0 && healthyRequired === requiredServices.length;
  const totalCount = services.length;
  const healthyCount = services.filter(s => s.status === 'healthy').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Health</CardTitle>
            <CardDescription>
              {lastChecked && `Last checked: ${lastChecked.toLocaleTimeString()}`}
              <br />
              <span className="text-xs text-muted-foreground">
                OpenAgentSafety tasks require all services (GitLab, RocketChat, ownCloud, Plane, API Server) for NPCs and task execution.
                AgentBeats Controller is required for managing agentified agents via web UI.
              </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkServices}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {allRequiredHealthy ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Required services are healthy - Ready to evaluate
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {requiredServices.length - healthyRequired} required service(s) down
                  </span>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Required: {healthyRequired}/{requiredServices.length} • 
              Optional: {healthyOptional}/{optionalServices.length}
            </div>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${allRequiredHealthy ? 'bg-green-500' : 'bg-yellow-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${requiredServices.length > 0 ? (healthyRequired / requiredServices.length) * 100 : 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Required Services */}
        {requiredServices.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 text-foreground">Required Services</h4>
            <div className="space-y-2">
              {requiredServices.map((service, index) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    service.status === 'healthy' 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  } hover:bg-accent/50 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    {service.status === 'healthy' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : service.status === 'checking' ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                    <Badge
                      variant={
                        service.status === 'healthy'
                          ? 'default'
                          : service.status === 'checking'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={
                        service.status === 'healthy'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : service.status === 'checking'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }
                    >
                      {service.status === 'healthy' ? '✓ Healthy' : 
                       service.status === 'checking' ? '⏳ Checking' : 
                       '✗ Unhealthy'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Services */}
        {optionalServices.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Optional Services (AgentBeats Integration)</h4>
            <div className="space-y-2">
              {optionalServices.map((service, index) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (requiredServices.length + index) * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors opacity-60"
                >
                  <div className="flex items-center gap-3">
                    {service.status === 'healthy' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : service.status === 'checking' ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={
                        service.status === 'healthy'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : service.status === 'checking'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }
                    >
                      {service.status === 'healthy' ? '✓ Healthy' : 
                       service.status === 'checking' ? '⏳ Checking' : 
                       '○ Optional'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

