import sys
import warnings
from sqlalchemy import text
from app.database import SessionLocal
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.utils.key_resolver import get_user_provider_and_key  # ← NEW: unified helper
from app.middleware.auth_middleware import extract_user_middleware
from app.middleware.input_sanitizer import input_sanitizer_middleware
from app.utils.fix_users import ensure_user_encryption_keys
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
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
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
from app.database import init_db, get_db, check_database_connection
from app.models.user import User  # ✅ FIXED: correct import location
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router

# Chat History imports
from app.chat_history import save_chat, save_debate, get_chat_history, get_debate_history

load_dotenv()

# ============================================================
# CORS CONFIGURATION
# ============================================================

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://polynous.pages.dev",
]

env_frontend = os.getenv("FRONTEND_URL", "").strip()
if env_frontend:
    for url in env_frontend.split(","):
        url = url.strip()
        if url and url not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(url)

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization", 
        "Content-Type", 
        "X-Requested-With", 
        "Accept", 
        "Origin",
        "Cookie",
        "Set-Cookie",
    ],
    expose_headers=[
        "Content-Length", 
        "Content-Type",
        "Set-Cookie",
    ],
    max_age=3600,
)

app.middleware("http")(security_headers_middleware)
app.middleware("http")(extract_user_middleware)
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
        ensure_user_encryption_keys()   # ← new line
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
app.include_router(memory_router)
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
    """Health check endpoint with real database verification."""
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

# ========== Chat History Endpoints ==========
@app.get("/history/chats")
async def chat_history(session_id: str = None, limit: int = 20):
    """Get chat history"""
    return {"history": get_chat_history(session_id, limit)}

@app.get("/history/debates")
async def debate_history(session_id: str = None, limit: int = 20):
    """Get debate history"""
    return {"history": get_debate_history(session_id, limit)}

@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest, req: Request, db=Depends(get_db)):
    """Research or Debate endpoint — user object attached to state with BYO API key."""
    
    print("\n" + "=" * 70)
    print("📥 /ask ENDPOINT CALLED")
    print(f"   Query: {request.query[:80]}...")
    print(f"   Mode: {'DEBATE' if request.debate_mode else 'RESEARCH'}")
    print(f"   Session: {request.session_id or 'not provided'}")
    
    # ─── INPUT VALIDATION ─────────────────
    if not is_safe_input(request.query):
        print("❌ INPUT VALIDATION FAILED: Unsafe input detected")
        raise HTTPException(status_code=400, detail="Invalid query detected")
    
    request.query = sanitize_query(request.query)
    if not request.query:
        print("❌ INPUT VALIDATION FAILED: Empty query after sanitization")
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    print(f"✅ Input validation passed")
    
    # ✅ Fetch the authenticated user from DB using public_id (UUID)
    user_public_id = getattr(req.state, 'user_public_id', None)
    print(f"\n🔍 AUTH MIDDLEWARE STATE:")
    print(f"   user_public_id: {user_public_id}")
    print(f"   user_id: {getattr(req.state, 'user_id', 'N/A')}")
    print(f"   user_email: {getattr(req.state, 'user_email', 'N/A')}")
    print(f"   is_authenticated: {getattr(req.state, 'is_authenticated', False)}")
    
    user = None
    provider = "anthropic"
    user_api_key = None
    
    if user_public_id:
        print(f"\n🔍 LOOKING UP USER IN DATABASE: {user_public_id}")
        user = db.query(User).filter(User.public_id == user_public_id).first()
        
        if user:
            print(f"✅ User found:")
            print(f"   DB id: {user.id}")
            print(f"   email: {user.email}")
            print(f"   preferred_provider: {getattr(user, 'preferred_provider', 'anthropic')}")
            print(f"   anthropic_api_key stored: {bool(user.anthropic_api_key)}")
            print(f"   openai_api_key stored: {bool(user.openai_api_key)}")
            print(f"   encryption_key: {'SET' if user.encryption_key else 'NULL'}")
            
            # ─── TEMP DEBUG: inspect raw key and encryption ─────────────────
            print(f"🔍 DEBUG: user.anthropic_api_key = {user.anthropic_api_key[:50] if user.anthropic_api_key else 'None'}")
            print(f"🔍 DEBUG: user.encryption_key = {user.encryption_key[:20] if user.encryption_key else 'None'}")

            provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
            encrypted_key = getattr(user, f'{provider}_api_key', None)

            if encrypted_key:
                print(f"🔓 Attempting to decrypt {provider} key (length: {len(encrypted_key)})")
                print(f"   User encryption_key: {'SET' if user.encryption_key else 'MISSING'}")
                user_api_key = decrypt_api_key(encrypted_key, user.encryption_key)
                if user_api_key:
                    print(f"🔑 SUCCESS: Using user's {provider.upper()} API key")
                else:
                    print(f"❌ DECRYPTION FAILED for {provider} key")
            else:
                print(f"⚠️ NO BYO KEY FOUND: No encrypted key stored for this provider")
            # ─── END TEMP DEBUG ────────────────────────────────────────────
            
            # ─── USE UNIFIED KEY RESOLVER ─────────────────
            provider, user_api_key = get_user_provider_and_key(user)
            
            if user_api_key:
                print(f"✅ BYO KEY RESOLVED:")
                print(f"   Provider: {provider}")
                print(f"   Key preview: {user_api_key[:15]}...{user_api_key[-4:]}")
                print(f"   Key length: {len(user_api_key)}")
            else:
                print(f"⚠️  NO BYO KEY FOUND:")
                print(f"   Provider: {provider}")
                print(f"   No encrypted key stored for this provider")
                print(f"   Will fall back to system environment variable")
        else:
            print(f"❌ USER NOT FOUND in database for public_id: {user_public_id}")
    else:
        print(f"⚠️  NO user_public_id in request.state — using guest session")
    
    session_id = user_public_id or 'guest'
    print(f"\n📋 FINAL STATE:")
    print(f"   session_id: {session_id}")
    print(f"   user object: {'Present' if user else 'None'}")
    print(f"   provider: {provider}")
    print(f"   user_api_key: {'SET' if user_api_key else 'NOT SET'}")
    
    state = AgentState(
        query=request.query,
        session_id=session_id,
        user=user,
        user_api_key=user_api_key,
        preferred_provider=provider,
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
    
    print(f"\n🚀 INVOKING {'DEBATE' if request.debate_mode else 'RESEARCH'} ORCHESTRATOR...")
    
    try:
        if request.debate_mode:
            print("\n🗣️ DEBATE MODE ACTIVATED")
            result = debate_graph.invoke(state)
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
            print("\n🔬 RESEARCH MODE ACTIVATED")
            result = orchestrator.invoke(state)
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
        
        print(f"\n✅ ORCHESTRATOR COMPLETED SUCCESSFULLY")
        
    except Exception as e:
        print(f"\n❌ ORCHESTRATOR FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Research request failed. Please rephrase your query.")
    
    citations = result.get('citations', [])
    final_answer = result.get('final_answer', 'No answer generated')
    critique = result.get('critique', {})
    verdict = result.get('judge_verdict', {})
    
    print(f"\n📤 RESPONSE SUMMARY:")
    print(f"   Answer length: {len(final_answer)} chars")
    print(f"   Sources: {len(citations)}")
    print(f"   Confidence: {critique.get('overall_confidence', 'N/A')}%")
    print(f"   Debate verdict: {verdict.get('winner', 'N/A') if verdict else 'N/A'}")
    print("=" * 70 + "\n")
    
    sources = [
        {
            "number": i + 1,
            "title": c.get('title', 'Untitled')[:150],
            "url": c.get('url', '')
        }
        for i, c in enumerate(citations)
    ]
    
    return QueryResponse(
        answer=final_answer,
        sources=sources,
        confidence=critique.get('overall_confidence', 0) if critique else 0,
        contradictions=critique.get('contradictions', []) if critique else [],
        debate_verdict=verdict if verdict else {}
    )

@app.post("/ask-stream")
async def ask_stream(request: QueryRequest, req: Request):
    """Streaming endpoint — user object attached to state with BYO API key."""
    
    if not is_safe_input(request.query):
        raise HTTPException(status_code=400, detail="Invalid query detected")
    
    request.query = sanitize_query(request.query)
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    async def gen():
        db = next(get_db())
        try:
            user_public_id = getattr(req.state, 'user_public_id', None)
            user = None
            provider = "anthropic"
            user_api_key = None
            
            if user_public_id:
                user = db.query(User).filter(User.public_id == user_public_id).first()
                if user:
                    provider, user_api_key = get_user_provider_and_key(user)
            
            session_id = user_public_id or 'guest'
            print(f"  👤 User (stream): {session_id} (authenticated: {user is not None})")
            if user_api_key:
                print(f"  🔑 Using user's {provider.upper()} API key (stream)")
            else:
                print(f"  ℹ️  No {provider} key — falling back to system key (stream)")
            
            state = AgentState(
                query=request.query,
                session_id=session_id,
                user=user,
                user_api_key=user_api_key,
                preferred_provider=provider,
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
        finally:
            db.close()

    return StreamingResponse(gen(), media_type="text/event-stream")


# ========== DEBUG: LAST API KEY USED (TESTING ONLY) ==========
@app.get("/debug/last-key")
async def debug_last_key(request: Request, db=Depends(get_db)):
    """
    WARNING: Exposes API key info – only for testing!
    Shows the provider and a preview of the decrypted key for the
    authenticated user.
    """
    user_public_id = getattr(request.state, 'user_public_id', None)
    if not user_public_id:
        return {"error": "Not authenticated"}

    user = db.query(User).filter(User.public_id == user_public_id).first()
    if not user:
        return {"error": "User not found"}

    # Determine provider from user's preference (default anthropic)
    provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
    encrypted_key = getattr(user, f'{provider}_api_key', None)

    if not encrypted_key:
        return {"error": f"No {provider} key stored"}

    try:
        decrypted = decrypt_api_key(encrypted_key, user.encryption_key)
        key_preview = decrypted[:15] + "..." if decrypted else None
        return {
            "provider": provider,
            "key_preview": key_preview,
            "key_used_in_last_request": True
        }
    except Exception as e:
        return {"error": f"Decryption failed: {str(e)}"}


@app.get("/stats/vector-count")
async def vector_count():
    """Return actual vector count from semantic search"""
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)