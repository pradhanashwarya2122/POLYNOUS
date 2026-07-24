"""
Shared robust JSON-from-LLM-text extraction.

Originally hardened inside critic_agent.py (brace-counting extractor that
tolerates ```json fences, ``` fences, and raw JSON mixed with prose).
Extracted here so any agent that asks an LLM for JSON — critic, writer,
future agents — reuses the exact same battle-tested extraction instead of
re-implementing brace-counting from scratch.
"""
import json
import re
from typing import Optional


def repair_json(candidate: str) -> str:
    """Fix the two most common LLM JSON faults before parsing."""
    candidate = candidate.replace("“", '"').replace("”", '"')  # smart double quotes
    candidate = candidate.replace("‘", "'").replace("’", "'")  # smart single quotes
    candidate = re.sub(r",\s*([}\]])", r"\1", candidate)                  # trailing commas
    return candidate


def _try_parse(candidate: str) -> Optional[dict]:
    for c in (candidate, repair_json(candidate)):
        try:
            return json.loads(c)
        except json.JSONDecodeError:
            continue
    return None


def extract_json_object(text: str) -> Optional[dict]:
    """
    Best-effort extraction of a JSON object from raw LLM text. Tries, in
    order: direct parse, ```json fences, ``` fences, then brace-counting
    over the raw text to find the first balanced {...}. Returns None if
    nothing could be parsed — callers decide how to represent that failure.
    """
    if not text:
        return None
    text = text.strip()

    result = _try_parse(text)
    if result is not None:
        return result

    json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        result = _try_parse(json_match.group(1))
        if result is not None:
            return result

    code_match = re.search(r'```\s*(\{.*?\})\s*```', text, re.DOTALL)
    if code_match:
        result = _try_parse(code_match.group(1))
        if result is not None:
            return result

    start = text.find('{')
    if start >= 0:
        brace_count = 0
        for i in range(start, len(text)):
            if text[i] == '{':
                brace_count += 1
            elif text[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    result = _try_parse(text[start:i + 1])
                    if result is not None:
                        return result
                    break

    return None
