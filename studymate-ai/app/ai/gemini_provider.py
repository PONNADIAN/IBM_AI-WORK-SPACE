"""
ai/gemini_provider.py
---------------------
Google Gemini provider using google-generativeai SDK.
"""

from typing import AsyncIterator, List, Optional
import base64

from app.ai.base import BaseAIProvider, ChatMessage, ChatResponse
from app.config import settings


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.primary_model_name = settings.AI_MODEL or "gemini-3.1-flash-lite"
            self.fallback_models = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash"]
            self.model = genai.GenerativeModel(self.primary_model_name)
            self.vision_model = genai.GenerativeModel(self.primary_model_name)
            self._genai = genai
        except ImportError:
            raise RuntimeError(
                "google-generativeai package not installed. Run: pip install google-generativeai"
            )

    def _convert_messages(self, messages: List[ChatMessage], system_prompt: Optional[str]) -> list:
        history = []
        if system_prompt:
            history.append({"role": "user", "parts": [system_prompt]})
            history.append({"role": "model", "parts": ["Understood."]})
        for msg in messages:
            role = "model" if msg.role == "assistant" else "user"
            history.append({"role": role, "parts": [msg.content]})
        return history

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        history = self._convert_messages(messages[:-1], system_prompt)
        last_msg = messages[-1].content

        models_to_try = [self.primary_model_name] + [m for m in self.fallback_models if m != self.primary_model_name]
        last_exception = None

        for m_name in models_to_try:
            try:
                model_inst = self._genai.GenerativeModel(m_name)
                chat = model_inst.start_chat(history=history)
                response = await chat.send_message_async(last_msg, stream=True)
                async for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return  # Successfully finished stream
            except Exception as e:
                last_exception = e
                # Retry with fallback model if 503 high demand or 404/429
                continue

        if last_exception:
            raise last_exception

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        history = self._convert_messages(messages[:-1], system_prompt)
        last_msg = messages[-1].content

        models_to_try = [self.primary_model_name] + [m for m in self.fallback_models if m != self.primary_model_name]
        last_exception = None

        for m_name in models_to_try:
            try:
                model_inst = self._genai.GenerativeModel(m_name)
                chat = model_inst.start_chat(history=history)
                response = await chat.send_message_async(last_msg)
                return ChatResponse(content=response.text, model=m_name)
            except Exception as e:
                last_exception = e
                continue

        if last_exception:
            raise last_exception

    async def chat_with_image(
        self,
        text_prompt: str,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
    ) -> ChatResponse:
        import PIL.Image
        import io
        img = PIL.Image.open(io.BytesIO(image_bytes))
        models_to_try = [self.primary_model_name] + [m for m in self.fallback_models if m != self.primary_model_name]
        for m_name in models_to_try:
            try:
                v_model = self._genai.GenerativeModel(m_name)
                response = await v_model.generate_content_async([text_prompt, img])
                return ChatResponse(content=response.text, model=m_name)
            except Exception:
                continue
        raise RuntimeError("Failed to process vision query across all models.")
