#!/usr/bin/env python3
"""Parse evaluation results from existing session logs and save them as JSON files."""

import json
import os
import re
from pathlib import Path

SESSIONS_DIR = Path(__file__).parent.parent / 'evaluation-sessions'

def parse_and_save_results(session_dir: Path, log_file: Path) -> bool:
    """Parse results from log file and save to outputs directory."""
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Find "Detailed Results:" section
        detailed_results_index = log_content.find('Detailed Results:')
        if detailed_results_index == -1:
            print(f'  No "Detailed Results:" found in logs')
            return False
        
        # Find the JSON array after "Detailed Results:"
        after_label = log_content[detailed_results_index + len('Detailed Results:'):]
        bracket_index = after_label.find('[')
        if bracket_index == -1:
            print(f'  No JSON array found after "Detailed Results:"')
            return False
        
        # Find matching closing bracket
        bracket_count = 0
        end_index = bracket_index
        for i, char in enumerate(after_label[bracket_index:], start=bracket_index):
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    end_index = i + 1
                    break
        
        if bracket_count != 0:
            print(f'  Could not find matching closing bracket')
            return False
        
        json_string = after_label[bracket_index:end_index]
        
        # The JSON is embedded in a Python string representation
        # Use ast.literal_eval to properly parse the Python string, then extract JSON
        import ast
        
        # Try to find the full Python string that contains the JSON
        # Look backwards from "Detailed Results:" to find the start of the text='...'
        text_start = log_content.rfind("text='", 0, detailed_results_index)
        if text_start != -1:
            # Find the matching closing quote
            text_content_start = text_start + len("text='")
            # The content goes until the next ' that's not escaped
            # But it's easier to find the closing ')) pattern
            text_end = log_content.find("'))", text_content_start)
            if text_end != -1:
                # Extract the Python string (with escapes)
                python_string = log_content[text_start:text_end + 1]
                try:
                    # Use ast.literal_eval to parse the Python string
                    # This handles all Python string escapes correctly
                    parsed_text = ast.literal_eval(python_string)
                    # Now find "Detailed Results:" in the parsed text
                    detailed_idx = parsed_text.find('Detailed Results:')
                    if detailed_idx != -1:
                        json_part = parsed_text[detailed_idx + len('Detailed Results:'):].strip()
                        bracket_idx = json_part.find('[')
                        if bracket_idx != -1:
                            # Find matching ]
                            bracket_count = 0
                            end_idx = bracket_idx
                            for i, char in enumerate(json_part[bracket_idx:], start=bracket_idx):
                                if char == '[':
                                    bracket_count += 1
                                elif char == ']':
                                    bracket_count -= 1
                                    if bracket_count == 0:
                                        end_idx = i + 1
                                        break
                            json_string = json_part[bracket_idx:end_idx]
                except (SyntaxError, ValueError):
                    pass  # Fall back to original method
        
        # The JSON string has Python string escapes that need to be converted
        # Key insight: \\n in Python string means literal \n (backslash + n)
        # In JSON, \n inside a string is a valid escape for newline
        # But \\n means literal backslash + n
        # So we need to:
        # 1. Replace \\n (double backslash + n) with \n (single backslash + n) - this is JSON escape
        # 2. But the structure itself has \n for newlines between JSON elements
        
        # Actually, looking at the format: [\n means [ followed by newline (structure)
        # But inside strings, \\n means \n (JSON escape for newline in the string value)
        # So we need to be smarter: replace \n that's outside strings with actual newline
        # But keep \\n inside strings as \n (JSON escape)
        
        # Simpler approach: replace all \n with newline first (for structure)
        # Then fix any \\ that became \ to be \\
        unescaped = json_string
        
        # Replace \n (literal backslash-n) with actual newline for JSON structure
        unescaped = unescaped.replace('\\n', '\n')
        
        # Now fix any \\ that should stay as \\ (for JSON string escapes)
        # But this is tricky because we already converted \n
        # Actually, the issue is that \\n should become \n (JSON escape), not newline
        # So we need to do this in reverse: first handle \\, then \n
        
        # Better: use a regex to replace \n only when it's not part of \\
        import re
        # Replace \n that's not preceded by \ (i.e., standalone \n)
        # But \\n should become \n (JSON escape in string)
        unescaped = re.sub(r'(?<!\\)\\n', '\n', json_string)
        # Now handle \\n -> \n (JSON escape)
        unescaped = unescaped.replace('\\\\n', '\\n')
        # Fix single quotes
        unescaped = unescaped.replace("\\'", "'")
        
        try:
            results_array = json.loads(unescaped)
        except json.JSONDecodeError as e:
            # Last resort: try with minimal fixes
            try:
                # Just replace structure newlines, keep string escapes
                minimal = json_string.replace('\\n', '\n')
                # Remove any remaining invalid escapes by removing the backslash
                minimal = re.sub(r'\\(?![\\"/bfnrt]|u[0-9a-fA-F]{4})', '', minimal)
                results_array = json.loads(minimal)
            except json.JSONDecodeError as e2:
                print(f'  ❌ Error parsing JSON: {e2}')
                return False
        
        # Create outputs directory
        outputs_dir = session_dir / 'outputs'
        outputs_dir.mkdir(exist_ok=True)
        
        # Save each result
        saved_count = 0
        for result in results_array:
            task_name = result.get('task_name') or result.get('taskName') or 'unknown'
            eval_file = outputs_dir / f'eval_{task_name}.json'
            
            eval_result = {
                'success': result.get('success', False),
                'task_name': task_name,
                'score': 100 if result.get('success') else 0,
                'max_score': 100,
                'time_used': result.get('time_used', 0),
                'agent_response': result.get('agent_response', ''),
                'evaluation_result': result.get('evaluation_result'),
                'error': result.get('error'),
                'timestamp': json.dumps({'$date': 'now'}, default=str)
            }
            
            with open(eval_file, 'w') as f:
                json.dump(eval_result, f, indent=2)
            saved_count += 1
        
        print(f'  ✅ Saved {saved_count} evaluation result(s)')
        return True
        
    except Exception as e:
        print(f'  ❌ Error: {e}')
        return False

def main():
    print('Parsing results from existing evaluation sessions...\n')
    
    if not SESSIONS_DIR.exists():
        print(f'Error: Sessions directory not found: {SESSIONS_DIR}')
        return
    
    eval_dirs = [d for d in SESSIONS_DIR.iterdir() if d.is_dir() and d.name.startswith('eval-')]
    print(f'Found {len(eval_dirs)} session directories\n')
    
    processed = 0
    saved = 0
    
    for session_dir in sorted(eval_dirs):
        log_file = session_dir / 'logs.txt'
        outputs_dir = session_dir / 'outputs'
        
        # Check if outputs already exist
        if outputs_dir.exists():
            eval_files = list(outputs_dir.glob('eval_*.json'))
            if eval_files:
                print(f'{session_dir.name}: Already has {len(eval_files)} result file(s), skipping')
                continue
        
        if not log_file.exists():
            print(f'{session_dir.name}: No logs.txt found, skipping')
            continue
        
        print(f'Processing {session_dir.name}...')
        success = parse_and_save_results(session_dir, log_file)
        processed += 1
        if success:
            saved += 1
    
    print(f'\n✅ Processed {processed} sessions, saved results for {saved} sessions')

if __name__ == '__main__':
    main()

