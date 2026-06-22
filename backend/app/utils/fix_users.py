# app/utils/fix_users.py
from cryptography.fernet import Fernet
from app.database import SessionLocal
from app.models.user import User

def add_missing_encryption_keys():
    """Generate an encryption key for any user that doesn't have one."""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.encryption_key == None).all()
        if not users:
            print("✅ All users have encryption keys")
            return
        for user in users:
            user.encryption_key = Fernet.generate_key().decode()
            print(f"🔑 Generated encryption key for user {user.email}")
        db.commit()
        print(f"✅ Fixed {len(users)} user(s)")
    except Exception as e:
        print(f"❌ Error fixing users: {e}")
        db.rollback()
    finally:
        db.close()