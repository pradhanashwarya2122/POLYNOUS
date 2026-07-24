"""
evals/run_eval.py — run the eval set through the REAL POLYNOUS pipeline and
record mechanically-derived metrics.

Per project security policy this NEVER falls back to an environment key for
LLM calls: you must pass --api-key explicitly. (Tavily web search remains
system-managed, as everywhere else in the app.)

Usage (from backend/):
    python -m evals.run_eval --api-key sk-ant-... --limit 3
    python -m evals.run_eval --api-key sk-ant-... --baseline
    python -m evals.run_eval --api-key sk-... --provider openai --model gpt-4o-mini
    python -m evals.run_eval --api-key sk-ant-... --category contested

Writes:
    evals/results/<timestamp>.json   (machine-readable, consumed by /evals/summary + calibration.py)
    evals/results/<timestamp>.md     (human-readable pipeline-vs-baseline table)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Make `app` importable whether run as `python -m evals.run_eval` from backend/
# or directly.
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from evals import metrics as M  # noqa: E402

EVAL_SET_PATH = Path(__file__).resolve().parent / "eval_set.json"
RESULTS_DIR = Path(__file__).resolve().parent / "results"

# Graph node -> human stage label (matches orchestrator RESEARCH_NODE_TO_PANEL)
_STAGE_LABEL = {
    "search": "search", "summarise": "summarise", "critic": "critic",
    "deepen": "deepen", "write": "write",
}


def _load_questions(category: str | None, limit: int | None) -> list[dict]:
    data = json.loads(EVAL_SET_PATH.read_text(encoding="utf-8"))
    qs = data["questions"]
    if category:
        qs = [q for q in qs if q["category"] == category]
    if limit:
        qs = qs[:limit]
    return qs


def _run_pipeline(question: str, provider: str, api_key: str, model: str | None) -> dict:
    """
    Run one question through the compiled orchestrator via stream_mode="debug",
    capturing per-stage latency AND the final merged state. Returns
    {state, stage_latency, total_latency, error}.
    """
    from app.graph.orchestrator import orchestrator
    from app.state import AgentState

    state = AgentState(
        query=question,
        session_id="eval-harness",
        user=None,
        user_api_key=api_key,
        preferred_provider=provider,
        model=model,
        retrieved_docs=[], summaries=[], critique={}, final_answer="", citations=[],
        debate_mode=False, debate_history=[], judge_verdict={},
        errors=[], warnings=[], current_agent="start",
        response_style="academic",
    )
    # newer AgentState keys the nodes read via .get() — set explicitly for clarity
    state["research_cycles"] = 0
    state["critic_retries"] = 0
    state["computed_confidence"] = None
    state["report"] = None
    state["graph_context"] = ""
    state["graph_results"] = []
    state["_progress_bus"] = None

    merged = dict(state)
    stage_latency: dict[str, float] = {}
    task_started: dict[str, float] = {}
    error = None
    t0 = time.time()
    try:
        for ev in orchestrator.stream(state, stream_mode="debug"):
            name = ev.get("payload", {}).get("name")
            if ev.get("type") == "task" and name:
                task_started[name] = time.time()
            elif ev.get("type") == "task_result" and name:
                # accumulate latency across repeated visits (retry/deepen loops)
                dt = time.time() - task_started.get(name, time.time())
                stage_latency[_STAGE_LABEL.get(name, name)] = round(
                    stage_latency.get(_STAGE_LABEL.get(name, name), 0.0) + dt, 3
                )
                result = ev.get("payload", {}).get("result") or {}
                merged.update(result)
    except Exception as e:  # a load-bearing node failed — record it honestly
        error = f"{type(e).__name__}: {e}"

    return {
        "state": merged,
        "stage_latency": stage_latency,
        "total_latency": round(time.time() - t0, 3),
        "error": error,
    }


_BASELINE_SYSTEM = (
    "You are answering a research question directly. Write a concise, factual "
    "answer. Where you rely on a specific source, cite it inline as [n]. Do not "
    "fabricate sources you were not given."
)


def _run_baseline(question: str, provider: str, api_key: str, model: str | None) -> dict:
    """
    Single direct LLM call — the 'just ask the model' baseline the whole
    multi-agent pipeline is meant to beat. Measured with the SAME text metrics,
    but with zero retrieved sources (so any [n] it emits is hallucinated).
    """
    from app.agents.writer_agent import _get_client, _call_llm  # reuse client factory
    t0 = time.time()
    try:
        client, client_type = _get_client(provider, api_key)
        answer = _call_llm(client, client_type, _BASELINE_SYSTEM, question, model=model)
    except Exception as e:
        return {"answer": "", "latency": round(time.time() - t0, 3),
                "error": f"{type(e).__name__}: {e}", "metrics": M.answer_text_metrics("", [])}
    return {
        "answer": answer or "",
        "latency": round(time.time() - t0, 3),
        "error": None,
        # baseline has NO retrieved sources → docs=[]
        "metrics": M.answer_text_metrics(answer or "", []),
    }


def _check_expectations(props: dict, critique: dict, computed: dict, docs: list,
                        grounded_ratio: float) -> dict:
    """Compare pipeline outputs against the category's expected_properties.
    Every check returns True/False/None(not-applicable) — never fabricated."""
    checks: dict[str, bool | None] = {}
    conf = (computed or {}).get("score")
    disagreements = len(critique.get("disagreement_groups") or [])
    gaps = len(critique.get("coverage_gaps") or [])

    if "should_find_disagreement" in props:
        checks["found_disagreement"] = (disagreements > 0) == props["should_find_disagreement"]
    if props.get("should_ground"):
        checks["grounded"] = grounded_ratio >= 0.4
    if "min_sources" in props:
        checks["min_sources_met"] = len(docs) >= props["min_sources"]
    if props.get("expect_high_confidence"):
        checks["high_confidence"] = isinstance(conf, (int, float)) and conf >= 60
    if props.get("expect_low_confidence"):
        checks["low_confidence"] = isinstance(conf, (int, float)) and conf < 60
    if props.get("expect_coverage_gaps"):
        checks["coverage_gaps_found"] = gaps > 0
    if props.get("expect_recent_sources"):
        rec = (computed or {}).get("breakdown", {}).get("recency")
        checks["recent_sources"] = isinstance(rec, (int, float)) and rec >= 0.6
    return checks


def _aggregate(runs: list[dict]) -> dict:
    """Per-category aggregates for pipeline (and baseline if present)."""
    by_cat: dict[str, dict] = defaultdict(lambda: {"pipeline": defaultdict(list),
                                                    "baseline": defaultdict(list),
                                                    "n": 0})
    for r in runs:
        cat = by_cat[r["category"]]
        cat["n"] += 1
        p = r["pipeline"]
        for k in ("sources_retrieved", "distinct_domains", "grounded_ratio",
                  "citation_density_per_100w", "hallucinated_citations",
                  "computed_confidence", "total_latency"):
            if p.get(k) is not None:
                cat["pipeline"][k].append(p[k])
        b = r.get("baseline")
        if b:
            for k in ("grounded_ratio", "citation_density_per_100w",
                      "hallucinated_citations", "latency"):
                if b.get(k) is not None:
                    cat["baseline"][k].append(b[k])

    out = {}
    for cat, d in by_cat.items():
        out[cat] = {
            "n": d["n"],
            "pipeline": {k: M.mean(v) for k, v in d["pipeline"].items()},
            "baseline": {k: M.mean(v) for k, v in d["baseline"].items()} or None,
        }
    return out


def _markdown_summary(payload: dict) -> str:
    lines = [
        f"# POLYNOUS Evaluation — {payload['timestamp']}",
        "",
        f"- Provider/model: `{payload['provider']}` / `{payload['model']}`",
        f"- Questions run: **{payload['n_questions']}**  ·  Baseline: **{'yes' if payload['baseline_enabled'] else 'no'}**",
        f"- Pipeline errors: **{payload['n_pipeline_errors']}**",
        "",
        "## Per-category summary (pipeline)",
        "",
        "| Category | N | Sources | Domains | Grounded | Cite dens. | Halluc. | Confidence | Latency (s) |",
        "|----------|---|---------|---------|----------|-----------|---------|-----------|-------------|",
    ]
    for cat, d in sorted(payload["by_category"].items()):
        p = d["pipeline"]
        lines.append(
            f"| {cat} | {d['n']} | {p.get('sources_retrieved','—')} | "
            f"{p.get('distinct_domains','—')} | {p.get('grounded_ratio','—')} | "
            f"{p.get('citation_density_per_100w','—')} | {p.get('hallucinated_citations','—')} | "
            f"{p.get('computed_confidence','—')} | {p.get('total_latency','—')} |"
        )

    if payload["baseline_enabled"]:
        lines += [
            "",
            "## Pipeline vs baseline (single direct LLM call)",
            "",
            "| Category | Grounded (pipe/base) | Cite dens. (pipe/base) | Halluc. (pipe/base) |",
            "|----------|----------------------|------------------------|---------------------|",
        ]
        for cat, d in sorted(payload["by_category"].items()):
            p, b = d["pipeline"], d.get("baseline") or {}
            lines.append(
                f"| {cat} | {p.get('grounded_ratio','—')} / {b.get('grounded_ratio','—')} | "
                f"{p.get('citation_density_per_100w','—')} / {b.get('citation_density_per_100w','—')} | "
                f"{p.get('hallucinated_citations','—')} / {b.get('hallucinated_citations','—')} |"
            )

    lines += [
        "",
        "## Expectation checks",
        "",
        "| Question | Category | Checks passed |",
        "|----------|----------|---------------|",
    ]
    for r in payload["runs"]:
        checks = r.get("expectations_met") or {}
        passed = sum(1 for v in checks.values() if v is True)
        total = sum(1 for v in checks.values() if v is not None)
        flag = "" if total == 0 else (" ✅" if passed == total else " ⚠️")
        lines.append(f"| {r['id']} | {r['category']} | {passed}/{total}{flag} |")

    lines.append("")
    lines.append("_All numbers are computed mechanically from pipeline output. "
                 "No values are fabricated; '—' means not measured._")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Run POLYNOUS eval set through the real pipeline.")
    ap.add_argument("--api-key", required=True,
                    help="LLM API key (REQUIRED — never read from environment, per project policy).")
    ap.add_argument("--provider", default="anthropic",
                    help="LLM provider (anthropic, openai, google, mistral, groq, nvidia, deepseek).")
    ap.add_argument("--model", default=None, help="Model id (defaults to provider default).")
    ap.add_argument("--limit", type=int, default=None, help="Only run the first N questions.")
    ap.add_argument("--category", default=None,
                    help="Only run one category (factual, contested, recent-events, technical, ambiguous).")
    ap.add_argument("--baseline", action="store_true",
                    help="Also answer each question with a single direct LLM call for comparison.")
    args = ap.parse_args()

    if not args.api_key or not args.api_key.strip():
        print("ERROR: --api-key is required and must be non-empty.", file=sys.stderr)
        return 2

    questions = _load_questions(args.category, args.limit)
    if not questions:
        print("No questions matched the given filters.", file=sys.stderr)
        return 1

    print(f"▶ Running {len(questions)} question(s) via provider={args.provider} "
          f"model={args.model or 'default'} baseline={args.baseline}")

    runs = []
    n_errors = 0
    for i, q in enumerate(questions, 1):
        print(f"  [{i}/{len(questions)}] {q['id']}: {q['question'][:60]}…")
        res = _run_pipeline(q["question"], args.provider, args.api_key, args.model)
        st = res["state"]
        if res["error"]:
            n_errors += 1
            print(f"      ⚠️ pipeline error: {res['error']}")

        docs = st.get("retrieved_docs") or []
        answer = st.get("final_answer") or ""
        critique = st.get("critique") or {}
        computed = st.get("computed_confidence") or {}
        text_metrics = M.answer_text_metrics(answer, docs)
        grounded_ratio = text_metrics["grounded_ratio"]

        pipeline_metrics = {
            **text_metrics,
            "computed_confidence": computed.get("score"),
            "confidence_breakdown": computed.get("breakdown"),
            "critique_parse_success": not critique.get("parse_failed", False) if critique else False,
            "disagreements_found": len(critique.get("disagreement_groups") or []),
            "coverage_gaps_found": len(critique.get("coverage_gaps") or []),
            "research_cycles": st.get("research_cycles", 0),
            "stage_latency": res["stage_latency"],
            "total_latency": res["total_latency"],
            "error": res["error"],
        }

        run = {
            "id": q["id"],
            "category": q["category"],
            "question": q["question"],
            "expected_properties": q["expected_properties"],
            "pipeline": pipeline_metrics,
            "expectations_met": _check_expectations(
                q["expected_properties"], critique, computed, docs, grounded_ratio),
        }

        if args.baseline:
            bl = _run_baseline(q["question"], args.provider, args.api_key, args.model)
            if bl["error"]:
                print(f"      ⚠️ baseline error: {bl['error']}")
            run["baseline"] = {**bl["metrics"], "latency": bl["latency"], "error": bl["error"]}

        runs.append(run)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    payload = {
        "timestamp": timestamp,
        "provider": args.provider,
        "model": args.model or "default",
        "n_questions": len(runs),
        "n_pipeline_errors": n_errors,
        "baseline_enabled": bool(args.baseline),
        "runs": runs,
        "by_category": _aggregate(runs),
    }
    payload["summary_markdown"] = _markdown_summary(payload)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = RESULTS_DIR / f"{timestamp}.json"
    md_path = RESULTS_DIR / f"{timestamp}.md"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    md_path.write_text(payload["summary_markdown"], encoding="utf-8")

    print(f"\n✅ Wrote {json_path.name} and {md_path.name} to {RESULTS_DIR}")
    print(f"   {len(runs)} runs · {n_errors} pipeline errors")
    print("\n" + payload["summary_markdown"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
