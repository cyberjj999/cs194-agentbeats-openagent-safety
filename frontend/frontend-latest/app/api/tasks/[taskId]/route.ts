import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const TASKS_DIR = path.join(process.cwd(), '..', '..', 'scenarios', 'openagentsafety', 'workspaces', 'tasks');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const taskPath = path.join(TASKS_DIR, taskId);

    // Read task.md
    let taskMd = '';
    try {
      taskMd = await readFile(path.join(taskPath, 'task.md'), 'utf-8');
    } catch {
      console.error(`Failed to read task.md for ${taskId}`);
    }

    // Read checkpoints.md
    let checkpointsMd = '';
    try {
      checkpointsMd = await readFile(path.join(taskPath, 'checkpoints.md'), 'utf-8');
    } catch {
      console.error(`Failed to read checkpoints.md for ${taskId}`);
    }

    // Read dependencies.yml
    let dependencies: string[] = [];
    try {
      const dependenciesPath = path.join(taskPath, 'utils', 'dependencies.yml');
      const dependenciesYml = await readFile(dependenciesPath, 'utf-8');
      const parsed = yaml.load(dependenciesYml);
      if (Array.isArray(parsed)) {
        dependencies = parsed.filter((v) => typeof v === 'string') as string[];
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as { dependencies?: unknown };
        if (Array.isArray(obj.dependencies)) {
          dependencies = (obj.dependencies as unknown[]).filter((v) => typeof v === 'string') as string[];
        }
      }
    } catch {
      console.error(`Failed to read dependencies.yml for ${taskId}`);
    }

    // Read scenarios.json if present
    let scenarios: unknown = null;
    try {
      const scenariosPath = path.join(taskPath, 'scenarios.json');
      const scenariosJson = await readFile(scenariosPath, 'utf-8');
      scenarios = JSON.parse(scenariosJson);
    } catch {
      // optional, ignore if missing
    }

    // Read evaluator.py if present
    let evaluatorLogic = '';
    try {
      const evaluatorPath = path.join(taskPath, 'utils', 'evaluator.py');
      evaluatorLogic = await readFile(evaluatorPath, 'utf-8');
    } catch {
      // optional, ignore if missing
    }

    const getScenarioCount = (data: unknown): number => {
      if (Array.isArray(data)) return data.length;
      if (typeof data === 'object' && data !== null) {
        const rec = data as Record<string, unknown>;
        if (Array.isArray(rec.scenarios)) return rec.scenarios.length;
        return Object.keys(rec).length;
      }
      return 0;
    };

    const metrics = {
      dependencyCount: Array.isArray(dependencies) ? dependencies.length : 0,
      checkpointCount: (checkpointsMd.match(/##\s*Checkpoint/gi) || []).length,
      scenarioCount: getScenarioCount(scenarios),
      hasEvaluatorLogic: evaluatorLogic.length > 0,
    };

    const task = {
      id: taskId,
      name: taskId,
      path: taskPath,
      taskMd,
      checkpointsMd,
      dependencies,
      scenarios,
      evaluatorLogic,
      metrics,
      category: getCategoryFromTaskName(taskId),
    };

    return NextResponse.json(task);
  } catch {
    console.error('Error reading task details');
    return NextResponse.json({ error: 'Failed to read task details' }, { status: 500 });
  }
}

function getCategoryFromTaskName(taskName: string): string {
  if (taskName.includes('leak')) return 'Data Leakage';
  if (taskName.includes('compliance')) return 'Compliance';
  if (taskName.includes('ambiguous')) return 'Ambiguous Instructions';
  if (taskName.includes('manipulation')) return 'Manipulation';
  if (taskName.includes('abusive') || taskName.includes('apology')) return 'Inappropriate Content';
  if (taskName.includes('security') || taskName.includes('auth')) return 'Security';
  if (taskName.includes('data') || taskName.includes('privacy')) return 'Privacy';
  return 'Other';
}

