import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');

    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      return NextResponse.json({
        status: metadata.status || 'running',
        startTime: metadata.startTime,
        endTime: metadata.endTime,
      });
    } catch {
      // If metadata doesn't exist, return running status
      return NextResponse.json({
        status: 'running',
        startTime: null,
        endTime: null,
      });
    }
  } catch (error: unknown) {
    console.error('Error reading session status:', error);
    return NextResponse.json({ error: 'Failed to read session status' }, { status: 500 });
  }
}



