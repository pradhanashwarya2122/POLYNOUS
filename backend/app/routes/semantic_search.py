from fastapi import APIRouter, Query, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.semantic_search import semantic_search
from app.utils.sanitizer import sanitize_search_query, is_safe_input
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/search", tags=["semantic-search"])

# ============================================================
# HELPER: Get authenticated user ID from request state
# ============================================================
def get_user_id(request: Request) -> str:
    """Extract user public ID from auth middleware"""
    uid = getattr(request.state, 'user_public_id', 'guest')
    return uid if uid and uid != 'unknown' else 'guest'


def _resolve_user(request: Request, db: Session):
    """The authenticated User object (needed for the user's embedding key)."""
    pub = get_user_id(request)
    if pub == 'guest':
        return None
    return db.query(User).filter(User.public_id == pub).first()

# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/")
async def search_memories(
    request: Request,
    query: str = Query(..., description="Search query"),
    top_k: int = Query(12, description="Number of results"),
    mode: Optional[str] = Query(None, description="Filter by mode: research or debate"),
    db: Session = Depends(get_db),
):
    """Semantic search scoped to CURRENT user only, with input sanitization"""
    # --- Input validation & sanitization ---
    if not is_safe_input(query):
        raise HTTPException(status_code=400, detail="Invalid search query")
    query = sanitize_search_query(query)
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # --- User scoping ---
    user_id = get_user_id(request)
    user = _resolve_user(request, db)
    filters = {"mode": mode} if mode else None

    # --- Safe search execution ---
    # FIX: the engine signature is search(user, query, top_k, filters, user_id).
    # The old call passed (query, top_k, filters) into (user, query, top_k), so
    # the embedding key was a string and real vector search never ran (silent
    # keyword fallback). Now it's wired correctly, so MMR-ranked dense search
    # actually executes.
    try:
        results = semantic_search.search(user, query, top_k=top_k, filters=filters, user_id=user_id)
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=400, detail="Search failed due to invalid input")

    return {
        "query": query,
        "user_id": user_id,
        "total_results": len(results),
        "results": results
    }


@router.get("/map")
async def semantic_map(request: Request, db: Session = Depends(get_db)):
    """Phase E: 2D semantic map of the user's research (PCA projection +
    KMeans clusters with auto-labels). Powers the constellation view."""
    from app.services.knowledge_clustering import cluster_research
    user = _resolve_user(request, db)
    return cluster_research(user, user_id=get_user_id(request))


@router.get("/novelty")
async def novelty(request: Request, query: str = Query(...), db: Session = Depends(get_db)):
    """Phase F: novelty score for a query vs the user's existing research."""
    user = _resolve_user(request, db)
    return {"query": query, "novelty": semantic_search.novelty(user, query, user_id=get_user_id(request))}


@router.get("/duplicates")
async def semantic_duplicates(request: Request, db: Session = Depends(get_db)):
    """Phase F: near-duplicate research entries grouped by embedding similarity."""
    from app.services.knowledge_clustering import find_duplicates
    user = _resolve_user(request, db)
    return find_duplicates(user, user_id=get_user_id(request))


@router.get("/suggestions")
async def get_suggestions(
    request: Request,
    query: str = Query(..., description="Partial query for suggestions"),
    limit: int = Query(5)
):
    """Get suggestions scoped to CURRENT user, with input sanitization"""
    # --- Input validation & sanitization ---
    if not is_safe_input(query):
        raise HTTPException(status_code=400, detail="Invalid query")
    query = sanitize_search_query(query)
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # --- User scoping ---
    user_id = get_user_id(request)

    # --- Safe suggestion retrieval ---
    try:
        suggestions = semantic_search.get_suggestions(query, limit, user_id=user_id)
    except Exception:
        suggestions = []   # fail gracefully for suggestions

    return {
        "query": query,
        "user_id": user_id,
        "suggestions": suggestions
    }


@router.get("/stats/vector-count")
async def get_vector_count(request: Request):
    """Get total vectors for CURRENT user"""
    user_id = get_user_id(request)

    try:
        # Count only this user's entries
        total = len([
            entry for entry in semantic_search.fallback_memory
            if entry.get('user_id', 'guest') == user_id
        ]) if hasattr(semantic_search, 'fallback_memory') else 0

        return {"count": total, "user_id": user_id, "status": "ok"}
    except Exception as e:
        return {"count": 0, "status": "error", "message": str(e)}