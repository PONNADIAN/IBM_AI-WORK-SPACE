import asyncio
# pyrefly: ignore [missing-import]
import google.generativeai as genai
from app.config import settings

async def main():
    print("Testing gemini-3.5-flash...")
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-3.5-flash')
    
    chat = model.start_chat()
    response = await chat.send_message_async("Hello! Are you working?", stream=True)
    async for chunk in response:
        print(chunk.text, end="", flush=True)
    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())
