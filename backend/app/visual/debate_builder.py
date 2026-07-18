"""
app/visual/debate_builder.py

Visual state + patch builders for the /debate-visual SSE stream — the
Debate Chamber's counterpart to builder.py. Same conventions:

  * Every value shown is REAL (rubric metrics, source stats) or an explicit
    degraded marker ("—", Degraded/UNSCORED phases). No random numbers.
  * Logs accumulate via builder._log; every patch ships the full array
    because the frontend deepMerge replaces arrays wholesale.
"""
import re
from urllib.parse import urlparse

from app.visual.builder import (
    _log,
    _plain,
    _recent_sources,
    _content_depth_levels,
    _domain_tier,
)
from app.utils.computed_confidence import _parse_date
from datetime import datetime, timezone

# domain-tier → numeric trust score shown per source (transparent mapping)
_TIER_SCORE = {"high": 90, "med": 70, "low": 50}

DEBATE_PROGRESS = {
    "Search": 15,
    "FOR-opening": 32,
    "AGAINST-opening": 50,
    "FOR-rebuttal": 66,
    "AGAINST-rebuttal": 82,
    "Judge": 96,
    "Final": 100,
}

_STAGE_PANEL = {
    "Search": "Evidence",
    "FOR-opening": "FOR", "FOR-rebuttal": "FOR",
    "AGAINST-opening": "AGAINST", "AGAINST-rebuttal": "AGAINST",
    "Judge": "Judge",
}

_CHECKLIST_LABELS = [
    "FOR opening delivered",
    "AGAINST opening delivered",
    "FOR rebuttal delivered",
    "AGAINST rebuttal delivered",
    "Rubrics computed",
    "Verdict rendered",
]


def init_debate_visual_state(query: str) -> dict:
    def advocate():
        return {"progress": 0, "phase": {"label": "Idle", "sub": "Awaiting evidence"},
                "openingText": "", "rebuttalText": "", "rubric": None,
                "rebuttalRubric": None, "stats": [], "signal": None, "error": None}
    return {
        "query": query,
        "mode": "debate",
        "progress": 0,
        "elapsedSeconds": 0,
        "stage": {"label": "Idle", "sub": ""},
        "panels": {
            "Evidence": {"progress": 0, "phase": {"label": "Idle", "sub": "No sources yet"},
                         "stats": [], "recentSources": [], "signal": None},
            "FOR": advocate(),
            "AGAINST": advocate(),
            "Judge": {"progress": 0, "phase": {"label": "Idle", "sub": "Awaiting arguments"},
                      "checklist": [{"label": l, "status": "pending"} for l in _CHECKLIST_LABELS],
                      "stats": []},
        },
        "clash": {"forShare": 50, "forScore": None, "againstScore": None, "live": False},
        "logs": [],
        "metrics": {"sources": 0, "forScore": "—", "againstScore": "—", "winner": "—"},
        "floatingTags": [],
        "verdict": None,
    }


# ── helpers ──────────────────────────────────────────────────────────────────

_CITE_RE = re.compile(r"\[\d{1,2}\]")


def _turn(state: dict, side: str, phase: str) -> dict:
    """Latest debate_history entry for (side, phase)."""
    for entry in reversed(state.get("debate_history") or []):
        if entry.get("side") == side and entry.get("phase") == phase:
            return entry
    return {}


def _citation_levels(argument: str) -> list:
    """Real series: [n] citations per paragraph, normalized to the max."""
    paragraphs = [p for p in (argument or "").split("\n\n") if p.strip()]
    counts = [len(_CITE_RE.findall(p)) for p in paragraphs[:16]]
    peak = max(counts) if counts else 0
    return [round(c / peak * 100) if peak else 0 for c in counts]


def _rubric_stats(rubric: dict) -> list:
    r = rubric or {}
    return [
        ["Sources cited", str(r.get("distinct_sources_cited", 0))],
        ["Grounded", f"{r.get('grounded_sentences', 0)}/{r.get('sentences', 0)}"],
        ["Hallucinated", str(r.get("hallucinated_citations", 0))],
        ["Score", f"{r.get('computed_score', 0)}/10"],
    ]


def _advocate_panel(state: dict, side: str, accent_variant: str) -> dict:
    opening = _turn(state, side, "opening")
    rebuttal = _turn(state, side, "rebuttal")
    latest = rebuttal or opening
    error = (latest or {}).get("error")

    if not opening:
        label, sub = "Idle", "Awaiting evidence"
        progress = 0
    elif error:
        label, sub = "Degraded", f"Turn failed: {error[:60]}"
        progress = 100
    elif rebuttal:
        label, sub = "Complete", "Opening + rebuttal delivered"
        progress = 100
    else:
        label, sub = "Opened", "Awaiting rebuttal round"
        progress = 60

    rubric = (latest or {}).get("rubric") or (opening or {}).get("rubric")
    full_text = "\n\n".join(t for t in
                            [(opening or {}).get("argument", ""), (rebuttal or {}).get("argument", "")] if t)
    return {
        "progress": progress,
        "phase": {"label": label, "sub": sub},
        "openingText": _plain((opening or {}).get("argument", "")),
        "rebuttalText": _plain((rebuttal or {}).get("argument", "")),
        "rubric": (opening or {}).get("rubric"),
        "rebuttalRubric": (rebuttal or {}).get("rubric"),
        "stats": _rubric_stats(rubric) if rubric else [],
        "signal": {
            "eyebrow": "Citations per paragraph", "variant": accent_variant,
            "promptText": f"{side} argument structure",
            "levels": _citation_levels(full_text),
        } if full_text else None,
        "error": error,
    }


def _clash(state: dict) -> dict:
    """Real tug-of-war from accumulated rubric computed_scores."""
    totals = {"FOR": 0.0, "AGAINST": 0.0}
    seen = {"FOR": False, "AGAINST": False}
    for entry in state.get("debate_history") or []:
        side = entry.get("side")
        if side in totals:
            totals[side] += ((entry.get("rubric") or {}).get("computed_score") or 0)
            if entry.get("phase") == "opening":
                seen[side] = True
    verdict = state.get("judge_verdict") or {}
    for_score = verdict.get("for_score")
    against_score = verdict.get("against_score")
    if for_score is not None and against_score is not None and verdict.get("winner") != "UNSCORED":
        total = for_score + against_score
        share = round(for_score / total * 100) if total else 50
    else:
        total = totals["FOR"] + totals["AGAINST"]
        share = round(totals["FOR"] / total * 100) if total else 50
    return {
        "forShare": share,
        "forScore": for_score,
        "againstScore": against_score,
        "live": seen["FOR"] and seen["AGAINST"],
    }


def _checklist(state: dict) -> list:
    turns = {(e.get("side"), e.get("phase")) for e in (state.get("debate_history") or [])
             if not e.get("error")}
    verdict = state.get("judge_verdict") or {}
    rubrics_done = ("FOR", "opening") in turns and ("AGAINST", "opening") in turns
    verdict_done = bool(verdict) and not verdict.get("parse_failed")
    status = {
        "FOR opening delivered": ("FOR", "opening") in turns,
        "AGAINST opening delivered": ("AGAINST", "opening") in turns,
        "FOR rebuttal delivered": ("FOR", "rebuttal") in turns,
        "AGAINST rebuttal delivered": ("AGAINST", "rebuttal") in turns,
        "Rubrics computed": rubrics_done,
        "Verdict rendered": verdict_done,
    }
    return [{"label": l, "status": "done" if status[l] else "pending"} for l in _CHECKLIST_LABELS]


def _judge_panel(state: dict) -> dict:
    verdict = state.get("judge_verdict") or {}
    checklist = _checklist(state)
    if not verdict:
        return {"progress": 0, "phase": {"label": "Idle", "sub": "Awaiting arguments"},
                "checklist": checklist, "stats": []}
    if verdict.get("parse_failed") or verdict.get("winner") == "UNSCORED":
        return {
            "progress": 100,
            "phase": {"label": "Degraded", "sub": "Judge could not score — rubric only"},
            "checklist": checklist,
            "stats": [["Winner", "UNSCORED"],
                      ["FOR (rubric)", f"{verdict.get('for_score', 0)}/10"],
                      ["AGAINST (rubric)", f"{verdict.get('against_score', 0)}/10"]],
        }
    return {
        "progress": 100,
        "phase": {"label": "Verdict in", "sub": verdict.get("scoring", "")},
        "checklist": checklist,
        "stats": [["Winner", verdict.get("winner", "—")],
                  ["FOR", f"{verdict.get('for_score', 0)}/10"],
                  ["AGAINST", f"{verdict.get('against_score', 0)}/10"],
                  ["Best rebuttal", verdict.get("best_rebuttal", "—")]],
    }


def _freshness(published_date) -> str:
    """green <6mo · amber 6-18mo · red older · unknown when undated."""
    dt = _parse_date(published_date)
    if not dt:
        return "unknown"
    months = (datetime.now(timezone.utc) - dt).days / 30.4
    return "fresh" if months < 6 else ("aging" if months < 18 else "stale")


def _enriched_sources(state: dict) -> list:
    """Per-source metadata for the report: trust (domain-tier mapped),
    freshness (real dates), and how often each side actually cited it."""
    docs = state.get("retrieved_docs") or []
    all_turn_text = " ".join(e.get("argument") or "" for e in state.get("debate_history") or [])
    cited_counts = {}
    for n in _CITE_RE.findall(all_turn_text):
        n = int(n.strip("[]"))
        cited_counts[n] = cited_counts.get(n, 0) + 1
    out = []
    for i, d in enumerate(docs, 1):
        url = d.get("url") or ""
        tier = _domain_tier(urlparse(url).netloc) if url else "med"
        out.append({
            "id": i,
            "title": (d.get("title") or "Untitled")[:100],
            "url": url,
            "domain": urlparse(url).netloc.replace("www.", "") if url else "",
            "trust_score": _TIER_SCORE[tier],
            "trust_tier": tier,
            "published_date": d.get("published_date") or "",
            "freshness": _freshness(d.get("published_date")),
            "cited_count": cited_counts.get(i, 0),
            "content_kind": "full article" if d.get("content_source") == "scraped" else "snippet",
        })
    return out


def _density_label(words: int, grounded: int) -> str:
    """Words per grounded claim — flags rhetoric padding vs dense argument."""
    if not grounded:
        return "ungrounded"
    wpc = words / grounded
    return "dense" if wpc < 45 else ("moderate" if wpc < 90 else "padded")


def _debate_analytics(state: dict) -> dict:
    """
    Per-side analytics. COMPUTED metrics come from the citation rubric and
    source data; the two judge-assessed rows are labelled as such and are
    absent when the verdict is unscored.
    """
    verdict = state.get("judge_verdict") or {}
    unscored = verdict.get("parse_failed") or verdict.get("winner") == "UNSCORED"
    sources = _enriched_sources(state)

    def side_stats(side):
        turns = [e for e in state.get("debate_history") or []
                 if e.get("side") == side and not e.get("error")]
        rubrics = [e.get("rubric") or {} for e in turns]
        text = " ".join(e.get("argument") or "" for e in turns)
        words = len(text.split())
        grounded = sum(r.get("grounded_sentences", 0) for r in rubrics)
        cited = set()
        for n in _CITE_RE.findall(text):
            cited.add(int(n.strip("[]")))
        trusts = [s["trust_score"] for s in sources if s["id"] in cited]
        scores = [r.get("computed_score", 0) for r in rubrics if r]
        return {
            "evidence_quality": round(sum(scores) / len(scores) * 10) if scores else 0,
            "source_diversity": len([n for n in cited if 1 <= n <= len(sources)]),
            "source_trust_avg": round(sum(trusts) / len(trusts)) if trusts else 0,
            "argument_density": _density_label(words, grounded),
            "hallucinated_citations": sum(r.get("hallucinated_citations", 0) for r in rubrics),
        }

    analytics = {
        "computed": {"FOR": side_stats("FOR"), "AGAINST": side_stats("AGAINST")},
        "judge_assessed": None,
    }
    if not unscored:
        analytics["judge_assessed"] = {
            "argument_quality": {"FOR": verdict.get("for_quality"), "AGAINST": verdict.get("against_quality")},
            "best_rebuttal": verdict.get("best_rebuttal"),
            "note": "assessed by the judge model, not computed",
        }
    return analytics


def _split_points(text: str) -> list:
    """Server-side split of an argument into display points — the frontend
    never regex-parses answer blobs again."""
    text = _plain(text or "")
    lines = [l.strip(" \t•-–") for l in re.split(r"\n+", text)]
    bullets = [l for l in lines if len(l) > 25]
    if len(bullets) >= 2:
        # strip leading numbering like "1." / "2)"
        return [re.sub(r"^\d{1,2}[.)]\s*", "", b) for b in bullets[:8]]
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 30]
    return sentences[:8]


# ── main patch builder ───────────────────────────────────────────────────────

def build_debate_patch(state: dict, stage: str, elapsed: float) -> dict:
    patch = {"elapsedSeconds": round(elapsed, 1)}
    if stage != "Final":
        patch["progress"] = DEBATE_PROGRESS.get(stage, 0)

    docs = state.get("retrieved_docs") or []

    if stage in ("Search", "Final"):
        scraped = sum(1 for d in docs if d.get("content_source") == "scraped")
        patch.setdefault("panels", {})["Evidence"] = {
            "progress": 100 if docs else 0,
            "phase": {"label": "Complete" if docs else "Idle",
                      "sub": f"{len(docs)} sources gathered" if docs else "No sources yet"},
            "stats": [["Total", str(len(docs))], ["Full articles", str(scraped)],
                      ["Snippets", str(max(0, len(docs) - scraped))]],
            "recentSources": _recent_sources(docs),
            "signal": {"eyebrow": "Content depth per source", "variant": "contradiction",
                       "promptText": f"Shared evidence pool — {len(docs)} sources",
                       "levels": _content_depth_levels(docs)},
        }
        patch.setdefault("metrics", {})["sources"] = len(docs)
        if stage == "Search":
            patch["logs"] = _log(state, "Evidence",
                                 f"Evidence gathered: {len(docs)} sources ({scraped} full articles)", elapsed)

    if stage.startswith(("FOR", "AGAINST")) or stage == "Final":
        for side, variant in (("FOR", "blue"), ("AGAINST", "contradiction")):
            if stage == "Final" or stage.startswith(side):
                patch.setdefault("panels", {})[side] = _advocate_panel(state, side, variant)
        patch["clash"] = _clash(state)
        patch.setdefault("panels", {}).setdefault("Judge", {})["checklist"] = _checklist(state)
        if stage != "Final":
            side, phase = stage.split("-")
            entry = _turn(state, side, phase)
            r = entry.get("rubric") or {}
            if entry.get("error"):
                msg = f"{side} {phase} FAILED: {entry['error'][:80]}"
            else:
                msg = (f"{side} {phase} delivered — cited {r.get('distinct_sources_cited', 0)} sources, "
                       f"{r.get('grounded_sentences', 0)}/{r.get('sentences', 0)} claims grounded "
                       f"({r.get('computed_score', 0)}/10)")
            patch["logs"] = _log(state, side, msg, elapsed)

    if stage in ("Judge", "Final"):
        verdict = state.get("judge_verdict") or {}
        patch.setdefault("panels", {})["Judge"] = _judge_panel(state)
        patch["clash"] = _clash(state)
        unscored = verdict.get("parse_failed") or verdict.get("winner") == "UNSCORED"
        patch.setdefault("metrics", {}).update({
            "forScore": "—" if unscored else f"{verdict.get('for_score', 0)}/10",
            "againstScore": "—" if unscored else f"{verdict.get('against_score', 0)}/10",
            "winner": verdict.get("winner", "—") if verdict else "—",
        })
        if stage == "Judge":
            if unscored:
                patch["logs"] = _log(state, "Judge",
                                     "Judge could not score — verdict UNSCORED (rubric metrics only)", elapsed)
            else:
                patch["logs"] = _log(state, "Judge",
                                     f"Verdict: {verdict.get('winner', '—')} "
                                     f"(FOR {verdict.get('for_score', 0)} / AGAINST {verdict.get('against_score', 0)})",
                                     elapsed)

    if stage == "Final":
        patch["progress"] = 100
        verdict = state.get("judge_verdict") or {}
        for_opening = _turn(state, "FOR", "opening").get("argument", "")
        against_opening = _turn(state, "AGAINST", "opening").get("argument", "")
        patch["verdict"] = verdict
        patch["debate"] = {
            "for_opening": _plain(for_opening),
            "for_rebuttal": _plain(_turn(state, "FOR", "rebuttal").get("argument", "")),
            "against_opening": _plain(against_opening),
            "against_rebuttal": _plain(_turn(state, "AGAINST", "rebuttal").get("argument", "")),
            "for_points": _split_points(for_opening),
            "against_points": _split_points(against_opening),
            # Steelman check: each side's fair restatement of its opponent
            "steelman": {
                "for_restates_against": _turn(state, "FOR", "opening").get("steelman"),
                "against_restates_for": _turn(state, "AGAINST", "opening").get("steelman"),
            },
            "analytics": _debate_analytics(state),
            "sources": _enriched_sources(state),
        }
        patch["citations"] = [{"title": d.get("title", "Untitled"), "url": d.get("url", "")}
                              for d in docs]
        patch["final_answer"] = state.get("final_answer", "")
        unscored = verdict.get("parse_failed") or verdict.get("winner") == "UNSCORED"
        patch["floatingTags"] = [
            {"agent": "Search", "label": "Sources", "value": str(len(docs)),
             "delay": "0s", "top": "10%", "left": "30%"},
            {"agent": "Critic", "label": "FOR",
             "value": "—" if unscored else f"{verdict.get('for_score', 0)}/10",
             "delay": "0.5s", "top": "45%", "left": "15%"},
            {"agent": "Critic", "label": "AGAINST",
             "value": "—" if unscored else f"{verdict.get('against_score', 0)}/10",
             "delay": "0.8s", "top": "45%", "right": "15%"},
            {"agent": "Writer", "label": "Winner", "value": verdict.get("winner", "—"),
             "delay": "1.1s", "bottom": "12%", "left": "42%"},
        ]
        patch["logs"] = _log(state, "Judge", "Debate complete — verdict and rubrics ready", elapsed)

    return patch
