"""
T009 — Contract test: GET /health
Constitution Principle VI: write RED first, then GREEN.

Run:
    pytest chatbot-backend/tests/test_health.py -v
"""
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    """GET /health must return 200 with status == 'ok'."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "collection_ready" in data
    assert isinstance(data["collection_ready"], bool)
