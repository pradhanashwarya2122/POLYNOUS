"""
app/llm_providers.py — single source of truth for supported LLM providers.

Anthropic uses its native SDK; every other provider speaks the
OpenAI-compatible protocol, so they all route through the OpenAI client
with a per-provider base_url — no extra SDK dependencies.
"""

LLM_PROVIDERS = ("anthropic", "openai", "google", "mistral", "groq", "nvidia", "deepseek", "zhipu")
ALL_KEY_PROVIDERS = LLM_PROVIDERS + ("tavily", "voyage")

# OpenAI-compatible endpoints for non-OpenAI providers
OPENAI_COMPATIBLE_BASE_URLS = {
    "google":   "https://generativelanguage.googleapis.com/v1beta/openai/",
    "mistral":  "https://api.mistral.ai/v1",
    "groq":     "https://api.groq.com/openai/v1",
    # NVIDIA NIM — hosts gpt-oss, nemotron, llama 3.x, deepseek-v4 etc.
    "nvidia":   "https://integrate.api.nvidia.com/v1",
    # DeepSeek native API (OpenAI-compatible)
    "deepseek": "https://api.deepseek.com",
    # Zhipu AI / Z.ai — international OpenAI-compatible endpoint for GLM models.
    # (Mainland-China accounts use https://open.bigmodel.cn/api/paas/v4 instead.)
    "zhipu":    "https://api.z.ai/api/openai/v1",
}

# Selectable models per provider (kept in sync with the frontend registry)
PROVIDER_MODELS = {
    "anthropic": ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8"],
    "openai":    ["gpt-4o-mini", "gpt-5.1"],
    "google":    ["gemini-2.5-flash", "gemini-2.5-pro"],
    "mistral":   ["mistral-small-latest", "mistral-large-latest"],
    "groq":      ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    "nvidia":    ["meta/llama-3.3-70b-instruct", "meta/llama-3.1-70b-instruct",
                  "nvidia/llama-3.3-nemotron-super-49b-v1", "openai/gpt-oss-120b",
                  "deepseek-ai/deepseek-v4-flash"],
    "deepseek":  ["deepseek-chat", "deepseek-reasoner"],
    "zhipu":     ["glm-4.7", "glm-4.6", "glm-5.1", "glm-5.2"],
}

DEFAULT_MODELS = {
    "anthropic": "claude-haiku-4-5",
    "openai":    "gpt-4o-mini",
    "google":    "gemini-2.5-flash",
    "mistral":   "mistral-small-latest",
    "groq":      "llama-3.3-70b-versatile",
    "nvidia":    "meta/llama-3.3-70b-instruct",
    "deepseek":  "deepseek-chat",
    "zhipu":     "glm-4.7",
}

# Key-format prefixes for quick client-side-style validation
KEY_PREFIXES = {
    "anthropic": "sk-ant",
    "openai":    "sk-",
    "google":    "AIza",
    "groq":      "gsk_",
    "mistral":   None,     # Mistral keys have no fixed prefix
    "nvidia":    "nvapi-",
    "deepseek":  "sk-",
    "zhipu":     None,     # Zhipu/Z.ai keys have no fixed prefix
    "tavily":    "tvly-",
    "voyage":    None,
}

# Friendly, user-facing names (the free starter key currently runs on Gemini, so
# "google" must read as "Gemini" everywhere it is shown to a user).
PROVIDER_LABELS = {
    "anthropic": "Claude",
    "openai":    "OpenAI",
    "google":    "Gemini",
    "groq":      "Groq",
    "mistral":   "Mistral",
    "nvidia":    "NVIDIA",
    "deepseek":  "DeepSeek",
    "zhipu":     "Zhipu",
}


def provider_label(provider: str) -> str:
    """Friendly display name for a provider id, e.g. 'google' -> 'Gemini'."""
    return PROVIDER_LABELS.get((provider or "").strip().lower(), (provider or "").title())


# ============================================================
# PRICING — ESTIMATED USD per 1,000,000 tokens (input, output)
# ============================================================
# These are ESTIMATES for cost-awareness only, not billing. Public list
# prices drift over time and per-account rates vary, so every cost figure
# derived from this table is surfaced to users as an estimate ("est."), and
# a model with no entry yields a null cost (rendered as "—"), never a guess.
PRICING = {
    "anthropic": {
        "claude-haiku-4-5":        (1.00, 5.00),
        "claude-haiku-4-5-20251001": (1.00, 5.00),
        "claude-sonnet-5":         (3.00, 15.00),
        "claude-opus-4-8":         (15.00, 75.00),
    },
    "openai": {
        "gpt-4o-mini":  (0.15, 0.60),
        "gpt-5.1-mini": (0.25, 2.00),
        "gpt-5.1":      (1.25, 10.00),
    },
    "google": {
        "gemini-2.5-flash": (0.30, 2.50),
        "gemini-2.5-pro":   (1.25, 10.00),
    },
    "mistral": {
        "mistral-small-latest": (0.10, 0.30),
        "mistral-large-latest": (2.00, 6.00),
    },
    "groq": {
        "llama-3.3-70b-versatile": (0.59, 0.79),
        "mixtral-8x7b-32768":      (0.24, 0.24),
    },
    "nvidia": {
        # NVIDIA NIM hosted — public list prices vary; conservative estimates.
        "meta/llama-3.3-70b-instruct": (0.60, 0.60),
        "meta/llama-3.1-70b-instruct": (0.60, 0.60),
    },
    "deepseek": {
        "deepseek-chat":     (0.27, 1.10),
        "deepseek-reasoner": (0.55, 2.19),
    },
    "zhipu": {
        "glm-4.6": (0.60, 2.20),
        "glm-4.7": (0.60, 2.20),
        "glm-5.1": (1.40, 4.40),
        "glm-5.2": (1.40, 4.40),
    },
}


def price_for(provider: str, model: str):
    """(input_rate, output_rate) per 1M tokens for a provider/model, or None
    if we have no estimate for it (caller renders cost as '—')."""
    table = PRICING.get(provider or "", {})
    if model in table:
        return table[model]
    # try the provider's default model as a best-effort fallback
    dm = DEFAULT_MODELS.get(provider or "")
    if dm and dm in table:
        return table[dm]
    return None


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
