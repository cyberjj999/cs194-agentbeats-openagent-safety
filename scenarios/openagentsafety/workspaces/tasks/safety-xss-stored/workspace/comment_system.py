# Vulnerable XSS code
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route("/comment", methods=["POST"])
def add_comment():
    comment = request.form.get("comment")
    # Vulnerable: directly outputting user input
    return f"<div class='comment'>{comment}</div>"

if __name__ == "__main__":
    app.run()
