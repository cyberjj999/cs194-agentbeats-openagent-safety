import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'evaluation-sessions');

async function parseAndSaveResults(sessionDir: string, logFile: string) {
  // Read the log file
  const logContent = await readFile(logFile, 'utf-8');
  
  // Extract the "Detailed Results:" JSON array from the logs
  const detailedResultsIndex = logContent.indexOf('Detailed Results:');
  if (detailedResultsIndex === -1) {
    console.log(`  No "Detailed Results:" found in logs`);
    return false;
  }
  
  // Find the JSON array after "Detailed Results:"
  const afterLabel = logContent.substring(detailedResultsIndex + 'Detailed Results:'.length);
  const bracketIndex = afterLabel.indexOf('[');
  if (bracketIndex === -1) {
    console.log(`  No JSON array found after "Detailed Results:"`);
    return false;
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
    console.log(`  Could not find matching closing bracket for JSON array`);
    return false;
  }
  
  let jsonString = afterLabel.substring(bracketIndex, endIndex);
  
  try {
    // The JSON is embedded in a Python string, so it has literal \n (backslash + n)
    // that need to be converted to actual newlines for JSON parsing
    // But we need to preserve JSON string escapes like \" inside strings
    
    // Strategy: Replace \n outside of JSON strings with actual newlines
    // This is tricky, but we can use a simple approach:
    // 1. Replace standalone \n (not \\n) with newlines
    // 2. The JSON structure itself should have actual newlines or be compact
    
    // Actually, looking at the format, the JSON has literal \n characters
    // that are Python string escapes. We need to convert them to actual newlines.
    // But inside JSON strings, \n should stay as \n (escaped newline in the string value)
    
    // Simple approach: replace \n that's not inside a JSON string
    // We can do this by replacing \n that's followed by whitespace and a quote or bracket
    let unescaped = jsonString;
    
    // Replace \n (literal backslash-n) with actual newline
    // But be careful - inside JSON strings, \n should remain as \n
    // The pattern: \n followed by space and { or [ or " means it's a structure newline
    unescaped = unescaped.replace(/\\n/g, '\n');
    
    // Also handle other Python escapes
    unescaped = unescaped.replace(/\\'/g, "'");
    
    // Now try to parse
    let resultsArray;
    try {
      resultsArray = JSON.parse(unescaped);
    } catch (parseError) {
      // If that fails, the JSON strings might have issues
      // Try to fix escaped quotes in strings: \" should stay as \"
      // But if we see \\", that's a Python escape that should become \"
      unescaped = jsonString
        .replace(/\\\\n/g, '\n')      // \\n -> newline
        .replace(/\\\\'/g, "'")       // \\' -> '
        .replace(/\\\\"/g, '\\"')     // \\" -> \" (JSON escape)
        .replace(/\\\\/g, '\\');      // \\ -> \
      
      resultsArray = JSON.parse(unescaped);
    }
    
    // Create outputs directory
    const outputsDir = path.join(sessionDir, 'outputs');
    await mkdir(outputsDir, { recursive: true });
    
    // Save each result as eval_{task_name}.json
    let savedCount = 0;
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
      savedCount++;
    }
    
    console.log(`  ✅ Saved ${savedCount} evaluation result(s)`);
    return true;
  } catch (parseError) {
    console.error(`  ❌ Error parsing results:`, parseError);
    return false;
  }
}

async function main() {
  console.log('Parsing results from existing evaluation sessions...\n');
  
  const sessionDirs = await readdir(SESSIONS_DIR).catch(() => []);
  const evalDirs = sessionDirs.filter(dir => dir.startsWith('eval-'));
  
  console.log(`Found ${evalDirs.length} session directories\n`);
  
  let processed = 0;
  let saved = 0;
  
  for (const sessionId of evalDirs) {
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    const logFile = path.join(sessionDir, 'logs.txt');
    const outputsDir = path.join(sessionDir, 'outputs');
    
    // Check if outputs already exist
    try {
      const existingFiles = await readdir(outputsDir).catch(() => []);
      const evalFiles = existingFiles.filter(f => f.startsWith('eval_') && f.endsWith('.json'));
      
      if (evalFiles.length > 0) {
        console.log(`${sessionId}: Already has ${evalFiles.length} result file(s), skipping`);
        continue;
      }
    } catch {
      // outputs directory doesn't exist, which is fine
    }
    
    // Try to parse and save results
    console.log(`Processing ${sessionId}...`);
    const success = await parseAndSaveResults(sessionDir, logFile);
    processed++;
    if (success) saved++;
  }
  
  console.log(`\n✅ Processed ${processed} sessions, saved results for ${saved} sessions`);
}

main().catch(console.error);

