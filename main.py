from datetime import datetime, UTC
from uuid import uuid4
import warnings
from pymongo import MongoClient

# Suppress all UserWarnings
warnings.filterwarnings("ignore", category=UserWarning)

from utils import (
    load_system_prompt,
    get_connection_string,
    get_collection,
    RESPONSES_COLLECTION_NAME,
    SESSION_LOGS_COLLECTION_NAME,
    find_semantic_hit_and_increment,
    upsert_responses,
    insert_session_log,
    get_token_count,
)

import anthropic
from openai import OpenAI

system_prompt = load_system_prompt()
openai_client = OpenAI()
anthropic_client = anthropic.Anthropic()

mongo_client = MongoClient(get_connection_string())
responses_collection = get_collection(mongo_client, RESPONSES_COLLECTION_NAME)
session_logs_collection = get_collection(mongo_client, SESSION_LOGS_COLLECTION_NAME)

history = []

def create_embedding(text):
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )

    return response.data[0].embedding

while True:
    user_message = {
        "role": "user",
        "content": input("User: ")
    }

    if user_message["content"] == "quit":
        break

    input_token_count = get_token_count(anthropic_client, system_prompt, history, user_message)

    question_embedding = create_embedding(user_message["content"])
    semantic_hit = find_semantic_hit_and_increment(
        responses_collection,
        question_embedding,
        similarity_threshold=0.70,
    )

    history.append(user_message)

    print()
    print(f"You: {user_message['content']}")
    print()

    if semantic_hit:
        response = semantic_hit["answer"]
        cached_output_tokens = get_token_count(
            anthropic_client,
            system_prompt,
            history,
            {"role": "assistant", "content": response},
        )
        print(
            f"[CACHE HIT] Similar question found (similarity: {semantic_hit['score']:.2f})"
        )
        print(
            f"Tokens saved: {input_token_count} input + {cached_output_tokens} output"
        )
        print(
            f"This answer has been served from cache {semantic_hit['hit_count']} times."
        )
        print()

        session_log = {
            "_id": str(uuid4()),
            "question": user_message["content"],
            "cache_hit": True,
            "similarity_score": round(semantic_hit["score"], 2),
            "tokens_saved_input": input_token_count,
            "tokens_saved_output": cached_output_tokens,
            "hit_count_at_time": semantic_hit["hit_count"],
            "timestamp": datetime.now(UTC),
        }
    else:
        print("[CACHE MISS] Calling Claude...")
        message = anthropic_client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1000,
            system=system_prompt,
            messages=history
        )

        response = message.content[0].text
        output_tokens = message.usage.output_tokens
        print(f"Tokens used: {input_token_count} input + {output_tokens} output")
        print("Response cached for future use.")
        print()

        session_log = {
            "_id": str(uuid4()),
            "question": user_message["content"],
            "cache_hit": False,
            "similarity_score": None,
            "tokens_used_input": input_token_count,
            "tokens_used_output": output_tokens,
            "timestamp": datetime.now(UTC),
        }

    history.append({
        "role": "assistant",
        "content": response
    })

    document = {
        "_id": str(uuid4()),
        "question": user_message["content"],
        "answer": response,
        "embedding": question_embedding,
        "hit_count": 0,
        "created_at": datetime.now(UTC),
    }

    if not semantic_hit:
        upsert_responses(responses_collection, [document])

    insert_session_log(session_logs_collection, session_log)

    print(f"Agent: {response}")

