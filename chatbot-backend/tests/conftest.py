# Tests: 5 (test_health, test_chat x2, test_chat_selected x2, test_ingest, test_personalize, test_translate)
# Run: pytest chatbot-backend/tests/ -v
#
# NOTE: These tests require a running backend with valid .env credentials.
# For CI without live credentials, use pytest-mock to stub OpenAI/Qdrant calls.

import pytest
from httpx import AsyncClient, ASGITransport

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
async def client():
    """Async HTTP client pointed at the FastAPI app in-process."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac
