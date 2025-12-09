'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Cloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLLMConfigs } from '@/lib/api';
import type { LLMConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelector({ title, description, value, onChange }: ModelSelectorProps) {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      const data = await getLLMConfigs();
      setConfigs(data);
      setLoading(false);
      
      // Set default value if not set
      if (!value && data.length > 0) {
        onChange(data[0].name);
      }
    };
    fetchConfigs();
  }, [value, onChange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {configs.map((config, index) => (
            <motion.button
              key={config.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onChange(config.name)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                value === config.name
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              <div className="mt-0.5">
                {config.isLocal ? (
                  <Cpu className="h-5 w-5 text-green-500" />
                ) : (
                  <Cloud className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{config.name}</span>
                  <Badge variant={config.isLocal ? 'success' : 'secondary'}>
                    {config.isLocal ? 'Local' : 'Cloud'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {config.model}
                </div>
                <div className="text-xs text-muted-foreground/70 truncate">
                  {config.baseUrl}
                </div>
              </div>
              {value === config.name && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-1"
                >
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        
        {configs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No LLM configurations found</p>
            <p className="text-xs mt-1">
              Please configure LLMs in scenarios/openagentsafety/evaluation/config.toml
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

