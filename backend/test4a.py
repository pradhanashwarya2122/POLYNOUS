import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")

if not api_key:
    print("❌ Error: ANTHROPIC_API_KEY not found")
else:
    print("  Testing Haiku 4.5...")
    
    try:
        client = Anthropic(api_key=api_key)
        
        # Try Haiku 4.5 (the current version)
        message = client.messages.create(
            model="claude-haiku-4-5",  # Current Haiku version
            max_tokens=100,
            messages=[{"role": "user", "content": "Say 'Haiku 4.5 is working!'"}]
        )
        
        print("✅ SUCCESS with Haiku 4.5!")
        print(f"   Response: {message.content[0].text}")
        
    except Exception as e:
        print(f"❌ Haiku 4.5 failed: {e}")
        
        # Try alternative model names
        print("\n🔄 Trying alternative model names...")
        
        alternatives = [
            "claude-haiku-4-5",           # Short name
            "claude-3-5-haiku-20241022",  # Haiku 3.5 (may still work)
            "claude-sonnet-4-6",          # Sonnet as fallback
        ]
        
        for model in alternatives:
            try:
                message = client.messages.create(
                    model=model,
                    max_tokens=50,
                    messages=[{"role": "user", "content": "Say 'OK'"}]
                )
                print(f"✅ Working model found: {model}")
                print(f"   Response: {message.content[0].text}")
                break
            except Exception as alt_e:
                print(f"❌ {model} failed: {alt_e}")