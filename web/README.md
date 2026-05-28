# Prompt Caching Lab — Web

Next.js 14 + Tailwind UI for the Prompt Caching Lab. Talks to the FastAPI
bridge in `../api` over HTTP.

## Setup

```bash
cd web
npm install
```

## Run

```bash
# In one terminal, start the bridge:
cd ../api && uvicorn server:app --reload --port 8000

# In another, start the UI:
cd web && npm run dev
```

Open <http://localhost:3000>.

Override the bridge URL with `NEXT_PUBLIC_API_BASE` if needed.

## Notes

- Pinned to Next.js **14.2.35** (latest patched 14.x).
- No chart libraries, animation frameworks, or dashboard packages — only
  Tailwind utilities and lightweight CSS transitions.
- The design renders even when the bridge is unavailable; metric values
  collapse to em-dashes and an inline notice tells you to start the bridge.
