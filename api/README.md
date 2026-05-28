# Prompt Caching Lab — API Bridge

Thin FastAPI bridge that exposes the existing Python cache logic
(`utils.py`, `main.py`) as HTTP endpoints for the Next.js UI in `../web`.

This bridge does **not** reimplement any cache behavior. It imports the
existing functions and wraps the `main.py` chat loop body into a single
`POST /api/chat` endpoint.

## Setup

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Ensure the project `.env` (one level up) has `CONNECTION_STRING`, and your
shell has `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` exported.

## Run

```bash
uvicorn server:app --reload --port 8000
```

The UI expects the API at `http://localhost:8000`.

## Endpoints

| Method | Path                  | Purpose |
|--------|-----------------------|---------|
| GET    | `/api/health`         | Configuration check |
| GET    | `/api/models`         | Model list (from `../model-pricing.json`) |
| GET    | `/api/pricing`        | Full pricing data |
| POST   | `/api/chat`           | Run one cache-aware turn |
| GET    | `/api/history`        | In-memory conversation history |
| POST   | `/api/clear`          | Reset in-memory history (DB untouched) |
| GET    | `/api/session-summary`| Aggregate rollup from `session_logs` |

`/api/models` and `/api/pricing` work without secrets so the UI design surface
renders even before Mongo / API keys are configured.
