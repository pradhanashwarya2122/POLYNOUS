from typing import List, Dict, Optional
import os
import hashlib
import time
import json
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

from app.embeddings import create_embedding, create_query_embedding

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = "polynous-memory"
EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small

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
    # USER‑SCOPED: Add entry with user_id
    # ------------------------------------------------------------------
    def add_to_index(
        self,
        query: str,
        answer: str,
        mode: str = "research",
        confidence: float = 0,
        sources: List = None,
        user_id: str = "guest",
    ):
        """Add research entry to search index, scoped to user namespace"""
        # Convert source objects to a list of titles for Pinecone compatibility
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

        # ✅ Store in Pinecone under user’s namespace
        if self.use_pinecone and self.index:
            try:
                embedding = create_embedding(query + " " + answer[:500])
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

        # Also keep in fallback memory (already scoped by user_id in the dict)
        self.fallback_memory.append(entry)
        return entry

    # ------------------------------------------------------------------
    # USER‑SCOPED: Search within user’s namespace
    # ------------------------------------------------------------------
    def search(
        self,
        query: str,
        top_k: int = 10,
        filters: Dict = None,
        user_id: str = "guest",
    ) -> List[Dict]:
        """
        Semantic search – returns only results belonging to the given user.
        """
        results = []

        # ✅ 1. Try Pinecone with user namespace
        if self.use_pinecone and self.index:
            try:
                namespace = f"user_{user_id}"
                q_embedding = create_query_embedding(query)  # query‑specific embedding
                if q_embedding:
                    pine_results = self.index.query(
                        vector=q_embedding,
                        top_k=top_k,
                        include_metadata=True,
                        filter=filters,
                        namespace=namespace,          # ✅ user scoping
                    )
                    for match in pine_results.get("matches", []):
                        if match.score > 0.3:
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
    # Suggestions – optionally scoped to user
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