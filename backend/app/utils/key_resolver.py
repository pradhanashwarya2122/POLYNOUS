# backend/app/utils/key_resolver.py
import os
from app.utils.encryption import decrypt_api_key


def _get_decrypted_key(user, provider_attr):
    """
    Decrypt a user's stored API key for the given provider attribute.
    Returns the decrypted key if available, otherwise raises ValueError.
    """
    if not user:
        raise ValueError("No user provided – cannot retrieve API key")

    encrypted = getattr(user, provider_attr, None)
    if not encrypted:
        raise ValueError(
            f"No {provider_attr.replace('_api_key','').upper()} API key configured. "
            "Please add your key in Settings → API Keys."
        )

    decrypted = decrypt_api_key(encrypted, user.encryption_key)
    if not decrypted:
        raise ValueError(
            f"Failed to decrypt {provider_attr.replace('_api_key','').upper()} API key. "
            "Please re‑enter your key in Settings → API Keys."
        )

    return decrypted


# ── Individual Key Getters ────────────────────────────────

def get_anthropic_key(user):
    """Return the user's Anthropic API key (raises ValueError if missing)."""
    return _get_decrypted_key(user, "anthropic_api_key_enc")


def get_openai_key(user):
    """Return the user's OpenAI API key (raises ValueError if missing)."""
    return _get_decrypted_key(user, "openai_api_key_enc")


def get_tavily_key(user):
    """
    Return the user's Tavily API key if available, otherwise fall back
    to the TAVILY_API_KEY environment variable.
    """
    try:
        return _get_decrypted_key(user, "tavily_api_key_enc")
    except ValueError:
        return os.getenv("TAVILY_API_KEY")


def get_embedding_key(user):
    """Embeddings always use the OpenAI key."""
    return get_openai_key(user)


def get_pinecone_key(user):
    """Return the user's Pinecone API key (raises ValueError if missing)."""
    return _get_decrypted_key(user, "pinecone_api_key_enc")


# ── Convenience Helper ────────────────────────────────────

def get_user_provider_and_key(user):
    """
    Returns (provider, api_key) for the user.
    - provider: 'anthropic' or 'openai' (based on user.preferred_provider)
    - api_key: decrypted API key string, or None if not configured
    """
    if user is None:
        return "anthropic", None

    provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'

    try:
        if provider == 'openai':
            api_key = get_openai_key(user)
        else:
            api_key = get_anthropic_key(user)
        return provider, api_key
    except ValueError:
        return provider, None