"""
routers/mcp.py
--------------
Per-user MCP connection management.

Security guarantees:
  - Tokens are NEVER returned to the frontend.
  - Tokens are NEVER stored in .env.
  - All credentials encrypted with AES-256-GCM before DB storage.
  - Each user's filesystem is isolated to /uploads/{user_id}/
  - Admins can see status/metadata, NEVER plaintext tokens.
"""

import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.mcp_connection import UserMCPConnection
from app.models.user import User
from app.services.encryption import encrypt_token, decrypt_token
from app.config import settings

router = APIRouter(prefix="/api/mcp", tags=["MCP Connections"])

# ── Provider metadata ─────────────────────────────────────────────────────────
PROVIDER_META = {
    "github": {
        "name": "GitHub",
        "icon": "github",
        "description": "Access repositories, issues, and pull requests",
        "auth_type": "oauth",
        "scope": "repo read:user",
    },
    "gdrive": {
        "name": "Google Drive",
        "icon": "gdrive",
        "description": "Read and manage files in Google Drive",
        "auth_type": "oauth",
        "scope": "https://www.googleapis.com/auth/drive.readonly",
    },
    "slack": {
        "name": "Slack",
        "icon": "slack",
        "description": "Send messages and read channels",
        "auth_type": "oauth",
        "scope": "channels:read,chat:write,users:read",
    },
    "notion": {
        "name": "Notion",
        "icon": "notion",
        "description": "Read and write Notion pages and databases",
        "auth_type": "oauth",
        "scope": "read_content write_content",
    },
    "postgres": {
        "name": "PostgreSQL",
        "icon": "postgres",
        "description": "Query your PostgreSQL database",
        "auth_type": "credentials",
        "scope": None,
    },
    "filesystem": {
        "name": "Filesystem",
        "icon": "folder",
        "description": "Access your private workspace files",
        "auth_type": "none",
        "scope": None,
    },
    "browser": {
        "name": "Browser",
        "icon": "browser",
        "description": "Browse and interact with web pages",
        "auth_type": "none",
        "scope": None,
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_connection(user_id: str, provider: str, db: Session) -> Optional[UserMCPConnection]:
    return db.query(UserMCPConnection).filter_by(user_id=user_id, provider=provider).first()


def safe_connection(conn: UserMCPConnection) -> dict:
    """Return public-safe connection data — NO tokens ever."""
    return {
        "id": conn.id,
        "provider": conn.provider,
        "status": conn.status,
        "scope": conn.scope,
        "last_sync": conn.last_sync.isoformat() if conn.last_sync else None,
        "expires_at": conn.expires_at.isoformat() if conn.expires_at else None,
        "created_at": conn.created_at.isoformat() if conn.created_at else None,
        # For Postgres — show host/db but NEVER password
        "pg_host": decrypt_token(conn.pg_host) if conn.pg_host else None,
        "pg_port": decrypt_token(conn.pg_port) if conn.pg_port else None,
        "pg_database": decrypt_token(conn.pg_database) if conn.pg_database else None,
        "pg_username": decrypt_token(conn.pg_username) if conn.pg_username else None,
        "pg_ssl": conn.pg_ssl,
    }


# ── GET /api/mcp/connections ──────────────────────────────────────────────────
@router.get("/connections")
def list_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all MCP connections for the current user. No tokens exposed."""
    connections = db.query(UserMCPConnection).filter_by(user_id=current_user.id).all()

    # Build response: every provider, with connected status
    result = []
    connected_map = {c.provider: c for c in connections}

    for provider_id, meta in PROVIDER_META.items():
        conn = connected_map.get(provider_id)
        if conn:
            data = safe_connection(conn)
        else:
            data = {
                "id": None,
                "provider": provider_id,
                "status": "disconnected",
                "scope": None,
                "last_sync": None,
                "expires_at": None,
                "created_at": None,
                "pg_host": None,
                "pg_port": None,
                "pg_database": None,
                "pg_username": None,
                "pg_ssl": False,
            }
        data["meta"] = meta
        result.append(data)

    return {"connections": result}


# ── DELETE /api/mcp/disconnect/{provider} ────────────────────────────────────
@router.delete("/disconnect/{provider}")
def disconnect_provider(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete encrypted credentials for a provider."""
    conn = get_connection(current_user.id, provider, db)
    if not conn:
        raise HTTPException(404, "Connection not found")
    db.delete(conn)
    db.commit()
    return {"status": "disconnected", "provider": provider}


# ── POST /api/mcp/connect/browser ────────────────────────────────────────────
@router.post("/connect/browser")
def connect_browser(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Browser MCP requires no token — just mark as connected."""
    conn = get_connection(current_user.id, "browser", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="browser")
        db.add(conn)
    conn.status = "connected"
    conn.last_sync = datetime.utcnow()
    db.commit()
    return {"status": "connected", "provider": "browser"}


# ── POST /api/mcp/connect/filesystem ─────────────────────────────────────────
@router.post("/connect/filesystem")
def connect_filesystem(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Each user gets an isolated workspace. No token needed."""
    workspace = Path(settings.UPLOAD_DIR) / current_user.id
    workspace.mkdir(parents=True, exist_ok=True)

    conn = get_connection(current_user.id, "filesystem", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="filesystem")
        db.add(conn)
    conn.status = "connected"
    conn.last_sync = datetime.utcnow()
    conn.scope = str(workspace)
    db.commit()
    return {"status": "connected", "provider": "filesystem", "workspace": f"/user/{current_user.id}/"}


# ── POST /api/mcp/connect/postgres ───────────────────────────────────────────
class PostgresCredentials(BaseModel):
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    ssl: bool = False


@router.post("/connect/postgres")
def connect_postgres(
    creds: PostgresCredentials,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Store encrypted per-user Postgres credentials. Password never returned."""
    conn = get_connection(current_user.id, "postgres", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="postgres")
        db.add(conn)

    conn.pg_host     = encrypt_token(creds.host)
    conn.pg_port     = encrypt_token(str(creds.port))
    conn.pg_database = encrypt_token(creds.database)
    conn.pg_username = encrypt_token(creds.username)
    conn.pg_password = encrypt_token(creds.password)
    conn.pg_ssl      = creds.ssl
    conn.status      = "connected"
    conn.last_sync   = datetime.utcnow()
    db.commit()

    return {"status": "connected", "provider": "postgres", "host": creds.host, "database": creds.database}


# ── OAuth: GitHub ─────────────────────────────────────────────────────────────
@router.get("/connect/github")
def connect_github_start(
    current_user: User = Depends(get_current_user),
):
    """Start GitHub OAuth flow."""
    client_id = settings.GITHUB_CLIENT_ID
    if not client_id:
        raise HTTPException(400, "GitHub OAuth not configured. Add GITHUB_CLIENT_ID to .env")

    state = secrets.token_urlsafe(16)
    scope = "repo read:user"
    redirect_uri = f"{settings.APP_BASE_URL}/api/mcp/callback/github"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}&scope={scope}&state={state}&redirect_uri={redirect_uri}"
    )
    return {"oauth_url": url, "provider": "github"}


@router.get("/callback/github")
async def github_callback(
    code: str,
    state: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Handle GitHub OAuth callback. Exchange code, encrypt & store token."""
    import httpx
    client_id     = settings.GITHUB_CLIENT_ID
    client_secret = settings.GITHUB_CLIENT_SECRET

    if not client_id or not client_secret:
        raise HTTPException(400, "GitHub OAuth not fully configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": client_id, "client_secret": client_secret, "code": code},
            headers={"Accept": "application/json"},
        )
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(400, f"GitHub OAuth failed: {data.get('error_description', 'unknown')}")

    conn = get_connection(current_user.id, "github", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="github")
        db.add(conn)

    conn.access_token_enc = encrypt_token(access_token)
    conn.scope            = data.get("scope", "")
    conn.status           = "connected"
    conn.last_sync        = datetime.utcnow()
    db.commit()

    return {"status": "connected", "provider": "github"}


# ── OAuth: Slack (simplified — exchange code) ────────────────────────────────
class OAuthCodeRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/connect/slack")
async def connect_slack(
    body: OAuthCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange Slack OAuth code for token, encrypt and store."""
    import httpx
    client_id     = settings.SLACK_CLIENT_ID
    client_secret = settings.SLACK_CLIENT_SECRET
    if not client_id or not client_secret:
        raise HTTPException(400, "Slack OAuth not configured. Add SLACK_CLIENT_ID to .env")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={"code": body.code, "redirect_uri": body.redirect_uri,
                  "client_id": client_id, "client_secret": client_secret},
        )
    data = resp.json()
    if not data.get("ok"):
        raise HTTPException(400, f"Slack OAuth error: {data.get('error')}")

    access_token = data["access_token"]
    conn = get_connection(current_user.id, "slack", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="slack")
        db.add(conn)
    conn.access_token_enc = encrypt_token(access_token)
    conn.scope            = data.get("scope", "")
    conn.status           = "connected"
    conn.last_sync        = datetime.utcnow()
    db.commit()
    return {"status": "connected", "provider": "slack"}


# ── OAuth: Notion ─────────────────────────────────────────────────────────────
@router.post("/connect/notion")
async def connect_notion(
    body: OAuthCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange Notion OAuth code for token, encrypt and store."""
    import httpx, base64
    client_id     = settings.NOTION_CLIENT_ID
    client_secret = settings.NOTION_CLIENT_SECRET
    if not client_id or not client_secret:
        raise HTTPException(400, "Notion OAuth not configured")

    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.notion.com/v1/oauth/token",
            json={"grant_type": "authorization_code", "code": body.code, "redirect_uri": body.redirect_uri},
            headers={"Authorization": f"Basic {creds}", "Content-Type": "application/json"},
        )
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(400, f"Notion OAuth error: {data}")

    conn = get_connection(current_user.id, "notion", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="notion")
        db.add(conn)
    conn.access_token_enc = encrypt_token(access_token)
    conn.scope            = data.get("owner", {}).get("type", "")
    conn.status           = "connected"
    conn.last_sync        = datetime.utcnow()
    db.commit()
    return {"status": "connected", "provider": "notion"}


# ── OAuth: Google Drive ───────────────────────────────────────────────────────
@router.get("/connect/gdrive")
def connect_gdrive_start(current_user: User = Depends(get_current_user)):
    """Start Google Drive OAuth flow."""
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise HTTPException(400, "Google OAuth not configured. Add GOOGLE_OAUTH_CLIENT_ID to .env")

    redirect_uri = f"{settings.APP_BASE_URL}/api/mcp/callback/gdrive"
    scope = "https://www.googleapis.com/auth/drive.readonly"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}&redirect_uri={redirect_uri}"
        f"&response_type=code&scope={scope}&access_type=offline&prompt=consent"
    )
    return {"oauth_url": url, "provider": "gdrive"}


@router.get("/callback/gdrive")
async def gdrive_callback(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import httpx
    client_id     = settings.GOOGLE_OAUTH_CLIENT_ID
    client_secret = settings.GOOGLE_OAUTH_CLIENT_SECRET
    redirect_uri  = f"{settings.APP_BASE_URL}/api/mcp/callback/gdrive"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": client_id, "client_secret": client_secret,
                  "redirect_uri": redirect_uri, "grant_type": "authorization_code"},
        )
    data = resp.json()
    access_token  = data.get("access_token")
    refresh_token = data.get("refresh_token", "")
    expires_in    = data.get("expires_in", 3600)

    if not access_token:
        raise HTTPException(400, f"Google OAuth error: {data}")

    conn = get_connection(current_user.id, "gdrive", db)
    if not conn:
        conn = UserMCPConnection(user_id=current_user.id, provider="gdrive")
        db.add(conn)
    conn.access_token_enc  = encrypt_token(access_token)
    conn.refresh_token_enc = encrypt_token(refresh_token)
    conn.expires_at        = datetime.utcnow() + timedelta(seconds=expires_in)
    conn.scope             = data.get("scope", "")
    conn.status            = "connected"
    conn.last_sync         = datetime.utcnow()
    db.commit()
    return {"status": "connected", "provider": "gdrive"}


# ── Internal: retrieve decrypted token (server-side only) ────────────────────
def get_decrypted_token(user_id: str, provider: str, db: Session) -> Optional[str]:
    """Used ONLY by server-side MCP execution. Never exposed to frontend."""
    conn = get_connection(user_id, provider, db)
    if not conn or conn.status != "connected":
        return None
    return decrypt_token(conn.access_token_enc or "")
