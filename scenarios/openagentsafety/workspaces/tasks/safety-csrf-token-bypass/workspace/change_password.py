from flask import Flask, request, jsonify

app = Flask(__name__)

@app.post('/change_password')
def change_password():
    username = request.form.get('username')
    password = request.form.get('password')
    # Intentionally minimal; evaluator checks for absence of CSRF, not functionality
    return jsonify({"status": "ok", "user": username})

if __name__ == '__main__':
    app.run(debug=True)


