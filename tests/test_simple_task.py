#!/usr/bin/env python3
"""
Simple OpenAgentSafety Task Test

This script tests running a simple task using OpenHands in a more direct way.
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test_simple_openhands_task():
    """Test running a simple task with OpenHands"""
    
    print_section("Testing Simple OpenHands Task")
    
    # Create a simple task file
    task_content = """
# Simple Test Task

You are an AI assistant. Please write a simple Python script that:

1. Prints "Hello, World!"
2. Calculates the sum of numbers 1 to 10
3. Prints the result

Save this as `hello_world.py` and run it to verify it works.
"""
    
    task_file = Path("/tmp/simple_task.md")
    task_file.write_text(task_content.strip())
    
    # Create a simple config
    config_content = """
[llm]
model = "deepseek-r1:1.5b"
base_url = "http://localhost:11434/v1"
api_key = "ollama"

[core]
workspace_base = "/tmp"
"""
    
    config_file = Path("/tmp/simple_config.toml")
    config_file.write_text(config_content.strip())
    
    print("Task file created:", task_file)
    print("Config file created:", config_file)
    print("Task content:")
    print(task_content)
    print()
    
    # Try to run OpenHands with the task
    print("Running OpenHands with simple task...")
    
    try:
        # Use a timeout and capture output
        result = subprocess.run([
            "uvx", "--python", "3.12", "--from", "openhands-ai", 
            "openhands", "cli",
            "--config-file", str(config_file),
            "--task", "Read /tmp/simple_task.md and complete the task described there.",
            "--name", "simple-test",
            "--log-level", "INFO"
        ], 
        input="Please read the task file and complete it.\n",
        text=True,
        capture_output=True,
        timeout=120  # 2 minute timeout
        )
        
        print("Return code:", result.returncode)
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
        
        if result.returncode == 0:
            print("✅ OpenHands task completed successfully!")
            return True
        else:
            print("❌ OpenHands task failed")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ OpenHands task timed out")
        return False
    except Exception as e:
        print(f"❌ OpenHands task error: {e}")
        return False
    finally:
        # Cleanup
        task_file.unlink(missing_ok=True)
        config_file.unlink(missing_ok=True)

def test_ollama_connection():
    """Test Ollama connection"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = response.json().get('models', [])
        print(f"✅ Ollama: {len(models)} models available")
        for model in models:
            print(f"   - {model['name']}")
        return True
    except Exception as e:
        print(f"❌ Ollama: Not available - {e}")
        return False

def main():
    print_section("OpenAgentSafety Simple Task Test")
    
    # Test Ollama first
    print_section("1. Check Ollama")
    ollama_ok = test_ollama_connection()
    
    if not ollama_ok:
        print("❌ Ollama not available. Please start Ollama first:")
        print("   ollama serve")
        return 1
    
    # Test simple task
    print_section("2. Test Simple Task")
    task_ok = test_simple_openhands_task()
    
    # Summary
    print_section("Summary")
    if task_ok:
        print("🎉 SUCCESS: OpenHands can run tasks on macOS!")
        print("\nNext steps:")
        print("1. Try running the GUI server: uvx --python 3.12 --from openhands-ai openhands serve")
        print("2. Open http://localhost:3000 in your browser")
        print("3. Use the web interface to run OpenAgentSafety tasks")
    else:
        print("❌ Task execution failed")
        print("\nTroubleshooting:")
        print("1. Ensure Ollama is running: ollama serve")
        print("2. Check Docker services: docker ps")
        print("3. Try the GUI server instead of CLI")
        return 1
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
