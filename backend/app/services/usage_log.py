"""
app/services/usage_log.py — persist and summarize per-run token/cost usage.

Feeds the Settings "Usage & Credits" section. Every number comes from the
Phase-6 telemetry (summarize_usage); cost is an estimate. Best-effort: a
logging failure must never break a research/debate response.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional


def record_run(db, user_id: str, mode: str, telemetry: Optional[dict], query: str = "") -> None:
    """Append one row for a completed, non-cached run. No-op on any error."""
    if not telemetry or db is None:
        return
    try:
        from app.models import UsageLog
        cost = (telemetry.get("estimated_cost") or {}).get("usd")
        # pick the dominant provider/model from the stage breakdown (best-effort)
        provider = model = None
        for st in (telemetry.get("by_stage") or {}).values():
            if st.get("model"):
                provider, model = st.get("provider"), st.get("model")
                break
        db.add(UsageLog(
            user_id=user_id or "guest",
            mode=mode,
            provider=provider,
            model=model,
            query=(query or "")[:500],
            calls=telemetry.get("calls", 0) or 0,
            input_tokens=telemetry.get("input_tokens", 0) or 0,
            output_tokens=telemetry.get("output_tokens", 0) or 0,
            total_tokens=telemetry.get("total_tokens", 0) or 0,
            estimated_cost_usd=cost,
            created_at=datetime.utcnow(),
        ))
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def summarize(db, user_id: str, recent_limit: int = 15) -> dict:
    """Per-user usage summary split by mode, plus the most recent runs.
    Returns an explicit empty shape when there's nothing logged."""
    empty_mode = {"runs": 0, "calls": 0, "total_tokens": 0, "estimated_cost_usd": 0.0,
                  "cost_is_partial": False}
    out = {
        "available": False,
        "by_mode": {"research": dict(empty_mode), "debate": dict(empty_mode)},
        "totals": {"runs": 0, "total_tokens": 0, "estimated_cost_usd": 0.0, "cost_is_partial": False},
        "recent": [],
    }
    if db is None:
        return out
    try:
        from app.models import UsageLog
        rows = (db.query(UsageLog)
                .filter(UsageLog.user_id == (user_id or "guest"))
                .order_by(UsageLog.created_at.desc())
                .all())
        if not rows:
            return out
        out["available"] = True
        for r in rows:
            m = r.mode if r.mode in ("research", "debate") else "research"
            bm = out["by_mode"][m]
            bm["runs"] += 1
            bm["calls"] += r.calls or 0
            bm["total_tokens"] += r.total_tokens or 0
            if isinstance(r.estimated_cost_usd, (int, float)):
                bm["estimated_cost_usd"] += r.estimated_cost_usd
            else:
                bm["cost_is_partial"] = True
        # totals
        t = out["totals"]
        for m in ("research", "debate"):
            bm = out["by_mode"][m]
            bm["estimated_cost_usd"] = round(bm["estimated_cost_usd"], 5)
            t["runs"] += bm["runs"]
            t["total_tokens"] += bm["total_tokens"]
            t["estimated_cost_usd"] += bm["estimated_cost_usd"]
            t["cost_is_partial"] = t["cost_is_partial"] or bm["cost_is_partial"]
        t["estimated_cost_usd"] = round(t["estimated_cost_usd"], 5)
        # recent runs
        out["recent"] = [{
            "mode": r.mode,
            "query": r.query or "",
            "provider": r.provider,
            "model": r.model,
            "total_tokens": r.total_tokens or 0,
            "estimated_cost_usd": r.estimated_cost_usd if isinstance(r.estimated_cost_usd, (int, float)) else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows[:recent_limit]]
        return out
    except Exception:
        return out
