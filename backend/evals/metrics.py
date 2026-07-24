"""
evals/metrics.py — metric computation shared by run_eval.py and calibration.py.

Every metric here is derived MECHANICALLY from pipeline (or baseline) text
output — no LLM judges, no fabricated numbers. The citation/grounding regexes
deliberately mirror app/utils/computed_confidence.py and app/visual/builder.py
so the eval harness measures the SAME thing the product surfaces to users.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

# [n] or [n, m, k] citation markers — same shape the writer emits and the
# frontend CitationText renders.
_CITATION_RE = re.compile(r"\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]")
# Sentence splitter + substantive-length filter, matching computed_confidence.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def _citation_numbers(text: str) -> list[int]:
    """Every source index referenced by a [n] / [n, m] marker in the text."""
    nums: list[int] = []
    for group in _CITATION_RE.findall(text or ""):
        for part in group.split(","):
            part = part.strip()
            if part.isdigit():
                nums.append(int(part))
    return nums


def word_count(text: str) -> int:
    return len((text or "").split())


def distinct_domains(docs: list) -> int:
    domains = set()
    for d in docs or []:
        url = d.get("url") if isinstance(d, dict) else None
        if isinstance(url, str) and url:
            netloc = urlparse(url).netloc
            if netloc:
                domains.add(netloc.lower().replace("www.", ""))
    return len(domains)


def grounded_sentence_ratio(text: str) -> tuple[float, int, int]:
    """(ratio, cited, total) — share of substantive sentences carrying [n]."""
    sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text or "")
                 if len(s.strip()) > 20]
    total = len(sentences)
    if total == 0:
        return 0.0, 0, 0
    cited = sum(1 for s in sentences if _CITATION_RE.search(s))
    return round(cited / total, 4), cited, total


def citation_metrics(text: str, num_sources: int) -> dict:
    """
    Citation density + hallucination count relative to the real source list.

    - valid citation: 1 <= n <= num_sources
    - hallucinated citation: n < 1 or n > num_sources (references a source
      that was never retrieved) — the core honesty check
    - density: VALID citations per 100 words
    """
    nums = _citation_numbers(text)
    words = word_count(text)
    valid = [n for n in nums if 1 <= n <= num_sources] if num_sources > 0 else []
    hallucinated = [n for n in nums if n < 1 or n > num_sources]
    density = round((len(valid) / words * 100), 3) if words else 0.0
    return {
        "total_citation_markers": len(nums),
        "valid_citations": len(valid),
        "hallucinated_citations": len(hallucinated),
        "citation_density_per_100w": density,
        "word_count": words,
    }


def answer_text_metrics(answer: str, docs: list) -> dict:
    """All text-derived metrics for a single answer against its source set."""
    num_sources = len(docs or [])
    ratio, cited, total = grounded_sentence_ratio(answer)
    cm = citation_metrics(answer, num_sources)
    return {
        "sources_retrieved": num_sources,
        "distinct_domains": distinct_domains(docs),
        "grounded_ratio": ratio,
        "grounded_sentences": cited,
        "total_sentences": total,
        **cm,
    }


# ── Aggregation helpers ─────────────────────────────────────────────

def mean(values: list) -> float | None:
    vals = [v for v in values if isinstance(v, (int, float))]
    return round(sum(vals) / len(vals), 3) if vals else None


CONFIDENCE_BUCKETS = (
    ("0-40", 0, 40),
    ("40-60", 40, 60),
    ("60-80", 60, 80),
    ("80-100", 80, 101),
)


def confidence_bucket(score) -> str | None:
    if not isinstance(score, (int, float)):
        return None
    for label, lo, hi in CONFIDENCE_BUCKETS:
        if lo <= score < hi:
            return label
    return None
