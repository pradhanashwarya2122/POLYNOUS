"""
app/utils/computed_confidence.py

Source-derived confidence metric for POLYNOUS.

This is INDEPENDENT of the Critic LLM's self-assessed confidence — it is
computed mechanically from the retrieved documents and the final answer, so
it works even when the LLM call fails, and it can't be inflated by a
sycophantic model.

Called from orchestrator.writer_node:

    state['computed_confidence'] = compute_confidence(
        state['retrieved_docs'], answer=answer
    )

Consumed by app/visual/builder.py (_confidence_breakdown, _faithfulness),
which expects this exact shape:

    {
        "score": 74,                        # 0–100 overall
        "breakdown": {                      # each factor 0.0–1.0
            "source_agreement": 0.66,
            "domain_diversity": 0.80,
            "recency":          0.55,
            "claim_grounding":  0.90,
        },
        "explanation": "…human-readable one-liner…",
        "details": { … per-factor evidence for debugging … },
    }

No external dependencies — stdlib only.
"""
import logging
import math
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger("polynous.computed_confidence")

# ============================================================
# CONFIG — factor weights (must sum to 1.0)
# ============================================================

WEIGHTS = {
    "source_agreement": 0.30,   # do sources overlap in vocabulary/claims?
    "domain_diversity": 0.20,   # are sources from independent domains?
    "recency":          0.20,   # how fresh are the sources?
    "claim_grounding":  0.30,   # is the answer's text cited/grounded?
}

# Domain trust tiers (mirrors app/visual/builder.py so the two never disagree)
HIGH_TRUST_HINTS = (
    ".edu", ".gov", ".ac.", "nature.com", "science.org", "arxiv.org", "ieee.org",
    "nih.gov", "nasa.gov", "who.int", "acm.org", "springer.com", "sciencedirect.com",
    "britannica.com", "reuters.com", "apnews.com", "cell.com", "pnas.org",
)
LOW_TRUST_HINTS = (
    "quora.com", "reddit.com", "youtube.com", "medium.com", "pinterest.",
    "facebook.com", "twitter.com", "x.com", "tiktok.com", "fandom.com", "blogspot.",
)

# Recency: full credit inside this window, decaying credit after it
RECENCY_FULL_CREDIT_DAYS = 365          # ≤1 year old → 1.0
RECENCY_HALF_LIFE_DAYS = 365 * 3        # score halves every 3 further years

# Words ignored when measuring cross-source term overlap
_STOPWORDS = frozenset(
    "the a an and or of to in is are was were be been for with on at by from "
    "that this these those it its as not but if then than so what which who "
    "how why when where can could would should may might will shall do does "
    "did have has had he she they we you i his her their our your my more "
    "most other some such no nor only own same too very just also into over "
    "under between about after before during each few both all any because "
    "while there here out up down off again further once s t don now".split()
)


# ============================================================
# PUBLIC API
# ============================================================


def compute_confidence(docs: list, answer: Optional[str] = None) -> dict:
    """
    Compute a mechanical confidence score from retrieved documents and the
    final answer. Never raises — on any internal failure it degrades to a
    neutral 50% with an explanation, so writer_node's try/except stays quiet.

    Args:
        docs:   list of retrieved document dicts. Recognised keys (all
                optional): url, title, content, published_date / date /
                published_at, score.
        answer: the writer's final answer text (used for claim grounding).

    Returns:
        dict — see module docstring for the exact shape.
    """
    try:
        return _compute(docs or [], answer or "")
    except Exception as e:  # defensive: this must never break the pipeline
        logger.exception("compute_confidence failed")
        return {
            "score": 50,
            "breakdown": {k: 0.5 for k in WEIGHTS},
            "explanation": f"Confidence computation degraded: {e}",
            "details": {"error": str(e)},
        }


# ============================================================
# CORE
# ============================================================


def _compute(docs: list, answer: str) -> dict:
    if not docs:
        return {
            "score": 30,
            "breakdown": {
                "source_agreement": 0.3,
                "domain_diversity": 0.0,
                "recency": 0.5,
                "claim_grounding": _claim_grounding(answer, n_docs=0)[0],
            },
            "explanation": "No sources retrieved — low mechanical confidence.",
            "details": {"n_docs": 0},
        }

    agreement, agreement_ev = _source_agreement(docs)
    diversity, diversity_ev = _domain_diversity(docs)
    recency, recency_ev = _recency(docs)
    grounding, grounding_ev = _claim_grounding(answer, n_docs=len(docs))

    breakdown = {
        "source_agreement": round(agreement, 3),
        "domain_diversity": round(diversity, 3),
        "recency": round(recency, 3),
        "claim_grounding": round(grounding, 3),
    }
    score = round(sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS) * 100)
    score = max(0, min(100, score))

    return {
        "score": score,
        "breakdown": breakdown,
        "explanation": (
            f"{score}% from {len(docs)} sources: "
            f"agreement {round(agreement*100)}%, "
            f"diversity {round(diversity*100)}%, "
            f"recency {round(recency*100)}%, "
            f"grounding {round(grounding*100)}%."
        ),
        "details": {
            "n_docs": len(docs),
            "source_agreement": agreement_ev,
            "domain_diversity": diversity_ev,
            "recency": recency_ev,
            "claim_grounding": grounding_ev,
        },
    }


# ============================================================
# FACTOR 1 — SOURCE AGREEMENT (0.30)
# Pairwise Jaccard overlap of content term-sets. Sources that discuss the
# same specific terms are treated as corroborating each other.
# ============================================================


def _terms(text: str) -> set:
    words = re.findall(r"[a-z][a-z\-']{3,}", (text or "").lower())
    return {w for w in words if w not in _STOPWORDS}


def _source_agreement(docs: list) -> tuple:
    term_sets = [_terms((d.get("content") or "") + " " + (d.get("title") or "")) for d in docs]
    term_sets = [t for t in term_sets if len(t) >= 5]
    if len(term_sets) < 2:
        return 0.5, {"note": "fewer than 2 substantive sources — neutral", "pairs": 0}

    sims = []
    for i in range(len(term_sets)):
        for j in range(i + 1, len(term_sets)):
            inter = len(term_sets[i] & term_sets[j])
            union = len(term_sets[i] | term_sets[j])
            if union:
                sims.append(inter / union)
    if not sims:
        return 0.5, {"note": "no comparable pairs", "pairs": 0}

    mean_sim = sum(sims) / len(sims)
    # Raw Jaccard between full documents is naturally small (~0.05–0.35);
    # rescale so 0.05→~0.25 and 0.30→~1.0, keeping it monotone and bounded.
    scaled = max(0.0, min(1.0, mean_sim / 0.30))
    # keep a floor: even disjoint sources aren't evidence of contradiction
    scaled = max(scaled, 0.15)
    return scaled, {"pairs": len(sims), "mean_jaccard": round(mean_sim, 4)}


# ============================================================
# FACTOR 2 — DOMAIN DIVERSITY (0.20)
# Shannon entropy of the domain distribution, quality-weighted:
# 5 docs from 5 domains > 5 docs from quora.com.
# ============================================================


def _domain_tier_weight(netloc: str) -> float:
    n = netloc.lower()
    if any(h in n for h in HIGH_TRUST_HINTS):
        return 1.0
    if any(h in n for h in LOW_TRUST_HINTS):
        return 0.4
    return 0.7


def _domain_diversity(docs: list) -> tuple:
    domains = Counter()
    for d in docs:
        url = d.get("url") or ""
        if not isinstance(url, str) or not url:
            continue  # malformed scrape fields (ints, None) — skip, don't degrade
        netloc = urlparse(url).netloc
        if netloc:
            domains[netloc] += 1
    if not domains:
        return 0.3, {"note": "no URLs on documents", "domains": {}}

    total = sum(domains.values())
    # normalized Shannon entropy: 1.0 = perfectly spread across domains
    if len(domains) == 1:
        entropy_norm = 0.0
    else:
        entropy = -sum((c / total) * math.log2(c / total) for c in domains.values())
        entropy_norm = entropy / math.log2(len(domains))

    # quality multiplier: average trust weight across domains
    quality = sum(_domain_tier_weight(n) for n in domains) / len(domains)

    # blend: spread matters most, quality adjusts it
    score = max(0.0, min(1.0, 0.7 * entropy_norm + 0.3 * quality))
    # single-domain research still gets partial credit if it's a trusted one
    if len(domains) == 1:
        score = max(score, 0.25 * quality * 2)
    return score, {"domains": dict(domains), "entropy_norm": round(entropy_norm, 3),
                   "avg_quality": round(quality, 3)}


# ============================================================
# FACTOR 3 — RECENCY (0.20)
# Parses published dates in common formats; exponential half-life decay.
# Undated documents contribute a neutral 0.5 so scrapers that drop dates
# don't tank the score.
# ============================================================

_DATE_KEYS = ("published_date", "published_at", "date", "publishedDate")
_DATE_FORMATS = ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d", "%d-%m-%Y",
                 "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y")


def _parse_date(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).strip()
    # ISO with timezone / fractional seconds
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s[:len(datetime.now().strftime(fmt))], fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    # bare year anywhere in the string ("© 2024", "(2023)")
    m = re.search(r"\b(19|20)\d{2}\b", s)
    if m:
        try:
            return datetime(int(m.group(0)), 6, 30, tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _doc_recency_score(doc: dict, now: datetime) -> Optional[float]:
    for key in _DATE_KEYS:
        dt = _parse_date(doc.get(key))
        if dt:
            age_days = max(0.0, (now - dt).total_seconds() / 86400.0)
            if age_days <= RECENCY_FULL_CREDIT_DAYS:
                return 1.0
            extra = age_days - RECENCY_FULL_CREDIT_DAYS
            return 0.5 ** (extra / RECENCY_HALF_LIFE_DAYS)
    return None  # undated


def _recency(docs: list) -> tuple:
    now = datetime.now(timezone.utc)
    scores, undated = [], 0
    for d in docs:
        s = _doc_recency_score(d, now)
        if s is None:
            undated += 1
            scores.append(0.5)  # neutral for undated
        else:
            scores.append(s)
    avg = sum(scores) / len(scores) if scores else 0.5
    return avg, {"dated": len(docs) - undated, "undated": undated,
                 "avg": round(avg, 3)}


# ============================================================
# FACTOR 4 — CLAIM GROUNDING (0.30)
# Share of substantive answer sentences carrying a [n] citation marker.
# Mirrors the faithfulness logic in builder.py so the two panels agree.
# ============================================================


def _claim_grounding(answer: str, n_docs: int) -> tuple:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", answer or "")
                 if len(s.strip()) > 20]
    if not sentences:
        return (0.5 if n_docs else 0.2), {"note": "no substantive answer text",
                                          "sentences": 0}
    cited = sum(1 for s in sentences if re.search(r"\[\d+\]", s))
    if cited == 0:
        # Writer style may not use [n] markers at all — don't punish it to 0;
        # give partial credit scaled by whether sources existed to cite.
        base = 0.55 if n_docs > 0 else 0.2
        return base, {"sentences": len(sentences), "cited": 0,
                      "note": "no [n] citation markers in answer — partial credit"}
    ratio = cited / len(sentences)
    # citing ~70%+ of sentences is excellent; scale so 0.7 → 1.0
    score = max(0.0, min(1.0, ratio / 0.70))
    return score, {"sentences": len(sentences), "cited": cited,
                   "ratio": round(ratio, 3)}