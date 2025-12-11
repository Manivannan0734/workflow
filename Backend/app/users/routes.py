from flask import Blueprint, request, jsonify, abort
from app.db import get_cursor, conn
from app.auth.utils import token_required

users_bp = Blueprint("users", __name__)

@users_bp.route("/all", methods=["GET"])
@token_required
def get_users_all():
     
    #abort(500)
    
    show_deleted = request.args.get("showDeleted", "false").lower() == "true"
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 5))
    offset = (page - 1) * limit

    cur = get_cursor()
    try:
        if show_deleted:
            cur.execute(
                'SELECT COUNT(*) FROM "User"'
            )
        else:
            cur.execute(
                'SELECT COUNT(*) FROM "User" WHERE "isDeleted"=FALSE'
            )
        total_users = cur.fetchone()[0]
        total_pages = (total_users + limit - 1) // limit

        if show_deleted:
            cur.execute(
                'SELECT id, "firstName", "lastName", "displayName", "email", "dept", "createdAt", "updateSource", "isDeleted" '
                'FROM "User" ORDER BY id ASC LIMIT %s OFFSET %s',
                (limit, offset)
            )
        else:
            cur.execute(
                'SELECT id, "firstName", "lastName", "displayName", "email", "dept", "createdAt", "updateSource", "isDeleted" '
                'FROM "User" WHERE "isDeleted"=FALSE ORDER BY id ASC LIMIT %s OFFSET %s',
                (limit, offset)
            )

        users = cur.fetchall()
        user_list = [
            {
                "id": u[0],
                "firstName": u[1],
                "lastName": u[2],
                "displayName": u[3],
                "email": u[4],
                "dept": u[5],
                "createdAt": u[6].isoformat(),
                "updateSource": u[7],
                "isDeleted": u[8],
            }
            for u in users
        ]

        return jsonify({
            "users": user_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_users,
                "totalPages": total_pages
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@users_bp.route("/update/<int:user_id>", methods=["PUT"])
@token_required
def update_user(user_id):
    data = request.get_json()
    cur = get_cursor()
    try:
        fields, values = [], []
        for key in ["firstName", "lastName", "displayName", "email", "dept", "updateSource"]:
            if key in data:
                fields.append(f'"{key}"=%s')
                values.append(data[key])
        if not fields:
            return jsonify({"success": False, "message": "No fields to update"}), 400

        values.append(user_id)
        sql = f'UPDATE "User" SET {", ".join(fields)} WHERE id=%s RETURNING id, "firstName", "lastName", "displayName", "email", "dept", "createdAt", "updateSource"'
        cur.execute(sql, tuple(values))
        updated = cur.fetchone()
        conn.commit()

        if updated:
            user = {
                "id": updated[0],
                "firstName": updated[1],
                "lastName": updated[2],
                "displayName": updated[3],
                "email": updated[4],
                "dept": updated[5],
                "createdAt": updated[6].isoformat(),
                "updateSource": updated[7]
            }
            return jsonify(user)
        return jsonify({"success": False, "message": "User not found"}), 404
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@users_bp.route("/delete/<int:user_id>", methods=["PUT"])
@token_required
def soft_delete_user(user_id):
    cur = get_cursor()
    try:
        cur.execute(
            'UPDATE "User" SET "isDeleted"=TRUE WHERE id=%s RETURNING id', (user_id,)
        )
        result = cur.fetchone()
        if result:
            conn.commit()
            return jsonify({"success": True, "message": "User deleted successfully"})
        else:
            return jsonify({"success": False, "message": "User not found"}), 404
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500




@users_bp.route("/search", methods=["GET"])
@token_required
def search_users():
    """
    Search users by firstName, lastName, displayName, or email (non-deleted users only)
    Query Params:
        q: string
    """
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"users": []})

    cur = get_cursor()
    try:
        cur.execute(
            '''
            SELECT id, "firstName", "lastName", "displayName", "email", "dept", "createdAt", "updateSource"
            FROM "User"
            WHERE "isDeleted"=FALSE
            AND (
                "firstName" ILIKE %s OR
                "lastName" ILIKE %s OR
                
                "email" ILIKE %s
            )
            ORDER BY id ASC
            LIMIT 10
            ''',
            (f"%{query}%", f"%{query}%",   f"%{query}%")
        )
        users = cur.fetchall()
        user_list = [
            {
                "id": u[0],
                "firstName": u[1],
                "lastName": u[2],
                "displayName": u[3],
                "email": u[4],
                "dept": u[5],
                "createdAt": u[6].isoformat(),
                "updateSource": u[7]
            }
            for u in users
        ]
        return jsonify({"users": user_list})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}) 
