# API Contracts: Physical AI Textbook — FastAPI Backend

**Base URL**: `https://hackathon-one-physical-ai-humanoid.onrender.com` (production)
**Local**: `http://localhost:8000`
**OpenAPI docs**: `{base_url}/docs`
**Date**: 2026-03-01
**Version**: v1

---

## Authentication

All endpoints are unauthenticated (public). User identity is managed client-side via localStorage.
The backend does not validate user credentials.

**CORS**: Allowed origins configured via `ALLOWED_ORIGINS` environment variable.

---

## Endpoints

### GET `/health`

Liveness check. Confirms the server is running and the Qdrant collection is accessible.

**Request**: No body required.

**Response 200 OK**:
```json
{
  "status": "ok",
  "collection_ready": true
}
```

**Response 200 OK** (Qdrant unavailable):
```json
{
  "status": "ok",
  "collection_ready": false
}
```

**Error responses**: None (always returns 200; `collection_ready: false` signals degraded state).

---

### POST `/chat`

RAG-powered question answering over the indexed textbook.

**Request body**:
```json
{
  "question":      "What is the ROS 2 DDS communication layer?",
  "session_id":    "550e8400-e29b-41d4-a716-446655440000",  // optional UUID; new session created if absent
  "source_filter": "module1-ros2/chapter1.mdx"              // optional; restricts retrieval to one chapter
}
```

**Constraints**:
- `question`: 1–4000 characters, required.
- `session_id`: UUID v4, optional. If omitted, a new session is created.
- `source_filter`: string, optional. Must match an `mdx` relative path in the Qdrant `source` field.

**Response 200 OK**:
```json
{
  "answer":     "The DDS (Data Distribution Service) layer in ROS 2 provides...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "sources": [
    {
      "source": "module1-ros2/chapter1.mdx",
      "title":  "ROS 2 Architecture Layers",
      "score":  0.87
    }
  ]
}
```

**Error responses**:
- `422 Unprocessable Entity`: Validation failure (e.g., question too long).
- `500 Internal Server Error`: Qdrant unreachable or OpenAI API failure.

**Side effects**:
- Creates `chat_sessions` row if `session_id` is new.
- Appends `user` and `assistant` rows to `chat_messages`.

---

### POST `/chat-selected`

RAG Q&A with highlighted page text as additional context.

**Request body**:
```json
{
  "question":      "What does this passage mean?",
  "selected_text": "The DDS middleware decouples publishers from subscribers...",
  "session_id":    "550e8400-e29b-41d4-a716-446655440000",  // optional
  "source_filter": null                                       // optional
}
```

**Constraints**:
- `question`: 1–4000 characters, required.
- `selected_text`: 1–8000 characters, required.
- All other fields same as `/chat`.

**Behaviour difference from `/chat`**: The `selected_text` is prepended to the system prompt as
additional context, in addition to the top-k Qdrant chunks. This allows the model to reason
specifically about the passage the learner highlighted.

**Response 200 OK**: Same schema as `/chat`.

**Error responses**: Same as `/chat`.

---

### POST `/personalize`

Rewrite a chapter's content to suit the learner's background profile.

**Request body**:
```json
{
  "content":          "ROS 2 introduces a new communication paradigm based on DDS...",
  "experience_level": "Beginner",
  "has_gpu":          false,
  "used_ros":         false,
  "learning_style":   "Visual"
}
```

**Constraints**:
- `content`: Non-empty string (typically 500–5000 chars of extracted chapter text).
- `experience_level`: `"Beginner"` | `"Intermediate"` | `"Advanced"` (default: `"Beginner"`).
- `has_gpu`: boolean (default: `false`).
- `used_ros`: boolean (default: `false`).
- `learning_style`: `"Visual"` | `"Reading"` | `"Hands-on"` (default: `"Reading"`).

**Response 200 OK**:
```json
{
  "personalized_content": "Think of ROS 2 like a postal service for robots..."
}
```

**Error responses**:
- `422 Unprocessable Entity`: Validation failure.
- `500 Internal Server Error`: OpenAI API failure.

**Side effects**: None (stateless; no persistence).

---

### POST `/translate`

Translate text to a target language (defaults to Urdu).

**Request body**:
```json
{
  "text":            "ROS 2 is a set of software libraries and tools for building robot applications.",
  "target_language": "urdu"
}
```

**Constraints**:
- `text`: Non-empty string (typically 100–5000 chars).
- `target_language`: string (default: `"urdu"`). Any language name accepted; quality depends on GPT-4o-mini capability.

**Response 200 OK**:
```json
{
  "translated_text": "ROS 2 ایک سافٹ ویئر لائبریریوں اور ٹولز کا مجموعہ ہے..."
}
```

**Response notes**:
- Translated text MUST be rendered with `dir="rtl" lang="ur"` for Urdu (handled by client).
- The backend does not enforce RTL — this is a client responsibility.

**Error responses**:
- `422 Unprocessable Entity`: Empty text.
- `500 Internal Server Error`: OpenAI API failure.

**Side effects**: None (stateless).

---

### POST `/ingest`

Re-index all MDX textbook files into Qdrant. Idempotent — safe to run multiple times.

**Request body**: None required.

**Response 200 OK**:
```json
{
  "files":           16,
  "chunks":          187,
  "points_upserted": 187,
  "message":         "Ingestion complete"
}
```

**Behaviour**:
1. Discover all `.mdx` files under `TEXTBOOK_DOCS_PATH`.
2. Extract plain text (strip YAML frontmatter, import/export, JSX tags).
3. Split by H2 headings; chunk at `MAX_CHUNK_CHARS` (default 1500) with `CHUNK_OVERLAP_CHARS` (default 150) overlap.
4. Batch-embed via OpenAI `text-embedding-3-small`.
5. Reset Qdrant collection (drop + recreate).
6. Upsert all chunks with UUID v5 IDs.

**Error responses**:
- `500 Internal Server Error`: Qdrant or OpenAI unreachable; `TEXTBOOK_DOCS_PATH` not found.

**Side effects**: Drops and recreates the Qdrant collection. All existing vectors are replaced.

---

## Error Taxonomy

| Code | Scenario | Client action |
|---|---|---|
| 200 | Success | Render response |
| 422 | Validation error (Pydantic) | Show field error to user |
| 500 | Backend dependency failure (OpenAI / Qdrant / Postgres) | Show "Service unavailable" and allow retry |
| 503 | Cold start timeout (Render free tier) | Show "Starting up, please try again in 10s" |

---

## Idempotency

| Endpoint | Idempotent? | Notes |
|---|---|---|
| `GET /health` | Yes | Read-only |
| `POST /chat` | No | Each call creates a new message row |
| `POST /chat-selected` | No | Each call creates a new message row |
| `POST /personalize` | Yes | Stateless LLM call |
| `POST /translate` | Yes | Stateless LLM call |
| `POST /ingest` | Yes | UUID v5 IDs ensure upsert is safe |

---

## Rate Limits & Timeouts

- **Qdrant client**: 30s connection timeout.
- **asyncpg pool**: min_size=2, max_size=10, command_timeout=30s.
- **OpenAI**: Default SDK timeout (60s). No explicit retry logic in v1 — add `httpx` retry middleware in v2.
- **Render.com free tier**: Cold starts may add 15–30s to first request after inactivity.
