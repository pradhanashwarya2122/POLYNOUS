from fastapi import APIRouter, Query, HTTPException, Request
from typing import Optional
from app.knowledge_graph.user_memory import user_memory

router = APIRouter(prefix="/memory", tags=["memory"])

# ============================================================
# HELPER: Get user_id from request (set by auth middleware)
# ============================================================
def get_user_id(request: Request) -> str:
    """Get user's public ID from request state"""
    uid = getattr(request.state, 'user_public_id', 'guest')
    if uid == 'unknown':
        uid = 'guest'
    return uid

def get_internal_user_id(request: Request) -> int:
    """Get user's internal ID from request state"""
    return getattr(request.state, 'user_id', 0)

# ============================================================
# ENDPOINTS — user_id extracted from JWT, NOT from URL
# ============================================================

@router.post("/user")
async def create_or_update_user(
    request: Request,
    username: str = "User",
    email: str = ""
):
    """Create or update user profile in memory graph"""
    user_id = get_user_id(request)
    username = username[:50]
    email = email[:100]
    
    print(f"🔍 Creating/updating user profile: {user_id}")
    user_memory.create_user_profile(user_id, username, email)
    return {"status": "ok", "user_id": user_id}

@router.get("/interests")
async def get_interests(request: Request, limit: int = 10):
    """Get current user's research interests"""
    user_id = get_user_id(request)
    limit = min(limit, 50)
    
    print(f"🔍 Memory interests requested for user: {user_id}")
    interests = user_memory.get_user_interests(user_id, limit)
    return {"user_id": user_id, "interests": interests, "total": len(interests)}

@router.get("/history")
async def get_history(request: Request, limit: int = 20):
    """Get current user's research history"""
    user_id = get_user_id(request)
    limit = min(limit, 50)
    
    print(f"🔍 Memory history requested for user: {user_id}")
    history = user_memory.get_recent_research(user_id, limit)
    return {"user_id": user_id, "history": history, "total": len(history)}

@router.get("/forecast")
async def research_forecast(request: Request):
    """Phase E: lightweight activity forecast + trending topics from history."""
    import re as _re
    from datetime import datetime, timezone
    user_id = get_user_id(request)
    history = user_memory.get_recent_research(user_id, 50) or []
    interests = user_memory.get_user_interests(user_id, 20) or []

    # Bucket by day and fit a linear trend to project the next 7 days.
    counts = {}
    for h in history:
        ts = h.get("timestamp") or h.get("created_at") or h.get("date") or ""
        day = None
        try:
            if isinstance(ts, (int, float)):
                day = datetime.fromtimestamp(ts, tz=timezone.utc).date()
            elif isinstance(ts, str) and ts:
                m = _re.search(r"\d{4}-\d{2}-\d{2}", ts)
                if m:
                    day = datetime.fromisoformat(m.group(0)).date()
        except Exception:
            day = None
        if day:
            counts[day] = counts.get(day, 0) + 1

    projected_week = None
    trend = "flat"
    if len(counts) >= 3:
        try:
            import numpy as np
            days = sorted(counts)
            x = np.arange(len(days)); y = np.array([counts[d] for d in days], dtype=float)
            slope, intercept = np.polyfit(x, y, 1)
            nxt = max(0.0, slope * (len(days) + 3) + intercept)  # ~mid next week
            projected_week = round(float(nxt) * 7, 1)
            trend = "rising" if slope > 0.15 else "declining" if slope < -0.15 else "steady"
        except Exception:
            projected_week = None

    # Trending topics = the user's top interests (already frequency-ranked).
    trending = [
        {"topic": (i.get("topic") or i.get("name") or str(i)), "weight": i.get("count", i.get("weight", 1))}
        for i in interests[:5]
    ]
    return {
        "user_id": user_id,
        "sessions_analysed": len(history),
        "activity_trend": trend,
        "projected_sessions_next_week": projected_week,
        "trending_topics": trending,
    }


@router.get("/resurface")
async def resurface(request: Request, limit: int = 5):
    """Phase F: spaced-repetition. Surface important research you haven't
    revisited in a while (score = importance x how-long-since), so knowledge
    doesn't decay."""
    import re as _re
    from datetime import datetime, timezone
    user_id = get_user_id(request)
    history = user_memory.get_recent_research(user_id, 50) or []
    now = datetime.now(timezone.utc)
    scored = []
    for h in history:
        ts = h.get("timestamp") or h.get("created_at") or h.get("date") or ""
        days = 30.0
        try:
            if isinstance(ts, (int, float)):
                days = max(0.0, (now - datetime.fromtimestamp(ts, tz=timezone.utc)).days)
            elif isinstance(ts, str) and ts:
                m = _re.search(r"\d{4}-\d{2}-\d{2}", ts)
                if m:
                    days = max(0.0, (now - datetime.fromisoformat(m.group(0)).replace(tzinfo=timezone.utc)).days)
        except Exception:
            days = 30.0
        importance = 0.4 + 0.6 * (float(h.get("confidence", 50) or 50) / 100.0)
        # rises with age (plateaus), weighted by how well-supported it was
        age_factor = 1.0 - 1.0 / (1.0 + days / 7.0)
        score = round(importance * age_factor, 4)
        scored.append({"query": h.get("query", "Untitled"), "mode": h.get("mode", "research"),
                       "days_since": int(days), "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"user_id": user_id, "resurface": scored[:limit]}


@router.get("/context")
async def get_personalized_context(request: Request, query: Optional[str] = None):
    """Get personalized context for current user"""
    user_id = get_user_id(request)
    if query:
        query = query[:200]
    
    print(f"🔍 Memory context requested for user: {user_id}")
    context = user_memory.get_personalized_context(user_id, query or "")
    return {"user_id": user_id, "context": context, "has_context": len(context) > 0}

@router.get("/suggestions")
async def get_suggestions(request: Request, topic: str = Query(...)):
    """Get topic suggestions for current user"""
    user_id = get_user_id(request)
    topic = topic[:200]
    
    print(f"🔍 Memory suggestions requested for user: {user_id}, topic: {topic[:50]}")
    suggestions = user_memory.get_related_suggestions(user_id, topic)
    return {"user_id": user_id, "current_topic": topic, "suggestions": suggestions}

@router.get("/stats")
async def get_user_stats(request: Request):
    """Get current user's statistics"""
    # ✅ Get user ID from auth middleware (NOT from URL)
    user_id = getattr(request.state, 'user_public_id', None)
    
    print(f"🔍 Memory stats requested for user: {user_id}")
    print(f"   request.state.user_public_id: {getattr(request.state, 'user_public_id', 'NOT SET')}")
    print(f"   request.state.user_id: {getattr(request.state, 'user_id', 'NOT SET')}")
    print(f"   request.state.user_email: {getattr(request.state, 'user_email', 'NOT SET')}")
    
    # If no authenticated user, return empty immediately
    if not user_id or user_id == 'guest':
        return {"total_research": 0, "total_debates": 0, "avg_confidence": 0, "unique_topics": 0}
    
    stats = user_memory.get_user_stats(user_id)
    if not stats:
        return {"total_research": 0, "total_debates": 0, "avg_confidence": 0, "unique_topics": 0}
    return stats

@router.get("/debates")
async def get_debate_history(request: Request, limit: int = 20):
    """Get current user's debate history (Postgres-backed)."""
    user_id = get_user_id(request)
    print(f"🔍 Memory debates requested for user: {user_id}")
    try:
        # Prefer the backend-agnostic getter (PgMemory implements it); fall back
        # to the legacy Neo4j driver path only if that method isn't available.
        getter = getattr(user_memory, "get_recent_debates", None)
        if callable(getter):
            debates = getter(user_id, limit) or []
            return {"user_id": user_id, "debates": debates, "total": len(debates)}
        driver = user_memory._get_driver()
        if not driver:
            return {"user_id": user_id, "debates": [], "total": 0}
        with driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:DEBATED]->(d:DebateSession)
                RETURN d.topic as topic, d.winner as winner,
                       d.for_score as for_score, d.against_score as against_score,
                       d.timestamp as timestamp
                ORDER BY d.timestamp DESC LIMIT 20
            """, user_id=user_id)
            debates = [{"topic": r["topic"], "winner": r["winner"],
                        "for_score": r["for_score"], "against_score": r["against_score"],
                        "timestamp": str(r["timestamp"])[:19] if r["timestamp"] else None}
                       for r in result]
            return {"user_id": user_id, "debates": debates, "total": len(debates)}
    except Exception as e:
        print(f"⚠️ Debate history error: {e}")
        return {"user_id": user_id, "debates": [], "error": str(e)}