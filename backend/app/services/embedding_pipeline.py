# app/services/embedding_pipeline.py
"""
POLYNOUS Unified Embedding Pipeline – Strict User‑Owned Keys
All embedding operations use the authenticated user's own OpenAI API key.
No fallback to any system or environment key is ever performed.
"""

from typing import List, Dict, Optional
import hashlib
import time
import json
import os
from dotenv import load_dotenv
from pinecone import Pinecone

# Import the centralised, user‑aware embedding function.
# This function requires a `user` object and uses the user's own OpenAI key.
from app.llm_client import create_embedding

load_dotenv()

# Pinecone client uses a system‑level key for index management only.
# Embedding content is always encrypted with the user's own key.
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = "polynous-unified"
DIM = 1536  # OpenAI text-embedding-3-small dimension


class UnifiedEmbeddingPipeline:
    """Handles all embedding operations (store, search, cross‑module connections)."""

    def __init__(self):
        self.index = None
        self._init_pinecone()

    def _init_pinecone(self):
        """Create or connect to the Pinecone index."""
        try:
            if INDEX_NAME not in pc.list_indexes().names():
                print(f"📦 Creating unified Pinecone index: {INDEX_NAME} ({DIM}d)")
                pc.create_index(
                    name=INDEX_NAME,
                    dimension=DIM,
                    metric="cosine",
                    spec={"serverless": {"cloud": "aws", "region": "us-east-1"}},
                )
                time.sleep(5)
            self.index = pc.Index(INDEX_NAME)
            print(f"✅ Unified Embedding Pipeline Ready! ({DIM}d)")
        except Exception as e:
            print(f"⚠️ Pinecone unavailable: {e}")
            self.index = None

    # ------------------------------------------------------------------
    # Core embedding & storage
    # ------------------------------------------------------------------
    def embed_and_store(
        self,
        user,                     # ← REQUIRED: authenticated user object
        content: str,
        module: str,
        content_type: str,
        metadata: Optional[Dict] = None,
        related_ids: Optional[List[str]] = None,
    ) -> Optional[Dict]:
        """
        Embed content and store it in Pinecone.

        Args:
            user: The authenticated user (must have a valid OpenAI key).
            content: Text to embed.
            module: Source module ("research", "debate", "memory", "search").
            content_type: Type of content ("query", "answer", "argument", etc.).
            metadata: Additional metadata dict.
            related_ids: IDs of related vectors.

        Returns:
            A dict with vector_id, module, content_type, or None on failure.
        """
        if not self.index:
            print(f"⚠️ Pinecone not available, skipping embed for {module}/{content_type}")
            return None

        # 1. Create the embedding using the user's own OpenAI key
        embedding = create_embedding(user, content[:8000])
        if not embedding:
            # create_embedding already prints an error if the key is missing
            return None

        # 2. Generate a unique vector ID
        unique_string = f"{module}:{content_type}:{content[:100]}:{time.time()}"
        vector_id = hashlib.md5(unique_string.encode()).hexdigest()[:20]

        # 3. Build metadata payload
        meta: Dict = {
            "module": str(module),
            "content_type": str(content_type),
            "content_preview": str(content[:500]),
            "timestamp": time.time(),
        }
        if metadata:
            for key, value in metadata.items():
                if value is None:
                    continue
                # Serialise complex types as JSON strings (Pinecone compatibility)
                if isinstance(value, (list, dict)):
                    meta[key] = json.dumps(value)[:1000]
                elif isinstance(value, (str, int, float, bool)):
                    meta[key] = value
                else:
                    meta[key] = str(value)[:500]
        if related_ids:
            meta["related_ids"] = json.dumps(related_ids)[:500]

        # 4. Upsert to Pinecone
        try:
            self.index.upsert(
                vectors=[{"id": vector_id, "values": embedding, "metadata": meta}]
            )
            print(f"  ✅ Embedded: {module}/{content_type} → {vector_id} ({len(embedding)}d)")
            return {
                "vector_id": vector_id,
                "module": module,
                "content_type": content_type,
                "dimension": len(embedding),
                "metadata": meta,
            }
        except Exception as e:
            print(f"  ❌ Embed error for {module}/{content_type}: {e}")
            return None

    # ------------------------------------------------------------------
    # Batch embedding
    # ------------------------------------------------------------------
    def embed_batch(self, user, items: List[Dict]) -> List[Dict]:
        """Embed multiple items at once."""
        results = []
        for item in items:
            result = self.embed_and_store(
                user=user,
                content=item["content"],
                module=item["module"],
                content_type=item["content_type"],
                metadata=item.get("metadata"),
                related_ids=item.get("related_ids"),
            )
            if result:
                results.append(result)
        return results

    # ------------------------------------------------------------------
    # Semantic search (user‑scoped)
    # ------------------------------------------------------------------
    def search_similar(
        self,
        user,
        query: str,
        module_filter: Optional[str] = None,
        content_type_filter: Optional[str] = None,
        top_k: int = 10,
    ) -> List[Dict]:
        """
        Search for semantically similar content **only** from this user.

        Args:
            user: The authenticated user.
            query: Search query text.
            module_filter: Optional filter by module ("research", "debate", …).
            content_type_filter: Optional filter by content type ("query", "answer", …).
            top_k: Number of results to return.

        Returns:
            List of matching dicts with id, score, module, etc.
        """
        if not self.index:
            return []

        # Create query embedding using the user's own key
        query_embedding = create_embedding(user, query)
        if not query_embedding:
            return []

        # Build Pinecone filter
        filt: Dict = {}
        if module_filter:
            filt["module"] = {"$eq": module_filter}
        if content_type_filter:
            filt["content_type"] = {"$eq": content_type_filter}

        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filt if filt else None,
            )
        except Exception as e:
            print(f"Pinecone query error: {e}")
            return []

        matches = []
        for match in results.get("matches", []):
            if match.score > 0.3:  # relevance threshold
                meta = match.metadata or {}
                matches.append(
                    {
                        "id": match.id,
                        "score": round(match.score * 100, 1),
                        "module": meta.get("module", "unknown"),
                        "content_type": meta.get("content_type", "unknown"),
                        "content_preview": meta.get("content_preview", "")[:200],
                        "timestamp": meta.get("timestamp", 0),
                        "metadata": meta,
                    }
                )
        return matches

    # ------------------------------------------------------------------
    # Cross‑module connections
    # ------------------------------------------------------------------
    def find_cross_module_connections(
        self,
        user,
        query: str,
        source_module: str,
        target_modules: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Find connections between content in different modules."""
        if target_modules is None:
            target_modules = ["research", "debate", "memory", "search"]

        all_results = []
        for module in target_modules:
            if module != source_module:
                module_results = self.search_similar(
                    user, query, module_filter=module, top_k=5
                )
                all_results.extend(module_results)

        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:15]

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
    def get_stats(self) -> Dict:
        """Return basic index statistics."""
        if not self.index:
            return {"status": "unavailable", "index_name": INDEX_NAME}
        try:
            stats = self.index.describe_index_stats()
            return {
                "status": "connected",
                "index_name": INDEX_NAME,
                "dimension": DIM,
                "total_vectors": stats.get("total_vector_count", 0),
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}


# Global instance – import this in other modules
pipeline = UnifiedEmbeddingPipeline()