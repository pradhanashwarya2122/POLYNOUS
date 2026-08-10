from neo4j import GraphDatabase
from typing import List, Dict, Optional
import os
import re
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Phase A2: the controlled relation vocabulary for LLM-extracted triples. Any
# relation the model returns outside this set is coerced to RELATED_TO, so an
# edge is always a real, typed relationship (never a raw co-occurrence).
TRIPLE_RELATIONS = {
    "CAUSES", "SUPPORTS", "REFUTES", "PART_OF", "ENABLES",
    "PRECEDED_BY", "CONTRADICTS", "RELATED_TO",
}

# Generic tokens that must never become graph nodes on their own (they carry no
# concrete meaning). A concept is rejected only if the WHOLE phrase is generic,
# so "language model" survives while "model" alone is dropped.
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
    drop trailing punctuation. Keeps the field's own casing/acronyms intact."""
    s = re.sub(r"^(the|a|an)\s+", "", (name or "").strip(), flags=re.IGNORECASE)
    s = re.sub(r"[\s]+", " ", s).strip(" .,:;–-")
    return s


def _is_concrete(name: str) -> bool:
    """True if the phrase is a real, specific concept (not a generic keyword)."""
    n = (name or "").strip()
    if len(n) < 3:
        return False
    if n.lower() in GENERIC_CONCEPTS:
        return False
    return True

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

    def extract_and_link_triples(self, text: str, user=None, provider: str = "anthropic",
                                 model: str = None, user_id: str = "guest") -> List[str]:
        """
        Phase A2 — replace the capitalized-word regex with real, TYPED relations.

        Asks the LLM for {subject, relation, object, confidence} triples (relation
        constrained to TRIPLE_RELATIONS) and writes them as typed Concept edges,
        so an edge reads "mRNA vaccines ENABLES rapid pandemic response (0.82)"
        instead of a bare MENTIONED_WITH co-occurrence. Falls back to the regex
        extractor whenever the LLM is unavailable or returns nothing, so the
        research pipeline never breaks.
        """
        if not self.driver or user is None:
            return self.extract_and_link_entities(text, user_id=user_id)

        try:
            from app.llm_client import ask_llm
            system = (
                "You are building a rigorous, industry-grade knowledge graph. Extract the key "
                "factual relationships from the text as a JSON array.\n"
                "Each item: {\"subject\": str, \"relation\": one of "
                "[CAUSES, SUPPORTS, REFUTES, PART_OF, ENABLES, PRECEDED_BY, CONTRADICTS, RELATED_TO], "
                "\"object\": str, \"confidence\": 0..1}.\n"
                "RULES:\n"
                "- Subjects and objects must be CONCRETE, canonical, domain-specific concepts: named "
                "technologies, methods, algorithms, models, standards, organizations, metrics, "
                "materials, or phenomena (e.g. 'Transformer architecture', 'CRISPR-Cas9', "
                "'Reciprocal Rank Fusion', 'Basel III', 'mRNA vaccine'). Use the field's real "
                "terminology.\n"
                "- NEVER output vague or generic tokens (e.g. 'the study', 'researchers', 'system', "
                "'data', 'people', 'it', 'this'), pronouns, or single stop-words.\n"
                "- Use each concept's canonical name; do not create near-duplicates.\n"
                "- Choose the relation that reflects the real logic (CAUSES for causation, ENABLES "
                "for a prerequisite/mechanism, PART_OF for composition, REFUTES/CONTRADICTS for "
                "opposition), not a generic RELATED_TO unless nothing more specific fits.\n"
                "Return 3-8 of the most important, non-trivial relationships. Return ONLY the raw "
                "JSON array, no prose."
            )
            raw = ask_llm(user=user, provider=provider, system_prompt=system,
                          messages=[{"role": "user", "content": text[:4000]}],
                          max_tokens=700, temperature=0.2)
            triples = self._parse_triples(raw)
            if not triples:
                return self.extract_and_link_entities(text, user_id=user_id)

            uid = self._sanitize(user_id)
            names = set()
            with self.driver.session() as session:
                for t in triples:
                    subj = self._sanitize(_canon_concept(t["subject"]))[:80]
                    obj = self._sanitize(_canon_concept(t["object"]))[:80]
                    rel = t["relation"] if t["relation"] in TRIPLE_RELATIONS else "RELATED_TO"
                    conf = t["confidence"]
                    # Reject generic keyword nodes; only concrete concepts get in.
                    if not _is_concrete(subj) or not _is_concrete(obj) or subj.lower() == obj.lower():
                        continue
                    names.add(subj); names.add(obj)
                    # rel is whitelisted against TRIPLE_RELATIONS, so interpolating
                    # it into the query is safe (Neo4j can't parameterize rel types).
                    session.run(
                        f"""
                        MERGE (a:Concept {{name: $s, user_id: $uid}})
                        MERGE (b:Concept {{name: $o, user_id: $uid}})
                        MERGE (a)-[r:{rel} {{user_id: $uid}}]->(b)
                        SET r.type = $rel, r.count = coalesce(r.count, 0) + 1,
                            r.confidence = $conf, r.updated_at = datetime()
                        """,
                        s=subj, o=obj, uid=uid, rel=rel, conf=conf,
                    )
            print(f"✅ Linked {len(triples)} typed triples for user {uid}")
            return list(names)
        except Exception as e:
            print(f"⚠️ Triple extraction failed ({e}); falling back to regex entities")
            return self.extract_and_link_entities(text, user_id=user_id)

    def _parse_triples(self, raw: str) -> List[Dict]:
        """Best-effort parse of an LLM triple array into validated dicts."""
        if not raw:
            return []
        s = raw.strip()
        m = re.search(r"\[.*\]", s, re.DOTALL)
        if m:
            s = m.group(0)
        try:
            data = json.loads(s)
        except Exception:
            return []
        out = []
        for item in data if isinstance(data, list) else []:
            if not isinstance(item, dict):
                continue
            subj = str(item.get("subject", "")).strip()
            obj = str(item.get("object", "")).strip()
            rel = str(item.get("relation", "RELATED_TO")).strip().upper()
            if not subj or not obj:
                continue
            try:
                conf = float(item.get("confidence", 0.6))
            except (TypeError, ValueError):
                conf = 0.6
            out.append({"subject": subj, "object": obj, "relation": rel,
                        "confidence": max(0.0, min(1.0, round(conf, 2)))})
        return out[:8]

    # ═══════════════════════════════════════════════════════════
    # PHASE B — GRAPH ML (pure Python, runs without the Neo4j GDS plugin)
    # ═══════════════════════════════════════════════════════════

    def compute_graph_metrics(self, user_id: str = "guest") -> Dict:
        """Real graph algorithms over the user's graph, no GDS dependency:
          - PageRank        -> which concepts are load-bearing (influence)
          - Label propagation -> emergent topic communities (clusters)
          - Degree          -> raw connectivity
        Returns per-node metrics plus a summary. Safe/empty on any failure."""
        if not self.driver:
            return {"nodes": {}, "communities": 0, "summary": {}}
        uid = self._sanitize(user_id)
        node_ids, edges = [], []
        try:
            with self.driver.session() as session:
                res = session.run(
                    """
                    MATCH (a {user_id: $uid})-[r {user_id: $uid}]->(b {user_id: $uid})
                    RETURN coalesce(a.name, a.text, toString(id(a))) AS s,
                           coalesce(b.name, b.text, toString(id(b))) AS t
                    LIMIT 5000
                    """,
                    uid=uid,
                )
                seen = set()
                for rec in res:
                    s, t = rec["s"], rec["t"]
                    if not s or not t or s == t:
                        continue
                    edges.append((s, t))
                    for n in (s, t):
                        if n not in seen:
                            seen.add(n); node_ids.append(n)
        except Exception as e:
            print(f"⚠️ graph metrics fetch failed: {e}")
            return {"nodes": {}, "communities": 0, "summary": {}}

        if not node_ids:
            return {"nodes": {}, "communities": 0, "summary": {"nodes": 0, "edges": 0}}

        pr = self._pagerank(node_ids, edges)
        comm = self._louvain(node_ids, edges)
        btw = self._betweenness(node_ids, edges)
        deg = {n: 0 for n in node_ids}
        for s, t in edges:
            deg[s] += 1; deg[t] += 1

        # Normalize PageRank + betweenness to 0..1 for easy node sizing on the client.
        mx = max(pr.values()) if pr else 1.0
        bmx = max(btw.values()) if btw and max(btw.values()) > 0 else 1.0
        nodes = {
            n: {"pagerank": round(pr[n] / mx, 4) if mx else 0.0,
                "betweenness": round(btw.get(n, 0.0) / bmx, 4) if bmx else 0.0,
                "community": comm.get(n, 0), "degree": deg.get(n, 0)}
            for n in node_ids
        }
        top = sorted(node_ids, key=lambda n: pr[n], reverse=True)[:5]
        # Bridge concepts = highest betweenness (connect otherwise-separate clusters).
        bridges = sorted(node_ids, key=lambda n: btw.get(n, 0.0), reverse=True)
        bridges = [{"name": n, "betweenness": round(btw.get(n, 0.0) / bmx, 3)}
                   for n in bridges if btw.get(n, 0.0) > 0][:5]
        return {
            "nodes": nodes,
            "communities": len(set(comm.values())),
            "summary": {
                "nodes": len(node_ids), "edges": len(edges),
                "top_concepts": [{"name": n, "pagerank": round(pr[n] / mx, 3)} for n in top],
                "bridge_concepts": bridges,
            },
        }

    @staticmethod
    def _betweenness(node_ids, edges) -> Dict:
        """Brandes' betweenness centrality (undirected, unweighted). Cheap for the
        hundreds-of-nodes personal graphs here; no GDS/native plugin needed.
        High betweenness = a concept that bridges otherwise-separate clusters."""
        from collections import deque
        adj = {x: set() for x in node_ids}
        for s, t in edges:
            if s != t:
                adj[s].add(t); adj[t].add(s)
        cb = {x: 0.0 for x in node_ids}
        for s in node_ids:
            stack, pred = [], {w: [] for w in node_ids}
            sigma = {w: 0.0 for w in node_ids}; sigma[s] = 1.0
            dist = {w: -1 for w in node_ids}; dist[s] = 0
            q = deque([s])
            while q:
                v = q.popleft(); stack.append(v)
                for w in adj[v]:
                    if dist[w] < 0:
                        dist[w] = dist[v] + 1; q.append(w)
                    if dist[w] == dist[v] + 1:
                        sigma[w] += sigma[v]; pred[w].append(v)
            delta = {w: 0.0 for w in node_ids}
            while stack:
                w = stack.pop()
                for v in pred[w]:
                    if sigma[w] > 0:
                        delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
                if w != s:
                    cb[w] += delta[w]
        # Undirected graph: each pair counted twice.
        for w in node_ids:
            cb[w] /= 2.0
        return cb

    def node_similarity(self, user_id: str, node: str, top_n: int = 8) -> Dict:
        """Topological node similarity (Jaccard over neighbourhoods): 'find
        concepts that sit in a structurally similar position in your graph',
        distinct from semantic similarity. Pure-Python, no GDS."""
        if not self.driver:
            return {"node": node, "similar": []}
        uid = self._sanitize(user_id)
        node_ids, edges = [], []
        try:
            with self.driver.session() as session:
                res = session.run(
                    """
                    MATCH (a {user_id:$uid})-[r {user_id:$uid}]->(b {user_id:$uid})
                    RETURN coalesce(a.name,a.text,toString(id(a))) AS s,
                           coalesce(b.name,b.text,toString(id(b))) AS t
                    LIMIT 5000
                    """, uid=uid)
                seen = set()
                for rec in res:
                    s, t = rec["s"], rec["t"]
                    if not s or not t or s == t:
                        continue
                    edges.append((s, t))
                    for n in (s, t):
                        if n not in seen:
                            seen.add(n); node_ids.append(n)
        except Exception as e:
            print(f"⚠️ node similarity fetch failed: {e}")
            return {"node": node, "similar": []}
        if node not in node_ids:
            return {"node": node, "similar": []}
        adj = {x: set() for x in node_ids}
        for s, t in edges:
            adj[s].add(t); adj[t].add(s)
        base = adj[node] | {node}
        sims = []
        for other in node_ids:
            if other == node:
                continue
            ns = adj[other] | {other}
            inter = len(base & ns); union = len(base | ns)
            if inter and union:
                sims.append({"name": other, "score": round(inter / union, 3),
                             "shared": inter})
        sims.sort(key=lambda x: x["score"], reverse=True)
        return {"node": node, "similar": sims[:top_n]}

    def label_communities(self, user_id: str, user=None, provider: str = "anthropic",
                          model: str = None) -> Dict:
        """Auto-topic labels: group concepts by Louvain community and ask the LLM
        for a short human label per cluster ('Cluster 3 = RL safety'). Falls back
        to the community's top-PageRank concept when no key/LLM is available."""
        metrics = self.compute_graph_metrics(user_id)
        nodes = metrics.get("nodes", {})
        if not nodes:
            return {"labels": {}, "communities": 0}
        groups: Dict[int, list] = {}
        for name, m in nodes.items():
            groups.setdefault(m.get("community", 0), []).append(
                (name, m.get("pagerank", 0.0)))
        labels = {}
        for cid, members in groups.items():
            members.sort(key=lambda x: x[1], reverse=True)
            concept_list = [n for n, _ in members][:8]
            labels[str(cid)] = {
                "label": concept_list[0] if concept_list else f"Cluster {cid}",
                "concepts": concept_list, "size": len(members),
            }
        # Try to upgrade the fallback labels with a single LLM call. If the user
        # has no key, ask_llm raises and we keep the top-concept fallback labels.
        if user is not None:
            try:
                import json as _json
                from app.llm_client import ask_llm
                payload = {cid: v["concepts"] for cid, v in labels.items()}
                system = ("You name clusters of concepts. Given a JSON map of "
                          "clusterId -> concept list, return ONLY JSON mapping each "
                          "clusterId to a 2-4 word topic label. No prose.")
                raw = ask_llm(user=user, provider=provider, system_prompt=system,
                              messages=[{"role": "user", "content": _json.dumps(payload)}],
                              max_tokens=400, temperature=0.2)
                m = re.search(r"\{.*\}", raw or "", re.DOTALL)
                if m:
                    named = _json.loads(m.group(0))
                    for cid, lab in named.items():
                        if str(cid) in labels and isinstance(lab, str) and lab.strip():
                            labels[str(cid)]["label"] = lab.strip()[:40]
            except Exception as e:
                print(f"⚠️ community labeling LLM failed: {e}")
        return {"labels": labels, "communities": len(labels)}

    def suggest_connections(self, user_id: str = "guest", top_n: int = 8) -> Dict:
        """Phase B4 — link prediction over the user's graph. Scores non-adjacent
        concept pairs by Adamic-Adar (shared neighbours, weighted by rarity) and
        common-neighbour count, and returns the most likely *missing* links:
        'you researched X and Y separately, they're probably related'."""
        if not self.driver:
            return {"suggestions": []}
        uid = self._sanitize(user_id)
        node_ids, edges = [], []
        try:
            with self.driver.session() as session:
                res = session.run(
                    """
                    MATCH (a {user_id:$uid})-[r {user_id:$uid}]->(b {user_id:$uid})
                    RETURN coalesce(a.name,a.text,toString(id(a))) AS s,
                           coalesce(b.name,b.text,toString(id(b))) AS t
                    LIMIT 5000
                    """, uid=uid)
                seen = set()
                for rec in res:
                    s, t = rec["s"], rec["t"]
                    if not s or not t or s == t:
                        continue
                    edges.append((s, t))
                    for n in (s, t):
                        if n not in seen:
                            seen.add(n); node_ids.append(n)
        except Exception as e:
            print(f"⚠️ link-prediction fetch failed: {e}")
            return {"suggestions": []}
        return {"suggestions": self._link_predict(node_ids, edges, top_n)}

    @staticmethod
    def _link_predict(node_ids, edges, top_n: int = 8):
        import math as _m
        adj = {x: set() for x in node_ids}
        for s, t in edges:
            adj[s].add(t); adj[t].add(s)
        existing = {frozenset((s, t)) for s, t in edges}
        deg = {x: len(adj[x]) for x in node_ids}
        cand = {}
        # only consider pairs that share at least one neighbour (2-hop reachable)
        for w in node_ids:
            nbrs = list(adj[w])
            for i in range(len(nbrs)):
                for j in range(i + 1, len(nbrs)):
                    u, v = nbrs[i], nbrs[j]
                    if u == v or frozenset((u, v)) in existing:
                        continue
                    key = frozenset((u, v))
                    aa = 1.0 / _m.log(deg[w]) if deg[w] > 1 else 0.0
                    slot = cand.setdefault(key, {"aa": 0.0, "cn": 0})
                    slot["aa"] += aa
                    slot["cn"] += 1
        ranked = sorted(cand.items(), key=lambda kv: (kv[1]["aa"], kv[1]["cn"]), reverse=True)[:top_n]
        out = []
        for key, sc in ranked:
            a, b = tuple(key)
            out.append({"source": a, "target": b,
                        "score": round(sc["aa"], 3), "common_neighbors": sc["cn"]})
        return out

    @staticmethod
    def _pagerank(node_ids, edges, damping: float = 0.85, iters: int = 50) -> Dict:
        """Undirected PageRank via power iteration (edges counted both ways)."""
        n = len(node_ids)
        if n == 0:
            return {}
        out = {x: [] for x in node_ids}
        for s, t in edges:
            out[s].append(t); out[t].append(s)   # symmetric influence
        outdeg = {x: len(out[x]) for x in node_ids}
        pr = {x: 1.0 / n for x in node_ids}
        for _ in range(iters):
            new = {x: (1 - damping) / n for x in node_ids}
            dangling = damping * sum(pr[x] for x in node_ids if outdeg[x] == 0) / n
            for x in node_ids:
                new[x] += dangling
            for s in node_ids:
                if outdeg[s]:
                    share = damping * pr[s] / outdeg[s]
                    for d in out[s]:
                        new[d] += share
            pr = new
        return pr

    @staticmethod
    def _louvain(node_ids, edges) -> Dict:
        """Communities via Louvain modularity optimization (one local-moving
        level). Properly separates topical clusters even on small graphs, where
        naive label propagation collapses everything into one community."""
        m = len(edges)
        if m == 0:
            return {x: i for i, x in enumerate(node_ids)}
        adj = {x: {} for x in node_ids}
        for s, t in edges:
            adj[s][t] = adj[s].get(t, 0) + 1
            adj[t][s] = adj[t].get(s, 0) + 1
        k = {x: sum(adj[x].values()) for x in node_ids}   # weighted degree
        two_m = 2.0 * m
        comm = {x: x for x in node_ids}
        sigma_tot = {x: k[x] for x in node_ids}

        improved, passes = True, 0
        while improved and passes < 30:
            improved, passes = False, passes + 1
            for n in node_ids:
                c_old = comm[n]
                sigma_tot[c_old] -= k[n]
                neigh_w = {}
                for nb, w in adj[n].items():
                    neigh_w[comm[nb]] = neigh_w.get(comm[nb], 0) + w
                best_c, best_gain = c_old, (neigh_w.get(c_old, 0) - sigma_tot.get(c_old, 0) * k[n] / two_m)
                for c, w_in in neigh_w.items():
                    gain = w_in - sigma_tot.get(c, 0) * k[n] / two_m
                    if gain > best_gain:
                        best_gain, best_c = gain, c
                comm[n] = best_c
                sigma_tot[best_c] = sigma_tot.get(best_c, 0) + k[n]
                if best_c != c_old:
                    improved = True

        remap, nxt = {}, 0
        for x in node_ids:
            if comm[x] not in remap:
                remap[comm[x]] = nxt; nxt += 1
            comm[x] = remap[comm[x]]
        return comm

    def get_contradictions(self, user_id: str = "guest", limit: int = 20) -> Dict:
        """Phase F — contradiction radar. Surfaces CONTRADICTS/REFUTES edges the
        typed extractor recorded across all the user's research sessions, so
        cross-session conflicts in their own knowledge become visible."""
        if not self.driver:
            return {"conflicts": []}
        uid = self._sanitize(user_id)
        try:
            with self.driver.session() as session:
                recs = session.run(
                    """
                    MATCH (a:Concept {user_id:$uid})-[r]->(b:Concept {user_id:$uid})
                    WHERE type(r) IN ['CONTRADICTS','REFUTES']
                    RETURN a.name AS s, type(r) AS rel, b.name AS o,
                           coalesce(r.confidence,0.6) AS conf
                    ORDER BY conf DESC LIMIT $lim
                    """, uid=uid, lim=limit)
                conflicts = [{"a": r["s"], "relation": r["rel"], "b": r["o"], "confidence": r["conf"]} for r in recs]
            return {"conflicts": conflicts, "count": len(conflicts)}
        except Exception as e:
            print(f"⚠️ contradiction radar failed: {e}")
            return {"conflicts": []}

    # ═══════════════════════════════════════════════════════════
    # PHASE C — GraphRAG: answer over the user's typed subgraph
    # ═══════════════════════════════════════════════════════════

    def graph_rag_answer(self, query: str, user=None, provider: str = "anthropic",
                         model: str = None, user_id: str = "guest") -> Dict:
        """Answer a question over the user's OWN knowledge graph: find entry
        concepts from the query, expand a multi-hop subgraph of typed triples,
        and have the LLM reason over those facts (citing the relationships).
        This is GraphRAG over a personal, self-built graph."""
        empty = {"answer": "", "triples": [], "entry": [], "grounded": False}
        if not self.driver:
            return {**empty, "answer": "The knowledge graph is unavailable right now."}
        uid = self._sanitize(user_id)
        q_terms = set(re.findall(r"[a-z]{3,}", (query or "").lower()))
        if not q_terms:
            return {**empty, "answer": "Ask a question about concepts you've researched."}

        try:
            with self.driver.session() as session:
                names = [r["name"] for r in session.run(
                    "MATCH (c:Concept {user_id:$uid}) RETURN c.name AS name LIMIT 800", uid=uid)]
                entry = [n for n in names
                         if q_terms & set(re.findall(r"[a-z]{3,}", (n or "").lower()))][:6]
                if not entry:
                    return {**empty,
                            "answer": "Your knowledge graph doesn't cover that yet. Run some research on the topic first, then ask again."}

                recs = session.run(
                    """
                    MATCH (a:Concept {user_id:$uid})-[r]->(b:Concept {user_id:$uid})
                    WHERE a.name IN $entry OR b.name IN $entry
                    RETURN a.name AS s, type(r) AS rel, b.name AS o,
                           coalesce(r.confidence, 0.6) AS conf
                    LIMIT 80
                    """, uid=uid, entry=entry)
                triples = [{"s": r["s"], "rel": r["rel"], "o": r["o"], "conf": r["conf"]} for r in recs]
        except Exception as e:
            return {**empty, "answer": f"Graph lookup failed: {e}"}

        if not triples:
            return {**empty, "entry": entry,
                    "answer": "Those concepts exist in your graph but aren't connected yet."}

        facts = "\n".join(f"- {t['s']} {t['rel']} {t['o']} (confidence {t['conf']})" for t in triples)
        if user is None:
            return {"answer": "Sign in to reason over your graph.", "triples": triples,
                    "entry": entry, "grounded": True}
        try:
            from app.llm_client import ask_llm
            system = ("Answer the question using ONLY the knowledge-graph facts provided. "
                      "Each fact is 'subject RELATION object'. Cite the specific relationships you "
                      "relied on. If the facts don't answer the question, say so plainly.")
            answer = ask_llm(user=user, provider=provider, system_prompt=system,
                             messages=[{"role": "user", "content": f"FACTS:\n{facts}\n\nQUESTION: {query}"}],
                             max_tokens=650, temperature=0.3)
        except Exception as e:
            answer = f"(Could not generate a narrative answer: {e})\n\nRelevant facts:\n{facts}"
        return {"answer": answer, "triples": triples, "entry": entry, "grounded": True}

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

                # ── Concepts (typed triples from research) ─
                try:
                    for r in session.run("""
                        MATCH (c:Concept {user_id: $uid})
                        OPTIONAL MATCH (c)-[rel {user_id: $uid}]-(:Concept {user_id: $uid})
                        RETURN c.name as name, count(rel) as count
                        ORDER BY count DESC LIMIT 60
                    """, uid=safe_user_id):
                        if r["name"]:
                            nodes.append({
                                "id": "concept_" + r["name"],
                                "label": r["name"],
                                "type": "concept",
                                "size": min(38, (r["count"] or 0) * 5 + 16),
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

                # ── Concept typed edges (ENABLES, PART_OF, ...) ─
                try:
                    for r in session.run("""
                        MATCH (c1:Concept {user_id: $uid})-[rel {user_id: $uid}]->(c2:Concept {user_id: $uid})
                        RETURN c1.name as s, c2.name as t, type(rel) as rt LIMIT 80
                    """, uid=safe_user_id):
                        if r["s"] and r["t"]:
                            edges.append({
                                "source": "concept_" + r["s"],
                                "target": "concept_" + r["t"],
                                "type": r["rt"],
                                "weight": 2,
                                "color": "rgba(96,165,250,0.5)"
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