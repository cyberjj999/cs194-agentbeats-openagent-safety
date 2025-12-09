import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');

export async function GET() {
  try {
    // Read all evaluation session directories
    const sessionDirs = await readdir(SESSIONS_DIR).catch(() => []);
    
    const sessions = await Promise.all(
      sessionDirs
        .filter(dir => dir.startsWith('eval-'))
        .map(async (sessionId) => {
          const sessionDir = path.join(SESSIONS_DIR, sessionId);
          const metadataPath = path.join(sessionDir, 'metadata.json');
          const outputsDir = path.join(sessionDir, 'outputs');
          
          try {
            // Read metadata
            const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
            
            // Get session stats
            const sessionStats = await stat(sessionDir);
            
            // Count output files
            const outputFiles = await readdir(outputsDir).catch(() => []);
            const evalFiles = outputFiles.filter(f => f.startsWith('eval_') && f.endsWith('.json'));
            const trajFiles = outputFiles.filter(f => f.startsWith('traj_') && f.endsWith('.json'));
            
            // Calculate summary metrics
            let totalTasks = 0;
            let successfulTasks = 0;
            let totalScore = 0;
            let avgScore = 0;
            
            if (evalFiles.length > 0) {
              const evalResults = await Promise.all(
                evalFiles.map(async (file) => {
                  try {
                    const content = await readFile(path.join(outputsDir, file), 'utf-8');
                    return JSON.parse(content);
                  } catch {
                    return null;
                  }
                })
              );
              
              const validResults = evalResults.filter(r => r !== null);
              totalTasks = validResults.length;
              successfulTasks = validResults.filter(r => r.success).length;
              totalScore = validResults.reduce((sum, r) => sum + (r.score || 0), 0);
              avgScore = totalTasks > 0 ? totalScore / totalTasks : 0;
            }
            
            return {
              id: sessionId,
              name: `Evaluation Run ${sessionId.split('-')[1]}`,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              status: metadata.status,
              config: metadata.config,
              summary: {
                totalTasks,
                successfulTasks,
                failedTasks: totalTasks - successfulTasks,
                averageScore: Math.round(avgScore * 10) / 10,
                totalDuration: metadata.endTime && metadata.startTime 
                  ? new Date(metadata.endTime).getTime() - new Date(metadata.startTime).getTime()
                  : 0,
                outputFiles: {
                  evaluations: evalFiles.length,
                  trajectories: trajFiles.length
                }
              },
              lastModified: sessionStats.mtime.toISOString()
            };
          } catch (error) {
            console.error(`Error reading session ${sessionId}:`, error);
            return {
              id: sessionId,
              name: `Evaluation Run ${sessionId.split('-')[1]}`,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              status: 'error',
              config: {},
              summary: {
                totalTasks: 0,
                successfulTasks: 0,
                failedTasks: 0,
                averageScore: 0,
                totalDuration: 0,
                outputFiles: {
                  evaluations: 0,
                  trajectories: 0
                }
              },
              lastModified: new Date().toISOString(),
              error: 'Failed to read session data'
            };
          }
        })
    );
    
    // Sort by start time (newest first)
    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error reading evaluation sessions:', error);
    return NextResponse.json({ error: 'Failed to read evaluation sessions' }, { status: 500 });
  }
}
