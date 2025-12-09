import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { readFile as fsReadFile } from 'fs/promises';

const SCENARIOS_DIR = path.join(process.cwd(), '..', '..', 'scenarios', 'openagentsafety');
const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');
const CONFIG_PATH = path.join(
  process.cwd(),
  '..',
  '..',
  'scenarios',
  'openagentsafety',
  'evaluation',
  'config.toml'
);

export async function POST(request: Request) {
  try {
    const { taskIds, agentLlmConfig, envLlmConfig } = await request.json() as {
      taskIds: string[];
      agentLlmConfig: string;
      envLlmConfig: string;
    };

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
    }

    // Create session
    const sessionId = `eval-${Date.now()}`;
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    await mkdir(sessionDir, { recursive: true });

    // Save session metadata
    const sessionMeta = {
      id: sessionId,
      startTime: new Date().toISOString(),
      config: {
        taskIds,
        agentLlmConfig,
        envLlmConfig,
      },
      status: 'running',
    };

    await writeFile(
      path.join(sessionDir, 'metadata.json'),
      JSON.stringify(sessionMeta, null, 2)
    );

    // Start evaluation in background
    startEvaluationProcess(sessionId, taskIds, agentLlmConfig, envLlmConfig);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Error starting evaluation:', error);
    return NextResponse.json({ error: 'Failed to start evaluation' }, { status: 500 });
  }
}

async function startEvaluationProcess(
  sessionId: string,
  taskIds: string[],
  agentLlmConfig: string,
  envLlmConfig: string
) {
  const sessionDir = path.join(SESSIONS_DIR, sessionId);
  const logFile = path.join(sessionDir, 'logs.txt');

  // Create log file
  await writeFile(logFile, `Evaluation started at ${new Date().toISOString()}\n`);
  await writeFile(logFile, `Using agentified OpenAgentSafety evaluation\n`, { flag: 'a' });
  await writeFile(logFile, `Tasks: ${taskIds.join(', ')}\n`, { flag: 'a' });
  await writeFile(logFile, `Agent LLM: ${agentLlmConfig}\n`, { flag: 'a' });
  await writeFile(logFile, `Environment LLM: ${envLlmConfig}\n`, { flag: 'a' });

  try {
    // Use the real agentified approach
    const repoRoot = path.join(process.cwd(), '..', '..');
    const venvPython = path.join(repoRoot, '.venv', 'bin', 'python');
    const fs = await import('fs');
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
    
    const resolvedAgentConfig = agentLlmConfig.includes('/')
      ? null
      : await resolveLlmConfig(agentLlmConfig);
    
    const { provider, model } = resolveProviderAndModel(
      agentLlmConfig,
      resolvedAgentConfig
    );
    
    await writeFile(logFile, `[${new Date().toISOString()}] Starting agentified evaluation\n`, { flag: 'a' });
    await writeFile(logFile, `[${new Date().toISOString()}] Model: ${model}, Provider: ${provider}\n`, { flag: 'a' });
    
    // Prepare environment variables for the agentified launcher
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      WHITE_AGENT_MODEL: model,
      WHITE_AGENT_PROVIDER: provider,
      WHITE_AGENT_TEMPERATURE: '0.0',
    };
    
    // Add OpenAI API key if using OpenAI
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    }
    
    // Run agentified evaluation using the launch command
    // Format: python agentified_main.py launch --tasks "task1,task2,task3" --max-iterations 30
    const tasksArg = taskIds.join(',');
    
    await writeFile(logFile, `[${new Date().toISOString()}] Command: ${pythonCmd} agentified_main.py launch --tasks "${tasksArg}" --max-iterations 30\n`, { flag: 'a' });
    
    const child = spawn(pythonCmd, [
      'agentified_main.py',
      'launch',
      '--tasks', tasksArg,
      '--max-iterations', '30',
    ], {
      cwd: repoRoot,
      env: env,
    });

    // Stream stdout and stderr to log file
    child.stdout.on('data', (data) => {
      const output = data.toString();
      writeFile(logFile, output, { flag: 'a' }).catch(err => {
        console.error('Error writing to log file:', err);
      });
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      writeFile(logFile, output, { flag: 'a' }).catch(err => {
        console.error('Error writing to log file:', err);
      });
    });

    // Wait for evaluation to complete
    await new Promise((resolve, reject) => {
      child.on('close', async (code) => {
        if (code === 0) {
          writeFile(logFile, `\n[${new Date().toISOString()}] Evaluation completed successfully\n`, { flag: 'a' });
        } else {
          writeFile(logFile, `\n[${new Date().toISOString()}] Evaluation completed with exit code ${code}\n`, { flag: 'a' });
        }
        
        // Parse results from logs and save to outputs directory
        try {
          await parseAndSaveResults(sessionDir, logFile);
        } catch (parseError) {
          console.error('Error parsing results:', parseError);
          // Don't fail the evaluation if parsing fails
        }
        
        resolve(code); // Don't reject, mark as completed even if some tasks failed
      });
      
      child.on('error', (error) => {
        const errorMessage = error.message;
        writeFile(logFile, `\n[${new Date().toISOString()}] Error running evaluation: ${errorMessage}\n`, { flag: 'a' });
        reject(error);
      });
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await writeFile(logFile, `\n[${new Date().toISOString()}] Error running evaluation: ${errorMessage}\n`, { flag: 'a' });
  }

  // Update session metadata
  const metadataPath = path.join(sessionDir, 'metadata.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
  metadata.status = 'completed';
  metadata.endTime = new Date().toISOString();
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function parseAndSaveResults(sessionDir: string, logFile: string) {
  // Read the log file
  const logContent = await fsReadFile(logFile, 'utf-8');
  
  // Extract the "Detailed Results:" JSON array from the logs
  // The results might be embedded in a longer string (e.g., Python object representation)
  // Look for "Detailed Results:" followed by a JSON array
  const detailedResultsIndex = logContent.indexOf('Detailed Results:');
  if (detailedResultsIndex === -1) {
    console.log('No "Detailed Results:" found in logs');
    return;
  }
  
  // Find the JSON array after "Detailed Results:"
  const afterLabel = logContent.substring(detailedResultsIndex + 'Detailed Results:'.length);
  const bracketIndex = afterLabel.indexOf('[');
  if (bracketIndex === -1) {
    console.log('No JSON array found after "Detailed Results:"');
    return;
  }
  
  // Find the matching closing bracket by counting brackets
  let bracketCount = 0;
  let endIndex = bracketIndex;
  for (let i = bracketIndex; i < afterLabel.length; i++) {
    if (afterLabel[i] === '[') bracketCount++;
    if (afterLabel[i] === ']') bracketCount--;
    if (bracketCount === 0) {
      endIndex = i + 1;
      break;
    }
  }
  
  if (bracketCount !== 0) {
    console.log('Could not find matching closing bracket for JSON array');
    return;
  }
  
  const jsonString = afterLabel.substring(bracketIndex, endIndex);
  
  try {
    // The JSON is embedded in a Python string representation in the log file
    // The issue: literal \n sequences need to be converted, but string values may contain
    // actual newlines that need to be escaped in JSON
    
    let resultsArray;
    try {
      // First, try parsing as-is (in case it's already valid JSON)
      resultsArray = JSON.parse(jsonString);
    } catch {
      // The JSON has Python string escapes - literal \n instead of newlines
      // Strategy: Convert the Python string representation to valid JSON
      // Step 1: Convert literal \n to actual newlines (for JSON structure)
      let fixedJson = jsonString;
      
      // Replace literal \n sequences with actual newlines
      // Handle the pattern: backslash followed by n (but not double backslash)
      // Strategy: Replace all \n, then fix double backslashes
      fixedJson = fixedJson.replace(/\\n/g, '\n');
      // Fix double backslashes that should remain as single backslashes
      fixedJson = fixedJson.replace(/\\\\/g, '\\');
      
      // Same for other escape sequences
      fixedJson = fixedJson.replace(/\\t/g, '\t');
      fixedJson = fixedJson.replace(/\\r/g, '\r');
      
      // Now escape any actual newlines that are inside JSON string values
      // This regex finds string values and escapes newlines within them
      // We need to be careful to handle already-escaped sequences
      fixedJson = fixedJson.replace(/"([^"]*)"/g, (match, content) => {
        // Escape newlines, tabs, etc. within the string content
        // But preserve already-escaped sequences
        const escaped = content
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/\n/g, '\\n')   // Escape newlines
          .replace(/\r/g, '\\r')   // Escape carriage returns
          .replace(/\t/g, '\\t');  // Escape tabs
        return `"${escaped}"`;
      });
      
      try {
        resultsArray = JSON.parse(fixedJson);
      } catch (secondParseError) {
        // If that still fails, use a more robust regex extraction approach
        // Extract task_name, success, and time_used separately and match them up
        console.error('Failed to parse JSON after escape replacement:', secondParseError);
        console.error('Attempting regex extraction as fallback...');
        
        // Extract task names
        const taskNamePattern = /"task_name"\s*:\s*"([^"]+)"/g;
        const taskNames: string[] = [];
        let match;
        while ((match = taskNamePattern.exec(jsonString)) !== null) {
          taskNames.push(match[1]);
        }
        
        // Extract success values
        const successPattern = /"success"\s*:\s*(true|false)/g;
        const successes: boolean[] = [];
        while ((match = successPattern.exec(jsonString)) !== null) {
          successes.push(match[1] === 'true');
        }
        
        // Extract time_used values
        const timePattern = /"time_used"\s*:\s*([\d.]+)/g;
        const times: number[] = [];
        while ((match = timePattern.exec(jsonString)) !== null) {
          times.push(parseFloat(match[1]));
        }
        
        // Match them up (they should be in the same order)
        resultsArray = [];
        const maxLength = Math.max(taskNames.length, successes.length, times.length);
        for (let i = 0; i < maxLength; i++) {
          if (taskNames[i]) {
            resultsArray.push({
              success: successes[i] ?? false,
              task_name: taskNames[i],
              time_used: times[i] ?? 0,
              agent_response: '', // Skip full response in fallback mode
              evaluation_result: null,
              error: null
            });
          }
        }
        
        if (resultsArray.length === 0) {
          throw new Error('Could not extract any results from JSON string');
        }
        
        console.log(`Extracted ${resultsArray.length} results using regex fallback`);
      }
    }
    
    // Create outputs directory
    const outputsDir = path.join(sessionDir, 'outputs');
    await mkdir(outputsDir, { recursive: true });
    
    // Save each result as eval_{task_name}.json
    for (const result of resultsArray) {
      const taskName = result.task_name || result.taskName || 'unknown';
      const evalFileName = `eval_${taskName}.json`;
      const evalFilePath = path.join(outputsDir, evalFileName);
      
      // Format the result to match expected structure
      const evalResult = {
        success: result.success || false,
        task_name: taskName,
        score: result.success ? 100 : 0,
        max_score: 100,
        time_used: result.time_used || 0,
        agent_response: result.agent_response || '',
        evaluation_result: result.evaluation_result || null,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      };
      
      await writeFile(evalFilePath, JSON.stringify(evalResult, null, 2));
      console.log(`Saved evaluation result: ${evalFileName}`);
    }
  } catch (parseError) {
    console.error('Error parsing detailed results JSON:', parseError);
    throw parseError;
  }
}

interface LlmConfig {
  name: string;
  model?: string;
  baseUrl?: string;
}

function resolveProviderAndModel(
  requestedConfig: string,
  configDetails: LlmConfig | null
) {
  let provider = 'ollama';
  let model = requestedConfig;
  
  if (requestedConfig.includes('/')) {
    [provider, model] = requestedConfig.split('/', 2);
  } else if (configDetails?.model) {
    model = configDetails.model;
    provider = detectProvider(configDetails.name, configDetails.baseUrl);
  } else if (requestedConfig.includes('gpt') || requestedConfig.includes('openai')) {
    provider = 'openai';
    model = requestedConfig.replace(/^openai\//, '').replace(/^openai-/, '');
  } else {
    provider = 'ollama';
    model = requestedConfig.replace(/^ollama-/, '');
  }
  
  return { provider, model };
}

function detectProvider(name: string, baseUrl?: string) {
  if (name.startsWith('openai') || baseUrl?.includes('openai.com')) {
    return 'openai';
  }
  return 'ollama';
}

async function resolveLlmConfig(configName: string): Promise<LlmConfig | null> {
  try {
    const content = await fsReadFile(CONFIG_PATH, 'utf-8');
    const configs = parseTomlConfigs(content);
    return configs.find((config) => config.name === configName) ?? null;
  } catch {
    return null;
  }
}

function parseTomlConfigs(content: string): LlmConfig[] {
  const configs: LlmConfig[] = [];
  const lines = content.split('\n');
  
  let currentConfig: LlmConfig | null = null;
  let inLlmSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    const llmMatch = trimmed.match(/^\[llm\.([\w.-]+)\]$/);
    if (llmMatch) {
      if (currentConfig) configs.push(currentConfig);
      currentConfig = { name: llmMatch[1] };
      inLlmSection = true;
      continue;
    }
    
    if (inLlmSection && currentConfig && trimmed && !trimmed.startsWith('#')) {
      const keyValue = trimmed.match(/^(\w+)\s*=\s*"(.+)"$/);
      if (keyValue) {
        const [, key, value] = keyValue;
        if (key === 'model') currentConfig.model = value;
        if (key === 'base_url') currentConfig.baseUrl = value;
      }
    }
    
    if (trimmed.startsWith('[') && !trimmed.startsWith('[llm.')) {
      inLlmSection = false;
      if (currentConfig) {
        configs.push(currentConfig);
        currentConfig = null;
      }
    }
  }
  
  if (currentConfig) configs.push(currentConfig);
  return configs;
}

async function readFile(path: string, encoding: BufferEncoding): Promise<string> {
  return fsReadFile(path, encoding);
}

