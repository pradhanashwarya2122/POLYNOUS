"""
app/routes/admin.py — owner/admin visibility into the user base.

SECURITY MODEL (deliberate, non-negotiable):
  * Access is gated to emails listed in the ADMIN_EMAILS env var
    (comma-separated). No one else can reach these endpoints — a normal
    authenticated user gets 403.
  * Passwords are NEVER returned. They are stored only as salted one-way
    hashes and cannot be reversed by anyone, including the owner. This is a
    security guarantee, not a limitation.
  * API keys are NEVER returned, not even masked previews here. This endpoint
    only reports WHICH providers a user has configured (booleans), confirming
    the keys exist and are encrypted at rest — their plaintext is unreadable
    without each user's own encryption key.

Set ADMIN_EMAILS on Railway (e.g. ADMIN_EMAILS="you@example.com") to enable.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.llm_providers import LLM_PROVIDERS

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_emails() -> set:
    raw = os.getenv("ADMIN_EMAILS", "") or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def require_admin(user: User = Depends(get_current_user)) -> User:
    admins = _admin_emails()
    if not admins or (user.email or "").lower() not in admins:
        # Same 403 whether or not admin is configured — don't leak the gate.
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


@router.get("/users")
async def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    User-base overview for the owner. Returns counts + per-user metadata with
    NO passwords and NO API keys — only booleans for which providers a user
    has configured, plus the standing security guarantees.
    """
    from datetime import datetime, timedelta

    users = db.query(User).order_by(User.created_at.desc()).all()
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=7)

    rows = []
    active = 0
    recently_active = 0
    for u in users:
        if u.is_active:
            active += 1
        if u.last_login and u.last_login >= recent_cutoff:
            recently_active += 1
        providers_configured = [
            p for p in LLM_PROVIDERS if getattr(u, f"{p}_api_key", None)
        ]
        rows.append({
            "public_id": u.public_id,
            "email": u.email,                      # login identifier — visible to admin
            "username": u.username,
            "tier": u.tier,
            "is_active": bool(u.is_active),
            "email_verified": bool(u.email_verified),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            # keys: presence only, never the value
            "providers_configured": providers_configured,
            "key_count": len(providers_configured),
            # explicit, never-derivable guarantees
            "password_readable": False,
            "api_keys_readable": False,
        })

    return {
        "totals": {
            "users": len(users),
            "active": active,
            "recently_active_7d": recently_active,
        },
        # Honest note: JWTs are stateless, so "currently logged in" isn't
        # tracked — recently_active_7d (last_login within 7 days) is the
        # closest real signal.
        "logged_in_note": "Sessions are stateless JWTs, so exact 'currently online' "
                          "counts aren't tracked; recently_active_7d reflects logins "
                          "in the last 7 days.",
        "security": {
            "passwords": "stored as salted one-way hashes — unreadable by anyone, including the owner",
            "api_keys": "encrypted per-user at rest — never returned by this endpoint or visible to staff",
        },
        "users": rows,
    }
