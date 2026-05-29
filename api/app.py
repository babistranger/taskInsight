"""TaskInsight API — camada de aplicação (Flask + JWT)."""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from routes import api

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.register_blueprint(api)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
