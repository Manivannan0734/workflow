from flask import Blueprint, request, jsonify, abort
import requests
from app.auth.utils import token_required

ollama_bp = Blueprint("ollama", __name__)

@ollama_bp.route("/", methods=["POST"])
@token_required
def ollama_chat():
    data = request.get_json()
    model = data.get("model")
    prompt = data.get("prompt")
    stream = data.get("stream", False)

    if not model or not prompt:
        abort(400, description="Model and prompt are required.")

    try:
        ollama_res = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": stream
            }
        )

        return jsonify(ollama_res.json())

    except Exception as e:
        return jsonify({"error": str(e)}), 500
