#!/usr/bin/env python3
"""
Modern OpenHands Integration Test for macOS

This script tests the NEW OpenHands CLI approach that works on macOS ARM.
Uses the official uv-based installation method.
"""

import subprocess
import sys
import time
import requests
from pathlib import Path

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_uv():
    """Check if uv is available"""
    try:
        result = subprocess.run(["uv", "--version"], capture_output=True, text=True, check=True)
        print(f"✅ uv: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"❌ uv: Not available - {e}")
        return False

def test_openhands_cli():
    """Test OpenHands CLI installation and basic functionality"""
    try:
        print("Testing OpenHands CLI installation...")
        result = subprocess.run([
            "uvx", "--python", "3.12", "--from", "openhands-ai", 
            "openhands", "--help"
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and "OpenHands" in result.stdout:
            print("✅ OpenHands CLI: Successfully installed and working")
            print(f"   Version info: {result.stdout.split('Welcome to OpenHands')[0].strip()}")
            return True
        else:
            print(f"❌ OpenHands CLI: Failed - {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("❌ OpenHands CLI: Installation timed out")
        return False
    except Exception as e:
        print(f"❌ OpenHands CLI: Error - {e}")
        return False

def test_openhands_gui():
    """Test OpenHands GUI server (without actually starting it)"""
    try:
        print("Testing OpenHands GUI server availability...")
        result = subprocess.run([
            "uvx", "--python", "3.12", "--from", "openhands-ai", 
            "openhands", "serve", "--help"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ OpenHands GUI: Available")
            return True
        else:
            print(f"❌ OpenHands GUI: Failed - {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ OpenHands GUI: Error - {e}")
        return False

def test_docker_services():
    """Test if Docker services are still running"""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True, text=True, check=True
        )
        containers = [line for line in result.stdout.strip().split('\n') if line]
        print(f"✅ Docker services: {len(containers)} containers running")
        for container in containers:
            name, status = container.split('\t', 1)
            print(f"   - {name}: {status}")
        return len(containers) > 0
    except Exception as e:
        print(f"❌ Docker services: Error - {e}")
        return False

def test_ollama():
    """Test Ollama availability"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = response.json().get('models', [])
        print(f"✅ Ollama: {len(models)} models available")
        for model in models:
            print(f"   - {model['name']}")
        return len(models) > 0
    except Exception as e:
        print(f"❌ Ollama: Not available - {e}")
        return False

def test_openhands_with_config():
    """Test OpenHands with a simple configuration"""
    try:
        # Create a simple config for testing
        config_content = """
[llm]
model = "deepseek-r1:1.5b"
base_url = "http://localhost:11434/v1"
api_key = "ollama"

[agent]
type = "CodeAct"
"""
        config_path = Path("test_config.toml")
        config_path.write_text(config_content.strip())
        
        print("Testing OpenHands with configuration...")
        # Test CLI with a simple task (just check it starts)
        result = subprocess.run([
            "uvx", "--python", "3.12", "--from", "openhands-ai", 
            "openhands", "cli", "--config-file", str(config_path),
            "--task", "echo 'Hello from OpenHands'", "--log-level", "ERROR"
        ], capture_output=True, text=True, timeout=30)
        
        # Clean up
        config_path.unlink(missing_ok=True)
        
        if "OpenHands" in result.stdout or result.returncode == 0:
            print("✅ OpenHands with config: Working")
            return True
        else:
            print(f"❌ OpenHands with config: Failed - {result.stderr[:100]}")
            return False
    except Exception as e:
        print(f"❌ OpenHands with config: Error - {e}")
        return False

def main():
    print_section("Modern OpenHands Integration Test (macOS ARM)")
    print("Testing the NEW OpenHands CLI approach that works on macOS")
    
    results = {}
    
    # Test uv
    print_section("1. Prerequisites")
    results['uv'] = check_uv()
    
    # Test OpenHands CLI
    print_section("2. OpenHands CLI Installation")
    results['openhands_cli'] = test_openhands_cli()
    
    # Test OpenHands GUI
    print_section("3. OpenHands GUI Server")
    results['openhands_gui'] = test_openhands_gui()
    
    # Test existing services
    print_section("4. Existing Services")
    results['docker'] = test_docker_services()
    results['ollama'] = test_ollama()
    
    # Test OpenHands with config
    print_section("5. OpenHands Configuration Test")
    results['openhands_config'] = test_openhands_with_config()
    
    # Summary
    print_section("Summary")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\nTests Passed: {passed}/{total}")
    
    if results.get('openhands_cli', False):
        print("\n🎉 SUCCESS: Modern OpenHands works on macOS ARM!")
        print("\nYou can now use OpenHands directly:")
        print("  • CLI: uvx --python 3.12 --from openhands-ai openhands cli")
        print("  • GUI: uvx --python 3.12 --from openhands-ai openhands serve")
        print("\nThis is a MAJOR improvement over the old Poetry-based approach!")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
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
