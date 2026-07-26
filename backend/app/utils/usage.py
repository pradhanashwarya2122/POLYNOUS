"""
app/utils/usage.py — honest per-request token / cost / latency accounting.

Design: every LLM call site records ACTUAL usage tokens reported by the SDK
into a plain dict accumulator carried on AgentState["usage"]. Nothing is
fabricated — when a provider's SDK doesn't return usage, we mark it missing
and the UI shows "—" rather than a guess. Cost is ESTIMATED from a per-model
PRICING table (app/llm_providers.py) and always labelled as an estimate.

Accumulator shape (state["usage"]):
    {
      "calls": int,
      "input_tokens": int,
      "output_tokens": int,
      "missing_usage": bool,        # any call whose SDK gave no usage
      "scrape_cache_hits": int,     # pages served from the scrape-level cache
      "by_stage": {
         "<stage>": {"calls", "input_tokens", "output_tokens",
                     "provider", "model"}
      }
    }
"""
from __future__ import annotations

from typing import Optional


def new_usage() -> dict:
    return {
        "calls": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "missing_usage": False,
        "scrape_cache_hits": 0,
        "by_stage": {},
    }


def extract_tokens(response, client_type: str) -> tuple[Optional[int], Optional[int]]:
    """
    Pull (input_tokens, output_tokens) out of an SDK response. Returns
    (None, None) when usage isn't available — never invents numbers.

    - Anthropic native: response.usage.input_tokens / .output_tokens
    - OpenAI + OpenAI-compatible: response.usage.prompt_tokens / .completion_tokens
    """
    usage = getattr(response, "usage", None)
    if usage is None:
        return None, None
    try:
        if client_type == "anthropic":
            inp = getattr(usage, "input_tokens", None)
            out = getattr(usage, "output_tokens", None)
        else:  # openai + openai-compatible
            inp = getattr(usage, "prompt_tokens", None)
            out = getattr(usage, "completion_tokens", None)
        inp = int(inp) if inp is not None else None
        out = int(out) if out is not None else None
        return inp, out
    except Exception:
        return None, None


def record(usage: Optional[dict], stage: str, provider: str, model: str,
           response, client_type: str) -> None:
    """Fold one LLM call's real usage into the accumulator. No-op if usage
    is None (call site didn't opt in) so agents work standalone too."""
    if usage is None:
        return
    inp, out = extract_tokens(response, client_type)
    _record_tokens(usage, stage, provider, model, inp, out)


def _record_tokens(usage: dict, stage: str, provider: str, model: str,
                   inp: Optional[int], out: Optional[int]) -> None:
    usage["calls"] = usage.get("calls", 0) + 1
    st = usage.setdefault("by_stage", {}).setdefault(
        stage, {"calls": 0, "input_tokens": 0, "output_tokens": 0,
                "provider": provider, "model": model})
    st["calls"] += 1
    st["provider"] = provider
    st["model"] = model
    if inp is None and out is None:
        usage["missing_usage"] = True
        return
    if inp is not None:
        usage["input_tokens"] = usage.get("input_tokens", 0) + inp
        st["input_tokens"] += inp
    if out is not None:
        usage["output_tokens"] = usage.get("output_tokens", 0) + out
        st["output_tokens"] += out


def record_aggregate(usage: Optional[dict], stage: str, provider: str, model: str,
                     calls: int, inp: Optional[int], out: Optional[int],
                     any_missing: bool = False) -> None:
    """Record a pre-aggregated batch (used by the summariser, which fans out
    across a thread pool and sums its own per-document usage)."""
    if usage is None:
        return
    st = usage.setdefault("by_stage", {}).setdefault(
        stage, {"calls": 0, "input_tokens": 0, "output_tokens": 0,
                "provider": provider, "model": model})
    usage["calls"] = usage.get("calls", 0) + calls
    st["calls"] += calls
    st["provider"] = provider
    st["model"] = model
    if any_missing:
        usage["missing_usage"] = True
    if inp:
        usage["input_tokens"] = usage.get("input_tokens", 0) + inp
        st["input_tokens"] += inp
    if out:
        usage["output_tokens"] = usage.get("output_tokens", 0) + out
        st["output_tokens"] += out


def record_latency(usage: Optional[dict], stage: str, seconds: float) -> None:
    """Attach REAL wall-clock latency for a stage (accumulates across repeat
    visits, e.g. the critic running twice after a deepen loop)."""
    if usage is None:
        return
    st = usage.setdefault("by_stage", {}).setdefault(
        stage, {"calls": 0, "input_tokens": 0, "output_tokens": 0,
                "provider": "", "model": ""})
    st["latency_s"] = round(st.get("latency_s", 0.0) + max(0.0, seconds), 3)


def estimate_cost(usage: dict) -> dict:
    """
    Estimated USD cost from the PRICING table. Returns:
      {"usd": float|None, "is_estimate": True, "by_stage": {stage: usd|None},
       "priced_all": bool}
    usd is None only if NOTHING could be priced; priced_all is False if any
    stage lacked a price (so the UI can add a "partial" note).
    """
    from app.llm_providers import price_for

    total = 0.0
    priced_any = False
    priced_all = True
    by_stage: dict = {}
    for stage, st in (usage.get("by_stage") or {}).items():
        rate = price_for(st.get("provider", ""), st.get("model", ""))
        if rate is None:
            by_stage[stage] = None
            priced_all = False
            continue
        in_rate, out_rate = rate
        cost = (st.get("input_tokens", 0) * in_rate
                + st.get("output_tokens", 0) * out_rate) / 1_000_000.0
        by_stage[stage] = round(cost, 6)
        total += cost
        priced_any = True
    return {
        "usd": round(total, 6) if priced_any else None,
        "is_estimate": True,
        "by_stage": by_stage,
        "priced_all": priced_all,
    }


def _providers_used(usage: dict) -> list:
    """Distinct provider·model pairs that actually spent tokens on this run, with
    their per-pair token totals — so the UI can name the exact key/model billed
    (e.g. "OpenAI · gpt-4o-mini"). Order = first appearance across stages."""
    seen: dict = {}
    for st in (usage.get("by_stage") or {}).values():
        prov, model = st.get("provider", ""), st.get("model", "")
        if not prov and not model:
            continue
        key = (prov, model)
        agg = seen.setdefault(key, {"provider": prov, "model": model,
                                    "input_tokens": 0, "output_tokens": 0, "calls": 0})
        agg["input_tokens"] += st.get("input_tokens", 0)
        agg["output_tokens"] += st.get("output_tokens", 0)
        agg["calls"] += st.get("calls", 0)
    return list(seen.values())


def summarize_usage(usage: Optional[dict]) -> dict:
    """Public, render-ready telemetry payload for the Final SSE patch."""
    u = usage or new_usage()
    cost = estimate_cost(u)
    return {
        "calls": u.get("calls", 0),
        "input_tokens": u.get("input_tokens", 0),
        "output_tokens": u.get("output_tokens", 0),
        "total_tokens": u.get("input_tokens", 0) + u.get("output_tokens", 0),
        "missing_usage": u.get("missing_usage", False),
        "scrape_cache_hits": u.get("scrape_cache_hits", 0),
        "by_stage": u.get("by_stage", {}),
        "providers": _providers_used(u),
        "estimated_cost": cost,
    }
