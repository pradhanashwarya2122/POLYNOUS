"""
app/routes/system.py

System / health / debug / history / evals endpoints, split out of main.py
(Phase 7, pure refactor — no route paths or behavior changed).
"""
import os

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import get_db, check_database_connection
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.chat_history import get_chat_history, get_debate_history
from app.knowledge_graph.user_memory import user_memory
from app.routes.auth import get_current_user
from app.cors_config import ALLOWED_ORIGINS

router = APIRouter()


@router.get("/")
async def root():
    db_healthy, db_msg = check_database_connection()
    return {
        "system": "POLYNOUS",
        "tagline": "Many Minds, One Answer",
        "version": "3.0",
        "database": "connected" if db_healthy else "disconnected",
        "endpoints": ["/ask", "/ask-stream", "/ask-visual", "/health", "/health/neo4j", "/auth/register", "/auth/login", "/auth/refresh", "/conversations"]
    }

@router.get("/health")
async def health():
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "healthy",
            "database": "connected",
            "agents": 7,
            "version": "3.0",
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e) if os.getenv("ENVIRONMENT") != "production" else "Service unavailable",
                "version": "3.0"
            }
        )

@router.get("/health/neo4j")
async def neo4j_health():
    """Verify Neo4j is actually connected and working"""
    try:
        from app.knowledge_graph.graph_manager import kg
        
        if not kg.driver:
            return {"status": "NOT_CONFIGURED", "error": "No Neo4j driver initialized"}
        
        with kg.driver.session() as session:
            # Simple connectivity test
            result = session.run("RETURN 1 AS alive")
            record = result.single()
            
            # Write a test node and read it back
            session.run("MERGE (t:HealthCheck {service: 'polynous'}) SET t.last_check = timestamp()")
            read_back = session.run("MATCH (t:HealthCheck) RETURN t.last_check AS ts").single()
            
            # Clean up
            session.run("MATCH (t:HealthCheck) DELETE t")
            
            return {
                "status": "CONNECTED",
                "alive": record["alive"],
                "write_test": "passed",
                "read_test_ts": read_back["ts"] if read_back else None
            }
    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e)[:200],
            "error_type": type(e).__name__
        }

@router.get("/history/chats")
async def chat_history(session_id: str = None, limit: int = 20):
    return {"history": get_chat_history(session_id, limit)}

@router.get("/debug/cors")
async def debug_cors():
    return {"allowed_origins": ALLOWED_ORIGINS}

@router.get("/debug/user-memory")
async def debug_user_memory(request: Request):
    user_id = getattr(request.state, 'user_public_id', 'guest')
    stats = user_memory.get_user_stats(user_id)
    interests = user_memory.get_user_interests(user_id)
    history = user_memory.get_recent_research(user_id)
    return {"user_id": user_id, "stats": stats, "interests": interests, "history": history}

@router.get("/history/debates")
async def debate_history(session_id: str = None, limit: int = 20):
    return {"history": get_debate_history(session_id, limit)}

# ========== RESEARCH / DEBATE ==========


# ========== DEBUG ENDPOINT ==========
@router.get("/debug/last-key")
async def debug_last_key(request: Request, db=Depends(get_db)):
    user_public_id = getattr(request.state, 'user_public_id', None)
    if not user_public_id:
        return {"error": "Not authenticated"}
    user = db.query(User).filter(User.public_id == user_public_id).first()
    if not user:
        return {"error": "User not found"}
    provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
    encrypted = getattr(user, f'{provider}_api_key', None)
    if not encrypted:
        return {"error": f"No {provider} key stored"}
    decrypted = decrypt_api_key(encrypted, user.encryption_key)
    return {
        "provider": provider,
        "key_preview": (decrypted[:15] + "..." if decrypted else None),
        "key_used": bool(decrypted)
    }

@router.get("/stats/vector-count")
async def vector_count():
    try:
        from app.semantic_search import semantic_search
        memory_count = len(semantic_search.fallback_memory) if hasattr(semantic_search, 'fallback_memory') else 0
        pinecone_count = 0
        try:
            if hasattr(semantic_search, 'index') and semantic_search.index:
                stats = semantic_search.index.describe_index_stats()
                pinecone_count = stats.get('total_vector_count', 0)
        except:
            pass
        total = max(memory_count, pinecone_count)
        return {"count": total, "memory_count": memory_count, "pinecone_count": pinecone_count}
    except Exception as e:
        return {"count": 0, "error": str(e)}


@router.get("/evals/summary")
async def evals_summary(user=Depends(get_current_user)):
    """
    Latest evaluation-harness results for the analytics dashboard's Evaluation
    card. Auth-gated. Returns an explicit empty state when no runs exist —
    never fabricated numbers.

    Shape:
      { "available": false, "message": "No evaluation runs yet" }
      OR
      { "available": true, "timestamp", "provider", "model", "n_questions",
        "n_pipeline_errors", "baseline_enabled", "by_category", "totals" }
    """
    from pathlib import Path
    import json as _json

    results_dir = Path(__file__).resolve().parent.parent / "evals" / "results"
    files = sorted(results_dir.glob("*.json")) if results_dir.exists() else []
    if not files:
        return {"available": False, "message": "No evaluation runs yet"}

    try:
        latest = files[-1]
        data = _json.loads(latest.read_text(encoding="utf-8"))
    except Exception as e:
        return {"available": False, "message": f"Could not read latest results: {e}"}

    # Compute honest cross-category totals from real per-run metrics.
    runs = data.get("runs", [])
    def _avg(key):
        vals = [r["pipeline"].get(key) for r in runs
                if isinstance(r.get("pipeline", {}).get(key), (int, float))]
        return round(sum(vals) / len(vals), 3) if vals else None

    total_halluc = sum(r["pipeline"].get("hallucinated_citations", 0) or 0 for r in runs)
    return {
        "available": True,
        "timestamp": data.get("timestamp"),
        "provider": data.get("provider"),
        "model": data.get("model"),
        "n_questions": data.get("n_questions", len(runs)),
        "n_pipeline_errors": data.get("n_pipeline_errors", 0),
        "baseline_enabled": data.get("baseline_enabled", False),
        "by_category": data.get("by_category", {}),
        "totals": {
            "avg_grounded_ratio": _avg("grounded_ratio"),
            "avg_computed_confidence": _avg("computed_confidence"),
            "avg_citation_density": _avg("citation_density_per_100w"),
            "avg_distinct_domains": _avg("distinct_domains"),
            "total_hallucinated_citations": total_halluc,
        },
    }
