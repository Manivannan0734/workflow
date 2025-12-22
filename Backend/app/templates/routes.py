from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db import get_cursor, conn
from app.auth.utils import token_required

templates_bp = Blueprint("templates", __name__)

# ===============================
# GET ALL TEMPLATES
# ===============================
@templates_bp.route("/", methods=["GET"])
@token_required
def get_templates():
    cur = get_cursor()
    cur.execute("""
        SELECT id, name, description, "createdOn", "createdBy", label
        FROM "Template"
        WHERE "isDeleted" = false
        ORDER BY "createdOn" DESC
    """)
    rows = cur.fetchall()
    cur.close()

    return jsonify([
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "createdOn": r[3].strftime("%d/%m/%Y %H:%M"),
            "createdBy": r[4],
            "label": r[5],
        }
        for r in rows
    ]), 200


# ===============================
# GET SUBTASKS (FLOW API)
# ===============================
@templates_bp.route("/<int:template_id>/subtasks", methods=["GET"])
@token_required
def get_subtasks(template_id):
    cur = get_cursor()
    cur.execute("""
        SELECT action, "dependsOn", description
        FROM "SubTask"
        WHERE "templateId" = %s
        ORDER BY id ASC
    """, (template_id,))
    rows = cur.fetchall()
    cur.close()

    return jsonify([
        {
            "action": r[0],
            "dependsOn": r[1],
            "description": r[2]
        }
        for r in rows
    ]), 200


# ===============================
# GET TEMPLATE BY ID (WITH SUBTASKS)
# ===============================
@templates_bp.route("/<int:id>", methods=["GET"])
@token_required
def get_template_by_id(id):
    cur = get_cursor()
    cur.execute("""
        SELECT id, name, description, "createdOn", "createdBy", label
        FROM "Template"
        WHERE id = %s AND "isDeleted" = false
    """, (id,))
    row = cur.fetchone()

    if not row:
        cur.close()
        return jsonify({"error": "Template not found"}), 404

    template = {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "createdOn": row[3].strftime("%d/%m/%Y %H:%M"),
        "createdBy": row[4],
        "label": row[5],
    }

    cur.execute("""
        SELECT id, action, "dependsOn", description, assignee
        FROM "SubTask"
        WHERE "templateId" = %s
        ORDER BY id ASC
    """, (id,))
    subtask_rows = cur.fetchall()
    cur.close()

    template["subtasks"] = [
        {
            "id": r[0],
            "action": r[1],
            "dependsOn": r[2],
            "description": r[3],
            "assignee": r[4],
        }
        for r in subtask_rows
    ]

    return jsonify(template), 200


# ===============================
# CREATE TEMPLATE
# ===============================
@templates_bp.route("/", methods=["POST"])
@token_required
def add_template():
    data = request.json
    cur = get_cursor()

    cur.execute("""
        INSERT INTO "Template"
        (name, description, "createdBy", "createdOn", label, "isDeleted")
        VALUES (%s, %s, %s, %s, %s, false)
        RETURNING id
    """, (
        data["name"],
        data.get("description"),
        data.get("createdBy", "Admin"),
        datetime.now(),
        data.get("label"),
    ))

    template_id = cur.fetchone()[0]

    for s in data.get("subtasks", []):
        cur.execute("""
            INSERT INTO "SubTask"
            (action, "dependsOn", description, assignee, "templateId")
            VALUES (%s, %s, %s, %s, %s)
        """, (
            s.get("action"),
            s.get("dependsOn"),
            s.get("description"),
            s.get("assignee"),
            template_id
        ))

    conn.commit()
    cur.close()
    return jsonify({"id": template_id}), 201


# ===============================
# UPDATE TEMPLATE
# ===============================
@templates_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_template(id):
    data = request.json
    cur = get_cursor()

    cur.execute("""
        UPDATE "Template"
        SET name=%s, description=%s, "createdBy"=%s, label=%s
        WHERE id=%s
    """, (
        data["name"],
        data.get("description"),
        data.get("createdBy", "Admin"),
        data.get("label"),
        id
    ))

    cur.execute("""DELETE FROM "SubTask" WHERE "templateId"=%s""", (id,))

    for s in data.get("subtasks", []):
        cur.execute("""
            INSERT INTO "SubTask"
            (action, "dependsOn", description, assignee, "templateId")
            VALUES (%s, %s, %s, %s, %s)
        """, (
            s.get("action"),
            s.get("dependsOn"),
            s.get("description"),
            s.get("assignee"),
            id
        ))

    conn.commit()
    cur.close()
    return jsonify({"message": "Updated"}), 200


# ===============================
# SOFT DELETE
# ===============================
@templates_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_template(id):
    cur = get_cursor()
    cur.execute("""UPDATE "Template" SET "isDeleted"=true WHERE id=%s""", (id,))
    conn.commit()
    cur.close()
    return jsonify({"message": "Deleted"}), 200
