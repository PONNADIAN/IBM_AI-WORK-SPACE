"""
app/main.py
-----------
AI Workspace — FastAPI Application Entry Point
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401 — register all models with Base

# Import all routers
from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.documents import router as documents_router
from app.routers.prompts import router as prompts_router
from app.routers.agents import router as agents_router
from app.routers.mcp import router as mcp_router
from app.routers.quiz import router as quiz_router


# Ensure DB tables exist on initial import (critical for Vercel Serverless cold starts)
try:
    Base.metadata.create_all(bind=engine)
    Path(settings.UPLOAD_DIR).mkdir(exist_ok=True, parents=True)
except Exception as e:
    print(f"[warning] Database creation error on import: {e}")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables, create upload directory."""
    print(f"[startup] Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Create all DB tables
    try:
        Base.metadata.create_all(bind=engine)
        print("[startup] Database tables created/verified")
    except Exception as e:
        print(f"[warning] Database creation error in lifespan: {e}")

    # Create uploads directory
    Path(settings.UPLOAD_DIR).mkdir(exist_ok=True, parents=True)
    print(f"[startup] Upload directory ready: {settings.UPLOAD_DIR}")

    # Validate AI provider
    ai_provider = settings.AI_PROVIDER
    has_key = bool(
        settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY or settings.GOOGLE_API_KEY
    )
    if has_key:
        print(f"[startup] AI Provider: {ai_provider} - API key found!")
    else:
        print("[startup] WARNING: No API key found - running in DEMO MODE")

    yield

    print(f"[shutdown] {settings.APP_NAME} shutting down")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description="One AI Platform for Everything — Chat, Documents, Code, Agents & More",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────

origins = settings.allowed_origins_list
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── API Routes ────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(prompts_router)
app.include_router(agents_router)
app.include_router(mcp_router)
app.include_router(quiz_router)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
        "demo_mode": not bool(
            settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY or settings.GOOGLE_API_KEY
        ),
    }


@app.get("/api/config", tags=["Config"])
def get_public_config():
    """Public config endpoint for the frontend."""
    return {
        "app_name": settings.APP_NAME,
        "ai_provider": settings.AI_PROVIDER,
        "demo_mode": not bool(
            settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY or settings.GOOGLE_API_KEY
        ),
    }


# ── Static Files (Frontend) ───────────────────────────────────────────────────
# For Docker/Production deployment, serve the Vite built files
frontend_build_path = Path(__file__).parent.parent / "frontend_new" / "dist"
if frontend_build_path.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_build_path / "assets")), name="assets")
    
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Serve index.html for any route not starting with /api (SPA routing)
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        return FileResponse(str(frontend_build_path / "index.html"))
