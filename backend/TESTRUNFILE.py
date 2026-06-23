# test_key_storage.py
from app.database import SessionLocal, User
from app.utils.encryption import decrypt_api_key

db = SessionLocal()
try:
    # Replace with the email you used to log in
    user = db.query(User).filter(User.email == "your_email@example.com").first()
    if not user:
        print("❌ User not found")
    else:
        print(f"✅ User: {user.username} (ID: {user.public_id})")
        print(f"   Encryption key exists: {bool(user.encryption_key)}")
        print(f"   Anthropic key (encrypted): {user.anthropic_api_key[:20] if user.anthropic_api_key else 'None'}...")
        if user.anthropic_api_key and user.encryption_key:
            decrypted = decrypt_api_key(user.anthropic_api_key, user.encryption_key)
            if decrypted:
                print(f"   ✅ Decrypted key: {decrypted[:15]}...{decrypted[-10:]}")
            else:
                print("   ❌ Decryption failed")
        else:
            print("   ⚠️ No key stored or no encryption key")
finally:
    db.close()