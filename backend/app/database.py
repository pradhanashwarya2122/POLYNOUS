# database.py — PostgreSQL ONLY, no SQLite fallback
from sqlalchemy import (
    create_engine,
    Column,
    String,
    DateTime,
    Text,
    Boolean,
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
import os
import sys
import re
from datetime import datetime

# ============================================================
# ENVIRONMENT DETECTION
# ============================================================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

print(f"🌍 Environment: {ENVIRONMENT}")
print(f"🏭 Production mode: {IS_PRODUCTION}")

# ============================================================
# DATABASE URL – PostgreSQL REQUIRED
# ============================================================
raw_url = os.getenv("DATABASE_URL", "")
if not raw_url:
    print("=" * 60)
    print("❌ FATAL: DATABASE_URL is not set! PostgreSQL is required.")
    print("=" * 60)
    if IS_PRODUCTION:
        print("   On Railway:")
        print("   1. Add a PostgreSQL service")
        print("   2. DATABASE_URL will be injected automatically")
        print("   3. Or set it manually in Variables tab")
    else:
        print("   For local development, set DATABASE_URL to your PostgreSQL instance.")
    sys.exit(1)

# Fix scheme: Railway may give postgres://, but SQLAlchemy wants postgresql://
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)
    print("🔧 Fixed URL scheme: postgres:// → postgresql://")
elif not raw_url.startswith("postgresql://"):
    print("=" * 60)
    print(f"❌ Unsupported database scheme: {raw_url.split('://')[0]}")
    print("   Only PostgreSQL is allowed (postgresql://) ")
    print("=" * 60)
    sys.exit(1)

DATABASE_URL = raw_url
print(f"🗄️  PostgreSQL database: {re.sub(r'://[^:]+:[^@]+@', r'://****:****@', DATABASE_URL)}")

# ============================================================
# ENGINE – Optimised for PostgreSQL
# ============================================================
connect_args = {}
if IS_PRODUCTION:
    connect_args["sslmode"] = "require"
    print("🔒 SSL mode: require (production)")
else:
    # In development you might want to allow plain connections
    connect_args["sslmode"] = "prefer"

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,          # Survives idle connection drops
    pool_recycle=3600,           # Recycle connections hourly
    pool_timeout=30,             # Wait max 30s for a connection
    connect_args=connect_args,
    echo=False,                  # Set to True for SQL debug logging
)

print("⚙️  Database engine configured:")
print("   • pool_size: 5")
print("   • max_overflow: 10")
print("   • pool_pre_ping: True")
print("   • pool_recycle: 3600s")
print("   • pool_timeout: 30s")

# ============================================================
# SESSION FACTORY – Thread‑safe scoped session
# ============================================================
SessionLocal = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,  # Keep objects usable after commit
    )
)

print("✅ Session factory created (scoped_session)")

# ============================================================
# DECLARATIVE BASE & MODELS
# ============================================================
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    github_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # BYOK fields (encrypted)
    anthropic_api_key_enc = Column(Text, nullable=True)
    openai_api_key_enc = Column(Text, nullable=True)
    pinecone_api_key_enc = Column(Text, nullable=True)
    pinecone_environment = Column(String, nullable=True)
    pinecone_index_name = Column(String, nullable=True)
    tavily_api_key_enc = Column(Text, nullable=True)
    neo4j_uri = Column(String, nullable=True)
    neo4j_user = Column(String, nullable=True)
    neo4j_password_enc = Column(Text, nullable=True)

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    user_id = Column(String, primary_key=True)
    theme = Column(String, default="dark")
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)
    research_depth = Column(String, default="standard")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# DATABASE INITIALIZATION
# ============================================================
def init_db():
    """
    Create all tables. Safe to call multiple times – create_all() is idempotent.
    """
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified!")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if IS_PRODUCTION:
            raise
        else:
            print("⚠️  Continuing without database – some features may not work")

# ============================================================
# DEPENDENCY INJECTION for FastAPI
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        SessionLocal.remove()

# ============================================================
# HEALTH CHECK utility
# ============================================================
def check_database_connection():
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return True, "Database connection OK"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"

# ============================================================
# EXPORTS
# ============================================================
__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "User",
    "UserPreferences",
    "init_db",
    "get_db",
    "check_database_connection",
    "DATABASE_URL",
    "IS_PRODUCTION",
]