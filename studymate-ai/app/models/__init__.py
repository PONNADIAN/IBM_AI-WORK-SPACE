"""
models/__init__.py
------------------
Export all ORM models so they are registered with SQLAlchemy Base
before create_all() is called.
"""
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.prompt import SavedPrompt
from app.models.mcp_connection import UserMCPConnection

__all__ = ["User", "Conversation", "Message", "Document", "SavedPrompt", "UserMCPConnection"]
