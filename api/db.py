"""Camada de dados — conexão MongoDB."""
import os
from pymongo import MongoClient, ASCENDING

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "taskinsight")

_client = MongoClient(MONGO_URI)
db = _client[DB_NAME]

# Índices
db.users.create_index([("email", ASCENDING)], unique=True)
db.tasks.create_index([("user_id", ASCENDING)])
db.tasks.create_index([("status", ASCENDING)])

users = db.users
tasks = db.tasks
categories = db.categories
