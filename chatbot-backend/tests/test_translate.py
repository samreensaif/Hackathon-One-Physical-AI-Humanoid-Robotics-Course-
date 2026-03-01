"""
T043 — Contract test: POST /translate
Constitution Principle VI: write RED first, then GREEN.

Run:
    pytest chatbot-backend/tests/test_translate.py -v
"""
import re
import pytest

# Unicode range for Urdu/Arabic script characters
URDU_SCRIPT_PATTERN = re.compile(r"[\u0600-\u06FF]")


@pytest.mark.asyncio
async def test_translate_to_urdu_returns_urdu_text(client):
    """POST /translate with target_language='urdu' returns 200 with Urdu script characters."""
    payload = {
        "text": "Hello World. This is a test of the translation endpoint.",
        "target_language": "urdu",
    }
    response = await client.post("/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    translated = data["translated_text"]
    assert isinstance(translated, str) and len(translated) > 0
    assert URDU_SCRIPT_PATTERN.search(translated), (
        f"Expected Urdu/Arabic script characters in translation, got: {translated!r}"
    )


@pytest.mark.asyncio
async def test_translate_empty_text_returns_422(client):
    """POST /translate with empty text must return 422."""
    payload = {"text": "", "target_language": "urdu"}
    response = await client.post("/translate", json=payload)
    assert response.status_code == 422
