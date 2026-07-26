"""
config.py
---------
Application configuration using Pydantic BaseSettings.
All settings are loaded from environment variables / .env file.
"""

import os
import secrets
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────
    APP_NAME: str = "AI Workspace"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ── Security ─────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ─────────────────────────────────────
    DATABASE_URL: str = (
        "sqlite:////tmp/ai_workspace.db"
        if os.environ.get("VERCEL")
        else "sqlite:///./ai_workspace.db"
    )

    # ── Redis (optional, for rate limiting) ──────────
    REDIS_URL: Optional[str] = None

    # ── AI Providers ─────────────────────────────────
    AI_PROVIDER: str = "openai"          # openai | gemini | anthropic
    AI_MODEL: str = "claude-3-5-sonnet-20240620"
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # ── Embeddings ───────────────────────────────────
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # ── Storage ──────────────────────────────────────
    STORAGE_TYPE: str = "local"          # local | s3
    UPLOAD_DIR: str = "/tmp/uploads" if os.environ.get("VERCEL") else "uploads"
    MAX_FILE_SIZE_MB: int = 50
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None

    # ── CORS — stored as raw string, parsed via property ─────────────
    # Accepts JSON array  : ["http://localhost:5173","http://localhost:3000"]
    # or comma-separated  : http://localhost:5173,http://localhost:3000
    # or wildcard         : *
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into a list for FastAPI CORS middleware."""
        v = self.ALLOWED_ORIGINS.strip()
        if not v:
            return ["http://localhost:5173", "http://localhost:3000"]
        if v == "*":
            return ["*"]
        if v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                pass
        return [x.strip() for x in v.split(",") if x.strip()]

    # ── Rate Limiting ────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    # ── Vector DB ────────────────────────────────────
    VECTOR_DB_TYPE: str = "chroma"       # chroma | qdrant
    QDRANT_URL: Optional[str] = None

    # ── MCP — Server-level config ONLY ─────────────────
    # Per-user tokens are stored encrypted in the database.
    # NEVER put user tokens here.
    MCP_FILESYSTEM_ROOT: str = "uploads"   # Base dir for isolated workspaces

    # ── OAuth Client IDs (server-side only, not user tokens) ──
    GITHUB_CLIENT_ID:          Optional[str] = None
    GITHUB_CLIENT_SECRET:      Optional[str] = None
    GOOGLE_OAUTH_CLIENT_ID:    Optional[str] = None
    GOOGLE_OAUTH_CLIENT_SECRET:Optional[str] = None
    SLACK_CLIENT_ID:           Optional[str] = None
    SLACK_CLIENT_SECRET:       Optional[str] = None
    NOTION_CLIENT_ID:          Optional[str] = None
    NOTION_CLIENT_SECRET:      Optional[str] = None

    # ── App Base URL ──────────────────────────────────────
    APP_BASE_URL: str = "http://localhost:8000"

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
