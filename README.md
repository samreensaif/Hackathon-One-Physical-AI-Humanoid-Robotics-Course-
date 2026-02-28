# Physical AI & Humanoid Robotics Textbook

An open-source, interactive textbook covering the full stack of Physical AI — from
ROS 2 fundamentals and NVIDIA Isaac simulation through Vision-Language-Action (VLA)
models — with a built-in RAG-powered AI assistant chatbot.

**Live site:** [YOUR_GITHUB_USERNAME.github.io/physical-ai-textbook](https://YOUR_GITHUB_USERNAME.github.io/physical-ai-textbook/)

---

## Repository layout

```
Hackathon-One/
├── physical-ai-textbook/   # Docusaurus 3 site (textbook content + ChatBot widget)
│   ├── docs/
│   │   ├── module1-ros2/       # Ch1–4: ROS 2 fundamentals
│   │   ├── module2-simulation/ # Ch1–3: Robot simulation
│   │   ├── module3-isaac/      # Ch1–4: NVIDIA Isaac & Nav2
│   │   └── module4-vla/        # Ch1–4: VLA models & capstone
│   ├── src/
│   │   ├── components/ChatBot/ # Floating RAG chatbot widget
│   │   └── theme/Root.js       # Mounts ChatBot on every page
│   └── docusaurus.config.ts
├── chatbot-backend/        # FastAPI RAG backend
│   ├── main.py             # API server (POST /chat, /ingest, etc.)
│   ├── ingest.py           # Standalone CLI ingestion script
│   ├── ingest_service.py   # Ingest logic used by the API
│   ├── qdrant_service.py   # Qdrant vector DB client
│   ├── database.py         # Neon Postgres chat history
│   ├── config.py           # pydantic-settings configuration
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
└── .github/workflows/
    └── deploy.yml          # GitHub Actions: build & deploy to gh-pages
```

---

## Running locally

### 1. Docusaurus textbook (frontend)

```bash
cd physical-ai-textbook
npm install
npm start
# Opens http://localhost:3000
```

### 2. FastAPI chatbot backend

```bash
cd chatbot-backend

# First time: copy the env template and fill in your credentials
cp .env.example .env

# Install Python dependencies (Python 3.11+ recommended)
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload --port 8000
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### 3. Ingest the textbook into Qdrant

Run this once (and again whenever textbook content changes):

```bash
cd chatbot-backend
python ingest.py
```

Expected output:

```
=======================================================
  Textbook docs : .../physical-ai-textbook/docs
  Collection    : textbook_chunks
  Chunk size    : 500 words  (overlap: 50)
=======================================================

Found 14 doc file(s).

Ingesting: module1-ros2/chapter1.mdx  →  12 chunk(s)
...

Total chunks to embed: 187

Embedding chunks with text-embedding-3-small…
  Embedded 187 / 187

Uploading 187 points to Qdrant…
  Uploaded 187 / 187

=======================================================
  Done!  187 chunks uploaded to 'textbook_chunks'.
=======================================================
```

---

## Required environment variables

Copy `chatbot-backend/.env.example` to `chatbot-backend/.env` and fill in:

| Variable | Where to get it | Example |
|---|---|---|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) | `sk-proj-...` |
| `QDRANT_URL` | Qdrant Cloud dashboard → Cluster URL | `https://xxxx.us-east4-0.gcp.cloud.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant Cloud dashboard → API Keys | `eyJ...` |
| `QDRANT_COLLECTION_NAME` | Your choice (default: `textbook_chunks`) | `textbook_chunks` |
| `NEON_DATABASE_URL` | Neon dashboard → Connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `TEXTBOOK_DOCS_PATH` | Path to `physical-ai-textbook/docs/` | `../physical-ai-textbook/docs` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,https://YOUR_GITHUB_USERNAME.github.io` |

---

## Deploying to GitHub Pages

The site deploys automatically on every push to `main` via GitHub Actions.

**One-time setup:**

1. Replace `YOUR_GITHUB_USERNAME` in:
   - `physical-ai-textbook/docusaurus.config.ts` (4 fields: `url`, `organizationName`, `projectName` already set — just swap the placeholder)
   - This `README.md`

2. Push to GitHub and go to **Settings → Pages** in your repo.
   Set **Source** to the `gh-pages` branch, root folder.

3. The Actions workflow (`.github/workflows/deploy.yml`) will:
   - Install Node 20 and run `npm ci`
   - Build the Docusaurus site (`npm run build`)
   - Push the `build/` folder to the `gh-pages` branch using `peaceiris/actions-gh-pages@v3`

4. After deployment, update `window.CHATBOT_API_URL` in `docusaurus.config.ts`
   to point to your deployed backend URL:
   ```ts
   innerHTML: 'window.CHATBOT_API_URL = "https://your-backend.fly.dev";',
   ```

---

## API endpoints (FastAPI backend)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Re-index all textbook MDX files into Qdrant |
| `POST` | `/chat` | RAG Q&A — returns answer + source citations |
| `POST` | `/chat-selected` | Same as `/chat` but includes highlighted text as context |
| `GET` | `/health` | Liveness check + collection status |

Interactive API docs: `http://localhost:8000/docs`

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Textbook site | Docusaurus 3, React 19, MDX |
| Chatbot widget | React (inline, no extra deps) |
| Backend API | FastAPI, Python 3.11 |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Chat model | OpenAI `gpt-4o-mini` |
| Vector DB | Qdrant Cloud (free tier) |
| Chat history | Neon Serverless Postgres + asyncpg |
| CI/CD | GitHub Actions + peaceiris/actions-gh-pages |
