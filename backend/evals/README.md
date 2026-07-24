# POLYNOUS Evaluation Harness

Measures whether the research pipeline's claims are actually true, and whether
its **computed confidence** predicts answer quality. Every number produced here
is derived mechanically from pipeline output — there are no LLM judges and no
fabricated values. Where something can't be measured, it reports `—`, not a guess.

## What it measures

For each question, run through the **real** compiled LangGraph pipeline
(`app/graph/orchestrator.py`), computed from the outputs:

| Metric | Meaning |
|--------|---------|
| `sources_retrieved` | documents the search agent returned |
| `distinct_domains` | independent domains among those sources |
| `citation_density_per_100w` | **valid** `[n]` markers per 100 answer words |
| `hallucinated_citations` | `[n]` markers pointing at a source index that was never retrieved — the core honesty check |
| `grounded_ratio` | share of substantive sentences carrying a `[n]` citation |
| `computed_confidence` + `confidence_breakdown` | the 4-factor score from `app/utils/computed_confidence.py` |
| `critique_parse_success` | did the critic return valid JSON |
| `stage_latency` / `total_latency` | per-node and end-to-end timing (from LangGraph `stream_mode="debug"`) |

The citation/grounding regexes deliberately mirror `computed_confidence.py` and
`visual/builder.py`, so the harness measures the same thing the product shows users.

### Expectation checks

`eval_set.json` holds **25 questions across 5 categories** (factual, contested,
recent-events, technical, ambiguous). Each carries `expected_properties` encoding
what an honest pipeline should exhibit — e.g. `should_find_disagreement: true` for
contested topics, `expect_low_confidence: true` + `expect_coverage_gaps: true` for
deliberately ambiguous prompts. These are **behavioural** expectations, not
ground-truth answers: the pipeline is a source organiser, not an oracle.

### Baseline comparison

With `--baseline`, each question is also answered by a **single direct LLM call**
(no retrieval, no agents) and measured with the same text metrics. Since the
baseline has zero retrieved sources, any `[n]` it emits counts as hallucinated —
which is exactly the failure mode the multi-agent pipeline exists to avoid.

## Running

Per project security policy, LLM calls **never** fall back to an environment key —
you must pass `--api-key` explicitly. (Tavily web search stays system-managed, as
everywhere in the app.)

```bash
cd backend

# quick smoke run — first 3 questions
python -m evals.run_eval --api-key sk-ant-... --limit 3

# full set with the direct-LLM baseline for comparison
python -m evals.run_eval --api-key sk-ant-... --baseline

# a single category, a different provider/model
python -m evals.run_eval --api-key sk-... --provider openai --model gpt-4o-mini --category contested
```

Each run writes two files to `evals/results/`:

- `<timestamp>.json` — machine-readable, consumed by `GET /evals/summary` and `calibration.py`
- `<timestamp>.md` — human-readable pipeline-vs-baseline table

## Calibration

After you've accumulated some result files:

```bash
cd backend
python -m evals.calibration
```

This buckets every past run by computed confidence (0-40 / 40-60 / 60-80 / 80-100),
reports the mean grounded ratio per bucket, folds in the real judge-agreement rate
from the `debate_votes` table, and prints a one-line honest verdict —
"confidence CORRELATES / does NOT correlate with grounded ratio" — or, if the data
is too thin, says so instead of inventing a correlation.

## Where it surfaces

`GET /evals/summary` (auth-gated) serves the latest results file. The **Evaluation**
card on the Neural Analytics dashboard renders that summary, or an explicit
"No evaluation runs yet" empty state when `results/` is empty. No fabricated numbers,
ever.

## Files

- `eval_set.json` — the 25-question set
- `metrics.py` — mechanical metric computation (shared)
- `run_eval.py` — CLI runner
- `calibration.py` — confidence-vs-outcome calibration
- `results/` — output (gitignored except `.gitkeep`)
