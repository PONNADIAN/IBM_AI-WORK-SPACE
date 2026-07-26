"""
routers/chat.py
---------------
Chat endpoints:
  POST /api/chat/stream       — SSE streaming chat
  GET  /api/conversations     — list user's conversations
  POST /api/conversations     — create a new conversation
  GET  /api/conversations/{id}/messages — list messages
  PUT  /api/conversations/{id}   — rename/pin
  DELETE /api/conversations/{id} — delete
"""

import asyncio
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.base import ChatMessage as AIChatMessage
from app.ai.factory import get_ai_provider
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User

router = APIRouter(prefix="/api", tags=["Chat"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048


class ConversationOut(BaseModel):
    id: str
    title: str
    is_pinned: bool
    model_used: Optional[str]
    created_at: str
    updated_at: str
    message_count: int = 0

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


# ── Streaming Chat ─────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stream an AI response using Server-Sent Events.
    Creates/updates conversation automatically.
    """
    provider = get_ai_provider()

    # Get or create conversation
    if body.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == body.conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(
            user_id=current_user.id,
            title=body.message[:60] + "..." if len(body.message) > 60 else body.message,
            model_used=provider.__class__.__name__,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Fetch message history (last 20 messages for context)
    history = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .limit(20)
        .all()
    )
    history.reverse()
    ai_messages = [AIChatMessage(role=m.role, content=m.content) for m in history]
    ai_messages.append(AIChatMessage(role="user", content=body.message))

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    db.commit()

    conversation_id = conv.id

    async def event_generator():
        full_response = ""
        # Send conversation_id first
        yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"

        try:
            async for chunk in provider.chat_stream(
                ai_messages,
                system_prompt=body.system_prompt,
                temperature=body.temperature,
                max_tokens=body.max_tokens,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            # Save assistant response
            if full_response:
                assistant_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                )
                # Use a new session since we're in async context
                new_db = next(get_db())
                try:
                    new_db.add(assistant_msg)
                    new_db.commit()
                finally:
                    new_db.close()

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Conversation CRUD ──────────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    search: Optional[str] = Query(None),
    pinned_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_archived == False,  # noqa: E712
    )
    if search:
        query = query.filter(Conversation.title.ilike(f"%{search}%"))
    if pinned_only:
        query = query.filter(Conversation.is_pinned == True)  # noqa: E712

    convs = query.order_by(
        Conversation.is_pinned.desc(), Conversation.updated_at.desc()
    ).all()

    result = []
    for c in convs:
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        result.append(ConversationOut(
            id=c.id,
            title=c.title,
            is_pinned=c.is_pinned,
            model_used=c.model_used,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
            message_count=count,
        ))
    return result


@router.post("/conversations", response_model=ConversationOut, status_code=201)
def create_conversation(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = Conversation(
        user_id=current_user.id,
        title=body.get("title", "New Chat"),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationOut(
        id=conv.id, title=conv.title, is_pinned=conv.is_pinned,
        model_used=conv.model_used,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


@router.get("/conversations/{conv_id}/messages", response_model=List[MessageOut])
def get_messages(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at).all()
    return [MessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at.isoformat()) for m in messages]


@router.put("/conversations/{conv_id}")
def update_conversation(
    conv_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if "title" in body:
        conv.title = body["title"]
    if "is_pinned" in body:
        conv.is_pinned = body["is_pinned"]
    if "is_archived" in body:
        conv.is_archived = body["is_archived"]

    db.commit()
    return {"message": "Updated"}


@router.delete("/conversations/{conv_id}", status_code=204)
def delete_conversation(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
