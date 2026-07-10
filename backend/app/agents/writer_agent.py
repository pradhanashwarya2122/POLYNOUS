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

MAX_TOKENS = 1500
TEMPERATURE = 0.4

MAX_CHARS_PER_SUMMARY = 2500     # guard against one huge summary eating the budget
MAX_TOTAL_SUMMARY_CHARS = 6000   # overall ceiling passed to the model

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
OUTPUT FORMAT
────────────────────────────────────────────────────────────

📊 RESEARCH LANDSCAPE: [Query]

📚 SOURCES ANALYZED
[List each source with its type: academic paper, news article, opinion piece, blog, etc.]
• Source 1: [Title] — [Type]
• Source 2: [Title] — [Type]
(etc.)

🤝 WHERE SOURCES AGREE
For each area of agreement:
• [Topic]: Sources [1, 3, 5] all state that... [specific claim with details]

⚡ WHERE SOURCES DISAGREE
For each disagreement, present BOTH sides equally:
• [Topic]:
  - Position A (Sources [1, 4]): [What they argue]
  - Position B (Sources [2, 6]): [What they argue]
  - Nature: [Factual dispute / Different interpretation / Different scope]

💡 UNIQUE PERSPECTIVES
• Source [3] uniquely notes that... [insight found only in this source]

⚠️ SOURCE QUALITY NOTES
• Source [1] (academic paper): Peer-reviewed journal — higher reliability
• Source [5] (opinion piece): Personal blog — verify claims independently
(Note the source TYPE, not whether it's "good" or "bad")

📊 CONFIDENCE: [X]%
[Explain: confidence is based on source agreement ratio, not truth judgment]

🔍 FOLLOW-UP QUESTIONS
• [Question 1 based on gaps in coverage]
• [Question 2 based on disagreements found]
• [Question 3 for deeper exploration]

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

    try:
        answer = _call_llm_with_retry(client, client_type, WRITER_SYSTEM_PROMPT, user_prompt)
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
        url = (c.get('url', 'No URL') or 'No URL')[:80]
        source_type = c.get('source', 'web')
        lines.append(f"[{i}] {title}\n    URL: {url}\n    Type: {source_type}")

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