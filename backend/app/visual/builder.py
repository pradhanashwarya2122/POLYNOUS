import random, time, math
from typing import Dict, Any, List, Optional

def init_visual_state(query: str) -> dict:
    return {
        "query": query,
        "progress": 0,
        "convergence": 0,
        "elapsedSeconds": 0,
        "agents": {
            "Search": {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "lastSource": None, "signal": None},
            "Summarise": {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "notes": [], "insights": [], "signal": None},
            "Critic": {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "signal": None, "checklist": []},
            "Writer": {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "draftText": "", "wordCount": 0, "signal": None},
        },
        "logs": [],
        "lanes": {
            "Search": {"sub": "", "status": ""},
            "Summarise": {"sub": "", "status": ""},
            "Critic": {"sub": "", "status": ""},
            "Writer": {"sub": "", "status": ""},
        },
        "floatingTags": [],
        "metrics": {"sources": 0, "insights": 0, "claims": 0, "confidence": 0},
        "confidenceBreakdown": [],
        "sourceTrust": {"high": 0, "med": 0, "low": 0, "domains": []},
        "faithfulness": {"grounded": 0, "total": 0, "flagged": []},
        "contradiction": None,
        "suggestions": [],
    }

def build_visual_patch(state: dict, agent_name: str, elapsed: float) -> dict:
    """
    Build a patch object that should be deep‑merged into the full visual state.
    For each agent, fill its panel.
    For 'Final', fill diagnostics and overall progress.
    """
    patch = {"elapsedSeconds": round(elapsed, 1)}

    if agent_name in ("Search", "Final"):
        docs = state.get("retrieved_docs", [])
        scraped = sum(1 for d in docs if d.get("content_source") == "scraped")
        patch.setdefault("agents", {})["Search"] = _search_panel(docs, scraped)
        patch.setdefault("metrics", {})["sources"] = len(docs)

    if agent_name in ("Summarise", "Final"):
        summaries = state.get("summaries", [])
        patch.setdefault("agents", {})["Summarise"] = _summarise_panel(summaries)
        patch.setdefault("lanes", {}).setdefault("Summarise", {})["sub"] = f"{len(summaries)} summaries"

    if agent_name in ("Critic", "Final"):
        critique = state.get("critique", {})
        patch.setdefault("agents", {})["Critic"] = _critic_panel(critique)
        patch.setdefault("metrics", {})["claims"] = len(critique.get("agreement_groups", [])) + len(critique.get("disagreement_groups", []))
        patch.setdefault("metrics", {})["confidence"] = f"{critique.get('overall_confidence', 0)}%"

    if agent_name in ("Writer", "Final"):
        answer = state.get("final_answer", "")
        patch.setdefault("agents", {})["Writer"] = _writer_panel(answer)
        patch.setdefault("lanes", {}).setdefault("Writer", {})["sub"] = f"{len(answer.split())} words"

    if agent_name == "Final":
        patch["progress"] = 100
        patch["convergence"] = 85
        patch.setdefault("confidenceBreakdown", _confidence_breakdown(state))
        patch.setdefault("sourceTrust", _source_trust(state.get("retrieved_docs", [])))
        patch.setdefault("faithfulness", _faithfulness(state))
        patch.setdefault("contradiction", _contradiction(state))
        patch.setdefault("suggestions", _suggestions(state))
        # add some floating tags
        patch.setdefault("floatingTags", [
            {"agent": "Search", "label": "Sources", "value": str(len(state.get('retrieved_docs',[]))), "delay": "0s", "top": "10%", "left": "30%"},
            {"agent": "Critic", "label": "Confidence", "value": f"{state.get('critique',{}).get('overall_confidence','?')}%", "delay": "0.5s", "top": "50%", "right": "20%"},
            {"agent": "Writer", "label": "Words", "value": str(len(state.get('final_answer','').split())), "delay": "1s", "bottom": "15%", "left": "45%"},
        ])
        patch.setdefault("logs", _logs(state))

    return patch

# ------------ Panel helpers -------------
def _search_panel(docs, scraped):
    last = docs[-1] if docs else {}
    return {
        "progress": 100,
        "phase": {"label": "Complete", "sub": f"{len(docs)} sources found"},
        "stats": [["Total", str(len(docs))], ["Full articles", str(scraped)], ["Snippets", str(len(docs)-scraped)]],
        "lastSource": {
            "id": f"Source {len(docs)}",
            "badge": "ARTICLE" if last.get("content_source") == "scraped" else "SNIPPET",
            "title": last.get("title", "Unknown")[:60],
            "description": last.get("content", "")[:120] + "...",
            "time": "just now",
            "score": str(last.get("score", "--"))
        } if last else None,
        "signal": {"eyebrow": "Retrieval spread", "variant": "cyan", "promptText": f"Scanned {len(docs)} sources", "levels": [random.randint(30,95) for _ in range(8)]}
    }

def _summarise_panel(summaries):
    notes = ["Identified main claim per source", f"Extracted key evidence from {len(summaries)} documents"]
    insights = [{"text": s[:80] + "...", "tag": "key"} for s in summaries[:3]]
    return {
        "progress": 100,
        "phase": {"label": "Complete", "sub": f"{len(summaries)} documents condensed"},
        "stats": [["Documents", str(len(summaries))]],
        "notes": notes,
        "insights": insights,
        "signal": {"eyebrow": "Compression fidelity", "variant": "blue", "promptText": "Key points extracted", "levels": [random.randint(30,95) for _ in range(8)]}
    }

def _critic_panel(critique):
    agreements = len(critique.get("agreement_groups", []))
    disagreements = len(critique.get("disagreement_groups", []))
    checklist = [
        {"label": "Cross-source agreement", "status": "done" if agreements else "active"},
        {"label": "Disagreement detection", "status": "done" if disagreements else "pending"},
        {"label": "Factual consistency", "status": "done" if critique else "active"},
    ]
    return {
        "progress": 100,
        "phase": {"label": "Complete", "sub": f"{agreements} agree, {disagreements} disagree"},
        "stats": [["Agreements", str(agreements)], ["Disagreements", str(disagreements)]],
        "checklist": checklist,
        "signal": {"eyebrow": "Source alignment", "variant": "entailment", "promptText": f"Agreement groups: {agreements}", "levels": [random.randint(30,95) for _ in range(8)]}
    }

def _writer_panel(answer):
    words = answer.split()
    return {
        "progress": 100,
        "phase": {"label": "Complete", "sub": "Research digest ready"},
        "stats": [["Words", str(len(words))]],
        "draftText": answer[:500] + ("..." if len(answer)>500 else ""),
        "wordCount": len(words),
        "signal": {"eyebrow": "Narrative coherence", "variant": "purple", "promptText": "Digest structured", "levels": [random.randint(30,95) for _ in range(8)]}
    }

def _confidence_breakdown(state):
    comp = state.get("computed_confidence", {})
    if not comp:
        return []
    bd = comp.get("breakdown", {})
    colors = {"source_agreement": "#4FD1C5", "domain_diversity": "#6C8CFF", "recency": "#E8A855", "claim_grounding": "#B48EF0"}
    return [{"label": k.replace("_"," ").title(), "pct": round(v*100,1), "color": colors.get(k,"#6C8CFF")} for k,v in bd.items()]

def _source_trust(docs):
    from collections import Counter
    from urllib.parse import urlparse
    domains = Counter()
    for d in docs:
        url = d.get("url","")
        if url:
            netloc = urlparse(url).netloc
            domains[netloc] += 1
    domain_list = [{"name": netloc, "score": "High", "tier": "high"} for netloc in list(domains.keys())[:4]]
    return {"high": 60, "med": 30, "low": 10, "domains": domain_list}

def _faithfulness(state):
    # placeholder, you can integrate real faithfulness later
    answer = state.get("final_answer", "")
    sentences = [s for s in answer.split('.') if s.strip()]
    return {"grounded": len(sentences), "total": len(sentences), "flagged": []}

def _contradiction(state):
    critique = state.get("critique", {})
    dis = critique.get("disagreement_groups", [])
    if not dis:
        return None
    first = dis[0]
    posA = first.get("position_a",{})
    posB = first.get("position_b",{})
    return {
        "claimA": {"label": "Position A", "trust": "High", "text": posA.get("claim","")[:100], "source": f"Sources {posA.get('sources',[])}"},
        "claimB": {"label": "Position B", "trust": "Med", "text": posB.get("claim","")[:100], "source": f"Sources {posB.get('sources',[])}"},
        "resolution": first.get("nature","Disputed")
    }

def _suggestions(state):
    gaps = state.get("critique", {}).get("coverage_gaps", [])
    return [{"icon": "psychology", "agent": "Search", "title": gap, "est": "~30s", "diff": "Medium", "diffLevel": "med", "avail": "High", "availLevel": "high"} for gap in gaps[:3]]

def _logs(state):
    # simulate a log from the pipeline steps
    return [
        {"id":1, "agentName":"Search", "msg":"Query sent to Tavily", "timeStr":"00:00"},
        {"id":2, "agentName":"Search", "msg":f"Found {len(state.get('retrieved_docs',[]))} sources", "timeStr":"00:03"},
        {"id":3, "agentName":"Summarise", "msg":"Extracting key points", "timeStr":"00:05"},
        {"id":4, "agentName":"Critic", "msg":"Comparing claims", "timeStr":"00:08"},
        {"id":5, "agentName":"Writer", "msg":"Writing digest", "timeStr":"00:11"},
    ]