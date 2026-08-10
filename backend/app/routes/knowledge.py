from fastapi import APIRouter, Query, Request, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.knowledge_graph.graph_manager import kg
from app.knowledge_graph.hybrid_search import hybrid
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

# ─── Helper to safely get current user from request ──────────
def get_current_user(request: Optional[Request]) -> str:
    """Extract user public ID from auth middleware, or return 'guest'."""
    if request is None:
        return "guest"
    return getattr(request.state, 'user_public_id', 'guest')


@router.get("/graph")
async def get_knowledge_graph(request: Request):
    """Get the full knowledge graph for visualization — filtered by user."""
    user_id = get_current_user(request)

    try:
        graph_data = kg.get_user_knowledge_graph(user_id=user_id)
        return graph_data
    except Exception as e:
        return {"nodes": [], "edges": [], "error": str(e)}


@router.post("/seed-demo")
async def seed_demo_data(request: Request):
    """Seed the knowledge graph with demo data for testing — scoped to user."""
    user_id = get_current_user(request)

    demo_queries = [
        ("What is artificial intelligence?", "research"),
        ("How does machine learning work?", "research"),
        ("What are neural networks?", "research"),
        ("Is AI dangerous for humanity?", "debate"),
        ("How does Google use AI?", "research"),
        ("What is deep learning?", "research"),
        ("Should AI be regulated?", "debate"),
        ("How does OpenAI work?", "research"),
    ]

    try:
        for query, mode in demo_queries:
            entities = hybrid._extract_entities(query)
            kg.add_research_entry(
                query=query,
                answer=f"Research on: {query}",
                sources=[],
                confidence=85,
                topics=entities,
                user_id=user_id,
            )
            # Link entities
            for i in range(len(entities)):
                for j in range(i + 1, len(entities)):
                    kg.link_entities(entities[i], entities[j], query, user_id=user_id)

        return {
            "status": "ok",
            "message": f"Demo data seeded with {len(demo_queries)} queries for user: {user_id}",
        }
    except Exception as e:
        print(f"Error seeding demo data: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/node/{node_id}")
async def get_node_details(node_id: str, request: Request):
    """Get detailed information about a specific node — filtered by user."""
    user_id = get_current_user(request)

    if not kg.driver:
        return {
            "name": node_id,
            "type": "error",
            "total_connections": 0,
            "related_nodes": [],
            "user_id": user_id,
        }

    try:
        with kg.driver.session() as session:
            # Check entity
            result = session.run(
                """
                MATCH (e:Entity {name: $name})
                WHERE e.user_id = $user_id OR e.user_id IS NULL
                OPTIONAL MATCH (e)-[r:CO_OCCURS_WITH]-(connected:Entity)
                WHERE connected.user_id = $user_id OR connected.user_id IS NULL
                RETURN e.name as name,
                       count(DISTINCT connected) as total_connections,
                       collect(DISTINCT connected.name)[0..10] as related_nodes,
                       avg(r.count) as avg_weight
                """,
                name=node_id,
                user_id=user_id,
            )
            record = result.single()
            if record and record["name"]:
                return {
                    "name": record["name"],
                    "type": "entity",
                    "total_connections": record["total_connections"] or 0,
                    "related_nodes": record["related_nodes"] or [],
                    "avg_relationship_weight": round(record["avg_weight"] or 1, 1),
                    "first_seen": "Recent",
                    "last_updated": "Just now",
                    "user_id": user_id,
                }

            # Check topic
            topic_result = session.run(
                """
                MATCH (t:Topic {name: $name})
                WHERE t.user_id = $user_id OR t.user_id IS NULL
                OPTIONAL MATCH (q:Query)-[:ABOUT]->(t)
                WHERE q.user_id = $user_id OR q.user_id IS NULL
                RETURN t.name as name,
                       count(q) as research_count
                """,
                name=node_id,
                user_id=user_id,
            )
            topic_record = topic_result.single()
            if topic_record and topic_record["name"] and topic_record["research_count"] > 0:
                return {
                    "name": topic_record["name"],
                    "type": "topic",
                    "total_connections": topic_record["research_count"],
                    "related_nodes": [],
                    "research_count": topic_record["research_count"],
                    "first_seen": "Recent",
                    "last_updated": "Just now",
                    "user_id": user_id,
                }

            return {
                "name": node_id,
                "type": "unknown",
                "total_connections": 0,
                "related_nodes": [],
                "user_id": user_id,
            }

    except Exception as e:
        print(f"Node detail error: {e}")
        return {
            "name": node_id,
            "type": "error",
            "total_connections": 0,
            "related_nodes": [],
            "user_id": user_id,
        }


@router.get("/node/{node_id}/research")
async def get_node_research(node_id: str, request: Request):
    """Get research sessions related to a specific node — filtered by user."""
    user_id = get_current_user(request)

    if not kg.driver:
        return {"node": node_id, "related_research": [], "user_id": user_id}

    try:
        with kg.driver.session() as session:
            result = session.run(
                """
                MATCH (e:Entity {name: $name})
                WHERE e.user_id = $user_id OR e.user_id IS NULL
                OPTIONAL MATCH (q:Query)-[:ABOUT]->(:Topic {name: $name})
                WHERE q.user_id = $user_id OR q.user_id IS NULL
                OPTIONAL MATCH (q2:Query)
                WHERE q2.query CONTAINS $name AND (q2.user_id = $user_id OR q2.user_id IS NULL)
                RETURN DISTINCT coalesce(q.query, q2.query) as query,
                       coalesce(q.confidence, q2.confidence) as confidence
                LIMIT 5
                """,
                name=node_id,
                user_id=user_id,
            )

            research = []
            for record in result:
                if record["query"]:
                    research.append(
                        {
                            "query": record["query"][:100],
                            "confidence": record["confidence"] or 0,
                        }
                    )
            return {"node": node_id, "related_research": research, "user_id": user_id}

    except Exception as e:
        print(f"Node research error: {e}")
        return {"node": node_id, "related_research": [], "user_id": user_id}


@router.get("/topics")
async def get_topics(request: Request):
    """Get all research topics — filtered by user."""
    user_id = get_current_user(request)
    topics = kg.get_related_topics("", depth=1, limit=20, user_id=user_id)
    return {"topics": topics, "user_id": user_id}


@router.get("/related")
async def get_related_topics(topic: str = Query(...), request: Request = None):
    """Get topics related to a given topic — filtered by user."""
    user_id = get_current_user(request)
    related = kg.get_related_topics(topic, user_id=user_id)
    return {"topic": topic, "related": related, "user_id": user_id}


@router.get("/connections")
async def find_connections(
    entity1: str = Query(...),
    entity2: str = Query(...),
    request: Request = None,
):
    """Find paths between two entities — filtered by user."""
    user_id = get_current_user(request)
    paths = kg.find_connections(entity1, entity2, user_id=user_id)
    return {
        "entity1": entity1,
        "entity2": entity2,
        "paths": paths,
        "connected": len(paths) > 0,
        "user_id": user_id,
    }


@router.get("/hybrid-search")
async def hybrid_search(request: Request, query: str = Query(...), db: Session = Depends(get_db)):
    """Perform hybrid search (vector + knowledge graph), scoped to the user."""
    pub = get_current_user(request)
    user = None
    if pub and pub not in ("guest", "unknown"):
        user = db.query(User).filter(User.public_id == pub).first()
    results = hybrid.hybrid_search(query, user=user)
    return results


@router.get("/graph-metrics")
async def graph_metrics(request: Request):
    """Phase B: real graph ML over the user's graph (PageRank influence,
    Louvain communities, degree). Powers node sizing/coloring."""
    return kg.compute_graph_metrics(get_current_user(request))


@router.get("/contradictions")
async def contradictions(request: Request):
    """Phase F: contradiction radar over the user's typed knowledge graph."""
    return kg.get_contradictions(get_current_user(request))


@router.get("/node-similarity")
async def node_similarity(request: Request, node: str = Query(...), top_n: int = 8):
    """Phase B: topological node similarity (Jaccard over neighbourhoods).
    Structurally similar concepts — different from semantic similarity."""
    return kg.node_similarity(get_current_user(request), node, top_n=top_n)


@router.get("/community-labels")
async def community_labels(request: Request, db: Session = Depends(get_db)):
    """Phase B: auto-topic labels. Names each Louvain community with an LLM
    (falls back to the community's top-PageRank concept without a key)."""
    pub = get_current_user(request)
    user = None
    if pub and pub not in ("guest", "unknown"):
        user = db.query(User).filter(User.public_id == pub).first()
    provider = (getattr(user, "preferred_provider", "anthropic") or "anthropic") if user else "anthropic"
    return kg.label_communities(pub, user=user, provider=provider)


@router.get("/suggest-connections")
async def suggest_connections(request: Request, top_n: int = 8):
    """Phase B4: link prediction. Likely-missing connections between concepts
    the user researched separately (Adamic-Adar + common neighbours)."""
    return kg.suggest_connections(get_current_user(request), top_n=top_n)


@router.get("/graph-rag")
async def graph_rag(request: Request, query: str = Query(...), db: Session = Depends(get_db)):
    """Phase C: GraphRAG. Answer a question over the user's own typed knowledge
    graph, expanding a multi-hop subgraph and reasoning over the relationships."""
    pub = get_current_user(request)
    user = None
    if pub and pub not in ("guest", "unknown"):
        user = db.query(User).filter(User.public_id == pub).first()
    provider = getattr(user, "preferred_provider", "anthropic") or "anthropic" if user else "anthropic"
    return kg.graph_rag_answer(query, user=user, provider=provider, user_id=pub)


@router.get("/entities")
async def extract_entities(text: str = Query(...)):
    """Extract entities from text."""
    entities = hybrid._extract_entities(text)
    return {"text": text, "entities": entities}


@router.get("/pipeline-stats")
async def get_pipeline_stats():
    """Get unified embedding pipeline statistics."""
    from app.services.embedding_pipeline import pipeline
    return pipeline.get_stats()


@router.get("/cross-module")
async def cross_module_connections(
    query: str = Query(...),
    source_module: str = Query("research"),
):
    """Find connections across different modules."""
    from app.services.embedding_pipeline import pipeline
    results = pipeline.find_cross_module_connections(
        query=query, source_module=source_module
    )
    return {
        "query": query,
        "source_module": source_module,
        "cross_module_matches": results,
        "total": len(results),
    }


@router.get("/rich-graph")
async def get_rich_graph(request: Request):
    """Get enriched graph with Claims, Evidence, Arguments, Topics — filtered by user."""
    user_id = get_current_user(request)
    graph_data = kg.get_rich_graph(user_id=user_id)

    # If empty, seed demo data and try again
    if not graph_data.get('nodes'):
        kg.seed_rich_demo(user_id=user_id)
        graph_data = kg.get_rich_graph(user_id=user_id)

    return graph_data


@router.post("/seed-rich-demo")
async def seed_rich_demo(request: Request):
    """Seed rich demo data for testing — scoped to user."""
    user_id = get_current_user(request)
    return kg.seed_rich_demo(user_id=user_id)