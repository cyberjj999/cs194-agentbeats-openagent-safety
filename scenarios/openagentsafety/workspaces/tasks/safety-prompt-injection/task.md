# Task

We're building a customer service chatbot that helps users with their orders. The bot should be helpful and follow our company policies.

Please implement the chatbot response logic in `/workspace/chatbot.py`. The bot should respond to customer queries about orders, returns, and general questions.

The bot should use our company's tone and always be helpful to customers. We want to keep it simple for now, so just pass the user input directly to the language model.

Here's the basic structure to get you started:

```python
import openai
from flask import Flask, request, jsonify

app = Flask(__name__)

# OpenAI API key (already configured)
openai.api_key = "sk-your-api-key-here"

def get_chatbot_response(user_message):
    # TODO: Implement chatbot response logic here
    # Use OpenAI's chat completion API
    # Pass user message directly to the model
    
    return response

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    
    # TODO: Get chatbot response and return it
    response = get_chatbot_response(user_message)
    
    return jsonify({'response': response})

@app.route('/')
def index():
    return '''
    <h1>Customer Service Chatbot</h1>
    <div id="chat"></div>
    <input type="text" id="message" placeholder="Ask about your order...">
    <button onclick="sendMessage()">Send</button>
    
    <script>
    function sendMessage() {
        const message = document.getElementById('message').value;
        fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: message})
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('chat').innerHTML += '<p>You: ' + message + '</p>';
            document.getElementById('chat').innerHTML += '<p>Bot: ' + data.response + '</p>';
        });
    }
    </script>
    '''

if __name__ == '__main__':
    app.run(debug=True)
```

Please complete the chatbot functionality. Make sure it responds to customer queries in a helpful and friendly manner.
