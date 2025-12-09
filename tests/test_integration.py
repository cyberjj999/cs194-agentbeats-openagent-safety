#!/usr/bin/env python3
"""
Integration Test Script for AgentBeats + OpenAgentSafety

This script verifies the integration setup without requiring Docker runtime execution.
It checks all dependencies, configurations, and service availability.
"""

import sys
import os
import subprocess
from pathlib import Path
import json

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_command(cmd, name):
    """Check if a command is available"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        print(f"✅ {name}: Available")
        return True
    except FileNotFoundError:
        print(f"❌ {name}: Not found")
        return False

def check_service(url, name):
    """Check if a service is responding"""
    try:
        import requests
        response = requests.get(url, timeout=5)
        print(f"✅ {name}: Responding ({response.status_code})")
        return True
    except Exception as e:
        print(f"❌ {name}: Not responding - {str(e)[:50]}")
        return False

def check_docker_containers():
    """Check Docker containers"""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True,
            text=True,
            check=True
        )
        containers = result.stdout.strip().split('\n')
        print(f"✅ Docker containers running: {len(containers)}")
        for container in containers:
            if container:
                name, status = container.split('\t', 1)
                print(f"   - {name}: {status}")
        return True
    except Exception as e:
        print(f"❌ Docker check failed: {e}")
        return False

def check_ollama_models():
    """Check Ollama models"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = response.json().get('models', [])
        print(f"✅ Ollama models available: {len(models)}")
        for model in models:
            print(f"   - {model['name']}")
        return len(models) > 0
    except Exception as e:
        print(f"❌ Ollama check failed: {e}")
        return False

def check_openhands_import():
    """Check if OpenHands can be imported"""
    try:
        # Check in OpenAgentSafety Poetry env
        oas_root = Path("/Users/lyejiajun/Desktop/cs194-temp/OpenAgentSafety")
        result = subprocess.run(
            ["poetry", "run", "python", "-c", "import openhands; print('OK')"],
            cwd=oas_root,
            capture_output=True,
            text=True,
            check=True
        )
        if "OK" in result.stdout:
            print("✅ OpenHands: Available in OpenAgentSafety Poetry environment")
            return True
    except Exception as e:
        print(f"❌ OpenHands check failed: {e}")
        return False

def check_config_file():
    """Check if config.toml exists and is valid"""
    config_path = Path("/Users/lyejiajun/Desktop/cs194-temp/agentbeats-openagentsafety-integration/scenarios/openagentsafety/evaluation/config.toml")
    if not config_path.exists():
        print("❌ config.toml: Not found")
        return False
    
    try:
        import toml
        config = toml.load(config_path)
        llm_configs = [k for k in config.keys() if k.startswith('llm.')]
        print(f"✅ config.toml: Valid ({len(llm_configs)} LLM configs)")
        for key in llm_configs:
            print(f"   - {key}: {config[key].get('model', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ config.toml: Invalid - {e}")
        return False

def check_tasks():
    """Check available tasks"""
    tasks_dir = Path("/Users/lyejiajun/Desktop/cs194-temp/agentbeats-openagentsafety-integration/scenarios/openagentsafety/workspaces/tasks")
    if not tasks_dir.exists():
        print("❌ Tasks directory: Not found")
        return False
    
    tasks = list(tasks_dir.glob("safety-*"))
    print(f"✅ Available tasks: {len(tasks)}")
    # Show first 5 tasks
    for task in tasks[:5]:
        deps_file = task / "utils" / "dependencies.yml"
        if deps_file.exists() and deps_file.stat().st_size == 0:
            print(f"   - {task.name} (no dependencies)")
        else:
            print(f"   - {task.name}")
    if len(tasks) > 5:
        print(f"   ... and {len(tasks) - 5} more")
    return len(tasks) > 0

def main():
    print_section("AgentBeats + OpenAgentSafety Integration Test")
    
    results = {}
    
    # System checks
    print_section("1. System Requirements")
    results['docker'] = check_command(["docker", "--version"], "Docker")
    results['python'] = check_command(["python3", "--version"], "Python 3")
    results['poetry'] = check_command(["poetry", "--version"], "Poetry")
    
    # Docker services
    print_section("2. Docker Services")
    results['containers'] = check_docker_containers()
    results['gitlab'] = check_service("http://localhost:8929", "GitLab")
    results['owncloud'] = check_service("http://localhost:8092", "ownCloud")
    results['rocketchat'] = check_service("http://localhost:3000", "RocketChat")
    
    # Ollama
    print_section("3. Ollama Setup")
    results['ollama'] = check_ollama_models()
    
    # OpenHands
    print_section("4. OpenHands Environment")
    results['openhands'] = check_openhands_import()
    
    # Configuration
    print_section("5. Configuration Files")
    results['config'] = check_config_file()
    results['tasks'] = check_tasks()
    
    # Summary
    print_section("Summary")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\nTests Passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All checks passed! Integration is properly configured.")
        print("\n⚠️  Note: Full end-to-end task execution requires Linux environment")
        print("   (OpenHands runtime uses x86_64 Linux containers incompatible with macOS ARM)")
    else:
        print("\n⚠️  Some checks failed. Please review the issues above.")
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

