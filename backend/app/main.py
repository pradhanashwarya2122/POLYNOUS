import sys
import warnings
from sqlalchemy import text
from app.middleware.auth_middleware import extract_user_middleware
from app.middleware.input_sanitizer import input_sanitizer_middleware
from app.middleware.security_headers import security_headers_middleware
from app.utils.sanitizer import sanitize_query, is_safe_input
from app.routes.api_keys import router as api_keys_router
from app.routes.settings_extended import router as settings_ext_router
from app.routes.user_stats import router as user_stats_router
from app.routes.pdfs import router as pdfs_router
from app.routes.memory import router as memory_router
from app.routes.semantic_search import router as search_router

from app.routes.knowledge import router as knowledge_router
from app.routes.oauth import router as oauth_router
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse  # ← Added JSONResponse
from pydantic import BaseModel
import os
import json
import uuid
from dotenv import load_dotenv
from app.graph.orchestrator import orchestrator
from app.graph.debate_graph import debate_graph
from app.state import AgentState
from typing import Optional


# Database and routes
from app.database import init_db, get_db, check_database_connection  # ← Added imports
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router

# ========== NEW: Chat History imports ==========
from app.chat_history import save_chat, save_debate, get_chat_history, get_debate_history

load_dotenv()

# ============================================================
# CORS CONFIGURATION
# ============================================================

# ✅ FIXED: Explicit origins only — NO wildcards with allow_credentials=True
# This is required because browsers reject wildcard origins when credentials are sent.
# Each frontend URL that needs cookie/OAuth support must be listed explicitly.

ALLOWED_ORIGINS = [
    # ── Local Development ──────────────────────────────────
    "http://localhost:5173",          # Vite default
    "http://localhost:5174",          # Vite alternate
    "http://localhost:3000",          # React / Next.js
    "http://127.0.0.1:5173",         # Vite via IP
    "http://127.0.0.1:5174",         # Vite alternate via IP
    
    # ── Cloudflare Pages (Production Frontend) ──────────────
    "https://polynous.pages.dev",     # Main production URL
    
    # ── Custom Domain (if you have one) ─────────────────────
    # "https://app.polynous.ai",      # Uncomment and update
    
    # ── Environment Variable Override ───────────────────────
    # Set FRONTEND_URL in Railway dashboard to add custom domains dynamically
]

# Add environment variable if set (supports comma-separated for multiple URLs)
env_frontend = os.getenv("FRONTEND_URL", "").strip()
if env_frontend:
    for url in env_frontend.split(","):
        url = url.strip()
        if url and url not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(url)

# Remove empty strings and duplicates
ALLOWED_ORIGINS = list(set([url for url in ALLOWED_ORIGINS if url]))

print(f"🌐 Allowed CORS origins: {ALLOWED_ORIGINS}")

# ========== CRITICAL DEPENDENCY CHECKER ==========
def check_critical_dependencies():
    """Verify critical dependencies are installed with safe versions"""
    critical = {
        'fastapi': '0.115.0',
        'uvicorn': '0.30.0',
        'sqlalchemy': '2.0.0',
        'cryptography': '41.0.0',
    }
    
    issues = []
    for package, min_version in critical.items():
        try:
            module = __import__(package)
            version = getattr(module, '__version__', '0.0.0')
            
            # Simple version comparison
            if version < min_version:
                issues.append(f"⚠️  {package} {version} < {min_version} (minimum)")
        except ImportError:
            issues.append(f"❌ {package} NOT INSTALLED!")
    
    if issues:
        print("\n" + "=" * 60)
        print("🔒 DEPENDENCY SECURITY WARNING")
        print("=" * 60)
        for issue in issues:
            print(f"  {issue}")
        print("=" * 60 + "\n")

# ========== CREATE APP ==========
app = FastAPI(title="POLYNOUS API")

# ============================================================
# MIDDLEWARE (order matters!)
# ============================================================

# 1. CORS - MUST be first to handle preflight requests
# ⚠️  IMPORTANT: Never use allow_origins=["*"] with allow_credentials=True
#     Browsers will reject the request. Each origin must be explicitly listed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["http://localhost:5174"],  # Fallback to localhost
    allow_credentials=True,        # ← CRITICAL for cookies, OAuth, and auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization", 
        "Content-Type", 
        "X-Requested-With", 
        "Accept", 
        "Origin",
        "Cookie",          # ← Required for refresh token cookie
        "Set-Cookie",      # ← Required for cookie support
    ],
    expose_headers=[
        "Content-Length", 
        "Content-Type",
        "Set-Cookie",      # ← Expose Set-Cookie header to frontend
    ],
    max_age=3600,  # Cache preflight responses for 1 hour
)

# 2. Security headers
app.middleware("http")(security_headers_middleware)

# 3. Auth extraction
app.middleware("http")(extract_user_middleware)

# 4. Input sanitizer
app.middleware("http")(input_sanitizer_middleware)

# ============================================================
# AUTH DEPENDENCY — Available for all routes
# ============================================================
from app.routes.auth import get_current_user

# Make get_current_user available for all routes
# Routes can use: user: User = Depends(get_current_user)

# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup():
    check_critical_dependencies()
    
    # Initialize database
    try:
        init_db()
        print("✅ Database initialized!")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if os.getenv("ENVIRONMENT", "").lower() == "production":
            raise  # Fail fast in production
    
    print(f"🔒 CORS origins: {ALLOWED_ORIGINS}")
    print(f"🔐 allow_credentials: True")
    print(f"🍪 Cookie mode: {'production (secure+sameSite=None)' if os.getenv('ENVIRONMENT') == 'production' else 'development (lax)'}")

# ========== INCLUDE ROUTERS ==========
app.include_router(api_keys_router)
app.include_router(settings_ext_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(user_stats_router)
app.include_router(oauth_router)
app.include_router(knowledge_router)
app.include_router(search_router)
app.include_router(memory_router)  # Only ONE memory router - from app/routes/memory.py
app.include_router(pdfs_router)

# ========== MODELS ==========
class QueryRequest(BaseModel):
    query: str
    debate_mode: bool = False
    session_id: Optional[str] = None
    response_style: Optional[str] = "academic"

class QueryResponse(BaseModel):
    answer: str
    sources: list = []
    confidence: float = 0
    contradictions: list = []
    debate_verdict: dict = {}

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
async def root():
    """Root endpoint — API information"""
    # Check database status
    db_healthy, db_msg = check_database_connection()
    
    return {
        "system": "POLYNOUS",
        "tagline": "Many Minds, One Answer",
        "version": "3.0",
        "database": "connected" if db_healthy else "disconnected",
        "endpoints": [
            "/ask",
            "/ask-stream",
            "/health",
            "/auth/register",
            "/auth/login",
            "/auth/refresh",
            "/conversations"
        ]
    }

@app.get("/health")
async def health():
    """
    Health check endpoint with real database verification.
    
    Returns:
        200 OK with status "healthy" if database is reachable
        503 Service Unavailable if database connection fails
    
    Used by:
        - Railway health checks
        - Cloudflare health checks
        - Monitoring tools
        - Load balancers
    """
    try:
        # Get a fresh database session
        db = next(get_db())
        
        # Execute a simple query to verify connectivity
        db.execute(text("SELECT 1"))
        
        # Close the session
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "agents": 7,
            "version": "3.0",
            "environment": os.getenv("ENVIRONMENT", "development")
        }
        
    except Exception as e:
        # Log the error for debugging
        print(f"❌ Health check failed: {str(e)}")
        
        # Return 503 with details
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e) if os.getenv("ENVIRONMENT") != "production" else "Service unavailable",
                "version": "3.0"
            }
        )

# ========== Chat History Endpoints ==========
@app.get("/history/chats")
async def chat_history(session_id: str = None, limit: int = 20):
    """Get chat history"""
    return {"history": get_chat_history(session_id, limit)}

@app.get("/history/debates")
async def debate_history(session_id: str = None, limit: int = 20):
    """Get debate history"""
    return {"history": get_debate_history(session_id, limit)}

# ========== REMOVED: Duplicate Memory Bank Endpoints ==========
# All memory endpoints are now ONLY in app/routes/memory.py
# This prevents route conflicts and ensures consistency

@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest, req: Request):
    """Research or Debate endpoint"""
    
    # ─── INPUT VALIDATION ─────────────────
    if not is_safe_input(request.query):
        raise HTTPException(status_code=400, detail="Invalid query detected")
    
    request.query = sanitize_query(request.query)
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # ✅ Use authenticated user ID from request.state
    user_public_id = getattr(req.state, 'user_public_id', 'guest')
    session_id = user_public_id
    
    print(f"  👤 User: {session_id}")
    
    state = AgentState(
        query=request.query,
        session_id=session_id,
        retrieved_docs=[],
        summaries=[],
        critique={},
        final_answer="",
        citations=[],
        debate_mode=request.debate_mode,
        debate_history=[],
        judge_verdict={},
        errors=[],
        warnings=[],
        current_agent="start",
        response_style=request.response_style,
    )
    
    try:
        if request.debate_mode:
            print("\n🗣️ DEBATE MODE ACTIVATED")
            result = debate_graph.invoke(state)
            
            # Save debate to chat history
            try:
                save_debate(
                    session_id=session_id,
                    topic=request.query,
                    for_score=result.get('judge_verdict', {}).get('for_score', 5),
                    against_score=result.get('judge_verdict', {}).get('against_score', 5),
                    winner=result.get('judge_verdict', {}).get('winner', 'TIE')
                )
                print("💾 Saved debate to chat history")
            except Exception as e:
                print(f"⚠️ Failed to save debate history: {e}")
        else:
            print("\n    RESEARCH MODE ACTIVATED")
            result = orchestrator.invoke(state)
            
            # Save research to chat history
            try:
                save_chat(
                    session_id=session_id,
                    query=request.query,
                    answer=result.get('final_answer', ''),
                    confidence=result.get('critique', {}).get('overall_confidence', 0)
                )
                print("💾 Saved chat to history")
            except Exception as e:
                print(f"⚠️ Failed to save chat history: {e}")
    except Exception as e:
        print(f"Research/debate error: {e}")
        raise HTTPException(status_code=400, detail="Research request failed. Please rephrase your query.")
    
    citations = result.get('citations', [])
    final_answer = result.get('final_answer', 'No answer generated')
    critique = result.get('critique', {})
    verdict = result.get('judge_verdict', {})
    
    sources = []
    for i, c in enumerate(citations):
        sources.append({
            "number": i + 1,
            "title": c.get('title', 'Untitled')[:150],
            "url": c.get('url', '')
        })
    
    return QueryResponse(
        answer=final_answer,
        sources=sources,
        confidence=critique.get('overall_confidence', 0) if critique else 0,
        contradictions=critique.get('contradictions', []) if critique else [],
        debate_verdict=verdict if verdict else {}
    )

@app.post("/ask-stream")
async def ask_stream(request: QueryRequest, req: Request):
    """Streaming endpoint"""
    
    # ─── INPUT VALIDATION ─────────────────
    if not is_safe_input(request.query):
        raise HTTPException(status_code=400, detail="Invalid query detected")
    
    request.query = sanitize_query(request.query)
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    async def gen():
        # ✅ Use authenticated user ID from request.state
        user_public_id = getattr(req.state, 'user_public_id', 'guest')
        session_id = user_public_id
        
        print(f"  👤 User (stream): {session_id}")
        
        state = AgentState(
            query=request.query,
            session_id=session_id,
            retrieved_docs=[], summaries=[], critique={}, final_answer="", citations=[],
            debate_mode=request.debate_mode, debate_history=[], judge_verdict={},
            errors=[], warnings=[], current_agent="",
            response_style=request.response_style,
        )
        
        mode_name = "debate" if request.debate_mode else "research"
        yield f"data: {json.dumps({'type': 'start', 'mode': mode_name})}\n\n"
        
        try:
            if request.debate_mode:
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'search', 'message': 'Searching debate sources...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'for', 'message': 'Building FOR argument...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'against', 'message': 'Building AGAINST argument...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'judge', 'message': 'Judge evaluating...'})}\n\n"
                result = debate_graph.invoke(state)
                if result.get('judge_verdict'):
                    yield f"data: {json.dumps({'type': 'verdict', 'verdict': result['judge_verdict']})}\n\n"
                
                # Save debate
                try:
                    save_debate(
                        session_id=session_id,
                        topic=request.query,
                        for_score=result.get('judge_verdict', {}).get('for_score', 5),
                        against_score=result.get('judge_verdict', {}).get('against_score', 5),
                        winner=result.get('judge_verdict', {}).get('winner', 'TIE')
                    )
                except Exception as e:
                    print(f"⚠️ Failed to save debate in stream: {e}")
            else:
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'search', 'message': 'Searching web sources...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'summarise', 'message': 'Summarizing documents...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'critic', 'message': 'Critiquing claims...'})}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'agent': 'writer', 'message': 'Writing final answer...'})}\n\n"
                result = orchestrator.invoke(state)
                confidence = result.get('critique', {}).get('overall_confidence', 0)
                yield f"data: {json.dumps({'type': 'confidence', 'score': confidence})}\n\n"
                
                # Save research
                try:
                    save_chat(
                        session_id=session_id,
                        query=request.query,
                        answer=result.get('final_answer', ''),
                        confidence=confidence
                    )
                except Exception as e:
                    print(f"⚠️ Failed to save chat in stream: {e}")
            
            answer = result.get('final_answer', 'No answer')
            words = answer.split()
            for i in range(0, len(words), 3):
                chunk = ' '.join(words[i:i+3])
                yield f"data: {json.dumps({'type': 'token', 'content': chunk + ' '})}\n\n"
            
            yield f"data: {json.dumps({'type': 'citations', 'citations': result.get('citations', [])})}\n\n"
            yield f"data: {json.dumps({'type': 'end'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Research request failed. Please rephrase your query.'})}\n\n"
    
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/stats/vector-count")
async def vector_count():
    """Return actual vector count from semantic search"""
    try:
        from app.semantic_search import semantic_search
        
        # Count from fallback memory
        memory_count = len(semantic_search.fallback_memory) if hasattr(semantic_search, 'fallback_memory') else 0
        
        # Try Pinecone count
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)