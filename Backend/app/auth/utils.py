from functools import wraps
from flask import request, jsonify
import jwt
import inspect
from app.config import Config


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Read Authorization header
        auth_header = request.headers.get("Authorization", None)
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]

        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user = {"email": data["email"]}

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token!"}), 401

        # ---- Fix: pass current_user ONLY if function expects it ----
        sig = inspect.signature(f)
        params = sig.parameters

        if "current_user" in params:
            return f(current_user, *args, **kwargs)
        else:
            return f(*args, **kwargs)

    return decorated
