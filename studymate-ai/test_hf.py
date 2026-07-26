import asyncio
from app.config import settings
from app.ai.factory import get_ai_provider
from app.ai.base import ChatMessage

async def main():
    print(f"Testing {settings.AI_PROVIDER} provider with model {settings.AI_MODEL}...")
    provider = get_ai_provider()
    
    messages = [ChatMessage(role="user", content="Hello! Are you working?")]
    
    try:
        print("Testing streaming...")
        async for chunk in provider.chat_stream(messages):
            print(chunk, end="", flush=True)
        print("\n\nSuccess!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nError: {e}")

if __name__ == "__main__":
    asyncio.run(main())
