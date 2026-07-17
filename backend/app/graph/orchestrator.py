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

    results = search_web(state['query'], progress_cb=emit)
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
        }
        for doc in results
    ]

    elapsed = time.perf_counter() - start
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
    docs = state.get('retrieved_docs', [])
    emit(f"Summarising {len(docs)} documents in parallel…")

    summaries = summariser_agent(
        documents=docs,
        query=state['query'],
        provider=provider,
        progress_cb=emit,
    )
    state['summaries'] = summaries

    elapsed = time.perf_counter() - start
    print(f"✅ Summarized {len(summaries)} documents ({elapsed:.1f}s)")
    return state


def critic_node(state: AgentState) -> AgentState:
    """Critic Agent — Compare sources, find agreements/disagreements"""
    print("\n" + "="*60)
    print("🔎 STEP 3: CRITIC AGENT (Source Comparison)")
    print("="*60)

    state['current_agent'] = 'critic'

    # Get user's preferred provider (default to anthropic)
    provider = state.get('provider', 'anthropic')
    emit = make_emitter(state, "Critic")
    emit(f"Comparing claims across {len(state.get('summaries') or [])} summaries…")

    critique = critic_agent(
        summaries=state['summaries'],
        query=state['query'],
        provider=provider
    )
    state['critique'] = critique

    confidence = critique.get('overall_confidence', 0)
    agreements = len(critique.get('agreement_groups', []))
    disagreements = len(critique.get('disagreement_groups', []))

    if critique.get('parse_failed'):
        emit("Critique FAILED — could not parse analysis (check model/API key)")
    else:
        emit(f"Critique parsed: {agreements} agreement groups, {disagreements} disagreements, confidence {confidence}%")

    print(f"✅ Analysis complete: {agreements} agreements, {disagreements} disagreements")
    print(f"📊 Confidence: {confidence}% (source agreement ratio)")

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
    emit(f"Drafting research digest from {len(enhanced_summaries)} summaries…")

    answer = writer_agent(
        query=state['query'],
        summaries=enhanced_summaries,
        critique=state['critique'],
        citations=state['citations'],
        provider=provider,
    )
    state['final_answer'] = answer

    # ── COMPUTED CONFIDENCE (from retrieved sources) ──────────────
    # This is an *additional* confidence metric derived from the
    # source documents themselves, independent of the LLM's self‑assessment.
    if state.get('retrieved_docs'):
        emit("Computing evidence-based confidence breakdown…")
        try:
            state['computed_confidence'] = compute_confidence(
                state['retrieved_docs'], answer=answer
            )
        except Exception as e:
            logger.warning("Computed confidence failed: %s", e)

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
    print(f"✅ Final answer ready with graph insights! ({elapsed:.1f}s)")
    print("=" * 60 + "\n")
    return state


# ============================================================
# GRAPH ASSEMBLY
# ============================================================


def create_orchestrator():
    workflow = StateGraph(AgentState)
    workflow.add_node("search", search_node)
    workflow.add_node("summarise", summarise_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("write", writer_node)
    workflow.set_entry_point("search")
    workflow.add_edge("search", "summarise")
    workflow.add_edge("summarise", "critic")
    workflow.add_edge("critic", "write")
    workflow.add_edge("write", END)
    return workflow.compile()


orchestrator = create_orchestrator()
print("✅ Multi-Agent Orchestrator Ready!")