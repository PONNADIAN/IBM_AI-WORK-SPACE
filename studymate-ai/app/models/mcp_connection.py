"""
app/models/mcp_connection.py
----------------------------
Per-user MCP connection records.
Tokens are stored AES-256-GCM encrypted.
NEVER plaintext. NEVER in .env.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class UserMCPConnection(Base):
    __tablename__ = "user_mcp_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Which MCP provider: github | gdrive | slack | notion | postgres | filesystem | browser
    provider = Column(String(50), nullable=False, index=True)

    # OAuth tokens — always encrypted, never plaintext
    access_token_enc  = Column(Text, nullable=True)   # AES-256-GCM encrypted
    refresh_token_enc = Column(Text, nullable=True)
    expires_at        = Column(DateTime, nullable=True)
    scope             = Column(String(500), nullable=True)

    # Postgres-specific credential fields (all encrypted)
    pg_host     = Column(Text, nullable=True)   # encrypted
    pg_port     = Column(Text, nullable=True)   # encrypted
    pg_database = Column(Text, nullable=True)   # encrypted
    pg_username = Column(Text, nullable=True)   # encrypted
    pg_password = Column(Text, nullable=True)   # encrypted
    pg_ssl      = Column(Boolean, default=False)

    # connected | disconnected | error | expired
    status     = Column(String(20), nullable=False, default="disconnected")
    last_sync  = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship back to User
    user = relationship("User", back_populates="mcp_connections")
