# backend/app/utils/key_resolver.py
from app.utils.encryption import decrypt_api_key

# ── Individual Key Getters (raises ValueError if missing) ──

def get_anthropic_key(user):
    """
    Decrypt and return the user's personal Anthropic API key.
    Raises ValueError if no key is configured.
    """
    if not user:
        raise ValueError("No user provided – cannot retrieve API key")
    encrypted = getattr(user, 'anthropic_api_key_enc', None)
    if encrypted:
        decrypted = decrypt_api_key(encrypted, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError(
        "No Anthropic API key configured. Please add your key in Settings → API Keys."
    )

def get_openai_key(user):
    """
    Decrypt and return the user's personal OpenAI API key.
    Raises ValueError if no key is configured.
    """
    if not user:
        raise ValueError("No user provided – cannot retrieve API key")
    encrypted = getattr(user, 'openai_api_key_enc', None)
    if encrypted:
        decrypted = decrypt_api_key(encrypted, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError(
        "No OpenAI API key configured. Please add your key in Settings → API Keys."
    )

def get_embedding_key(user):
    """Embeddings always use the OpenAI key."""
    return get_openai_key(user)

def get_tavily_key(user):
    """
    Decrypt and return the user's personal Tavily API key.
    Raises ValueError if no key is configured.
    """
    if not user:
        raise ValueError("No user provided – cannot retrieve API key")
    encrypted = getattr(user, 'tavily_api_key_enc', None)
    if encrypted:
        decrypted = decrypt_api_key(encrypted, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError(
        "No Tavily API key configured. Please add your key in Settings → API Keys."
    )

def get_pinecone_key(user):
    """
    Decrypt and return the user's personal Pinecone API key.
    Raises ValueError if no key is configured.
    """
    if not user:
        raise ValueError("No user provided – cannot retrieve API key")
    encrypted = getattr(user, 'pinecone_api_key_enc', None)
    if encrypted:
        decrypted = decrypt_api_key(encrypted, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError(
        "No Pinecone API key configured. Please add your key in Settings → API Keys."
    )

# ── Convenience Helper ────────────────────────────────────

def get_user_provider_and_key(user):
    """
    Returns (provider, api_key) for the user.
    - provider defaults to 'anthropic' and can be overridden by user.preferred_provider.
    - api_key is decrypted from the user's encrypted key field; returns None if missing or decryption fails.
    """
    if user is None:
        return "anthropic", None

    provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
    encrypted = getattr(user, f'{provider}_api_key_enc', None)  # note: field uses _enc suffix
    api_key = None
    if encrypted:
        try:
            api_key = decrypt_api_key(encrypted, user.encryption_key)
        except Exception:
            api_key = None
    return provider, api_key