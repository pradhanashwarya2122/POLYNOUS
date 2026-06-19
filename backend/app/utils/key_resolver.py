# backend/app/utils/key_resolver.py
import os
from app.utils.encryption import decrypt_api_key

def get_anthropic_key(user):
    if user and user.anthropic_api_key:
        decrypted = decrypt_api_key(user.anthropic_api_key, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError("No Anthropic API key configured. Please add your key in Settings → API Keys.")

def get_openai_key(user):
    if user and user.openai_api_key:
        decrypted = decrypt_api_key(user.openai_api_key, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError("No OpenAI API key configured. Please add your key in Settings → API Keys.")

def get_embedding_key(user):
    return get_openai_key(user)

def get_tavily_key(user):
    if user and user.tavily_api_key:
        decrypted = decrypt_api_key(user.tavily_api_key, user.encryption_key)
        if decrypted:
            return decrypted
    raise ValueError("No Tavily API key configured. Please add your key in Settings → API Keys.")