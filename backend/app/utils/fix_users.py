# app/utils/fix_users.py
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.user import User

load_dotenv()

# The global fallback key used before user-specific keys existed
GLOBAL_KEY = os.getenv("ENCRYPTION_KEY")  # this must be exactly the one that was used originally

def add_missing_encryption_keys():
    """
    1. Generate a personal encryption key for users who don't have one.
    2. If they have stored API keys, re‑encrypt them with the new personal key.
    """
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.encryption_key == None).all()
        if not users:
            print("✅ All users have personal encryption keys")
            return

        for user in users:
            # Generate a fresh key for the user
            new_key = Fernet.generate_key().decode()
            old_fernet = Fernet(GLOBAL_KEY.encode()) if GLOBAL_KEY else None
            new_fernet = Fernet(new_key.encode())

            # Re‑encrypt API keys that were stored with the old global key
            for provider in ["anthropic", "openai", "tavily", "voyage"]:
                encrypted_value = getattr(user, f"{provider}_api_key", None)
                if encrypted_value:
                    try:
                        # Decrypt with old global key
                        old_fernet = old_fernet or new_fernet  # fallback if GLOBAL_KEY missing
                        decrypted = old_fernet.decrypt(encrypted_value.encode()).decode()
                        # Re‑encrypt with new user key
                        setattr(user, f"{provider}_api_key", new_fernet.encrypt(decrypted.encode()).decode())
                        print(f"   ✅ Re‑encrypted {provider} key for {user.email}")
                    except Exception:
                        # Could not decrypt → clear the key (user must re‑enter)
                        setattr(user, f"{provider}_api_key", None)
                        print(f"   ⚠️  Could not migrate {provider} key for {user.email} – cleared")

            user.encryption_key = new_key
            print(f"🔑 Generated encryption key for user {user.email}")

        db.commit()
        print(f"✅ Fixed {len(users)} user(s)")
    except Exception as e:
        print(f"❌ Error fixing users: {e}")
        db.rollback()
    finally:
        db.close()