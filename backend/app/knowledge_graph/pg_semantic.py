"""
Postgres + pgvector semantic search engine (retires Pinecone).

Same interface as the Pinecone engine (add_to_index / search / novelty), so the
routes and orchestrator don't change. Embeddings are created with the user's own
key via the existing create_embedding(), stored in the `semantic_entries.vector`
column, and searched with pgvector's cosine operator `<=>`.

Everything now lives in one Postgres: KG, memory, analytics, AND semantic search.
"""
import json
import hashlib
import time
from typing import List

from sqlalchemy import text
from app.database import engine


def _vec_literal(v) -> str:
    """Render a python float list as a pgvector literal '[v1,v2,...]'."""
    return "[" + ",".join(f"{float(x):.7f}" for x in v) + "]"


class PgSemanticSearch:
    def add_to_index(self, user, query: str, answer: str = "", mode: str = "research",
                     confidence: float = 0, sources: List = None, user_id: str = "guest"):
        from app.llm_client import create_embedding
        source_titles = [s.get("title", "") for s in (sources or []) if isinstance(s, dict)]
        eid = hashlib.md5(f"{query}{time.time()}".encode()).hexdigest()[:16]
        emb = create_embedding(user, f"{query} {(answer or '')[:500]}")
        if not emb:
            raise RuntimeError("embedding creation returned empty (missing/invalid key)")
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO semantic_entries (user_id, entry_id, query, answer, mode, confidence, sources, embedding)
                VALUES (:u, :eid, :q, :a, :m, :c, :s, CAST(:emb AS vector))
            """), {"u": user_id, "eid": eid, "q": (query or "")[:2000], "a": (answer or "")[:8000],
                   "m": mode, "c": float(confidence or 0),
                   "s": json.dumps(source_titles), "emb": _vec_literal(emb)})
        return {"id": eid, "query": query, "answer": answer, "mode": mode,
                "confidence": confidence, "sources": source_titles,
                "score": 100.0, "user_id": user_id}

    def search(self, user, query: str, top_k: int = 10, filters=None, user_id: str = "guest") -> List:
        from app.llm_client import create_embedding
        emb = create_embedding(user, query)
        if not emb:
            return []
        mode = (filters or {}).get("mode") if filters else None
        sql = """
            SELECT entry_id, query, answer, mode, confidence, sources,
                   1 - (embedding <=> CAST(:q AS vector)) AS sim
            FROM semantic_entries
            WHERE user_id = :u AND embedding IS NOT NULL
        """
        params = {"u": user_id, "q": _vec_literal(emb), "k": top_k}
        if mode:
            sql += " AND mode = :m"; params["m"] = mode
        sql += " ORDER BY embedding <=> CAST(:q AS vector) LIMIT :k"
        with engine.connect() as conn:
            rows = conn.execute(text(sql), params).fetchall()
        out = []
        for (eid, q, a, m, c, s, sim) in rows:
            out.append({"id": eid, "score": round(max(0.0, float(sim)) * 100, 1),
                        "query": q, "answer": (a or "")[:600], "mode": m,
                        "confidence": c, "sources": _asjson(s), "user_id": user_id})
        return out

    def novelty(self, user, query: str, user_id: str = "guest"):
        """1.0 = brand-new direction, 0.0 = you've researched this exact thing."""
        from app.llm_client import create_embedding
        emb = create_embedding(user, query)
        if not emb:
            return None
        with engine.connect() as conn:
            r = conn.execute(text("""
                SELECT max(1 - (embedding <=> CAST(:q AS vector))) FROM semantic_entries
                WHERE user_id = :u AND embedding IS NOT NULL
            """), {"u": user_id, "q": _vec_literal(emb)}).fetchone()
        best = r[0] if r and r[0] is not None else 0.0
        return round(max(0.0, 1.0 - float(best)), 3)

    # GraphRAG helper — vector-retrieve the most relevant concept nodes, so the
    # graph reasoning starts from meaning, not just keyword overlap.
    def similar_concepts(self, user, query: str, user_id: str = "guest", k: int = 6) -> List[str]:
        from app.llm_client import create_embedding
        emb = create_embedding(user, query)
        if not emb:
            return []
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT name FROM kg_nodes
                WHERE user_id = :u AND embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:q AS vector) LIMIT :k
            """), {"u": user_id, "q": _vec_literal(emb), "k": k}).fetchall()
        return [r[0] for r in rows]


def _asjson(v):
    if isinstance(v, (list, dict)):
        return v
    try:
        return json.loads(v)
    except Exception:
        return []


semantic_search = PgSemanticSearch()
