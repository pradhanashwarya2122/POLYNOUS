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
import re
import time
from typing import Optional
from collections import Counter
from urllib.parse import urlparse

AGENT_PROGRESS = {"Search": 25, "Summarise": 50, "Critic": 65, "Writer": 95, "Final": 100}
# Critic becomes 82 on its second (post-deepen) pass — see build_visual_patch.


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
        "metrics": {"sources": 0, "insights": "—", "claims": "—", "confidence": "—"},
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
        progress = AGENT_PROGRESS.get(agent_name, 0)
        # After a gap-driven deepen cycle the critic runs a second time — nudge
        # its progress forward (65 → 82) so the bar never jumps backwards.
        if agent_name == "Critic" and state.get("research_cycles", 0) >= 1:
            progress = 82
        patch["progress"] = progress
        # Real convergence proxy: pipeline progress scaled by critic
        # confidence once the critique exists; plain progress before that.
        conf = (state.get("critique") or {}).get("overall_confidence")
        patch["convergence"] = round(progress * conf / 100) if conf else progress

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
        patch.setdefault("agents", {})["Summarise"] = _summarise_panel(summaries, state.get("retrieved_docs") or [])
        patch.setdefault("lanes", {})["Summarise"] = {"sub": f"{len(summaries)} summaries", "status": "done"}
        patch.setdefault("metrics", {})["insights"] = len(summaries)
        if agent_name == "Summarise":
            patch["logs"] = _log(state, "Summarise", f"Condensed {len(summaries)} documents into key points", elapsed)

    if agent_name in ("Critic", "Final"):
        critique = state.get("critique") or {}
        agreements = len(critique.get("agreement_groups") or [])
        disagreements = len(critique.get("disagreement_groups") or [])
        confidence = critique.get("overall_confidence", 0) or 0
        failed = _critic_failed(critique) if critique else False
        patch.setdefault("agents", {})["Critic"] = _critic_panel(critique, len(state.get("summaries") or []))
        patch.setdefault("metrics", {})["claims"] = "—" if failed else agreements + disagreements
        patch.setdefault("metrics", {})["confidence"] = "—" if failed else f"{confidence}%"
        patch.setdefault("lanes", {})["Critic"] = {
            "sub": "analysis failed" if failed else f"{agreements} agree / {disagreements} disagree",
            "status": "done",
        }
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
        # Convergence at completion = the measured confidence, never a
        # hardcoded 100 (100% convergence with 0% confidence is a lie).
        critique = state.get("critique") or {}
        conf = critique.get("overall_confidence") or 0
        if not conf:
            conf = (state.get("computed_confidence") or {}).get("score") or 0
        patch["convergence"] = min(100, max(0, round(conf)))
        patch["confidenceBreakdown"] = _confidence_breakdown(state)
        patch["sourceTrust"] = _source_trust(state.get("retrieved_docs") or [])
        patch["faithfulness"] = _faithfulness(state)
        patch["contradiction"] = _contradiction(state)
        patch["suggestions"] = _suggestions(state)
        patch["floatingTags"] = _make_floating_tags(state)
        patch["logs"] = _log(state, "Writer", "Pipeline complete — all diagnostics ready", elapsed)

    return patch


# ── Panel helpers (always return valid shapes) ────────────────────────────────
# All signal `levels` arrays are REAL data series normalized to 0-100 —
# no random/decorative values anywhere.

def _content_depth_levels(docs: list) -> list:
    """One bar per source: content length normalized (4000 chars ≈ full)."""
    return [min(100, round((d.get("content_length") or len(d.get("content") or "")) / 4000 * 100))
            for d in docs[:16]]


def _bar_links(docs: list) -> list:
    """URLs aligned 1:1 with _content_depth_levels bars so the frontend can make
    each bar a clickable link to the source it represents (RES-02)."""
    return [(d.get("url") or "") for d in docs[:16]]


def _age_str(fetched_at) -> str:
    if not fetched_at:
        return "—"
    secs = max(0, int(time.time() - fetched_at))
    return f"{secs}s ago" if secs < 120 else f"{secs // 60}m ago"


def _recent_sources(docs: list) -> list:
    rows = []
    for d in docs[-4:]:
        url = d.get("url") or ""
        rows.append({
            "domain": urlparse(url).netloc or url[:40],
            "title": (d.get("title") or "Untitled")[:70],
            "url": url,
            "score": round(d.get("score") or 0, 2),
            "badge": "ARTICLE" if d.get("content_source") == "scraped" else "SNIPPET",
            "chars": d.get("content_length") or 0,
        })
    return rows


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
            "url": (last or {}).get("url") or "",
            "description": (((last or {}).get("content") or "")[:120] + "...") if last else "",
            "time": _age_str((last or {}).get("fetched_at")),
            "score": str((last or {}).get("score", "--")),
        } if last else None,
        "recentSources": _recent_sources(docs),
        "signal": {"eyebrow": "Content depth per source", "variant": "cyan",
                   "promptText": f"Scanned {len(docs)} sources",
                   "levels": _content_depth_levels(docs),
                   "barLinks": _bar_links(docs)},
    }


def _doc_domain(doc: dict) -> str:
    url = (doc or {}).get("url") or ""
    return urlparse(url).netloc.replace("www.", "") or "source"


def _summarise_panel(summaries: list, docs: Optional[list] = None) -> dict:
    docs = docs or []
    # Real series: per-doc compression ratio (summary chars / doc chars).
    levels = []
    for i, s in enumerate(summaries[:16]):
        doc_len = (docs[i].get("content_length") or len(docs[i].get("content") or "")) if i < len(docs) else 0
        ratio = len(s or "") / doc_len if doc_len else 0
        levels.append(min(100, round(ratio * 100)))
    return {
        "progress": 100 if summaries else 0,
        "phase": {"label": "Complete" if summaries else "Idle",
                  "sub": f"{len(summaries)} documents condensed" if summaries else "No documents yet"},
        "stats": [["Documents", str(len(summaries))]],
        "notes": (["Identified main claim per source",
                   f"Extracted key evidence from {len(summaries)} documents"] if summaries else []),
        "insights": [{"text": (s or "")[:80] + "...",
                      "tag": _doc_domain(docs[i]) if i < len(docs) else "key"}
                     for i, s in enumerate(summaries[:3])],
        "signal": {"eyebrow": "Compression ratio per doc", "variant": "blue",
                   "promptText": "Key points extracted", "levels": levels,
                   "barLinks": _bar_links(docs)},
    }


def _critic_failed(critique: dict) -> bool:
    """Detect the _empty_result shape the critic returns on LLM failure."""
    if critique.get("parse_failed"):
        return True
    landscape = (critique.get("overall_landscape") or "").lower()
    gaps = " ".join(g for g in (critique.get("coverage_gaps") or []) if isinstance(g, str)).lower()
    return ("unavailable" in landscape or "could not" in landscape
            or "could not be completed" in gaps or "error code" in gaps)


def _critic_levels(critique: dict) -> list:
    """One bar per claim group: sources involved, normalized by the total
    sources analysed (agreement groups first, then disagreement groups)."""
    total = critique.get("total_sources_analyzed") or 0
    levels = []
    for g in critique.get("agreement_groups") or []:
        n = len(g.get("sources_agreeing") or [])
        levels.append(min(100, round(n / total * 100)) if total else n * 10)
    for g in critique.get("disagreement_groups") or []:
        n = len(((g.get("position_a") or {}).get("sources") or [])) + \
            len(((g.get("position_b") or {}).get("sources") or []))
        levels.append(min(100, round(n / total * 100)) if total else n * 10)
    return levels[:16]


def _critic_panel(critique: dict, n_summaries: int = 0) -> dict:
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
                       "promptText": "Critic LLM call failed — see server logs", "levels": []},
        }
    return {
        "progress": 100 if ran else 0,
        "phase": {"label": "Complete" if ran else "Idle",
                  "sub": f"{agreements} agree, {disagreements} disagree" if ran else "Awaiting summaries"},
        "stats": [["Agreements", str(agreements)], ["Disagreements", str(disagreements)],
                  ["Confidence", f"{confidence}%"],
                  ["Groups analysed", str(critique.get("total_sources_analyzed", n_summaries))]],
        "checklist": [
            # Each row reflects a real pipeline condition, not a guess.
            {"label": "Cross-source agreement", "status": ("done" if agreements > 0 else "active") if ran else "pending"},
            {"label": "Disagreement detection", "status": "done" if ran else "pending"},
            {"label": "Citation validation", "status": "done" if critique.get("citations_validated") else "pending"},
        ],
        "signal": {"eyebrow": "Sources per claim group", "variant": "entailment",
                   "promptText": f"Agreement groups: {agreements}",
                   "levels": _critic_levels(critique)},
    }


_MD_STRIP_RE = re.compile(r"(^#{1,6}\s*|\*\*|\*|`{1,3}|^>\s?)", re.MULTILINE)


def _plain(text: str) -> str:
    """Strip markdown decoration for the plain-text typewriter draft."""
    return _MD_STRIP_RE.sub("", text or "").strip()


def _writer_panel(answer: str) -> dict:
    answer = answer or ""
    words = answer.split()
    draft = _plain(answer)
    # Real series: words per paragraph, normalized (120 words ≈ full bar).
    paragraphs = [p for p in draft.split("\n\n") if p.strip()]
    levels = [min(100, round(len(p.split()) / 120 * 100)) for p in paragraphs[:16]]
    return {
        "progress": 100 if answer else 0,
        "phase": {"label": "Complete" if answer else "Idle",
                  "sub": "Research digest ready" if answer else "Awaiting critique"},
        "stats": [["Words", str(len(words))], ["Paragraphs", str(len(paragraphs))]],
        "draftText": draft,
        "wordCount": len(words),
        "signal": {"eyebrow": "Words per paragraph", "variant": "purple",
                   "promptText": "Digest structured" if answer else "Waiting", "levels": levels},
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
    # No real computed_confidence — return nothing rather than fabricating
    # a breakdown from a single number. The frontend shows an empty state.
    return []


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
         "levels": []}
        for s in uncited[:2]
        # skip headers/short connectives that legitimately lack citations
        if not s.isupper() and len(s.split()) > 6
    ]
    return {"grounded": len(cited), "total": total, "flagged": flagged}


def _position_trust(source_nums: list, docs: list) -> str:
    """REAL trust label for a debate position: the best domain tier among
    the sources actually cited by that position (was hardcoded High/Med)."""
    tiers = []
    for n in source_nums or []:
        if isinstance(n, int) and 1 <= n <= len(docs):
            url = (docs[n - 1] or {}).get("url") or ""
            if url:
                tiers.append(_domain_tier(urlparse(url).netloc))
    if not tiers:
        return "—"
    order = {"high": 0, "med": 1, "low": 2}
    best = min(tiers, key=lambda t: order[t])
    return {"high": "High", "med": "Med", "low": "Low"}[best]


# Raw `nature` enum -> a plain-English sentence. The frontend used to render
# the machine value directly ("different_scope"), which read as gibberish.
_NATURE_HUMAN = {
    "factual_dispute": "The sources report conflicting facts on this point.",
    "different_interpretation": "The sources interpret the same evidence differently.",
    "different_scope": "The sources are answering at different scopes, so they aren't strictly comparable.",
    "conflicting_data": "The sources cite conflicting data or measurements.",
}


def _humanize_nature(nature: str, topic: str) -> str:
    key = (nature or "").strip().lower().replace(" ", "_")
    sentence = _NATURE_HUMAN.get(key, "The sources take genuinely opposing positions here.")
    topic = (topic or "").strip()
    return f"Disagreement over {topic} — {sentence}" if topic else sentence


def _fmt_sources(nums) -> str:
    nums = [n for n in (nums or []) if isinstance(n, int)]
    if not nums:
        return "unattributed"
    return "Source " + ", ".join(str(n) for n in nums) if len(nums) == 1 else "Sources " + ", ".join(str(n) for n in nums)


def _contradiction(state: dict) -> Optional[dict]:
    dis = (state.get("critique") or {}).get("disagreement_groups") or []
    if not dis:
        return None
    docs = state.get("retrieved_docs") or []
    first = dis[0] or {}
    a, b = first.get("position_a") or {}, first.get("position_b") or {}
    ca, cb = (a.get("claim") or "").strip(), (b.get("claim") or "").strip()
    # Both positions need a real claim, else there's nothing meaningful to show.
    if not ca or not cb:
        return None
    return {
        "claimA": {"label": "Position A", "trust": _position_trust(a.get("sources"), docs),
                   "text": ca[:240], "source": _fmt_sources(a.get("sources"))},
        "claimB": {"label": "Position B", "trust": _position_trust(b.get("sources"), docs),
                   "text": cb[:240], "source": _fmt_sources(b.get("sources"))},
        "resolution": _humanize_nature(first.get("nature"), first.get("topic")),
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
    # Honest provenance: kind marks whether the suggestion came from a REAL
    # coverage gap the critic identified, or is a generated fallback.
    # (Previously every card carried fabricated "~30s / Medium / High" chips.)
    kind = "Coverage gap" if gaps else "Follow-up"
    if not gaps:
        query = (state.get("query") or "this topic").rstrip("?")
        gaps = [f"Recent developments in {query}"[:70],
                f"Counter-arguments to {query}"[:70],
                f"Practical applications of {query}"[:70]]
    icons = ["psychology", "travel_explore", "science"]
    return [{"icon": icons[i % 3], "agent": "Search", "title": g, "kind": kind}
            for i, g in enumerate(gaps[:3])]


def _make_floating_tags(state: dict) -> list:
    docs = state.get("retrieved_docs") or []
    answer = state.get("final_answer") or ""
    critique = state.get("critique") or {}
    return [
        {"agent": "Search", "label": "Sources", "value": str(len(docs)),
         "delay": "0s", "top": "10%", "left": "30%"},
        {"agent": "Critic", "label": "Confidence",
         "value": ("—" if _critic_failed(critique) else f"{critique.get('overall_confidence', 0)}%"),
         "delay": "0.5s", "top": "50%", "right": "20%"},
        {"agent": "Writer", "label": "Words", "value": str(len(answer.split())),
         "delay": "1s", "bottom": "15%", "left": "45%"},
    ]