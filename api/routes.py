"""Rotas REST."""
import datetime as dt
from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from db import users, tasks
from auth import hash_password, verify_password, issue_token, jwt_required

api = Blueprint("api", __name__)

STATUSES = {"a_fazer", "em_progresso", "em_revisao", "concluido"}


def _task_dto(t):
    return {
        "id": str(t["_id"]),
        "title": t.get("title"),
        "description": t.get("description", ""),
        "priority": t.get("priority", "media"),
        "status": t.get("status", "a_fazer"),
        "category": t.get("category"),
        "due_date": t.get("due_date"),
        "created_at": t.get("created_at").isoformat() if t.get("created_at") else None,
    }


@api.post("/auth/register")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not name or not email or len(password) < 8:
        return jsonify({"error": "validation"}), 400
    if users.find_one({"email": email}):
        return jsonify({"error": "email_in_use"}), 409
    res = users.insert_one({
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "created_at": dt.datetime.utcnow(),
    })
    token = issue_token(res.inserted_id, email)
    return jsonify({"token": token, "user": {"id": str(res.inserted_id), "name": name, "email": email}}), 201


@api.post("/auth/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "invalid_credentials"}), 401
    token = issue_token(user["_id"], email)
    return jsonify({"token": token, "user": {"id": str(user["_id"]), "name": user["name"], "email": email}})


@api.get("/auth/me")
@jwt_required
def me():
    return jsonify({"id": g.user_id, "email": g.user_email})


@api.get("/tasks")
@jwt_required
def list_tasks():
    items = list(tasks.find({"user_id": g.user_id}).sort("created_at", -1))
    return jsonify([_task_dto(t) for t in items])


@api.post("/tasks")
@jwt_required
def create_task():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title_required"}), 400
    status = data.get("status", "a_fazer")
    if status not in STATUSES:
        status = "a_fazer"
    doc = {
        "user_id": g.user_id,
        "title": title,
        "description": data.get("description", ""),
        "priority": data.get("priority", "media"),
        "status": status,
        "category": data.get("category"),
        "due_date": data.get("due_date"),
        "created_at": dt.datetime.utcnow(),
    }
    res = tasks.insert_one(doc)
    doc["_id"] = res.inserted_id
    return jsonify(_task_dto(doc)), 201


@api.patch("/tasks/<task_id>")
@jwt_required
def update_task(task_id):
    data = request.get_json() or {}
    update = {k: v for k, v in data.items() if k in {"title", "description", "priority", "status", "category", "due_date"}}
    if "status" in update and update["status"] not in STATUSES:
        return jsonify({"error": "invalid_status"}), 400
    tasks.update_one({"_id": ObjectId(task_id), "user_id": g.user_id}, {"$set": update})
    t = tasks.find_one({"_id": ObjectId(task_id), "user_id": g.user_id})
    if not t:
        return jsonify({"error": "not_found"}), 404
    return jsonify(_task_dto(t))


@api.delete("/tasks/<task_id>")
@jwt_required
def delete_task(task_id):
    tasks.delete_one({"_id": ObjectId(task_id), "user_id": g.user_id})
    return "", 204


@api.get("/metrics/summary")
@jwt_required
def metrics_summary():
    pipeline = [
        {"$match": {"user_id": g.user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    by_status = {row["_id"]: row["count"] for row in tasks.aggregate(pipeline)}
    total = sum(by_status.values()) or 0
    done = by_status.get("concluido", 0)
    return jsonify({
        "total": total,
        "by_status": by_status,
        "completion_rate": round((done / total) * 100, 1) if total else 0,
    })
