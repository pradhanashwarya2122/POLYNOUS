# app/utils/fix_users.py
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.user import User

load_dotenv()

# The global fallback key that was used before user-specific keys existed
GLOBAL_KEY = os.getenv("ENCRYPTION_KEY")

def ensure_user_encryption_keys():
    """
    1. Generate a personal encryption key for any user who doesn't have one.
    2. For ALL users who have stored API keys, try to re‑encrypt them with
       the user's personal key (handles keys that were originally encrypted
       with the global key).
    """
    db = SessionLocal()
    try:
        users = db.query(User).all()
        fixed = 0

        for user in users:
            # Step 1: generate missing encryption key
            if not user.encryption_key:
                user.encryption_key = Fernet.generate_key().decode()
                print(f"🔑 Generated new encryption key for {user.email}")
                db.flush()  # make sure the new key is available for re‑encryption

            # Step 2: re‑encrypt any stored API keys that might be using the global key
            re_encrypted = False
            for provider in ["anthropic", "openai", "tavily", "voyage"]:
                encrypted_value = getattr(user, f"{provider}_api_key", None)
                if not encrypted_value:
                    continue

                # Try to decrypt with the user's current personal key
                try:
                    user_fernet = Fernet(user.encryption_key.encode())
                    user_fernet.decrypt(encrypted_value.encode())  # just test
                    # Already encrypted with user's own key – nothing to do
                except Exception:
                    # Could not decrypt with user's key → try global key
                    if not GLOBAL_KEY:
                        print(f"   ⚠️  Cannot migrate {provider} key for {user.email} – global key missing")
                        continue
                    try:
                        global_fernet = Fernet(GLOBAL_KEY.encode())
                        decrypted = global_fernet.decrypt(encrypted_value.encode()).decode()
                        # Re‑encrypt with user's personal key
                        setattr(user, f"{provider}_api_key",
                                user_fernet.encrypt(decrypted.encode()).decode())
                        re_encrypted = True
                        print(f"   ✅ Re‑encrypted {provider} key for {user.email}")
                    except Exception as e:
                        # Completely unreadable – clear the key so user re‑enters it
                        setattr(user, f"{provider}_api_key", None)
                        print(f"   ⚠️  Could not migrate {provider} key for {user.email} – cleared ({e})")

            if re_encrypted:
                fixed += 1

        db.commit()
        if fixed:
            print(f"✅ Re‑encrypted stored API keys for {fixed} user(s)")
        else:
            print("✅ All API keys are already using user‑specific encryption")
    except Exception as e:
        print(f"❌ Error fixing users: {e}")
        db.rollback()
    finally:
        db.close()