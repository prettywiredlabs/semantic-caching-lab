import json
import os
from datetime import datetime, UTC
from dotenv import load_dotenv
from pathlib import Path

ENV_FILE = Path(__file__).resolve().with_name(".env")
DATABASE_NAME = "faq_cache"
RESPONSES_COLLECTION_NAME = "responses"
SESSION_LOGS_COLLECTION_NAME = "session_logs"
SYSTEM_PROMPT_FILE = Path(__file__).resolve().with_name("system_prompt.md")
RETURN_POLICY_FILE = Path(__file__).resolve().with_name("return_policy.md")

def get_connection_string():
    load_dotenv(dotenv_path=ENV_FILE)
    connection_string = os.getenv("CONNECTION_STRING")
    if not connection_string:
        raise ValueError(
            "Missing CONNECTION_STRING. Add it to document_db/.env or set it in your environment."
        )
    return connection_string


def get_database(client):
    database = client[DATABASE_NAME]
    print(f"Connected to database: {database.name}")
    return database


def get_collection(client, collection_name):
    database = get_database(client)
    collection = database[collection_name]
    print(f"Connected to collection: {collection_name}")
    return collection


def load_system_prompt():
    with SYSTEM_PROMPT_FILE.open("r", encoding="utf-8") as file:
        system_prompt = file.read()

    with RETURN_POLICY_FILE.open("r", encoding="utf-8") as file:
        return_policy = file.read()

    full_system_prompt = f"{system_prompt}\n\n{return_policy}"
    return full_system_prompt


def find_semantic_hit_and_increment(
    collection,
    query_embedding,
    similarity_threshold=0.90,
    k=5,
):
    pipeline = [
        {
            "$search": {
                "cosmosSearch": {
                    "vector": query_embedding,
                    "path": "embedding",
                    "k": k,
                },
                "returnStoredSource": True,
            }
        },
        {
            "$project": {
                "_id": 1,
                "question": 1,
                "answer": 1,
                "hit_count": 1,
                "score": {"$meta": "searchScore"},
            }
        },
        {"$limit": 1},
    ]

    matches = list(collection.aggregate(pipeline))
    if not matches:
        return None

    best_match = matches[0]
    if best_match["score"] < similarity_threshold:
        return None

    collection.update_one(
        {"_id": best_match["_id"]},
        {
            "$inc": {"hit_count": 1},
            "$set": {"updated_at": datetime.now(UTC)},
        },
    )

    best_match["hit_count"] = best_match.get("hit_count", 0) + 1
    return best_match


def get_token_count(client, system_prompt, history, user_message):
    response = client.messages.count_tokens(
        model="claude-opus-4-7",
        system=system_prompt,
        messages=history + [user_message],
    )
    response_data = json.loads(response.json())
    return response_data.get("input_tokens", 0)


def upsert_responses(collection, documents):
    for document in documents:
        collection.replace_one({"_id": document["_id"]}, document, upsert=True)


def insert_session_log(collection, session_log):
    collection.insert_one(session_log)