"""
T017, T018, T024, T025 — Contract tests: POST /chat and POST /chat-selected
Constitution Principle VI: write RED first, then GREEN.

Run:
    pytest chatbot-backend/tests/test_chat.py -v
"""
import pytest


# ── /chat ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_valid_question_returns_answer(client):
    """POST /chat with a valid question returns 200 with answer, session_id, sources."""
    payload = {"question": "What is ROS 2 and why was it created?"}
    response = await client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["answer"], str) and len(data["answer"]) > 0
    assert isinstance(data["session_id"], str) and len(data["session_id"]) > 0
    assert isinstance(data["sources"], list)
    # Each source must have required fields
    for source in data["sources"]:
        assert "source" in source
        assert "title" in source
        assert "score" in source


@pytest.mark.asyncio
async def test_chat_question_too_long_returns_422(client):
    """POST /chat with question > 4000 chars must return 422 (Pydantic validation)."""
    payload = {"question": "x" * 4001}
    response = await client.post("/chat", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_session_persisted(client):
    """POST /chat returns a session_id; reusing it in a follow-up returns same session."""
    first = await client.post("/chat", json={"question": "What is a ROS 2 node?"})
    assert first.status_code == 200
    session_id = first.json()["session_id"]

    second = await client.post("/chat", json={
        "question": "What is a ROS 2 topic?",
        "session_id": session_id,
    })
    assert second.status_code == 200
    assert second.json()["session_id"] == session_id


# ── /chat-selected ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_selected_with_valid_text_returns_answer(client):
    """POST /chat-selected with valid question + selected_text returns 200 with answer and sources."""
    payload = {
        "question": "Can you explain what this passage means?",
        "selected_text": (
            "The DDS middleware in ROS 2 decouples publishers from subscribers, "
            "enabling flexible many-to-many communication patterns without a central broker."
        ),
    }
    response = await client.post("/chat-selected", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["answer"], str) and len(data["answer"]) > 0
    assert isinstance(data["sources"], list)


@pytest.mark.asyncio
async def test_chat_selected_text_too_long_returns_422(client):
    """POST /chat-selected with selected_text > 8000 chars must return 422."""
    payload = {
        "question": "What does this mean?",
        "selected_text": "y" * 8001,
    }
    response = await client.post("/chat-selected", json=payload)
    assert response.status_code == 422
