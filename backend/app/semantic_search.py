from typing import List, Dict, Optional
import os
import hashlib
import time
import json
from dotenv import load_dotenv
from pinecone import Pinecone

# Import the centralised, user‑aware embedding function (strict user key only)
from app.llm_client import create_embedding

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = "polynous-memory"
EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small


def _cosine(a, b) -> float:
    import math
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def _mmr_rerank(query_vec, matches, k, lam: float = 0.7):
    """Maximal Marginal Relevance: greedily pick results that are relevant to
    the query yet diverse from those already chosen, so near-duplicate research
    entries don't crowd the top. Relevance = the match's cosine score; diversity
    = max cosine to the already-selected set."""
    if len(matches) <= k:
        return matches
    cand = list(matches)
    selected = []
    while cand and len(selected) < k:
        best, best_val = None, -1e18
        for m in cand:
            rel = getattr(m, "score", 0) or 0
            mv = getattr(m, "values", None)
            div = 0.0
            if selected and mv:
                div = max(_cosine(mv, getattr(s, "values", None) or []) for s in selected)
            val = lam * rel - (1 - lam) * div
            if val > best_val:
                best_val, best = val, m
        selected.append(best)
        cand.remove(best)
    return selected


# ──────────────────────────────────────────────────────────────────────────────
# Phase 1: HyDE + hybrid (dense ⊕ lexical) retrieval
# ──────────────────────────────────────────────────────────────────────────────
_HYDE_MAX_QUERY_WORDS = 8   # HyDE helps most on short / underspecified queries
_STOP = set(
    "the a an of to in on for and or is are was were be been being with by as at "
    "from this that these those it its into over under about how what why does do".split()
)


def _hyde_expand(user, query: str) -> str:
    """HyDE (Hypothetical Document Embeddings): ask the model for one dense,
    factual sentence that a relevant document would contain, then embed the query
    PLUS that sentence. This turns a bare 2-word query into a rich passage, which
    dramatically improves recall. Best-effort — returns the raw query on any
    failure, when disabled (SEARCH_HYDE=0), or for already-specific long queries.
    """
    if os.getenv("SEARCH_HYDE", "1") == "0":
        return query
    if len(query.split()) > _HYDE_MAX_QUERY_WORDS:
        return query
    try:
        from app.llm_client import ask_llm
        hyp = ask_llm(
            user=user,
            system_prompt=("Expand a short search query into ONE dense, factual sentence "
                           "that a relevant document would contain. No preamble, one sentence, "
                           "under 40 words."),
            messages=[{"role": "user", "content": f"Query: {query}\nHypothetical answer sentence:"}],
            max_tokens=80, temperature=0.3,
        )
        hyp = (hyp or "").strip().replace("\n", " ")
        return f"{query}. {hyp}" if hyp else query
    except Exception as e:
        print(f"HyDE expand skipped: {e}")
        return query


def _tokenize(text: str):
    import re
    return [t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(t) > 1 and t not in _STOP]


def _lexical_score(q_terms, text: str) -> float:
    """Lightweight BM25-ish lexical score: distinct-term coverage plus a capped
    term-frequency bonus. Catches exact terms, acronyms and proper names that
    dense vectors blur. Returns 0..1."""
    if not q_terms:
        return 0.0
    toks = _tokenize(text)
    if not toks:
        return 0.0
    from collections import Counter
    tf = Counter(toks)
    uniq = set(q_terms)
    covered = sum(1 for t in uniq if tf.get(t, 0) > 0)
    freq = sum(min(tf.get(t, 0), 3) for t in uniq)
    coverage = covered / len(uniq)
    return 0.70 * coverage + 0.30 * min(1.0, freq / (3 * len(uniq)))


def _rrf_fuse(dense_ids, lexical_ids, k: int = 60) -> Dict[str, float]:
    """Reciprocal Rank Fusion of two rankings → {id: fused_score}. Scale-free, no
    tuning of dense-vs-lexical weights needed."""
    scores: Dict[str, float] = {}
    for rank, _id in enumerate(dense_ids):
        scores[_id] = scores.get(_id, 0.0) + 1.0 / (k + rank + 1)
    for rank, _id in enumerate(lexical_ids):
        scores[_id] = scores.get(_id, 0.0) + 1.0 / (k + rank + 1)
    return scores


class SemanticSearchEngine:
    def __init__(self):
        self.use_pinecone = False
        self.fallback_memory = []
        
        try:
            existing = pc.list_indexes().names()
            if INDEX_NAME not in existing:
                print(f"📦 Creating Pinecone index: {INDEX_NAME}")
                pc.create_index(
                    name=INDEX_NAME,
                    dimension=EMBEDDING_DIM,
                    metric="cosine",
                    spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
                )
                time.sleep(5)
            
            self.index = pc.Index(INDEX_NAME)
            self.use_pinecone = True
            print("✅ Semantic Search with OpenAI + Pinecone Ready!")
        except Exception as e:
            print(f"⚠️ Pinecone unavailable: {e}")
            self.index = None

    # ------------------------------------------------------------------
    # USER‑SCOPED: Add entry – now requires `user` for embedding
    # ------------------------------------------------------------------
    def add_to_index(
        self,
        user,                    # ← NEW: authenticated user object
        query: str,
        answer: str,
        mode: str = "research",
        confidence: float = 0,
        sources: List = None,
        user_id: str = "guest",
    ):
        """Add research entry to search index, scoped to user namespace"""
        source_titles = []
        if sources:
            source_titles = [
                s.get("title", "") for s in sources if isinstance(s, dict)
            ]

        entry = {
            "id": hashlib.md5(f"{query}{time.time()}".encode()).hexdigest()[:16],
            "query": query,
            "answer": answer[:500],
            "mode": mode,
            "confidence": confidence,
            "sources": json.dumps(source_titles),
            "source_count": len(source_titles),
            "score": 100.0,
            "user_id": user_id,
            "timestamp": time.time(),
        }

        # ✅ Store in Pinecone under user’s namespace – using user's own embedding key
        if self.use_pinecone and self.index:
            try:
                # Use the centralised create_embedding that requires the user object
                embedding = create_embedding(user, query + " " + answer[:500])
                if embedding:
                    namespace = f"user_{user_id}"
                    self.index.upsert(
                        vectors=[
                            {
                                "id": entry["id"],
                                "values": embedding,
                                "metadata": entry,
                            }
                        ],
                        namespace=namespace,
                    )
            except Exception as e:
                print(f"⚠️ Pinecone index error: {e}")

        # Also keep in fallback memory
        self.fallback_memory.append(entry)
        return entry

    # ------------------------------------------------------------------
    # USER‑SCOPED: Search – now requires `user` for query embedding
    # ------------------------------------------------------------------
    def search(
        self,
        user,                    # ← NEW: authenticated user object
        query: str,
        top_k: int = 10,
        filters: Dict = None,
        user_id: str = "guest",
    ) -> List[Dict]:
        """
        Semantic search – returns only results belonging to the given user.
        """
        results = []

        # ✅ 1. Try Pinecone with user namespace — HyDE-expanded, hybrid-ranked.
        if self.use_pinecone and self.index:
            try:
                namespace = f"user_{user_id}"
                # Phase 1a — HyDE: embed the query enriched with a hypothetical
                # answer sentence, so short queries retrieve far better.
                hyde_text = _hyde_expand(user, query)
                q_embedding = create_embedding(user, hyde_text)
                if q_embedding:
                    # Over-fetch a wide candidate set for fusion + diversity.
                    over = max(top_k * 4, 20)
                    pine_results = self.index.query(
                        vector=q_embedding,
                        top_k=over,
                        include_metadata=True,
                        include_values=True,
                        filter=filters,
                        namespace=namespace,
                    )
                    raw_matches = [m for m in pine_results.get("matches", []) if m.score > 0.25]

                    # Phase 1b — HYBRID: fuse the dense ranking with a lexical
                    # ranking (over the ORIGINAL query, not the HyDE text) via
                    # Reciprocal Rank Fusion, so exact terms / acronyms / names
                    # that dense vectors blur are recovered. Then MMR for diversity.
                    if raw_matches:
                        by_id = {m.id: m for m in raw_matches}
                        dense_ids = [m.id for m in sorted(raw_matches, key=lambda x: x.score, reverse=True)]
                        q_terms = _tokenize(query)
                        lex = []
                        for m in raw_matches:
                            meta = m.metadata or {}
                            lex.append((m.id, _lexical_score(q_terms, f"{meta.get('query','')} {meta.get('answer','')}")))
                        lexical_ids = [i for i, s in sorted(lex, key=lambda x: x[1], reverse=True) if s > 0]
                        fused = _rrf_fuse(dense_ids, lexical_ids)
                        fused_matches = [by_id[i] for i in sorted(fused, key=lambda i: fused[i], reverse=True) if i in by_id]
                        matches = _mmr_rerank(q_embedding, fused_matches[: max(top_k * 2, top_k)], top_k)
                    else:
                        matches = []
                    for match in matches:
                            meta = match.metadata or {}
                            sources_raw = meta.get("sources", "[]")
                            try:
                                sources = (
                                    json.loads(sources_raw)
                                    if isinstance(sources_raw, str)
                                    else sources_raw
                                )
                            except Exception:
                                sources = []

                            results.append(
                                {
                                    "id": match.id,
                                    "score": round(match.score * 100, 1),
                                    "query": meta.get("query", ""),
                                    "answer": meta.get("answer", "")[:300],
                                    "mode": meta.get("mode", "research"),
                                    "confidence": meta.get("confidence", 0),
                                    "sources": sources,
                                    "user_id": meta.get("user_id", user_id),
                                }
                            )
            except Exception as e:
                print(f"Pinecone search error: {e}")

        # ✅ 2. Fallback: in‑memory keyword search, also user‑scoped
        if not results:
            results = self._keyword_search(query, top_k, filters, user_id)

        return results

    # ------------------------------------------------------------------
    # Phase F — novelty: how far a query is from the user's existing corpus
    # ------------------------------------------------------------------
    def novelty(self, user, query: str, user_id: str = "guest"):
        """1.0 = brand-new territory, 0.0 = you've researched this before.
        Computed as 1 - (max cosine to your existing entries)."""
        if not (self.use_pinecone and self.index):
            return None
        try:
            q = create_embedding(user, query)
            if not q:
                return None
            res = self.index.query(vector=q, top_k=1, namespace=f"user_{user_id}")
            matches = res.get("matches", []) or []
            if not matches:
                return 1.0
            return round(max(0.0, 1.0 - float(matches[0].score)), 3)
        except Exception as e:
            print(f"novelty error: {e}")
            return None

    # ------------------------------------------------------------------
    # Fallback keyword search – scoped to user
    # ------------------------------------------------------------------
    def _keyword_search(
        self,
        query: str,
        top_k: int,
        filters: Dict = None,
        user_id: str = "guest",
    ) -> List[Dict]:
        ql = query.lower()
        results = []
        for entry in self.fallback_memory:
            # ✅ Filter by user
            if entry.get("user_id", "guest") != user_id:
                continue
            if filters and filters.get("mode") and entry.get("mode") != filters["mode"]:
                continue

            score = 0
            if ql in entry.get("query", "").lower():
                score += 50
            qw = set(ql.split())
            ew = set(
                (entry.get("query", "") + " " + entry.get("answer", ""))
                .lower()
                .split()
            )
            score += len(qw & ew) * 10
            if score > 0:
                results.append({**entry, "score": min(100, score)})

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    # ------------------------------------------------------------------
    # Suggestions – optionally scoped to user (no embedding required)
    # ------------------------------------------------------------------
    def get_suggestions(
        self,
        query: str,
        limit: int = 5,
        user_id: str = None,
    ) -> List[str]:
        query_lower = query.lower()
        suggestions, seen = [], set()
        for entry in self.fallback_memory:
            if user_id and entry.get("user_id", "guest") != user_id:
                continue

            q = entry.get("query", "")
            if query_lower in q.lower() and q not in seen:
                suggestions.append(q)
                seen.add(q)
            if len(suggestions) >= limit:
                break
        return suggestions


# Global instance
semantic_search = SemanticSearchEngine()

# ── Optional Postgres + pgvector backend (set GRAPH_BACKEND=postgres) ────
# Retires Pinecone: semantic search runs on the same Postgres as KG + memory.
import os as _os
if _os.getenv("GRAPH_BACKEND", "postgres").lower() == "postgres":
    try:
        from app.knowledge_graph.pg_semantic import semantic_search as _pg_sem
        semantic_search = _pg_sem
        print("🐘 Semantic Search backend: Postgres + pgvector (Pinecone bypassed)")
    except Exception as _e:
        print(f"⚠️ Postgres semantic backend failed to load, staying on Pinecone: {_e}")
