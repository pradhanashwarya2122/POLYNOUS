"""
POLYNOUS Debate Agents — FOR, AGAINST, and Judge

A real adversarial pipeline, not two independent essays:

  1. Both debaters receive ALL retrieved sources, numbered [SOURCE n],
     and must cite them as [n] — citations outside 1..N are ignored by
     the rubric, so hallucinated evidence earns nothing.
  2. A REBUTTAL round: each side reads the opponent's opening argument
     and must respond to its specific points. This is what makes the
     debate genuinely adversarial.
  3. Judging is rubric-based: transparent computed metrics (distinct
     sources cited, share of grounded sentences) are combined 50/50
     with the LLM judge's qualitative scores. On judge failure the
     verdict is explicitly marked unscored — never a fabricated 5-5 TIE.
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

logger = logging.getLogger("polynous.debate")

# ============================================================
# CONFIG
# ============================================================

DEFAULT_ANTHROPIC_MODEL = os.getenv("DEBATE_ANTHROPIC_MODEL", "claude-haiku-4-5")
DEFAULT_OPENAI_MODEL = os.getenv("DEBATE_OPENAI_MODEL", "gpt-4o-mini")

MAX_TOKENS_ARGUMENT = 800    # opening includes the steelman restatement
MAX_TOKENS_JUDGE = 900       # verdict JSON now carries framing/minority/follow-ups
TEMPERATURE_ARGUMENT = 0.7
TEMPERATURE_JUDGE = 0.2

MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5

MAX_SOURCES = 12               # all pipeline sources, not context[:2]
PER_SOURCE_CHARS = 1200        # per-source budget in the prompt


# ============================================================
# LLM PLUMBING (shared, with retry)
# ============================================================


def _get_client(provider: str, api_key: Optional[str]):
    # SECURITY: no implicit env-var fallback — the endpoint layer resolves
    # keys explicitly. Missing key = hard error, never a silent system charge.
    if not api_key:
        raise ValueError(f"No {provider} API key provided for this request.")
    from app.llm_providers import resolve_provider
    client_type, base_url = resolve_provider(provider)
    if client_type == "openai":
        return OpenAI(api_key=api_key, **({"base_url": base_url} if base_url else {})), "openai"
    return Anthropic(api_key=api_key), "anthropic"


def _call_llm(client, client_type: str, system_prompt: str, user_prompt: str,
              max_tokens: int, temperature: float, model: Optional[str] = None,
              usage=None, stage: str = "debate", provider: str = "anthropic") -> str:
    from app.utils.usage import record as _record_usage
    if client_type == "openai":
        used_model = model or DEFAULT_OPENAI_MODEL
        response = client.chat.completions.create(
            model=used_model,
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": user_prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        _record_usage(usage, stage, provider, used_model, response, client_type)
        return response.choices[0].message.content
    used_model = model or DEFAULT_ANTHROPIC_MODEL
    response = client.messages.create(
        model=used_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    _record_usage(usage, stage, provider, used_model, response, client_type)
    return response.content[0].text


def _call_with_retry(client, client_type, system_prompt, user_prompt,
                     max_tokens, temperature, model=None,
                     usage=None, stage: str = "debate", provider: str = "anthropic") -> str:
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return _call_llm(client, client_type, system_prompt, user_prompt,
                             max_tokens, temperature, model=model,
                             usage=usage, stage=stage, provider=provider)
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = RETRY_BACKOFF_SECONDS * (attempt + 1)
                logger.warning("Debate LLM call failed (%s); retrying in %.1fs", e, wait)
                time.sleep(wait)
    raise last_error


# ============================================================
# SOURCE FORMATTING & RUBRIC (computed, transparent)
# ============================================================


def format_debate_sources(docs: list) -> str:
    """Number every source [SOURCE n] so citations are verifiable."""
    if not docs:
        return "No sources available."
    blocks = []
    for i, doc in enumerate(docs[:MAX_SOURCES], 1):
        title = (doc.get("title") or "Untitled")[:100]
        url = (doc.get("url") or "")[:90]
        content = (doc.get("content") or "")[:PER_SOURCE_CHARS]
        blocks.append(f"[SOURCE {i}] {title}\nURL: {url}\n{content}")
    return "\n\n".join(blocks)


_CITATION_RE = re.compile(r"\[(\d{1,2})\]")


def compute_argument_rubric(argument: str, total_sources: int) -> dict:
    """
    Transparent, computed argument metrics — the same idea as the critic's
    formula confidence. Citations pointing at sources that don't exist
    count for NOTHING.
    """
    argument = argument or ""
    cited_all = [int(n) for n in _CITATION_RE.findall(argument)]
    cited_valid = {n for n in cited_all if 1 <= n <= max(total_sources, 0)}
    hallucinated = {n for n in cited_all if n not in cited_valid and n > 0}

    def _has_valid_citation(sentence: str) -> bool:
        return any(int(n) in cited_valid for n in _CITATION_RE.findall(sentence))

    sentences = [s for s in re.split(r"(?<=[.!?])\s+", argument) if len(s.strip()) > 20]
    # only citations to REAL sources ground a sentence — [9] of 5 counts for nothing
    grounded = [s for s in sentences if _has_valid_citation(s)]
    coverage = (len(grounded) / len(sentences)) if sentences else 0.0

    # Evidence breadth: up to 5 pts for citing distinct real sources.
    breadth_cap = min(total_sources, 5) or 1
    evidence_score = min(5.0, len(cited_valid) * (5.0 / breadth_cap))
    # Grounding: up to 5 pts for the share of sentences carrying citations.
    grounding_score = coverage * 5.0

    return {
        "distinct_sources_cited": len(cited_valid),
        "hallucinated_citations": len(hallucinated),
        "sentences": len(sentences),
        "grounded_sentences": len(grounded),
        "citation_coverage": round(coverage, 3),
        "computed_score": round(evidence_score + grounding_score, 1),  # 0-10
    }


# ============================================================
# DEBATER PROMPTS
# ============================================================

_DEBATER_SYSTEM = """You are a debate champion arguing {side} the proposition.

RULES OF EVIDENCE:
- Use ONLY the numbered sources provided. Cite them inline as [n].
- Every factual claim needs a citation. Uncited claims score zero.
- Citing a source number that doesn't exist disqualifies that point.
- Make 2-4 sharp points. Be persuasive but factual.
{phase_rules}
Start your answer with: '{header}'"""

_OPENING_RULES = """- This is your OPENING argument: build the strongest case from the sources.
- BEFORE your argument, include a STEELMAN: on its own line write
  'STEELMAN: <a fair, accurate 1-2 sentence statement of the OPPOSING side's
  strongest argument>'. State it as its best advocate would — no strawmen.
  Then leave a blank line and begin your argument with the required header."""
_REBUTTAL_RULES = """- This is your REBUTTAL: your opponent's argument is shown below.
- You MUST directly address at least two of your opponent's specific points —
  quote or reference them, then counter with sourced evidence.
- Simply restating your opening scores poorly."""


def argue_position(
    query: str,
    docs: list,
    side: str,                      # "FOR" | "AGAINST"
    opponent_argument: Optional[str] = None,
    api_key: Optional[str] = None,
    provider: str = "anthropic",
    model: Optional[str] = None,
    usage_sink: Optional[dict] = None,
) -> dict:
    """
    One debate turn. Returns a structured dict:
      {text, side, phase, rubric, error}
    """
    phase = "rebuttal" if opponent_argument else "opening"
    header = f"{'REBUTTAL' if opponent_argument else 'ARGUMENT'} {side}:"
    print(f"  {'🟢' if side == 'FOR' else '🔴'} {side} ({phase}): building…")

    sources_text = format_debate_sources(docs)
    system_prompt = _DEBATER_SYSTEM.format(
        side=side,
        phase_rules=_REBUTTAL_RULES if opponent_argument else _OPENING_RULES,
        header=header,
    )

    user_prompt = f"Proposition: {query}\n\nSOURCES:\n{sources_text}\n"
    if opponent_argument:
        user_prompt += f"\nYOUR OPPONENT ARGUED:\n{opponent_argument[:2200]}\n"
    user_prompt += f"\nDeliver your {phase} {side} the proposition:"

    result = {"text": "", "side": side, "phase": phase, "rubric": None, "error": None, "steelman": None}
    try:
        client, client_type = _get_client(provider, api_key)
        result["text"] = _call_with_retry(
            client, client_type, system_prompt, user_prompt,
            MAX_TOKENS_ARGUMENT, TEMPERATURE_ARGUMENT, model=model,
            usage=usage_sink, stage=f"{side.lower()}_{phase}", provider=provider,
        )
        # Extract the steelman line (opening turns only) so the UI can show it
        if phase == "opening":
            m = re.search(r"STEELMAN:\s*(.+?)(?:\n\s*\n|\nARGUMENT|\nREBUTTAL)",
                          result["text"], re.S | re.I)
            if m:
                result["steelman"] = m.group(1).strip()[:400]
                # remove it from the argument body shown/typed
                result["text"] = re.sub(r"STEELMAN:.*?(?:\n\s*\n)", "",
                                        result["text"], count=1, flags=re.S | re.I).strip()
        result["rubric"] = compute_argument_rubric(result["text"], min(len(docs), MAX_SOURCES))
    except Exception as e:
        logger.exception("%s %s failed", side, phase)
        result["error"] = str(e)[:200]
        result["text"] = f"[{side} {phase} unavailable: {result['error']}]"
        result["rubric"] = compute_argument_rubric("", min(len(docs), MAX_SOURCES))
    return result


# Backward-compatible wrappers (old call sites get opening arguments)
def argue_for_position(query, context, api_key=None, provider="anthropic") -> str:
    docs = context if (context and isinstance(context[0], dict)) else [
        {"title": f"Source {i+1}", "url": "", "content": c} for i, c in enumerate(context or [])
    ]
    return argue_position(query, docs, "FOR", api_key=api_key, provider=provider)["text"]


def argue_against_position(query, context, api_key=None, provider="anthropic") -> str:
    docs = context if (context and isinstance(context[0], dict)) else [
        {"title": f"Source {i+1}", "url": "", "content": c} for i, c in enumerate(context or [])
    ]
    return argue_position(query, docs, "AGAINST", api_key=api_key, provider=provider)["text"]


# ============================================================
# JUDGE — rubric + LLM, combined transparently
# ============================================================

_JUDGE_SYSTEM = """You are an impartial debate judge. You will see each side's
opening, rebuttal, and COMPUTED evidence metrics (citations verified against
the real source list — you cannot be fooled by invented citations).

Score each side 0-10 on argument QUALITY: logic, how directly the rebuttal
engaged the opponent's points, and persuasiveness. The evidence dimension is
already measured for you — do not re-score citation counts.

Return ONLY a raw JSON object (no code fences):
{"for_quality": 7, "against_quality": 8,
 "reasoning": "2-3 sentence explanation",
 "strongest_point": "the single best argument made by either side",
 "best_rebuttal": "FOR" or "AGAINST" — who engaged the opponent better,
 "certainty": 0-100 — how certain you are in this quality assessment,
 "framing_check": {"assumed_frame": "the binary frame this debate assumes, in a few words",
   "alternatives": ["2-3 alternative framings of the question"]},
 "minority_report": {"could_flip": true/false,
   "condition": "under what stricter or different standard the verdict could flip (or why it could not)",
   "note": "one sentence"},
 "follow_up_questions": ["3 specific, researchable follow-up questions raised by this debate"]}"""


def judge_debate(
    for_arg: str,
    against_arg: str,
    query: str,
    api_key: Optional[str] = None,
    provider: str = "anthropic",
    for_rebuttal: str = "",
    against_rebuttal: str = "",
    total_sources: int = 0,
    model: Optional[str] = None,
    usage_sink: Optional[dict] = None,
) -> dict:
    """
    Judge the debate. Final score per side =
      50% computed rubric (opening + rebuttal evidence metrics)
    + 50% LLM quality score.
    On LLM failure: verdict is explicitly 'UNSCORED' with computed metrics
    only — never a fabricated tie.
    """
    print("  ⚖️ JUDGE: computing rubric + evaluating…")

    for_full = f"{for_arg}\n{for_rebuttal}".strip()
    against_full = f"{against_arg}\n{against_rebuttal}".strip()
    rubric_for = compute_argument_rubric(for_full, total_sources)
    rubric_against = compute_argument_rubric(against_full, total_sources)

    user_prompt = f"""Topic: {query}

FOR OPENING:\n{for_arg[:1600]}
FOR REBUTTAL:\n{(for_rebuttal or 'None')[:1400]}
FOR COMPUTED EVIDENCE: {json.dumps(rubric_for)}

AGAINST OPENING:\n{against_arg[:1600]}
AGAINST REBUTTAL:\n{(against_rebuttal or 'None')[:1400]}
AGAINST COMPUTED EVIDENCE: {json.dumps(rubric_against)}

Judge and return JSON:"""

    verdict = {
        "rubric_for": rubric_for,
        "rubric_against": rubric_against,
        "parse_failed": False,
    }

    try:
        client, client_type = _get_client(provider, api_key)
        from app.utils.json_extract import extract_json_object
        raw = _call_with_retry(client, client_type, _JUDGE_SYSTEM, user_prompt,
                               MAX_TOKENS_JUDGE, TEMPERATURE_JUDGE, model=model,
                               usage=usage_sink, stage="judge", provider=provider)
        # Robust extraction (same brace-matching machinery critic/writer use) —
        # tolerates ```json fences, prose around the JSON, smart quotes, etc.
        llm = extract_json_object(raw)

        # Self-repair: one corrective retry if the model wrapped/omitted JSON or
        # returned nothing — mirrors critic/writer so a single bad completion
        # doesn't collapse the whole verdict to UNSCORED.
        if not isinstance(llm, dict):
            corrective = (
                f"{user_prompt}\n\nIMPORTANT: your previous reply could not be parsed as JSON"
                + (" (it was empty)." if not (raw or "").strip() else ".")
                + " Respond again with ONLY the raw JSON object — first character '{', "
                "last character '}', no prose, no code fences."
            )
            raw = _call_with_retry(client, client_type, _JUDGE_SYSTEM, corrective,
                                   MAX_TOKENS_JUDGE, TEMPERATURE_JUDGE, model=model,
                                   usage=usage_sink, stage="judge", provider=provider)
            llm = extract_json_object(raw)

        if not isinstance(llm, dict):
            raise ValueError(
                "judge returned no parseable JSON after retry"
                + (" (empty response — check the provider/API key)" if not (raw or "").strip() else "")
            )

        for_quality = float(llm.get("for_quality", 0))
        against_quality = float(llm.get("against_quality", 0))
        for_score = round(0.5 * rubric_for["computed_score"] + 0.5 * for_quality, 1)
        against_score = round(0.5 * rubric_against["computed_score"] + 0.5 * against_quality, 1)

        gap = abs(for_score - against_score)
        if gap < 0.5:
            winner = "TIE"
        else:
            winner = "FOR" if for_score > against_score else "AGAINST"
        # margin label computed from the real score gap, never LLM-invented
        margin = "split" if gap < 0.5 else ("close" if gap < 1.0 else ("clear" if gap < 2.0 else "decisive"))

        follow_ups = [q for q in (llm.get("follow_up_questions") or []) if isinstance(q, str) and q.strip()][:4]
        if not follow_ups:
            follow_ups = _fallback_follow_ups(query)

        verdict.update({
            "margin": margin,
            "judge_certainty": max(0, min(100, int(llm.get("certainty", 0) or 0))),
            "framing_check": llm.get("framing_check") or None,
            "minority_report": llm.get("minority_report") or None,
            "follow_up_questions": follow_ups,
            "winner": winner,
            "for_score": for_score,
            "against_score": against_score,
            "for_quality": for_quality,
            "against_quality": against_quality,
            "reasoning": llm.get("reasoning", ""),
            "strongest_point": llm.get("strongest_point", ""),
            "best_rebuttal": llm.get("best_rebuttal", ""),
            "scoring": "50% computed evidence rubric + 50% judge quality score",
        })
        print(f"  ✅ Winner: {winner} (FOR {for_score} / AGAINST {against_score})")
        return verdict

    except Exception as e:
        logger.exception("Judge failed")
        # Honest degraded verdict: computed metrics only, clearly marked.
        verdict.update({
            "winner": "UNSCORED",
            "parse_failed": True,
            "for_score": rubric_for["computed_score"],
            "against_score": rubric_against["computed_score"],
            "reasoning": f"Judge evaluation unavailable ({str(e)[:120]}). "
                         "Scores shown are the computed evidence rubric only.",
            "strongest_point": "N/A",
            "best_rebuttal": "N/A",
            "scoring": "computed evidence rubric only (judge LLM failed)",
            # Even when the judge can't score, give the reader somewhere to go.
            "follow_up_questions": _fallback_follow_ups(query),
        })
        return verdict


def _fallback_follow_ups(query: str) -> list:
    """Deterministic, on-topic follow-up questions when the judge doesn't
    supply its own — derived from the proposition, never fabricated verdict
    content. Keeps the report's 'next questions' section useful."""
    q = (query or "this proposition").strip().rstrip("?.")
    return [
        f"What real-world evidence would most change your view on whether {q.lower()}?",
        f"Which stakeholders are most affected by {q.lower()}, and how does that shift the trade-offs?",
        f"Under what conditions or timeframe would the stronger side of '{q}' flip?",
    ]
