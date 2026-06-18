"""
OpenAI Embeddings Module for POLYNOUS (BYOK Version)
Uses text-embedding-3-small (1536 dimensions)
Each user provides their own OpenAI key.
"""

from openai import OpenAI
from app.utils.key_resolver import get_openai_key

MODEL = "text-embedding-3-small"

def _get_client(user):
    """Get OpenAI client using the user's own API key."""
    api_key = get_openai_key(user)
    return OpenAI(api_key=api_key)

def create_embedding(user, text: str) -> list:
    """
    Create embedding using the USER'S OpenAI key.
    
    Args:
        user: The authenticated User object (from database)
        text: Text to embed
    
    Returns:
        List of floats (embedding vector), or empty list on error
    """
    try:
        text = text[:8000]
        client = _get_client(user)
        response = client.embeddings.create(model=MODEL, input=text)
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

def create_query_embedding(user, query: str) -> list:
    """Create embedding for search queries using user's key."""
    return create_embedding(user, query)

def create_embeddings_batch(user, texts: list) -> list:
    """
    Create embeddings for multiple texts using user's key.
    
    Args:
        user: The authenticated User object
        texts: List of strings to embed
    
    Returns:
        List of embedding vectors
    """
    try:
        texts = [t[:8000] for t in texts]
        client = _get_client(user)
        response = client.embeddings.create(model=MODEL, input=texts)
        return [d.embedding for d in response.data]
    except Exception as e:
        print(f"Batch embedding error: {e}")
        return []