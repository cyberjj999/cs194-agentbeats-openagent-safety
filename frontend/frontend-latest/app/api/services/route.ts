import { NextResponse } from 'next/server';
import type { ServiceHealth } from '@/lib/types';

// Service endpoints to check (server-side)
// Core required services
const CORE_SERVICES: Omit<ServiceHealth, 'status' | 'lastChecked' | 'responseTime'>[] = [
  { name: 'Ollama Server (REQUIRED)', url: 'http://localhost:11434', port: 11434, required: true },
  { name: 'OAS API Server (REQUIRED)', url: 'http://localhost:2999', port: 2999, required: true },
  { name: 'RocketChat (REQUIRED)', url: 'http://localhost:3000', port: 3000, required: true },
  { name: 'GitLab (REQUIRED)', url: 'http://localhost:8929', port: 8929, required: true },
  { name: 'ownCloud (REQUIRED)', url: 'http://localhost:8092', port: 8092, required: true },
  { name: 'Plane (REQUIRED)', url: 'http://localhost:8091', port: 8091, required: true },
  // AgentBeats Controller (required - for agentified agent management)
  { name: 'AgentBeats Controller (REQUIRED)', url: 'http://localhost:8080/status', port: 8080, required: true },
];

// Legacy AgentBeats services (only shown if running)
const LEGACY_SERVICES: Omit<ServiceHealth, 'status' | 'lastChecked' | 'responseTime'>[] = [
  { name: 'AgentBeats Backend', url: 'http://localhost:9000', port: 9000, required: false },
  { name: 'AgentBeats MCP', url: 'http://localhost:9001', port: 9001, required: false },
];

async function checkServiceHealth(
  service: Omit<ServiceHealth, 'status' | 'lastChecked' | 'responseTime'>
): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Use AbortController for timeout
    // GitLab and ownCloud may take longer, so use 10s timeout for them
    const timeout = (service.name.includes('GitLab') || service.name.includes('ownCloud')) ? 10000 : 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // AgentBeats Controller uses /status endpoint - always use GET for it
    const isController = service.name.includes('AgentBeats Controller');
    
    let response: Response;
    if (isController) {
      // Controller uses /status endpoint - use GET
      response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        redirect: 'follow',
      });
    } else {
      // Use HEAD request for faster response (no body download)
      // Some services may not support HEAD (return 501), so fall back to GET
      try {
        response = await fetch(service.url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
          },
          redirect: 'follow', // Follow redirects (GitLab and ownCloud redirect)
        });
        
        // If HEAD returns 501 (Not Implemented) or other non-2xx/3xx, try GET
        if (response.status === 501 || (response.status >= 400 && response.status < 500)) {
          response = await fetch(service.url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': '*/*',
            },
            redirect: 'follow',
          });
        }
      } catch {
        // If HEAD throws an error, try GET
        response = await fetch(service.url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
          },
          redirect: 'follow',
        });
      }
    }
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Consider 2xx and 3xx as healthy (redirects are OK)
    const isHealthy = response.status >= 200 && response.status < 400;
    
    return {
      ...service,
      status: isHealthy ? 'healthy' : 'unhealthy',
      lastChecked: new Date(),
      responseTime,
      required: service.required ?? false,
    };
  } catch {
    const responseTime = Date.now() - startTime;
    
    return {
      ...service,
      status: 'unhealthy',
      lastChecked: new Date(),
      responseTime,
      required: service.required ?? false,
    };
  }
}

export async function GET() {
  try {
    // Always check core services
    const coreResults = await Promise.all(
      CORE_SERVICES.map(service => checkServiceHealth(service))
    );
    
    // Check legacy services and only include them if they're running
    const legacyResults = await Promise.all(
      LEGACY_SERVICES.map(service => checkServiceHealth(service))
    );
    
    // Filter legacy services - only include if they're healthy
    const activeLegacyServices = legacyResults.filter(
      service => service.status === 'healthy'
    );
    
    // Combine core services with active legacy services
    const allResults = [...coreResults, ...activeLegacyServices];
    
    return NextResponse.json(allResults);
  } catch (error) {
    console.error('Error checking services:', error);
    return NextResponse.json(
      { error: 'Failed to check services' },
      { status: 500 }
    );
  }
}

