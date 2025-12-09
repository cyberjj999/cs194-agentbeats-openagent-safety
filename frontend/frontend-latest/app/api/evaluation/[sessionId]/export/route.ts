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
    const metadataPath = path.join(sessionDir, 'metadata.json');
    const logsPath = path.join(sessionDir, 'logs.txt');

    // Read metadata
    const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

    // Read all evaluation results
    const files = await readdir(outputsDir).catch(() => []);
    const evalFiles = files.filter(f => f.startsWith('eval_') && f.endsWith('.json'));

    const results = await Promise.all(
      evalFiles.map(async (file) => {
        const content = await readFile(path.join(outputsDir, file), 'utf-8');
        return JSON.parse(content);
      })
    );

    // Read logs
    const logs = await readFile(logsPath, 'utf-8').catch(() => '');

    // Create export data
    const exportData = {
      sessionId,
      metadata,
      results,
      logs,
      exportedAt: new Date().toISOString(),
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${sessionId}-results.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting results:', error);
    return NextResponse.json({ error: 'Failed to export results' }, { status: 500 });
  }
}

