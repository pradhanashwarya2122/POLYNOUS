import sys
import warnings
from sqlalchemy import text
from app.database import SessionLocal
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.utils.startup_checks import run_startup_checks
from app.middleware.auth_middleware import extract_user_middleware
from app.middleware.input_sanitizer import input_sanitizer_middleware
from app.utils.fix_users import add_missing_encryption_keys, add_missing_columns
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
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import os
import json
import uuid
from dotenv import load_dotenv
from app.graph.orchestrator import orchestrator, search_node, summarise_node, critic_node, writer_node
from app.graph.debate_graph import debate_graph
from app.state import AgentState
from typing import Optional
import asyncio, time
from sqlalchemy.orm import Session                           # ← ADDED

# Database and routes
from app.database import init_db, get_db, check_database_connection
from app.models.user import User
from app.routes.auth import router as auth_router, decode_token  # ← ADDED decode_token
from app.routes.conversations import router as conversations_router

# Chat History imports
from app.chat_history import save_chat, save_debate, get_chat_history, get_debate_history

# User Memory Graph (for debug)
from app.knowledge_graph.user_memory import user_memory

# Visual pipeline imports
from app.visual.builder import build_visual_patch, init_visual_state, _log
from app.visual.events import ProgressBus
from app.llm_providers import LLM_PROVIDERS, resolve_model

# ── Strict BYO-key policy ────────────────────────────────────────────────────
# LLM calls NEVER fall back to environment/system keys. Every request must
# carry the authenticated user's own decrypted key; anything else gets a
# clear error frame. (Tavily search remains a system-managed service.)


def _resolve_stream_key(user, user_api_key, provider, client_ip):
    """Returns (provider, key, error_message)."""
    if user is not None and user_api_key:
        return provider, user_api_key, None
    if user is not None:
        return provider, None, (
            f"No {provider.upper()} API key configured for your account. "
            "Add your key in Settings → API Keys."
        )
    return provider, None, (
        "Sign in and add your own API key in Settings to run research — "
        "guest sessions cannot use system keys."
    )

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

# 1. CORS – must be first
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Length",
        "Content-Type",
        "Set-Cookie",
    ],
    max_age=3600,
)

# 2. Security headers
app.middleware("http")(security_headers_middleware)
app.middleware("http")(extract_user_middleware)
app.middleware("http")(input_sanitizer_middleware)

# ============================================================
# AUTH DEPENDENCY — Available for all routes
# ============================================================
from app.routes.auth import get_current_user

# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup():
    check_critical_dependencies()
    
    try:
        init_db()
        print("✅ Database initialized!")
        add_missing_columns()
        add_missing_encryption_keys()
        run_startup_checks()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if os.getenv("ENVIRONMENT", "").lower() == "production":
            raise

    # Verify Neo4j on startup
    try:
        from app.knowledge_graph.graph_manager import kg
        if kg.driver:
            kg.driver.verify_connectivity()
            print("✅ Neo4j verified on startup")
        else:
            print("❌ Neo4j driver not initialized — memory features will use SQLite fallback")
    except Exception as e:
        print(f"❌ Neo4j startup check failed: {e}")

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
    db_healthy, db_msg = check_database_connection()
    return {
        "system": "POLYNOUS",
        "tagline": "Many Minds, One Answer",
        "version": "3.0",
        "database": "connected" if db_healthy else "disconnected",
        "endpoints": ["/ask", "/ask-stream", "/ask-visual", "/health", "/health/neo4j", "/auth/register", "/auth/login", "/auth/refresh", "/conversations"]
    }

@app.get("/health")
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

@app.get("/health/neo4j")
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

@app.get("/history/chats")
async def chat_history(session_id: str = None, limit: int = 20):
    return {"history": get_chat_history(session_id, limit)}

@app.get("/debug/cors")
async def debug_cors():
    return {"allowed_origins": ALLOWED_ORIGINS}

@app.get("/debug/user-memory")
async def debug_user_memory(request: Request):
    user_id = getattr(request.state, 'user_public_id', 'guest')
    stats = user_memory.get_user_stats(user_id)
    interests = user_memory.get_user_interests(user_id)
    history = user_memory.get_recent_research(user_id)
    return {"user_id": user_id, "stats": stats, "interests": interests, "history": history}

@app.get("/history/debates")
async def debate_history(session_id: str = None, limit: int = 20):
    return {"history": get_debate_history(session_id, limit)}

# ========== RESEARCH / DEBATE ==========
@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest, req: Request, db=Depends(get_db)):
    """Strict user‑owned key – no fallback to system key."""
    
    print("\n" + "=" * 70)
    print("📥 /ask ENDPOINT CALLED")
    print(f"   Query: {request.query[:80]}...")
    print(f"   Mode: {'DEBATE' if request.debate_mode else 'RESEARCH'}")
    
    if not is_safe_input(request.query):
        raise HTTPException(status_code=400, detail="Invalid query detected")
    request.query = sanitize_query(request.query)
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    user_public_id = getattr(req.state, 'user_public_id', None)
    user = None
    user_api_key = None
    provider = "anthropic"
    
    if user_public_id:
        user = db.query(User).filter(User.public_id == user_public_id).first()
        if user:
            provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
            encrypted_key = getattr(user, f'{provider}_api_key', None)
            if encrypted_key:
                print(f"🔓 Attempting to decrypt {provider} key (length: {len(encrypted_key)})")
                user_api_key = decrypt_api_key(encrypted_key, user.encryption_key)
                if user_api_key:
                    print(f"🔑 SUCCESS: Using user's {provider.upper()} API key")
                else:
                    print(f"❌ DECRYPTION FAILED for {provider} key")
            else:
                print(f"⚠️ NO BYO KEY FOUND: No encrypted key stored for this provider")
        else:
            print("❌ USER NOT FOUND")
    else:
        print("⚠️ No user_public_id – guest session")
    
    # Strict: no fallback to system key
    if user_api_key is None:
        raise HTTPException(
            status_code=400,
            detail=f"No {provider.upper()} API key configured. Please add your key in Settings → API Keys."
        )
    
    session_id = user_public_id or 'guest'
    print(f"📋 session_id: {session_id}, provider: {provider}, user_api_key: SET")
    
    state = AgentState(
        query=request.query,
        session_id=session_id,
        user=user,
        user_api_key=user_api_key,
        preferred_provider=provider,
        model=(resolve_model(user, provider) if user else None),
        retrieved_docs=[], summaries=[], critique={}, final_answer="", citations=[],
        debate_mode=request.debate_mode, debate_history=[], judge_verdict={},
        errors=[], warnings=[], current_agent="start",
        response_style=request.response_style,
    )
    
    try:
        if request.debate_mode:
            print("🗣️ DEBATE MODE ACTIVATED")
            result = debate_graph.invoke(state)
            save_debate(session_id=session_id, topic=request.query,
                        for_score=result.get('judge_verdict', {}).get('for_score', 5),
                        against_score=result.get('judge_verdict', {}).get('against_score', 5),
                        winner=result.get('judge_verdict', {}).get('winner', 'TIE'))
        else:
            print("🔬 RESEARCH MODE ACTIVATED")
            result = orchestrator.invoke(state)
            save_chat(session_id=session_id, query=request.query,
                      answer=result.get('final_answer', ''),
                      confidence=result.get('critique', {}).get('overall_confidence', 0))
        print("✅ ORCHESTRATOR COMPLETED")
    except Exception as e:
        print(f"❌ ORCHESTRATOR FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Research request failed. Please rephrase your query.")
    
    citations = result.get('citations', [])
    final_answer = result.get('final_answer', '')
    critique = result.get('critique', {})
    verdict = result.get('judge_verdict', {})
    
    sources = [{"number": i+1, "title": c.get('title','')[:150], "url": c.get('url','')} for i, c in enumerate(citations)]
    return QueryResponse(answer=final_answer, sources=sources,
                         confidence=critique.get('overall_confidence', 0),
                         contradictions=critique.get('contradictions', []),
                         debate_verdict=verdict if verdict else {})

# ========== STREAMING ==========
@app.post("/ask-stream")
async def ask_stream(request: QueryRequest, req: Request):
    """Streaming – strict user key, no fallback."""
    
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
            user_api_key = None
            provider = "anthropic"
            if user_public_id:
                user = db.query(User).filter(User.public_id == user_public_id).first()
                if user:
                    provider = getattr(user, 'preferred_provider', 'anthropic') or 'anthropic'
                    encrypted_key = getattr(user, f'{provider}_api_key', None)
                    if encrypted_key:
                        user_api_key = decrypt_api_key(encrypted_key, user.encryption_key)
            
            if user_api_key is None:
                yield f"data: {json.dumps({'type': 'error', 'message': f'No {provider.upper()} API key configured. Please add your key in Settings.'})}\n\n"
                return
            
            session_id = user_public_id or 'guest'
            state = AgentState(
                query=request.query, session_id=session_id, user=user,
                user_api_key=user_api_key, preferred_provider=provider,
                model=(resolve_model(user, provider) if user else None),
                retrieved_docs=[], summaries=[], critique={}, final_answer="", citations=[],
                debate_mode=request.debate_mode, debate_history=[], judge_verdict={},
                errors=[], warnings=[], current_agent="",
                response_style=request.response_style,
            )
            
            mode_name = "debate" if request.debate_mode else "research"
            yield f"data: {json.dumps({'type': 'start', 'mode': mode_name})}\n\n"
            
            # ── REAL per-node progress: each event fires when that agent
            #    actually starts/finishes, streamed live via a thread bus —
            #    not pre-announced strings before any work happens.
            loop = asyncio.get_event_loop()
            bus = ProgressBus()
            state["_progress_bus"] = bus

            async def _run_node_streaming(agent_label, node_fn):
                yield f"data: {json.dumps({'type': 'progress', 'agent': agent_label, 'message': f'{agent_label.title()} agent working...'})}\n\n"
                future = loop.run_in_executor(None, node_fn, state)
                while not future.done():
                    ev = bus.get_nowait()
                    if ev is None:
                        await asyncio.sleep(0.15)
                        continue
                    yield f"data: {json.dumps({'type': 'progress', 'agent': agent_label, 'message': ev['msg']})}\n\n"
                while (ev := bus.get_nowait()) is not None:
                    yield f"data: {json.dumps({'type': 'progress', 'agent': agent_label, 'message': ev['msg']})}\n\n"
                updated = future.result()
                state.update(updated if isinstance(updated, dict) else {})

            try:
                if request.debate_mode:
                    from app.graph.debate_graph import (
                        debate_search_node, for_agent_node, against_agent_node,
                        for_rebuttal_node, against_rebuttal_node, judge_node,
                    )
                    debate_pipeline = [
                        ("search", debate_search_node), ("for", for_agent_node),
                        ("against", against_agent_node), ("for", for_rebuttal_node),
                        ("against", against_rebuttal_node), ("judge", judge_node),
                    ]
                    for agent_label, node_fn in debate_pipeline:
                        async for frame in _run_node_streaming(agent_label, node_fn):
                            yield frame
                    result = state
                    if result.get('judge_verdict'):
                        yield f"data: {json.dumps({'type': 'verdict', 'verdict': result['judge_verdict']})}\n\n"
                    save_debate(session_id=session_id, topic=request.query,
                                for_score=result.get('judge_verdict', {}).get('for_score', 0),
                                against_score=result.get('judge_verdict', {}).get('against_score', 0),
                                winner=result.get('judge_verdict', {}).get('winner', 'UNSCORED'))
                else:
                    # Same conditional routing as the compiled LangGraph:
                    # no sources → straight to writer; critic parse failure
                    # → one retry pass.
                    async for frame in _run_node_streaming("search", search_node):
                        yield frame
                    if state.get('retrieved_docs'):
                        async for frame in _run_node_streaming("summarise", summarise_node):
                            yield frame
                        async for frame in _run_node_streaming("critic", critic_node):
                            yield frame
                        if (state.get('critique') or {}).get('parse_failed') and state.get('critic_retries', 0) <= 1:
                            async for frame in _run_node_streaming("critic", critic_node):
                                yield frame
                    async for frame in _run_node_streaming("writer", writer_node):
                        yield frame
                    result = state
                    confidence = result.get('critique', {}).get('overall_confidence', 0)
                    yield f"data: {json.dumps({'type': 'confidence', 'score': confidence})}\n\n"
                    save_chat(session_id=session_id, query=request.query,
                              answer=result.get('final_answer', ''), confidence=confidence)
                
                answer = result.get('final_answer', '')
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


# ========== VISUAL STREAMING (FIXED) ==========
@app.post("/ask-visual")
async def ask_visual(request: Request, db: Session = Depends(get_db)):
    """
    Stream visual research data for the NeuralResearchEngine component.
    """
    body = await request.json()
    query = body.get("query", "")
    response_style = body.get("response_style", "")

    # ── Sanitize (same policy as /ask and /ask-stream) ──
    if not query or not is_safe_input(query):
        raise HTTPException(400, "Invalid or empty query")
    query = sanitize_query(query)
    if not query:
        raise HTTPException(400, "query required")

    # ── Extract user + derive (provider, key) as a MATCHED PAIR ──
    user = None
    user_api_key = None
    provider = "anthropic"

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = decode_token(token, expected_type="access")
            user_id = int(payload.get("sub", 0))
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # 1) Try the user's preferred provider first
                preferred = getattr(user, "preferred_provider", "anthropic") or "anthropic"
                candidates = [preferred] + [p for p in LLM_PROVIDERS if p != preferred]
                # 2) Use the first provider that has a decryptable key —
                #    provider and key always travel together now.
                for p in candidates:
                    encrypted = getattr(user, f"{p}_api_key", None)
                    if encrypted:
                        decrypted = decrypt_api_key(encrypted, user.encryption_key)
                        if decrypted:
                            provider = p
                            user_api_key = decrypted
                            break
        except Exception:
            pass  # user stays None → guest policy below

    # ── SECURITY GUARD: authed users MUST use their own key; guests get an
    #    explicit rate-limited allowance — never a silent system-key charge.
    provider, user_api_key, key_error = _resolve_stream_key(
        user, user_api_key, provider,
        request.client.host if request.client else "unknown",
    )
    if key_error:
        async def error_stream():
            yield f"data: {json.dumps({'error': key_error})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    async def event_stream():
        start_time = time.time()
        visual = init_visual_state(query)
        yield f"data: {json.dumps(visual)}\n\n"

        state = {
            "query": query,
            "retrieved_docs": [],
            "summaries": [],
            "critique": {},
            "final_answer": "",
            "citations": [],
            "debate_mode": False,
            "debate_history": [],
            "judge_verdict": {},
            "errors": [],
            "warnings": [],
            "current_agent": "",
            # ── FIX: matched provider/key pair, plus preferred_provider so
            #    _get_provider() in the orchestrator resolves consistently ──
            "provider": provider,
            "preferred_provider": provider,
            "user_api_key": user_api_key,
            "model": resolve_model(user, provider) if user else None,
            "response_style": response_style,
            "session_id": (getattr(user, "public_id", None) or "guest"),
            "user": user,
        }

        loop = asyncio.get_event_loop()

        # Thread-safe bus: nodes emit fine-grained progress from executor
        # threads; this generator drains it into SSE patches while they run.
        bus = ProgressBus()
        state["_progress_bus"] = bus

        def _event_to_patch(ev: dict) -> dict:
            patch = dict(ev.get("patch") or {})
            patch["logs"] = _log(state, ev["agent"], ev["msg"], time.time() - start_time)
            patch["elapsedSeconds"] = round(time.time() - start_time, 1)
            return patch

        # Ordered pipeline — node runs FIRST, patch built AFTER (real data).
        pipeline = [
            ("Search",    search_node,    {"label": "Searching",   "sub": "Querying Tavily and scraping…"}),
            ("Summarise", summarise_node, {"label": "Summarising", "sub": "Extracting key points…"}),
            ("Critic",    critic_node,    {"label": "Critiquing",  "sub": "Cross-checking claims…"}),
            ("Writer",    writer_node,    {"label": "Writing",     "sub": "Drafting research digest…"}),
        ]

        for agent_name, node_fn, phase in pipeline:
            # announce agent start (panel leaves Idle, lane shows working)
            yield f"data: {json.dumps({'agents': {agent_name: {'progress': 10, 'phase': phase}}, 'lanes': {agent_name: {'sub': '', 'status': 'working'}}})}\n\n"

            # run blocking node in a thread; stream bus events while it works
            future = loop.run_in_executor(None, node_fn, state)
            while not future.done():
                ev = bus.get_nowait()
                if ev is None:
                    await asyncio.sleep(0.15)
                    continue
                yield f"data: {json.dumps(_event_to_patch(ev))}\n\n"

            # drain any events emitted just before the node finished
            while (ev := bus.get_nowait()) is not None:
                yield f"data: {json.dumps(_event_to_patch(ev))}\n\n"

            try:
                nonlocal_state = future.result()
                state.update(nonlocal_state if isinstance(nonlocal_state, dict) else {})
            except Exception as e:
                yield f"data: {json.dumps({'error': f'{agent_name} agent failed: {str(e)[:200]}'})}\n\n"
                return

            elapsed = time.time() - start_time
            patch = build_visual_patch(state, agent_name, elapsed)
            yield f"data: {json.dumps(patch)}\n\n"

        # ── Final diagnostics patch (elapsed recomputed — fix #4) ──
        elapsed = time.time() - start_time
        final_patch = build_visual_patch(state, "Final", elapsed)
        # Ship the answer + citations so the digest can render from this stream
        final_patch["final_answer"] = state.get("final_answer", "")
        final_patch["citations"] = state.get("citations", [])
        yield f"data: {json.dumps(final_patch)}\n\n"

        # Persist chat history (this stream is now the single research
        # pipeline — /ask-stream is no longer duplicated alongside it).
        try:
            save_chat(
                session_id=state["session_id"],
                query=query,
                answer=state.get("final_answer", ""),
                confidence=(state.get("critique") or {}).get("overall_confidence", 0) or 0,
            )
        except Exception as e:
            print(f"⚠️ save_chat failed for visual stream: {e}")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/debate-visual")
async def debate_visual(request: Request, db: Session = Depends(get_db)):
    """
    Stream live adversarial-debate data for the DebateEngine component.
    Mirror of /ask-visual for the 6-stage debate pipeline.
    """
    from app.graph.debate_graph import (
        debate_search_node, for_agent_node, against_agent_node,
        for_rebuttal_node, against_rebuttal_node, judge_node,
    )
    from app.visual.debate_builder import init_debate_visual_state, build_debate_patch

    body = await request.json()
    query = body.get("query", "")
    response_style = body.get("response_style", "")

    if not query or not is_safe_input(query):
        raise HTTPException(400, "Invalid or empty query")
    query = sanitize_query(query)
    if not query:
        raise HTTPException(400, "query required")

    # ── Matched provider/key pair (same policy as /ask-visual) ──
    user = None
    user_api_key = None
    provider = "anthropic"
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = decode_token(token, expected_type="access")
            user_id = int(payload.get("sub", 0))
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                preferred = getattr(user, "preferred_provider", "anthropic") or "anthropic"
                candidates = [preferred] + [p for p in LLM_PROVIDERS if p != preferred]
                for p in candidates:
                    encrypted = getattr(user, f"{p}_api_key", None)
                    if encrypted:
                        decrypted = decrypt_api_key(encrypted, user.encryption_key)
                        if decrypted:
                            provider = p
                            user_api_key = decrypted
                            break
        except Exception:
            pass  # user stays None → guest policy below

    # ── SECURITY GUARD: same policy as /ask-visual.
    provider, user_api_key, key_error = _resolve_stream_key(
        user, user_api_key, provider,
        request.client.host if request.client else "unknown",
    )
    if key_error:
        async def error_stream():
            yield f"data: {json.dumps({'error': key_error})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    async def event_stream():
        start_time = time.time()
        yield f"data: {json.dumps(init_debate_visual_state(query))}\n\n"

        state = {
            "query": query,
            "retrieved_docs": [],
            "summaries": [],
            "critique": {},
            "final_answer": "",
            "citations": [],
            "debate_mode": True,
            "debate_history": [],
            "judge_verdict": {},
            "errors": [],
            "warnings": [],
            "current_agent": "",
            "provider": provider,
            "preferred_provider": provider,
            "user_api_key": user_api_key,
            "model": resolve_model(user, provider) if user else None,
            "response_style": response_style,
            "session_id": (getattr(user, "public_id", None) or "guest"),
            "user": user,
        }

        loop = asyncio.get_event_loop()
        bus = ProgressBus()
        state["_progress_bus"] = bus

        def _event_to_patch(ev: dict) -> dict:
            patch = dict(ev.get("patch") or {})
            patch["logs"] = _log(state, ev["agent"], ev["msg"], time.time() - start_time)
            patch["elapsedSeconds"] = round(time.time() - start_time, 1)
            return patch

        stage_panel = {"Search": "Evidence", "FOR-opening": "FOR", "AGAINST-opening": "AGAINST",
                       "FOR-rebuttal": "FOR", "AGAINST-rebuttal": "AGAINST", "Judge": "Judge"}
        pipeline = [
            ("Search",           debate_search_node,    {"label": "Gathering evidence", "sub": "Querying the web…"}),
            ("FOR-opening",      for_agent_node,        {"label": "FOR opening",        "sub": "Building the supporting case…"}),
            ("AGAINST-opening",  against_agent_node,    {"label": "AGAINST opening",    "sub": "Building the counter case…"}),
            ("FOR-rebuttal",     for_rebuttal_node,     {"label": "FOR rebuttal",       "sub": "Countering the opposition…"}),
            ("AGAINST-rebuttal", against_rebuttal_node, {"label": "AGAINST rebuttal",   "sub": "Countering the support…"}),
            ("Judge",            judge_node,            {"label": "Judging",            "sub": "Scoring rubric + argument quality…"}),
        ]

        for stage_name, node_fn, stage_label in pipeline:
            announce = {
                "stage": stage_label,
                "panels": {stage_panel[stage_name]: {"phase": {"label": stage_label["label"], "sub": stage_label["sub"]}}},
            }
            yield f"data: {json.dumps(announce)}\n\n"

            future = loop.run_in_executor(None, node_fn, state)
            while not future.done():
                ev = bus.get_nowait()
                if ev is None:
                    await asyncio.sleep(0.15)
                    continue
                yield f"data: {json.dumps(_event_to_patch(ev))}\n\n"
            while (ev := bus.get_nowait()) is not None:
                yield f"data: {json.dumps(_event_to_patch(ev))}\n\n"

            try:
                updated = future.result()
                state.update(updated if isinstance(updated, dict) else {})
            except Exception as e:
                yield f"data: {json.dumps({'error': f'{stage_name} failed: {str(e)[:200]}'})}\n\n"
                return

            yield f"data: {json.dumps(build_debate_patch(state, stage_name, time.time() - start_time))}\n\n"

        # Final patch (judge_node already persisted via save_debate — do NOT
        # save again here; the old /ask-stream path double-saved).
        yield f"data: {json.dumps(build_debate_patch(state, 'Final', time.time() - start_time))}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ========== DEBUG ENDPOINT ==========
@app.get("/debug/last-key")
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

@app.get("/stats/vector-count")
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

# ============================================================
# EXCEPTION HANDLERS
# ============================================================

# 1. Handle HTTP exceptions (400, 401, 403, 404, 500 etc.)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "type": "http_error",
            "message": str(exc.detail),
            "status_code": exc.status_code,
        },
    )

# 2. Handle validation errors (422 – missing fields, bad types)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "type": "validation_error",
            "message": "Validation error",
            "detail": {"errors": errors[:5]},
        },
    )

# 3. Catch ALL unhandled exceptions (500 – internal server errors)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    is_production = os.getenv("ENVIRONMENT") == "production"
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "type": "internal_error",
            "message": "An internal error occurred" if is_production else str(exc),
            "status_code": 500,
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)