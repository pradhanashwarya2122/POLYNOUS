from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    """Generate a cryptographically secure UUID"""
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    # Primary key — internal only, never exposed
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Public UUID — safe to share, used for API references
    public_id = Column(String(36), unique=True, index=True, nullable=False, default=generate_uuid)
    
    # Authentication
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=False, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Security
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, default=datetime.utcnow)
    encryption_key = Column(String(255), nullable=True)  # Encrypted personal encryption key
    
    # BYO API Keys (encrypted with user's personal key)
    anthropic_api_key = Column(String(500), nullable=True)
    openai_api_key = Column(String(500), nullable=True)
    tavily_api_key = Column(String(500), nullable=True)
    voyage_api_key = Column(String(500), nullable=True)
    google_api_key = Column(String(500), nullable=True)
    mistral_api_key = Column(String(500), nullable=True)
    groq_api_key = Column(String(500), nullable=True)
    nvidia_api_key = Column(String(500), nullable=True)
    deepseek_api_key = Column(String(500), nullable=True)
    preferred_provider = Column(String(50), default="anthropic")
    
    # Profile
    tier = Column(String(20), default="free")
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    
    # Preferences & Notifications (stored as JSON)
    preferences = Column(JSON, default=lambda: {
        "default_mode": "research",
        "response_style": "academic",
        "streaming_enabled": True,
        "auto_save": True,
        "confidence_threshold": 70
    })
    notifications = Column(JSON, default=lambda: {
        "email": False,
        "research": True,
        "weekly": False,
        "rate_limit": True
    })
    integrations = Column(JSON, default=lambda: {
        "google": {"connected": False},
        "github": {"connected": False},
        "notion": {"connected": False}
    })
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    public_id = Column(String(36), unique=True, default=generate_uuid)
    title = Column(String(200), default="New Research")
    mode = Column(String(20), default="research")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(String(10000))
    sources = Column(JSON, default=[])
    confidence = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")