# backend/app/llm_client.py
"""
Centralised LLM client factory – every function resolves the user's own API key
via the key resolver. No hardcoded keys, no environment-variable fallbacks.
"""

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
    """Return an OpenAI client for embeddings (same key as OpenAI)."""
    api_key = get_embedding_key(user)
    return OpenAI(api_key=api_key)


def ask_claude(user, system_prompt: str, messages: list, max_tokens=1024, temperature=0.7):
    """
    Send a request to Claude using the user's own Anthropic key.
    `system_prompt` is passed as the top-level `system` parameter.
    """
    client = get_anthropic_client(user)
    return client.messages.create(
        model="claude-haiku-4-5",   # ← FIXED: valid model name
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=messages,
    )


def ask_openai(user, messages: list, max_tokens=1024, temperature=0.7):
    """
    Send a request to OpenAI GPT using the user's own OpenAI key.
    Returns only the text content of the first choice.
    """
    client = get_openai_client(user)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages,
    )
    # ← FIXED: return just the text, not the whole object
    return response.choices[0].message.content


def ask_llm(user, provider, system_prompt=None, messages=None, max_tokens=1024, temperature=0.7):
    """
    Unified helper that routes to the correct provider.
    `provider` should be either 'anthropic' (default) or 'openai'.
    """
    if provider == "openai":
        msgs = [{"role": "system", "content": system_prompt}] + (messages or [])
        return ask_openai(user, msgs, max_tokens, temperature)
    else:
        return ask_claude(user, system_prompt, messages or [], max_tokens, temperature)


def create_embedding(user, text: str) -> list:
    """
    Create an embedding vector using the user's OpenAI key.
    Returns a list of floats.
    """
    client = get_embedding_client(user)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000]  # Truncate for performance
    )
    return response.data[0].embedding