"""
POLYNOUS Research Orchestrator

LangGraph pipeline: Search -> Summarise -> Critic -> Write

Design principle: the four core agents (search, summarise, critic, write)
are load-bearing — if one fails, the pipeline can't produce a usable
answer, so errors there propagate. Everything downstream of the answer
(knowledge graph writes, semantic indexing, vector store, chat history)
is a best-effort side effect: it's logged on failure but never aborts
the run, since a user should still get their answer even if storage is
temporarily down.
"""
import logging
import time
from typing import Optional

from langgraph.graph import StateGraph, END

from app.state import AgentState
from app.semantic_search import semantic_search
from app.knowledge_graph.hybrid_search import hybrid
from app.knowledge_graph.graph_manager import kg
from app.knowledge_graph.user_memory import user_memory
from app.agents.summariser_agent import summariser_agent
from app.agents.critic_agent import critic_agent
from app.agents.writer_agent import writer_agent
from app.search_agent import search_web
from app.memory.vector_store import store_research
from app.utils.computed_confidence import compute_confidence   # ← NEW
from app.visual.events import make_emitter
from app.llm_providers import OPENAI_COMPATIBLE_BASE_URLS

logger = logging.getLogger("polynous.orchestrator")

STEP_TITLES = {
    "search": "STEP 1: SEARCH AGENT (Hybrid)",
    "summarise": "STEP 2: SUMMARISER AGENT",
    "write": "STEP 4: WRITER AGENT (with Knowledge Graph + User Preferences)",
}


# ============================================================
# SHARED HELPERS
# ============================================================


def _print_header(title: str) -> None:
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def _get_user_id(state: AgentState) -> str:
    user = state.get('user')
    return getattr(user, 'public_id', 'guest') if user else 'guest'


def _get_provider(state: AgentState) -> str:
    """
    Single source of truth for which LLM provider to use.

    Nodes previously disagreed on the state key: summarise/write used
    'preferred_provider' while critic used 'provider'. This reads either,
    preferring 'provider', so a caller that only sets one of them still
    gets consistent behavior across every node.
    """
    return state.get('provider') or state.get('preferred_provider') or 'anthropic'


def _run_side_effect(label: str, fn, *args, **kwargs) -> None:
    """
    Run a best-effort side effect (storage/indexing/history) that should
    never take down the whole pipeline if it fails.
    """
    try:
        fn(*args, **kwargs)
        print(f"  ✅ {label}")
    except Exception as e:
        logger.warning("%s failed: %s", label, e)
        print(f"  ⚠️ {label} error: {e}")


_SIGNAL_NOTES = {
    "source_agreement": "pairwise text overlap between independent sources",
    "domain_diversity": "entropy of source domains, trust-weighted",
    "recency": "publication-date decay (undated sources neutral)",
    "claim_grounding": "share of answer sentences carrying [n] citations",
}


def headline_confidence(result: dict) -> int:
    """The single confidence number to surface for a completed run — the same
    headline the report uses: the mechanical computed score when available,
    else the critic's consensus score, else 0. Fixes the old /ask path that
    returned only critique.overall_confidence (0 whenever the critic's
    citations were all dropped), contradicting the report body."""
    comp = (result.get("computed_confidence") or {}).get("score")
    if isinstance(comp, (int, float)) and comp:
        return int(round(comp))
    crit = (result.get("critique") or {}).get("overall_confidence")
    return int(round(crit)) if isinstance(crit, (int, float)) else 0


def _build_confidence_analysis(computed: dict, critique: dict) -> dict:
    """
    Confidence Analysis — GENERATED FROM MEASURED DATA, never written by
    the LLM, so the numbers cannot be hallucinated. Structured form used
    for report["confidence_analysis"]; _render_confidence_text() below
    renders the same data as legacy prose for backward compatibility.

    Returns: {overall, band, factors: [{key, label, weight, value, note}],
              explanation, critic_consensus: {score, explanation} | None,
              available: bool}
    """
    from app.utils.computed_confidence import WEIGHTS

    critic_conf = (critique or {}).get("overall_confidence")
    comp_score = (computed or {}).get("score")
    headline = comp_score if comp_score is not None else critic_conf

    if headline is None:
        return {"available": False, "overall": None, "band": None, "factors": [],
                "explanation": "Confidence could not be computed for this run.",
                "critic_consensus": None}

    band = "HIGH" if headline >= 75 else ("MODERATE" if headline >= 50 else "LOW")

    factors = []
    breakdown = (computed or {}).get("breakdown") or {}
    for key, value in breakdown.items():
        factors.append({
            "key": key,
            "label": key.replace("_", " ").title(),
            "weight": int(WEIGHTS.get(key, 0) * 100),
            "value": round(value, 2),
            "note": _SIGNAL_NOTES.get(key, ""),
        })

    critic_consensus = None
    if critic_conf is not None and not (critique or {}).get("parse_failed"):
        critic_consensus = {
            "score": critic_conf,
            "explanation": (critique or {}).get(
                "confidence_explanation", "largest agreeing source group / total sources"
            ),
        }

    return {
        "available": True,
        "overall": headline,
        "band": band,
        "factors": factors,
        "explanation": (computed or {}).get("explanation") or "",
        "critic_consensus": critic_consensus,
    }


def _render_confidence_text(analysis: dict) -> str:
    """Render the structured confidence analysis as legacy emoji-headed
    prose, so save_chat/KG/exports/old consumers keep working unchanged."""
    lines = ["🎯 CONFIDENCE ANALYSIS"]
    if not analysis.get("available"):
        lines.append(analysis.get("explanation") or "Confidence could not be computed for this run.")
        return "\n".join(lines)

    lines.append(f"OVERALL CONFIDENCE: {analysis['overall']}% — {analysis['band']}")
    lines.append("")

    if analysis["factors"]:
        lines.append("SIGNAL BREAKDOWN (computed from the retrieved sources):")
        for f in analysis["factors"]:
            lines.append(f"• {f['label']} (weight {f['weight']}%): {f['value']:.2f}/1.00 — {f['note']}")
        if analysis.get("explanation"):
            lines.append("")
            lines.append(analysis["explanation"])

    consensus = analysis.get("critic_consensus")
    if consensus:
        lines.append("")
        lines.append(f"CRITIC CONSENSUS SCORE: {consensus['score']}% — {consensus['explanation']}")
    else:
        lines.append("")
        lines.append("CRITIC CONSENSUS SCORE: unavailable (critique analysis failed this run).")

    return "\n".join(lines)


# ── Legacy text rendering — assembles the same emoji-headed briefing from
#    the structured JSON sections, so save_chat/KG/exports/any consumer
#    that only understands text (and the frontend's regex-parse fallback)
#    keep working exactly as before, unchanged by the JSON contract switch.
_SECTION_TEXT_HEADERS = (
    ("executive_summary",       "📋 EXECUTIVE SUMMARY"),
    ("source_intelligence",     "📚 SOURCE INTELLIGENCE"),
    ("key_findings",            "🔑 KEY FINDINGS"),
    ("consensus_map",           "🤝 CONSENSUS MAP"),
    ("divergence_map",          "⚡ DIVERGENCE MAP"),
    ("unique_insights",         "💡 UNIQUE INSIGHTS"),
    ("source_quality",          "⚠️ SOURCE QUALITY ASSESSMENT"),
    ("coverage_audit",          "🔍 COVERAGE AUDIT"),
    ("limitations",             "⚠️ LIMITATIONS & CAVEATS"),
    ("contradiction_resolution", "⚖️ CONTRADICTION RESOLUTION"),
    ("research_trajectory",     "🔮 RESEARCH TRAJECTORY"),
    ("bibliography",            "📖 SOURCE BIBLIOGRAPHY"),
)


def _render_report_text(sections: dict) -> str:
    """Assemble the legacy emoji-headed text blob from structured sections."""
    blocks = []
    for key, header in _SECTION_TEXT_HEADERS:
        value = sections.get(key)
        if key == "key_findings":
            body = "\n".join(f"• {item}" for item in (value or []))
        else:
            body = (value or "").strip()
        if not body:
            continue
        blocks.append(f"{header}\n{body}")
    return "\n\n".join(blocks)


MIN_USABLE_CONTENT = 300     # chars — below this a scraped doc is "thin"
MIN_USABLE_DOCS = 5          # fewer than this triggers query reformulation
_GAP_ERROR_MARKERS = ("analysis could not be completed", "error code", "could not parse",
                      "not_found_error", "api key", "llm response", "unavailable")


def _usable_docs(docs: list) -> list:
    """Docs with enough real content to reason over."""
    return [d for d in (docs or [])
            if (d.get("content_length") or len(d.get("content") or "")) >= MIN_USABLE_CONTENT]


def _substantive_gaps(critique: dict) -> list:
    """Real coverage gaps the critic found — error strings filtered out."""
    raw = (critique or {}).get("coverage_gaps") or []
    return [g.strip() for g in raw
            if isinstance(g, str) and g.strip()
            and len(g) < 160
            and not any(m in g.lower() for m in _GAP_ERROR_MARKERS)]


def _count_scrape_cache_hits(results: list, usage: dict, emit=None) -> None:
    """Surface the search_agent's 15-min scrape TTL cache: count docs served
    from cache into the usage accumulator and log it once."""
    if not results or usage is None:
        return
    hits = sum(1 for d in results if isinstance(d, dict) and d.get("from_scrape_cache"))
    if hits:
        usage["scrape_cache_hits"] = usage.get("scrape_cache_hits", 0) + hits
        if emit:
            emit(f"{hits} page{'s' if hits != 1 else ''} served from scrape cache")


def _usage_sink(state: AgentState) -> dict:
    """Lazily ensure the per-request token/cost accumulator exists on state,
    and return it so agent calls can record into it."""
    from app.utils.usage import new_usage
    u = state.get("usage")
    if not isinstance(u, dict):
        u = new_usage()
        state["usage"] = u
    return u


def _reformulate_query(query: str, provider: str, api_key: str, model,
                       usage_sink: Optional[dict] = None) -> Optional[str]:
    """One cheap LLM call to broaden/clarify a query that found too little.
    Uses the user's own key ONLY — returns None on any failure (heuristic-free
    fallback: caller just keeps the original results)."""
    if not api_key:
        return None
    try:
        from app.llm_providers import resolve_provider, default_model
        from app.utils.usage import record as _record_usage
        client_type, base_url = resolve_provider(provider)
        used_model = model or default_model(provider)
        prompt = (f'A web search for this query returned too few usable sources:\n"{query}"\n'
                  "Rewrite it as ONE broader or clearer web-search query likely to find more "
                  "sources. Return only the rewritten query — no quotes, no explanation.")
        if client_type == "openai":
            from openai import OpenAI
            c = OpenAI(api_key=api_key, **({"base_url": base_url} if base_url else {}))
            r = c.chat.completions.create(model=used_model,
                                          messages=[{"role": "user", "content": prompt}],
                                          max_tokens=60, temperature=0.3)
            out = r.choices[0].message.content
        else:
            from anthropic import Anthropic
            c = Anthropic(api_key=api_key)
            r = c.messages.create(model=used_model, max_tokens=60,
                                  temperature=0.3, messages=[{"role": "user", "content": prompt}])
            out = r.content[0].text
        _record_usage(usage_sink, "reformulate", provider, used_model, r, client_type)
        out = (out or "").strip().strip('"').split("\n")[0][:200]
        return out if out and out.lower() != (query or "").lower() else None
    except Exception as e:
        logger.warning("Query reformulation failed: %s", e)
        return None


def _merge_docs(existing: list, new: list) -> list:
    """Append new docs, deduped against existing by URL."""
    seen = {d.get("url") for d in existing if d.get("url")}
    merged = list(existing)
    for d in new:
        u = d.get("url")
        if u and u in seen:
            continue
        if u:
            seen.add(u)
        merged.append(d)
    return merged


def _extract_entities(query: str) -> list:
    """Best-effort entity extraction with a simple keyword fallback."""
    try:
        entities = hybrid._extract_entities(query)
        entities = [
            e.strip() for e in entities
            if e.strip() and len(e.strip()) < 80 and e.strip().lower() != 'unknown'
        ]
        if entities:
            return entities
    except Exception as e:
        logger.warning("Entity extraction failed, using keyword fallback: %s", e)

    words = query.lower().replace('?', '').split()
    return [w for w in words if len(w) > 3][:5]


# ============================================================
# NODES
# ============================================================


def search_node(state: AgentState) -> AgentState:
    """Search Agent – finds relevant documents + graph context"""
    _print_header(STEP_TITLES["search"])
    start = time.perf_counter()

    state['current_agent'] = 'search'

    user_id = _get_user_id(state)
    emit = make_emitter(state, "Search")

    usage = _usage_sink(state)
    results = search_web(state['query'], progress_cb=emit)
    _count_scrape_cache_hits(results, usage, emit)

    # ── AUTONOMY: thin results → the agent reformulates ONCE and re-searches ──
    if len(_usable_docs(results)) < MIN_USABLE_DOCS:
        alt = _reformulate_query(state['query'], _get_provider(state),
                                 state.get('user_api_key'), state.get('model'),
                                 usage_sink=usage)
        if alt:
            emit(f"Search agent: thin results — reformulating query → \"{alt[:60]}\"")
            more = search_web(alt, progress_cb=emit)
            before = len(results)
            results = _merge_docs(results, more)
            emit(f"Reformulated search added {len(results) - before} new sources "
                 f"({len(results)} total)")
        else:
            emit(f"Search agent: {len(results)} sources found (reformulation skipped)")

    state['retrieved_docs'] = results

    # Hybrid search for enhanced context
    print(". Running hybrid search...")
    emit("Running knowledge-graph hybrid search…")
    try:
        hybrid_results = hybrid.hybrid_search(state['query'])
        entities = hybrid._extract_entities(state['query'])
        if entities:
            print(f"    Detected entities: {entities}")
            kg.extract_and_link_entities(state['query'], user_id=user_id)
        state['graph_context'] = hybrid_results.get('enhanced_context', '')
        state['graph_results'] = hybrid_results.get('graph_results', [])
        graph_count = len(state['graph_results'])
        emit(f"Knowledge graph linked ({graph_count} connections)")
    except Exception as e:
        logger.warning("Hybrid search unavailable: %s", e)
        print(f"⚠️ Hybrid search unavailable: {e}")
        state['graph_context'] = ''
        state['graph_results'] = []
        graph_count = 0

    state['citations'] = [
        {
            'title': doc.get('title', 'Untitled'),
            'url': doc.get('url', ''),
            'source': doc.get('source', 'web'),
            'content_source': doc.get('content_source', ''),
            'published_date': doc.get('published_date', ''),
        }
        for doc in results
    ]

    elapsed = time.perf_counter() - start
    from app.utils.usage import record_latency
    record_latency(usage, "search", elapsed)
    print(f"✅ Found {len(results)} web sources + {graph_count} graph connections "
          f"for user: {user_id} ({elapsed:.1f}s)")
    return state


def summarise_node(state: AgentState) -> AgentState:
    """Summariser Agent – Condense each document"""
    _print_header(STEP_TITLES["summarise"])
    start = time.perf_counter()

    state['current_agent'] = 'summariser'

    provider = _get_provider(state)
    emit = make_emitter(state, "Summarise")
    all_docs = state.get('retrieved_docs', [])

    # ── TRIAGE: skip thin sources — a real agent decision, surfaced ──
    docs = _usable_docs(all_docs)
    skipped = len(all_docs) - len(docs)
    if skipped:
        emit(f"Summariser triage: skipped {skipped} thin source{'s' if skipped != 1 else ''} "
             f"(< {MIN_USABLE_CONTENT} chars) — summarising {len(docs)} substantive documents")
    else:
        emit(f"Summarising {len(docs)} documents in parallel…")

    # google/mistral/groq route through the summariser's openai_compatible
    # path with the matching base_url; user-chosen model wins over defaults.
    base_url = OPENAI_COMPATIBLE_BASE_URLS.get(provider)
    summaries = summariser_agent(
        documents=docs,
        query=state['query'],
        provider="openai_compatible" if base_url else provider,
        api_key=state.get('user_api_key'),
        model=state.get('model'),
        base_url=base_url,
        progress_cb=emit,
        usage_sink=_usage_sink(state),
    )
    state['summaries'] = summaries

    elapsed = time.perf_counter() - start
    from app.utils.usage import record_latency
    record_latency(_usage_sink(state), "summarise", elapsed)
    print(f"✅ Summarized {len(summaries)} documents ({elapsed:.1f}s)")
    return state


def critic_node(state: AgentState) -> AgentState:
    """Critic Agent — Compare sources, find agreements/disagreements"""
    print("\n" + "="*60)
    print("🔎 STEP 3: CRITIC AGENT (Source Comparison)")
    print("="*60)

    state['current_agent'] = 'critic'
    _critic_start = time.perf_counter()

    # Get user's preferred provider (default to anthropic)
    provider = state.get('provider', 'anthropic')
    emit = make_emitter(state, "Critic")
    emit(f"Comparing claims across {len(state.get('summaries') or [])} summaries…",
         {"agents": {"Critic": {"progress": 40, "phase": {"label": "Critiquing", "sub": "LLM analysing claims…"}}}})

    critique = critic_agent(
        summaries=state['summaries'],
        query=state['query'],
        provider=provider,
        api_key=state.get('user_api_key'),
        model=state.get('model'),
        usage_sink=_usage_sink(state),
    )
    state['critique'] = critique
    if critique.get('parse_failed'):
        # counted so the graph's conditional edge retries at most once
        state['critic_retries'] = state.get('critic_retries', 0) + 1

    confidence = critique.get('overall_confidence', 0)
    agreements = len(critique.get('agreement_groups', []))
    disagreements = len(critique.get('disagreement_groups', []))

    if critique.get('parse_failed'):
        emit("Critique FAILED — could not parse analysis (check model/API key)")
    else:
        emit(f"Critique parsed: {agreements} agreement groups, {disagreements} disagreements, confidence {confidence}%")

    from app.utils.usage import record_latency
    record_latency(_usage_sink(state), "critic", time.perf_counter() - _critic_start)
    print(f"✅ Analysis complete: {agreements} agreements, {disagreements} disagreements")
    print(f"📊 Confidence: {confidence}% (source agreement ratio)")

    return state


def deepen_node(state: AgentState) -> AgentState:
    """
    DEEPEN AGENT — the pipeline's genuinely agentic step. When the critic
    reports real coverage gaps, this dispatches targeted follow-up searches
    on the top 2 gaps, integrates the new evidence, re-summarises only the
    delta, and hands back to the critic for a second, better-informed pass.
    Strictly bounded to one extra cycle.
    """
    print("\n" + "=" * 60)
    print("🔁 DEEPEN AGENT (gap-driven re-search)")
    print("=" * 60)
    state['current_agent'] = 'deepen'
    emit = make_emitter(state, "Critic")   # surfaced on the Critic lane

    gaps = _substantive_gaps(state.get('critique'))[:2]
    provider = _get_provider(state)
    emit(f"Critic identified {len(gaps)} coverage gap"
         f"{'s' if len(gaps) != 1 else ''} — dispatching targeted re-search",
         {"progress": 72})

    usage = _usage_sink(state)
    existing = state.get('retrieved_docs', [])
    new_docs = []
    for i, gap in enumerate(gaps, 1):
        gap_q = gap if len(gap.split()) > 2 else f"{state['query']} {gap}"
        emit(f"Deepen {i}/{len(gaps)}: searching \"{gap[:60]}\"…")
        try:
            found = search_web(gap_q, max_results=4, progress_cb=emit)
            _count_scrape_cache_hits(found, usage, emit)
            new_docs = _merge_docs(new_docs, found)
        except Exception as e:
            logger.warning("Deepen search failed for gap '%s': %s", gap[:40], e)

    # dedupe the new docs against what we already had
    merged = _merge_docs(existing, new_docs)
    genuinely_new = [d for d in merged if d not in existing]
    state['retrieved_docs'] = merged
    state['research_cycles'] = state.get('research_cycles', 0) + 1

    # keep citations in sync with the enlarged evidence pool
    state['citations'] = [
        {'title': d.get('title', 'Untitled'), 'url': d.get('url', ''),
         'source': d.get('source', 'web'), 'content_source': d.get('content_source', ''),
         'published_date': d.get('published_date', '')}
        for d in merged
    ]

    # re-summarise ONLY the new, substantive docs and merge into summaries
    fresh = _usable_docs(genuinely_new)
    if fresh:
        base_url = OPENAI_COMPATIBLE_BASE_URLS.get(provider)
        new_summaries = summariser_agent(
            documents=fresh,
            query=state['query'],
            provider="openai_compatible" if base_url else provider,
            api_key=state.get('user_api_key'),
            model=state.get('model'),
            base_url=base_url,
            progress_cb=emit,
            usage_sink=usage,
        )
        state['summaries'] = (state.get('summaries') or []) + new_summaries

    emit(f"Research cycle {state['research_cycles'] + 1}: {len(fresh)} new sources integrated "
         f"({len(merged)} total) — re-examining with the critic", {"progress": 78})
    print(f"✅ Deepen complete: +{len(fresh)} new sources, {len(merged)} total")
    return state


def writer_node(state: AgentState) -> AgentState:
    """Writer Agent – Create final answer with graph insights"""
    _print_header(STEP_TITLES["write"])
    start = time.perf_counter()

    state['current_agent'] = 'writer'

    user = state.get('user')
    provider = _get_provider(state)
    user_id = _get_user_id(state)
    print(f"  👤 User ID: {user_id}")

    # Enhance summaries with graph context if available
    graph_context = state.get('graph_context', '')
    enhanced_summaries = list(state.get('summaries', []))
    if graph_context:
        enhanced_summaries.append(f"KNOWLEDGE GRAPH INSIGHTS:\n{graph_context}")

    emit = make_emitter(state, "Writer")
    emit(f"Drafting research digest from {len(enhanced_summaries)} summaries…",
         {"agents": {"Writer": {"progress": 35, "phase": {"label": "Writing", "sub": "LLM drafting digest…"}}}})

    writer_result = writer_agent(
        query=state['query'],
        summaries=enhanced_summaries,
        critique=state['critique'],
        citations=state['citations'],
        provider=provider,
        api_key=state.get('user_api_key'),
        response_style=state.get('response_style'),
        model=state.get('model'),
        usage_sink=_usage_sink(state),
    )
    parse_failed = writer_result.get('parse_failed', False)
    sections = writer_result.get('sections') or {}

    # Text rendering (for compute_confidence, save_chat/KG/exports, and the
    # frontend's legacy regex parser) — assembled from the structured JSON
    # on success, or the preserved raw/fallback text on total failure.
    answer = writer_result.get('raw_text') or '' if parse_failed else _render_report_text(sections)
    state['final_answer'] = answer

    # ── COMPUTED CONFIDENCE (from retrieved sources) ──────────────
    # This is an *additional* confidence metric derived from the
    # source documents themselves, independent of the LLM's self‑assessment.
    if state.get('retrieved_docs'):
        emit("Computing evidence-based confidence breakdown…",
             {"agents": {"Writer": {"progress": 75, "phase": {"label": "Writing", "sub": "Scoring evidence…"}}}})
        try:
            state['computed_confidence'] = compute_confidence(
                state['retrieved_docs'], answer=answer
            )
        except Exception as e:
            logger.warning("Computed confidence failed: %s", e)

    # Structured confidence analysis — computed from data, never written by
    # the LLM. Attached to report["confidence_analysis"] for the frontend's
    # structured path, and appended as legacy prose for text consumers.
    confidence_analysis = _build_confidence_analysis(
        state.get('computed_confidence') or {}, state.get('critique') or {}
    )
    answer = answer.rstrip() + "\n\n" + _render_confidence_text(confidence_analysis)
    state['final_answer'] = answer

    state['report'] = {
        **sections,
        "confidence_analysis": confidence_analysis,
        "parse_failed": parse_failed,
        "raw_text": writer_result.get('raw_text', '') if parse_failed else None,
    }

    emit(f"Draft complete ({len(answer.split())} words) — storing to knowledge graph…")

    entities = _extract_entities(state['query'])
    confidence = state.get('critique', {}).get('overall_confidence', 0)
    citations = state.get('citations', [])

    # ========== BEST-EFFORT SIDE EFFECTS ==========
    # Each of these enriches future requests (KG, memory, search, vectors)
    # but none of them should ever cost the user their answer if it fails.

    _run_side_effect(
        f"Stored in KG for user: {user_id[:20]}",
        kg.add_research_entry,
        query=state['query'],
        answer=answer,
        sources=citations,
        confidence=confidence,
        topics=entities,
        user_id=user_id,
    )

    def _record_user_memory():
        user_memory.create_user_profile(user_id, user_id[:20], f"{user_id}@polynous.ai")
        user_memory.record_research(
            user_id=user_id,
            query=state['query'],
            answer=answer,
            topics=entities,
            confidence=confidence,
            mode="research",
            sources=citations,
        )

    _run_side_effect(f"Recorded in User Memory for user: {user_id[:20]}", _record_user_memory)

    _run_side_effect(
        "Indexed in Semantic Search",
        semantic_search.add_to_index,
        state['query'],                           # first positional param is `query`
        answer=answer,
        mode="research",
        confidence=confidence,
        sources=citations,
        user_id=user_id,
    )

    _run_side_effect(
        f"Stored in Pinecone namespace user_{user_id}",
        store_research,
        user_id=user_id,
        session_id=state.get('session_id', 'guest'),
        query=state['query'],
        documents=state.get('retrieved_docs', []),
        answer=answer,
        user=user,
        metadata={
            'confidence': confidence,
            'mode': 'research',
            'num_sources': len(state.get('retrieved_docs', [])),
        },
    )

    elapsed = time.perf_counter() - start
    from app.utils.usage import record_latency
    record_latency(_usage_sink(state), "writer", elapsed)
    print(f"✅ Final answer ready with graph insights! ({elapsed:.1f}s)")
    print("=" * 60 + "\n")
    return state


# ============================================================
# GRAPH ASSEMBLY
# ============================================================


def _route_after_search(state: AgentState) -> str:
    """No sources → skip straight to the writer, which produces an honest
    'no sources found' answer instead of running empty summarise/critic."""
    return "summarise" if state.get('retrieved_docs') else "write"


def _route_after_critic(state: AgentState) -> str:
    """Three-way decision the critic 'makes':
      1. parse failure  → retry the critic once (self-repair backstop)
      2. real coverage gaps + no deepen cycle spent → DEEPEN (gap-driven
         re-search), then the critic runs again on richer evidence
      3. otherwise      → write the report."""
    critique = state.get('critique') or {}
    if critique.get('parse_failed') and state.get('critic_retries', 0) <= 1:
        return "critic"
    if state.get('research_cycles', 0) < 1 and _substantive_gaps(critique):
        return "deepen"
    return "write"


def create_orchestrator():
    workflow = StateGraph(AgentState)
    workflow.add_node("search", search_node)
    workflow.add_node("summarise", summarise_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("deepen", deepen_node)
    workflow.add_node("write", writer_node)
    workflow.set_entry_point("search")
    workflow.add_conditional_edges("search", _route_after_search,
                                   {"summarise": "summarise", "write": "write"})
    workflow.add_edge("summarise", "critic")
    workflow.add_conditional_edges("critic", _route_after_critic,
                                   {"critic": "critic", "deepen": "deepen", "write": "write"})
    workflow.add_edge("deepen", "critic")   # richer evidence → re-examine
    workflow.add_edge("write", END)
    return workflow.compile()


orchestrator = create_orchestrator()
print("✅ Multi-Agent Orchestrator Ready!")


# ============================================================
# GRAPH NODE → VISUAL PANEL MAP
# ============================================================
# Facts about the graph's own structure, co-located with the graph
# definition so the SSE layer (app/main.py) never has to duplicate or
# guess at routing/node names — it only asks "which panel does this
# graph node belong to?" `deepen` reuses the Critic panel since the
# frontend has no separate card for the gap-driven re-search step.
RESEARCH_NODE_TO_PANEL = {
    "search": "Search",
    "summarise": "Summarise",
    "critic": "Critic",
    "deepen": "Critic",
    "write": "Writer",
}

RESEARCH_NODE_PHASE = {
    "search":    {"label": "Searching",   "sub": "Querying Tavily and scraping…"},
    "summarise": {"label": "Summarising", "sub": "Extracting key points…"},
    "critic":    {"label": "Critiquing",  "sub": "Cross-checking claims…"},
    "deepen":    {"label": "Deepening",   "sub": "Gap-driven re-search…"},
    "write":     {"label": "Writing",     "sub": "Drafting research digest…"},
}