#!/usr/bin/env python3
"""
ingest.py – Standalone CLI ingestion script for the Physical-AI textbook chatbot.

Usage
─────
    cd chatbot-backend
    python ingest.py

Reads from .env (or the shell environment):
    OPENAI_API_KEY       – OpenAI secret key
    QDRANT_URL           – Qdrant Cloud cluster URL
    QDRANT_API_KEY       – Qdrant Cloud API key
    QDRANT_COLLECTION_NAME – target collection (default: textbook_chunks)
    TEXTBOOK_DOCS_PATH   – path to the /docs folder (relative or absolute)
"""
from __future__ import annotations

import os
import re
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

# ── Load environment variables ───────────────────────────────────────────────
load_dotenv()

OPENAI_API_KEY   = os.environ.get("OPENAI_API_KEY", "")
QDRANT_URL       = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY   = os.environ.get("QDRANT_API_KEY", "")
COLLECTION_NAME  = os.environ.get("QDRANT_COLLECTION_NAME", "textbook_chunks")
DOCS_PATH        = os.environ.get("TEXTBOOK_DOCS_PATH", "../physical-ai-textbook/docs")

EMBEDDING_MODEL  = "text-embedding-3-small"
VECTOR_SIZE      = 1536
CHUNK_WORDS      = 500   # target words per chunk  (~375 tokens at ~0.75 words/token)
OVERLAP_WORDS    = 50    # words shared between consecutive chunks
EMBED_BATCH_SIZE = 100   # max texts per OpenAI embeddings call
UPSERT_BATCH     = 200   # points per Qdrant upsert call


# ── Text cleaning ────────────────────────────────────────────────────────────

_FRONTMATTER_RE  = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)
_IMPORT_RE       = re.compile(r"^import\s+.*?;?\s*$", re.MULTILINE)
_EXPORT_RE       = re.compile(r"^export\s+.*?;?\s*$", re.MULTILINE)
_JSX_OPEN_RE     = re.compile(r"<[A-Z][A-Za-z0-9]*(?:\s[^>]*?)?(?:/>|>)", re.DOTALL)
_JSX_CLOSE_RE    = re.compile(r"</[A-Z][A-Za-z0-9]*>")
_JSX_EXPR_RE     = re.compile(r"\{[^}\n]{0,200}\}")
_MD_IMAGE_RE     = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_MD_LINK_RE      = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_INLINE_CODE_RE  = re.compile(r"`([^`\n]+)`")
_BOLD_ITALIC_RE  = re.compile(r"\*{1,3}([^*\n]+)\*{1,3}|_{1,3}([^_\n]+)_{1,3}")
_HEADING_RE      = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_HTML_TAG_RE     = re.compile(r"<[^>]{1,120}>")


def clean_text(raw: str) -> str:
    """
    Strip MDX/Markdown syntax and return plain readable text.

    Code fence content is kept as plain text (valuable for a programming
    textbook), but the fence markers themselves are removed.
    """
    text = _FRONTMATTER_RE.sub("", raw, count=1)
    text = _IMPORT_RE.sub("", text)
    text = _EXPORT_RE.sub("", text)

    # Strip fence markers but keep the code content
    text = re.sub(r"```[^\n]*\n", "", text)   # opening ```lang
    text = text.replace("```", "")            # closing ```

    text = _JSX_OPEN_RE.sub("", text)
    text = _JSX_CLOSE_RE.sub("", text)
    text = _JSX_EXPR_RE.sub("", text)
    text = _MD_IMAGE_RE.sub("", text)                          # drop images
    text = _MD_LINK_RE.sub(r"\1", text)                        # keep link text
    text = _INLINE_CODE_RE.sub(r"\1", text)                    # strip backticks
    text = _BOLD_ITALIC_RE.sub(lambda m: m.group(1) or m.group(2) or "", text)
    text = _HEADING_RE.sub("", text)                           # strip # markers
    text = _HTML_TAG_RE.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ── Word-count based chunker (no extra libraries) ────────────────────────────

def split_into_chunks(
    text: str,
    chunk_size: int = CHUNK_WORDS,
    overlap: int = OVERLAP_WORDS,
) -> list[str]:
    """
    Split text into overlapping chunks measured in words.

    Each chunk contains at most `chunk_size` words.
    Consecutive chunks share `overlap` words so context is not lost
    at chunk boundaries.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        # Step forward by (chunk_size - overlap) words
        start = end - overlap

    return [c for c in chunks if c.strip()]


# ── File discovery ───────────────────────────────────────────────────────────

def find_doc_files(docs_root: Path) -> list[Path]:
    """Return all .md and .mdx files under docs_root, sorted by path."""
    md_files  = list(docs_root.rglob("*.md"))
    mdx_files = list(docs_root.rglob("*.mdx"))
    return sorted(set(md_files + mdx_files))


# ── Metadata helpers ─────────────────────────────────────────────────────────

def derive_source_file(file_path: Path, docs_root: Path) -> str:
    """
    Relative path without extension, using forward slashes.
    e.g. docs/module1-ros2/chapter1.mdx → 'module1-ros2/chapter1'
    """
    return file_path.relative_to(docs_root).with_suffix("").as_posix()


def derive_module_name(file_path: Path, docs_root: Path) -> str:
    """
    Top-level directory name under docs_root.
    e.g. docs/module1-ros2/chapter1.mdx → 'module1-ros2'
    """
    parts = file_path.relative_to(docs_root).parts
    return parts[0] if len(parts) > 1 else ""


def make_point_id(source_file: str, chunk_index: int) -> str:
    """Deterministic UUID so re-ingesting the same content is idempotent."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{source_file}::{chunk_index}"))


# ── OpenAI embeddings ────────────────────────────────────────────────────────

def embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


# ── Qdrant helpers ───────────────────────────────────────────────────────────

def reset_collection(client: QdrantClient) -> None:
    """Drop the collection if it exists, then recreate it fresh."""
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in existing:
        print(f"  Dropping existing collection '{COLLECTION_NAME}'…")
        client.delete_collection(COLLECTION_NAME)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    print(f"  Created collection '{COLLECTION_NAME}' (dim={VECTOR_SIZE}, cosine distance).")


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    # Validate required env vars
    missing = [v for v in ("OPENAI_API_KEY", "QDRANT_URL", "QDRANT_API_KEY") if not os.environ.get(v)]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Copy .env.example to .env and fill in your credentials.", file=sys.stderr)
        sys.exit(1)

    # Resolve docs path (relative paths are resolved from the script's directory)
    docs_root = Path(DOCS_PATH)
    if not docs_root.is_absolute():
        docs_root = (Path(__file__).parent / DOCS_PATH).resolve()

    print("=" * 55)
    print(f"  Textbook docs : {docs_root}")
    print(f"  Collection    : {COLLECTION_NAME}")
    print(f"  Chunk size    : {CHUNK_WORDS} words  (overlap: {OVERLAP_WORDS})")
    print("=" * 55)
    print()

    if not docs_root.exists():
        print(f"ERROR: docs path does not exist: {docs_root}", file=sys.stderr)
        sys.exit(1)

    # ── Step 1: Discover files ────────────────────────────────────────────
    files = find_doc_files(docs_root)
    if not files:
        print("No .md / .mdx files found. Check TEXTBOOK_DOCS_PATH.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(files)} doc file(s).\n")

    # ── Step 2: Parse and chunk ───────────────────────────────────────────
    all_chunks: list[dict] = []

    for file_path in files:
        rel = file_path.relative_to(docs_root)
        print(f"Ingesting: {rel}")

        raw = file_path.read_text(encoding="utf-8")
        text = clean_text(raw)
        if not text:
            print(f"  (skipped – no text after cleaning)")
            continue

        source_file = derive_source_file(file_path, docs_root)
        module_name = derive_module_name(file_path, docs_root)

        file_chunks = split_into_chunks(text)
        print(f"  → {len(file_chunks)} chunk(s)")

        for i, chunk_text in enumerate(file_chunks):
            all_chunks.append(
                {
                    "text": chunk_text,
                    "source_file": source_file,
                    "module_name": module_name,
                    "chunk_index": i,
                }
            )

    print(f"\nTotal chunks to embed: {len(all_chunks)}\n")

    if not all_chunks:
        print("Nothing to ingest.", file=sys.stderr)
        sys.exit(1)

    # ── Step 3: Embed ─────────────────────────────────────────────────────
    oai = OpenAI(api_key=OPENAI_API_KEY)
    embeddings: list[list[float]] = []

    print("Embedding chunks with text-embedding-3-small…")
    for start in range(0, len(all_chunks), EMBED_BATCH_SIZE):
        batch_texts = [c["text"] for c in all_chunks[start : start + EMBED_BATCH_SIZE]]
        embeddings.extend(embed_batch(oai, batch_texts))
        done = min(start + EMBED_BATCH_SIZE, len(all_chunks))
        print(f"  Embedded {done} / {len(all_chunks)}")

    # ── Step 4: Reset Qdrant collection ───────────────────────────────────
    print("\nConfiguring Qdrant…")
    qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    reset_collection(qdrant)

    # ── Step 5: Build and upsert points ───────────────────────────────────
    points = [
        PointStruct(
            id=make_point_id(c["source_file"], c["chunk_index"]),
            vector=emb,
            payload={
                "text":        c["text"],
                "source_file": c["source_file"],
                "module_name": c["module_name"],
                "chunk_index": c["chunk_index"],
            },
        )
        for c, emb in zip(all_chunks, embeddings)
    ]

    print(f"\nUploading {len(points)} points to Qdrant…")
    for start in range(0, len(points), UPSERT_BATCH):
        batch = points[start : start + UPSERT_BATCH]
        qdrant.upsert(collection_name=COLLECTION_NAME, points=batch, wait=True)
        done = min(start + UPSERT_BATCH, len(points))
        print(f"  Uploaded {done} / {len(points)}")

    print()
    print("=" * 55)
    print(f"  Done!  {len(points)} chunks uploaded to '{COLLECTION_NAME}'.")
    print("=" * 55)


if __name__ == "__main__":
    main()
