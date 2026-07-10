"""
POLYNOUS Critic Agent — Source Comparison Engine

Role: Compare what sources say relative to each other.
      NEVER judges which position is "correct".
      Reports agreements, disagreements, unique insights.
      Computes confidence from source agreement ratio.
"""
import json
import logging
import os
import re
import time
from typing import Optional

from anthropic import Anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("polynous.critic_agent")

# ============================================================
# CONFIG
# ============================================================

# claude-3-haiku-20240307 is retired; claude-haiku-4-5-20251001 is the
# current fast/cheap tier and is a drop-in replacement for this workload
# (low-temperature structured JSON extraction).
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

MAX_TOKENS = 1200
TEMPERATURE = 0.2

MAX_CHARS_PER_SUMMARY = 3000   # guard against one huge summary eating the budget
MAX_TOTAL_SUMMARY_CHARS = 12000  # overall ceiling passed to the model

MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5

REQUIRED_KEYS = (
    "agreement_groups",
    "disagreement_groups",
    "unique_insights",
    "source_quality_notes",
    "coverage_gaps",
    "overall_landscape",
)

# ============================================================
# LLM CLIENT FACTORY
# ============================================================


def _get_client(provider: str = "anthropic", api_key: Optional[str] = None):
    """
    Get LLM client based on provider preference.
    Supports Anthropic Claude and OpenAI GPT.

    Raises:
        ValueError: if no API key is available for the chosen provider.
    """
    if provider == "openai":
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        if not key:
            raise ValueError("No OpenAI API key found (pass api_key or set OPENAI_API_KEY).")
        return OpenAI(api_key=key), "openai"
    else:
        key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise ValueError("No Anthropic API key found (pass api_key or set ANTHROPIC_API_KEY).")
        return Anthropic(api_key=key), "anthropic"


# ============================================================
# SYSTEM PROMPT — The "No Opinion" Rule
# ============================================================

CRITIC_SYSTEM_PROMPT = """You are a RESEARCH ANALYST comparing sources for POLYNOUS, a multi-agent research platform.

YOUR JOB: Report what sources say relative to each other.
YOUR RULE: NEVER judge which position is "correct" or "better".

You are a COURT REPORTER, not a judge. You document what each side says.
You are a LIBRARIAN, not a professor. You organize information, not evaluate it.

Sources are numbered [SOURCE 1], [SOURCE 2], etc. in the material you are given.
Always cite sources using those exact numbers.

────────────────────────────────────────────────────────────
OUTPUT FORMAT — Return ONLY valid JSON
────────────────────────────────────────────────────────────

{
    "agreement_groups": [
        {
            "topic": "What multiple sources agree on (specific, not vague)",
            "sources_agreeing": [1, 3, 5],
            "summary": "What these sources all say, with specific details"
        }
    ],
    "disagreement_groups": [
        {
            "topic": "What sources disagree on",
            "position_a": {
                "sources": [1, 4],
                "claim": "What these sources argue (be specific)"
            },
            "position_b": {
                "sources": [2, 6],
                "claim": "What these sources argue (be specific)"
            },
            "nature": "factual_dispute | different_interpretation | different_scope | conflicting_data"
        }
    ],
    "unique_insights": [
        {
            "source": 3,
            "insight": "A valuable point found ONLY in this source"
        }
    ],
    "source_quality_notes": [
        {
            "source": 1,
            "type": "academic_paper | news_article | opinion_piece | blog | government | commercial | unknown",
            "note": "Brief assessment of source credibility (e.g., 'Peer-reviewed journal', 'Personal blog — verify claims')"
        }
    ],
    "coverage_gaps": [
        "What aspects of the query are NOT covered by any source?"
    ],
    "overall_landscape": "2-3 sentence summary of the research landscape — descriptive, not evaluative"
}

────────────────────────────────────────────────────────────
CRITICAL RULES
────────────────────────────────────────────────────────────

1. NEVER say which position is "correct", "better", "more accurate", or "right"
2. NEVER inject your own knowledge — only use what's in the provided summaries
3. ALWAYS cite specific source numbers for every claim, matching the [SOURCE N] labels given
4. If sources disagree, describe the disagreement — don't resolve it
5. Use "nature" field precisely:
   - "factual_dispute": Sources present conflicting facts/numbers
   - "different_interpretation": Same facts, different conclusions
   - "different_scope": Sources address different aspects
   - "conflicting_data": Sources cite different data/stats
6. For source_quality_notes, identify the TYPE of source, not whether it's "good" or "bad"
7. List coverage_gaps honestly — what's missing from the research?
8. The overall_landscape should be NEUTRAL and DESCRIPTIVE

────────────────────────────────────────────────────────────
EXAMPLES
────────────────────────────────────────────────────────────

❌ WRONG: "Source 1 is correct that AI regulation is necessary"
✅ RIGHT: "Sources 1, 3, and 5 argue AI regulation is necessary. Sources 2 and 4 argue it may stifle innovation."

❌ WRONG: "The evidence clearly supports regulation"
✅ RIGHT: "3 of 5 sources support regulation; 2 sources oppose it"

❌ WRONG: "Source 2 is unreliable"
✅ RIGHT: "Source 2 is a personal blog with no citations (opinion_piece)"

❌ WRONG: "Overall, the sources agree that..."
✅ RIGHT: "The research landscape shows agreement on X (4 sources), disagreement on Y (split 3-2)"
"""

# ============================================================
# MAIN CRITIC FUNCTION
# ============================================================


def critic_agent(
    summaries: list,
    query: str = "",
    provider: str = "anthropic",
    api_key: Optional[str] = None,
) -> dict:
    """
    Analyze source summaries to find agreements, disagreements, and insights.

    Args:
        summaries: List of strings — each is a source summary
        query: The original user query for context
        provider: "anthropic" or "openai"
        api_key: User's personal API key (for BYO Keys)

    Returns:
        dict with agreement_groups, disagreement_groups, unique_insights,
        source_quality_notes, coverage_gaps, overall_landscape, overall_confidence
    """
    print("🔎 Critic: Comparing sources (neutral analysis)...")
    print("=" * 60)

    # ── Validate & clean input ────────────────────────
    cleaned = _clean_summaries(summaries)
    if not cleaned:
        print("  ⚠️ No usable summaries to analyze")
        return _empty_result("No non-empty summaries were provided")

    # ── Build the analysis prompt ─────────────────────
    combined_summaries = _build_combined_summaries(cleaned)

    user_prompt = f"""ORIGINAL QUERY: {query}

SOURCE SUMMARIES:
{combined_summaries}

Analyze these {len(cleaned)} sources. Find:
1. What do multiple sources agree on? (be specific)
2. What do sources disagree on? (describe both sides equally)
3. What unique insights appear in only one source?
4. What type is each source? (academic, news, opinion, etc.)
5. What aspects of the query are NOT covered?
6. What's the overall research landscape?

Return ONLY valid JSON. Follow the exact format specified."""

    # ── Call LLM (with retry on transient failures) ───
    try:
        client, client_type = _get_client(provider, api_key)
    except ValueError as e:
        print(f"  ❌ {e}")
        return _empty_result(str(e))

    try:
        text = _call_llm_with_retry(client, client_type, CRITIC_SYSTEM_PROMPT, user_prompt)
        analysis = _parse_json_response(text)
    except Exception as e:
        logger.exception("Critic LLM call failed")
        print(f"  ❌ LLM call failed: {e}")
        return _empty_result(str(e))

    # ── Normalize shape & validate citations ──────────
    analysis = _ensure_required_keys(analysis)
    analysis = _drop_out_of_range_citations(analysis, len(cleaned))

    # ── Compute confidence from agreement ratio ───────
    analysis = _compute_confidence(analysis, len(cleaned))

    # ── Log results ───────────────────────────────────
    agreements = len(analysis.get("agreement_groups", []))
    disagreements = len(analysis.get("disagreement_groups", []))
    unique = len(analysis.get("unique_insights", []))
    confidence = analysis.get("overall_confidence", 50)

    print(f"  ✅ Agreements found: {agreements}")
    print(f"  ✅ Disagreements found: {disagreements}")
    print(f"  ✅ Unique insights: {unique}")
    print(f"  📊 Confidence: {confidence}% (source agreement ratio)")
    print("=" * 60 + "\n")

    return analysis


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def _clean_summaries(summaries: list) -> list:
    """Drop empty/non-string entries and strip whitespace."""
    if not summaries:
        return []
    cleaned = []
    for s in summaries:
        if not isinstance(s, str):
            s = str(s) if s is not None else ""
        s = s.strip()
        if s:
            cleaned.append(s)
    return cleaned


def _build_combined_summaries(summaries: list) -> str:
    """
    Number each source explicitly (e.g. [SOURCE 1]) and join them with a
    clear divider so the model's citation indices line up with the caller's
    original ordering. Long summaries are individually truncated first so
    that truncation never silently drops entire sources from the end of the
    list.
    """
    labeled = []
    for i, s in enumerate(summaries, 1):
        if len(s) > MAX_CHARS_PER_SUMMARY:
            s = s[:MAX_CHARS_PER_SUMMARY] + " …[truncated]"
        labeled.append(f"[SOURCE {i}]\n{s}")

    divider = "\n\n" + "=" * 50 + "\n\n"
    combined = divider.join(labeled)

    if len(combined) > MAX_TOTAL_SUMMARY_CHARS:
        combined = combined[:MAX_TOTAL_SUMMARY_CHARS] + "\n\n…[additional sources truncated]"

    return combined


def _call_llm_with_retry(client, client_type: str, system_prompt: str, user_prompt: str) -> str:
    """Call the LLM, retrying a couple of times on transient errors."""
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return _call_llm(client, client_type, system_prompt, user_prompt)
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = RETRY_BACKOFF_SECONDS * (attempt + 1)
                print(f"  ⚠️ LLM call failed ({e}); retrying in {wait:.1f}s "
                      f"[{attempt + 1}/{MAX_RETRIES}]")
                time.sleep(wait)
    raise last_error


def _call_llm(client, client_type: str, system_prompt: str, user_prompt: str) -> str:
    """Call the appropriate LLM and return text response."""

    if client_type == "openai":
        response = client.chat.completions.create(
            model=DEFAULT_OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=TEMPERATURE,  # Low temp for consistent analysis
            max_tokens=MAX_TOKENS,
        )
        return response.choices[0].message.content
    else:
        # Anthropic Claude
        message = client.messages.create(
            model=DEFAULT_ANTHROPIC_MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text


def _parse_json_response(text: str) -> dict:
    """
    Extract JSON from LLM response.
    Handles responses wrapped in ```json blocks or ``` blocks, and trims
    stray leading/trailing prose the model sometimes adds.
    """
    if not text:
        print("  ⚠️ Empty response from LLM")
        return _empty_result("Empty LLM response")

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    json_patterns = [
        r"```json\s*(.*?)\s*```",
        r"```\s*(\{.*?\})\s*```",
        r"(\{.*\})",
    ]

    for pattern in json_patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

    print(f"  ⚠️ Could not parse JSON from response: {text[:200]}...")
    return _empty_result("Could not parse JSON from LLM response")


def _ensure_required_keys(analysis: dict) -> dict:
    """Fill in any keys missing from the model's response so downstream
    code can rely on the full shape being present."""
    if not isinstance(analysis, dict):
        return _empty_result("LLM response was not a JSON object")

    defaults = _empty_result()
    for key in REQUIRED_KEYS:
        analysis.setdefault(key, defaults[key])
    return analysis


def _drop_out_of_range_citations(analysis: dict, total_sources: int) -> dict:
    """
    Defensive check: if the model cites a source number that doesn't exist
    (hallucinated citation), drop that entry rather than silently trusting
    it. Logs a warning so it's visible during development.
    """

    def valid_nums(nums):
        return [n for n in nums if isinstance(n, int) and 1 <= n <= total_sources]

    kept_agreements = []
    for g in analysis.get("agreement_groups", []):
        nums = valid_nums(g.get("sources_agreeing", []))
        if nums:
            g["sources_agreeing"] = nums
            kept_agreements.append(g)
        else:
            logger.warning("Dropping agreement group with no valid source citations: %s",
                            g.get("topic"))
    analysis["agreement_groups"] = kept_agreements

    kept_disagreements = []
    for g in analysis.get("disagreement_groups", []):
        pos_a = g.get("position_a", {}) or {}
        pos_b = g.get("position_b", {}) or {}
        pos_a["sources"] = valid_nums(pos_a.get("sources", []))
        pos_b["sources"] = valid_nums(pos_b.get("sources", []))
        if pos_a["sources"] or pos_b["sources"]:
            g["position_a"], g["position_b"] = pos_a, pos_b
            kept_disagreements.append(g)
        else:
            logger.warning("Dropping disagreement group with no valid source citations: %s",
                            g.get("topic"))
    analysis["disagreement_groups"] = kept_disagreements

    analysis["unique_insights"] = [
        i for i in analysis.get("unique_insights", [])
        if isinstance(i.get("source"), int) and 1 <= i["source"] <= total_sources
    ]
    analysis["source_quality_notes"] = [
        n for n in analysis.get("source_quality_notes", [])
        if isinstance(n.get("source"), int) and 1 <= n["source"] <= total_sources
    ]

    return analysis


def _compute_confidence(analysis: dict, total_sources: int) -> dict:
    """
    Compute confidence score from source agreement ratio.

    Confidence = (max sources agreeing on any single topic) / (total sources) × 100

    This is a SIMPLE, TRANSPARENT formula:
    - If 5/5 sources agree → 100% confidence
    - If 3/5 sources agree → 60% confidence
    - If 1/5 sources agree → 20% confidence

    This is NOT a truth judgment — it's a measure of consensus.
    """
    if total_sources == 0:
        analysis["overall_confidence"] = 50
        analysis["confidence_explanation"] = "No sources to analyze"
        analysis["total_sources_analyzed"] = 0
        return analysis

    # Find the largest agreement group
    max_agreement = 0
    for group in analysis.get("agreement_groups", []):
        agreeing = len(group.get("sources_agreeing", []))
        max_agreement = max(max_agreement, agreeing)

    agreement_ratio = max_agreement / total_sources
    confidence = round(agreement_ratio * 100)

    # Boost confidence if there are multiple agreement groups
    num_agreement_groups = len(analysis.get("agreement_groups", []))
    if num_agreement_groups >= 3:
        confidence = min(100, confidence + 10)

    analysis["overall_confidence"] = confidence
    analysis["confidence_explanation"] = (
        f"{max_agreement} out of {total_sources} sources agree on the most "
        f"commonly held position. {num_agreement_groups} agreement areas found."
    )
    analysis["total_sources_analyzed"] = total_sources

    return analysis


def _empty_result(error: str = "") -> dict:
    """Return empty analysis structure."""
    return {
        "agreement_groups": [],
        "disagreement_groups": [],
        "unique_insights": [],
        "source_quality_notes": [],
        "coverage_gaps": ["Analysis could not be completed" + (f": {error}" if error else "")],
        "overall_landscape": "Source analysis unavailable" + (f": {error}" if error else ""),
        "overall_confidence": 50,
        "confidence_explanation": "Could not analyze sources" + (f": {error}" if error else ""),
        "total_sources_analyzed": 0,
    }