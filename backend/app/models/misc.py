"""
app/models/misc.py — the remaining tables, bound to the SINGLE Base from
app.models.user so Alembic autogenerate sees every table on one metadata.

These used to live on database.py's separate Base (the dual-Base hazard).
They are re-exported from app.database for backward compatibility.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, Index
from datetime import datetime

from app.models.user import Base


class DebateVote(Base):
    """User verdict votes — powers the Judge Track Record strip.
    agreement rate = share of votes agreeing with the judge's winner."""
    __tablename__ = "debate_votes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True)          # public_id or null (guest view)
    topic = Column(Text, nullable=False)
    judge_winner = Column(String(20), nullable=False)
    user_agrees = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FreeKeyClaim(Base):
    """Tracks which free starter-key each user has claimed, so each user
    gets exactly one and pool keys are never handed out twice. Stores a
    fingerprint (hash) of the key, never the key itself."""
    __tablename__ = "free_key_claims"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)   # public_id
    key_fingerprint = Column(String(64), nullable=False, index=True)
    provider = Column(String(30), nullable=False)
    claimed_at = Column(DateTime, default=datetime.utcnow)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    user_id = Column(String, primary_key=True)
    theme = Column(String, default="dark")
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)
    research_depth = Column(String, default="standard")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResearchCache(Base):
    """Per-user research result cache (Phase 6). Keyed by (user_id,
    query_hash, provider); a hit within TTL streams the stored report back
    instead of re-running the pipeline (and re-spending the user's tokens).
    Stores the full final payload so the cached path renders identically."""
    __tablename__ = "research_cache"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)   # public_id or 'guest'
    query_hash = Column(String(64), nullable=False, index=True)  # sha256(normalized query)
    provider = Column(String(30), nullable=False)
    query = Column(Text, nullable=False)                   # original query (for display/debug)
    final_answer = Column(Text, nullable=False)
    report = Column(JSON, nullable=True)                   # structured writer JSON (Phase 3)
    citations = Column(JSON, nullable=True)
    confidence = Column(Integer, default=0)
    telemetry = Column(JSON, nullable=True)                # token/cost snapshot of the original run
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_research_cache_lookup", "user_id", "query_hash", "provider"),
    )


class UsageLog(Base):
    """Append-only per-run token/cost record so the Settings page can show a
    user their real credit usage broken down by mode (research vs debate).
    One row per completed, non-cached run. All numbers come straight from the
    Phase-6 telemetry — never fabricated; cost is an estimate."""
    __tablename__ = "usage_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)   # public_id or 'guest'
    mode = Column(String(20), nullable=False)              # "research" | "debate"
    provider = Column(String(30), nullable=True)
    model = Column(String(80), nullable=True)
    query = Column(Text, nullable=True)                    # topic/query for the run
    calls = Column(Integer, default=0)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost_usd = Column(JSON, nullable=True)       # float | null (null = unpriced)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_usage_logs_user_mode", "user_id", "mode"),
    )
