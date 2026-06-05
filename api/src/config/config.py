import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Carrega variáveis do .env (mesmas usadas pela API Node.js)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "api/.env"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taskinsight")
DB_TASKIN = MONGODB_URI.split("/")[-1].split("?")[0]   # extrai "taskinsight" da URI


def get_db():
    #Retorna (client, db). Lembre de chamar client.close() ao terminar
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")   # verifica a conexão imediatamente
        db = client[DB_TASKIN]
        print(f"Conectado ao MongoDB — banco: {DB_TASKIN}")
        return client, db
    except ConnectionFailure as e:
        print(f" Falha na conexão com MongoDB: {e}")
        raise