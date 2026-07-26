import asyncio
import google.generativeai as genai
from app.config import settings

async def main():
    models_to_test = [
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.1-pro-preview",
        "gemini-3.5-flash"
    ]
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    
    for m in models_to_test:
        print(f"\n--- Testing model: {m} ---")
        try:
            model = genai.GenerativeModel(m)
            chat = model.start_chat()
            response = await chat.send_message_async("Hello! Reply in 3 words.", stream=True)
            async for chunk in response:
                print(chunk.text, end="", flush=True)
            print("\n✅ SUCCESS!")
        except Exception as e:
            print(f"\n❌ FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
