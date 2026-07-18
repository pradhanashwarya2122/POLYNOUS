"""
app/llm_providers.py — single source of truth for supported LLM providers.

Anthropic uses its native SDK; every other provider speaks the
OpenAI-compatible protocol, so they all route through the OpenAI client
with a per-provider base_url — no extra SDK dependencies.
"""

LLM_PROVIDERS = ("anthropic", "openai", "google", "mistral", "groq")
ALL_KEY_PROVIDERS = LLM_PROVIDERS + ("tavily", "voyage")

# OpenAI-compatible endpoints for non-OpenAI providers
OPENAI_COMPATIBLE_BASE_URLS = {
    "google":  "https://generativelanguage.googleapis.com/v1beta/openai/",
    "mistral": "https://api.mistral.ai/v1",
    "groq":    "https://api.groq.com/openai/v1",
}

DEFAULT_MODELS = {
    "anthropic": "claude-haiku-4-5",
    "openai":    "gpt-4o-mini",
    "google":    "gemini-2.5-flash",
    "mistral":   "mistral-small-latest",
    "groq":      "llama-3.3-70b-versatile",
}

# Key-format prefixes for quick client-side-style validation
KEY_PREFIXES = {
    "anthropic": "sk-ant",
    "openai":    "sk-",
    "google":    "AIza",
    "groq":      "gsk_",
    "mistral":   None,     # Mistral keys have no fixed prefix
    "tavily":    "tvly-",
    "voyage":    None,
}


def resolve_provider(provider: str):
    """
    Returns (client_type, base_url):
      * ("anthropic", None) for Anthropic's native SDK
      * ("openai", base_url_or_None) for everything OpenAI-compatible
    """
    if provider == "anthropic":
        return "anthropic", None
    return "openai", OPENAI_COMPATIBLE_BASE_URLS.get(provider)


def default_model(provider: str) -> str:
    return DEFAULT_MODELS.get(provider, DEFAULT_MODELS["anthropic"])


def resolve_model(user, provider: str) -> str:
    """User's chosen model for this provider (preferences JSON) or default."""
    try:
        prefs = getattr(user, "preferences", None) or {}
        chosen = (prefs.get("models") or {}).get(provider)
        if chosen:
            return chosen
    except Exception:
        pass
    return default_model(provider)
