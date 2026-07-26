"""
ai/factory.py
-------------
Returns the configured AI provider based on the AI_PROVIDER env var.
Also provides a singleton getter for use throughout the app.
"""

from functools import lru_cache
from app.config import settings
from app.ai.base import BaseAIProvider


@lru_cache(maxsize=1)
def get_ai_provider() -> BaseAIProvider:
    """
    Returns the AI provider singleton.
    Switch provider by setting AI_PROVIDER in .env:
      AI_PROVIDER=openai  → OpenAIProvider
      AI_PROVIDER=anthropic → AnthropicProvider
      AI_PROVIDER=gemini  → GeminiProvider
    """
    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            # Return a mock provider for demo without API key
            return MockAIProvider()
        from app.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()

    elif provider == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            return MockAIProvider()
        from app.ai.anthropic_provider import AnthropicProvider
        return AnthropicProvider()

    elif provider == "gemini":
        if not settings.GOOGLE_API_KEY:
            return MockAIProvider()
        from app.ai.gemini_provider import GeminiProvider
        return GeminiProvider()

    else:
        return MockAIProvider()


class MockAIProvider(BaseAIProvider):
    """
    Mock provider used when no API key is configured.
    Returns helpful demo responses.
    """

    async def chat_stream(self, messages, system_prompt=None, temperature=0.7, max_tokens=2048):
        demo_msg = (
            "⚠️ **Demo Mode** — No API key configured.\n\n"
            "To get real AI responses:\n"
            "1. Add `OPENAI_API_KEY=your-key` to your `.env` file\n"
            "2. Restart the backend server\n\n"
            "Your message was: **" + (messages[-1].content if messages else "...") + "**"
        )
        # Stream it word by word for the typing effect
        for word in demo_msg.split(" "):
            yield word + " "

    async def chat(self, messages, system_prompt=None, temperature=0.7, max_tokens=2048):
        from app.ai.base import ChatResponse
        return ChatResponse(
            content="Demo mode — please add an API key to your .env file.",
            model="demo",
        )

    async def chat_with_image(self, text_prompt, image_bytes, image_mime="image/jpeg"):
        from app.ai.base import ChatResponse
        return ChatResponse(
            content="🖼️ Image received! Demo mode — add OPENAI_API_KEY for real vision analysis.",
            model="demo",
        )
