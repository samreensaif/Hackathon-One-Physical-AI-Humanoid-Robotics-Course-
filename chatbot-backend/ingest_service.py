"""
ingest_service.py – MDX → text chunks → OpenAI embeddings → Qdrant.

Pipeline
────────
1. Walk the textbook docs directory for all .mdx files
2. Strip MDX frontmatter, import/export statements, and JSX component tags
3. Split each file into section-based chunks (by H2 headings), then by
   character limit with overlap to keep chunks within the token budget
4. Call OpenAI Embeddings API in batches of up to 100 texts
5. Reset the Qdrant collection and upsert all PointStructs
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import openai
from qdrant_client import AsyncQdrantClient

import qdrant_service


# ── MDX text extraction ─────────────────────────────────────────────────────

# YAML frontmatter block (--- ... ---)
_FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)
# import / export lines
_IMPORT_RE = re.compile(r"^import\s+.*?;?\s*$", re.MULTILINE)
_EXPORT_RE = re.compile(r"^export\s+.*?;?\s*$", re.MULTILINE)
# JSX component open/self-closing tags (capital-letter start)
_JSX_OPEN_TAG_RE = re.compile(r"<[A-Z][A-Za-z0-9]*(?:\s[^>]*?)?(?:/>|>)", re.DOTALL)
# JSX component closing tags
_JSX_CLOSE_TAG_RE = re.compile(r"</[A-Z][A-Za-z0-9]*>")
# Inline JSX expressions {value}
_JSX_EXPR_RE = re.compile(r"\{[^}\n]{0,200}\}")


def _extract_text(raw: str) -> str:
    """Strip MDX plumbing, returning plain Markdown text."""
    text = _FRONTMATTER_RE.sub("", raw, count=1)
    text = _IMPORT_RE.sub("", text)
    text = _EXPORT_RE.sub("", text)
    text = _JSX_OPEN_TAG_RE.sub("", text)
    text = _JSX_CLOSE_TAG_RE.sub("", text)
    text = _JSX_EXPR_RE.sub("", text)
    # Collapse runs of 3+ blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── Chunking ────────────────────────────────────────────────────────────────


def _split_into_sections(text: str) -> list[tuple[str, str]]:
    """
    Split text by H2 headings (## Heading).

    Returns a list of (heading_title, body) tuples.
    Content before the first H2 is returned as ("", content).
    """
    # Match ## but not ### or deeper (negative lookbehind for extra #)
    parts = re.split(r"^(##\s+[^#\n].+)$", text, flags=re.MULTILINE)

    sections: list[tuple[str, str]] = []
    if parts[0].strip():
        sections.append(("", parts[0].strip()))

    # parts alternates: [pre, heading, body, heading, body, ...]
    i = 1
    while i + 1 < len(parts):
        heading = parts[i].strip().lstrip("#").strip()
        body = parts[i + 1].strip()
        if body:
            sections.append((heading, body))
        i += 2

    return sections


def _chunk_text(
    text: str,
    max_chars: int = 1500,
    overlap_chars: int = 150,
) -> list[str]:
    """
    Split a block of text into chunks of at most `max_chars` characters,
    with `overlap_chars` characters of overlap between consecutive chunks.

    Tries paragraph boundaries first, then sentence boundaries, then hard cuts.
    """
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end >= len(text):
            chunks.append(text[start:])
            break

        # Prefer paragraph boundary
        cut = text.rfind("\n\n", start, end)
        if cut <= start:
            # Fall back to sentence boundary
            cut = max(
                text.rfind(". ", start, end),
                text.rfind(".\n", start, end),
            )
        if cut <= start:
            cut = end  # hard cut

        chunks.append(text[start : cut + 1])
        start = max(start + 1, cut + 1 - overlap_chars)

    return [c.strip() for c in chunks if c.strip()]


def _derive_source(file_path: Path, docs_root: Path) -> str:
    """
    Convert an absolute MDX path to a source key.
    e.g. /docs/module1-ros2/chapter1.mdx → 'module1-ros2/chapter1'
    """
    return file_path.relative_to(docs_root).with_suffix("").as_posix()


# ── Main pipeline helpers ────────────────────────────────────────────────────


def discover_mdx_files(docs_path: str) -> list[Path]:
    """Return all .mdx files under docs_path, sorted by path."""
    return sorted(Path(docs_path).rglob("*.mdx"))


def build_chunks(
    mdx_files: list[Path],
    docs_root: Path,
    max_chars: int = 1500,
    overlap_chars: int = 150,
) -> list[dict[str, Any]]:
    """
    Parse every MDX file into text chunks.

    Returns a flat list of dicts:
        { text, source, title, chunk_index }
    """
    all_chunks: list[dict[str, Any]] = []

    for file_path in mdx_files:
        raw = file_path.read_text(encoding="utf-8")
        clean = _extract_text(raw)
        sections = _split_into_sections(clean)
        source = _derive_source(file_path, docs_root)

        chunk_idx = 0
        for title, body in sections:
            for sub in _chunk_text(body, max_chars=max_chars, overlap_chars=overlap_chars):
                text = f"{title}\n\n{sub}".strip() if title else sub
                all_chunks.append(
                    {
                        "text": text,
                        "source": source,
                        "title": title,
                        "chunk_index": chunk_idx,
                    }
                )
                chunk_idx += 1

    return all_chunks


async def embed_texts(
    client: openai.AsyncOpenAI,
    texts: list[str],
    model: str = "text-embedding-3-small",
    batch_size: int = 100,
) -> list[list[float]]:
    """
    Embed a list of texts in batches of `batch_size`.
    Returns embedding vectors in the same order as `texts`.
    """
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(model=model, input=batch)
        all_embeddings.extend(item.embedding for item in response.data)
    return all_embeddings


# ── Entry point ─────────────────────────────────────────────────────────────


async def run_ingest(
    openai_client: openai.AsyncOpenAI,
    qdrant_client: AsyncQdrantClient,
    collection_name: str,
    docs_path: str,
    embedding_model: str = "text-embedding-3-small",
    embedding_dimensions: int = 1536,
    max_chunk_chars: int = 1500,
    chunk_overlap_chars: int = 150,
) -> dict[str, Any]:
    """
    Full ingest pipeline: discover → chunk → embed → upsert.
    Returns { files, chunks, points_upserted }.
    """
    docs_root = Path(docs_path)
    mdx_files = discover_mdx_files(docs_path)

    if not mdx_files:
        return {"files": 0, "chunks": 0, "points_upserted": 0}

    chunks = build_chunks(
        mdx_files,
        docs_root,
        max_chars=max_chunk_chars,
        overlap_chars=chunk_overlap_chars,
    )

    texts = [c["text"] for c in chunks]
    embeddings = await embed_texts(openai_client, texts, model=embedding_model)

    # Reset (drop + recreate) and upsert
    await qdrant_service.reset_collection(
        qdrant_client, collection_name, vector_size=embedding_dimensions
    )
    points_upserted = await qdrant_service.upsert_chunks(
        qdrant_client, collection_name, chunks, embeddings
    )

    return {
        "files": len(mdx_files),
        "chunks": len(chunks),
        "points_upserted": points_upserted,
    }
