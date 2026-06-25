# database.py — PostgreSQL preferred, SQLite fallback for local dev
from sqlalchemy import (
    create_engine,
    Column,
    String,
    DateTime,
    Text,
    Boolean,
    Integer,
    JSON,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session, relationship
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
# DATABASE URL – Safer fallback to local SQLite if unset
# ============================================================
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # A URL was provided – use it
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # Assume PostgreSQL (or compatible) – enable SSL and pooling
        engine = create_engine(
            DATABASE_URL,
            connect_args={"sslmode": "require"},
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
else:
    # No DATABASE_URL → fallback to local SQLite
    SQLITE_PATH = os.path.join(os.path.dirname(__file__), "polynous.db")
    DATABASE_URL = f"sqlite:///{SQLITE_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print("⚠️  No DATABASE_URL set, using local SQLite")

print(f"🗄️  Database URL (masked): {DATABASE_URL}")

# ============================================================
# SESSION FACTORY
# ============================================================
SessionLocal = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
    )
)
print("✅ Session factory created (scoped_session)")

# ============================================================
# DECLARATIVE BASE
# ============================================================
Base = declarative_base()

# ============================================================
# MERGED USER MODEL – All columns from both files
# ============================================================
class User(Base):
    __tablename__ = "users"

    # ── Primary Keys ──────────────────────────────
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    public_id = Column(String(36), unique=True, index=True, nullable=False)

    # ── Auth ───────────────────────────────────────
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=False, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)

    # ── OAuth ──────────────────────────────────────
    google_id = Column(String, nullable=True)
    github_id = Column(String, nullable=True)

    # ── Security ───────────────────────────────────
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, default=datetime.utcnow)
    encryption_key = Column(String(255), nullable=True)

    # ── BYOK – Encrypted with user's encryption_key ─
    anthropic_api_key = Column(Text, nullable=True)
    openai_api_key = Column(Text, nullable=True)
    tavily_api_key = Column(Text, nullable=True)
    voyage_api_key = Column(Text, nullable=True)

    # ── Pinecone / Neo4j BYO ───────────────────────
    pinecone_api_key_enc = Column(Text, nullable=True)
    pinecone_environment = Column(String, nullable=True)
    pinecone_index_name = Column(String, nullable=True)
    neo4j_uri = Column(String, nullable=True)
    neo4j_user = Column(String, nullable=True)
    neo4j_password_enc = Column(Text, nullable=True)

    # ── Preferences & Notifications ────────────────
    preferred_provider = Column(String(50), default="anthropic")
    preferences = Column(JSON, default=lambda: {
        "default_mode": "research",
        "response_style": "academic",
        "streaming_enabled": True,
        "auto_save": True,
        "confidence_threshold": 70,
    })
    notifications = Column(JSON, default=lambda: {
        "email": False,
        "research": True,
        "weekly": False,
        "rate_limit": True,
    })
    integrations = Column(JSON, default=lambda: {
        "google": {"connected": False},
        "github": {"connected": False},
        "notion": {"connected": False},
    })

    # ── Profile ────────────────────────────────────
    tier = Column(String(20), default="free")
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Relationships ──────────────────────────────
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


# ============================================================
# CONVERSATION & MESSAGE MODELS
# ============================================================
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    public_id = Column(String(36), unique=True, default=lambda: None)
    title = Column(String(200), default="New Research")
    mode = Column(String(20), default="research")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(String(10000))
    sources = Column(JSON, default=[])
    confidence = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


# ============================================================
# USER PREFERENCES (separate table)
# ============================================================
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
# HEALTH CHECK
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
    "Conversation",
    "Message",
    "UserPreferences",
    "init_db",
    "get_db",
    "check_database_connection",
    "DATABASE_URL",
    "IS_PRODUCTION",
]