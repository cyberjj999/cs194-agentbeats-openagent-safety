import { NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const sessionDir = path.join(SESSIONS_DIR, sessionId);

    // Verify the session directory exists and starts with 'eval-'
    if (!sessionId.startsWith('eval-')) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Delete the entire session directory
    await rm(sessionDir, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting evaluation session:', error);
    return NextResponse.json(
      { error: 'Failed to delete evaluation session' },
      { status: 500 }
    );
  }
}






