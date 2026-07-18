from langgraph.graph import StateGraph, END
from app.state import AgentState
from app.agents.debate_agents import argue_position, judge_debate
from app.search_agent import search_web
from app.knowledge_graph.user_memory import user_memory
from app.knowledge_graph.graph_manager import kg
from app.semantic_search import semantic_search
from app.chat_history import save_debate
from app.services.embedding_pipeline import pipeline
from app.visual.events import make_emitter


def debate_search_node(state: AgentState) -> AgentState:
    """Search for debate sources"""
    print("\n" + "=" * 60)
    print("  DEBATE: Searching for sources...")
    print("=" * 60)

    user = state.get('user')
    user_id = state.get('session_id', 'guest_user')

    emit = make_emitter(state, "Evidence")
    emit("Searching the web for debate evidence…")
    results = search_web(state['query'], progress_cb=emit)
    state['retrieved_docs'] = results
    emit(f"{len(results)} sources gathered for both advocates")

    context = [
        f"Source: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:1000]}"
        for doc in results
    ]

    if 'debate_history' not in state:
        state['debate_history'] = []

    state['debate_history'].append({"step": "search", "sources_found": len(results)})

    print(f"✅ Found {len(results)} sources for debate (user: {user_id[:20]})")
    return state


def _debate_turn(state: AgentState, side: str, opponent_phase_key: str = None) -> AgentState:
    """
    Run one debate turn (opening or rebuttal) with the FULL source list.
    Rebuttals receive the opponent's opening argument and must respond to it.
    """
    api_key = state.get('user_api_key')
    provider = state.get('preferred_provider', 'anthropic')
    docs = state.get('retrieved_docs', [])

    opponent_argument = None
    if opponent_phase_key:
        opp_side, opp_phase = opponent_phase_key
        for entry in state.get('debate_history', []):
            if entry.get('side') == opp_side and entry.get('phase') == opp_phase:
                opponent_argument = entry.get('argument')
                break

    emit = make_emitter(state, side)
    phase_word = "rebuttal" if opponent_phase_key else "opening"
    if opponent_phase_key:
        emit(f"{side} rebuttal: reading {len(docs)} sources + opponent's opening…",
             {"panels": {side: {"phase": {"label": "Rebutting", "sub": "Countering the opponent's points"}, "progress": 70}}})
    else:
        emit(f"{side} opening: analysing {len(docs)} sources…",
             {"panels": {side: {"phase": {"label": "Opening", "sub": f"Building the case from {len(docs)} sources"}, "progress": 25}}})

    turn = argue_position(
        state['query'], docs, side,
        opponent_argument=opponent_argument,
        api_key=api_key,
        provider=provider,
        model=state.get('model'),
    )
    state['debate_history'].append({
        "side": side,
        "phase": turn["phase"],
        "argument": turn["text"],
        "rubric": turn["rubric"],
        "steelman": turn.get("steelman"),
        "error": turn["error"],
    })
    r = turn.get("rubric") or {}
    if turn.get("error"):
        emit(f"{side} {phase_word} FAILED: {turn['error'][:80]}")
    else:
        emit(f"{side} {phase_word} drafted — {r.get('distinct_sources_cited', 0)} sources cited, "
             f"{r.get('grounded_sentences', 0)}/{r.get('sentences', 0)} claims grounded")
    return state


def for_agent_node(state: AgentState) -> AgentState:
    print("\n🟢 FOR AGENT (opening)")
    return _debate_turn(state, "FOR")


def against_agent_node(state: AgentState) -> AgentState:
    print("\n🔴 AGAINST AGENT (opening)")
    return _debate_turn(state, "AGAINST")


def for_rebuttal_node(state: AgentState) -> AgentState:
    print("\n🟢 FOR AGENT (rebuttal — responding to AGAINST)")
    return _debate_turn(state, "FOR", opponent_phase_key=("AGAINST", "opening"))


def against_rebuttal_node(state: AgentState) -> AgentState:
    print("\n🔴 AGAINST AGENT (rebuttal — responding to FOR)")
    return _debate_turn(state, "AGAINST", opponent_phase_key=("FOR", "opening"))


def judge_node(state: AgentState) -> AgentState:
    """Judge the debate"""
    print("\n" + "=" * 60)
    print("⚖️ JUDGE")
    print("=" * 60)

    api_key = state.get('user_api_key')
    provider = state.get('preferred_provider', 'anthropic')
    user_id = state.get('session_id', 'guest_user')
    user = state.get('user')
    print(f"  👤 User ID: {user_id[:30] if len(user_id) > 30 else user_id}")

    # Ensure user profile exists
    try:
        user_memory.create_user_profile(
            user_id=user_id,
            username=user_id[:20],
            email=f"{user_id}@polynous.ai"
        )
        print(f"  👤 User profile ensured for debate: {user_id[:20]}...")
    except Exception as e:
        print(f"  ⚠️ User profile creation skipped: {e}")

    # Collect openings and rebuttals from the structured history
    turns = {}
    for entry in state.get('debate_history', []):
        side, phase = entry.get('side'), entry.get('phase')
        if side in ('FOR', 'AGAINST') and phase in ('opening', 'rebuttal'):
            turns[(side, phase)] = entry.get('argument', '')

    for_arg = turns.get(('FOR', 'opening'), '')
    against_arg = turns.get(('AGAINST', 'opening'), '')
    for_rebuttal = turns.get(('FOR', 'rebuttal'), '')
    against_rebuttal = turns.get(('AGAINST', 'rebuttal'), '')
    total_sources = len(state.get('retrieved_docs', []))

    emit = make_emitter(state, "Judge")
    emit(f"Weighing openings and rebuttals against {total_sources} sources…")

    verdict = judge_debate(
        for_arg, against_arg, state['query'],
        api_key=api_key,
        provider=provider,
        for_rebuttal=for_rebuttal,
        against_rebuttal=against_rebuttal,
        total_sources=total_sources,
        model=state.get('model'),
    )
    state['judge_verdict'] = verdict
    if verdict.get('parse_failed'):
        emit("Judge could not score — verdict UNSCORED (computed rubric only)")
    else:
        emit(f"Verdict: {verdict.get('winner', '—')} "
             f"(FOR {verdict.get('for_score', 0)} / AGAINST {verdict.get('against_score', 0)})")
    emit("Persisting debate to memory and knowledge graph…")

    winner = verdict.get('winner', 'UNSCORED')
    reasoning = verdict.get('reasoning', '')
    strongest = verdict.get('strongest_point', '')
    for_score = verdict.get('for_score', 0)
    against_score = verdict.get('against_score', 0)
    rubric_for = verdict.get('rubric_for', {})
    rubric_against = verdict.get('rubric_against', {})

    debate_summary = f"""📋 DEBATE RESULT: {state['query']}

🟢 FOR — OPENING ({for_score}/10)
{for_arg[:500]}

🟢 FOR — REBUTTAL
{(for_rebuttal or 'No rebuttal delivered.')[:400]}

🔴 AGAINST — OPENING ({against_score}/10)
{against_arg[:500]}

🔴 AGAINST — REBUTTAL
{(against_rebuttal or 'No rebuttal delivered.')[:400]}

⚖️ WINNER: {winner}

💡 STRONGEST POINT
{strongest}

📝 JUDGE'S REASONING
{reasoning}

🎯 SCORES ({verdict.get('scoring', '')})
• FOR: {for_score}/10 — cited {rubric_for.get('distinct_sources_cited', 0)} sources, {rubric_for.get('grounded_sentences', 0)}/{rubric_for.get('sentences', 0)} claims grounded
• AGAINST: {against_score}/10 — cited {rubric_against.get('distinct_sources_cited', 0)} sources, {rubric_against.get('grounded_sentences', 0)}/{rubric_against.get('sentences', 0)} claims grounded
"""

    state['final_answer'] = debate_summary
    state['citations'] = [
        {'title': doc.get('title', 'Untitled'), 'url': doc.get('url', '')}
        for doc in state.get('retrieved_docs', [])
    ]

    # ---------- Store debate in user memory ----------
    print(f"    Storing debate for user_id: {user_id[:30]}")
    try:
        user_memory.record_debate(
            user_id=user_id,
            topic=state['query'],
            for_score=for_score,
            against_score=against_score,
            winner=winner,
        )
        print("  ✅ Stored in User Memory")
    except Exception as e:
        print(f"  ⚠️ Memory storage error: {e}")

    # ---------- Index debate in semantic search ----------
    try:
        semantic_search.add_to_index(
            user,
            query=state['query'],
            answer=state.get('final_answer', ''),
            mode="debate",
            confidence=for_score * 10,
            sources=state.get('citations', []),
            user_id=user_id,
        )
        print("    Indexed debate for Semantic Search")
    except Exception as e:
        print(f"  ⚠️ Search indexing error: {e}")

    # ---------- Save debate to chat history ----------
    try:
        save_debate(
            session_id=user_id,
            topic=state['query'],
            for_score=for_score,
            against_score=against_score,
            winner=winner,
            reasoning=reasoning,
        )
        print("  💾 Saved debate to Chat History")
    except Exception as e:
        print(f"  ⚠️ Chat history save error: {e}")

    # ---------- Embed debate in Unified Pipeline ----------
    try:
        pipeline.embed_and_store(
            user,
            content=state['query'],
            module="debate",
            content_type="topic",
            metadata={
                "session_id": user_id,
                "for_score": for_score,
                "against_score": against_score,
                "winner": winner,
            },
        )
        pipeline.embed_and_store(
            user,
            content=for_arg,
            module="debate",
            content_type="argument",
            metadata={
                "session_id": user_id,
                "side": "FOR",
                "score": for_score,
                "topic": state['query'][:200],
            },
        )
        pipeline.embed_and_store(
            user,
            content=against_arg,
            module="debate",
            content_type="counterargument",
            metadata={
                "session_id": user_id,
                "side": "AGAINST",
                "score": against_score,
                "topic": state['query'][:200],
            },
        )
        cross_connections = pipeline.find_cross_module_connections(
            user,                                             # ← FIXED: user argument added
            query=state['query'],
            source_module="debate",
            target_modules=["research", "memory"],
        )
        if cross_connections:
            print(f"  🔗 Found {len(cross_connections)} cross-module connections")
        print("🧬 Debate embedded in Unified Pipeline")
    except Exception as e:
        print(f"⚠️ Pipeline embedding error: {e}")

    # ---------- PHASE 3: Create Rich Graph Nodes ----------
    try:
        kg.create_argument_node(
            argument_text=for_arg[:300],
            side="FOR",
            score=for_score,
            debate_topic=state['query'],
            session_id=user_id,
            user_id=user_id,
        )
        kg.create_argument_node(
            argument_text=against_arg[:300],
            side="AGAINST",
            score=against_score,
            debate_topic=state['query'],
            session_id=user_id,
            user_id=user_id,
        )
        kg.link_argument_to_counterargument(for_arg[:300], against_arg[:300], user_id=user_id)
        if reasoning:
            kg.create_claim_node(
                claim_text=f"Debate verdict on '{state['query'][:100]}': {reasoning[:200]}",
                source_module="debate",
                confidence=max(for_score, against_score) * 10,
                session_id=user_id,
                user_id=user_id,
            )
        try:
            from app.knowledge_graph.hybrid_search import hybrid
            entities = hybrid._extract_entities(state['query'])
            for entity in entities[:3]:
                kg.link_research_to_debate(
                    research_query=state['query'],
                    debate_topic=entity,
                    similarity_score=0.7,
                    user_id=user_id,
                )
        except:
            pass
        print(". Created rich debate graph nodes (Arguments + Claims)")
    except Exception as e:
        print(f"⚠️ Rich debate graph error: {e}")

    print(f"✅ Debate complete! Winner: {winner} (user: {user_id[:20]})")
    print("=" * 60 + "\n")
    return state


def create_debate_graph():
    """search → FOR opening → AGAINST opening → FOR rebuttal →
    AGAINST rebuttal → judge. Rebuttals read the opponent's opening,
    making the pipeline genuinely adversarial."""
    workflow = StateGraph(AgentState)
    workflow.add_node("debate_search", debate_search_node)
    workflow.add_node("for_agent", for_agent_node)
    workflow.add_node("against_agent", against_agent_node)
    workflow.add_node("for_rebuttal", for_rebuttal_node)
    workflow.add_node("against_rebuttal", against_rebuttal_node)
    workflow.add_node("judge", judge_node)
    workflow.set_entry_point("debate_search")
    workflow.add_edge("debate_search", "for_agent")
    workflow.add_edge("for_agent", "against_agent")
    workflow.add_edge("against_agent", "for_rebuttal")
    workflow.add_edge("for_rebuttal", "against_rebuttal")
    workflow.add_edge("against_rebuttal", "judge")
    workflow.add_edge("judge", END)
    return workflow.compile()


debate_graph = create_debate_graph()
print("✅ Debate Orchestrator Ready!")