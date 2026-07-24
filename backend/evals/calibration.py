"""
evals/calibration.py — is the pipeline's computed confidence actually
predictive of answer quality?

Reads every evals/results/*.json plus the debate_votes table, buckets runs by
computed confidence (0-40 / 40-60 / 60-80 / 80-100), and reports:

  1. confidence bucket  vs  mean grounded-sentence ratio
     (does higher confidence go with more grounded answers?)
  2. judge-agreement rate from real debate_votes (a separate outcome signal —
     votes aren't per-run so this is reported, not correlated per bucket)

Ends with a one-line HONEST verdict. If the data is too thin to conclude,
it says so rather than inventing a correlation.

Usage (from backend/):
    python -m evals.calibration
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from evals import metrics as M  # noqa: E402

RESULTS_DIR = Path(__file__).resolve().parent / "results"


def load_all_runs() -> list[dict]:
    """Every run across every results file (newest files last)."""
    runs = []
    if not RESULTS_DIR.exists():
        return runs
    for path in sorted(RESULTS_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for r in data.get("runs", []):
            p = r.get("pipeline") or {}
            runs.append({
                "confidence": p.get("computed_confidence"),
                "grounded_ratio": p.get("grounded_ratio"),
                "hallucinated": p.get("hallucinated_citations"),
                "source_file": path.name,
            })
    return runs


def debate_agreement() -> dict:
    """Real judge-agreement rate from the debate_votes table (may be empty)."""
    try:
        from app.database import SessionLocal, DebateVote
    except Exception as e:
        return {"available": False, "reason": f"db import failed: {e}"}
    db = SessionLocal()
    try:
        votes = db.query(DebateVote).all()
        total = len(votes)
        if total == 0:
            return {"available": True, "total_votes": 0, "agreement_rate": None}
        agree = sum(1 for v in votes if v.user_agrees)
        return {"available": True, "total_votes": total,
                "agreement_rate": round(agree / total, 3)}
    except Exception as e:
        return {"available": False, "reason": str(e)}
    finally:
        try:
            db.close()
        except Exception:
            pass


def bucket_calibration(runs: list[dict]) -> dict:
    buckets: dict[str, dict] = defaultdict(lambda: {"grounded": [], "hallucinated": [], "n": 0})
    for r in runs:
        b = M.confidence_bucket(r.get("confidence"))
        if b is None:
            continue
        buckets[b]["n"] += 1
        if r.get("grounded_ratio") is not None:
            buckets[b]["grounded"].append(r["grounded_ratio"])
        if r.get("hallucinated") is not None:
            buckets[b]["hallucinated"].append(r["hallucinated"])
    out = {}
    for label, _, _ in M.CONFIDENCE_BUCKETS:
        d = buckets.get(label, {"grounded": [], "hallucinated": [], "n": 0})
        out[label] = {
            "n": d["n"],
            "mean_grounded_ratio": M.mean(d["grounded"]),
            "mean_hallucinated": M.mean(d["hallucinated"]),
        }
    return out


def _monotonic_verdict(calib: dict) -> str:
    """Do non-empty buckets show grounded-ratio rising with confidence?"""
    points = [(label, calib[label]["mean_grounded_ratio"])
              for label, _, _ in M.CONFIDENCE_BUCKETS
              if calib[label]["n"] > 0 and calib[label]["mean_grounded_ratio"] is not None]
    if len(points) < 2:
        return ("VERDICT: not enough data across confidence buckets to judge "
                "calibration yet — run more evaluations.")
    rising = all(points[i][1] <= points[i + 1][1] + 1e-9 for i in range(len(points) - 1))
    falling = all(points[i][1] >= points[i + 1][1] - 1e-9 for i in range(len(points) - 1))
    lo, hi = points[0][1], points[-1][1]
    if rising and hi > lo:
        return ("VERDICT: computed confidence CORRELATES with grounded ratio "
                f"(rises {lo:.2f} → {hi:.2f} across buckets).")
    if falling and hi < lo:
        return ("VERDICT: computed confidence INVERSELY correlates with grounded "
                f"ratio ({lo:.2f} → {hi:.2f}) — investigate the confidence formula.")
    return ("VERDICT: computed confidence does NOT cleanly correlate with grounded "
            "ratio across buckets — the signal is noisy on the current data.")


def build_report() -> dict:
    runs = load_all_runs()
    calib = bucket_calibration(runs)
    votes = debate_agreement()
    return {
        "n_runs": len(runs),
        "n_scored_runs": sum(1 for r in runs if r.get("confidence") is not None),
        "buckets": calib,
        "debate_votes": votes,
        "verdict": _monotonic_verdict(calib),
    }


def _print_report(report: dict) -> None:
    print("=" * 66)
    print("POLYNOUS CONFIDENCE CALIBRATION")
    print("=" * 66)
    print(f"Runs analysed: {report['n_runs']} "
          f"({report['n_scored_runs']} with a computed confidence)\n")
    print(f"{'Bucket':>8} | {'N':>4} | {'Mean grounded':>13} | {'Mean halluc.':>12}")
    print("-" * 48)
    for label, _, _ in M.CONFIDENCE_BUCKETS:
        b = report["buckets"][label]
        g = "—" if b["mean_grounded_ratio"] is None else f"{b['mean_grounded_ratio']:.3f}"
        h = "—" if b["mean_hallucinated"] is None else f"{b['mean_hallucinated']:.2f}"
        print(f"{label:>8} | {b['n']:>4} | {g:>13} | {h:>12}")

    v = report["debate_votes"]
    print()
    if not v.get("available"):
        print(f"Debate votes: unavailable ({v.get('reason','')})")
    elif v.get("total_votes", 0) == 0:
        print("Debate votes: none recorded yet (judge-agreement not measurable).")
    else:
        print(f"Debate judge-agreement: {v['agreement_rate']:.1%} "
              f"across {v['total_votes']} vote(s).")

    print("\n" + report["verdict"])
    print("=" * 66)


def main() -> int:
    report = build_report()
    _print_report(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
