
# backend/app/llm_client.py
from anthropic import Anthropic
from openai import OpenAI
from app.utils.key_resolver import get_anthropic_key, get_openai_key, get_embedding_key

def get_anthropic_client(user):
    """Return an Anthropic client using the user's own API key."""
    api_key = get_anthropic_key(user)
    return Anthropic(api_key=api_key)

def get_openai_client(user):
    """Return an OpenAI client using the user's own API key."""
    api_key = get_openai_key(user)
    return OpenAI(api_key=api_key)

def get_embedding_client(user):
    """Return an OpenAI client for embeddings."""
    api_key = get_embedding_key(user)
    return OpenAI(api_key=api_key)

def ask_claude(user, system_prompt, messages, max_tokens=1024, temperature=0.7):
    """Send a request to Claude using the user's key."""
    client = get_anthropic_client(user)
    return client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=messages
    )

def ask_openai(user, messages, max_tokens=1024, temperature=0.7):
    """Send a request to OpenAI GPT using the user's key."""
    client = get_openai_client(user)
    return client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages
    )

def create_embedding(user, text: str):
    """Create an embedding vector using the user's OpenAI key."""
    client = get_embedding_client(user)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000]
    )
    return response.data[0].embedding