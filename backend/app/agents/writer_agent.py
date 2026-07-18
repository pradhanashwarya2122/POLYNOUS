"""
POLYNOUS Writer Agent — Neutral Research Organizer

Role: Organize source content into a research digest.
      NEVER answers the question — presents what sources say.
"""
import json
import logging
import os
import time
from typing import Optional

from anthropic import Anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("polynous.writer_agent")

# ============================================================
# CONFIG
# ============================================================

# claude-3-haiku-20240307 is retired; claude-haiku-4-5-20251001 is the
# current fast/cheap tier and is a drop-in replacement for this workload.
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

MAX_TOKENS = 3200                # 13-section premium report ≈ 1200-1800 words
TEMPERATURE = 0.4

MAX_CHARS_PER_SUMMARY = 2200     # guard against one huge summary eating the budget
MAX_TOTAL_SUMMARY_CHARS = 14000  # overall ceiling passed to the model (12 sources)

MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5

# ============================================================
# LLM CLIENT FACTORY
# ============================================================


def _get_client(provider: str = "anthropic", api_key: Optional[str] = None):
    """Get LLM client based on provider preference.

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
# SYSTEM PROMPT — The "Librarian" Mindset
# ============================================================

WRITER_SYSTEM_PROMPT = """You are a RESEARCH LIBRARIAN for POLYNOUS, a multi-agent research platform.

YOUR JOB: Organize source content into a clear, neutral research digest.
YOUR RULE: You PRESENT what sources say — you NEVER answer the question yourself.

You are a LIBRARIAN, not a professor. You organize information.
You are a COURT REPORTER, not a judge. You document what each side says.
You are a CURATOR, not a critic. You arrange content for clarity.

Sources are numbered [SOURCE 1], [SOURCE 2], etc. in the material you are
given, and the SOURCE INDEX maps each number to its title/URL/type. Always
cite sources using those exact numbers so they match the index.

────────────────────────────────────────────────────────────
OUTPUT FORMAT — 13-SECTION RESEARCH BRIEFING (use these EXACT headers)
────────────────────────────────────────────────────────────
Target length: 1200-1800 words. The report should read like a briefing
document from a research team, never like a chatbot answer.

📋 EXECUTIVE SUMMARY
3-4 sentences (80-120 words): restate the topic, state how many sources
were analysed, characterise the landscape numerically ("6 of 8 sources
agree on X, but split 3-3 on Y"), and give the key takeaway WITHOUT
taking sides. Never open with a generic statement.

📚 SOURCE INTELLIGENCE
One line per source, exactly in this shape:
[1] "Title (≤80 chars)" — domain.com (year if known) — FULL ARTICLE/SNIPPET/ACADEMIC/NEWS/OPINION

🔑 KEY FINDINGS
5-8 bullets, each 30-60 words. Every bullet is a SPECIFIC claim with
data/numbers where the sources provide them, ending in its citation [n].
Never write a generic bullet like "experts agree regulation is needed".

🤝 CONSENSUS MAP
2-4 agreement groups, each formatted:
TOPIC: [what they agree on]
SOURCES: [1, 3, 5] — N of M sources
FINDING: 2-3 sentences of specific detail on the shared claim.

⚡ DIVERGENCE MAP
2-4 disagreements, each with BOTH sides given equal space:
TOPIC: [what they disagree on]
POSITION A (Sources [X, Y]): what they argue, with specifics.
POSITION B (Sources [A, B]): what they argue, with specifics.
NATURE: factual_dispute / different_interpretation / different_scope / conflicting_data
If the critique found zero disagreements, state that explicitly as a finding.

💡 UNIQUE INSIGHTS
1-3 insights found in ONLY ONE source and not contradicted by others:
• Source [4] uniquely provides…

⚠️ SOURCE QUALITY ASSESSMENT
One line per source: its TYPE and a factual credibility note
(peer-reviewed / major publication / government document / personal
blog — verify independently). Never "good" or "bad".

🔍 COVERAGE AUDIT
2-4 gaps: aspects of the query no source addressed, missing
perspectives (geographic, economic, temporal), and data gaps.

⚠️ LIMITATIONS & CAVEATS
3-5 honest points: source biases, missing data, methodological limits,
temporal constraints ("snapshot as of [date]").

⚖️ CONTRADICTION RESOLUTION
For the 1-2 sharpest conflicts:
CLAIM A: Source [X] states…
CLAIM B: Source [Y] states…
ANALYSIS: why they disagree (factual? interpretive? scope?)
RESOLUTION: how to reconcile them or which context each applies to —
WITHOUT declaring a winner on contested values.
(Skip this section entirely if there are no disagreements.)

🔮 RESEARCH TRAJECTORY
3-5 specific, actionable follow-up questions derived from the coverage
gaps and disagreements — never generic ("learn more about X").

📖 SOURCE BIBLIOGRAPHY
Full citation per source:
[1] "Full Title" — Publisher/Domain (year)
    full URL

DO NOT write a CONFIDENCE ANALYSIS section — the platform computes it
from the source data and appends it automatically. Never invent
confidence numbers.

────────────────────────────────────────────────────────────
CRITICAL RULES
────────────────────────────────────────────────────────────

1. NEVER answer the query yourself — only present what sources say
2. NEVER inject your own knowledge or opinion
3. NEVER say which position is "correct" or "better"
4. ALWAYS attribute every claim to specific sources: "Source 3 states..."
5. Present ALL sides equally — give the same space to minority views
6. Include direct quotes when helpful: "As Source 2 puts it, '...'"
7. Note source types (academic, news, opinion, blog, commercial)
8. If the source material is thin, say so honestly
9. End with follow-up questions — help the user go deeper
10. NEVER use phrases like "research shows" or "experts agree" without citing which sources

────────────────────────────────────────────────────────────
EXAMPLES
────────────────────────────────────────────────────────────

❌ WRONG: "AI regulation is important for protecting citizens and ensuring ethical development."
✅ RIGHT: "Sources 1, 3, and 4 argue AI regulation is necessary for citizen protection (Source 1) and ethical development (Source 3). Source 2 argues regulation may stifle innovation."

❌ WRONG: "The evidence clearly supports regulation."
✅ RIGHT: "3 of 5 sources support regulation; 2 sources oppose it."

❌ WRONG: "In conclusion, AI should be regulated."
✅ RIGHT: "The research landscape shows agreement on the need for oversight (4 sources), but disagreement on the extent (split 3-2)."

❌ WRONG: "Source 5 is unreliable."
✅ RIGHT: "Source 5 is an opinion piece from a personal blog (no citations). Readers should verify claims independently."
"""

# ── Response-style adaptations (user preference, README-advertised) ──
# The librarian rules are non-negotiable; style only changes the VOICE.
RESPONSE_STYLES = {
    "academic": "Write in a formal academic register: precise terminology, "
                "measured hedging, structured argumentation.",
    "technical": "Write for a technical reader: exact figures, mechanisms, "
                 "and terminology; no simplification of technical detail.",
    "eli5": "Explain like the reader is smart but new to the topic: short "
            "sentences, everyday analogies, define every technical term the "
            "first time it appears. Keep all citations.",
    "casual": "Write in a relaxed, conversational tone — clear and friendly, "
              "like explaining to a curious colleague. Keep all citations.",
}


# ============================================================
# MAIN WRITER FUNCTION
# ============================================================


def writer_agent(
    query: str,
    summaries: list,
    critique: dict,
    citations: list,
    provider: str = "anthropic",
    api_key: Optional[str] = None,
    response_style: Optional[str] = None,
) -> str:
    """
    Organize source content into a neutral research digest.

    Args:
        query: The original user query
        summaries: List of source summary strings
        critique: Dict from critic_agent with agreements, disagreements, etc.
        citations: List of citation dicts with title, url
        provider: "anthropic" or "openai"
        api_key: User's personal API key

    Returns:
        Formatted research digest string
    """
    print("✍️ Writer: Organizing research landscape...")

    # ── Validate & clean input ────────────────────────
    cleaned_summaries = _clean_summaries(summaries)
    if not cleaned_summaries:
        return _fallback_answer(query, "No source summaries available.")

    if citations and len(citations) != len(cleaned_summaries):
        logger.warning(
            "citations (%d) and summaries (%d) counts don't match — "
            "source numbers in the digest may not line up with the source index",
            len(citations), len(cleaned_summaries),
        )

    # ── Build source index ─────────────────────────────
    source_index = _build_source_index(citations)

    # ── Build critique summary ─────────────────────────
    critique_text = _build_critique_summary(critique)

    # ── Build the prompt ───────────────────────────────
    summary_text = _build_combined_summaries(cleaned_summaries)

    confidence = (critique or {}).get('overall_confidence', 50)

    user_prompt = f"""ORIGINAL QUERY: {query}

SOURCE INDEX:
{source_index}

SOURCE SUMMARIES:
{summary_text}

CRITIQUE FINDINGS:
{critique_text}

CONFIDENCE: {confidence}%

Organize this into a research digest. Present what the sources say — do NOT answer the query yourself. Attribute every claim to specific sources, matching the [SOURCE N] numbers above. Be neutral and balanced."""

    # ── Call LLM (with retry on transient failures) ───
    try:
        client, client_type = _get_client(provider, api_key)
    except ValueError as e:
        print(f"  ❌ {e}")
        return _fallback_answer(query, str(e))

    system_prompt = WRITER_SYSTEM_PROMPT
    style_note = RESPONSE_STYLES.get((response_style or "").lower())
    if style_note:
        system_prompt += f"\n\n────────────────────────────\nVOICE & STYLE (user preference)\n────────────────────────────\n{style_note}\nStyle changes the voice ONLY — every neutrality and citation rule above still applies."

    try:
        answer = _call_llm_with_retry(client, client_type, system_prompt, user_prompt)
        print("  ✅ Research digest created!")
        return answer
    except Exception as e:
        logger.exception("Writer LLM call failed")
        print(f"  ❌ Writer error: {e}")
        return _fallback_answer(query, str(e))


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
    Number each source explicitly (e.g. [SOURCE 1]) and join with a clear
    divider so the model's citation numbers line up with SOURCE INDEX.
    Long summaries are individually truncated first so truncation never
    silently drops later sources from the prompt entirely.
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


def _build_source_index(citations: list) -> str:
    """Create a numbered list of sources for reference"""
    if not citations:
        return "No sources available."

    lines = []
    for i, c in enumerate(citations, 1):
        title = (c.get('title', 'Untitled') or 'Untitled')[:100]
        url = (c.get('url', 'No URL') or 'No URL')[:90]
        source_type = c.get('source', 'web')
        content_kind = c.get('content_source', '')      # scraped | snippet | minimal
        published = c.get('published_date', '') or 'date unknown'
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc or 'unknown domain'
        except Exception:
            domain = 'unknown domain'
        kind_label = 'FULL ARTICLE' if content_kind == 'scraped' else 'SNIPPET'
        lines.append(f"[{i}] {title}\n    URL: {url}\n    Domain: {domain} · Published: {published}\n    Type: {source_type} · Content: {kind_label}")

    return "\n".join(lines)


def _build_critique_summary(critique: dict) -> str:
    """Build a readable summary of the critic's findings"""
    if not critique:
        return "No critique analysis available."

    parts = []

    # Agreements
    agreements = critique.get('agreement_groups', [])
    if agreements:
        parts.append(f"AREAS OF AGREEMENT ({len(agreements)} found):")
        for g in agreements[:5]:
            sources = g.get('sources_agreeing', [])
            topic = g.get('topic', 'Unknown')
            parts.append(f"  • {topic} — Sources {sources}")

    # Disagreements
    disagreements = critique.get('disagreement_groups', [])
    if disagreements:
        parts.append(f"\nAREAS OF DISAGREEMENT ({len(disagreements)} found):")
        for g in disagreements[:5]:
            topic = g.get('topic', 'Unknown')
            pos_a = g.get('position_a', {}) or {}
            pos_b = g.get('position_b', {}) or {}
            parts.append(f"  • {topic}")
            parts.append(f"    Position A (Sources {pos_a.get('sources', [])}): {(pos_a.get('claim', 'N/A') or 'N/A')[:100]}")
            parts.append(f"    Position B (Sources {pos_b.get('sources', [])}): {(pos_b.get('claim', 'N/A') or 'N/A')[:100]}")

    # Unique insights
    unique = critique.get('unique_insights', [])
    if unique:
        parts.append(f"\nUNIQUE INSIGHTS ({len(unique)} found):")
        for u in unique[:5]:
            parts.append(f"  • Source {u.get('source', '?')}: {(u.get('insight', 'N/A') or 'N/A')[:150]}")

    # Coverage gaps
    gaps = critique.get('coverage_gaps', [])
    if gaps:
        parts.append(f"\nCOVERAGE GAPS ({len(gaps)} found):")
        for g in gaps[:5]:
            parts.append(f"  • {g}")

    # Confidence
    confidence = critique.get('overall_confidence', 50)
    explanation = critique.get('confidence_explanation', '')
    parts.append(f"\nCONFIDENCE: {confidence}%")
    if explanation:
        parts.append(f"  {explanation}")

    return "\n".join(parts) if parts else "No critique analysis available."


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
    """Call the appropriate LLM"""
    if client_type == "openai":
        response = client.chat.completions.create(
            model=DEFAULT_OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS
        )
        return response.choices[0].message.content
    else:
        message = client.messages.create(
            model=DEFAULT_ANTHROPIC_MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        return message.content[0].text


def _fallback_answer(query: str, error: str) -> str:
    """Return a graceful fallback when the writer fails"""
    return f"""📊 RESEARCH LANDSCAPE: {query}

⚠️ Research Digest Unavailable

The research organizer encountered an issue: {error}

Please try your query again. If the problem persists, try:
• Refining your search terms
• Checking your API key configuration
• Contacting support

📊 CONFIDENCE: 0%
"""