"""
ai/anthropic_provider.py
------------------------
Anthropic Claude provider.
"""

from typing import AsyncIterator, List, Optional
import base64

from app.ai.base import BaseAIProvider, ChatMessage, ChatResponse
from app.config import settings


class AnthropicProvider(BaseAIProvider):
    def __init__(self):
        try:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.AI_MODEL or "claude-3-5-sonnet-20240620"
        except ImportError:
            raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    def _build_messages(self, messages: List[ChatMessage]) -> list:
        return [{"role": m.role, "content": m.content} for m in messages]

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        kwargs = dict(
            model=self.model,
            messages=self._build_messages(messages),
            max_tokens=max_tokens,
        )
        if system_prompt:
            kwargs["system"] = system_prompt
        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        kwargs = dict(
            model=self.model,
            messages=self._build_messages(messages),
            max_tokens=max_tokens,
        )
        if system_prompt:
            kwargs["system"] = system_prompt
        response = await self.client.messages.create(**kwargs)
        return ChatResponse(
            content=response.content[0].text,
            model=response.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
        )

    async def chat_with_image(
        self,
        text_prompt: str,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
    ) -> ChatResponse:
        b64 = base64.b64encode(image_bytes).decode()
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": image_mime, "data": b64}},
                    {"type": "text", "text": text_prompt},
                ],
            }],
        )
        return ChatResponse(content=response.content[0].text, model=response.model)
