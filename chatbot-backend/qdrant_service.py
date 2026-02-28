"""
qdrant_service.py – Qdrant Cloud client wrapper.

Responsibilities:
  • Creating / resetting the vector collection
  • Batch-upserting PointStructs (text chunks + embeddings)
  • Semantic search returning ranked text chunks with metadata
"""
from __future__ import annotations

import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)


# ── Client factory ─────────────────────────────────────────────────────────────


def create_client(url: str, api_key: str) -> AsyncQdrantClient:
    return AsyncQdrantClient(url=url, api_key=api_key, timeout=30)


# ── Collection management ─────────────────────────────────────────────────────


async def reset_collection(
    client: AsyncQdrantClient,
    collection_name: str,
    vector_size: int = 1536,
) -> None:
    """
    Drop the collection if it exists, then recreate it with cosine similarity.
    Called by POST /ingest to ensure a clean re-index every time.
    """
    existing = [c.name for c in (await client.get_collections()).collections]
    if collection_name in existing:
        await client.delete_collection(collection_name)

    await client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE,
            on_disk=False,
        ),
    )


async def collection_exists(client: AsyncQdrantClient, collection_name: str) -> bool:
    existing = [c.name for c in (await client.get_collections()).collections]
    return collection_name in existing


async def collection_info(
    client: AsyncQdrantClient, collection_name: str
) -> dict[str, Any]:
    info = await client.get_collection(collection_name)
    return {
        "name": collection_name,
        "vectors_count": info.vectors_count,
        "points_count": info.points_count,
        "status": str(info.status),
    }


# ── Upsert ─────────────────────────────────────────────────────────────────────


async def upsert_chunks(
    client: AsyncQdrantClient,
    collection_name: str,
    chunks: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> int:
    """
    Upsert a batch of chunks into Qdrant.

    Args:
        chunks:     List of dicts with keys: text, source, title, chunk_index
        embeddings: Parallel list of embedding vectors

    Returns:
        Number of points upserted.
    """
    assert len(chunks) == len(embeddings), "chunks and embeddings must be same length"

    points = [
        PointStruct(
            id=str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"{chunk['source']}::{chunk['chunk_index']}",
                )
            ),
            vector=embedding,
            payload={
                "text": chunk["text"],
                "source": chunk["source"],       # e.g. "module1-ros2/chapter1"
                "title": chunk["title"],         # section heading
                "chunk_index": chunk["chunk_index"],
            },
        )
        for chunk, embedding in zip(chunks, embeddings)
    ]

    await client.upsert(collection_name=collection_name, points=points, wait=True)
    return len(points)


# ── Search ─────────────────────────────────────────────────────────────────────


async def semantic_search(
    client: AsyncQdrantClient,
    collection_name: str,
    query_vector: list[float],
    top_k: int = 5,
    score_threshold: float = 0.25,
    source_filter: str | None = None,
) -> list[dict[str, Any]]:
    """
    Find the top_k most semantically similar chunks.

    Args:
        query_vector:    Embedding of the user's question.
        score_threshold: Minimum cosine similarity (0–1). Chunks below this
                         are discarded even if they rank in top_k.
        source_filter:   Optional – restrict search to a specific source file.

    Returns:
        List of dicts: {text, source, title, chunk_index, score}
    """
    query_filter = None
    if source_filter:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="source",
                    match=MatchValue(value=source_filter),
                )
            ]
        )

    results = await client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=top_k,
        score_threshold=score_threshold,
        with_payload=True,
        query_filter=query_filter,
    )

    return [
        {
            "text": r.payload.get("text", ""),
            "source": r.payload.get("source_file", "unknown"),
            "title": r.payload.get("module_name", "unknown"),
            "chunk_index": r.payload.get("chunk_index", 0),
            "score": round(r.score, 4),
        }
        for r in results
    ]
