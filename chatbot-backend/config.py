"""
config.py – Application settings loaded from .env via pydantic-settings.
All environment variables are documented in .env.example.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI
    openai_api_key: str

    # Qdrant Cloud
    qdrant_url: str
    qdrant_api_key: str
    qdrant_collection_name: str = "textbook_chunks"

    # Neon Serverless Postgres
    neon_database_url: str

    # Textbook docs path (relative to chatbot-backend/ or absolute)
    textbook_docs_path: str = "../physical-ai-textbook/docs"

    # CORS – comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # RAG parameters
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    chat_model: str = "gpt-4o-mini"
    top_k_chunks: int = 5          # Number of chunks to retrieve from Qdrant
    max_chunk_chars: int = 1500    # Maximum characters per text chunk
    chunk_overlap_chars: int = 150 # Overlap between consecutive chunks
    chat_history_turns: int = 6    # Recent turns to include in each prompt
    max_chat_tokens: int = 1024    # Max tokens for the chat completion

    @field_validator("textbook_docs_path", mode="after")
    @classmethod
    def resolve_docs_path(cls, v: str) -> str:
        """Resolve relative paths relative to this file's directory."""
        p = Path(v)
        if not p.is_absolute():
            p = (Path(__file__).parent / v).resolve()
        return str(p)

    def get_allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
