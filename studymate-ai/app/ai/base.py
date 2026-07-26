"""
ai/base.py
----------
Abstract base class for all AI providers.
Concrete implementations must implement `chat_stream` and `chat`.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Optional
from dataclasses import dataclass


@dataclass
class ChatMessage:
    role: str    # "user" | "assistant" | "system"
    content: str


@dataclass
class ChatResponse:
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


class BaseAIProvider(ABC):
    """Abstract interface all AI providers must implement."""

    @abstractmethod
    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """
        Yields text chunks for streaming responses.
        Each chunk is a string fragment.
        """
        ...

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        """Returns a complete (non-streaming) chat response."""
        ...

    @abstractmethod
    async def chat_with_image(
        self,
        text_prompt: str,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
    ) -> ChatResponse:
        """Analyze an image with a text prompt (vision capability)."""
        ...
