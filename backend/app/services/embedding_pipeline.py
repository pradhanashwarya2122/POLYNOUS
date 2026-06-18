"""
POLYNOUS Unified Embedding Pipeline
Single service for ALL modules: Research, Debate, Memory, Search
Uses OpenAI text-embedding-3-small (1536 dimensions)
"""

from typing import List, Dict, Optional
import hashlib
import time
import json
import os
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INDEX_NAME = "polynous-unified"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536  # OpenAI text-embedding-3-small

def create_embedding(text: str) -> List[float]:
    """Create embedding using OpenAI text-embedding-3-small"""
    try:
        text = text[:8000]  # Truncate to fit token limits
        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

def create_query_embedding(query: str) -> List[float]:
    """Create embedding for search queries"""
    return create_embedding(query)

class UnifiedEmbeddingPipeline:
    def __init__(self):
        self.index = None
        self._init_pinecone()
    
    def _init_pinecone(self):
        """Initialize or create Pinecone index with correct OpenAI dimensions"""
        try:
            existing = pc.list_indexes().names()
            
            if INDEX_NAME not in existing:
                print(f"📦 Creating unified Pinecone index: {INDEX_NAME} ({EMBEDDING_DIMENSION}d)")
                pc.create_index(
                    name=INDEX_NAME,
                    dimension=EMBEDDING_DIMENSION,
                    metric="cosine",
                    spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
                )
                time.sleep(5)
            
            self.index = pc.Index(INDEX_NAME)
            print(f"✅ Unified Embedding Pipeline Ready! (OpenAI {EMBEDDING_MODEL}, {EMBEDDING_DIMENSION}d)")
        except Exception as e:
            print(f"⚠️ Pinecone unavailable: {e}")
            self.index = None
    
    def embed_and_store(
        self,
        content: str,
        module: str,
        content_type: str,
        metadata: Dict = None,
        related_ids: List[str] = None
    ) -> Optional[Dict]:
        """
        Universal method to embed ANY content and store in Pinecone.
        
        Args:
            content: Text to embed
            module: Source module ("research", "debate", "memory", "search")
            content_type: Type ("query", "answer", "argument", "summary", "claim", "evidence")
            metadata: Additional metadata dict
            related_ids: IDs of related vectors
        
        Returns:
            Dict with vector_id or None if failed
        """
        if not self.index:
            print(f"⚠️ Pinecone not available, skipping embed for {module}/{content_type}")
            return None
        
        try:
            # 1. Create embedding using OpenAI
            embedding = create_embedding(content[:8000])
            if not embedding:
                return None
            
            # 2. Generate unique ID
            unique_string = f"{module}:{content_type}:{content[:100]}:{time.time()}"
            vector_id = hashlib.md5(unique_string.encode()).hexdigest()[:20]
            
            # 3. Build metadata (serialize complex objects to strings)
            meta = {
                "module": str(module),
                "content_type": str(content_type),
                "content_preview": str(content[:500]),
                "timestamp": time.time(),
                "embedding_model": EMBEDDING_MODEL,
                "embedding_dimension": EMBEDDING_DIMENSION,
                "embedding_version": "v2-openai",
            }
            
            # Add optional metadata, serializing lists/dicts to JSON strings
            if metadata:
                for key, value in metadata.items():
                    if value is None:
                        continue
                    elif isinstance(value, (list, dict)):
                        meta[key] = json.dumps(value)[:1000]
                    elif isinstance(value, (str, int, float, bool)):
                        meta[key] = value
                    else:
                        meta[key] = str(value)[:500]
            
            if related_ids:
                meta["related_ids"] = json.dumps(related_ids)[:500]
            
            # 4. Upsert to Pinecone
            self.index.upsert(
                vectors=[{
                    "id": vector_id,
                    "values": embedding,
                    "metadata": meta
                }]
            )
            
            print(f"  ✅ Embedded: {module}/{content_type} → {vector_id} ({len(embedding)}d)")
            
            return {
                "vector_id": vector_id,
                "module": module,
                "content_type": content_type,
                "dimension": len(embedding),
                "metadata": meta
            }
            
        except Exception as e:
            print(f"  ❌ Embed error for {module}/{content_type}: {e}")
            return None
    
    def embed_batch(self, items: List[Dict]) -> List[Dict]:
        """Batch embed multiple items"""
        results = []
        for item in items:
            result = self.embed_and_store(
                content=item["content"],
                module=item["module"],
                content_type=item["content_type"],
                metadata=item.get("metadata"),
                related_ids=item.get("related_ids")
            )
            if result:
                results.append(result)
        return results
    
    def search_similar(
        self,
        query: str,
        module_filter: str = None,
        content_type_filter: str = None,
        top_k: int = 10
    ) -> List[Dict]:
        """Search for similar content across all modules"""
        if not self.index:
            return []
        
        try:
            query_embedding = create_query_embedding(user, query)
            if not query_embedding:
                return []
            
            filter_dict = {}
            if module_filter:
                filter_dict["module"] = {"$eq": module_filter}
            if content_type_filter:
                filter_dict["content_type"] = {"$eq": content_type_filter}
            
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict if filter_dict else None
            )
            
            matches = []
            for match in results.get("matches", []):
                if match.score > 0.3:
                    meta = match.metadata or {}
                    matches.append({
                        "id": match.id,
                        "score": round(match.score * 100, 1),
                        "module": meta.get("module", "unknown"),
                        "content_type": meta.get("content_type", "unknown"),
                        "content_preview": meta.get("content_preview", "")[:200],
                        "timestamp": meta.get("timestamp", 0),
                        "metadata": meta
                    })
            
            return matches
            
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def find_cross_module_connections(
        self,
        query: str,
        source_module: str,
        target_modules: List[str] = None
    ) -> List[Dict]:
        """Find connections between content in different modules"""
        if not target_modules:
            target_modules = ["research", "debate", "memory", "search"]
        
        all_results = []
        for module in target_modules:
            if module != source_module:
                results = self.search_similar(research_query=research_query, module_filter=module, top_k=5)
                all_results.extend(results)
        
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:15]
    
    def delete_by_module(self, module: str) -> int:
        """Delete all vectors for a specific module"""
        if not self.index:
            return 0
        print(f"⚠️ Delete by module not fully implemented for Pinecone serverless")
        return 0
    
    def get_stats(self) -> Dict:
        """Get pipeline statistics"""
        if not self.index:
            return {"status": "unavailable", "index_name": INDEX_NAME}
        try:
            stats = self.index.describe_index_stats()
            return {
                "status": "connected",
                "index_name": INDEX_NAME,
                "embedding_model": EMBEDDING_MODEL,
                "dimension": stats.get("dimension", EMBEDDING_DIMENSION),
                "total_vectors": stats.get("total_vector_count", 0),
                "namespaces": list(stats.get("namespaces", {}).keys())
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

# Global instance
pipeline = UnifiedEmbeddingPipeline()