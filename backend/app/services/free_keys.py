"""
app/services/free_keys.py

Free starter-key pool. Every new user may claim ONE key from
backend/free_keys.json. Claims are tracked by key fingerprint (a SHA-256
hash) in the free_key_claims table, so:
  * each user gets exactly one free key, and
  * a given pool key is never handed to two different users.

The pool file can be freely reordered / shuffled / appended between requests —
we match on fingerprint, not position.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Optional

from app.llm_providers import LLM_PROVIDERS

# backend/free_keys.json  (this file lives in app/services/)
_POOL_PATH = Path(__file__).resolve().parents[2] / "free_keys.json"


def _fingerprint(key: str) -> str:
    return hashlib.sha256(key.strip().encode("utf-8")).hexdigest()


def _load_pool() -> list[dict]:
    """Return the list of valid, filled-in pool entries (placeholders skipped).

    Two sources, merged (env takes priority so it's the "current" free key):
      1. FREE_KEY + FREE_KEY_PROVIDER env vars — the EASY rotation path. Change
         these one values on your host and the free key rotates instantly, no
         redeploy and no file edits.
      2. backend/free_keys.json — a static pool (or FREE_KEYS_PATH).
    """
    valid, seen = [], set()

    def _add(provider: str, key: str):
        key = (key or "").strip()
        provider = (provider or "").strip().lower()
        if not key or key.startswith("PASTE_") or provider not in LLM_PROVIDERS:
            return
        fp = _fingerprint(key)
        if fp in seen:
            return
        seen.add(fp)
        valid.append({"provider": provider, "key": key, "fp": fp})

    # 1) legacy single env-var free key (FREE_KEY + FREE_KEY_PROVIDER)
    _add(os.getenv("FREE_KEY_PROVIDER") or "", os.getenv("FREE_KEY") or "")

    # 2) per-provider env-var free keys — set any of these in Railway to roll out
    #    free keys for everyone. e.g. FREE_KEY_GROQ, FREE_KEY_ZHIPU, FREE_KEY_GOOGLE.
    #    Friendly aliases: FREE_KEY_GEMINI → google, FREE_KEY_GROK → groq.
    for provider in LLM_PROVIDERS:
        _add(provider, os.getenv(f"FREE_KEY_{provider.upper()}") or "")
    _add("google", os.getenv("FREE_KEY_GEMINI") or "")   # alias
    _add("groq",   os.getenv("FREE_KEY_GROK") or "")      # alias (common spelling)

    # 3) file pool
    path = os.getenv("FREE_KEYS_PATH", str(_POOL_PATH))
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        entries = data.get("keys", []) if isinstance(data, dict) else []
    except (FileNotFoundError, json.JSONDecodeError):
        entries = []
    for e in entries:
        key = (e.get("key") or "").strip()
        provider = (e.get("provider") or "").strip().lower()
        if not key or key.startswith("PASTE_") or provider not in LLM_PROVIDERS:
            continue
        fp = _fingerprint(key)
        if fp in seen:
            continue
        seen.add(fp)
        valid.append({"provider": provider, "key": key, "fp": fp})
    return valid


def pool_configured() -> bool:
    return len(_load_pool()) > 0


def current_fingerprints() -> set:
    """Fingerprints of the keys currently in the pool — used to detect when a
    user's previously-claimed free key has been ROTATED out (no longer valid)."""
    return {e["fp"] for e in _load_pool()}


def available_count(claimed_fingerprints: set[str]) -> int:
    return sum(1 for e in _load_pool() if e["fp"] not in claimed_fingerprints)


def pick_unclaimed(claimed_fingerprints: set[str]) -> Optional[dict]:
    """First pool entry not already claimed by anyone. Returns
    {provider, key, fp} or None if the pool is empty/exhausted."""
    for e in _load_pool():
        if e["fp"] not in claimed_fingerprints:
            return e
    return None
