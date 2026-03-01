# Data Model: Physical AI & Humanoid Robotics Textbook Platform

**Branch**: `001-physical-ai-textbook` | **Date**: 2026-03-01

## Storage Breakdown

| Store | What Lives Here | Technology |
|---|---|---|
| localStorage (browser) | User auth credentials, onboarding profile, chatbot session ID | Browser localStorage |
| Neon Serverless Postgres | Chat sessions, chat message history | asyncpg + Neon |
| Qdrant Cloud | Textbook chunk embeddings for semantic search | Qdrant collection |
| Git / MDX files | Authoritative textbook content | `physical-ai-textbook/docs/*.mdx` |

---

## 1. localStorage Entities (Client-Side)

### 1.1 `auth_user` (localStorage key)

Stored as JSON string. Written on sign-up; read on sign-in.

```
Field            Type       Constraints
---------------- ---------- ------------------------------------------
name             string     Non-empty; max 100 chars
email            string     Valid email format; unique (enforced client-side)
password         string     SHA-256 hash of raw password (min 6 chars raw)
createdAt        ISO 8601   Set at sign-up
onboardingDone   boolean    true after step-2 onboarding complete
profile          object     See UserProfile below
```

### 1.2 `UserProfile` (nested in `auth_user`)

```
Field            Type           Values
---------------- -------------- ---------------------------------------------
experienceLevel  string enum    "Beginner" | "Intermediate" | "Advanced"
hasGpu           boolean        true | false
usedRos          boolean        true | false  (v1); extend to "none"/"some"/"expert" in v2
learningStyle    string enum    "Visual" | "Reading" | "Hands-on"
```

**Validation rules**:
- All four fields are required before `onboardingDone = true` is set.
- If any field is missing at profile read time, the default profile is used:
  `{ experienceLevel: "Beginner", hasGpu: false, usedRos: false, learningStyle: "Reading" }`

### 1.3 `auth_session` (localStorage key)

Stored as JSON string. Written on sign-up/sign-in; cleared on sign-out.

```
Field            Type       Description
---------------- ---------- ------------------------------------------
email            string     Identifies the logged-in user (FK to auth_user.email)
name             string     Display name (denormalized for quick access)
loggedInAt       ISO 8601   Session start timestamp
```

### 1.4 `chatbot_session_id` (localStorage key)

A UUID v4 string. Created on first chat interaction if absent; persisted across page navigations
within the same browser context. Sent as `session_id` in all `/chat` and `/chat-selected` requests.

---

## 2. Neon Postgres Schema

### 2.1 `chat_sessions`

```sql
CREATE TABLE chat_sessions (
    session_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes**:
- Created by backend on first `/chat` request with a new `session_id`.
- `ensure_session()` uses INSERT ... ON CONFLICT DO NOTHING for idempotency.

### 2.2 `chat_messages`

```sql
CREATE TABLE chat_messages (
    id          BIGSERIAL   PRIMARY KEY,
    session_id  UUID        NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages (session_id, created_at);
```

**Notes**:
- `role` is constrained to `'user'`, `'assistant'`, or `'system'` — aligns with OpenAI message format.
- `get_recent_messages(pool, session_id, limit=12)` fetches the 6 most recent turns (12 messages)
  ordered oldest-first for LLM context window construction.
- CASCADE delete ensures orphaned messages are removed with their session.

---

## 3. Qdrant Vector Store

### 3.1 Collection: `textbook_chunks` (configurable via `QDRANT_COLLECTION_NAME`)

**Vector configuration**:
- Size: 1536 dimensions (OpenAI `text-embedding-3-small`)
- Distance metric: Cosine similarity
- Storage: in-memory (Qdrant Cloud default)

**Point structure** (one point per chunk):

```
Field (payload)  Type     Description
---------------- -------- --------------------------------------------------
text             string   Raw text of the chunk (stripped of MDX syntax)
source           string   Relative path: e.g. "module1-ros2/chapter1.mdx"
title            string   H2 section heading that introduced this chunk
chunk_index      integer  Position of chunk within its section (0-based)
```

**Point ID**: UUID v5 derived from `f"{source}::{chunk_index}"` using `uuid.NAMESPACE_DNS`.
This ensures idempotent re-ingest (same content → same UUID → upsert = no duplicate).

**Retrieval parameters**:
- `top_k = 5` (configurable via `TOP_K_CHUNKS` env var)
- `score_threshold = 0.0` (no minimum; top-k always returned)
- Optional `source_filter`: FieldCondition on `source` for chapter-scoped queries

---

## 4. Content Model (MDX Files — Git Source of Truth)

### 4.1 Module Structure

```
Module 1: ROS 2 Fundamentals         (module1-ros2/chapter{1-4}.mdx)
Module 2: Gazebo/Unity Simulation    (module2-simulation/chapter{1-4}.mdx)
Module 3: NVIDIA Isaac & Nav2        (module3-isaac/chapter{1-4}.mdx)
Module 4: VLA Models & Capstone      (module4-vla/chapter{1-4}.mdx)
```

### 4.2 MDX Chapter Frontmatter (logical schema)

Each `.mdx` file begins with YAML frontmatter:

```yaml
---
id: "<module>-chapter<N>"          # Docusaurus doc ID (e.g. "ros2-chapter1")
title: "<Chapter Title>"
sidebar_position: <N>              # Order within module sidebar
---
```

### 4.3 Chapter Content Components

Every chapter MDX file imports and renders:
- `<TranslateButton />` — triggers `/translate` for Urdu output
- `<PersonalizeButton />` — triggers `/personalize` for profile-adapted rewrite

**GPU-required flag**: Currently indicated by content keywords; v2 should add a frontmatter
field `gpu_required: true/false` to enable programmatic home-page filtering.

---

## 5. Entity Relationships

```
localStorage                    Neon Postgres               Qdrant
─────────────────               ──────────────────────      ──────────────────────
auth_user (1)                   chat_sessions (1)           textbook_chunks
  └─ UserProfile (1)              └─ chat_messages (N)        (flat collection,
                                                               sourced from MDX files)
auth_session (1)
chatbot_session_id ──────────── session_id (FK)

MDX files (Git)
  └── indexed into ──────────────────────────────────────── textbook_chunks
```

---

## 6. State Transitions

### User Auth State Machine

```
[Unauthenticated]
       │ click Sign Up
       ▼
[Step 1: Account Form]  → (name, email, password valid)
       │ submit
       ▼
[Step 2: Onboarding]    → (all 4 questions answered)
       │ submit → save auth_user + auth_session to localStorage
       ▼
[Authenticated + Onboarded]
       │ click Sign Out → clear auth_session
       ▼
[Unauthenticated]
       │ click Sign In → validate email/password against auth_user
       ▼
[Authenticated]
```

### Chat Session State Machine

```
[No session_id in localStorage]
       │ first /chat request
       ▼
[Session created in Postgres + session_id written to localStorage]
       │ subsequent requests use same session_id
       ▼
[Active session] ─── messages accumulate in chat_messages
       │ user clears localStorage
       ▼
[Orphaned Postgres session] (messages persist but client loses the ID)
```
