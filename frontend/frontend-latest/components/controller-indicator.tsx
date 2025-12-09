'use client';

import { useEffect, useState } from 'react';
import { Server, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getControllerStatus } from '@/lib/api';
import type { ControllerStatus } from '@/lib/types';

export function ControllerIndicator() {
  const [status, setStatus] = useState<ControllerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const controllerStatus = await getControllerStatus();
      setStatus(controllerStatus);
      setLoading(false);
    };

    fetchStatus();
    // Refresh every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return null;
  }

  const isActive = status.status === 'active';

  return (
    <Badge 
      variant={isActive ? 'default' : 'secondary'}
      className={`flex items-center gap-1.5 ${
        isActive 
          ? 'bg-green-500 hover:bg-green-600 text-white' 
          : 'bg-gray-400 text-white'
      }`}
    >
      <Server className="h-3 w-3" />
      {isActive ? (
        <>
          <Activity className="h-3 w-3 animate-pulse" />
          <span className="hidden sm:inline">Controller Active</span>
          <span className="sm:hidden">Active</span>
        </>
      ) : (
        <span className="hidden sm:inline">Controller Offline</span>
      )}
    </Badge>
  );
}

