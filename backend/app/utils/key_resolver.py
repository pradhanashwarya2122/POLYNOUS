# backend/app/utils/key_resolver.py
"""
Key resolver that decrypts the user's stored API keys using their
personal encryption key. No fallback to global keys.
"""
import os
from app.utils.encryption import decrypt_api_key


def get_anthropic_key(user):
    """Return decrypted Anthropic key for the given user."""
    if user and user.anthropic_api_key:
        decrypted = decrypt_api_key(
            user.anthropic_api_key,
            user.encryption_key       # ← user‑specific key
        )
        if decrypted:
            return decrypted
    # If user has no key, raise an error (no fallback to system key)
    raise ValueError(
        "No Anthropic API key configured. "
        "Please add your key in Settings → API Keys."
    )


def get_openai_key(user):
    """Return decrypted OpenAI key for the given user."""
    if user and user.openai_api_key:
        decrypted = decrypt_api_key(
            user.openai_api_key,
            user.encryption_key
        )
        if decrypted:
            return decrypted
    raise ValueError(
        "No OpenAI API key configured. "
        "Please add your key in Settings → API Keys."
    )


def get_embedding_key(user):
    """Embeddings always use the user's OpenAI key."""
    return get_openai_key(user)


def get_tavily_key(user):
    """Return decrypted Tavily key for the given user."""
    if user and user.tavily_api_key:
        decrypted = decrypt_api_key(
            user.tavily_api_key,
            user.encryption_key
        )
        if decrypted:
            return decrypted
    raise ValueError(
        "No Tavily API key configured. "
        "Please add your key in Settings → API Keys."
    )