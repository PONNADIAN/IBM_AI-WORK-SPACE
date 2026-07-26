import google.generativeai as genai
from app.config import settings

def main():
    print("Listing models...")
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    try:
        for model in genai.list_models():
            print(f"Name: {model.name}")
            print(f"Supported generation methods: {model.supported_generation_methods}")
            print(f"Description: {model.description}")
            print("-" * 40)
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    main()
