# backend/app/llm_client.py
from anthropic import Anthropic
from openai import OpenAI
from app.utils.key_resolver import get_anthropic_key, get_openai_key, get_embedding_key

def get_anthropic_client(user):
    api_key = get_anthropic_key(user)
    return Anthropic(api_key=api_key)

def get_openai_client(user):
    api_key = get_openai_key(user)
    return OpenAI(api_key=api_key)

def get_embedding_client(user):
    api_key = get_embedding_key(user)
    return OpenAI(api_key=api_key)

def ask_claude(user, system_prompt: str, messages: list, max_tokens=1024, temperature=0.7):
    client = get_anthropic_client(user)
    response = client.messages.create(
        model="claude-haiku-4-5",   # ✅ valid model
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=messages,
    )
    # ✅ return only the text string
    return response.content[0].text

def ask_openai(user, messages: list, max_tokens=1024, temperature=0.7):
    client = get_openai_client(user)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages,
    )
    # ✅ return only the text string
    return response.choices[0].message.content

def ask_llm(user, provider, system_prompt=None, messages=None, max_tokens=1024, temperature=0.7):
    if provider == "openai":
        msgs = [{"role": "system", "content": system_prompt}] + (messages or [])
        return ask_openai(user, msgs, max_tokens, temperature)
    else:
        return ask_claude(user, system_prompt, messages or [], max_tokens, temperature)

def create_embedding(user, text: str) -> list:
    key = get_embedding_key(user)
    if not key:
        print("⚠️  No embedding API key – skipping")
        return []
    try:
        client = OpenAI(api_key=key)
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000]
        )
        return resp.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return []