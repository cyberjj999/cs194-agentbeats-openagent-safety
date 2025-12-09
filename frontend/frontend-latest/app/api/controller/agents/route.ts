import { NextResponse } from 'next/server';

const GREEN_CONTROLLER_URL = process.env.AGENTBEATS_CONTROLLER_URL || 'http://localhost:8080';
const WHITE_CONTROLLER_URL = process.env.AGENTBEATS_WHITE_CONTROLLER_URL || 'http://localhost:8081';

export async function GET() {
  try {
    // Fetch agents from both green and white controllers
    const [greenResponse, whiteResponse] = await Promise.all([
      fetch(`${GREEN_CONTROLLER_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${WHITE_CONTROLLER_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }).catch(() => null),
    ]);

    // Combine agents from both controllers
    const allAgents: Record<string, { url?: string; internal_port?: number; state?: string }> = {};
    
    if (greenResponse?.ok) {
      const greenAgents = await greenResponse.json();
      Object.assign(allAgents, greenAgents);
    }
    
    if (whiteResponse?.ok) {
      const whiteAgents = await whiteResponse.json();
      Object.assign(allAgents, whiteAgents);
    }

    const agentsObj = allAgents;
    
    // Controller returns agents as an object with agent_id as keys
    // Format: { "agent_id": { "url": "...", "internal_port": 123, "state": "running" } }
    const agentIds = Object.keys(agentsObj);
    
    // Fetch details for each agent to get the agent card with name
    const transformedAgents = await Promise.all(
      agentIds.map(async (agentId) => {
        const agentData = agentsObj[agentId];
        
        try {
          // Determine which controller this agent belongs to
          // Try green controller first, then white
          let controllerUrl = GREEN_CONTROLLER_URL;
          let detailResponse = await fetch(`${controllerUrl}/agents/${agentId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          
          // If not found in green controller, try white controller
          if (!detailResponse.ok) {
            controllerUrl = WHITE_CONTROLLER_URL;
            detailResponse = await fetch(`${controllerUrl}/agents/${agentId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
            });
          }
          
          let agentName = `Agent ${agentId.slice(0, 8)}`;
          let agentType: 'green' | 'white' | 'unknown' = 'unknown';
          
          if (detailResponse.ok) {
            const agentDetails = await detailResponse.json();
            
            // Parse agent card if available
            if (agentDetails.agent_card) {
              try {
                const agentCard = typeof agentDetails.agent_card === 'string' 
                  ? JSON.parse(agentDetails.agent_card) 
                  : agentDetails.agent_card;
                
                agentName = agentCard.name || agentName;
                
                // Determine type from name or skills
                const nameLower = agentName.toLowerCase();
                if (nameLower.includes('green')) {
                  agentType = 'green';
                } else if (nameLower.includes('white')) {
                  agentType = 'white';
                } else if (agentCard.skills) {
                  // Check skills for type hints
                  const skillsStr = JSON.stringify(agentCard.skills).toLowerCase();
                  if (skillsStr.includes('green') || skillsStr.includes('evaluator') || skillsStr.includes('assessment')) {
                    agentType = 'green';
                  } else if (skillsStr.includes('white') || skillsStr.includes('under test')) {
                    agentType = 'white';
                  }
                }
              } catch (e) {
                console.error('Error parsing agent card:', e);
              }
            }
          }
          
          // Use internal_port (the actual agent port) instead of controller proxy port
          const port = agentData.internal_port;
          
          // Fix URL: replace 0.0.0.0 with localhost and use the correct controller port
          // Also point to the agent card endpoint which is accessible
          let agentUrl = agentData.url;
          if (agentUrl) {
            // Determine the correct controller port based on which controller this agent belongs to
            const controllerPort = controllerUrl === GREEN_CONTROLLER_URL ? '8080' : '8081';
            // Extract the agent ID from the URL and construct the agent card URL
            const agentIdMatch = agentUrl.match(/\/to_agent\/([^\/]+)/);
            if (agentIdMatch) {
              // Point to the agent card endpoint which is accessible via GET
              agentUrl = `http://localhost:${controllerPort}/to_agent/${agentIdMatch[1]}/.well-known/agent-card.json`;
            } else {
              // Fallback: just fix the host
              agentUrl = agentUrl.replace('http://0.0.0.0:', 'http://localhost:');
            }
          }
          
          return {
            id: agentId,
            name: agentName,
            type: agentType,
            status: agentData.state || 'unknown',
            port: port,
            url: agentUrl,
            metadata: {
              internal_port: agentData.internal_port,
              controller_url: controllerUrl,
            },
          };
        } catch (error) {
          console.error(`Error fetching details for agent ${agentId}:`, error);
          // Return basic info even if detail fetch fails
          return {
            id: agentId,
            name: `Agent ${agentId.slice(0, 8)}`,
            type: 'unknown' as const,
            status: agentData.state || 'unknown',
            port: agentData.internal_port,
            url: agentData.url,
            metadata: {},
          };
        }
      })
    );

    return NextResponse.json(transformedAgents);
  } catch (error) {
    console.error('Error fetching controller agents:', error);
    return NextResponse.json([]);
  }
}

