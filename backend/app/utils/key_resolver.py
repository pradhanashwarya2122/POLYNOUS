# backend/app/utils/key_resolver.py
import os
from cryptography.fernet import Fernet
from app.database import get_db
from app.models.user import User

def _get_fernet():
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY environment variable not set")
    return Fernet(key.encode())

def _decrypt(value: str) -> str:
    """Decrypt a value stored in the database."""
    return _get_fernet().decrypt(value.encode()).decode()

# ── LLM Providers (NO FALLBACK) ────────────────────────────
def get_anthropic_key(user: User) -> str:
    """
    Return the user's decrypted Anthropic API key.
    Raises ValueError if the user has not configured a key.
    """
    if not user or not user.anthropic_api_key:
        raise ValueError(
            "No Anthropic API key configured. Please add your key in Settings → API Keys."
        )
    return _decrypt(user.anthropic_api_key)

def get_openai_key(user: User) -> str:
    """
    Return the user's decrypted OpenAI API key.
    Raises ValueError if the user has not configured a key.
    """
    if not user or not user.openai_api_key:
        raise ValueError(
            "No OpenAI API key configured. Please add your key in Settings → API Keys."
        )
    return _decrypt(user.openai_api_key)

# ── Embedding Provider (OpenAI only – no Voyage) ──────────
def get_embedding_key(user: User) -> str:
    """
    Embeddings always use the user's OpenAI key.
    Raises ValueError if not set.
    """
    return get_openai_key(user)

# ── Search (Tavily) ───────────────────────────────────────
def get_tavily_key(user: User) -> str:
    """
    Return the user's decrypted Tavily API key.
    Raises ValueError if not configured.
    """
    if not user or not user.tavily_api_key:
        raise ValueError(
            "No Tavily API key configured. Please add your key in Settings → API Keys."
        )
    return _decrypt(user.tavily_api_key)