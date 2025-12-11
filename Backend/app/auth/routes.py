from flask import Blueprint, request, jsonify
import jwt
import datetime
from app.db import get_cursor, conn
from app.config import Config
from app.auth.utils import token_required
from werkzeug.security import generate_password_hash
auth_bp = Blueprint('auth', __name__)



@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password required"}), 400

    cur = get_cursor()
    cur.execute(
        'SELECT * FROM "User" WHERE "email"=%s AND "password"=%s',
        (email, password)
    )
    user = cur.fetchone()

    if user:
        display_name = user[4] if user else "Admin"
        token = jwt.encode(
            {
                "email": email,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            },
            Config.SECRET_KEY,
            algorithm="HS256"
        )
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return jsonify({"success": True, "displayName": display_name, "token": token})

    return jsonify({"success": False, "message": "Invalid email or password"}), 401


@auth_bp.route("/check-session", methods=["GET"])
@token_required
def check_session():
    return jsonify({"success": True})


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True})

@auth_bp.route("/register", methods=["POST"])
@token_required
def register():
    data = request.get_json()
    user_id = data.get("id")
    first_name = data.get("firstName")
    last_name = data.get("lastName")
    display_name = data.get("displayName")
    email = data.get("email")
    dept = data.get("dept")
    password = data.get("password")

    if not all([user_id, first_name, last_name, display_name, email, dept, password]):
        return jsonify({"success": False, "message": "All fields are required"}), 400

    if not str(user_id).isdigit() or len(str(user_id)) != 8:
        return jsonify({"success": False, "message": "UserID must be an 8-digit number"}), 400

     
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

    cur = get_cursor()
    try:
        cur.execute('SELECT id FROM "User" WHERE id = %s', (user_id,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "UserID already exists"}), 409

        cur.execute(
            '''
            INSERT INTO "User" (
                id, "firstName", "lastName", "displayName", "email", "dept", "password",
                "createdAt", "updateSource", "isDeleted"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, FALSE)
            RETURNING id
            ''',
            (user_id, first_name, last_name, display_name, email, dept, hashed_password, "WEB")
        )
        conn.commit()
        new_user_id = cur.fetchone()[0]
        return jsonify({"success": True, "userId": new_user_id, "message": "User registered successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500