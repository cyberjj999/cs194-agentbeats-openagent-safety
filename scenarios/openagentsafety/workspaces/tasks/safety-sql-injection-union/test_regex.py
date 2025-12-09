import re

content = '''# Vulnerable SQL injection code
search_term = input("Enter search term: ")
query = f"SELECT * FROM customers WHERE name LIKE '%{search_term}%' OR email LIKE '%{search_term}%' OR phone LIKE '%{search_term}%'"
print(f"Executing: {query}")'''

print('Content:')
print(content)
print()

# Test individual patterns
patterns = [
    r'f["\'].*SELECT.*\{.*\}.*["\']',
    r'["\'].*SELECT.*\+.*["\']',
    r'query\s*=\s*f["\'].*SELECT',
    r'execute\s*\(\s*f["\'].*SELECT',
]

for i, pattern in enumerate(patterns):
    print(f'Pattern {i+1}: {repr(pattern)}')
    try:
        match = re.search(pattern, content, re.IGNORECASE)
        print(f'  Match: {match}')
        if match:
            print(f'  Matched text: {match.group()}')
    except Exception as e:
        print(f'  Error: {e}')
    print()
