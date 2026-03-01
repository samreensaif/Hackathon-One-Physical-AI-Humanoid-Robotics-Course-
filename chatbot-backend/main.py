"""
main.py – FastAPI RAG chatbot backend.

Endpoints
─────────
POST /ingest            Parse all textbook MDX files and store embeddings in Qdrant
POST /chat              Student question → RAG retrieval → GPT-4o-mini answer
POST /chat-selected     Same as /chat but includes highlighted textbook text as context
GET  /health            Liveness + Qdrant collection check
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

import openai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database
import ingest_service
import qdrant_service
from config import get_settings


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()

    # Initialise shared clients once at startup
    app.state.openai = openai.AsyncOpenAI(api_key=cfg.openai_api_key)
    app.state.db_pool = await database.create_pool(cfg.neon_database_url)
    app.state.qdrant = qdrant_service.create_client(cfg.qdrant_url, cfg.qdrant_api_key)

    yield  # serve requests

    # Cleanup
    await app.state.db_pool.close()
    await app.state.qdrant.close()


# ── Application ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Physical-AI Textbook Chatbot",
    description="RAG-powered Q&A over the Physical-AI course textbook.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – read from ALLOWED_ORIGINS env var, fallback to GitHub Pages origin
allowed_origins = os.getenv("ALLOWED_ORIGINS", "https://samreensaif.github.io").split(",")
allowed_origins = [o.strip() for o in allowed_origins]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ───────────────────────────────────────────────


class IngestResponse(BaseModel):
    files: int
    chunks: int
    points_upserted: int
    message: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    session_id: str | None = Field(
        default=None,
        description="Existing session UUID. Omit to start a new session.",
    )
    source_filter: str | None = Field(
        default=None,
        description=(
            "Restrict RAG retrieval to a specific textbook source, "
            "e.g. 'module1-ros2/chapter1'."
        ),
    )


class ChatSelectedRequest(ChatRequest):
    selected_text: str = Field(
        ...,
        min_length=1,
        max_length=8000,
        description="Text the student has highlighted in the textbook UI.",
    )


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    sources: list[dict[str, Any]]


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    target_language: str = Field(default="urdu")


class TranslateResponse(BaseModel):
    translated_text: str


class PersonalizeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    experience_level: str = Field(default="Beginner")
    has_gpu: bool = Field(default=False)
    # T032: ros_experience replaces used_ros (was bool); accepts "none"/"some"/"expert"
    ros_experience: str = Field(default="none")
    learning_style: str = Field(default="Reading")


class PersonalizeResponse(BaseModel):
    personalized_content: str


# ── RAG prompt builder ──────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a helpful teaching assistant for a university course on Physical AI and Robotics.
Your knowledge comes from the course textbook. Answer the student's question clearly and
accurately, using the provided textbook excerpts as your primary source.

Guidelines:
- If the excerpts contain the answer, use them. Cite the section title when helpful.
- If the excerpts are insufficient, say so honestly and draw on general knowledge.
- Keep answers concise but complete. Use fenced code blocks for all code snippets.
- Do not fabricate information about specific robots, APIs, or hardware.
"""


def _build_messages(
    question: str,
    context_chunks: list[dict[str, Any]],
    history: list[dict[str, str]],
    selected_text: str | None = None,
) -> list[dict[str, str]]:
    """Assemble the full OpenAI messages list for a RAG chat turn."""
    # Format retrieved chunks
    context_parts: list[str] = []
    for i, chunk in enumerate(context_chunks, 1):
        source = chunk.get("source", "unknown")
        title = chunk.get("title", "")
        text = chunk.get("text", "")
        header = f"[{i}] {source} — {title}" if title else f"[{i}] {source}"
        context_parts.append(f"{header}\n{text}")
    context_block = "\n\n---\n\n".join(context_parts)

    # Build the user message
    user_parts: list[str] = []
    if selected_text:
        user_parts.append(
            "The student has highlighted the following excerpt from the textbook:\n\n"
            f"```\n{selected_text[:2000]}\n```"
        )
    if context_block:
        user_parts.append(f"Relevant textbook excerpts:\n\n{context_block}")
    user_parts.append(f"Student question: {question}")

    messages: list[dict[str, str]] = [{"role": "system", "content": _SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": "\n\n".join(user_parts)})
    return messages


# ── Core chat handler ───────────────────────────────────────────────────────


async def _chat_core(
    request: ChatRequest,
    selected_text: str | None,
) -> ChatResponse:
    cfg = get_settings()
    oai: openai.AsyncOpenAI = app.state.openai
    qdrant = app.state.qdrant
    pool = app.state.db_pool

    # 1. Ensure session exists (or create a new one)
    if request.session_id:
        session_id = await database.ensure_session(pool, request.session_id)
    else:
        session_id = await database.new_session(pool)

    # 2. Embed the question
    embed_resp = await oai.embeddings.create(
        model=cfg.embedding_model,
        input=request.question,
    )
    query_vector: list[float] = embed_resp.data[0].embedding

    # 3. Retrieve relevant chunks from Qdrant (if collection exists)
    chunks: list[dict[str, Any]] = []
    if await qdrant_service.collection_exists(qdrant, cfg.qdrant_collection_name):
        chunks = await qdrant_service.semantic_search(
            client=qdrant,
            collection_name=cfg.qdrant_collection_name,
            query_vector=query_vector,
            top_k=cfg.top_k_chunks,
            source_filter=request.source_filter,
        )

    # 4. Fetch recent chat history (oldest-first for the messages list)
    history = await database.get_recent_messages(
        pool,
        session_id,
        limit=cfg.chat_history_turns * 2,  # each turn = user + assistant
    )

    # 5. Build prompt and call GPT-4o-mini
    messages = _build_messages(
        question=request.question,
        context_chunks=chunks,
        history=history,
        selected_text=selected_text,
    )
    completion = await oai.chat.completions.create(
        model=cfg.chat_model,
        messages=messages,
        max_tokens=cfg.max_chat_tokens,
        temperature=0.2,
    )
    answer: str = completion.choices[0].message.content or ""

    # 6. Persist both turns to Postgres
    await database.add_message(pool, session_id, "user", request.question)
    await database.add_message(pool, session_id, "assistant", answer)

    # 7. Return
    sources = [
        {"source": c.get("source", "unknown"), "title": c.get("title", ""), "score": c.get("score", 0.0)}
        for c in chunks
    ]
    return ChatResponse(answer=answer, session_id=session_id, sources=sources)


# ── Endpoints ───────────────────────────────────────────────────────────────


@app.post("/ingest", response_model=IngestResponse)
async def ingest() -> IngestResponse:
    """
    Parse all MDX textbook files, embed them with text-embedding-3-small,
    and store the vectors in Qdrant. This endpoint is idempotent – it drops
    and recreates the collection on every call.
    """
    cfg = get_settings()
    try:
        stats = await ingest_service.run_ingest(
            openai_client=app.state.openai,
            qdrant_client=app.state.qdrant,
            collection_name=cfg.qdrant_collection_name,
            docs_path=cfg.textbook_docs_path,
            embedding_model=cfg.embedding_model,
            embedding_dimensions=cfg.embedding_dimensions,
            max_chunk_chars=cfg.max_chunk_chars,
            chunk_overlap_chars=cfg.chunk_overlap_chars,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return IngestResponse(
        **stats,
        message=(
            f"Ingested {stats['files']} files → {stats['chunks']} chunks "
            f"({stats['points_upserted']} vectors upserted)."
        ),
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Answer a student question using RAG over the ingested textbook.
    Conversation history is stored per session_id in Neon Postgres.
    """
    try:
        return await _chat_core(request, selected_text=None)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat-selected", response_model=ChatResponse)
async def chat_selected(request: ChatSelectedRequest) -> ChatResponse:
    """
    Same as /chat but includes text the student has highlighted in the
    textbook UI as additional context for the answer.
    """
    try:
        return await _chat_core(request, selected_text=request.selected_text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/personalize", response_model=PersonalizeResponse)
async def personalize(request: PersonalizeRequest) -> PersonalizeResponse:
    """Rewrite chapter content adapted to the student's background using GPT-4o-mini."""
    oai: openai.AsyncOpenAI = app.state.openai
    system_prompt = (
        "You are an expert educator specialising in Physical AI and Robotics. "
        "Rewrite the following course chapter content so it is perfectly suited "
        "to this student's background:\n\n"
        f"- Experience level: {request.experience_level}\n"
        f"- Has NVIDIA GPU: {'Yes' if request.has_gpu else 'No'}\n"
        f"- ROS experience: {request.ros_experience}\n"
        f"- Preferred learning style: {request.learning_style}\n\n"
        "Adaptation rules:\n"
        "• Beginner: simplify jargon, add plain-English explanations before code, "
        "use everyday analogies.\n"
        "• Intermediate: assume standard programming knowledge; keep technical terms "
        "but explain domain-specific ones.\n"
        "• Advanced: be concise, use precise terminology, skip basic explanations.\n"
        "• Visual learner: add ASCII diagrams, describe visual structure, use tables.\n"
        "• Hands-on learner: lead with code examples and exercises, minimise theory.\n"
        "• Reading learner: favour detailed prose explanations and context.\n"
        "• Has GPU: include GPU-specific commands and tips where relevant.\n"
        "• ROS experience 'none': explain all ROS concepts from scratch.\n"
        "• ROS experience 'some': reference ROS 1 concepts briefly when introducing ROS 2.\n"
        "• ROS experience 'expert': assume full ROS 2 proficiency; focus on nuances.\n\n"
        "Preserve all headings and code blocks. Return only the rewritten content."
    )
    try:
        completion = await oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.content},
            ],
            max_tokens=4000,
            temperature=0.3,
        )
        result = completion.choices[0].message.content or ""
        return PersonalizeResponse(personalized_content=result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest) -> TranslateResponse:
    """Translate text to the target language using GPT-4o-mini."""
    oai: openai.AsyncOpenAI = app.state.openai
    try:
        completion = await oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a professional translator. Translate the following text to "
                        f"{request.target_language}. Preserve the structure and meaning. "
                        f"Return only the translated text, nothing else."
                    ),
                },
                {"role": "user", "content": request.text},
            ],
            max_tokens=4000,
            temperature=0.1,
        )
        translated = completion.choices[0].message.content or ""
        return TranslateResponse(translated_text=translated)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
async def health() -> dict[str, Any]:
    """Liveness check – also reports whether the Qdrant collection is ready."""
    cfg = get_settings()
    collection_ready = await qdrant_service.collection_exists(
        app.state.qdrant, cfg.qdrant_collection_name
    )
    return {"status": "ok", "collection_ready": collection_ready}
