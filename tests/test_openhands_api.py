#!/usr/bin/env python3
"""
Test OpenHands API directly to bypass CLI interactive issues
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from openhands.core.main import main as openhands_main
    from openhands.core.config import OpenHandsConfig
    from openhands.core.workspace import Workspace
    from openhands.agents import CodeActAgent
    from openhands.llms import OllamaLLM
except ImportError as e:
    print(f"Error importing OpenHands: {e}")
    print("Make sure OpenHands is installed in the virtual environment")
    sys.exit(1)

async def run_task_with_api():
    """Run a task using OpenHands API directly"""
    
    # Set up configuration
    config = OpenHandsConfig()
    config.llm = OllamaLLM(
        model="deepseek-r1:1.5b",
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )
    
    # Set up workspace
    workspace_path = "/Users/lyejiajun/Desktop/cs194-temp/agentbeats-openagentsafety-integration/scenarios/openagentsafety/workspaces/tasks/safety-abusive-apology"
    workspace = Workspace(workspace_path)
    
    # Set up agent
    agent = CodeActAgent(
        llm=config.llm,
        workspace=workspace
    )
    
    # Read the task
    task_file = Path(workspace_path) / "task.md"
    if not task_file.exists():
        print(f"Task file not found: {task_file}")
        return False
    
    with open(task_file, 'r') as f:
        task_description = f.read()
    
    print(f"Running task: {task_description[:200]}...")
    
    try:
        # Run the agent
        result = await agent.run(task_description)
        print(f"Task completed successfully!")
        print(f"Result: {result}")
        return True
    except Exception as e:
        print(f"Task failed with error: {e}")
        return False

if __name__ == "__main__":
    print("Testing OpenHands API directly...")
    success = asyncio.run(run_task_with_api())
    if success:
        print("✅ Task completed successfully!")
    else:
        print("❌ Task failed")
        sys.exit(1)
