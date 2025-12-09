import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    const outputsDir = path.join(sessionDir, 'outputs');

    // Read all evaluation result files
    const files = await readdir(outputsDir).catch(() => []);
    const evalFiles = files.filter(f => f.startsWith('eval_') && f.endsWith('.json'));

    const results = await Promise.all(
      evalFiles.map(async (file) => {
        const content = await readFile(path.join(outputsDir, file), 'utf-8');
        const data = JSON.parse(content);
        const taskId = file.replace('eval_', '').replace('.json', '');

        return {
          taskId,
          taskName: taskId,
          status: data.success ? 'success' : 'failure',
          score: data.score,
          maxScore: data.max_score,
          evaluationData: data,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error reading evaluation results:', error);
    return NextResponse.json({ error: 'Failed to read results' }, { status: 500 });
  }
}

