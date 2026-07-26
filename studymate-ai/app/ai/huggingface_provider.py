"""
ai/huggingface_provider.py
--------------------------
Hugging Face provider using the OpenAI-compatible endpoint.
"""

import base64
from typing import AsyncIterator, List, Optional

from app.ai.base import BaseAIProvider, ChatMessage, ChatResponse
from app.config import settings


class HuggingFaceProvider(BaseAIProvider):
    def __init__(self):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(
                base_url=settings.AI_BASE_URL or "https://api-inference.huggingface.co/v1/",
                api_key=settings.HUGGINGFACE_API_KEY or "dummy-key"
            )
            self.model = settings.AI_MODEL
        except ImportError:
            raise RuntimeError("openai package not installed. Run: pip install openai")

    def _build_messages(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str],
    ) -> list:
        result = []
        if system_prompt:
            result.append({"role": "system", "content": system_prompt})
        for msg in messages:
            result.append({"role": msg.role, "content": msg.content})
        return result

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        built = self._build_messages(messages, system_prompt)
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=built,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        built = self._build_messages(messages, system_prompt)
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=built,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return ChatResponse(
            content=response.choices[0].message.content,
            model=response.model,
            prompt_tokens=response.usage.prompt_tokens if hasattr(response, 'usage') and response.usage else 0,
            completion_tokens=response.usage.completion_tokens if hasattr(response, 'usage') and response.usage else 0,
        )

    async def chat_with_image(
        self,
        text_prompt: str,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
    ) -> ChatResponse:
        # Note: Not all HF models support vision endpoints out of the box via the OpenAI spec,
        # but we'll try to pass it identically in case the model supports it.
        b64 = base64.b64encode(image_bytes).decode()
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": text_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{image_mime};base64,{b64}"},
                        },
                    ],
                }
            ],
            max_tokens=1024,
        )
        return ChatResponse(
            content=response.choices[0].message.content,
            model=response.model,
        )
