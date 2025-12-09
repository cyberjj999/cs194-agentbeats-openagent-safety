'use client';

import { useMemo } from 'react';

interface ScenarioViewerProps {
  scenarios: unknown;
}

// Component for displaying JSON data as readable text
function JsonDisplay({ data }: { data: unknown }) {
  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground italic">No value</span>;
    if (value === undefined) return <span className="text-muted-foreground italic">Not set</span>;
    
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="font-mono text-blue-600">{value.toLocaleString()}</span>;
    }
    
    if (typeof value === 'string') {
      // If it's a URL, make it clickable
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {value}
          </a>
        );
      }
      return <span className="text-foreground">{value}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">Empty list</span>;
      }
      
      return (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[20px]">{index + 1}.</span>
              <div className="flex-1">{formatValue(item)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic">Empty object</span>;
      }
      
      return (
        <div className="space-y-3">
          {entries.map(([objKey, objValue]) => (
            <div key={objKey} className="border-l-2 border-muted pl-3">
              <div className="text-sm font-medium text-foreground mb-1 capitalize">
                {objKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
              <div className="text-sm">{formatValue(objValue)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-foreground">{String(value)}</span>;
  };

  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <div className="text-sm">
        {formatValue(data)}
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ScenarioViewer({ scenarios }: ScenarioViewerProps) {
  const rendered = useMemo(() => {
    // Handle common shapes: { scenarios: [...] }, array of scenarios, or dict of named scenarios
    const root = isRecord(scenarios) && 'scenarios' in scenarios
      ? (scenarios as Record<string, unknown>).scenarios
      : scenarios;

    // Normalize to array of scenario items
    let items: unknown[] = [];
    if (Array.isArray(root)) {
      items = root as unknown[];
    } else if (isRecord(root)) {
      items = Object.entries(root).map(([name, value]) => ({ name, ...(isRecord(value) ? value : { value }) }));
    } else if (root != null) {
      items = [root];
    }

    return items as Array<Record<string, unknown>>;
  }, [scenarios]);

  if (!scenarios) {
    return <div className="text-xs text-muted-foreground">No scenarios.json available.</div>;
  }

  if (!Array.isArray(rendered) || rendered.length === 0) {
    return <JsonDisplay data={scenarios} />;
  }

  return (
    <div className="space-y-3">
      {rendered.map((scenario, idx) => {
        const s = scenario as Record<string, unknown>;
        const name = (s.name as string) || (s.id as string) || `Scenario ${idx + 1}`;
        const description = (s.description as string) || (s.summary as string);
        const steps = Array.isArray(s.steps) ? (s.steps as unknown[]) : undefined;
        const inputs = isRecord(s.inputs) ? (s.inputs as Record<string, unknown>) : undefined;
        const metadata = isRecord(s.metadata) ? (s.metadata as Record<string, unknown>) : undefined;

        return (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-semibold text-foreground mb-2">
              {name}
            </div>
            
            {description && (
              <div>
                <div className="text-xs font-semibold mb-1">Description</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            )}

            {steps && steps.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1">Steps</div>
                <ol className="list-decimal pl-4 text-xs space-y-1">
                  {steps.map((step, i: number) => (
                    <li key={i}>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
                  ))}
                </ol>
              </div>
            )}

            {inputs && (
              <div>
                <div className="text-xs font-semibold mb-1">Inputs</div>
                <JsonDisplay data={inputs} />
              </div>
            )}

            {metadata && (
              <div>
                <div className="text-xs font-semibold mb-1">Metadata</div>
                <JsonDisplay data={metadata} />
              </div>
            )}

            {/* Fallback raw block for any extra fields */}
            <div>
              <div className="text-xs font-semibold mb-1">Raw</div>
              <JsonDisplay data={scenario} />
            </div>
          </div>
        );
      })}
    </div>
  );
}


