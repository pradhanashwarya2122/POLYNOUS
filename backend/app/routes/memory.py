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
async def get_debate_history(request: Request):
    """Get current user's debate history"""
    user_id = get_user_id(request)
    
    print(f"🔍 Memory debates requested for user: {user_id}")
    
    try:
        driver = user_memory._get_driver()   # use the resilient getter
        if not driver:
            return {"user_id": user_id, "debates": [], "error": "Neo4j unavailable"}
        with driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:DEBATED]->(d:DebateSession)
                RETURN d.topic as topic, d.winner as winner,
                       d.for_score as for_score, d.against_score as against_score,
                       d.timestamp as timestamp
                ORDER BY d.timestamp DESC
                LIMIT 20
            """, user_id=user_id)
            
            debates = [
                {
                    "topic": record["topic"],
                    "winner": record["winner"],
                    "for_score": record["for_score"],
                    "against_score": record["against_score"],
                    "timestamp": str(record["timestamp"])[:19] if record["timestamp"] else None
                }
                for record in result
            ]
            
            return {"user_id": user_id, "debates": debates, "total": len(debates)}
    except Exception as e:
        print(f"⚠️ Debate history error: {e}")
        return {"user_id": user_id, "debates": [], "error": str(e)}