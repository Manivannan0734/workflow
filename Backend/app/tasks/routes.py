from flask import Blueprint, request, jsonify
from app.db import get_cursor, conn
from app.auth.utils import token_required
from datetime import datetime
import psycopg2

tasks_bp = Blueprint("tasks", __name__)

# ======================================================
# REQUIRED VALIDATION (ONLY)
# ======================================================
def validate_required_fields(data):
    errors = []

    name = (data.get("name") or "").strip()
    template_id = data.get("templateId")
    description = (data.get("description") or "").strip()
    subtasks = data.get("subtasks") or []

    # Task name
    if not name:
        errors.append("Task name is required")

    # Description rules
    if template_id is None:
        if not description:
            errors.append("Description is required for simple task")
    else:
        if not description:
            errors.append("Template description is required")

    # Subtasks validation (if present)
    for idx, st in enumerate(subtasks, start=1):
        if not (st.get("action") or "").strip():
            errors.append(f"Subtask {idx}: Action is required")
        if not (st.get("description") or "").strip():
            errors.append(f"Subtask {idx}: Description is required")
        if not (st.get("assignee") or "").strip():
            errors.append(f"Subtask {idx}: Assignee is required")

    return errors


# ======================================================
# LIST TASKS
# ======================================================
@tasks_bp.route("/", methods=["GET"])
@token_required
def get_tasks(current_user):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT id, name, description, "templateId",
                   "templateName", "templateDescription",
                   "createdBy", "createdOn"
            FROM "Task"
            WHERE "isDeleted" = false
            ORDER BY "createdOn" DESC
        """)
        rows = cur.fetchall()

        tasks = [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "templateId": r[3],
                "templateName": r[4],
                "templateDescription": r[5],
                "createdBy": r[6],
                "createdOn": r[7].isoformat() if r[7] else None
            }
            for r in rows
        ]
        cur.close()
        return jsonify(tasks), 200

    except Exception as e:
        cur.close()
        return jsonify({"error": "Internal server error"}), 500


# ======================================================
# GET SINGLE TASK
# ======================================================
@tasks_bp.route("/<int:id>", methods=["GET"])
@token_required
def get_task(current_user, id):
    cur = get_cursor()
    try:
        cur.execute("""
            SELECT id, name, description, "templateId",
                   "templateName", "templateDescription", "createdBy"
            FROM "Task"
            WHERE id=%s AND "isDeleted"=false
        """, (id,))
        row = cur.fetchone()

        if not row:
            cur.close()
            return jsonify({"error": "Task not found"}), 404

        task = {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "templateId": row[3],
            "templateName": row[4],
            "templateDescription": row[5],
            "createdBy": row[6],
        }

        # Subtasks
        cur.execute("""
            SELECT id, action, description, assignee, "dependsOn", "originalSubId"
            FROM "TaskSubTask"
            WHERE "taskId"=%s
            ORDER BY id
        """, (id,))
        task["taskSubtasks"] = [
            {
                "id": r[0],
                "action": r[1],
                "description": r[2],
                "assignee": r[3],
                "dependsOn": r[4],
                "originalSubId": r[5]
            } for r in cur.fetchall()
        ]

        cur.close()
        return jsonify(task), 200

    except Exception:
        cur.close()
        return jsonify({"error": "Internal server error"}), 500


# ======================================================
# CREATE TASK
# ======================================================
@tasks_bp.route("/", methods=["POST"])
@token_required
def create_task(current_user):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    errors = validate_required_fields(data)
    if errors:
        return jsonify({
            "error": "Validation failed",
            "messages": errors
        }), 400

    name = data.get("name").strip()
    template_id = data.get("templateId")
    description = data.get("description").strip()
    subtasks = data.get("subtasks") or []

    cur = get_cursor()
    try:
        # Insert Task
        if template_id:
            cur.execute("""
                INSERT INTO "Task"
                (name, "templateId", "templateDescription", "createdBy", "createdOn", "isDeleted")
                VALUES (%s,%s,%s,%s,%s,false)
                RETURNING id
            """, (name, template_id, description, current_user["email"], datetime.now()))
        else:
            cur.execute("""
                INSERT INTO "Task"
                (name, description, "createdBy", "createdOn", "isDeleted")
                VALUES (%s,%s,%s,%s,false)
                RETURNING id
            """, (name, description, current_user["email"], datetime.now()))

        task_id = cur.fetchone()[0]

        # Insert Subtasks
        for st in subtasks:
            cur.execute("""
                INSERT INTO "TaskSubTask"
                ("taskId", action, description, assignee, "dependsOn")
                VALUES (%s,%s,%s,%s,%s)
            """, (
                task_id,
                st.get("action"),
                st.get("description"),
                st.get("assignee"),
                st.get("dependsOn")
            ))

        conn.commit()
        cur.close()
        return jsonify({"message": "Task created", "id": task_id}), 201

    except Exception:
        conn.rollback()
        cur.close()
        return jsonify({"error": "Internal server error"}), 500


# ======================================================
# UPDATE TASK
# ======================================================
@tasks_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_task(current_user, id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    errors = validate_required_fields(data)
    if errors:
        return jsonify({
            "error": "Validation failed",
            "messages": errors
        }), 400

    name = data.get("name").strip()
    template_id = data.get("templateId")
    description = data.get("description").strip()
    subtasks = data.get("subtasks") or []

    cur = get_cursor()
    try:
        # Check exists
        cur.execute('SELECT 1 FROM "Task" WHERE id=%s AND "isDeleted"=false', (id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": "Task not found"}), 404

        # Update task
        if template_id:
            cur.execute("""
                UPDATE "Task"
                SET name=%s, "templateId"=%s, "templateDescription"=%s
                WHERE id=%s
            """, (name, template_id, description, id))
        else:
            cur.execute("""
                UPDATE "Task"
                SET name=%s, description=%s, "templateId"=NULL
                WHERE id=%s
            """, (name, description, id))

        # Replace subtasks
        cur.execute('DELETE FROM "TaskSubTask" WHERE "taskId"=%s', (id,))
        for st in subtasks:
            cur.execute("""
                INSERT INTO "TaskSubTask"
                ("taskId", action, description, assignee, "dependsOn")
                VALUES (%s,%s,%s,%s,%s)
            """, (
                id,
                st.get("action"),
                st.get("description"),
                st.get("assignee"),
                st.get("dependsOn")
            ))

        conn.commit()
        cur.close()
        return jsonify({"message": "Task updated"}), 200

    except Exception:
        conn.rollback()
        cur.close()
        return jsonify({"error": "Internal server error"}), 500


# ======================================================
# DELETE TASK (SOFT)
# ======================================================
@tasks_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_task(current_user, id):
    cur = get_cursor()
    try:
        cur.execute('SELECT 1 FROM "Task" WHERE id=%s AND "isDeleted"=false', (id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": "Task not found"}), 404

        cur.execute('UPDATE "Task" SET "isDeleted"=true WHERE id=%s', (id,))
        conn.commit()
        cur.close()
        return jsonify({"message": "Task deleted"}), 200

    except Exception:
        conn.rollback()
        cur.close()
        return jsonify({"error": "Internal server error"}), 500
