import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '..', '..', 'scenarios', 'openagentsafety', 'evaluation', 'config.toml');

export async function GET() {
  try {
    const configContent = await readFile(CONFIG_PATH, 'utf-8');
    const configs = parseTomlConfigs(configContent);
    
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error reading LLM configs:', error);
    // Return default configs if file doesn't exist
    // Format matches agentified code: "ollama/model-name" or "openai/model-name"
    return NextResponse.json([
      {
        name: 'ollama/deepseek-r1:1.5b',
        model: 'deepseek-r1:1.5b',
        baseUrl: 'http://localhost:11434/v1',
        isLocal: true,
      },
      {
        name: 'ollama/llama3.2:latest',
        model: 'llama3.2:latest',
        baseUrl: 'http://localhost:11434/v1',
        isLocal: true,
      },
      {
        name: 'ollama/gemma3:1b',
        model: 'gemma3:1b',
        baseUrl: 'http://localhost:11434/v1',
        isLocal: true,
      },
      {
        name: 'openai/gpt-4o',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1',
        isLocal: false,
      },
    ]);
  }
}

interface ParsedConfig {
  name: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  isLocal: boolean;
}

function parseTomlConfigs(content: string): ParsedConfig[] {
  const configs: ParsedConfig[] = [];
  const lines = content.split('\n');
  
  let currentConfig: Partial<ParsedConfig> | null = null;
  let inLlmSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for [llm.xxx] section
    const llmMatch = trimmed.match(/^\[llm\.([\w.-]+)\]$/);
    if (llmMatch) {
      // Save previous config if exists
      if (currentConfig && currentConfig.name) {
        configs.push(currentConfig as ParsedConfig);
      }
      
      // Start new config
      currentConfig = {
        name: llmMatch[1],
        isLocal: llmMatch[1].startsWith('ollama'),
      };
      inLlmSection = true;
      continue;
    }
    
    // Parse config properties
    if (inLlmSection && currentConfig && trimmed && !trimmed.startsWith('#')) {
      const keyValue = trimmed.match(/^(\w+)\s*=\s*"(.+)"$/);
      if (keyValue) {
        const [, key, value] = keyValue;
        if (key === 'model') currentConfig.model = value;
        else if (key === 'base_url') currentConfig.baseUrl = value;
        else if (key === 'api_key' && value !== 'your-anthropic-api-key-here' && value !== 'your-openai-api-key-here') {
          currentConfig.apiKey = value;
        }
      }
    }
    
    // End of section
    if (trimmed.startsWith('[') && !trimmed.startsWith('[llm.')) {
      inLlmSection = false;
      if (currentConfig && currentConfig.name) {
        configs.push(currentConfig as ParsedConfig);
        currentConfig = null;
      }
    }
  }
  
  // Add last config
  if (currentConfig && currentConfig.name) {
    configs.push(currentConfig as ParsedConfig);
  }
  
  return configs;
}

