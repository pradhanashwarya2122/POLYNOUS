from neo4j import GraphDatabase
from typing import List, Dict, Optional
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class KnowledgeGraph:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")
        
        if not uri or not user or not password:
            print("❌ Neo4j credentials missing! Check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD")
            self.driver = None
            return
        
        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            self.driver.verify_connectivity()  # ← CRITICAL: Raises immediately if can't connect
            print(f"✅ Neo4j Connected! ({uri})")
        except Exception as e:
            print(f"❌ Neo4j Connection FAILED: {e}")
            self.driver = None  # ← Set to None so downstream code can check
    
    def close(self):
        """Properly close the Neo4j driver"""
        if self.driver:
            self.driver.close()
    
    # ============================================================
    # SANITIZATION — Protects against Neo4j injection
    # ============================================================
    
    def _sanitize(self, value: str) -> str:
        """Sanitize input for Neo4j queries"""
        if not value:
            return "unknown"
        # Remove dangerous characters
        value = re.sub(r'[{}();\[\]]', '', str(value))
        return value[:200]
    
    # ═══════════════════════════════════════════════════════════
    # NODE CREATION METHODS
    # ═══════════════════════════════════════════════════════════
    
    def create_claim_node(self, claim_text: str, source_module: str, confidence: float, 
                          session_id: str = "guest_user", user_id: str = "guest") -> bool:
        """Create a Claim node with user isolation"""
        if not self.driver:
            return False
        
        safe_user_id = self._sanitize(user_id)
        safe_text = self._sanitize(claim_text)
        safe_module = self._sanitize(source_module)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MERGE (c:Claim {text: $text, user_id: $uid})
                    SET c.source_module = $module, 
                        c.confidence = $confidence,
                        c.session_id = $session_id, 
                        c.user_id = $uid,
                        c.created_at = datetime()
                """, text=safe_text[:300], module=safe_module, 
                    confidence=confidence, session_id=self._sanitize(session_id),
                    uid=safe_user_id)
                return True
        except Exception as e:
            print(f"  ⚠️ Claim error: {e}")
            return False
    
    def create_evidence_node(self, evidence_text: str, source_url: str = "", 
                             source_title: str = "", user_id: str = "guest") -> bool:
        """Create an Evidence node with user isolation"""
        if not self.driver:
            return False
        
        safe_user_id = self._sanitize(user_id)
        safe_text = self._sanitize(evidence_text)
        safe_url = self._sanitize(source_url)
        safe_title = self._sanitize(source_title)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MERGE (e:Evidence {text: $text, user_id: $uid})
                    SET e.source_url = $url, 
                        e.source_title = $title, 
                        e.user_id = $uid,
                        e.created_at = datetime()
                """, text=safe_text[:300], url=safe_url, title=safe_title[:200],
                    uid=safe_user_id)
                return True
        except Exception as e:
            print(f"  ⚠️ Evidence error: {e}")
            return False
    
    def create_argument_node(self, argument_text: str, side: str, score: float,
                             debate_topic: str = "", session_id: str = "guest_user",
                             user_id: str = "guest") -> bool:
        """Create an Argument node (FOR/AGAINST) with user isolation"""
        if not self.driver:
            return False
        
        safe_user_id = self._sanitize(user_id)
        safe_text = self._sanitize(argument_text)
        safe_side = self._sanitize(side)
        safe_topic = self._sanitize(debate_topic)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MERGE (a:Argument {text: $text, user_id: $uid})
                    SET a.side = $side, 
                        a.score = $score, 
                        a.debate_topic = $topic,
                        a.session_id = $session_id, 
                        a.user_id = $uid,
                        a.created_at = datetime()
                """, text=safe_text[:300], side=safe_side, score=score, 
                    topic=safe_topic[:200], session_id=self._sanitize(session_id),
                    uid=safe_user_id)
                return True
        except Exception as e:
            print(f"  ⚠️ Argument error: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════
    # RELATIONSHIP METHODS
    # ═══════════════════════════════════════════════════════════
    
    def link_claim_to_evidence(self, claim_text: str, evidence_text: str, user_id: str = "guest"):
        """Link a Claim to supporting Evidence with user isolation"""
        if not self.driver:
            return
        
        safe_user_id = self._sanitize(user_id)
        safe_claim = self._sanitize(claim_text)
        safe_evidence = self._sanitize(evidence_text)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MATCH (c:Claim {text: $claim, user_id: $uid}) 
                    MATCH (e:Evidence {text: $evidence, user_id: $uid})
                    MERGE (c)-[:SUPPORTED_BY]->(e)
                """, claim=safe_claim[:300], evidence=safe_evidence[:300],
                    uid=safe_user_id)
        except Exception as e:
            print(f"  ⚠️ Link claim-evidence error: {e}")
    
    def link_argument_to_counterargument(self, for_text: str, against_text: str, user_id: str = "guest"):
        """Link FOR argument to AGAINST argument with user isolation"""
        if not self.driver:
            return
        
        safe_user_id = self._sanitize(user_id)
        safe_for = self._sanitize(for_text)
        safe_against = self._sanitize(against_text)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MATCH (a1:Argument {text: $for_text, user_id: $uid}) 
                    MATCH (a2:Argument {text: $against_text, user_id: $uid})
                    MERGE (a1)-[:COUNTERED_BY]->(a2)
                """, for_text=safe_for[:300], against_text=safe_against[:300],
                    uid=safe_user_id)
        except Exception as e:
            print(f"  ⚠️ Link argument error: {e}")
    
    def link_entities(self, entity1: str, entity2: str, context: str = "", user_id: str = "guest"):
        """Link two entities that co-occur with user isolation"""
        if not self.driver:
            return
        
        safe_user_id = self._sanitize(user_id)
        safe_e1 = self._sanitize(entity1)
        safe_e2 = self._sanitize(entity2)
        safe_context = self._sanitize(context)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MERGE (e1:Entity {name: $e1, user_id: $uid}) 
                    MERGE (e2:Entity {name: $e2, user_id: $uid})
                    MERGE (e1)-[r:CO_OCCURS_WITH]-(e2)
                    SET r.count = coalesce(r.count, 0) + 1, 
                        r.last_seen = datetime(), 
                        r.context = $context
                """, e1=safe_e1.strip(), e2=safe_e2.strip(), context=safe_context[:200],
                    uid=safe_user_id)
        except Exception as e:
            print(f"  ⚠️ Link entities error: {e}")
    
    def link_research_to_debate(self, research_query: str, debate_topic: str, 
                                similarity_score: float = 0.5, user_id: str = "guest"):
        """Cross-link research session to related debate topic with user isolation"""
        if not self.driver:
            return
        
        safe_user_id = self._sanitize(user_id)
        safe_query = self._sanitize(research_query)
        safe_topic = self._sanitize(debate_topic)
        
        try:
            with self.driver.session() as session:
                session.run("""
                    MATCH (r:ResearchSession {query: $rq, user_id: $uid}) 
                    MERGE (d:DebateTopic {name: $debate, user_id: $uid})
                    MERGE (r)-[rel:RELATED_TO]->(d) 
                    SET rel.similarity = $score
                """, rq=safe_query[:200], debate=safe_topic[:200], 
                    score=similarity_score, uid=safe_user_id)
        except Exception as e:
            print(f"  ⚠️ Cross-link error: {e}")
    
    # ═══════════════════════════════════════════════════════════
    # STORAGE METHODS
    # ═══════════════════════════════════════════════════════════
    
    def add_research_entry(self, query: str, answer: str, sources: List[Dict], 
                           confidence: float, topics: List[str], user_id: str) -> bool:
        """Store research with user isolation and topic filtering"""
        if not self.driver:
            return False
        
        safe_user_id = self._sanitize(user_id)
        
        # Filter valid topics
        valid_topics = []
        for topic in topics:
            topic = topic.strip() if topic else ""
            if topic and topic.lower() != 'unknown' and len(topic) < 80:
                valid_topics.append(self._sanitize(topic))
        
        try:
            with self.driver.session() as s:
                # ✅ Use UNIQUE parameter names to avoid Neo4j keyword conflicts
                # $uid instead of $user_id, $rq instead of $query (query is reserved in Neo4j)
                s.run("""
                    MERGE (u:User {id: $uid})
                    SET u.username = coalesce(u.username, $uid)
                """, uid=safe_user_id)
                
                for topic in valid_topics:
                    s.run("""
                        MERGE (t:Topic {name: $tname, user_id: $uid})
                    """, tname=topic, uid=safe_user_id)
                
                # ✅ USE $rq NOT $query (query is a reserved word in Neo4j)
                s.run("""
                    MATCH (u:User {id: $uid})
                    CREATE (r:ResearchSession {
                        query: $rq,
                        confidence: $conf,
                        user_id: $uid,
                        timestamp: datetime()
                    })
                    CREATE (u)-[:CONDUCTED]->(r)
                """, uid=safe_user_id, rq=query[:300], conf=confidence)
                
                print(f"  ✅ Stored in KG: {len(valid_topics)} topics for user {safe_user_id[:20]}")
                return True
        except Exception as e:
            print(f"  ⚠️ KG storage error: {e}")
            return False
    
    def extract_and_link_entities(self, text: str, user_id: str = "guest") -> List[str]:
        """Extract entities and link them with user isolation"""
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        unique_entities = list(set(entities))[:8]
        
        if not self.driver or len(unique_entities) < 2:
            return unique_entities
        
        safe_user_id = self._sanitize(user_id)
        
        try:
            with self.driver.session() as session:
                # Create Entity nodes with user_id
                for entity in unique_entities:
                    session.run("""
                        MERGE (e:Entity {name: $name, user_id: $uid})
                        SET e.user_id = $uid
                    """, name=self._sanitize(entity), uid=safe_user_id)
                
                # Link entities that appear together
                for i in range(len(unique_entities)):
                    for j in range(i+1, len(unique_entities)):
                        session.run("""
                            MATCH (e1:Entity {name: $name1, user_id: $uid})
                            MATCH (e2:Entity {name: $name2, user_id: $uid})
                            MERGE (e1)-[r:MENTIONED_WITH]->(e2)
                            SET r.count = coalesce(r.count, 0) + 1
                        """, name1=self._sanitize(unique_entities[i]),
                            name2=self._sanitize(unique_entities[j]),
                            uid=safe_user_id)
                
                # Also use the standalone link_entities for CO_OCCURS_WITH
                for i in range(len(unique_entities)):
                    for j in range(i+1, len(unique_entities)):
                        self.link_entities(unique_entities[i], unique_entities[j], 
                                          context=text[:200], user_id=user_id)
                
            print(f"✅ Linked {len(unique_entities)} entities for user {safe_user_id}")
        except Exception as e:
            print(f"❌ Entity linking error: {e}")
        
        return unique_entities
    
    # ═══════════════════════════════════════════════════════════
    # GRAPH QUERY METHODS
    # ═══════════════════════════════════════════════════════════
    
    def find_connections(self, entity1: str, entity2: str, user_id: str = "guest", 
                         max_depth: int = 3) -> List[Dict]:
        """Find paths between entities for a specific user"""
        if not self.driver:
            return []
        
        safe_user_id = self._sanitize(user_id)
        safe_e1 = self._sanitize(entity1)
        safe_e2 = self._sanitize(entity2)
        
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH path = shortestPath(
                        (e1:Entity {name: $e1, user_id: $uid})-[*..%d]-(e2:Entity {name: $e2, user_id: $uid})
                    )
                    RETURN [node in nodes(path) | node.name] as path,
                           [rel in relationships(path) | type(rel)] as relationships,
                           length(path) as hops
                    ORDER BY hops LIMIT 5
                """ % max_depth, e1=safe_e1, e2=safe_e2, uid=safe_user_id)
                
                connections = []
                for record in result:
                    connections.append({
                        "path": record["path"],
                        "path_display": " → ".join(record["path"]),
                        "relationships": record["relationships"],
                        "hops": record["hops"]
                    })
                return connections
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return []
    
    def get_related_topics(self, topic: str, user_id: str = "guest", depth: int = 2, 
                           limit: int = 10) -> List[Dict]:
        """Get related topics for a specific user with multi-hop traversal"""
        if not self.driver:
            return []
        
        safe_user_id = self._sanitize(user_id)
        safe_topic = self._sanitize(topic)
        
        try:
            with self.driver.session() as session:
                try:
                    result = session.run("""
                        MATCH (t:Topic {name: $topic, user_id: $uid}) 
                        MATCH (t)-[*1..%d]-(related:Topic) 
                        WHERE related <> t AND related.user_id = $uid
                        RETURN related.name as topic, 
                               COUNT { (related)<-[:ABOUT]-() } as research_count
                        ORDER BY research_count DESC LIMIT $limit
                    """ % depth, topic=safe_topic, uid=safe_user_id, limit=limit)
                    
                    topics = [{"topic": r["topic"], "research_count": r["research_count"]} for r in result]
                    if topics:
                        return topics
                except:
                    pass
                
                result = session.run("""
                    MATCH (t:Topic {name: $topic, user_id: $uid})
                    RETURN t.name as topic
                    LIMIT $limit
                """, topic=safe_topic, uid=safe_user_id, limit=limit)
                
                return [{"topic": record["topic"]} for record in result]
        except Exception as e:
            print(f"❌ Related topics error: {e}")
            return []
    
    # ═══════════════════════════════════════════════════════════
    # GRAPH DATA METHODS
    # ═══════════════════════════════════════════════════════════
    
    def get_user_knowledge_graph(self, user_id: str = "guest") -> Dict:
        """Get complete knowledge graph with ALL node types for a specific user"""
        if not self.driver:
            return {"nodes": [], "edges": []}
        
        safe_user_id = self._sanitize(user_id)
        nodes, edges = [], []
        
        try:
            with self.driver.session() as session:
                # ── Topics ────────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (t:Topic {user_id: $uid}) 
                        OPTIONAL MATCH (r:ResearchSession)-[:ABOUT]->(t)
                        WHERE r.user_id = $uid
                        WITH t, count(r) as cnt WHERE cnt > 0
                        RETURN t.name as name, cnt as count ORDER BY cnt DESC LIMIT 20
                    """, uid=safe_user_id):
                        nodes.append({
                            "id": "topic_" + str(r["name"]),
                            "label": r["name"],
                            "type": "topic",
                            "size": min(40, (r["count"] or 1) * 8 + 15),
                            "connections": r["count"] or 0,
                            "user_id": safe_user_id
                        })
                except:
                    pass
                
                # ── Debate Topics ─────────────────────────
                try:
                    for r in session.run("""
                        MATCH (d:DebateTopic {user_id: $uid}) 
                        OPTIONAL MATCH (ds:DebateSession)-[:DEBATE_ABOUT]->(d)
                        WHERE ds.user_id = $uid
                        WITH d, count(ds) as cnt WHERE cnt > 0
                        RETURN d.name as name, cnt as count ORDER BY cnt DESC LIMIT 10
                    """, uid=safe_user_id):
                        nodes.append({
                            "id": "debate_" + str(r["name"]),
                            "label": r["name"],
                            "type": "debate_topic",
                            "size": min(35, (r["count"] or 1) * 10 + 12),
                            "connections": r["count"] or 0,
                            "user_id": safe_user_id
                        })
                except:
                    pass
                
                # ── Entities ──────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (e:Entity {user_id: $uid}) 
                        OPTIONAL MATCH (e)-[rel:CO_OCCURS_WITH]-()
                        RETURN e.name as name, count(rel) as count 
                        ORDER BY count DESC LIMIT 20
                    """, uid=safe_user_id):
                        if r["name"] and r["count"] > 0:
                            nodes.append({
                                "id": "entity_" + r["name"],
                                "label": r["name"],
                                "type": "entity",
                                "size": min(35, (r["count"] or 1) * 6 + 15),
                                "connections": r["count"] or 0,
                                "user_id": safe_user_id
                            })
                except:
                    pass
                
                # ── Claims ────────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (c:Claim {user_id: $uid}) 
                        OPTIONAL MATCH (c)-[:SUPPORTED_BY]->(e:Evidence)
                        WHERE e.user_id = $uid
                        RETURN c.text as text, c.confidence as confidence, 
                               count(e) as count 
                        ORDER BY c.confidence DESC LIMIT 15
                    """, uid=safe_user_id):
                        if r["text"]:
                            nodes.append({
                                "id": "claim_" + r["text"][:40],
                                "label": r["text"][:60],
                                "type": "claim",
                                "size": min(35, 18 + (r["count"] or 0) * 6),
                                "confidence": r["confidence"] or 0,
                                "connections": r["count"] or 0,
                                "user_id": safe_user_id
                            })
                except:
                    pass
                
                # ── Evidence ──────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (e:Evidence {user_id: $uid}) 
                        RETURN e.text as text, e.source_title as title 
                        LIMIT 15
                    """, uid=safe_user_id):
                        if r["text"]:
                            nodes.append({
                                "id": "evidence_" + r["text"][:40],
                                "label": (r["title"] or r["text"])[:60],
                                "type": "evidence",
                                "size": 16,
                                "user_id": safe_user_id
                            })
                except:
                    pass
                
                # ── Arguments ─────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (a:Argument {user_id: $uid}) 
                        RETURN a.text as text, a.side as side, a.score as score 
                        LIMIT 15
                    """, uid=safe_user_id):
                        if r["text"]:
                            nodes.append({
                                "id": "arg_" + r["text"][:40],
                                "label": f"[{r['side'] or '?'}] {r['text'][:50]}",
                                "type": "argument",
                                "side": r["side"] or "FOR",
                                "score": r["score"] or 5,
                                "size": 22,
                                "user_id": safe_user_id
                            })
                except:
                    pass
                
                # ── Deduplicate nodes ─────────────────────
                seen, uniq = set(), []
                for n in nodes:
                    if n["id"] not in seen:
                        seen.add(n["id"])
                        uniq.append(n)
                nodes = uniq
                
                # ── Edges ─────────────────────────────────
                try:
                    for r in session.run("""
                        MATCH (t1:Topic {user_id: $uid})<-[:ABOUT]-(r:ResearchSession)-[:ABOUT]->(t2:Topic {user_id: $uid}) 
                        WHERE t1.name < t2.name
                        RETURN t1.name as s, t2.name as t, count(r) as w 
                        ORDER BY w DESC LIMIT 30
                    """, uid=safe_user_id):
                        edges.append({
                            "source": "topic_" + r["s"],
                            "target": "topic_" + r["t"],
                            "type": "CO_OCCURS",
                            "weight": r["w"] or 1,
                            "color": "rgba(168,85,247,0.4)"
                        })
                except:
                    pass
                
                try:
                    for r in session.run("""
                        MATCH (e1:Entity {user_id: $uid})-[rel:CO_OCCURS_WITH]-(e2:Entity {user_id: $uid}) 
                        WHERE e1.name < e2.name
                        RETURN e1.name as s, e2.name as t, rel.count as w 
                        ORDER BY w DESC LIMIT 20
                    """, uid=safe_user_id):
                        edges.append({
                            "source": "entity_" + r["s"],
                            "target": "entity_" + r["t"],
                            "type": "CO_OCCURS",
                            "weight": r["w"] or 1,
                            "color": "rgba(29,171,130,0.4)"
                        })
                except:
                    pass
                
                try:
                    for r in session.run("""
                        MATCH (c:Claim {user_id: $uid})-[:SUPPORTED_BY]->(e:Evidence {user_id: $uid}) 
                        RETURN c.text as s, e.text as t LIMIT 20
                    """, uid=safe_user_id):
                        if r["s"] and r["t"]:
                            edges.append({
                                "source": "claim_" + r["s"][:40],
                                "target": "evidence_" + r["t"][:40],
                                "type": "SUPPORTED_BY",
                                "weight": 2,
                                "color": "#00ff0f99"
                            })
                except:
                    pass
                
                try:
                    for r in session.run("""
                        MATCH (a1:Argument {user_id: $uid})-[:COUNTERED_BY]->(a2:Argument {user_id: $uid}) 
                        RETURN a1.text as s, a2.text as t LIMIT 20
                    """, uid=safe_user_id):
                        if r["s"] and r["t"]:
                            edges.append({
                                "source": "arg_" + r["s"][:40],
                                "target": "arg_" + r["t"][:40],
                                "type": "COUNTERED_BY",
                                "weight": 3,
                                "color": "#ff204099"
                            })
                except:
                    pass
                
                if not edges and len(nodes) >= 2:
                    edges = self._generate_edges_from_labels(nodes)
                
                print(f"✅ Knowledge Graph for user {safe_user_id}: {len(nodes)} nodes, {len(edges)} edges")
                return {"nodes": nodes, "edges": edges}
                
        except Exception as e:
            print(f"❌ Graph error: {e}")
            return {"nodes": [], "edges": []}
    
    def get_rich_graph(self, user_id: str = "guest") -> Dict:
        """Get enriched graph with Claims, Evidence, Arguments, Topics for a specific user"""
        if not self.driver:
            return {"nodes": [], "edges": []}
        
        safe_user_id = self._sanitize(user_id)
        nodes, edges = [], []
        
        try:
            with self.driver.session() as session:
                for r in session.run("""
                    MATCH (c:Claim {user_id: $uid}) 
                    OPTIONAL MATCH (c)-[:SUPPORTED_BY]->(e:Evidence)
                    WHERE e.user_id = $uid
                    RETURN c.text as t, c.source_module as m, c.confidence as cf, 
                           count(e) as ec 
                    ORDER BY cf DESC LIMIT 20
                """, uid=safe_user_id):
                    if r["t"]:
                        nodes.append({
                            "id": "claim_" + r["t"][:30],
                            "label": r["t"][:60],
                            "type": "claim",
                            "module": r["m"] or "research",
                            "confidence": r["cf"] or 0,
                            "size": 18 + (r["ec"] or 0) * 6
                        })
                
                for r in session.run("""
                    MATCH (e:Evidence {user_id: $uid}) 
                    RETURN e.text as t, e.source_title as tl LIMIT 20
                """, uid=safe_user_id):
                    if r["t"]:
                        nodes.append({
                            "id": "evidence_" + r["t"][:30],
                            "label": (r["tl"] or r["t"])[:60],
                            "type": "evidence",
                            "size": 14
                        })
                
                for r in session.run("""
                    MATCH (a:Argument {user_id: $uid}) 
                    RETURN a.text as t, a.side as s, a.score as sc LIMIT 20
                """, uid=safe_user_id):
                    if r["t"]:
                        nodes.append({
                            "id": "arg_" + r["t"][:30],
                            "label": f"[{r['s']}] {r['t'][:50]}",
                            "type": "argument",
                            "side": r["s"] or "FOR",
                            "score": r["sc"] or 5,
                            "size": 20
                        })
                
                for r in session.run("""
                    MATCH (t:Topic {user_id: $uid}) 
                    OPTIONAL MATCH (q:Query)-[:ABOUT]->(t) 
                    WITH t, count(q) as cnt WHERE cnt > 0
                    RETURN t.name as n, cnt as c ORDER BY c DESC LIMIT 15
                """, uid=safe_user_id):
                    if r["n"]:
                        nodes.append({
                            "id": "topic_" + r["n"],
                            "label": r["n"],
                            "type": "topic",
                            "size": min(35, (r["c"] or 1) * 8 + 15)
                        })
                
                for r in session.run("""
                    MATCH (d:DebateTopic {user_id: $uid}) 
                    OPTIONAL MATCH (ds:DebateSession)-[:DEBATE_ABOUT]->(d)
                    RETURN d.name as n, count(ds) as c ORDER BY c DESC LIMIT 10
                """, uid=safe_user_id):
                    if r["n"]:
                        nodes.append({
                            "id": "debate_" + r["n"],
                            "label": r["n"],
                            "type": "debate_topic",
                            "size": min(30, (r["c"] or 1) * 10 + 12)
                        })
                
                for r in session.run("""
                    MATCH (c:Claim {user_id: $uid})-[:SUPPORTED_BY]->(e:Evidence {user_id: $uid}) 
                    RETURN c.text as s, e.text as t LIMIT 30
                """, uid=safe_user_id):
                    if r["s"] and r["t"]:
                        edges.append({
                            "source": "claim_" + r["s"][:30],
                            "target": "evidence_" + r["t"][:30],
                            "type": "SUPPORTED_BY",
                            "color": "#00ff0f",
                            "weight": 2
                        })
                
                for r in session.run("""
                    MATCH (a1:Argument {user_id: $uid})-[:COUNTERED_BY]->(a2:Argument {user_id: $uid}) 
                    RETURN a1.text as s, a2.text as t LIMIT 20
                """, uid=safe_user_id):
                    if r["s"] and r["t"]:
                        edges.append({
                            "source": "arg_" + r["s"][:30],
                            "target": "arg_" + r["t"][:30],
                            "type": "COUNTERED_BY",
                            "color": "#ff2040",
                            "weight": 3
                        })
                
                for r in session.run("""
                    MATCH (t1:Topic {user_id: $uid})<-[:ABOUT]-(q:Query)-[:ABOUT]->(t2:Topic {user_id: $uid}) 
                    WHERE t1.name < t2.name
                    RETURN t1.name as s, t2.name as t, count(q) as w 
                    ORDER BY w DESC LIMIT 30
                """, uid=safe_user_id):
                    if r["s"] and r["t"]:
                        edges.append({
                            "source": "topic_" + r["s"],
                            "target": "topic_" + r["t"],
                            "type": "CO_OCCURS",
                            "color": "rgba(255,255,255,0.3)",
                            "weight": r["w"] or 1
                        })
            
            print(f"✅ Rich Graph for user {safe_user_id}: {len(nodes)} nodes, {len(edges)} edges")
            return {"nodes": nodes, "edges": edges}
            
        except Exception as e:
            print(f"❌ Rich graph error: {e}")
            return {"nodes": [], "edges": []}
    
    def get_all_entities_with_relationships(self, user_id: str = "guest") -> Dict:
        """Wrapper for get_user_knowledge_graph — returns all entities with relationships"""
        return self.get_user_knowledge_graph(user_id=user_id)
    
    def _generate_edges_from_labels(self, nodes: List[Dict]) -> List[Dict]:
        """Generate edges between nodes that share common words in their labels"""
        edges = []
        stop_words = {'the', 'and', 'of', 'in', 'to', 'a', 'is', 'for', 'on', 'with', 'ai'}
        
        for i in range(len(nodes)):
            wi = {w for w in nodes[i]['label'].lower().replace(',', '').split() 
                  if len(w) > 2 and w not in stop_words}
            for j in range(i + 1, len(nodes)):
                wj = {w for w in nodes[j]['label'].lower().replace(',', '').split() 
                      if len(w) > 2 and w not in stop_words}
                if wi & wj:
                    edges.append({
                        "source": nodes[i]['id'],
                        "target": nodes[j]['id'],
                        "weight": len(wi & wj)
                    })
        
        return edges
    
    def seed_rich_demo(self, user_id: str = "guest") -> Dict:
        """Seed rich demo data with Claims, Evidence, Arguments for a specific user"""
        if not self.driver:
            return {"status": "error", "message": "Neo4j not connected"}
        
        safe_user_id = self._sanitize(user_id)
        
        try:
            claims = [
                ("AI reduces medical diagnosis errors by 30%", "research", 85),
                ("Neural networks mimic human brain structure", "research", 90),
                ("AI regulation is necessary for public safety", "debate", 70),
                ("Unregulated AI poses existential risk", "debate", 75)
            ]
            for ct, cm, cc in claims:
                self.create_claim_node(ct, cm, cc, user_id=safe_user_id)
            
            evidence = [
                ("AI diagnosis matches expert doctors in 94% of cases", "Nature Medicine 2024", "https://nature.com"),
                ("Neural networks use layered architecture like cortical columns", "Science 2023", "https://science.org"),
                ("EU AI Act provides comprehensive regulatory framework", "EU Commission 2024", "https://ec.europa.eu")
            ]
            for et, etl, eu in evidence:
                self.create_evidence_node(et, eu, etl, user_id=safe_user_id)
            
            self.link_claim_to_evidence(claims[0][0], evidence[0][0], user_id=safe_user_id)
            self.link_claim_to_evidence(claims[1][0], evidence[1][0], user_id=safe_user_id)
            self.link_claim_to_evidence(claims[2][0], evidence[2][0], user_id=safe_user_id)
            
            self.create_argument_node(
                "AI regulation protects citizens from biased algorithms",
                "FOR", 8, "Should AI be regulated?", user_id=safe_user_id
            )
            self.create_argument_node(
                "Over-regulation stifles innovation and economic growth",
                "AGAINST", 7, "Should AI be regulated?", user_id=safe_user_id
            )
            
            self.link_argument_to_counterargument(
                "AI regulation protects citizens from biased algorithms",
                "Over-regulation stifles innovation and economic growth",
                user_id=safe_user_id
            )
            
            return {"status": "ok", "message": f"Rich demo data seeded for user {safe_user_id}"}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}


# Global instance
kg = KnowledgeGraph()

# ✅ Startup verification
if kg.driver:
    print("✅ Neo4j Knowledge Graph is ACTIVE")
else:
    print("❌ WARNING: Neo4j Knowledge Graph is INACTIVE — memory features will be limited")