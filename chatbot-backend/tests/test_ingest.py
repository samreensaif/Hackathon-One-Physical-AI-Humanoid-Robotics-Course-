"""
T019 — Contract test: POST /ingest
Constitution Principle VI: write RED first, then GREEN.

Run:
    pytest chatbot-backend/tests/test_ingest.py -v

NOTE: This test performs a real ingest (calls OpenAI embeddings + Qdrant).
      It will fail without valid credentials in .env.
      For CI, mock openai.AsyncOpenAI and qdrant_service.upsert_chunks.
"""
import pytest


@pytest.mark.asyncio
async def test_ingest_returns_stats(client):
    """POST /ingest returns 200 with files > 0, chunks > 0, points_upserted > 0."""
    response = await client.post("/ingest")
    assert response.status_code == 200
    data = response.json()
    assert data["files"] > 0, "Expected at least 1 MDX file to be ingested"
    assert data["chunks"] > 0, "Expected at least 1 chunk"
    assert data["points_upserted"] > 0, "Expected at least 1 vector upserted"
    assert isinstance(data["message"], str)
