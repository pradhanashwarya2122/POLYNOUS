from langgraph.graph import StateGraph, END
from app.state import AgentState
from app.agents.debate_agents import argue_for_position, argue_against_position, judge_debate
from app.search_agent import search_web
from app.knowledge_graph.user_memory import user_memory
from app.knowledge_graph.graph_manager import kg
from app.semantic_search import semantic_search
from app.chat_history import save_debate
from app.services.embedding_pipeline import pipeline


def debate_search_node(state: AgentState) -> AgentState:
    """Search for debate sources"""
    print("\n" + "=" * 60)
    print("  DEBATE: Searching for sources...")
    print("=" * 60)

    # ✅ Get the user object from state (same as in orchestrator)
    user = state.get('user')
    user_id = state.get('session_id', 'guest_user')

    results = search_web(user, state['query'])   # ← fixed
    state['retrieved_docs'] = results

    context = [
        f"Source: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:1000]}"
        for doc in results
    ]

    if 'debate_history' not in state:
        state['debate_history'] = []

    state['debate_history'].append({"step": "search", "sources_found": len(results)})

    print(f"✅ Found {len(results)} sources for debate (user: {user_id[:20]})")
    return state


def for_agent_node(state: AgentState) -> AgentState:
    print("\n🟢 FOR AGENT")
    # ✅ Read resolved API key and provider from state (set by main.py)
    api_key = state.get('user_api_key')
    provider = state.get('preferred_provider', 'anthropic')

    context = [
        f"Source: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:1000]}"
        for doc in state.get('retrieved_docs', [])
    ]

    argument = argue_for_position(
        state['query'], context,
        api_key=api_key,
        provider=provider,
    )
    state['debate_history'].append({"side": "FOR", "argument": argument})
    return state


def against_agent_node(state: AgentState) -> AgentState:
    print("\n🔴 AGAINST AGENT")
    api_key = state.get('user_api_key')
    provider = state.get('preferred_provider', 'anthropic')

    context = [
        f"Source: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:1000]}"
        for doc in state.get('retrieved_docs', [])
    ]

    argument = argue_against_position(
        state['query'], context,
        api_key=api_key,
        provider=provider,
    )
    state['debate_history'].append({"side": "AGAINST", "argument": argument})
    return state


def judge_node(state: AgentState) -> AgentState:
    """Judge the debate"""
    print("\n" + "=" * 60)
    print("⚖️ JUDGE")
    print("=" * 60)

    # ✅ Read resolved API key and provider from state
    api_key = state.get('user_api_key')
    provider = state.get('preferred_provider', 'anthropic')
    user_id = state.get('session_id', 'guest_user')
    print(f"  👤 User ID: {user_id[:30] if len(user_id) > 30 else user_id}")

    # Ensure user profile exists before storing debate
    try:
        user_memory.create_user_profile(
            user_id=user_id,
            username=user_id[:20],
            email=f"{user_id}@polynous.ai"
        )
        print(f"  👤 User profile ensured for debate: {user_id[:20]}...")
    except Exception as e:
        print(f"  ⚠️ User profile creation skipped: {e}")

    # Get last FOR and AGAINST arguments
    for_arg = ""
    against_arg = ""
    for entry in state.get('debate_history', []):
        if entry.get('side') == 'FOR':
            for_arg = entry.get('argument', '')
        elif entry.get('side') == 'AGAINST':
            against_arg = entry.get('argument', '')

    # ✅ Pass api_key and provider directly, no user object
    verdict = judge_debate(
        for_arg, against_arg, state['query'],
        api_key=api_key,
        provider=provider,
    )
    state['judge_verdict'] = verdict

    winner = verdict.get('winner', 'FOR')
    reasoning = verdict.get('reasoning', '')
    strongest = verdict.get('strongest_point', '')
    for_score = verdict.get('for_score', 5)
    against_score = verdict.get('against_score', 5)

    debate_summary = f"""📋 DEBATE RESULT: {state['query']}

🟢 FOR POSITION ({for_score}/10)
{for_arg[:500]}

🔴 AGAINST POSITION ({against_score}/10)
{against_arg[:500]}

⚖️ WINNER: {winner}

💡 STRONGEST POINT
{strongest}

📝 JUDGE'S REASONING
{reasoning}

🎯 SCORES
• FOR: {for_score}/10
• AGAINST: {against_score}/10
"""

    state['final_answer'] = debate_summary

    state['citations'] = [
        {'title': doc.get('title', 'Untitled'), 'url': doc.get('url', '')}
        for doc in state.get('retrieved_docs', [])
    ]

    # ========== Store debate in user memory ==========
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

    # ========== Index debate in semantic search ==========
    try:
        semantic_search.add_to_index(
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

    # ========== Save debate to chat history ==========
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

    # ========== Embed debate in Unified Pipeline ==========
    try:
        pipeline.embed_and_store(
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
            query=state['query'],
            source_module="debate",
            target_modules=["research", "memory"],
        )
        if cross_connections:
            print(f"  🔗 Found {len(cross_connections)} cross-module connections")
        print("🧬 Debate embedded in Unified Pipeline")
    except Exception as e:
        print(f"⚠️ Pipeline embedding error: {e}")

    # ========== PHASE 3: Create Rich Graph Nodes ==========
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
    workflow = StateGraph(AgentState)
    workflow.add_node("debate_search", debate_search_node)
    workflow.add_node("for_agent", for_agent_node)
    workflow.add_node("against_agent", against_agent_node)
    workflow.add_node("judge", judge_node)
    workflow.set_entry_point("debate_search")
    workflow.add_edge("debate_search", "for_agent")
    workflow.add_edge("for_agent", "against_agent")
    workflow.add_edge("against_agent", "judge")
    workflow.add_edge("judge", END)
    return workflow.compile()


debate_graph = create_debate_graph()
print("✅ Debate Orchestrator Ready!")