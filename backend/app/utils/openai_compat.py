"""
app/utils/openai_compat.py — model-agnostic OpenAI Chat Completions wrapper.

WHY THIS EXISTS
Newer OpenAI models (the gpt-5.x family, the o-series, and OpenAI-compatible
gateways that mirror them) changed two request parameters that every agent in
this codebase had hard-coded for gpt-4o-mini:

  * `max_tokens`  → rejected with 400; the model wants `max_completion_tokens`.
  * `temperature` → only the default (1) is accepted; any other value 400s.

The symptom was brutal and misleading: the Critic, "Chat with report", and every
debate follow-up would fail with a generic "check model/API key" / 502, even
though the key was perfectly valid — the *parameters* were the problem. A user
who picked gpt-5.1 in Settings saw the whole analysis layer go dark.

Rather than hard-code a list of model names (which drifts every release), we call
the API optimistically and, on the specific 400s above, transparently rewrite the
offending parameter and retry. Once a model is known to need a rewrite we cache it
per-process, so the discovery cost (one failed call) is paid at most once per
model, not on every request.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("polynous.openai_compat")

# Models discovered (at runtime) to need the newer-parameter shape. Keyed by
# model id; value is a set of applied rewrites so we skip straight to the
# working call shape next time.
_NEEDS_MAX_COMPLETION_TOKENS: set[str] = set()
_NEEDS_DEFAULT_TEMPERATURE: set[str] = set()


def _looks_like_max_tokens_error(msg: str) -> bool:
    m = msg.lower()
    return "max_completion_tokens" in m or (
        "max_tokens" in m and ("not supported" in m or "unsupported" in m)
    )


def _looks_like_temperature_error(msg: str) -> bool:
    m = msg.lower()
    return "temperature" in m and (
        "unsupported" in m
        or "does not support" in m
        or "only the default" in m
        or "only supports" in m
    )


def openai_chat(client, *, model: str, messages: list, max_tokens=None,
                temperature=None, **extra):
    """
    Call client.chat.completions.create, self-healing the two parameter shape
    changes that newer OpenAI models require. Returns the raw SDK response.

    Pass max_tokens/temperature exactly as before; this wrapper decides whether
    to send them as-is, rename max_tokens → max_completion_tokens, or drop a
    non-default temperature, based on what the target model actually accepts.
    """
    params = dict(extra)
    params["model"] = model
    params["messages"] = messages

    # Apply anything we already learned about this model up front, so the common
    # steady-state path is a single successful call.
    token_param = "max_completion_tokens" if model in _NEEDS_MAX_COMPLETION_TOKENS else "max_tokens"
    if max_tokens is not None:
        params[token_param] = max_tokens
    if temperature is not None and model not in _NEEDS_DEFAULT_TEMPERATURE:
        params["temperature"] = temperature

    # At most a few adjustments: token-param rename, temperature drop, and a
    # final clean attempt.
    for _ in range(4):
        try:
            return client.chat.completions.create(**params)
        except Exception as e:  # noqa: BLE001 — inspect provider error text
            msg = str(e)
            if "max_tokens" in params and _looks_like_max_tokens_error(msg):
                params["max_completion_tokens"] = params.pop("max_tokens")
                _NEEDS_MAX_COMPLETION_TOKENS.add(model)
                logger.info("openai_compat: %s needs max_completion_tokens; adapting", model)
                continue
            if "temperature" in params and _looks_like_temperature_error(msg):
                params.pop("temperature")
                _NEEDS_DEFAULT_TEMPERATURE.add(model)
                logger.info("openai_compat: %s rejects custom temperature; using default", model)
                continue
            raise
    # Last try with whatever adaptations stuck (lets the real error surface).
    return client.chat.completions.create(**params)
