# app/utils/fix_users.py
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.user import User

load_dotenv()

# Global fallback key used to re‑encrypt old keys that were stored with the system key
GLOBAL_KEY = os.getenv("ENCRYPTION_KEY")

def add_missing_columns():
    """Ensure the new JSON columns exist (for SQLite and PostgreSQL)."""
    json_cols = ["preferences", "notifications", "integrations"]
    text_cols = ["google_api_key", "mistral_api_key", "groq_api_key", "nvidia_api_key", "deepseek_api_key"]
    is_sqlite = 'sqlite' in str(engine.url)
    added = 0
    for col, coltype in [(c, "JSON") for c in json_cols] + [(c, "TEXT") for c in text_cols]:
        try:
            with engine.connect() as conn:
                if is_sqlite:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {coltype}"))
                else:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {coltype}"))
                conn.commit()
                added += 1
        except Exception as e:
            if 'already exists' in str(e).lower() or 'duplicate column' in str(e).lower():
                continue
            print(f"⚠️ Could not add column {col}: {e}")
    if added:
        print(f"✅ Added {added} missing user columns")
    else:
        print("ℹ️ All user columns already exist")

def add_missing_encryption_keys():
    """Generate a personal encryption key for users who don't have one."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.encryption_key == None).all()
        if not users:
            print("✅ All users have personal encryption keys")
            return
        for user in users:
            new_key = Fernet.generate_key().decode()
            old_fernet = Fernet(GLOBAL_KEY.encode()) if GLOBAL_KEY else None
            new_fernet = Fernet(new_key.encode())

            # Re‑encrypt stored API keys if they exist
            for provider in ["anthropic", "openai", "tavily", "voyage"]:
                encrypted_value = getattr(user, f"{provider}_api_key", None)
                if encrypted_value:
                    try:
                        decrypted = old_fernet.decrypt(encrypted_value.encode()).decode()
                        setattr(user, f"{provider}_api_key", new_fernet.encrypt(decrypted.encode()).decode())
                        print(f"   ✅ Re‑encrypted {provider} key for {user.email}")
                    except Exception:
                        setattr(user, f"{provider}_api_key", None)
                        print(f"   ⚠️  Could not migrate {provider} key for {user.email} – cleared")
            user.encryption_key = new_key
            print(f"🔑 Generated encryption key for {user.email}")
        db.commit()
        print(f"✅ Fixed {len(users)} user(s)")
    except Exception as e:
        print(f"❌ Error fixing users: {e}")
        db.rollback()
    finally:
        db.close()