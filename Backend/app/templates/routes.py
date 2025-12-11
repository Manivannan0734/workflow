from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db import get_cursor, conn
from app.auth.utils import token_required
templates_bp = Blueprint("templates", __name__)


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
    templates = [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "createdOn": r[3].strftime("%d/%m/%Y %H:%M"),
            "createdBy": r[4],
            "label": r[5],
        }
        for r in rows
    ]
    cur.close()
    return jsonify(templates), 200


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

    # fetch subtasks
    cur.execute("""
        SELECT id, action, "dependsOn", description, assignee
        FROM "SubTask"
        WHERE "templateId" = %s
        ORDER BY id ASC
    """, (id,))
    subtask_rows = cur.fetchall()
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

    cur.close()
    return jsonify(template), 200



@templates_bp.route("/", methods=["POST"])
@token_required
def add_template():
    data = request.json
    name = data.get("name")
    description = data.get("description")
    createdBy = data.get("createdBy", "Admin")
    label = data.get("label")
    subtasks = data.get("subtasks", [])

    if not name:
        return jsonify({"error": "Template name is required"}), 400

    cur = get_cursor()
    createdOn = datetime.now()

    # insert template
    cur.execute("""
        INSERT INTO "Template" (name, description, "createdBy", "createdOn", label, "isDeleted")
        VALUES (%s, %s, %s, %s, %s, false)
        RETURNING id
    """, (name, description, createdBy, createdOn, label))
    new_id = cur.fetchone()[0]

    # insert subtasks if present
    for s in subtasks:
        cur.execute("""
            INSERT INTO "SubTask" (action, "dependsOn", description, assignee, "templateId")
            VALUES (%s, %s, %s, %s, %s)
        """, (s.get("action"), s.get("dependsOn"), s.get("description"), s.get("assignee"), new_id))

    conn.commit()
    cur.close()

    return jsonify({"message": "Template created successfully", "id": new_id}), 201


# ✅ Update template + subtasks
@templates_bp.route("/<int:id>", methods=["PUT"])
@token_required

def update_template(id):
    data = request.json
    name = data.get("name")
    description = data.get("description")
    createdBy = data.get("createdBy", "Admin")
    label = data.get("label")
    subtasks = data.get("subtasks", [])

    cur = get_cursor()
    # update template
    cur.execute("""
        UPDATE "Template"
        SET name = %s, description = %s, "createdBy" = %s, label = %s
        WHERE id = %s
    """, (name, description, createdBy, label, id))

    # clear old subtasks
    cur.execute("""DELETE FROM "SubTask" WHERE "templateId" = %s""", (id,))

    # insert new subtasks
    for s in subtasks:
        cur.execute("""
            INSERT INTO "SubTask" (action, "dependsOn", description, assignee, "templateId")
            VALUES (%s, %s, %s, %s, %s)
        """, (s.get("action"), s.get("dependsOn"), s.get("description"), s.get("assignee"), id))

    conn.commit()
    cur.close()
    return jsonify({"message": "Template and subtasks updated successfully"}), 200


# ✅ Soft delete
@templates_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_template(id):
    cur = get_cursor()
    cur.execute("""UPDATE "Template" SET "isDeleted" = true WHERE id = %s""", (id,))
    conn.commit()
    cur.close()
    return jsonify({"message": "Template deleted successfully"}), 200
 