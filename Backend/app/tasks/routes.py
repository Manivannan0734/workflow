from flask import Blueprint, request, jsonify
from app.db import get_cursor, conn
from app.auth.utils import token_required
from datetime import datetime

tasks_bp = Blueprint("tasks", __name__)

# ---------------------- Helper ----------------------
def validate_and_get_template(cur, template_id):
    """Validate template ID and return template row"""
    if template_id is None:
        return None
    try:
        tid = int(template_id)
    except (ValueError, TypeError):
        raise ValueError("Invalid template ID format")
    
    cur.execute('SELECT * FROM "Template" WHERE id=%s AND "isDeleted"=false', (tid,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Template {tid} not found")
    return row

# ---------------------- List Tasks ----------------------
@tasks_bp.route("/", methods=["GET"])
@token_required
def get_tasks(current_user):
    cur = get_cursor()
    cur.execute("""
        SELECT t.id, t.name, t.description, t."templateId",
               t."templateName", t."templateDescription", t."createdBy", t."createdOn"
        FROM "Task" t
        WHERE t."isDeleted" = false
        ORDER BY t."createdOn" DESC
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
            "createdOn": r[7].strftime("%Y-%m-%dT%H:%M:%S") if r[7] else None
        }
        for r in rows
    ]
    cur.close()
    return jsonify(tasks), 200

# ---------------------- Get Single Task ----------------------
@tasks_bp.route("/<int:id>", methods=["GET"])
@token_required
def get_task(current_user, id):
    cur = get_cursor()
    cur.execute("""
        SELECT t.id, t.name, t.description, t."templateId",
               t."templateName", t."templateDescription", t."createdBy"
        FROM "Task" t
        WHERE t.id=%s AND t."isDeleted"=false
    """, (id,))
    task_row = cur.fetchone()
    if not task_row:
        cur.close()
        return jsonify({"error": "Task not found"}), 404

    task = {
        "id": task_row[0],
        "name": task_row[1],
        "description": task_row[2],
        "templateId": task_row[3],
        "templateName": task_row[4],
        "templateDescription": task_row[5],
        "createdBy": task_row[6]
    }

    # Load subtasks
    cur.execute("""
        SELECT id, action, description, assignee, "dependsOn", "originalSubId"
        FROM "TaskSubTask"
        WHERE "taskId" = %s
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

# ---------------------- Create Task ----------------------
@tasks_bp.route("/", methods=["POST"])
@token_required
def create_task(current_user):
    data = request.get_json()
    name = data.get("name")
    template_id = data.get("templateId")
    description = data.get("description")
    subtasks = data.get("subtasks", [])

    if not name or not name.strip():
        return jsonify({"error": "Task name required"}), 400

    cur = get_cursor()

    # Duplicate check
    template_clause = 'AND "templateId" IS NULL' if template_id is None else 'AND "templateId" = %s'
    template_param = () if template_id is None else (template_id,)
    cur.execute(f'SELECT 1 FROM "Task" WHERE name=%s AND "isDeleted"=false {template_clause}', (name.strip(),) + template_param)
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Task already exists"}), 409

    # If template-based task, copy template details
    if template_id:
        template_row = validate_and_get_template(cur, template_id)
        cur.execute(
            'INSERT INTO "Task" (name, "templateId", "templateName", "templateDescription", "templateCreatedBy", "templateLabel", "createdBy", "createdOn", "isDeleted") VALUES (%s,%s,%s,%s,%s,%s,%s,%s,false) RETURNING id',
            (name.strip(), template_id, template_row[1], template_row[2], template_row[3], template_row[5], current_user["email"], datetime.now())
        )
        task_id = cur.fetchone()[0]

        # Copy subtasks from template
        cur.execute("""
            INSERT INTO "TaskSubTask" ("taskId", action, description, assignee, "dependsOn", "originalSubId")
            SELECT %s, st.action, st.description, st.assignee, st."dependsOn", st.id
            FROM "SubTask" st
            WHERE st."templateId" = %s
        """, (task_id, template_id))
        conn.commit()
        cur.close()
        return jsonify({"message": "Template-based task created", "id": task_id}), 201

    # Simple task
    if not description or not description.strip():
        cur.close()
        return jsonify({"error": "Description required for simple task"}), 400
    cur.execute(
        'INSERT INTO "Task" (name, description, "createdBy", "createdOn", "isDeleted") VALUES (%s,%s,%s,%s,false) RETURNING id',
        (name.strip(), description.strip(), current_user["email"], datetime.now())
    )
    task_id = cur.fetchone()[0]

    # Insert subtasks if any
    for st in subtasks:
        cur.execute(
            'INSERT INTO "TaskSubTask" ("taskId", action, description, assignee, "dependsOn") VALUES (%s,%s,%s,%s,%s)',
            (task_id, st.get("action"), st.get("description"), st.get("assignee"), st.get("dependsOn"))
        )

    conn.commit()
    cur.close()
    return jsonify({"message": "Simple task created", "id": task_id}), 201

# ---------------------- Update Task ----------------------
@tasks_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_task(current_user, id):
    data = request.get_json()
    name = data.get("name")
    template_id = data.get("templateId")
    description = data.get("description")
    subtasks = data.get("subtasks", [])

    if not name or not name.strip():
        return jsonify({"error": "Task name required"}), 400

    cur = get_cursor()
    cur.execute('SELECT id FROM "Task" WHERE id=%s AND "isDeleted"=false', (id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": "Task not found"}), 404

    # Duplicate check
    template_clause = 'AND "templateId" IS NULL' if template_id is None else 'AND "templateId" = %s'
    template_param = () if template_id is None else (template_id,)
    cur.execute(f'SELECT 1 FROM "Task" WHERE name=%s AND id != %s AND "isDeleted"=false {template_clause}', (name.strip(), id) + template_param)
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Task name already exists"}), 409

    if template_id:
        template_row = validate_and_get_template(cur, template_id)
        cur.execute(
            'UPDATE "Task" SET name=%s, "templateDescription"=%s WHERE id=%s RETURNING id',
            (name.strip(), description, id)
        )
    else:
        cur.execute(
            'UPDATE "Task" SET name=%s, description=%s WHERE id=%s RETURNING id',
            (name.strip(), description.strip(), id)
        )

    # Delete old subtasks and insert new ones
    cur.execute('DELETE FROM "TaskSubTask" WHERE "taskId"=%s', (id,))
    for st in subtasks:
        cur.execute(
            'INSERT INTO "TaskSubTask" ("taskId", action, description, assignee, "dependsOn") VALUES (%s,%s,%s,%s,%s)',
            (id, st.get("action"), st.get("description"), st.get("assignee"), st.get("dependsOn"))
        )
    conn.commit()
    cur.close()
    return jsonify({"message": "Task updated"}), 200

# ---------------------- Delete Task ----------------------
@tasks_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_task(current_user, id):
    cur = get_cursor()
    cur.execute('UPDATE "Task" SET "isDeleted"=true WHERE id=%s', (id,))
    conn.commit()
    cur.close()
    return jsonify({"message": "Task deleted"}), 200
