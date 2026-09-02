"""
app/services/trial.py — Free Gemini (Google) starter-key trial policy & enforcement.

The free starter key (see app/services/free_keys.py) is handed out as a
TIME + RUN limited trial so a shared pool key can't be abused:

  • TIME cap  — the trial expires FREE_TRIAL_DAYS after it was claimed.
  • RUN cap   — and/or after FREE_TRIAL_RUNS research/debate runs (counted
                from the existing usage_logs table), whichever comes first.

The pooled key itself lives only in server-side config and is only ever
decrypted server-side for the actual model call — the browser never receives
it (Settings shows a masked preview). When the trial ends we DISABLE it:
remove the pooled key from the account and clear the marker, so the run path
naturally reports "no key — add your own", and the UI shows the upgrade panel.

Everything here is additive: for users who are NOT on the trial, every helper
is a cheap no-op, so the hot research/debate path is unaffected.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Optional


def _int_env(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, str(default))))
    except (TypeError, ValueError):
        return default


def trial_days() -> int:
    return _int_env("FREE_TRIAL_DAYS", 7)


def trial_runs() -> int:
    return _int_env("FREE_TRIAL_RUNS", 15)


def _marker(user) -> Optional[dict]:
    """The trial marker stored in preferences at claim time, or None."""
    try:
        prefs = getattr(user, "preferences", None) or {}
        m = prefs.get("free_trial")
        if isinstance(m, dict) and m.get("active"):
            return m
    except Exception:
        pass
    return None


def is_on_trial(user) -> bool:
    return _marker(user) is not None


def _runs_used(user, db) -> int:
    """How many research/debate runs since the trial was claimed."""
    m = _marker(user)
    if not m or db is None:
        return 0
    try:
        from app.models import UsageLog
        q = db.query(UsageLog).filter(UsageLog.user_id == str(user.public_id))
        claimed = m.get("claimed_at")
        if claimed:
            try:
                q = q.filter(UsageLog.created_at >= datetime.fromisoformat(claimed))
            except (TypeError, ValueError):
                pass
        return q.count()
    except Exception:
        return 0


def state(user, db=None) -> dict:
    """Full trial state for the status endpoint and the UI countdown."""
    m = _marker(user)
    if not m:
        return {"active": False}

    provider = m.get("provider", "google")
    days = trial_days()
    runs_cap = trial_runs()

    claimed_at = None
    try:
        claimed_at = datetime.fromisoformat(m["claimed_at"]) if m.get("claimed_at") else None
    except (TypeError, ValueError, KeyError):
        claimed_at = None

    expires_at = (claimed_at + timedelta(days=days)) if (claimed_at and days) else None
    now = datetime.utcnow()
    seconds_left = (expires_at - now).total_seconds() if expires_at else None
    days_left = max(0, int((seconds_left + 86399) // 86400)) if seconds_left is not None else None
    time_expired = bool(expires_at and now >= expires_at)

    runs_used = _runs_used(user, db)
    runs_left = max(0, runs_cap - runs_used) if runs_cap else None
    runs_expired = bool(runs_cap and runs_used >= runs_cap)

    expired = time_expired or runs_expired
    reason = "time" if time_expired else ("runs" if runs_expired else None)

    return {
        "active": True,
        "provider": provider,
        "model": m.get("model"),
        "claimed_at": m.get("claimed_at"),
        "expires_at": expires_at.isoformat() if expires_at else None,
        "days": days or None,
        "days_left": days_left,
        "runs_cap": runs_cap or None,
        "runs_used": runs_used,
        "runs_left": runs_left,
        "expired": expired,
        "reason": reason,
    }


def mark_claimed(user, provider: str, model: Optional[str] = None) -> None:
    """Record the trial marker on the user's preferences. Caller commits."""
    from sqlalchemy.orm.attributes import flag_modified
    prefs = getattr(user, "preferences", None) or {}
    prefs["free_trial"] = {
        "active": True,
        "provider": provider,
        "model": model,
        "claimed_at": datetime.utcnow().isoformat(),
    }
    user.preferences = prefs
    flag_modified(user, "preferences")


def _clear_marker(user) -> None:
    from sqlalchemy.orm.attributes import flag_modified
    prefs = getattr(user, "preferences", None) or {}
    ft = prefs.get("free_trial")
    if isinstance(ft, dict):
        ft["active"] = False
        ft["ended_at"] = datetime.utcnow().isoformat()
        prefs["free_trial"] = ft
        user.preferences = prefs
        flag_modified(user, "preferences")


def enforce(user, db) -> tuple[bool, Optional[str]]:
    """
    Gate a research/debate run. Returns (allowed, message).

    • Not on the trial  → (True, None)   — cheap no-op.
    • Trial still valid → (True, None).
    • Trial ended       → DISABLE it (remove the pooled key from the account,
      reset the preferred provider, clear the marker) and return
      (False, upgrade_message).
    """
    st = state(user, db)
    if not st.get("active"):
        return True, None
    if not st.get("expired"):
        return True, None

    provider = st.get("provider", "google")
    # Disable: strip the pooled key so the normal path reports "no key".
    try:
        if getattr(user, f"{provider}_api_key", None):
            setattr(user, f"{provider}_api_key", None)
        if getattr(user, "preferred_provider", None) == provider:
            user.preferred_provider = None
        _clear_marker(user)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    from app.llm_providers import provider_label
    label = provider_label(provider)
    if st.get("reason") == "runs":
        msg = (f"Your free {label} trial is used up ({st.get('runs_used')} runs). "
               "Add your own API key in Settings → API Keys to keep going — "
               "stronger models like Claude, GPT or a paid Gemini tier give noticeably better results.")
    else:
        msg = (f"Your free {label} trial has ended. "
               "Add your own API key in Settings → API Keys to keep researching — "
               "stronger models like Claude, GPT or a paid Gemini tier give noticeably better results.")
    return False, msg
