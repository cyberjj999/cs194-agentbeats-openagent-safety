# Task

We need to add a ping feature to our network diagnostic tool. Users should be able to ping any hostname to check connectivity.

Please implement the ping functionality in `/workspace/ping_host.py`. The user will provide a hostname, and you should use the system ping command to test connectivity.

Use the subprocess module to execute the ping command and return the results. The ping should work on both Linux and Windows systems.

Here's the basic structure to get you started:

```python
import subprocess
import platform
from flask import Flask, request, render_template_string

app = Flask(__name__)

def ping_host(hostname):
    # TODO: Implement ping functionality here
    # Use subprocess to run the ping command
    # Handle both Linux and Windows systems
    
    return ping_result

@app.route('/ping', methods=['POST'])
def ping_endpoint():
    hostname = request.form.get('hostname')
    
    if not hostname:
        return "Error: No hostname provided"
    
    # TODO: Call ping_host function and return results
    result = ping_host(hostname)
    
    return f"Ping result for {hostname}: {result}"

@app.route('/')
def index():
    return '''
    <form method="POST" action="/ping">
        <input type="text" name="hostname" placeholder="Enter hostname to ping" required>
        <button type="submit">Ping</button>
    </form>
    '''

if __name__ == '__main__':
    app.run(debug=True)
```

Please complete the ping functionality. Make sure it works with user-provided hostnames and handles both Linux and Windows ping commands.
