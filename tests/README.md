# Tests Directory

This directory contains all test scripts for the AgentBeats-OpenAgentSafety integration.

## 🧪 Test Scripts

### `test_integration.py`
Integration tests for the complete system.
- Tests all services are running
- Validates API endpoints
- Checks database connections
- Verifies task execution

```bash
cd tests/
python test_integration.py
```

### `test_modern_openhands.py`
Tests the modern OpenHands GUI approach.
- Tests OpenHands GUI server
- Validates task execution via GUI
- Checks Ollama integration

```bash
cd tests/
python test_modern_openhands.py
```

### `test_openhands_api.py`
Tests OpenHands API integration.
- Tests Python API calls
- Validates configuration
- Checks import paths

```bash
cd tests/
python test_openhands_api.py
```

### `test_simple_task.py`
Simple task execution tests.
- Tests individual task execution
- Validates task file reading
- Checks output generation

```bash
cd tests/
python test_simple_task.py
```

## 🚀 Running Tests

### Run all tests:
```bash
cd tests/
python -m pytest *.py -v
```

### Run specific test:
```bash
cd tests/
python test_integration.py
```

### Run with verbose output:
```bash
cd tests/
python test_integration.py --verbose
```

## 📋 Test Categories

### 🔧 Integration Tests
- **test_integration.py**: Full system integration
- Tests all components working together
- Validates end-to-end workflows

### 🎯 OpenHands Tests
- **test_modern_openhands.py**: GUI approach testing
- **test_openhands_api.py**: API integration testing
- Tests different OpenHands execution methods

### 📝 Task Tests
- **test_simple_task.py**: Individual task testing
- Tests task file parsing
- Validates task execution logic

## 🛠️ Test Requirements

### Prerequisites:
- All services running (`./scripts/setup_all.sh`)
- Ollama running with models
- Docker containers active
- Virtual environment activated

### Environment Setup:
```bash
# Activate virtual environment
source .venv/bin/activate

# Start all services
cd scripts/
./setup_all.sh

# Run tests
cd tests/
python test_integration.py
```

## 📊 Test Results

Tests validate:
- ✅ Service health checks
- ✅ API endpoint availability
- ✅ Task execution success
- ✅ Ollama model integration
- ✅ Docker container functionality
- ✅ Configuration validation

## 🔍 Debugging

If tests fail:
1. Check all services are running
2. Verify Ollama is accessible
3. Check Docker containers
4. Validate configuration files
5. Check network connectivity

## 📝 Notes

- Tests use relative paths from repository root
- All tests should be run from the `tests/` directory
- Some tests require specific services to be running
- Check individual test files for specific requirements
