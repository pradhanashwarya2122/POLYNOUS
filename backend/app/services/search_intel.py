"""
app/services/search_intel.py — Phase 2 semantic-search intelligence.

Turns the semantic search from a "find" tool into an "understand my own corpus"
tool:

  • synthesize_answer  — a short, GROUNDED synthesis of the user's own top
                         results, citing their past research entries as [n].
  • detect_gaps        — connections the user has researched separately but never
                         together, plus under-explored sub-questions, each with a
                         concrete suggested query.

Both call the user's own LLM key (ask_llm) and are strictly best-effort: any
failure returns an empty-but-valid payload so the search UI never breaks.
"""
from typing import Dict, List

from app.semantic_search import semantic_search
from app.llm_client import ask_llm


def synthesize_answer(user, query: str, user_id: str = "guest", top_k: int = 6) -> Dict:
    """Answer the query STRICTLY from the user's own top search results, with
    [n] citations back to those entries. Returns synthesis + the results it used."""
    try:
        results = semantic_search.search(user, query, top_k=top_k, filters=None, user_id=user_id)
    except Exception as e:
        print(f"synthesize: search failed: {e}")
        results = []

    if not results:
        return {"query": query, "synthesis": "", "grounded": False, "citations": [], "results": []}

    ctx_lines, cites = [], []
    for i, r in enumerate(results, 1):
        q = (r.get("query") or "")[:140]
        a = (r.get("answer") or "")[:420]
        ctx_lines.append(f"[{i}] ({r.get('mode', 'research')}) {q}\n{a}")
        cites.append({"n": i, "id": r.get("id"), "query": q, "mode": r.get("mode", "research"),
                      "score": r.get("score", 0)})
    context = "\n\n".join(ctx_lines)

    synthesis = ""
    try:
        synthesis = ask_llm(
            user=user,
            system_prompt=(
                "You answer STRICTLY from the user's own past research entries provided below. "
                "Write 2 to 4 sentences that directly answer the query, citing supporting entries "
                "inline as [n]. If the entries do not actually answer the query, say that plainly "
                "and name the closest topic they do cover. No preamble, no headings."
            ),
            messages=[{"role": "user",
                       "content": f"Query: {query}\n\nMy past research:\n{context}\n\nGrounded synthesis:"}],
            max_tokens=320, temperature=0.2,
        )
        synthesis = (synthesis or "").strip()
    except Exception as e:
        print(f"synthesize: llm failed: {e}")
        synthesis = ""

    return {"query": query, "synthesis": synthesis, "grounded": bool(synthesis),
            "citations": cites, "results": results}


def detect_gaps(user, user_id: str = "guest") -> Dict:
    """Cluster the user's corpus, then have the model surface 3 GAPS: unexplored
    connections between clusters and under-explored sub-questions, each with a
    concrete suggested query to run next."""
    from app.services.knowledge_clustering import cluster_research
    from app.utils.json_extract import extract_json_object

    try:
        data = cluster_research(user, user_id=user_id)
    except Exception as e:
        print(f"gaps: cluster failed: {e}")
        data = {"points": [], "clusters": [], "count": 0}

    clusters = data.get("clusters", []) or []
    points = data.get("points", []) or []
    count = data.get("count", 0)
    if count < 4 or not clusters:
        return {"gaps": [], "clusters": clusters, "count": count,
                "message": "Research a few more topics to unlock gap detection."}

    by_cluster: Dict[int, List[str]] = {}
    for p in points:
        by_cluster.setdefault(p.get("cluster", 0), []).append(p.get("query", ""))
    summary_lines = []
    for c in clusters:
        qs = [q for q in by_cluster.get(c["id"], [])[:4] if q]
        summary_lines.append(f"- {c['label']} ({c['size']} entries): " + "; ".join(qs))
    summary = "\n".join(summary_lines)

    gaps: List[Dict] = []
    try:
        raw = ask_llm(
            user=user,
            system_prompt=(
                "You analyse a researcher's topic clusters and surface GAPS worth exploring: "
                "(a) two clusters they have researched separately but never connected, and "
                "(b) an under-explored sub-question inside or adjacent to their work. "
                "Return ONLY a JSON object: "
                '{\"gaps\":[{\"title\":str,\"why\":str,\"suggested_query\":str,\"mode\":\"research\"|\"debate\"}]}. '
                "Exactly 3 gaps. Each must be specific to THIS researcher and immediately actionable; "
                "suggested_query is a concrete query they could run right now. No prose outside the JSON."
            ),
            messages=[{"role": "user", "content": f"My research clusters:\n{summary}\n\nFind 3 gaps as JSON:"}],
            max_tokens=520, temperature=0.4,
        )
        parsed = extract_json_object(raw)
        if isinstance(parsed, dict):
            gaps = parsed.get("gaps", []) or []
    except Exception as e:
        print(f"gaps: llm failed: {e}")
        gaps = []

    clean = []
    for g in gaps[:3]:
        if not isinstance(g, dict):
            continue
        title = str(g.get("title", "")).strip()[:120]
        sq = str(g.get("suggested_query", "")).strip()[:160]
        if not (title or sq):
            continue
        clean.append({
            "title": title or "Unexplored connection",
            "why": str(g.get("why", "")).strip()[:260],
            "suggested_query": sq,
            "mode": g.get("mode") if g.get("mode") in ("research", "debate") else "research",
        })

    return {"gaps": clean, "clusters": clusters, "count": count}
