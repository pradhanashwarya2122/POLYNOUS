"""
app/services/research_cache.py — per-user 24h research result cache (Phase 6).

A cache hit streams the stored report back instead of re-running the whole
pipeline (and re-spending the user's own API tokens). Keyed by
(user_id, normalized-query hash, provider) so it is strictly per-user and
never mixes results across accounts or providers. BYO-key policy is
unchanged — caching only ever returns a result the SAME user already paid to
generate.
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta
from typing import Optional

CACHE_TTL_HOURS = 24


def normalize_query(query: str) -> str:
    """Lowercase, trim, collapse whitespace — so trivially different spellings
    of the same question share a cache entry."""
    return re.sub(r"\s+", " ", (query or "").strip().lower())


def query_hash(query: str) -> str:
    return hashlib.sha256(normalize_query(query).encode("utf-8")).hexdigest()


def get_cached(db, user_id: str, query: str, provider: str) -> Optional[dict]:
    """Return the freshest non-expired cache row as a render-ready dict, or
    None. Never raises — cache problems must never block a research run."""
    try:
        from app.models import ResearchCache
        cutoff = datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS)
        row = (
            db.query(ResearchCache)
            .filter(
                ResearchCache.user_id == (user_id or "guest"),
                ResearchCache.query_hash == query_hash(query),
                ResearchCache.provider == provider,
                ResearchCache.created_at >= cutoff,
            )
            .order_by(ResearchCache.created_at.desc())
            .first()
        )
        if not row:
            return None
        age_seconds = max(0, (datetime.utcnow() - row.created_at).total_seconds())
        return {
            "final_answer": row.final_answer or "",
            "report": row.report,
            "citations": row.citations or [],
            "confidence": row.confidence or 0,
            "telemetry": row.telemetry,
            "created_at": row.created_at.isoformat(),
            "age_seconds": int(age_seconds),
            "age_label": _age_label(age_seconds),
        }
    except Exception:
        return None


def store(db, user_id: str, query: str, provider: str, *, final_answer: str,
          report, citations, confidence: int, telemetry) -> None:
    """Persist a completed run. Best-effort — a cache write must never break
    the response. Replaces any prior entry for the same (user, query, provider)
    so the cache holds only the latest."""
    try:
        from app.models import ResearchCache
        db.query(ResearchCache).filter(
            ResearchCache.user_id == (user_id or "guest"),
            ResearchCache.query_hash == query_hash(query),
            ResearchCache.provider == provider,
        ).delete(synchronize_session=False)
        db.add(ResearchCache(
            user_id=user_id or "guest",
            query_hash=query_hash(query),
            provider=provider,
            query=query[:2000],
            final_answer=final_answer or "",
            report=report,
            citations=citations or [],
            confidence=int(confidence or 0),
            telemetry=telemetry,
            created_at=datetime.utcnow(),
        ))
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def _age_label(age_seconds: float) -> str:
    """Human age like '2h old', '35m old', 'just now'."""
    s = int(age_seconds)
    if s < 90:
        return "just now"
    m = s // 60
    if m < 60:
        return f"{m}m old"
    h = m // 60
    return f"{h}h old"
