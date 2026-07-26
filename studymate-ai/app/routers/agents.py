"""
routers/agents.py
-----------------
AI Agents endpoints — agent runner and MCP integration.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.base import ChatMessage
from app.ai.factory import get_ai_provider
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/agents", tags=["AI Agents"])


AVAILABLE_AGENTS = [
    {
        "id": "researcher",
        "name": "Research Agent",
        "description": "Searches and synthesizes information on any topic",
        "icon": "🔍",
        "system_prompt": "You are an expert research agent. Provide comprehensive, well-cited, structured research summaries.",
    },
    {
        "id": "coder",
        "name": "Code Agent",
        "description": "Writes, explains, reviews, and debugs code",
        "icon": "💻",
        "system_prompt": "You are an expert software engineer. Write clean, efficient, production-ready code with explanations.",
    },
    {
        "id": "writer",
        "name": "Writing Agent",
        "description": "Creates and refines written content",
        "icon": "✍️",
        "system_prompt": "You are a professional content writer. Create engaging, well-structured, high-quality written content.",
    },
    {
        "id": "analyst",
        "name": "Data Analyst",
        "description": "Analyzes data and generates insights",
        "icon": "📊",
        "system_prompt": "You are a data analyst expert. Analyze data, identify patterns, and provide actionable insights.",
    },
    {
        "id": "resume",
        "name": "Resume Agent",
        "description": "Optimizes resumes and provides career advice",
        "icon": "📄",
        "system_prompt": "You are a professional career coach and resume expert. Provide detailed ATS optimization advice.",
    },
    {
        "id": "tutor",
        "name": "Tutor Agent",
        "description": "Explains complex topics in simple terms",
        "icon": "🎓",
        "system_prompt": "You are an expert tutor. Explain concepts clearly with examples, analogies, and step-by-step breakdowns.",
    },
]

MCP_SERVERS = [
    {"id": "filesystem", "name": "Filesystem MCP", "description": "Read/write local files", "status": "available", "icon": "📁"},
    {"id": "github", "name": "GitHub MCP", "description": "Access GitHub repositories", "status": "needs_token", "icon": "🐙"},
    {"id": "browser", "name": "Browser MCP", "description": "Browse and scrape web pages", "status": "available", "icon": "🌐"},
    {"id": "postgres", "name": "PostgreSQL MCP", "description": "Query databases", "status": "needs_config", "icon": "🗄️"},
    {"id": "slack", "name": "Slack MCP", "description": "Send/read Slack messages", "status": "needs_token", "icon": "💬"},
    {"id": "notion", "name": "Notion MCP", "description": "Read/write Notion pages", "status": "needs_token", "icon": "📓"},
    {"id": "gdrive", "name": "Google Drive MCP", "description": "Access Google Drive files", "status": "needs_oauth", "icon": "☁️"},
]


class AgentRunRequest(BaseModel):
    agent_id: str
    message: str
    tools: List[str] = []
    conversation_history: List[dict] = []


@router.get("/")
def list_agents():
    return {"agents": AVAILABLE_AGENTS}


@router.get("/mcp-servers")
def list_mcp_servers():
    return {"servers": MCP_SERVERS}


@router.post("/run")
async def run_agent(
    body: AgentRunRequest,
    current_user: User = Depends(get_current_user),
):
    """Run an AI agent with streaming response."""
    agent = next((a for a in AVAILABLE_AGENTS if a["id"] == body.agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    provider = get_ai_provider()
    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in body.conversation_history]
    messages.append(ChatMessage(role="user", content=body.message))

    async def stream_agent():
        yield f"data: {json.dumps({'type': 'agent_start', 'agent': agent['name']})}\n\n"
        async for chunk in provider.chat_stream(messages, system_prompt=agent["system_prompt"]):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        stream_agent(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/mcp/filesystem/read")
async def mcp_filesystem_read(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Read a file via Filesystem MCP (sandboxed to upload dir)."""
    from app.config import settings
    from pathlib import Path

    # Sandbox to uploads directory for security
    base = Path(settings.UPLOAD_DIR) / current_user.id
    target = (base / body.get("path", "")).resolve()

    if not str(target).startswith(str(base.resolve())):
        raise HTTPException(status_code=403, detail="Access denied: path outside sandbox")

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
        return {"path": str(target), "content": content[:10000], "truncated": len(content) > 10000}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mcp/filesystem/list")
async def mcp_filesystem_list(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """List files via Filesystem MCP."""
    from pathlib import Path
    from app.config import settings

    base = Path(settings.UPLOAD_DIR) / current_user.id
    base.mkdir(parents=True, exist_ok=True)
    files = [{"name": f.name, "size": f.stat().st_size, "type": "file" if f.is_file() else "dir"}
             for f in base.iterdir()]
    return {"path": str(base), "files": files}
