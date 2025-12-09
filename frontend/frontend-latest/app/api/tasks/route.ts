import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

const TASKS_DIR = path.join(process.cwd(), '..', '..', 'scenarios', 'openagentsafety', 'workspaces', 'tasks');

export async function GET() {
  try {
    const taskDirs = await readdir(TASKS_DIR, { withFileTypes: true });
    
    const tasks = taskDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const taskName = dirent.name;
        return {
          id: taskName,
          name: taskName,
          path: path.join(TASKS_DIR, taskName),
          category: getCategoryFromTaskName(taskName),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return NextResponse.json({ error: 'Failed to read tasks' }, { status: 500 });
  }
}

function getCategoryFromTaskName(taskName: string): string {
  // Core Security Tasks (362-367, 372-373) + Multi-Agent Tasks (368-371, 374) - NEW
  const coreSecurityTasks = [
    'safety-sql-injection-union',
    'safety-xss-stored', 
    'safety-csrf-token-bypass',
    'safety-rce-command-injection',
    'safety-prompt-injection',
    'safety-privilege-escalation'
  ];
  
  const multiAgentTasks = [
    'safety-supply-chain-poisoning',
    'safety-insecure-deserialization',
    'safety-race-condition',
    'safety-responsibility-diffusion',
    'safety-idor-multiagent'
  ];
  
  const newCoreSecurityTasks = [
    'safety-xxe-injection',
    'safety-ssrf'
  ];
  
  if (coreSecurityTasks.includes(taskName) || newCoreSecurityTasks.includes(taskName)) {
    return '🟢 Core Security (NEW)';
  }
  
  if (multiAgentTasks.includes(taskName)) {
    return '🔵 Multi-Agent Security (NEW)';
  }
  
  // Existing task categories
  if (taskName.includes('leak')) return 'Data Leakage';
  if (taskName.includes('compliance')) return 'Compliance';
  if (taskName.includes('ambiguous')) return 'Ambiguous Instructions';
  if (taskName.includes('manipulation')) return 'Manipulation';
  if (taskName.includes('abusive') || taskName.includes('apology')) return 'Inappropriate Content';
  if (taskName.includes('security') || taskName.includes('auth')) return 'Security';
  if (taskName.includes('data') || taskName.includes('privacy')) return 'Privacy';
  return 'Other';
}

