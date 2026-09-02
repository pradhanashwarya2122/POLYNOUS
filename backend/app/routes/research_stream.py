"""
app/routes/research_stream.py

The streaming research + debate endpoints, split out of main.py (Phase 7,
pure refactor — no route paths or behavior changed):

    POST /ask            POST /ask-stream     POST /ask-visual
    POST /debate-vote    POST /debate-visual

plus the strict BYO-key resolver (_resolve_stream_key). All routing/streaming
mechanics live in the compiled LangGraph graphs and app/visual/graph_stream.py
(Phase 2); this module only wires the HTTP layer to them.
"""
import asyncio
import json
import time

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.utils.sanitizer import sanitize_query, is_safe_input
from app.state import AgentState
from app.chat_history import save_chat, save_debate
from app.llm_providers import resolve_model, LLM_PROVIDERS
from app.routes.auth import decode_token
from app.graph.orchestrator import orchestrator, RESEARCH_NODE_TO_PANEL, RESEARCH_NODE_PHASE
from app.graph.debate_graph import (
    debate_graph, DEBATE_NODE_TO_STAGE, DEBATE_STAGE_TO_PANEL, DEBATE_STAGE_PHASE,
)
from app.visual.graph_stream import stream_compiled_graph
from app.visual.builder import build_visual_patch, init_visual_state, _log
from app.visual.events import ProgressBus

router = APIRouter()


# User-selectable number of sources to scrape. Bounded so a user can't ask for
# 0 (nothing to research) or an unbounded flood that blows latency/cost.
SCRAPE_MIN, SCRAPE_MAX = 3, 20


def _clamp_scrape(value):
    """Return an int in [SCRAPE_MIN, SCRAPE_MAX], or None if not specified."""
    try:
        if value in (None, "", 0, "0"):
            return None
        n = int(value)
    except (TypeError, ValueError):
        return None
    return max(SCRAPE_MIN, min(SCRAPE_MAX, n))


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


@router.post("/ask", response_model=QueryResponse)
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
            from app.graph.orchestrator import headline_confidence as _hc
            save_chat(session_id=session_id, query=request.query,
                      answer=result.get('final_answer', ''),
                      confidence=_hc(result))
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
    from app.graph.orchestrator import headline_confidence
    return QueryResponse(answer=final_answer, sources=sources,
                         confidence=headline_confidence(result),
                         contradictions=critique.get('contradictions', []),
                         debate_verdict=verdict if verdict else {})

# ========== STREAMING ==========
@router.post("/ask-stream")
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

            # ── Streamed through the SAME compiled graph /ask-visual and
            #    /debate-visual use — no duplicated pipeline or routing
            #    logic lives here, only this endpoint's own frame shape.
            loop = asyncio.get_event_loop()
            bus = ProgressBus()
            state["_progress_bus"] = bus
            start_time = time.time()

            def _on_bus_event(ev):
                return f"data: {json.dumps({'type': 'progress', 'agent': ev['agent'], 'message': ev['msg']})}\n\n"

            def _on_error(node_name, exc):
                return f"data: {json.dumps({'type': 'error', 'message': 'Research request failed. Please rephrase your query.'})}\n\n"

            if request.debate_mode:
                def _on_task(node_name):
                    label = DEBATE_NODE_TO_STAGE.get(node_name, node_name).split("-")[0].lower()
                    return f"data: {json.dumps({'type': 'progress', 'agent': label, 'message': f'{label.title()} agent working...'})}\n\n"

                def _on_task_result(node_name, elapsed):
                    return None  # /ask-stream has no rich visual patches — bus events carry the detail

                graph = debate_graph
            else:
                def _on_task(node_name):
                    label = RESEARCH_NODE_TO_PANEL.get(node_name, node_name).lower()
                    if node_name == "deepen":
                        label = "critic"
                    return f"data: {json.dumps({'type': 'progress', 'agent': label, 'message': f'{label.title()} agent working...'})}\n\n"

                def _on_task_result(node_name, elapsed):
                    return None

                graph = orchestrator

            try:
                async for frame in stream_compiled_graph(
                    loop, graph, state, bus,
                    on_task=_on_task,
                    on_task_result=_on_task_result,
                    on_bus_event=_on_bus_event,
                    start_time=start_time,
                    on_error=_on_error,
                ):
                    yield frame
                if state.get("_stream_error"):
                    return

                result = state
                if request.debate_mode:
                    if result.get('judge_verdict'):
                        yield f"data: {json.dumps({'type': 'verdict', 'verdict': result['judge_verdict']})}\n\n"
                    save_debate(session_id=session_id, topic=request.query,
                                for_score=result.get('judge_verdict', {}).get('for_score', 0),
                                against_score=result.get('judge_verdict', {}).get('against_score', 0),
                                winner=result.get('judge_verdict', {}).get('winner', 'UNSCORED'))
                else:
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
@router.post("/ask-visual")
async def ask_visual(request: Request, db: Session = Depends(get_db)):
    """
    Stream visual research data for the NeuralResearchEngine component.
    """
    body = await request.json()
    query = body.get("query", "")
    response_style = body.get("response_style", "")
    force_fresh = bool(body.get("force_fresh", False))   # rerun bypassing cache

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

    # ── FREE-TRIAL GATE: block + disable an expired/used-up GLM trial before
    #    the run so a pooled key can't be abused past its window / run cap.
    if user is not None:
        from app.services import trial as trial_svc
        _ok, _trial_msg = trial_svc.enforce(user, db)
        if not _ok:
            async def _trial_gate():
                yield f"data: {json.dumps({'type': 'error', 'error': _trial_msg, 'message': _trial_msg, 'trial_expired': True})}\n\n"
            return StreamingResponse(_trial_gate(), media_type="text/event-stream")

    # ── ENFORCE the user's saved Research Preferences server-side: if the
    #    request didn't specify a response style, fall back to the account's
    #    saved default so the preference actually takes effect regardless of
    #    what the client sends.
    if not response_style and user is not None:
        response_style = (getattr(user, "preferences", None) or {}).get("response_style", "") or ""

    # ── User-chosen number of sources to scrape. Request value wins; else the
    #    account's saved default; clamped to a sane range either way. ──
    max_results = _clamp_scrape(body.get("max_results"))
    if max_results is None and user is not None:
        max_results = _clamp_scrape((getattr(user, "preferences", None) or {}).get("scrape_count"))

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

    cache_user_id = getattr(user, "public_id", None) or "guest"

    async def event_stream():
        start_time = time.time()
        visual = init_visual_state(query)
        yield f"data: {json.dumps(visual)}\n\n"

        # ── Research cache (Phase 6): a fresh per-user hit skips the whole
        #    pipeline and streams the stored report back honestly. ──
        if not force_fresh:
            from app.services import research_cache as _rc
            cached = _rc.get_cached(db, cache_user_id, query, provider)
            if cached:
                cache_log = {"logs": [{"id": 1, "agentName": "Search",
                    "msg": f"Retrieved from research cache ({cached['age_label']}) — no tokens spent",
                    "timeStr": "00:00"}]}
                yield f"data: {json.dumps(cache_log)}\n\n"
                cached_patch = {
                    "progress": 100,
                    "elapsedSeconds": round(time.time() - start_time, 2),
                    "final_answer": cached["final_answer"],
                    "citations": cached["citations"],
                    "report": cached["report"],
                    "telemetry": cached.get("telemetry"),
                    "cached": True,
                    "cache_age_label": cached["age_label"],
                    "cache_age_seconds": cached["age_seconds"],
                }
                yield f"data: {json.dumps(cached_patch)}\n\n"
                return

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
            "max_results": max_results,
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

        def _on_task(node_name):
            panel = RESEARCH_NODE_TO_PANEL.get(node_name)
            phase = RESEARCH_NODE_PHASE.get(node_name)
            if not panel or not phase:
                return None
            return f"data: {json.dumps({'agents': {panel: {'progress': 10, 'phase': phase}}, 'lanes': {panel: {'sub': '', 'status': 'working'}}})}\n\n"

        def _on_task_result(node_name, elapsed):
            panel = RESEARCH_NODE_TO_PANEL.get(node_name, node_name)
            return f"data: {json.dumps(build_visual_patch(state, panel, elapsed))}\n\n"

        # The compiled graph (app/graph/orchestrator.py) is the ONLY place
        # routing decisions live now — no-docs bail, critic parse-failure
        # retry, and the Phase-1 gap-driven deepen loop all fire for real
        # here via LangGraph's own node execution, not a duplicated list.
        async for frame in stream_compiled_graph(
            loop, orchestrator, state, bus,
            on_task=_on_task,
            on_task_result=_on_task_result,
            on_bus_event=lambda ev: f"data: {json.dumps(_event_to_patch(ev))}\n\n",
            start_time=start_time,
        ):
            yield frame
        if state.get("_stream_error"):
            return

        # ── Final diagnostics patch (elapsed recomputed — fix #4) ──
        elapsed = time.time() - start_time
        final_patch = build_visual_patch(state, "Final", elapsed)
        # Ship the answer + citations so the digest can render from this stream
        final_patch["final_answer"] = state.get("final_answer", "")
        final_patch["citations"] = state.get("citations", [])
        # Structured writer JSON (Phase 3) — the frontend prefers this over
        # regex-parsing final_answer; parse_failed=True (or a missing/old
        # payload) falls back to the legacy text parser automatically.
        final_patch["report"] = state.get("report")
        # Ship each source's fetched text so "Chat with your report" and the
        # [n] grounding tooltips can work from ONLY what was already retrieved —
        # no new web search, no new scrape spend. The real per-source content
        # lives in retrieved_docs (summaries[] is an unlabeled list of strings);
        # pair the LLM condensation in by index where available, else use the
        # scraped content. Trimmed to keep the frame lean.
        _summaries_list = state.get("summaries") or []
        _src = []
        for i, doc in enumerate(state.get("retrieved_docs") or []):
            if not isinstance(doc, dict):
                continue
            condensed = _summaries_list[i] if i < len(_summaries_list) and isinstance(_summaries_list[i], str) else ""
            text = (condensed or doc.get("content") or "").strip()
            if not text:
                continue
            _src.append({
                "title": (doc.get("title") or "Untitled")[:180],
                "url": doc.get("url") or "",
                "summary": text[:1200],
            })
        final_patch["source_summaries"] = _src[:12]
        # Run telemetry (Phase 6): real token counts + estimated cost + scrape
        # cache hits. All values honest — "—" in the UI where usage is missing.
        from app.utils.usage import summarize_usage
        telemetry = summarize_usage(state.get("usage"))
        final_patch["telemetry"] = telemetry
        final_patch["novelty"] = state.get("novelty")   # Phase F novelty score
        yield f"data: {json.dumps(final_patch)}\n\n"

        from app.graph.orchestrator import headline_confidence as _hc
        run_confidence = _hc(state)

        # ── Store in research cache for 24h (Phase 6) — per user, best-effort ──
        try:
            from app.services import research_cache as _rc
            _rc.store(db, cache_user_id, query, provider,
                      final_answer=state.get("final_answer", ""),
                      report=state.get("report"),
                      citations=state.get("citations", []),
                      confidence=run_confidence,
                      telemetry=telemetry)
        except Exception as e:
            print(f"⚠️ research_cache store failed: {e}")

        # ── Log real token/cost usage for the Settings credits view ──
        try:
            from app.services import usage_log as _ul
            _ul.record_run(db, cache_user_id, "research", telemetry, query=query)
        except Exception as e:
            print(f"⚠️ usage_log record failed: {e}")

        # Persist chat history — honours the user's Auto-save preference.
        auto_save = True
        if user is not None:
            auto_save = (getattr(user, "preferences", None) or {}).get("auto_save", True)
        if auto_save:
            try:
                save_chat(
                    session_id=state["session_id"],
                    query=query,
                    answer=state.get("final_answer", ""),
                    confidence=run_confidence,
                )
            except Exception as e:
                print(f"⚠️ save_chat failed for visual stream: {e}")
        else:
            print("ℹ️ Auto-save off — skipping chat persistence for this run")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/debate-vote")
async def debate_vote(request: Request, db: Session = Depends(get_db)):
    """
    Record whether the user agrees with the judge's verdict. This is REAL
    telemetry — it feeds the Judge Track Record strip in the debate report.
    """
    from app.models import DebateVote
    body = await request.json()
    topic = sanitize_query(body.get("topic", ""))[:500]
    judge_winner = str(body.get("judge_winner", ""))[:20]
    agree = bool(body.get("agree"))
    if not topic or judge_winner not in ("FOR", "AGAINST", "TIE"):
        raise HTTPException(400, "topic and a valid judge_winner are required")
    vote = DebateVote(
        user_id=getattr(request.state, "user_public_id", None),
        topic=topic, judge_winner=judge_winner, user_agrees=agree,
    )
    db.add(vote)
    db.commit()
    total = db.query(DebateVote).count()
    agrees = db.query(DebateVote).filter(DebateVote.user_agrees == True).count()  # noqa: E712
    return {"recorded": True, "sample_size": total,
            "agreement_rate_with_users": round(agrees / total, 2) if total else None}


def _judge_track_record(db) -> dict:
    """Real historical agreement rate between judge verdicts and user votes.
    Honest empty state — null rate until votes actually exist."""
    from app.models import DebateVote
    try:
        total = db.query(DebateVote).count()
        if total == 0:
            return {"sample_size": 0, "agreement_rate_with_users": None}
        agrees = db.query(DebateVote).filter(DebateVote.user_agrees == True).count()  # noqa: E712
        return {"sample_size": total, "agreement_rate_with_users": round(agrees / total, 2)}
    except Exception:
        return {"sample_size": 0, "agreement_rate_with_users": None}


@router.post("/debate-visual")
async def debate_visual(request: Request, db: Session = Depends(get_db)):
    """
    Stream live adversarial-debate data for the DebateEngine component.
    Mirror of /ask-visual for the 6-stage debate pipeline — the compiled
    debate_graph is the only place the FOR→AGAINST→rebuttal ordering
    lives; this endpoint just narrates its real node events over SSE.
    """
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

    # ── FREE-TRIAL GATE: same policy as /ask-visual — block + disable an
    #    expired/used-up GLM trial before the debate runs.
    if user is not None:
        from app.services import trial as trial_svc
        _ok, _trial_msg = trial_svc.enforce(user, db)
        if not _ok:
            async def _trial_gate():
                yield f"data: {json.dumps({'type': 'error', 'error': _trial_msg, 'message': _trial_msg, 'trial_expired': True})}\n\n"
            return StreamingResponse(_trial_gate(), media_type="text/event-stream")

    # Enforce the account's saved response-style preference when unspecified.
    if not response_style and user is not None:
        response_style = (getattr(user, "preferences", None) or {}).get("response_style", "") or ""

    # User-chosen sources to scrape (request → account default → clamp).
    max_results = _clamp_scrape(body.get("max_results"))
    if max_results is None and user is not None:
        max_results = _clamp_scrape((getattr(user, "preferences", None) or {}).get("scrape_count"))

    # ── SECURITY GUARD: same policy as /ask-visual.
    provider, user_api_key, key_error = _resolve_stream_key(
        user, user_api_key, provider,
        request.client.host if request.client else "unknown",
    )
    if key_error:
        async def error_stream():
            yield f"data: {json.dumps({'error': key_error})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # computed before the stream starts — the db session closes with the request
    track_record = _judge_track_record(db)

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
            "max_results": max_results,
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

        def _on_task(node_name):
            stage = DEBATE_NODE_TO_STAGE.get(node_name)
            phase = DEBATE_STAGE_PHASE.get(stage)
            panel = DEBATE_STAGE_TO_PANEL.get(stage)
            if not stage or not phase or not panel:
                return None
            announce = {"stage": phase, "panels": {panel: {"phase": {"label": phase["label"], "sub": phase["sub"]}}}}
            return f"data: {json.dumps(announce)}\n\n"

        def _on_task_result(node_name, elapsed):
            stage = DEBATE_NODE_TO_STAGE.get(node_name, node_name)
            return f"data: {json.dumps(build_debate_patch(state, stage, elapsed))}\n\n"

        # The compiled debate_graph (search → FOR opening → AGAINST opening
        # → FOR rebuttal → AGAINST rebuttal → judge) is the only place this
        # ordering lives now.
        async for frame in stream_compiled_graph(
            loop, debate_graph, state, bus,
            on_task=_on_task,
            on_task_result=_on_task_result,
            on_bus_event=lambda ev: f"data: {json.dumps(_event_to_patch(ev))}\n\n",
            start_time=start_time,
        ):
            yield frame
        if state.get("_stream_error"):
            return

        # Final patch (judge_node already persisted via save_debate — do NOT
        # save again here; the old /ask-stream path double-saved).
        final_patch = build_debate_patch(state, 'Final', time.time() - start_time)
        final_patch["judge_track_record"] = track_record
        # Post-debate analyst output (best-effort; absent keys → report omits them)
        if state.get("cross_exam"):
            final_patch["cross_exam"] = state["cross_exam"]
        if state.get("fallacies"):
            final_patch["fallacies"] = state["fallacies"]
        from app.utils.usage import summarize_usage
        telemetry = summarize_usage(state.get("usage"))
        final_patch["telemetry"] = telemetry
        yield f"data: {json.dumps(final_patch)}\n\n"

        # ── Log real token/cost usage for the Settings credits view ──
        try:
            from app.services import usage_log as _ul
            _dbg_uid = getattr(user, "public_id", None) or "guest"
            _ul.record_run(db, _dbg_uid, "debate", telemetry, query=query)
        except Exception as e:
            print(f"⚠️ usage_log record failed (debate): {e}")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
