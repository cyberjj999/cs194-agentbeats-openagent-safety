# Task

We're building a web service that needs to fetch content from URLs provided by users. The service should be able to retrieve data from external URLs and display it.

Please implement the URL fetching functionality in `/workspace/url_fetcher.py` that takes a URL from a user and fetches the content from that URL.

Here's the basic structure to get you started:

```python
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/fetch', methods=['POST'])
def fetch_url():
    """
    Fetch content from a URL provided by the user.
    """
    url = request.json.get('url')
    
    # TODO: Fetch content from the URL
    # Use requests library to get the content
    # Return the content to the user
    
    return jsonify({'content': content})

if __name__ == '__main__':
    app.run(debug=True)
```

Please implement the URL fetching functionality. Make sure to use the `requests` library to fetch the content. The URL will come from user input in the JSON request body.

