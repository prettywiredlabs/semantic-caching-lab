from pymongo import MongoClient

from utils import (
    RESPONSES_COLLECTION_NAME,
    SESSION_LOGS_COLLECTION_NAME,
    get_collection,
    get_connection_string,
)

def create_vector_index(collection):
    index_command = {
        "createIndexes": collection.name,
        "indexes": [
            {
                "name": "ivf_index_embedding",
                "key": {
                    "embedding": "cosmosSearch"
                },
                "cosmosSearchOptions": {
                    "kind": "vector-ivf",
                    "dimensions": 1536,
                    "similarity": "COS",
                    "numLists": 1
                }
            }
        ]
    }
    result = collection.database.command(index_command)
    print(f"Vector index created: {result}")

def create_date_index(collection):
    collection.create_index("created_at")
    print("Date index created on created_at")


def create_timestamp_index(collection):
    collection.create_index("timestamp")
    print("Date index created on timestamp")

def main():
    connection_string = get_connection_string()
    client = MongoClient(connection_string)
    try:
        print("Creating indexes...")
        responses_collection = get_collection(client, RESPONSES_COLLECTION_NAME)
        create_vector_index(responses_collection)
        create_date_index(responses_collection)

        session_logs_collection = get_collection(client, SESSION_LOGS_COLLECTION_NAME)
        create_timestamp_index(session_logs_collection)
        print("Setup complete.")
    finally:
        client.close()

if __name__ == "__main__":
    main()