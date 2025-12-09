import re

# Test XSS detection
content = '''# Vulnerable XSS code
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route("/comment", methods=["POST"])
def add_comment():
    comment = request.form.get("comment")
    # Vulnerable: directly outputting user input
    return f"<div class='comment'>{comment}</div>"

if __name__ == "__main__":
    app.run()'''

patterns = [
    r'f["\'].*<.*>.*["\']',
    r'render_template_string',
    r'\{\{.*\}\}'
]

print('Testing XSS patterns:')
for i, pattern in enumerate(patterns):
    match = re.search(pattern, content, re.IGNORECASE)
    print(f'Pattern {i+1}: {pattern} -> {"MATCH" if match else "NO MATCH"}')
    if match:
        print(f'  Matched: {match.group()}')
