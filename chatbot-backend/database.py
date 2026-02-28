"""
database.py – Neon Serverless Postgres connection pool and chat history CRUD.

Schema (auto-created on startup):
    chat_sessions  – one row per session (optional metadata)
    chat_messages  – one row per message (user or assistant)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg

# ── Schema ─────────────────────────────────────────────────────────────────────

CREATE_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    session_id  UUID        NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
    ON chat_messages (session_id, created_at);
"""

# ── Pool management ───────────────────────────────────────────────────────────


async def create_pool(dsn: str) -> asyncpg.Pool:
    """Create the asyncpg connection pool and initialise the schema."""
    pool: asyncpg.Pool = await asyncpg.create_pool(
        dsn=dsn,
        min_size=2,
        max_size=10,
        command_timeout=30,
        # Neon requires SSL; the DSN ?sslmode=require handles this automatically
    )
    async with pool.acquire() as conn:
        await conn.execute(CREATE_SCHEMA_SQL)
    return pool


# ── Session helpers ───────────────────────────────────────────────────────────


async def ensure_session(pool: asyncpg.Pool, session_id: str) -> str:
    """Create the session row if it doesn't exist yet. Returns session_id."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO chat_sessions (session_id)
            VALUES ($1)
            ON CONFLICT (session_id) DO NOTHING
            """,
            uuid.UUID(session_id),
        )
    return session_id


async def new_session(pool: asyncpg.Pool) -> str:
    """Create a brand-new session and return its UUID string."""
    sid = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO chat_sessions (session_id) VALUES ($1)",
            uuid.UUID(sid),
        )
    return sid


# ── Message helpers ───────────────────────────────────────────────────────────


async def add_message(
    pool: asyncpg.Pool,
    session_id: str,
    role: str,
    content: str,
) -> None:
    """Append a single message to the session history."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO chat_messages (session_id, role, content)
            VALUES ($1, $2, $3)
            """,
            uuid.UUID(session_id),
            role,
            content,
        )


async def get_recent_messages(
    pool: asyncpg.Pool,
    session_id: str,
    limit: int = 12,  # last N rows (user + assistant pairs)
) -> list[dict[str, str]]:
    """
    Return the most recent `limit` messages for a session,
    ordered oldest-first so they slot directly into the OpenAI messages list.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content
            FROM (
                SELECT role, content, created_at
                FROM chat_messages
                WHERE session_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            ) sub
            ORDER BY created_at ASC
            """,
            uuid.UUID(session_id),
            limit,
        )
    return [{"role": row["role"], "content": row["content"]} for row in rows]


async def delete_session_history(pool: asyncpg.Pool, session_id: str) -> int:
    """Delete all messages for a session. Returns number of deleted rows."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM chat_messages WHERE session_id = $1",
            uuid.UUID(session_id),
        )
    # asyncpg returns "DELETE N" as a string
    return int(result.split()[-1])


async def list_sessions(
    pool: asyncpg.Pool, limit: int = 50
) -> list[dict[str, Any]]:
    """Return the most recent sessions with message counts."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                s.session_id,
                s.created_at,
                COUNT(m.id) AS message_count
            FROM chat_sessions s
            LEFT JOIN chat_messages m ON m.session_id = s.session_id
            GROUP BY s.session_id, s.created_at
            ORDER BY s.created_at DESC
            LIMIT $1
            """,
            limit,
        )
    return [
        {
            "session_id": str(row["session_id"]),
            "created_at": row["created_at"].isoformat(),
            "message_count": row["message_count"],
        }
        for row in rows
    ]
