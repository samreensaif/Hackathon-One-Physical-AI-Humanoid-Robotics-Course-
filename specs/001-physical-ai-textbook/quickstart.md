# Quickstart: Physical AI & Humanoid Robotics Textbook Platform

**Branch**: `001-physical-ai-textbook` | **Date**: 2026-03-01

Start the full local development environment with 3 terminal commands.

---

## Prerequisites

- Node 20+ (`node --version`)
- Python 3.11+ (`python --version`)
- Accounts with active credentials for: OpenAI, Qdrant Cloud, Neon Postgres

---

## Step 1 — Backend

```bash
cd chatbot-backend
cp .env.example .env   # fill in your credentials (see table below)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### Required `.env` values

| Variable | Where to get it | Example |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API Keys | `sk-proj-...` |
| `QDRANT_URL` | Qdrant Cloud dashboard → Cluster URL | `https://xxxx.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant Cloud dashboard → API Keys | `eyJ...` |
| `QDRANT_COLLECTION_NAME` | Your choice | `textbook_chunks` |
| `NEON_DATABASE_URL` | Neon dashboard → Connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `TEXTBOOK_DOCS_PATH` | Path to docs folder | `../physical-ai-textbook/docs` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |

---

## Step 2 — Ingest Textbook Content

Run once after setup, and again whenever chapter MDX files change:

```bash
cd chatbot-backend
python ingest.py
```

Expected output:
```
Textbook docs : .../physical-ai-textbook/docs
Collection    : textbook_chunks
Found 16 doc file(s).
...
Total chunks to embed: ~187
Done! 187 chunks uploaded to 'textbook_chunks'.
```

---

## Step 3 — Frontend

```bash
cd physical-ai-textbook
npm install
npm start
```

Site available at: `http://localhost:3000`

> The frontend connects to the backend via `window.CHATBOT_API_URL`. In development this
> defaults to `http://localhost:8000`. In production it is set to the Render.com URL via
> `docusaurus.config.ts` headTags.

---

## Verify Everything Works

1. Open `http://localhost:3000` — textbook homepage renders.
2. Navigate to any chapter — content loads without errors.
3. Click the 💬 chatbot button — chat panel opens.
4. Ask: "What is ROS 2?" — response arrives with source citation within 5 seconds.
5. Click "Sign Up" — create account and complete onboarding.
6. Return to homepage — verify your name appears in navbar.

---

## Common Issues

| Issue | Fix |
|---|---|
| `chatbot-backend` errors on startup with missing env vars | Verify all required keys are in `.env`; check `.env.example` for current list |
| Qdrant collection not found on first `/chat` | Run `python ingest.py` first |
| Frontend chatbot shows "failed to connect" | Confirm backend is running on port 8000; check `ALLOWED_ORIGINS` includes `http://localhost:3000` |
| Neon Postgres connection timeout | Verify `NEON_DATABASE_URL` includes `?sslmode=require` |
| Cold start on Render.com | First request after inactivity may take 15–30s; retry after delay |

---

## Deployment

### Frontend (GitHub Pages)

Push to `main` — GitHub Actions automatically builds and deploys:

```bash
git push origin main
```

### Backend (Render.com)

Push to `main` — Render's native Git integration detects the push via `render.yaml` and deploys.

After deployment, update `window.CHATBOT_API_URL` in `physical-ai-textbook/docusaurus.config.ts`
if the Render.com service URL changes.
