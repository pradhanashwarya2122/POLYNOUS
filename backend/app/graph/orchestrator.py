from app.semantic_search import semantic_search
from app.knowledge_graph.hybrid_search import hybrid
from app.knowledge_graph.graph_manager import kg
from app.knowledge_graph.user_memory import user_memory
from langgraph.graph import StateGraph, END
from app.state import AgentState
from app.agents.summariser_agent import summariser_agent
from app.agents.critic_agent import critic_agent
from app.agents.writer_agent import writer_agent
from app.search_agent import search_web
from app.chat_history import save_chat
from app.services.embedding_pipeline import pipeline
from app.memory.vector_store import store_research


def search_node(state: AgentState) -> AgentState:
    """Search Agent – finds relevant documents + graph context"""
    print("\n" + "=" * 60)
    print("  STEP 1: SEARCH AGENT (Hybrid)")
    print("=" * 60)

    state['current_agent'] = 'search'

    user = state.get('user')
    user_id = getattr(user, 'public_id', 'guest') if user else 'guest'

    # ✅ search_web now expects (user, query)
    results = search_web(user, state['query'])
    state['retrieved_docs'] = results

    # Hybrid search for enhanced context
    print(". Running hybrid search...")
    try:
        hybrid_results = hybrid.hybrid_search(state['query'])
        entities = hybrid._extract_entities(state['query'])
        if entities:
            print(f"    Detected entities: {entities}")
            kg.extract_and_link_entities(state['query'], user_id=user_id)
        state['graph_context'] = hybrid_results.get('enhanced_context', '')
        state['graph_results'] = hybrid_results.get('graph_results', [])
        graph_count = len(hybrid_results.get('graph_results', []))
    except Exception as e:
        print(f"⚠️ Hybrid search unavailable: {e}")
        state['graph_context'] = ''
        state['graph_results'] = []
        graph_count = 0

    # Extract citations
    state['citations'] = [
        {
            'title': doc.get('title', 'Untitled'),
            'url': doc.get('url', ''),
            'source': doc.get('source', 'web'),
        }
        for doc in results
    ]

    print(f"✅ Found {len(results)} web sources + {graph_count} graph connections for user: {user_id}")
    return state


def summarise_node(state: AgentState) -> AgentState:
    """Summariser Agent – Condense each document"""
    print("\n" + "=" * 60)
    print("📝 STEP 2: SUMMARISER AGENT")
    print("=" * 60)

    state['current_agent'] = 'summariser'

    user = state.get('user')
    provider = state.get('preferred_provider', 'anthropic')

    summaries = summariser_agent(
        user=user,
        documents=state['retrieved_docs'],
        query=state['query'],
        provider=provider,
    )
    state['summaries'] = summaries

    print(f"✅ Summarized {len(summaries)} documents")
    return state


def critic_node(state: AgentState) -> AgentState:
    """Critic Agent – Check facts and confidence"""
    print("\n" + "=" * 60)
    print("🔎 STEP 3: CRITIC AGENT")
    print("=" * 60)

    state['current_agent'] = 'critic'

    user = state.get('user')
    provider = state.get('preferred_provider', 'anthropic')

    critique = critic_agent(
        user=user,
        summaries=state['summaries'],
        query=state['query'],
        provider=provider,
    )
    state['critique'] = critique

    print(f"✅ Analysis complete. Confidence: {critique.get('overall_confidence', 'N/A')}%")
    return state


def writer_node(state: AgentState) -> AgentState:
    """Writer Agent – Create final answer with graph insights"""
    print("\n" + "=" * 60)
    print("✍️ STEP 4: WRITER AGENT (with Knowledge Graph + User Preferences)")
    print("=" * 60)

    state['current_agent'] = 'writer'

    user = state.get('user')
    provider = state.get('preferred_provider', 'anthropic')
    user_id = getattr(user, 'public_id', 'guest') if user else 'guest'
    print(f"  👤 User ID: {user_id}")

    # Enhance summaries with graph context if available
    graph_context = state.get('graph_context', '')
    enhanced_summaries = state['summaries'].copy()
    if graph_context:
        enhanced_summaries.append(f"KNOWLEDGE GRAPH INSIGHTS:\n{graph_context}")

    # ✅ writer_agent now expects (user, query, summaries, critique, citations, provider)
    answer = writer_agent(
        user=user,
        query=state['query'],
        summaries=enhanced_summaries,
        critique=state['critique'],
        citations=state['citations'],
        provider=provider,
    )
    state['final_answer'] = answer

    # Extract entities for knowledge graph storage
    try:
        entities = hybrid._extract_entities(state['query'])
        entities = [e.strip() for e in entities if e.strip() and len(e.strip()) < 80 and e.strip().lower() != 'unknown']
        if not entities:
            words = state['query'].lower().replace('?', '').split()
            entities = [w for w in words if len(w) > 3][:5]
    except Exception:
        entities = []

    # ========== STORE IN KNOWLEDGE GRAPH ==========
    try:
        kg.add_research_entry(
            query=state['query'],
            answer=answer,
            sources=state['citations'],
            confidence=state.get('critique', {}).get('overall_confidence', 0),
            topics=entities,
            user_id=user_id,
        )
        print(f"  ✅ Stored in KG for user: {user_id[:20]}")
    except Exception as e:
        print(f"  ⚠️ KG storage error: {e}")

    # ========== RECORD IN USER MEMORY ==========
    try:
        user_memory.create_user_profile(user_id, user_id[:20], f"{user_id}@polynous.ai")
        user_memory.record_research(
            user_id=user_id,
            query=state['query'],
            answer=answer,
            topics=entities,
            confidence=state.get('critique', {}).get('overall_confidence', 0),
            mode="research",
            sources=state['citations'],
        )
        print(f"  ✅ Recorded in User Memory for user: {user_id[:20]}")
    except Exception as e:
        print(f"  ⚠️ Record research error: {e}")

    # ========== INDEX IN SEMANTIC SEARCH ==========
    try:
        semantic_search.add_to_index(
            user=user,
            query=state['query'],
            answer=answer,
            mode="research",
            confidence=state.get('critique', {}).get('overall_confidence', 0),
            sources=state['citations'],
            user_id=user_id,
        )
        print("  ✅ Indexed in Semantic Search")
    except Exception as e:
        print(f"  ⚠️ Search indexing: {e}")

    # ========== STORE IN PINECONE (USER‑SCOPED) ==========
    try:
        store_research(
            user_id=user_id,
            session_id=state.get('session_id', 'guest'),
            query=state['query'],
            documents=state.get('retrieved_docs', []),
            answer=answer,
            metadata={
                'confidence': state.get('critique', {}).get('overall_confidence', 0),
                'mode': 'research',
                'num_sources': len(state.get('retrieved_docs', [])),
            },
        )
        print(f"  ✅ Stored in Pinecone namespace user_{user_id}")
    except Exception as e:
        print(f"  ⚠️ Pinecone storage error: {e}")

    print("✅ Final answer ready with graph insights!")
    print("=" * 60 + "\n")
    return state


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