# app/utils/fix_users.py
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.user import User

load_dotenv()

GLOBAL_KEY = os.getenv("ENCRYPTION_KEY")  # used only for re‑encrypting old keys

def add_missing_columns():
    """Ensure the new JSON columns exist (for SQLite and PostgreSQL)."""
    # Check if 'preferences' column exists; if not, add it.
    # We use raw SQL because Alembic isn't set up.
    try:
        with engine.connect() as conn:
            # For SQLite
            if 'sqlite' in str(engine.url):
                conn.execute(text("ALTER TABLE users ADD COLUMN preferences JSON"))
                conn.execute(text("ALTER TABLE users ADD COLUMN notifications JSON"))
                conn.execute(text("ALTER TABLE users ADD COLUMN integrations JSON"))
                conn.commit()
                print("✅ Added missing columns to SQLite")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSON"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSON"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS integrations JSON"))
                conn.commit()
                print("✅ Added missing columns (if not exists) to PostgreSQL")
    except Exception as e:
        # If columns already exist, an error is thrown – that’s okay
        if 'already exists' in str(e).lower() or 'duplicate column' in str(e).lower():
            print("ℹ️ Columns already exist")
        else:
            print(f"⚠️ Could not add columns: {e}")

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