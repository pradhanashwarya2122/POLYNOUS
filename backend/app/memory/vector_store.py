from pinecone import Pinecone, ServerlessSpec
from anthropic import Anthropic
import os
import hashlib
import time
import re
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

INDEX_NAME = "polynous-memory"

def get_or_create_index():
    """Get existing index or create new one"""
    existing = pc.list_indexes().names()
    
    if INDEX_NAME not in existing:
        print(f"📦 Creating new Pinecone index: {INDEX_NAME}")
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        time.sleep(5)
    
    return pc.Index(INDEX_NAME)

def create_embedding(text: str):
    """Create embedding vector using text hashing (no OpenAI needed)"""
    try:
        text = text.lower().strip()[:2000]
        words = re.findall(r'\b\w+\b', text)
        
        vector = [0.0] * 1536
        for i, word in enumerate(words):
            hash_val = int(hashlib.md5(word.encode()).hexdigest(), 16)
            idx = hash_val % 1536
            vector[idx] += 1.0
        
        norm = sum(v * v for v in vector) ** 0.5
        if norm > 0:
            vector = [v / norm for v in vector]
        
        return vector
    except Exception as e:
        print(f"❌ Embedding error: {e}")
        return None

# ============================================================
# USER‑SCOPED: Store research in user‑specific namespace
# ============================================================

def store_research(user_id: str, session_id: str, query: str, documents: list, answer: str, metadata: dict = {}):
    """Store research results in Pinecone — scoped to user namespace"""
    try:
        index = get_or_create_index()
        # ✅ USER‑SPECIFIC NAMESPACE — isolates data per user
        namespace = f"user_{user_id}"
        
        combined_text = f"Query: {query}\nAnswer: {answer[:500]}"
        
        embedding = create_embedding(None, combined_text)
        if not embedding:
            return False
        
        doc_id = hashlib.md5(f"{session_id}:{query}:{time.time()}".encode()).hexdigest()
        
        # ✅ Upsert with namespace parameter
        index.upsert(
            vectors=[{
                "id": doc_id,
                "values": embedding,
                "metadata": {
                    "session_id": session_id,
                    "user_id": user_id,  # ✅ Store user_id in metadata for queries
                    "query": query[:500],
                    "answer": answer[:1000],
                    "num_sources": len(documents),
                    "confidence": metadata.get('confidence', 0),
                    "mode": metadata.get('mode', 'research'),
                    "timestamp": time.time()
                }
            }],
            namespace=namespace  # ✅ USER NAMESPACE
        )
        
        print(f"✅ Stored in Pinecone [{namespace}]: {doc_id[:12]}...")
        return True
        
    except Exception as e:
        print(f"❌ Pinecone storage error: {e}")
        return False


# ============================================================
# USER‑SCOPED: Search similar research within user's namespace
# ============================================================

def search_similar_research(user_id: str, query: str, top_k: int = 5):
    """Find similar previous research — only within user's namespace"""
    try:
        index = get_or_create_index()
        # ✅ USER‑SPECIFIC NAMESPACE — searches only user's data
        namespace = f"user_{user_id}"
        
        embedding = create_embedding(query)
        if not embedding:
            return []
        
        # ✅ Query with namespace parameter
        results = index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=namespace  # ✅ USER NAMESPACE
        )
        
        similar = []
        for match in results.get('matches', []):
            if match.score > 0.5:
                similar.append({
                    "id": match.id,
                    "score": round(match.score * 100, 1),
                    "query": match.metadata.get('query', ''),
                    "answer": match.metadata.get('answer', '')[:300],
                    "confidence": match.metadata.get('confidence', 0),
                    "user_id": match.metadata.get('user_id', user_id)
                })
        
        return similar
        
    except Exception as e:
        print(f"❌ Pinecone search error: {e}")
        return []


# ============================================================
# USER‑SCOPED: Get session history within user's namespace
# ============================================================

def get_session_history(user_id: str, session_id: str, limit: int = 10):
    """Get all research history for a session — scoped to user namespace"""
    try:
        index = get_or_create_index()
        # ✅ USER‑SPECIFIC NAMESPACE
        namespace = f"user_{user_id}"
        
        # ✅ Query with namespace and session filter
        results = index.query(
            vector=[0.0] * 1536,
            top_k=limit,
            filter={"session_id": session_id},
            include_metadata=True,
            namespace=namespace  # ✅ USER NAMESPACE
        )
        
        history = []
        for match in results.get('matches', []):
            history.append({
                "id": match.id,
                "query": match.metadata.get('query', ''),
                "confidence": match.metadata.get('confidence', 0),
                "timestamp": match.metadata.get('timestamp', 0),
                "user_id": match.metadata.get('user_id', user_id)
            })
        
        return sorted(history, key=lambda x: x['timestamp'], reverse=True)
        
    except Exception as e:
        print(f"❌ Session history error: {e}")
        return []


# ============================================================
# USER‑SCOPED: Get ALL research for a user (across sessions)
# ============================================================

def get_user_history(user_id: str, limit: int = 20):
    """Get all research history for a user — across all sessions"""
    try:
        index = get_or_create_index()
        # ✅ USER‑SPECIFIC NAMESPACE
        namespace = f"user_{user_id}"
        
        # ✅ Query with namespace (no session filter — gets all)
        results = index.query(
            vector=[0.0] * 1536,
            top_k=limit,
            include_metadata=True,
            namespace=namespace  # ✅ USER NAMESPACE
        )
        
        history = []
        for match in results.get('matches', []):
            history.append({
                "id": match.id,
                "query": match.metadata.get('query', ''),
                "answer": match.metadata.get('answer', '')[:200],
                "confidence": match.metadata.get('confidence', 0),
                "mode": match.metadata.get('mode', 'research'),
                "timestamp": match.metadata.get('timestamp', 0),
                "session_id": match.metadata.get('session_id', ''),
                "user_id": match.metadata.get('user_id', user_id)
            })
        
        return sorted(history, key=lambda x: x['timestamp'], reverse=True)
        
    except Exception as e:
        print(f"❌ User history error: {e}")
        return []


# ============================================================
# BACKWARD COMPATIBILITY: Original function signatures
# ============================================================

def store_research_legacy(session_id: str, query: str, documents: list, answer: str, metadata: dict = {}):
    """Legacy wrapper — uses session_id as user_id for backward compatibility"""
    return store_research(
        user_id=session_id,
        session_id=session_id,
        query=query,
        documents=documents,
        answer=answer,
        metadata=metadata
    )

def search_similar_research_legacy(query: str, top_k: int = 5):
    """Legacy wrapper — searches guest namespace"""
    return search_similar_research(user_id="guest", query=query, top_k=top_k)

def get_session_history_legacy(session_id: str, limit: int = 10):
    """Legacy wrapper — uses session_id as user_id"""
    return get_session_history(user_id=session_id, session_id=session_id, limit=limit)


print("✅ Pinecone Vector Memory Ready! (User‑scoped namespaces enabled)")