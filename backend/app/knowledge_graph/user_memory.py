from neo4j import GraphDatabase
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

class UserMemoryGraph:
    def __init__(self):
        # 🔧 TEMPORARY HARDCODE – REMOVE AFTER TESTING
        uri = "neo4j+s://bccd60cb.databases.neo4j.io"      # ← your real URI
        user = "neo4j"
        password = "qdFEa3EJEqHukJw7z5PQn4VopaN4Jl2R9QgvX-FEYwk"                         # ← your new simple password

        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            self.driver.verify_connectivity()
            print("✅ User Memory Graph Connected!")
        except Exception as e:
            print(f"⚠️ User Memory Graph not available: {e}")
            self.driver = None

    def _get_driver(self):
        """Re‑create the driver if it was lost, so the graph survives temporary outages."""
        if self.driver is None:
            uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            user = os.getenv("NEO4J_USER", "neo4j").strip()
            password = os.getenv("NEO4J_PASSWORD", "password").strip()
            try:
                self.driver = GraphDatabase.driver(uri, auth=(user, password))
                self.driver.verify_connectivity()
                print("✅ User Memory Graph re‑connected!")
            except Exception as e:
                print(f"⚠️ User Memory Graph still unavailable: {e}")
                self.driver = None
        return self.driver

    def create_user_profile(self, user_id: str, username: str, email: str):
        """Create or update a user profile node"""
        driver = self._get_driver()
        if not driver:
            return
        try:
            with driver.session() as session:
                session.run("""
                    MERGE (u:User {id: $user_id})
                    SET u.username = $username, 
                        u.email = $email,
                        u.last_active = datetime(),
                        u.total_sessions = coalesce(u.total_sessions, 0) + 1
                """, user_id=user_id, username=username, email=email)
        except Exception as e:
            print(f"❌ User profile error: {e}")

    def record_research(self, user_id: str, query: str, answer: str, 
                        topics: List[str], confidence: float, mode: str = "research",
                        sources: List[Dict] = None):
        """Record a research interaction with user isolation and topic filtering"""
        driver = self._get_driver()
        if not driver:
            return
        
        # ✅ FIX: Ensure user profile exists first
        try:
            with driver.session() as session:
                session.run("""
                    MERGE (u:User {id: $uid})
                    SET u.username = coalesce(u.username, $uid),
                        u.last_active = datetime()
                """, uid=user_id)
        except:
            pass
        
        try:
            with driver.session() as session:
                # ✅ FIX: Use different variable names to avoid Neo4j keyword conflict
                # $uid, $q, $ans, $conf, $m instead of $user_id, $query (which conflicts with Neo4j's query keyword)
                session.run("""
                    MATCH (u:User {id: $uid})
                    CREATE (r:ResearchSession {
                        query: $q,
                        answer: $ans,
                        confidence: $conf,
                        mode: $m,
                        user_id: $uid,
                        timestamp: datetime()
                    })
                    CREATE (u)-[:CONDUCTED]->(r)
                """, uid=user_id, q=query[:300], ans=answer[:500],
                    conf=confidence, m=mode)
                
                # Create topics and link — with filtering
                valid_topic_count = 0
                for topic in topics:
                    topic = topic.strip() if topic else ""
                    if topic and topic.lower() != 'unknown' and len(topic) < 80:
                        valid_topic_count += 1
                        session.run("""
                            MATCH (u:User {id: $uid})
                            MATCH (r:ResearchSession {query: $q, user_id: $uid})
                            MERGE (t:Topic {name: $topic, user_id: $uid})
                            SET t.user_id = $uid
                            CREATE (r)-[:ABOUT]->(t)
                            MERGE (u)-[i:INTERESTED_IN]->(t)
                            SET i.strength = coalesce(i.strength, 0) + 1,
                                i.last_researched = datetime()
                        """, uid=user_id, q=query[:300], topic=topic)
                
                print(f"  ✅ Recorded research: {valid_topic_count} topics for user {user_id[:20]}")
        except Exception as e:
            print(f"  ⚠️ Record research error: {e}")

    def record_debate(self, user_id: str, topic: str, for_score: float, 
                      against_score: float, winner: str):
        """Record a debate session for a specific user with user isolation"""
        driver = self._get_driver()
        if not driver:
            return
        try:
            with driver.session() as session:
                # Ensure User node exists
                session.run("""
                    MERGE (u:User {id: $uid})
                    SET u.last_active = datetime()
                """, uid=user_id)
                
                # Create DebateSession with user_id
                session.run("""
                    MATCH (u:User {id: $uid})
                    CREATE (d:DebateSession {
                        topic: $topic, 
                        for_score: $for_score,
                        against_score: $against_score, 
                        winner: $winner,
                        user_id: $uid,
                        timestamp: datetime()
                    })
                    CREATE (u)-[:DEBATED]->(d)
                    MERGE (t:DebateTopic {name: $topic, user_id: $uid})
                    SET t.user_id = $uid
                    CREATE (d)-[:DEBATE_ABOUT]->(t)
                """, uid=user_id, topic=topic[:200],
                    for_score=for_score, against_score=against_score, 
                    winner=winner)
                
                print(f"✅ Recorded debate for user {user_id}: {topic[:50]}")
        except Exception as e:
            print(f"❌ Record debate error: {e}")

    def get_user_interests(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get interests for a SPECIFIC user only"""
        driver = self._get_driver()
        if not driver:
            return []
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})-[i:INTERESTED_IN]->(t:Topic {user_id: $uid})
                    RETURN t.name as topic, i.strength as strength
                    ORDER BY i.strength DESC 
                    LIMIT $limit
                """, uid=user_id, limit=limit)
                return [{"topic": r["topic"], "strength": r["strength"]} for r in result]
        except:
            return []

    def get_recent_research(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent research for a SPECIFIC user only"""
        driver = self._get_driver()
        if not driver:
            return []
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})-[:CONDUCTED]->(r:ResearchSession {user_id: $uid})
                    OPTIONAL MATCH (r)-[:ABOUT]->(t:Topic {user_id: $uid})
                    RETURN r.query as query, 
                           r.mode as mode, 
                           r.confidence as confidence,
                           r.timestamp as timestamp, 
                           collect(t.name) as topics
                    ORDER BY r.timestamp DESC 
                    LIMIT $limit
                """, uid=user_id, limit=limit)
                return [{
                    "query": r["query"][:100] if r["query"] else "",
                    "mode": r["mode"],
                    "confidence": r["confidence"],
                    "timestamp": str(r["timestamp"])[:19] if r["timestamp"] else None,
                    "topics": r["topics"]
                } for r in result]
        except:
            return []

    def get_user_stats(self, user_id: str) -> Dict:
        """Get stats for a SPECIFIC user only"""
        driver = self._get_driver()
        if not driver:
            return {
                "total_research": 0, 
                "total_debates": 0, 
                "avg_confidence": 0, 
                "unique_topics": 0
            }
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})
                    OPTIONAL MATCH (u)-[:CONDUCTED]->(r:ResearchSession {user_id: $uid})
                    OPTIONAL MATCH (u)-[:DEBATED]->(d:DebateSession {user_id: $uid})
                    OPTIONAL MATCH (u)-[i:INTERESTED_IN]->(t:Topic {user_id: $uid})
                    RETURN u.username as username,
                           count(DISTINCT r) as total_research,
                           count(DISTINCT d) as total_debates,
                           coalesce(avg(r.confidence), 0) as avg_confidence,
                           count(DISTINCT t) as unique_topics
                """, uid=user_id)
                r = result.single()
                if r:
                    return {
                        "username": r["username"],
                        "total_research": r["total_research"],
                        "total_debates": r["total_debates"],
                        "avg_confidence": round(r["avg_confidence"], 1),
                        "unique_topics": r["unique_topics"]
                    }
        except:
            pass
        return {
            "total_research": 0, 
            "total_debates": 0, 
            "avg_confidence": 0, 
            "unique_topics": 0
        }

    def get_related_suggestions(self, user_id: str, current_topic: str, limit: int = 5) -> List[str]:
        """Get related topic suggestions for a SPECIFIC user"""
        driver = self._get_driver()
        if not driver:
            return []
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})-[i:INTERESTED_IN]->(t:Topic {user_id: $uid})
                    WHERE t.name <> $topic
                    RETURN t.name as topic 
                    ORDER BY i.strength DESC 
                    LIMIT $limit
                """, uid=user_id, topic=current_topic, limit=limit)
                return [r["topic"] for r in result]
        except:
            return []

    def get_user_debates(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get debate history for a SPECIFIC user only"""
        driver = self._get_driver()
        if not driver:
            return []
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})-[:DEBATED]->(d:DebateSession {user_id: $uid})
                    OPTIONAL MATCH (d)-[:DEBATE_ABOUT]->(t:DebateTopic {user_id: $uid})
                    RETURN d.topic as topic,
                           d.for_score as for_score,
                           d.against_score as against_score,
                           d.winner as winner,
                           d.timestamp as timestamp
                    ORDER BY d.timestamp DESC 
                    LIMIT $limit
                """, uid=user_id, limit=limit)
                return [{
                    "topic": r["topic"],
                    "for_score": r["for_score"],
                    "against_score": r["against_score"],
                    "winner": r["winner"],
                    "timestamp": str(r["timestamp"])[:19] if r["timestamp"] else None
                } for r in result]
        except:
            return []

    def get_user_research_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get full research history for a SPECIFIC user with answers"""
        driver = self._get_driver()
        if not driver:
            return []
        try:
            with driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $uid})-[:CONDUCTED]->(r:ResearchSession {user_id: $uid})
                    OPTIONAL MATCH (r)-[:ABOUT]->(t:Topic {user_id: $uid})
                    RETURN r.query as query,
                           r.answer as answer,
                           r.mode as mode,
                           r.confidence as confidence,
                           r.timestamp as timestamp,
                           collect(t.name) as topics
                    ORDER BY r.timestamp DESC 
                    LIMIT $limit
                """, uid=user_id, limit=limit)
                return [{
                    "query": r["query"][:200] if r["query"] else "",
                    "answer": r["answer"][:300] if r["answer"] else "",
                    "mode": r["mode"],
                    "confidence": r["confidence"],
                    "timestamp": str(r["timestamp"])[:19] if r["timestamp"] else None,
                    "topics": r["topics"]
                } for r in result]
        except:
            return []


# Global instance
user_memory = UserMemoryGraph()
print("✅ User Memory System Ready!")