"""
app/utils/openai_compat.py — model-agnostic OpenAI Chat Completions wrapper.

WHY THIS EXISTS
The OpenAI-style Chat Completions API is now spoken by many providers (OpenAI
itself, plus Groq, Mistral, NVIDIA NIM, DeepSeek, Gemini's OpenAI-compat
endpoint …) and by several model generations that disagree on two request
parameters every agent here used to hard-code for gpt-4o-mini:

  * `max_tokens`   — the gpt-5.x / o-series reject it and require
                     `max_completion_tokens`; some older gateways reject
                     `max_completion_tokens` and require `max_tokens`.
  * `temperature`  — the gpt-5.x / o-series accept only the default value and
                     400 on any custom temperature.

Hard-coding either shape breaks a whole class of keys. Instead we call the API
optimistically and, on the specific errors, transparently rewrite the offending
parameter and retry — in BOTH directions — then cache what worked per model so
the steady-state path is a single clean call. This makes the Critic (and every
other agent routed through it) work with every provider/model combination the
Settings page offers.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("polynous.openai_compat")

# Per-process memory of what each model actually accepts, so we skip straight to
# the working call shape on subsequent requests.
_NEEDS_MAX_COMPLETION_TOKENS: set[str] = set()
_NEEDS_DEFAULT_TEMPERATURE: set[str] = set()


def _rejects_kwarg(msg_l: str, name: str) -> bool:
    """True when the error says this exact kwarg is unknown/unexpected — i.e.
    the SDK or gateway does not accept it at all (as opposed to the model
    wanting the *other* token param)."""
    return (
        f"unexpected keyword argument '{name}'" in msg_l
        or (name in msg_l and "unrecognized" in msg_l)
        or (name in msg_l and "unknown parameter" in msg_l)
        or (name in msg_l and "unknown argument" in msg_l)
    )


def _wants_max_completion_tokens(msg_l: str) -> bool:
    """Model/endpoint is telling us to use max_completion_tokens instead of
    max_tokens."""
    if _rejects_kwarg(msg_l, "max_completion_tokens"):
        return False  # it can't take mct — that's the revert case, not this one
    return (
        "max_completion_tokens" in msg_l
        or (
            "max_tokens" in msg_l
            and (
                "not supported" in msg_l
                or "unsupported" in msg_l
                or "use 'max_completion_tokens'" in msg_l
                or 'use "max_completion_tokens"' in msg_l
                or _rejects_kwarg(msg_l, "max_tokens")
            )
        )
    )


def _wants_max_tokens(msg_l: str) -> bool:
    """Endpoint rejects max_completion_tokens outright — fall back to the
    classic max_tokens (older gateways / older SDKs)."""
    return _rejects_kwarg(msg_l, "max_completion_tokens")


def _temperature_rejected(msg_l: str) -> bool:
    return "temperature" in msg_l and (
        "unsupported" in msg_l
        or "does not support" in msg_l
        or "only the default" in msg_l
        or "only supports" in msg_l
        or "is not supported" in msg_l
        or "not supported with this model" in msg_l
    )


def openai_chat(client, *, model: str, messages: list, max_tokens=None,
                temperature=None, **extra):
    """
    Call client.chat.completions.create, self-healing the parameter-shape
    differences across providers/models. Returns the raw SDK response.

    Pass max_tokens/temperature exactly as before; this wrapper decides the
    working shape per model and remembers it.
    """
    params = dict(extra)
    params["model"] = model
    params["messages"] = messages

    # Start from what we already learned about this model.
    token_param = "max_completion_tokens" if model in _NEEDS_MAX_COMPLETION_TOKENS else "max_tokens"
    if max_tokens is not None:
        params[token_param] = max_tokens
    if temperature is not None and model not in _NEEDS_DEFAULT_TEMPERATURE:
        params["temperature"] = temperature

    last_error = None
    for _ in range(6):
        try:
            return client.chat.completions.create(**params)
        except Exception as e:  # noqa: BLE001 — provider error text is the signal
            last_error = e
            msg_l = str(e).lower()

            # 1) custom temperature rejected → drop it
            if "temperature" in params and _temperature_rejected(msg_l):
                params.pop("temperature", None)
                _NEEDS_DEFAULT_TEMPERATURE.add(model)
                logger.info("openai_compat: %s rejects custom temperature; using default", model)
                continue

            # 2) needs max_completion_tokens instead of max_tokens
            if "max_tokens" in params and _wants_max_completion_tokens(msg_l):
                params["max_completion_tokens"] = params.pop("max_tokens")
                _NEEDS_MAX_COMPLETION_TOKENS.add(model)
                logger.info("openai_compat: %s needs max_completion_tokens; adapting", model)
                continue

            # 3) endpoint rejects max_completion_tokens → revert to max_tokens
            if "max_completion_tokens" in params and _wants_max_tokens(msg_l):
                params["max_tokens"] = params.pop("max_completion_tokens")
                _NEEDS_MAX_COMPLETION_TOKENS.discard(model)
                logger.info("openai_compat: %s rejects max_completion_tokens; reverting to max_tokens", model)
                continue

            raise
    # Ran out of adaptations — surface the real error.
    if last_error:
        raise last_error
    return client.chat.completions.create(**params)
