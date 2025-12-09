import { NextResponse } from 'next/server';

const GREEN_CONTROLLER_URL = process.env.AGENTBEATS_CONTROLLER_URL || 'http://localhost:8080';
const WHITE_CONTROLLER_URL = process.env.AGENTBEATS_WHITE_CONTROLLER_URL || 'http://localhost:8081';

export async function GET() {
  try {
    // Fetch status from both controllers
    const [greenResponse, whiteResponse] = await Promise.all([
      fetch(`${GREEN_CONTROLLER_URL}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${WHITE_CONTROLLER_URL}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }).catch(() => null),
    ]);

    // Combine status from both controllers
    let totalAgentsCount = 0;
    let totalRunningAgents = 0;
    let isActive = false;

    if (greenResponse?.ok) {
      const greenData = await greenResponse.json();
      totalAgentsCount += greenData.maintained_agents || 0;
      totalRunningAgents += greenData.running_agents || 0;
      isActive = true;
    }

    if (whiteResponse?.ok) {
      const whiteData = await whiteResponse.json();
      totalAgentsCount += whiteData.maintained_agents || 0;
      totalRunningAgents += whiteData.running_agents || 0;
      isActive = true;
    }

    if (!isActive) {
      return NextResponse.json(
        { status: 'inactive', error: 'Controllers not responding' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      status: 'active',
      agentsCount: totalAgentsCount,
      runningAgents: totalRunningAgents,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching controller status:', error);
    return NextResponse.json(
      { status: 'inactive', error: 'Failed to connect to controllers' },
      { status: 200 }
    );
  }
}

