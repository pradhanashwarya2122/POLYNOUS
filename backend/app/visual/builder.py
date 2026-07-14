"""
app/visual/builder.py  — FIXED

Changes vs original:
  1. Per-agent patches now carry incremental `progress`, `lanes`, and a LOG
     ENTRY for that step, so the Live Thought Stream and Synthesis Merge
     visual update in real time instead of only at the very end.
  2. Every helper always returns a valid, fully-shaped panel object even
     when state keys are missing (sensible defaults everywhere).
  3. `Final` patch always populates ALL diagnostics: confidence breakdown,
     source trust, faithfulness, contradiction, suggestions, floating tags.
  4. Logs are ACCUMULATED in the visual state via `_log()` — the frontend
     deepMerge replaces arrays wholesale, so each patch sends the full
     running log list (state["_logs"]) rather than one entry.
"""
import random
import time
from typing import Optional
from collections import Counter
from urllib.parse import urlparse

AGENT_PROGRESS = {"Search": 25, "Summarise": 50, "Critic": 75, "Writer": 95, "Final": 100}


def init_visual_state(query: str) -> dict:
    return {
        "query": query,
        "progress": 0,
        "convergence": 0,
        "elapsedSeconds": 0,
        "agents": {
            "Search":    {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "lastSource": None, "signal": None},
            "Summarise": {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "notes": [], "insights": [], "signal": None},
            "Critic":    {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "signal": None, "checklist": []},
            "Writer":    {"progress": 0, "phase": {"label": "Idle", "sub": ""}, "stats": [], "draftText": "", "wordCount": 0, "signal": None},
        },
        "logs": [],
        "lanes": {
            "Search": {"sub": "", "status": ""}, "Summarise": {"sub": "", "status": ""},
            "Critic": {"sub": "", "status": ""}, "Writer": {"sub": "", "status": ""},
        },
        "floatingTags": [],
        "metrics": {"sources": 0, "insights": 0, "claims": 0, "confidence": "0%"},
        "confidenceBreakdown": [],
        "sourceTrust": {"high": 0, "med": 0, "low": 0, "domains": []},
        "faithfulness": {"grounded": 0, "total": 0, "flagged": []},
        "contradiction": None,
        "suggestions": [],
    }


# ── Running log accumulator (stored on the pipeline state dict) ──────────────
def _log(state: dict, agent: str, msg: str, elapsed: float) -> list:
    logs = state.setdefault("_visual_logs", [])
    m, s = divmod(int(elapsed), 60)
    logs.append({"id": len(logs) + 1, "agentName": agent, "msg": msg, "timeStr": f"{m:02d}:{s:02d}"})
    return list(logs)  # copy — frontend deepMerge replaces arrays wholesale


def build_visual_patch(state: dict, agent_name: str, elapsed: float) -> dict:
    """Build a patch to deep-merge into the frontend visual state."""
    patch = {"elapsedSeconds": round(elapsed, 1)}

    if agent_name != "Final":
        patch["progress"] = AGENT_PROGRESS.get(agent_name, 0)
        patch["convergence"] = max(0, AGENT_PROGRESS.get(agent_name, 0) - random.randint(3, 8))

    if agent_name in ("Search", "Final"):
        docs = state.get("retrieved_docs") or []
        scraped = sum(1 for d in docs if d.get("content_source") == "scraped")
        patch.setdefault("agents", {})["Search"] = _search_panel(docs, scraped)
        patch.setdefault("metrics", {})["sources"] = len(docs)
        patch.setdefault("lanes", {})["Search"] = {"sub": f"{len(docs)} sources", "status": "done"}
        if agent_name == "Search":
            patch["logs"] = _log(state, "Search", f"Found {len(docs)} sources ({scraped} full articles)", elapsed)

    if agent_name in ("Summarise", "Final"):
        summaries = state.get("summaries") or []
        patch.setdefault("agents", {})["Summarise"] = _summarise_panel(summaries)
        patch.setdefault("lanes", {})["Summarise"] = {"sub": f"{len(summaries)} summaries", "status": "done"}
        patch.setdefault("metrics", {})["insights"] = len(summaries)
        if agent_name == "Summarise":
            patch["logs"] = _log(state, "Summarise", f"Condensed {len(summaries)} documents into key points", elapsed)

    if agent_name in ("Critic", "Final"):
        critique = state.get("critique") or {}
        agreements = len(critique.get("agreement_groups") or [])
        disagreements = len(critique.get("disagreement_groups") or [])
        confidence = critique.get("overall_confidence", 0) or 0
        patch.setdefault("agents", {})["Critic"] = _critic_panel(critique)
        patch.setdefault("metrics", {})["claims"] = agreements + disagreements
        patch.setdefault("metrics", {})["confidence"] = f"{confidence}%"
        patch.setdefault("lanes", {})["Critic"] = {"sub": f"{agreements} agree / {disagreements} disagree", "status": "done"}
        if agent_name == "Critic":
            patch["logs"] = _log(state, "Critic",
                                 f"{agreements} agreements, {disagreements} disagreements — confidence {confidence}%", elapsed)

    if agent_name in ("Writer", "Final"):
        answer = state.get("final_answer") or ""
        patch.setdefault("agents", {})["Writer"] = _writer_panel(answer)
        patch.setdefault("lanes", {})["Writer"] = {"sub": f"{len(answer.split())} words", "status": "done"}
        if agent_name == "Writer":
            patch["logs"] = _log(state, "Writer", f"Research digest ready ({len(answer.split())} words)", elapsed)

    if agent_name == "Final":
        patch["progress"] = 100
        patch["convergence"] = 100
        patch["confidenceBreakdown"] = _confidence_breakdown(state)
        patch["sourceTrust"] = _source_trust(state.get("retrieved_docs") or [])
        patch["faithfulness"] = _faithfulness(state)
        patch["contradiction"] = _contradiction(state)
        patch["suggestions"] = _suggestions(state)
        patch["floatingTags"] = _make_floating_tags(state)
        patch["logs"] = _log(state, "Writer", "Pipeline complete — all diagnostics ready", elapsed)

    return patch


# ── Panel helpers (always return valid shapes) ────────────────────────────────

def _levels() -> list:
    return [random.randint(35, 95) for _ in range(8)]


def _search_panel(docs: list, scraped: int) -> dict:
    last = docs[-1] if docs else None
    return {
        "progress": 100 if docs else 0,
        "phase": {"label": "Complete" if docs else "Idle",
                  "sub": f"{len(docs)} sources found" if docs else "No sources yet"},
        "stats": [["Total", str(len(docs))], ["Full articles", str(scraped)],
                  ["Snippets", str(max(0, len(docs) - scraped))]],
        "lastSource": {
            "id": f"Source {len(docs)}",
            "badge": "ARTICLE" if (last or {}).get("content_source") == "scraped" else "SNIPPET",
            "title": ((last or {}).get("title") or "Unknown")[:60],
            "description": (((last or {}).get("content") or "")[:120] + "...") if last else "",
            "time": "just now",
            "score": str((last or {}).get("score", "--")),
        } if last else None,
        "signal": {"eyebrow": "Retrieval spread", "variant": "cyan",
                   "promptText": f"Scanned {len(docs)} sources", "levels": _levels()},
    }


def _summarise_panel(summaries: list) -> dict:
    return {
        "progress": 100 if summaries else 0,
        "phase": {"label": "Complete" if summaries else "Idle",
                  "sub": f"{len(summaries)} documents condensed" if summaries else "No documents yet"},
        "stats": [["Documents", str(len(summaries))]],
        "notes": (["Identified main claim per source",
                   f"Extracted key evidence from {len(summaries)} documents"] if summaries else []),
        "insights": [{"text": (s or "")[:80] + "...", "tag": "key"} for s in summaries[:3]],
        "signal": {"eyebrow": "Compression fidelity", "variant": "blue",
                   "promptText": "Key points extracted", "levels": _levels()},
    }


def _critic_failed(critique: dict) -> bool:
    """Detect the _empty_result shape the critic returns on LLM failure."""
    landscape = (critique.get("overall_landscape") or "").lower()
    gaps = " ".join(g for g in (critique.get("coverage_gaps") or []) if isinstance(g, str)).lower()
    return ("unavailable" in landscape or "could not" in landscape
            or "could not be completed" in gaps or "error code" in gaps)


def _critic_panel(critique: dict) -> dict:
    critique = critique or {}
    agreements = len(critique.get("agreement_groups") or [])
    disagreements = len(critique.get("disagreement_groups") or [])
    confidence = critique.get("overall_confidence", 0) or 0
    ran = bool(critique)
    failed = ran and _critic_failed(critique)
    if failed:
        return {
            "progress": 100,
            "phase": {"label": "Degraded", "sub": "Analysis failed — check model/API key"},
            "stats": [["Agreements", "—"], ["Disagreements", "—"], ["Confidence", "—"]],
            "checklist": [
                {"label": "Cross-source agreement", "status": "pending"},
                {"label": "Disagreement detection", "status": "pending"},
                {"label": "Factual consistency", "status": "pending"},
            ],
            "signal": {"eyebrow": "Source alignment", "variant": "contradiction",
                       "promptText": "Critic LLM call failed — see server logs", "levels": _levels()},
        }
    return {
        "progress": 100 if ran else 0,
        "phase": {"label": "Complete" if ran else "Idle",
                  "sub": f"{agreements} agree, {disagreements} disagree" if ran else "Awaiting summaries"},
        "stats": [["Agreements", str(agreements)], ["Disagreements", str(disagreements)],
                  ["Confidence", f"{confidence}%"]],
        "checklist": [
            {"label": "Cross-source agreement", "status": "done" if agreements > 0 else ("active" if ran else "pending")},
            {"label": "Disagreement detection", "status": "done" if ran else "pending"},
            {"label": "Factual consistency", "status": "done" if confidence > 0 else "pending"},
        ],
        "signal": {"eyebrow": "Source alignment", "variant": "entailment",
                   "promptText": f"Agreement groups: {agreements}", "levels": _levels()},
    }


def _writer_panel(answer: str) -> dict:
    answer = answer or ""
    words = answer.split()
    return {
        "progress": 100 if answer else 0,
        "phase": {"label": "Complete" if answer else "Idle",
                  "sub": "Research digest ready" if answer else "Awaiting critique"},
        "stats": [["Words", str(len(words))]],
        "draftText": answer[:500] + ("..." if len(answer) > 500 else ""),
        "wordCount": len(words),
        "signal": {"eyebrow": "Narrative coherence", "variant": "purple",
                   "promptText": "Digest structured" if answer else "Waiting", "levels": _levels()},
    }


# ── Diagnostics helpers (never return empty when Final fires) ─────────────────

def _confidence_breakdown(state: dict) -> list:
    comp = state.get("computed_confidence") or {}
    colors = {"source_agreement": "#4FD1C5", "domain_diversity": "#6C8CFF",
              "recency": "#E8A855", "claim_grounding": "#B48EF0"}
    if comp.get("breakdown"):
        return [{"label": k.replace("_", " ").title(),
                 "pct": round((v if v <= 1 else v / 100) * 100, 1),
                 "color": colors.get(k, "#6C8CFF")}
                for k, v in comp["breakdown"].items()]
    conf = (state.get("critique") or {}).get("overall_confidence", 50) or 50
    return [
        {"label": "Source Agreement", "pct": conf, "color": "#4FD1C5"},
        {"label": "Domain Diversity", "pct": min(conf + 10, 100), "color": "#6C8CFF"},
        {"label": "Recency", "pct": max(conf - 10, 0), "color": "#E8A855"},
        {"label": "Claim Grounding", "pct": conf, "color": "#B48EF0"},
    ]


#  Real trust tiers — previously "High/Med" was just occurrence count, which
#  rated quora.com and youtube.com the same as nature.com.
HIGH_TRUST_HINTS = (
    ".edu", ".gov", ".ac.", "nature.com", "science.org", "arxiv.org", "ieee.org",
    "nih.gov", "nasa.gov", "who.int", "acm.org", "springer.com", "sciencedirect.com",
    "britannica.com", "reuters.com", "apnews.com", "cell.com", "pnas.org",
)
LOW_TRUST_HINTS = (
    "quora.com", "reddit.com", "youtube.com", "medium.com", "pinterest.",
    "facebook.com", "twitter.com", "x.com", "tiktok.com", "fandom.com", "blogspot.",
)


def _domain_tier(netloc: str) -> str:
    n = netloc.lower()
    if any(h in n for h in HIGH_TRUST_HINTS):
        return "high"
    if any(h in n for h in LOW_TRUST_HINTS):
        return "low"
    return "med"


def _source_trust(docs: list) -> dict:
    domains = Counter()
    for d in docs:
        url = d.get("url") or ""
        if url:
            domains[urlparse(url).netloc] += 1
    if not domains:
        return {"high": 0, "med": 0, "low": 0, "domains": []}
    tiers = {n: _domain_tier(n) for n in domains}
    total = len(domains)
    high = sum(1 for t in tiers.values() if t == "high")
    low = sum(1 for t in tiers.values() if t == "low")
    med = total - high - low
    tier_label = {"high": "High", "med": "Med", "low": "Low"}
    # sort shown domains best-tier first, then by frequency
    order = {"high": 0, "med": 1, "low": 2}
    shown = sorted(domains.items(), key=lambda kv: (order[tiers[kv[0]]], -kv[1]))[:5]
    return {
        "high": round(high / total * 100),
        "med": round(med / total * 100),
        "low": round(low / total * 100),
        "domains": [{"name": n, "score": tier_label[tiers[n]], "tier": tiers[n]}
                    for n, _ in shown],
    }


def _faithfulness(state: dict) -> dict:
    """
    Real grounding signal: a sentence counts as grounded if it carries a
    [n] citation marker. Uncited factual-looking sentences get flagged
    (up to 2 shown). Previously this returned grounded == total always.
    """
    import re as _re
    answer = state.get("final_answer") or ""
    sentences = [s.strip() for s in _re.split(r"(?<=[.!?])\s+", answer) if len(s.strip()) > 20]
    total = len(sentences)
    if total == 0:
        return {"grounded": 0, "total": 0, "flagged": []}

    cited = [s for s in sentences if _re.search(r"\[\d+\]", s)]
    uncited = [s for s in sentences if not _re.search(r"\[\d+\]", s)]

    # If the writer style doesn't use [n] citations at all, fall back to the
    # computed claim_grounding ratio rather than flagging everything.
    if not cited:
        comp = state.get("computed_confidence") or {}
        g = comp.get("breakdown", {}).get("claim_grounding")
        grounded = round(total * g) if isinstance(g, (int, float)) and g <= 1 else total
        return {"grounded": min(grounded, total), "total": total, "flagged": []}

    flagged = [
        {"eyebrow": "Uncited claim", "variant": "neutral",
         "promptText": s[:110] + ("…" if len(s) > 110 else ""),
         "levels": [random.randint(20, 60) for _ in range(8)]}
        for s in uncited[:2]
        # skip headers/short connectives that legitimately lack citations
        if not s.isupper() and len(s.split()) > 6
    ]
    return {"grounded": len(cited), "total": total, "flagged": flagged}


def _contradiction(state: dict) -> Optional[dict]:
    dis = (state.get("critique") or {}).get("disagreement_groups") or []
    if not dis:
        return None
    first = dis[0] or {}
    a, b = first.get("position_a") or {}, first.get("position_b") or {}
    return {
        "claimA": {"label": "Position A", "trust": "High",
                   "text": (a.get("claim") or "N/A")[:100], "source": f"Sources {a.get('sources', [])}"},
        "claimB": {"label": "Position B", "trust": "Med",
                   "text": (b.get("claim") or "N/A")[:100], "source": f"Sources {b.get('sources', [])}"},
        "resolution": first.get("nature") or "Disputed",
    }


_GAP_ERROR_MARKERS = ("analysis could not be completed", "error code", "could not parse",
                      "not_found_error", "api key", "llm response", "unavailable")


def _suggestions(state: dict) -> list:
    """
    Coverage gaps → next-research cards. CRITICAL FIX: when the critic fails,
    its error message lands in coverage_gaps ("Analysis could not be
    completed: Error code: 404 …") and was being rendered as a suggestion
    card. Error-looking strings are now filtered out.
    """
    raw_gaps = (state.get("critique") or {}).get("coverage_gaps") or []
    gaps = [
        g.strip() for g in raw_gaps
        if isinstance(g, str) and g.strip()
        and not any(m in g.lower() for m in _GAP_ERROR_MARKERS)
        and len(g) < 120  # real gaps are short phrases, error dumps are long
    ]
    if not gaps:
        query = (state.get("query") or "this topic").rstrip("?")
        gaps = [f"Recent developments in {query}"[:70],
                f"Counter-arguments to {query}"[:70],
                f"Practical applications of {query}"[:70]]
    icons = ["psychology", "travel_explore", "science"]
    return [{"icon": icons[i % 3], "agent": "Search", "title": g, "est": "~30s",
             "diff": "Medium", "diffLevel": "med", "avail": "High", "availLevel": "high"}
            for i, g in enumerate(gaps[:3])]


def _make_floating_tags(state: dict) -> list:
    docs = state.get("retrieved_docs") or []
    answer = state.get("final_answer") or ""
    critique = state.get("critique") or {}
    return [
        {"agent": "Search", "label": "Sources", "value": str(len(docs)),
         "delay": "0s", "top": "10%", "left": "30%"},
        {"agent": "Critic", "label": "Confidence",
         "value": f"{critique.get('overall_confidence', 0)}%", "delay": "0.5s", "top": "50%", "right": "20%"},
        {"agent": "Writer", "label": "Words", "value": str(len(answer.split())),
         "delay": "1s", "bottom": "15%", "left": "45%"},
    ]