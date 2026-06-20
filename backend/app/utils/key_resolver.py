# backend/app/utils/key_resolver.py
from app.utils.encryption import decrypt_api_key

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
    """Embeddings always use the OpenAI key (or Anthropic, depending on your setup)."""
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