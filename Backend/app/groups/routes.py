from flask import Blueprint, request, jsonify
from app.db import get_cursor, conn
from app.auth.utils import token_required
groups_bp = Blueprint("groups", __name__)

# -----------------------------
# 1. Get all groups
# -----------------------------


@groups_bp.route("/", methods=["GET"])
@token_required
def get_groups():
    cur = get_cursor()
    try:
        cur.execute(
            '''
            SELECT id, name, "createdAt", "createdBy", email
            FROM "Group"
            WHERE COALESCE(is_deleted, false) = false
            ORDER BY "createdAt" DESC
            ''')
        groups = cur.fetchall()
        return jsonify([
            {
                "id": g[0],
                "name": g[1],
                "createdAt": g[2].isoformat() if g[2] else None,
                "createdBy": g[3],
                "email": g[4]

            } for g in groups
        ])
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# -----------------------------
# 2. Get members of a specific group
# -----------------------------


@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@token_required
def get_group_members(group_id):
    cur = get_cursor()
    try:
        cur.execute('''
            SELECT u.id, u."firstName", u."lastName", u."displayName", u.email, u."dept"
            FROM "GroupMember" gm
            JOIN "User" u ON u.id = gm."userId"
            WHERE gm."groupId" = %s AND COALESCE(u."isDeleted", false)=false
            ORDER BY u."firstName"
        ''', (group_id,))
        members = cur.fetchall()
        return jsonify([
            {
                "id": m[0],
                "firstName": m[1],
                "lastName": m[2],
                "displayName": m[3],
                "email": m[4],
                "dept": m[5]
            }
            for m in members
        ])
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# -----------------------------
# 3. Soft delete a group
# -----------------------------


@groups_bp.route("/delete/<int:group_id>", methods=["PUT"])
@token_required
def soft_delete_group(group_id):
    cur = get_cursor()
    try:
        cur.execute(
            'UPDATE "Group" SET "is_deleted" = TRUE WHERE id = %s', (group_id,)
        )
        conn.commit()
        return jsonify({"success": True, "message": "Group soft deleted"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# -----------------------------
# 4. Get all users (for dropdown)
# -----------------------------


@groups_bp.route("/users", methods=["GET"])
@token_required
def get_all_users():
    cur = get_cursor()
    try:
        cur.execute('''
            SELECT id, "firstName", "lastName", email 
            FROM "User"
            WHERE COALESCE("isDeleted", false)=false
            ORDER BY "firstName"
        ''')
        users = cur.fetchall()
        return jsonify([
            {"id": u[0], "name": f"{u[1]} {u[2]}", "email": u[3]}
            for u in users
        ])
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# -----------------------------
# 5. Update members of a group
# -----------------------------


@groups_bp.route("/update_members/<int:group_id>", methods=["PUT"])
@token_required
def update_group_members(group_id):
    data = request.get_json()
    new_user_ids = data.get("userIds", [])
    cur = get_cursor()
    try:
        # Remove all existing members
        cur.execute(
            'DELETE FROM "GroupMember" WHERE "groupId" = %s', (group_id,))

        # Add new members
        for uid in new_user_ids:
            cur.execute(
                'INSERT INTO "GroupMember" ("groupId", "userId") VALUES (%s, %s)',
                (group_id, uid)
            )
        conn.commit()
        return jsonify({"success": True, "message": "Group members updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
