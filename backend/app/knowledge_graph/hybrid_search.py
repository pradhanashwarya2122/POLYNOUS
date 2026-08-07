from typing import List, Dict
from pinecone import Pinecone
from anthropic import Anthropic
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
anthropic = Anthropic(api_key=ANTHROPIC_KEY)

# Initialize Pinecone
try:
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    print("✅ Pinecone client initialized!")
except Exception as e:
    print(f"⚠️ Pinecone init error: {e}")
    pc = None

class HybridSearchEngine:
    def __init__(self):
        self.index_name = "polynous-memory"
        self.pinecone_index = None
        
        if pc is None:
            print("⚠️ Pinecone not available for hybrid search")
            return
        
        try:
            self.pinecone_index = pc.Index(self.index_name)
            print("✅ Pinecone connected for hybrid search!")
        except Exception as e:
            print(f"⚠️ Pinecone index not found: {e}")
            self.pinecone_index = None
    
    def vector_search(self, query: str, top_k: int = 5, user=None) -> List[Dict]:
        """Vector similarity search using Pinecone.

        Phase A1: uses the real user-aware OpenAI embedding (text-embedding-3-small,
        1536-d), not the old MD5 bag-of-words pseudo-embedding, so matches are
        genuinely semantic. Returns nothing (honestly) when there's no user/key
        rather than fabricating results from a hash."""
        if not self.pinecone_index:
            return []

        try:
            from app.llm_client import create_embedding
            embedding = create_embedding(user, query) if user is not None else None
            if not embedding:
                return []

            results = self.pinecone_index.query(
                vector=embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            return [
                {
                    "text": match.metadata.get("text", match.metadata.get("query", "")),
                    "score": round(match.score * 100, 1),
                    "source": "vector_memory",
                    "type": "semantic_match"
                }
                for match in results.get("matches", [])
                if match.score > 0.5
            ]
        except Exception as e:
            print(f"Vector search error: {e}")
            return []
    
    def knowledge_graph_search(self, query: str) -> List[Dict]:
        """Search through knowledge graph"""
        from app.knowledge_graph.graph_manager import kg
        
        if not kg.driver:
            return []
        
        entities = self._extract_entities(query)
        results = []
        
        for entity in entities[:3]:
            related = kg.get_related_topics(entity)
            for r in related:
                # Phase A3: computed relevance, not a hardcoded 85. More research
                # sessions on a topic => stronger signal (capped at 95).
                rc = r.get('research_count') or 0
                score = round(min(95.0, 55.0 + rc * 8.0), 1)
                results.append({
                    "text": f"Related topic: {r['topic']} (connected to '{entity}', {rc} sessions)",
                    "score": score,
                    "source": "knowledge_graph",
                    "type": "topic_relation",
                    "entity": entity,
                    "related_topic": r['topic']
                })

            if len(entities) >= 2:
                for other_entity in entities[1:]:
                    if other_entity != entity:
                        connections = kg.find_connections(entity, other_entity)
                        for conn in connections[:3]:
                            # Phase A3: closer paths score higher, computed from
                            # the real hop count (was 90 - hops*10 flat).
                            score = round(max(40.0, 100.0 / (1 + conn['hops'])), 1)
                            results.append({
                                "text": f"Path found: {conn['path_display']} ({conn['hops']} hops)",
                                "score": score,
                                "source": "knowledge_graph",
                                "type": "entity_connection"
                            })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:5]
    
    def hybrid_search(self, query: str, use_graph: bool = True, user=None) -> Dict:
        """Combine vector search + knowledge graph search"""

        vector_results = self.vector_search(query, user=user)
        graph_results = self.knowledge_graph_search(query) if use_graph else []
        
        all_results = vector_results + graph_results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        
        context_parts = []
        
        if vector_results:
            context_parts.append("SEMANTICALLY SIMILAR RESEARCH:")
            for r in vector_results[:3]:
                context_parts.append(f"  [{r['score']}% match] {r['text'][:200]}")
        
        if graph_results:
            context_parts.append("\nKNOWLEDGE GRAPH CONNECTIONS:")
            for r in graph_results[:3]:
                context_parts.append(f"  [{r['score']}% relevance] {r['text'][:200]}")
        
        return {
            "query": query,
            "vector_results": vector_results,
            "graph_results": graph_results,
            "combined_results": all_results[:8],
            "enhanced_context": "\n".join(context_parts),
            "total_sources": len(all_results)
        }
    
    def _create_embedding(self, text: str) -> List[float]:
        """Create a simple embedding using Anthropic for semantic representation"""
        try:
            # Use a hash-based embedding when Anthropic doesn't have native embeddings
            # This creates a pseudo-embedding based on text features
            import hashlib
            import re
            
            # Clean text
            text = text.lower().strip()[:2000]
            words = re.findall(r'\b\w+\b', text)
            
            # Create feature vector from word hashes
            vector = [0.0] * 1536
            for i, word in enumerate(words):
                hash_val = int(hashlib.md5(word.encode()).hexdigest(), 16)
                idx = hash_val % 1536
                vector[idx] += 1.0
            
            # Normalize
            norm = sum(v * v for v in vector) ** 0.5
            if norm > 0:
                vector = [v / norm for v in vector]
            
            return vector
        except:
            return [0.0] * 1536
    
    def _extract_entities(self, text: str) -> List[str]:
        """Extract named entities from text - improved version"""
        import re
        
        # Remove common question words
        text = re.sub(r'\b(what|is|are|the|a|an|how|does|do|why|can|you|tell|me|about|explain|define)\b', '', text, flags=re.IGNORECASE)
        
        # Extract capitalized phrases (2+ words)
        multi_word = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', text)
        
        # Extract single capitalized words
        single_word = re.findall(r'\b([A-Z][a-z]+)\b', text)
        
        # Combine and deduplicate
        all_entities = multi_word + [w for w in single_word if len(w) > 2 and w not in ['What', 'How', 'Why', 'When', 'Where', 'Who']]
        
        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for entity in all_entities:
            if entity.lower() not in seen:
                unique.append(entity)
                seen.add(entity.lower())
        
        return unique[:8]

# Global instance
hybrid = HybridSearchEngine()
print("✅ Hybrid Search Engine Ready!")