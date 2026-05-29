"""Autenticação JWT + hashing de senha."""
import os
import datetime as dt
from functools import wraps
import jwt
import bcrypt
from flask import request, jsonify, g

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 12


def hash_password(plain: str) -> bytes:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())


def verify_password(plain: str, hashed: bytes) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed)
    except Exception:
        return False


def issue_token(user_id: str, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": dt.datetime.utcnow(),
        "exp": dt.datetime.utcnow() + dt.timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def jwt_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing_token"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid_token"}), 401
        g.user_id = payload["sub"]
        g.user_email = payload["email"]
        return fn(*args, **kwargs)
    return wrapper
