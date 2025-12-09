"""White agent implementation - the target agent being tested."""

import uvicorn
import dotenv
import os
import json
import time
import urllib.request
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentSkill, AgentCard, AgentCapabilities
from a2a.utils import new_agent_text_message
from litellm import completion

dotenv.load_dotenv()


def prepare_white_agent_card(url: str) -> AgentCard:
    """Prepare the agent card for the white agent."""
    skill = AgentSkill(
        id="safety_task_completion",
        name="Safety Task Completion",
        description="Handles safety-related tasks and evaluations",
        tags=["safety", "evaluation", "general"],
        examples=[],
    )
    card = AgentCard(
        name="openagentsafety_white_agent",
        description="General-purpose agent for OpenAgentSafety benchmark testing",
        url=url,
        version="1.0.0",
        default_input_modes=["text/plain"],
        default_output_modes=["text/plain"],
        capabilities=AgentCapabilities(),
        skills=[skill],
    )
    return card


class GeneralWhiteAgentExecutor(AgentExecutor):
    """General white agent executor for handling safety tasks."""
    
    def __init__(self):
        self.ctx_id_to_messages = {}
        # Get model from environment or use default
        self.model = os.getenv("WHITE_AGENT_MODEL", "gpt-4o")
        self.provider = os.getenv("WHITE_AGENT_PROVIDER", "openai")
        self.temperature = float(os.getenv("WHITE_AGENT_TEMPERATURE", "0.0"))
        
        print(f"White agent initialized with model: {self.model} (provider: {self.provider})")
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Execute the task by processing user input and generating a response."""
        user_input = context.get_user_input()
        
        # Initialize or get message history for this context
        if context.context_id not in self.ctx_id_to_messages:
            self.ctx_id_to_messages[context.context_id] = []
        
        messages = self.ctx_id_to_messages[context.context_id]
        messages.append({
            "role": "user",
            "content": user_input,
        })
        
        try:
            # Generate response using LiteLLM
            response = completion(
                messages=messages,
                model=f"{self.provider}/{self.model}" if "/" not in self.model else self.model,
                temperature=self.temperature,
            )
            
            next_message = response.choices[0].message.model_dump()
            messages.append({
                "role": "assistant",
                "content": next_message["content"],
            })
            
            # Send response back
            await event_queue.enqueue_event(
                new_agent_text_message(
                    next_message["content"], context_id=context.context_id
                )
            )
        except Exception as e:
            error_message = f"Error generating response: {str(e)}"
            print(f"White agent error: {error_message}")
            await event_queue.enqueue_event(
                new_agent_text_message(
                    error_message, context_id=context.context_id
                )
            )
    
    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise NotImplementedError("Cancel not supported")


def start_white_agent(agent_name="openagentsafety_white_agent", host="localhost", port=9002):
    """Start the white agent server."""
    print(f"Starting OpenAgentSafety white agent...")
    
    # Use environment variables if provided (for AgentBeats controller), otherwise use defaults
    host = host or os.getenv("HOST", "localhost")
    port = port or int(os.getenv("AGENT_PORT", "9002"))
    controller_port = os.getenv("PORT", "8080")
    
    # For agent card URL, use PUBLIC_URL if set, otherwise construct from host
    # If host is 0.0.0.0 (bind all), we need a routable address for the agent card
    public_url = os.getenv("PUBLIC_URL")
    
    if public_url:
        base_url = public_url
    elif host == "0.0.0.0":
        # When binding to 0.0.0.0, try to get public IP from metadata service (AWS EC2)
        try:
            import urllib.request
            instance_ip = urllib.request.urlopen('http://169.254.169.254/latest/meta-data/public-ipv4', timeout=2).read().decode()
            base_url = f"http://{instance_ip}:{controller_port}"
            print(f"Using public IP from metadata service: {base_url}", flush=True)
        except:
            # Fallback: use localhost (controller should rewrite this)
            base_url = f"http://localhost:{controller_port}"
            print(f"Warning: Using localhost for agent card URL. Set PUBLIC_URL env var for proper external access.", flush=True)
    else:
        base_url = f"http://{host}:{controller_port}"
    
    # Try to get the controller agent ID and append /to_agent/<id> to the URL
    # This is required for AgentBeats to send A2A requests through the controller proxy
    # Only try if we're running through a controller (check AGENT_TYPE or if controller is available)
    url = base_url
    use_controller = os.getenv("AGENT_TYPE") is not None  # Running through controller if AGENT_TYPE is set
    
    if use_controller:
        try:
            import urllib.request
            import time
            # Wait a bit for the controller to register the agent
            time.sleep(2)
            controller_url = base_url.replace(f":{port}", f":{controller_port}") if port != int(controller_port) else base_url
            agents_endpoint = f"{controller_url}/agents"
            print(f"Querying controller for agent ID: {agents_endpoint}", flush=True)
            response = urllib.request.urlopen(agents_endpoint, timeout=5)
            agents_data = json.loads(response.read().decode())
            
            # Find our agent by matching the internal port
            # The controller assigns a random port, so we match by finding the agent that's running
            if agents_data:
                agent_id = list(agents_data.keys())[0]
                agent_info = agents_data[agent_id]
                if "url" in agent_info:
                    url = agent_info["url"]
                    if "localhost" in url:
                        try:
                            instance_ip = urllib.request.urlopen('http://169.254.169.254/latest/meta-data/public-ipv4', timeout=2).read().decode().strip()
                            if instance_ip:
                                url = url.replace("localhost", instance_ip)
                                print(f"Replaced localhost with public IP from metadata: {url}", flush=True)
                            else:
                                print(f"Controller returned localhost URL, but metadata unavailable: {url}", flush=True)
                        except:
                            print(f"Controller returned localhost URL, and metadata service failed: {url}", flush=True)
                    else:
                        print(f"Found controller agent ID: {agent_id}, using URL from controller: {url}", flush=True)
                else:
                    url = f"{base_url}/to_agent/{agent_id}"
                    print(f"Found controller agent ID: {agent_id}, using proxy URL: {url}", flush=True)
            else:
                url = base_url
                print(f"No agents found in controller, using base URL: {url}", flush=True)
        except Exception as e:
            url = base_url
            print(f"Warning: Could not get controller agent ID: {e}. Using base URL: {url}", flush=True)
            print(f"Agent card URL should include /to_agent/<agent_id> for AgentBeats to work properly.", flush=True)
    else:
        # Running in direct mode (via launcher), use direct URL
        url = f"http://{host}:{port}" if host != "0.0.0.0" else f"http://localhost:{port}"
        print(f"Running in direct mode (no controller), using direct URL: {url}", flush=True)
    
    card = prepare_white_agent_card(url)
    
    request_handler = DefaultRequestHandler(
        agent_executor=GeneralWhiteAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    
    app = A2AStarletteApplication(
        agent_card=card,
        http_handler=request_handler,
    )
    
    print(f"White agent listening on {url}")
    uvicorn.run(app.build(), host=host, port=port)


if __name__ == "__main__":
    start_white_agent()



