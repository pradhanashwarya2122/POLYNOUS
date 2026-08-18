"""
Postgres-backed knowledge graph + user memory (drop-in replacement for the
Neo4j `kg` and `user_memory` singletons).

Why: Neo4j Aura free instances auto-pause and become unreachable in deployment.
The graph here is small (hundreds of nodes per user) and the graph ML is pure
Python, so a couple of relational tables + in-Python algorithms give the same
capabilities with none of the flakiness — and it reuses the Postgres that
Railway already provides.

Storage:
  kg_nodes(user_id, name, ntype, props, embedding)   -- concepts/topics/entities…
  kg_edges(user_id, source, target, rel_type, weight, confidence, cnt)
  memory_sessions(user_id, query, answer, topics, confidence, mode, sources)
  memory_debates(user_id, topic, for_score, against_score, winner)
  user_profiles(user_id, username, email)

The pure-Python graph algorithms (PageRank, Louvain, betweenness, Jaccard,
Adamic-Adar) live in graph_algorithms.py and operate on edge lists pulled here.
"""
import json
import re
import math
from typing import Dict, List

from sqlalchemy import text

from app.database import engine, SessionLocal
from app.knowledge_graph import graph_algorithms as ga


# ── Schema ──────────────────────────────────────────────────────────────
_SCHEMA = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    """
    CREATE TABLE IF NOT EXISTS kg_nodes (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        ntype TEXT NOT NULL DEFAULT 'concept',
        props JSONB NOT NULL DEFAULT '{}',
        embedding vector(1536),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, ntype, name)
    )
    """,
    "CREATE INDEX IF NOT EXISTS kg_nodes_user ON kg_nodes(user_id)",
    """
    CREATE TABLE IF NOT EXISTS kg_edges (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        rel_type TEXT NOT NULL DEFAULT 'RELATED_TO',
        weight REAL NOT NULL DEFAULT 1,
        confidence REAL NOT NULL DEFAULT 0.6,
        cnt INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, source, rel_type, target)
    )
    """,
    "CREATE INDEX IF NOT EXISTS kg_edges_user ON kg_edges(user_id)",
    """
    CREATE TABLE IF NOT EXISTS memory_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT,
        answer TEXT,
        topics JSONB NOT NULL DEFAULT '[]',
        confidence REAL NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'research',
        sources JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS memory_sessions_user ON memory_sessions(user_id, created_at DESC)",
    """
    CREATE TABLE IF NOT EXISTS memory_debates (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT,
        for_score REAL, against_score REAL, winner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        username TEXT, email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    # Semantic search index (retires Pinecone): research entries + embeddings.
    """
    CREATE TABLE IF NOT EXISTS semantic_entries (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        entry_id TEXT,
        query TEXT, answer TEXT, mode TEXT DEFAULT 'research',
        confidence REAL DEFAULT 0,
        sources JSONB NOT NULL DEFAULT '[]',
        embedding vector(1536),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS semantic_entries_user ON semantic_entries(user_id)",
]


def init_schema():
    with engine.begin() as conn:
        for stmt in _SCHEMA:
            conn.execute(text(stmt))
    print("✅ Postgres KG/memory schema ready")


def _sanitize(uid) -> str:
    return re.sub(r"[^a-zA-Z0-9_\-]", "", str(uid or "guest"))[:80] or "guest"


# ── Concept extraction vocabulary (self-contained; no Neo4j import) ──────
TRIPLE_RELATIONS = {
    "CAUSES", "SUPPORTS", "REFUTES", "PART_OF", "ENABLES",
    "PRECEDED_BY", "CONTRADICTS", "RELATED_TO",
}
GENERIC_CONCEPTS = {
    "study", "studies", "research", "researchers", "system", "systems", "data",
    "dataset", "people", "it", "this", "that", "approach", "method", "methods",
    "results", "result", "paper", "authors", "author", "model", "models",
    "concept", "concepts", "information", "technology", "process", "processes",
    "thing", "things", "work", "works", "field", "area", "topic", "issue",
    "problem", "solution", "example", "case", "way", "part", "type", "number",
}


def _canon_concept(name: str) -> str:
    """Canonicalize a concept label: strip leading articles, collapse spaces,
    drop trailing punctuation, keep the field's own casing/acronyms."""
    s = re.sub(r"^(the|a|an)\s+", "", (name or "").strip(), flags=re.IGNORECASE)
    return re.sub(r"[\s]+", " ", s).strip(" .,:;–-")


def _is_concrete(name: str) -> bool:
    """True if the phrase is a real, specific concept (not a generic keyword)."""
    n = (name or "").strip()
    return len(n) >= 3 and n.lower() not in GENERIC_CONCEPTS


# ══════════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH
# ══════════════════════════════════════════════════════════════════════
class PgGraph:
    """Postgres implementation of the knowledge-graph interface."""

    driver = True  # truthy sentinel — routes check `if kg.driver`

    # ── writes ──────────────────────────────────────────────────────
    def _load_edges(self, uid: str):
        """Return (node_names, edges[(s,t)]) for the user's concept graph."""
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT source, target FROM kg_edges WHERE user_id=:u LIMIT 5000"
            ), {"u": uid}).fetchall()
        node_ids, seen, edges = [], set(), []
        for s, t in rows:
            if not s or not t or s == t:
                continue
            edges.append((s, t))
            for n in (s, t):
                if n not in seen:
                    seen.add(n); node_ids.append(n)
        return node_ids, edges

    def extract_and_link_triples(self, text_in: str, user=None, provider: str = "anthropic",
                                 model: str = None, user_id: str = "guest",
                                 source: str = "research") -> List[str]:
        """LLM-extract typed {subject, relation, object} triples and store them
        as concept nodes + typed edges. `source` (research/debate/pdf) is stored
        on each node so the graph can distinguish where a concept came from."""
        uid = _sanitize(user_id)
        src = source if source in ("research", "debate", "pdf") else "research"
        try:
            from app.llm_client import ask_llm
            system = (
                "Extract the key typed relationships from the text as a JSON array of "
                '{"subject","relation","object","confidence"} objects.\n'
                "- Subjects/objects must be CONCRETE, canonical, domain-specific concepts "
                "(named technologies, methods, models, organizations, metrics, phenomena).\n"
                "- NEVER output vague tokens ('the study','system','data','it') or stop-words.\n"
                "- Choose the relation reflecting real logic (CAUSES, ENABLES, PART_OF, "
                "REFUTES/CONTRADICTS, SUPPORTS) over generic RELATED_TO.\n"
                "Return 3-8 of the most important relationships. Return ONLY the raw JSON array."
            )
            raw = ask_llm(user=user, provider=provider, system_prompt=system,
                          messages=[{"role": "user", "content": (text_in or "")[:4000]}],
                          max_tokens=700, temperature=0.2)
            triples = _parse_triples(raw)
            if not triples:
                return self.extract_and_link_entities(text_in, user_id=uid)

            names = set()
            with engine.begin() as conn:
                for t in triples:
                    subj = _sanitize(_canon_concept(t["subject"]))[:80]
                    obj = _sanitize(_canon_concept(t["object"]))[:80]
                    rel = t["relation"] if t["relation"] in TRIPLE_RELATIONS else "RELATED_TO"
                    conf = float(t.get("confidence", 0.6) or 0.6)
                    subj_disp = _canon_concept(t["subject"])[:80]
                    obj_disp = _canon_concept(t["object"])[:80]
                    if not _is_concrete(subj) or not _is_concrete(obj) or subj_disp.lower() == obj_disp.lower():
                        continue
                    for nm in (subj_disp, obj_disp):
                        conn.execute(text("""
                            INSERT INTO kg_nodes (user_id, name, ntype, props)
                            VALUES (:u, :n, 'concept', :p)
                            ON CONFLICT (user_id, ntype, name)
                            DO UPDATE SET props = kg_nodes.props || :p
                        """), {"u": uid, "n": nm, "p": json.dumps({"source": src})})
                        names.add(nm)
                    conn.execute(text("""
                        INSERT INTO kg_edges (user_id, source, target, rel_type, confidence, cnt)
                        VALUES (:u, :s, :t, :r, :c, 1)
                        ON CONFLICT (user_id, source, rel_type, target)
                        DO UPDATE SET cnt = kg_edges.cnt + 1, confidence = :c
                    """), {"u": uid, "s": subj_disp, "t": obj_disp, "r": rel, "c": conf})
            self._embed_concepts(list(names), user, uid)
            print(f"✅ [PG] Linked {len(triples)} typed triples for user {uid}")
            return list(names)
        except Exception as e:
            print(f"⚠️ [PG] Triple extraction failed ({e}); regex fallback")
            return self.extract_and_link_entities(text_in, user_id=uid)

    def _embed_concepts(self, names, user, uid):
        """Best-effort: store an embedding on each concept node so GraphRAG can
        retrieve entry concepts by meaning (pgvector). Only embeds nodes that
        don't have one yet, so repeat research runs stay cheap."""
        if user is None or not names:
            return
        try:
            from app.llm_client import create_embedding
            from app.knowledge_graph.pg_semantic import _vec_literal
            with engine.begin() as conn:
                missing = [r[0] for r in conn.execute(text("""
                    SELECT name FROM kg_nodes
                    WHERE user_id=:u AND ntype='concept' AND embedding IS NULL AND name = ANY(:names)
                """), {"u": uid, "names": list(names)}).fetchall()]
                for nm in missing:
                    emb = create_embedding(user, nm)
                    if emb:
                        conn.execute(text("""
                            UPDATE kg_nodes SET embedding=CAST(:e AS vector)
                            WHERE user_id=:u AND ntype='concept' AND name=:n
                        """), {"e": _vec_literal(emb), "u": uid, "n": nm})
        except Exception as e:
            print(f"⚠️ [PG] concept embedding skipped: {e}")

    def extract_and_link_entities(self, text_in: str, user_id: str = "guest") -> List[str]:
        """Regex fallback: capitalized multi-word phrases → co-occurrence edges."""
        uid = _sanitize(user_id)
        ents = _regex_entities(text_in)[:8]
        if len(ents) < 2:
            return ents
        with engine.begin() as conn:
            for e in ents:
                conn.execute(text("""
                    INSERT INTO kg_nodes (user_id, name, ntype) VALUES (:u,:n,'concept')
                    ON CONFLICT (user_id, ntype, name) DO NOTHING
                """), {"u": uid, "n": e[:80]})
            for i in range(len(ents)):
                for j in range(i + 1, len(ents)):
                    conn.execute(text("""
                        INSERT INTO kg_edges (user_id, source, target, rel_type, confidence)
                        VALUES (:u,:s,:t,'RELATED_TO',0.5)
                        ON CONFLICT (user_id, source, rel_type, target)
                        DO UPDATE SET cnt = kg_edges.cnt + 1
                    """), {"u": uid, "s": ents[i][:80], "t": ents[j][:80]})
        return ents

    def add_research_entry(self, query="", answer="", sources=None, confidence=0,
                           topics=None, user_id="guest", **kw):
        """Store the research topics as topic nodes + co-occurrence edges."""
        uid = _sanitize(user_id)
        topics = [t for t in (topics or []) if t][:12]
        try:
            with engine.begin() as conn:
                for t in topics:
                    conn.execute(text("""
                        INSERT INTO kg_nodes (user_id, name, ntype, props)
                        VALUES (:u,:n,'topic', :p)
                        ON CONFLICT (user_id, ntype, name)
                        DO UPDATE SET props = kg_nodes.props || :p
                    """), {"u": uid, "n": str(t)[:80],
                           "p": json.dumps({"last_query": (query or "")[:200]})})
                for i in range(len(topics)):
                    for j in range(i + 1, len(topics)):
                        conn.execute(text("""
                            INSERT INTO kg_edges (user_id, source, target, rel_type, confidence)
                            VALUES (:u,:s,:t,'CO_OCCURS',0.6)
                            ON CONFLICT (user_id, source, rel_type, target)
                            DO UPDATE SET cnt = kg_edges.cnt + 1
                        """), {"u": uid, "s": str(topics[i])[:80], "t": str(topics[j])[:80]})
        except Exception as e:
            print(f"⚠️ [PG] add_research_entry failed: {e}")

    def link_entities(self, a, b, query="", user_id="guest", **kw):
        uid = _sanitize(user_id)
        try:
            with engine.begin() as conn:
                for n in (a, b):
                    conn.execute(text("INSERT INTO kg_nodes (user_id,name,ntype) VALUES (:u,:n,'entity') ON CONFLICT DO NOTHING"),
                                 {"u": uid, "n": str(n)[:80]})
                conn.execute(text("""
                    INSERT INTO kg_edges (user_id,source,target,rel_type,confidence)
                    VALUES (:u,:s,:t,'CO_OCCURS',0.5)
                    ON CONFLICT (user_id,source,rel_type,target) DO UPDATE SET cnt=kg_edges.cnt+1
                """), {"u": uid, "s": str(a)[:80], "t": str(b)[:80]})
        except Exception:
            pass

    # ── reads: visualization ───────────────────────────────────────
    _TYPE_COLORS = {"concept": "rgba(168,85,247,0.5)", "topic": "rgba(255,136,0,0.4)",
                    "entity": "rgba(0,255,204,0.4)"}

    def get_user_knowledge_graph(self, user_id: str = "guest") -> Dict:
        uid = _sanitize(user_id)
        try:
            with engine.connect() as conn:
                node_rows = conn.execute(text("""
                    SELECT n.name, n.ntype, n.props->>'source' AS src,
                           (SELECT count(*) FROM kg_edges e
                             WHERE e.user_id=n.user_id AND (e.source=n.name OR e.target=n.name)) AS deg
                    FROM kg_nodes n WHERE n.user_id=:u ORDER BY deg DESC LIMIT 300
                """), {"u": uid}).fetchall()
                edge_rows = conn.execute(text("""
                    SELECT source, target, rel_type, weight, cnt FROM kg_edges
                    WHERE user_id=:u LIMIT 600
                """), {"u": uid}).fetchall()

            def _disp_type(nt, src):
                # Concepts get a distinguishable type by where they came from
                # (pdf / debate) so the graph can colour them differently.
                return src if (nt == "concept" and src in ("pdf", "debate")) else nt
            nodes = [{
                "id": f"{nt}_{name}", "label": name,
                "type": _disp_type(nt, src), "source": src or "research",
                "size": min(38, (deg or 0) * 5 + 16), "connections": deg or 0,
                "user_id": uid,
            } for (name, nt, src, deg) in node_rows]
            valid = {n["label"] for n in nodes}
            edges = []
            for (s, t, rt, w, cnt) in edge_rows:
                if s in valid and t in valid:
                    edges.append({"source": f"concept_{s}" if _ntype_of(s, node_rows) == 'concept' else _node_id(s, node_rows),
                                  "target": f"concept_{t}" if _ntype_of(t, node_rows) == 'concept' else _node_id(t, node_rows),
                                  "type": rt, "weight": w or 1, "color": "rgba(96,165,250,0.5)"})
            return {"nodes": nodes, "edges": edges}
        except Exception as e:
            return {"nodes": [], "edges": [], "error": str(e)}

    def get_rich_graph(self, user_id: str = "guest") -> Dict:
        # Concept graph is the "rich" graph in the Postgres model.
        return self.get_user_knowledge_graph(user_id)

    def seed_rich_demo(self, user_id: str = "guest"):
        return {"status": "ok", "message": "seed not needed on postgres backend"}

    # ── reads: graph ML ────────────────────────────────────────────
    def compute_graph_metrics(self, user_id: str = "guest") -> Dict:
        uid = _sanitize(user_id)
        node_ids, edges = self._load_edges(uid)
        if not node_ids:
            return {"nodes": {}, "communities": 0, "summary": {"nodes": 0, "edges": 0}}
        pr = ga.pagerank(node_ids, edges)
        comm = ga.leiden(node_ids, edges)   # Leiden (falls back to Louvain w/o igraph)
        btw = ga.betweenness(node_ids, edges)
        deg = {n: 0 for n in node_ids}
        for s, t in edges:
            deg[s] += 1; deg[t] += 1
        mx = max(pr.values()) if pr else 1.0
        bmx = max(btw.values()) if btw and max(btw.values()) > 0 else 1.0
        nodes = {n: {"pagerank": round(pr[n] / mx, 4) if mx else 0.0,
                     "betweenness": round(btw.get(n, 0.0) / bmx, 4) if bmx else 0.0,
                     "community": comm.get(n, 0), "degree": deg.get(n, 0)} for n in node_ids}
        top = sorted(node_ids, key=lambda n: pr[n], reverse=True)[:5]
        bridges = [{"name": n, "betweenness": round(btw.get(n, 0.0) / bmx, 3)}
                   for n in sorted(node_ids, key=lambda n: btw.get(n, 0.0), reverse=True)
                   if btw.get(n, 0.0) > 0][:5]
        return {"nodes": nodes, "communities": len(set(comm.values())),
                "summary": {"nodes": len(node_ids), "edges": len(edges),
                            "top_concepts": [{"name": n, "pagerank": round(pr[n] / mx, 3)} for n in top],
                            "bridge_concepts": bridges}}

    def suggest_connections(self, user_id: str = "guest", top_n: int = 8) -> Dict:
        """ML link prediction (logistic regression on graph features), falling
        back to the Adamic-Adar heuristic on tiny graphs."""
        uid = _sanitize(user_id)
        node_ids, edges = self._load_edges(uid)
        return {"suggestions": ga.ml_link_predict(node_ids, edges, top_n)}

    def node_similarity(self, user_id: str, node: str, top_n: int = 8) -> Dict:
        uid = _sanitize(user_id)
        node_ids, edges = self._load_edges(uid)
        return {"node": node, "similar": ga.jaccard_similar(node_ids, edges, node, top_n)}

    def structural_similar(self, user_id: str, node: str, top_n: int = 8) -> Dict:
        """Role/structure similarity via graph embeddings (SVD stand-in for
        node2vec) — different from neighbourhood Jaccard."""
        uid = _sanitize(user_id)
        node_ids, edges = self._load_edges(uid)
        return {"node": node, "similar": ga.embedding_similar(node_ids, edges, node, top_n)}

    def label_communities(self, user_id: str, user=None, provider: str = "anthropic",
                          model: str = None) -> Dict:
        metrics = self.compute_graph_metrics(user_id)
        nodes = metrics.get("nodes", {})
        if not nodes:
            return {"labels": {}, "communities": 0}
        groups: Dict[int, list] = {}
        for name, m in nodes.items():
            groups.setdefault(m.get("community", 0), []).append((name, m.get("pagerank", 0.0)))
        labels = {}
        for cid, members in groups.items():
            members.sort(key=lambda x: x[1], reverse=True)
            concepts = [n for n, _ in members][:8]
            labels[str(cid)] = {"label": concepts[0] if concepts else f"Cluster {cid}",
                                "concepts": concepts, "size": len(members)}
        if user is not None:
            try:
                from app.llm_client import ask_llm
                payload = {cid: v["concepts"] for cid, v in labels.items()}
                raw = ask_llm(user=user, provider=provider,
                              system_prompt=("Name clusters of concepts. Given JSON of clusterId->concept "
                                             "list, return ONLY JSON mapping each clusterId to a 2-4 word "
                                             "topic label."),
                              messages=[{"role": "user", "content": json.dumps(payload)}],
                              max_tokens=400, temperature=0.2)
                m = re.search(r"\{.*\}", raw or "", re.DOTALL)
                if m:
                    for cid, lab in json.loads(m.group(0)).items():
                        if str(cid) in labels and isinstance(lab, str) and lab.strip():
                            labels[str(cid)]["label"] = lab.strip()[:40]
            except Exception as e:
                print(f"⚠️ [PG] community labeling failed: {e}")
        return {"labels": labels, "communities": len(labels)}

    def get_contradictions(self, user_id: str = "guest", limit: int = 20) -> Dict:
        uid = _sanitize(user_id)
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT source, rel_type, target, confidence FROM kg_edges
                    WHERE user_id=:u AND rel_type IN ('CONTRADICTS','REFUTES')
                    ORDER BY confidence DESC LIMIT :l
                """), {"u": uid, "l": limit}).fetchall()
            conflicts = [{"a": s, "relation": rt, "b": t, "confidence": c} for (s, rt, t, c) in rows]
            return {"conflicts": conflicts, "count": len(conflicts)}
        except Exception:
            return {"conflicts": []}

    def find_connections(self, entity1, entity2, user_id="guest", **kw):
        uid = _sanitize(user_id)
        node_ids, edges = self._load_edges(uid)
        path = ga.shortest_path(node_ids, edges, entity1, entity2)
        return [{"path": path, "length": len(path)}] if path else []

    def get_related_topics(self, topic="", depth=1, limit=20, user_id="guest", **kw):
        uid = _sanitize(user_id)
        try:
            with engine.connect() as conn:
                if topic:
                    rows = conn.execute(text("""
                        SELECT DISTINCT CASE WHEN source=:t THEN target ELSE source END AS other
                        FROM kg_edges WHERE user_id=:u AND (:t IN (source,target)) LIMIT :l
                    """), {"u": uid, "t": topic, "l": limit}).fetchall()
                else:
                    rows = conn.execute(text("SELECT name FROM kg_nodes WHERE user_id=:u LIMIT :l"),
                                        {"u": uid, "l": limit}).fetchall()
            return [r[0] for r in rows if r[0]]
        except Exception:
            return []

    def graph_rag_answer(self, query: str, user=None, provider: str = "anthropic",
                         model: str = None, user_id: str = "guest") -> Dict:
        empty = {"answer": "", "triples": [], "entry": [], "grounded": False}
        uid = _sanitize(user_id)
        q_terms = set(re.findall(r"[a-z]{3,}", (query or "").lower()))
        if not q_terms:
            return {**empty, "answer": "Ask about concepts you've researched."}
        try:
            # GraphRAG: retrieve entry concepts by MEANING (pgvector) first, then
            # fall back to keyword overlap. This is the vector+graph hybrid.
            entry = []
            try:
                from app.knowledge_graph.pg_semantic import semantic_search as _sem
                entry = _sem.similar_concepts(user, query, user_id=uid, k=6)
            except Exception:
                entry = []
            with engine.connect() as conn:
                if not entry:
                    names = [r[0] for r in conn.execute(text(
                        "SELECT name FROM kg_nodes WHERE user_id=:u LIMIT 800"), {"u": uid}).fetchall()]
                    entry = [n for n in names if q_terms & set(re.findall(r"[a-z]{3,}", (n or "").lower()))][:6]
                if not entry:
                    return {**empty, "answer": "Your graph doesn't cover that yet. Research it first, then ask again."}
                rows = conn.execute(text("""
                    SELECT source, rel_type, target FROM kg_edges
                    WHERE user_id=:u AND (source = ANY(:e) OR target = ANY(:e)) LIMIT 60
                """), {"u": uid, "e": entry}).fetchall()
            triples = [{"subject": s, "relation": rt, "object": t} for (s, rt, t) in rows]
            facts = "\n".join(f"- {s} {rt} {t}" for (s, rt, t) in rows)
            from app.llm_client import ask_llm
            answer = ask_llm(user=user, provider=provider,
                             system_prompt=("Answer the question using ONLY these knowledge-graph facts. "
                                            "Cite the relationships you use. If unsupported, say so.\n\n" + facts),
                             messages=[{"role": "user", "content": query}],
                             max_tokens=600, temperature=0.3)
            return {"answer": (answer or "").strip(), "triples": triples, "entry": entry, "grounded": True}
        except Exception as e:
            err_msg = str(e)
            if "401" in err_msg or "authentication_error" in err_msg or "API key is invalid" in err_msg or "api_key" in err_msg.lower():
                err_msg = "Invalid or missing API key. Please configure your API key in Settings → API Keys."
            return {**empty, "answer": f"Graph reasoning failed: {err_msg}"}

    # ── debate/rich helpers (minimal, non-fatal) ───────────────────
    def create_claim_node(self, *a, **k): return None
    def create_argument_node(self, *a, **k): return None
    def link_argument_to_counterargument(self, *a, **k): return None
    def link_research_to_debate(self, *a, **k): return None


# ══════════════════════════════════════════════════════════════════════
# USER MEMORY
# ══════════════════════════════════════════════════════════════════════
class PgMemory:
    def _get_driver(self):
        return True

    def create_user_profile(self, user_id, username="", email=""):
        uid = _sanitize(user_id)
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO user_profiles (user_id, username, email) VALUES (:u,:n,:e)
                    ON CONFLICT (user_id) DO UPDATE SET username=:n, email=:e
                """), {"u": uid, "n": username, "e": email})
        except Exception:
            pass

    def record_research(self, user_id, query="", answer="", topics=None,
                        confidence=0, mode="research", sources=None):
        uid = _sanitize(user_id)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO memory_sessions (user_id, query, answer, topics, confidence, mode, sources)
                VALUES (:u,:q,:a,:tp,:c,:m,:s)
            """), {"u": uid, "q": (query or "")[:2000], "a": (answer or "")[:8000],
                   "tp": json.dumps([str(t)[:80] for t in (topics or [])]),
                   "c": float(confidence or 0), "m": mode,
                   "s": json.dumps((sources or [])[:20], default=str)})
        print(f"✅ [PG] Recorded research for user {uid[:20]}")

    def record_debate(self, user_id, topic="", for_score=5, against_score=5, winner="TIE"):
        uid = _sanitize(user_id)
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO memory_debates (user_id, topic, for_score, against_score, winner)
                    VALUES (:u,:t,:f,:a,:w)
                """), {"u": uid, "t": topic[:500], "f": for_score, "a": against_score, "w": winner})
        except Exception:
            pass

    def get_user_stats(self, user_id) -> Dict:
        uid = _sanitize(user_id)
        with engine.connect() as conn:
            r = conn.execute(text("""
                SELECT count(*) , coalesce(avg(confidence),0) FROM memory_sessions WHERE user_id=:u
            """), {"u": uid}).fetchone()
            d = conn.execute(text("SELECT count(*) FROM memory_debates WHERE user_id=:u"),
                             {"u": uid}).fetchone()
            topics = conn.execute(text("""
                SELECT count(DISTINCT jt) FROM memory_sessions,
                       LATERAL jsonb_array_elements_text(topics) jt WHERE user_id=:u
            """), {"u": uid}).fetchone()
            uname = conn.execute(text("SELECT username FROM user_profiles WHERE user_id=:u"),
                                 {"u": uid}).fetchone()
        return {"username": (uname[0] if uname else uid[:20]),
                "total_research": r[0] or 0, "total_debates": d[0] or 0,
                "avg_confidence": round(float(r[1] or 0), 1), "unique_topics": topics[0] or 0}

    def get_recent_research(self, user_id, limit=20) -> List[Dict]:
        uid = _sanitize(user_id)
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT query, answer, topics, confidence, mode, created_at
                FROM memory_sessions WHERE user_id=:u ORDER BY created_at DESC LIMIT :l
            """), {"u": uid, "l": limit}).fetchall()
        return [{"query": q, "answer": (a or "")[:400], "topics": _asjson(tp),
                 "confidence": c, "mode": m, "timestamp": str(ts)} for (q, a, tp, c, m, ts) in rows]

    def get_recent_debates(self, user_id, limit=20) -> List[Dict]:
        """Recent debates from Postgres (the /memory/debates read path)."""
        uid = _sanitize(user_id)
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT topic, for_score, against_score, winner, created_at
                    FROM memory_debates WHERE user_id=:u ORDER BY created_at DESC LIMIT :l
                """), {"u": uid, "l": limit}).fetchall()
            return [{"topic": t, "for_score": f, "against_score": a, "winner": w,
                     "timestamp": str(ts)[:19] if ts else None} for (t, f, a, w, ts) in rows]
        except Exception as e:
            print(f"⚠️ [PG] get_recent_debates failed: {e}")
            return []

    def get_user_interests(self, user_id, limit=10) -> List[Dict]:
        uid = _sanitize(user_id)
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT jt AS topic, count(*) AS c
                FROM memory_sessions, LATERAL jsonb_array_elements_text(topics) jt
                WHERE user_id=:u GROUP BY jt ORDER BY c DESC LIMIT :l
            """), {"u": uid, "l": limit}).fetchall()
        return [{"topic": t, "count": c, "weight": c} for (t, c) in rows]

    def get_personalized_context(self, user_id, query="") -> str:
        interests = self.get_user_interests(user_id, 5)
        if not interests:
            return ""
        return "User's recurring research interests: " + ", ".join(i["topic"] for i in interests)

    def get_related_suggestions(self, user_id, topic="") -> List[str]:
        return [i["topic"] for i in self.get_user_interests(user_id, 8) if i["topic"] != topic][:5]


# ── helpers ─────────────────────────────────────────────────────────────
def _asjson(v):
    if isinstance(v, (list, dict)):
        return v
    try:
        return json.loads(v)
    except Exception:
        return []


def _parse_triples(raw: str) -> List[Dict]:
    if not raw:
        return []
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if not m:
        return []
    try:
        arr = json.loads(m.group(0))
    except Exception:
        return []
    out = []
    for t in arr:
        if isinstance(t, dict) and t.get("subject") and t.get("relation") and t.get("object"):
            out.append({"subject": str(t["subject"]), "relation": str(t["relation"]).upper().replace(" ", "_"),
                        "object": str(t["object"]), "confidence": t.get("confidence", 0.6)})
    return out


_STOP = {"the", "and", "for", "with", "this", "that", "from", "study", "research", "data", "system"}


def _regex_entities(text_in: str) -> List[str]:
    if not text_in:
        return []
    cands = re.findall(r"\b([A-Z][a-zA-Z0-9]+(?:[ -][A-Z][a-zA-Z0-9]+)*)\b", text_in)
    seen, out = set(), []
    for c in cands:
        cl = c.lower()
        if cl in _STOP or len(c) < 3 or cl in seen:
            continue
        seen.add(cl); out.append(c)
    return out


def _node_id(name, node_rows):
    return f"{_ntype_of(name, node_rows)}_{name}"


def _ntype_of(name, node_rows):
    for row in node_rows:      # rows are (name, ntype, src, deg)
        if row[0] == name:
            return row[1]
    return "concept"


# Singletons (match the Neo4j module's exported names).
kg = PgGraph()
user_memory = PgMemory()
