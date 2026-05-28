"""
FastAPI bridge for the Prompt Caching Lab UI.

Wraps the existing utils.py / main.py logic without modifying it. The cache
behavior, embeddings, vector search, token accounting, and session logging
all remain the responsibility of the original Python code.

If CONNECTION_STRING / ANTHROPIC_API_KEY / OPENAI_API_KEY are not configured,
the metadata endpoints (/api/models, /api/pricing) still work so the UI can
render its design surface. The /api/chat endpoint returns a 503 with a
helpful message in that case.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Make the existing project importable without copying or modifying its files.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

PRICING_FILE = PROJECT_ROOT / "model-pricing.json"

# Load the project's .env up front so /api/health (and any other early code
# path) sees the same environment that utils.get_connection_string() would.
from dotenv import load_dotenv  # noqa: E402
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

# Lazy imports — these touch utils.py which expects .env vars at import time
# only for functions that need them. The module-level constants are always safe.
from utils import (  # noqa: E402
    RESPONSES_COLLECTION_NAME,
    SESSION_LOGS_COLLECTION_NAME,
    find_semantic_hit_and_increment,
    get_collection,
    get_connection_string,
    get_token_count,
    insert_session_log,
    load_system_prompt,
    upsert_responses,
)

app = FastAPI(title="Prompt Caching Lab API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Lazy client + state ---------------------------------------------------
# We mirror the in-memory `history` list that main.py uses. Clients (Anthropic,
# OpenAI, Mongo) are constructed on first use so the server can boot without
# secrets and the UI can still load metadata.

_state: dict[str, Any] = {
    "history": [],
    "cached_indices": set(),  # indices of assistant turns served from cache
    "system_prompt": None,
    "openai": None,
    "anthropic": None,
    "mongo": None,
    "responses_collection": None,
    "session_logs_collection": None,
}


def _ensure_runtime() -> None:
    if _state["system_prompt"] is None:
        _state["system_prompt"] = load_system_prompt()

    if _state["anthropic"] is None:
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise HTTPException(503, "ANTHROPIC_API_KEY is not configured.")
        import anthropic
        _state["anthropic"] = anthropic.Anthropic()

    if _state["openai"] is None:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(503, "OPENAI_API_KEY is not configured.")
        from openai import OpenAI
        _state["openai"] = OpenAI()

    if _state["mongo"] is None:
        try:
            from pymongo import MongoClient
            client = MongoClient(get_connection_string())
            _state["mongo"] = client
            _state["responses_collection"] = get_collection(
                client, RESPONSES_COLLECTION_NAME
            )
            _state["session_logs_collection"] = get_collection(
                client, SESSION_LOGS_COLLECTION_NAME
            )
        except Exception as exc:  # pragma: no cover - env-dependent
            raise HTTPException(503, f"Mongo unavailable: {exc}") from exc


def _create_embedding(text: str) -> list[float]:
    response = _state["openai"].embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )
    return response.data[0].embedding


# --- Pricing / models ------------------------------------------------------

def _load_pricing() -> dict[str, Any]:
    with PRICING_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/pricing")
def get_pricing() -> dict[str, Any]:
    return _load_pricing()


@app.get("/api/models")
def get_models() -> dict[str, Any]:
    pricing = _load_pricing()
    return {
        "default": pricing["models"][-1]["id"] if pricing["models"] else None,
        "models": [
            {"id": m["id"], "name": m["name"]} for m in pricing["models"]
        ],
    }


# --- Chat ------------------------------------------------------------------

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1)
    model: str
    similarity_threshold: float = 0.70


class ChatResponse(BaseModel):
    cache_hit: bool
    similarity: Optional[float]
    response: str
    tokens_input: int
    tokens_output: int
    hit_count: Optional[int]
    model: str


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    _ensure_runtime()

    anthropic_client = _state["anthropic"]
    system_prompt = _state["system_prompt"]
    history: list[dict[str, Any]] = _state["history"]
    responses_collection = _state["responses_collection"]
    session_logs_collection = _state["session_logs_collection"]

    user_message = {"role": "user", "content": req.prompt}

    input_token_count = get_token_count(
        anthropic_client, system_prompt, history, user_message
    )

    question_embedding = _create_embedding(req.prompt)
    semantic_hit = find_semantic_hit_and_increment(
        responses_collection,
        question_embedding,
        similarity_threshold=req.similarity_threshold,
    )

    history.append(user_message)

    if semantic_hit:
        response_text = semantic_hit["answer"]
        cached_output_tokens = get_token_count(
            anthropic_client,
            system_prompt,
            history,
            {"role": "assistant", "content": response_text},
        )
        session_log = {
            "_id": str(uuid4()),
            "question": req.prompt,
            "cache_hit": True,
            "similarity_score": round(semantic_hit["score"], 2),
            "tokens_saved_input": input_token_count,
            "tokens_saved_output": cached_output_tokens,
            "hit_count_at_time": semantic_hit["hit_count"],
            "timestamp": datetime.now(UTC),
            "model": req.model,
        }
        history.append({"role": "assistant", "content": response_text})
        _state["cached_indices"].add(len(history) - 1)
        insert_session_log(session_logs_collection, session_log)
        return ChatResponse(
            cache_hit=True,
            similarity=round(semantic_hit["score"], 2),
            response=response_text,
            tokens_input=input_token_count,
            tokens_output=cached_output_tokens,
            hit_count=semantic_hit["hit_count"],
            model=req.model,
        )

    message = anthropic_client.messages.create(
        model=req.model,
        max_tokens=1000,
        system=system_prompt,
        messages=history,
    )
    response_text = message.content[0].text
    output_tokens = message.usage.output_tokens

    history.append({"role": "assistant", "content": response_text})

    document = {
        "_id": str(uuid4()),
        "question": req.prompt,
        "answer": response_text,
        "embedding": question_embedding,
        "hit_count": 0,
        "created_at": datetime.now(UTC),
    }
    upsert_responses(responses_collection, [document])

    session_log = {
        "_id": str(uuid4()),
        "question": req.prompt,
        "cache_hit": False,
        "similarity_score": None,
        "tokens_used_input": input_token_count,
        "tokens_used_output": output_tokens,
        "timestamp": datetime.now(UTC),
        "model": req.model,
    }
    insert_session_log(session_logs_collection, session_log)

    return ChatResponse(
        cache_hit=False,
        similarity=None,
        response=response_text,
        tokens_input=input_token_count,
        tokens_output=output_tokens,
        hit_count=None,
        model=req.model,
    )


# --- History / summary / clear --------------------------------------------

@app.get("/api/history")
def get_history() -> dict[str, Any]:
    """Return the in-memory conversation history.

    Each turn carries a `cached` flag for assistant turns so the UI can mark
    cached responses without inspecting tokens. The flag is computed from
    `_state["cached_indices"]` so the underlying message dicts stay clean
    for the Anthropic API.
    """
    cached = _state["cached_indices"]
    turns = [
        {**m, "cached": (i in cached) if m["role"] == "assistant" else False}
        for i, m in enumerate(_state["history"])
    ]
    return {"turns": turns}


@app.post("/api/clear")
def clear_history() -> dict[str, Any]:
    """Reset in-memory conversation only. Does NOT touch Mongo collections."""
    _state["history"] = []
    _state["cached_indices"] = set()
    return {"ok": True, "turns": []}


@app.get("/api/session-summary")
def session_summary() -> dict[str, Any]:
    """Aggregate `session_logs` for the dashboard summary card.

    Returns zeroed counts when Mongo is unavailable so the UI still renders.
    """
    try:
        _ensure_runtime()
    except HTTPException:
        return {
            "available": False,
            "total_turns": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "tokens_saved": {"input": 0, "output": 0},
            "tokens_used": {"input": 0, "output": 0},
        }

    coll = _state["session_logs_collection"]
    docs = list(coll.find({}, {"_id": 0}))

    hits = [d for d in docs if d.get("cache_hit")]
    misses = [d for d in docs if not d.get("cache_hit")]

    return {
        "available": True,
        "total_turns": len(docs),
        "cache_hits": len(hits),
        "cache_misses": len(misses),
        "tokens_saved": {
            "input": sum(d.get("tokens_saved_input", 0) for d in hits),
            "output": sum(d.get("tokens_saved_output", 0) for d in hits),
        },
        "tokens_used": {
            "input": sum(d.get("tokens_used_input", 0) for d in misses),
            "output": sum(d.get("tokens_used_output", 0) for d in misses),
        },
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "mongo_configured": bool(os.getenv("CONNECTION_STRING")),
    }
