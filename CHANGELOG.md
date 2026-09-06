# POLYNOUS — Changelog

A running log of changes, grouped by version. Newest first. "Shipped" = in the
code; caveats note anything that still needs a live/runtime check (the Railway
backend has been offline during this work, so backend behaviour is unit-tested
and compile-verified but not yet exercised end-to-end in production).

---

## [Unreleased] — Interactive report actions: debate, perspective, cross-exam, replay, share, chain-of-research

### Research report
- **Debate against this report** — a floating "Debate report" dock action opens a
  devil's-advocate rebuttal grounded strictly in the report's own material.
  Optional user counter-argument, returns counter-thesis + 3-4 numbered points
  + weakest-link + steelman. Backed by new `POST /report/debate-against`.
- **View from another perspective** — six lenses (skeptic, contrarian, futurist,
  practitioner, historian, ethicist) reframe the same evidence. Returns a
  headline, reframe paragraph, accepts / objects-to bullets, and the question
  the lens would ask next. Backed by new `POST /report/perspective`.
- **Chain-of-research** — the same dock offers one-click follow-up queries
  derived from the report's own findings, boundaries and query. Clicking one
  launches a fresh research run via the `onRunQuery` prop (falls back to
  `/?q=...` navigation).

### Debate report
- **Live cross-examination** — user poses a question, both advocates answer in
  character, the judge scores 0-10 with a one-line reason. Threaded UI stacks
  each round. Backed by new `POST /debate/cross-exam`.
- **Replay with time-scrubber** — scrub through opening -> rebuttal -> verdict
  turns; a clash meter shows momentum node-by-node, per-turn text panel slides
  in with each stage. Fully client-side, works on any completed debate.
- **Share the verdict** — canvas-generated 1200x630 verdict card (topic,
  verdict badge, score line, clash meter) with a Save-PNG button and a
  copy-summary fallback. Theme-aware (light/dark). Fully client-side.

### Backend
- New router `app/routes/report_actions.py`, wired into `main.py`. Three
  endpoints: `POST /report/debate-against`, `POST /report/perspective`,
  `POST /debate/cross-exam`. Reuses `report_chat._resolve_user_key` and
  `_build_context`, so it is strictly BYO-key, provider-agnostic and grounded
  in the caller-supplied report/debate context (no new web fetches).

### UX
- Dock floats bottom-right, opens with a subtle spring, hidden in print
  (`data-print-hide`). Modals: backdrop blur, spring easing, escape-to-close,
  scroll-locked while open. Editorial serif titles, mono kickers, warm/cool
  accents so counter-cases and lenses read as visually distinct actions.

### Caveats
- All three LLM endpoints need a live BYO-key run to confirm answer quality
  (backend + provider offline during development). Client-side share card and
  replay scrubber verified in dev preview.

---

## [Unreleased] — Print, provenance and rail fixes

### Print (global)
- **Full-report print output** — the outer `100vh, overflow:hidden` shell was
  clipping every printout to the current viewport. Added `frontend/src/print.css`
  (loaded from `main.jsx`) that forces the app-shell containers open in
  `@media print`, so both the research and debate reports print end to end.
- **Chrome removed from print**: sidebar, globe, neural canvas, sensitivity
  slider control, hovercard, toolbar (View Live Engine / New Debate / Export
  JSON — now tagged `.debate-report-toolbar[data-print-hide]`), and every
  `.print-hide` marker.
- **Debate toolbar** in `DebateInterface.jsx` marked `data-print-hide`.

### Pipeline provenance
- **Removed** the hardcoded `Input · Search · Summarise · Critic · Evidence · Synthesis · Insights`
  chip row — it looked like broken navigation because none of it was clickable
  or reflected the real run.
- **Rebuilt** the provenance list to render each real telemetry step with a
  step number, name and token count. Honest empty-state message when a run
  didn't emit per-step telemetry.

### Side rail
- **Peek-to-expand** behaviour: the rail is collapsed by default (only the
  edge markers + a subtle vertical hairline show), and slides in from the right
  with a spring-eased 420ms animation on hover or focus. The `ON THIS PAGE`
  eyebrow and labels fade in after the slide completes.

### Caveats
- Print CSS verified via CSS rule matching (dev preview pane renders at 0×0
  so visual QA isn't possible there). Try a real Save-as-PDF against
  `/debate-report-preview` or a live run to confirm.

---

## [Unreleased] — Debate report substantive UI + minimalist free-key card

### Debate report
- **Evidence & grounding** rebuilt as a head-to-head visual: per-metric bars,
  a winner tag on every row (`SUPPORTING ↑` / `COUNTER ↑` / `EVEN`), grounding
  shown as both fraction and percent, and an overall "who wins on measured
  evidence" banner at the bottom (with the note that argument-quality can still
  swing the final verdict).
- **Sensitivity analysis** made truly interactive: dragging the slider now live-
  updates the evidence/quality weight labels, both per-side scores (out of 10)
  with animated bars, the big "resulting lean" figure, the lean bar with a
  midline flip-marker, and a colour-coded status flag (Stable/Marginal/Fragile/
  Flipped) with plain-English text including *where* the verdict flips. Fires an
  initial `pnbSens(50)` on mount so the flag reflects real state on first paint.
- **Tribunal integrity** rebuilt as a real dashboard: a computed A/B/C/D grade
  + Integrity Index (0-100) from four equal-weighted hard checks (scored on real
  rubric · no hallucinations · grounding coverage · judge certainty), each with
  a coloured left border, metric value, and detailed explanation. Framing check
  + Steelman still surface on the right when the judge emits them.

### Settings
- Free-key card redesigned: minimalist, editorial, theme-token driven. Removed
  the gradient background, glow shadow, and chunky progress bar. Now a single
  bordered card with three stat blocks (`runs left today`, `days remaining`,
  `total runs left`), a pulsing status dot, and a hairline daily-usage meter.

### Caveats
- Debate report changes verified on the /debate-report-preview demo (rubric shows
  4 rows with winner tags, integrity grade badge renders, sensitivity slider
  live-updates through 0-50-100 with the correct flip detection). Free-key card
  needs a live-backend run to visually QA in its real setting.

---

## [Unreleased] — Semantic search Phase 2: answer synthesis + gap detection

### Added
- **Grounded answer synthesis** (`backend/app/services/search_intel.py`,
  `GET /search/synthesize`). After a search, the model writes a 2-4 sentence
  answer STRICTLY from the user's own top results, citing their past entries as
  `[n]`. Frontend shows a "Synthesis from your research" card above the
  constellation; clicking a `[n]` opens that entry. Best-effort, uses the user's key.
- **Research gap detection** (`GET /search/gaps`). Clusters the user's corpus
  (reusing `cluster_research`) and has the model surface 3 gaps: connections
  between clusters they've researched separately but never together, and
  under-explored sub-questions — each with a concrete suggested query. Frontend
  adds a "Find gaps in my research" button + a gaps panel in the idle state, with
  one-click "search it" or "Research/Debate it" actions. Needs ≥ 4 entries.

### Caveats
- Both call the user's LLM key and need a live run to confirm synthesis quality
  and gap usefulness (backend + Pinecone offline during development). Fallbacks
  return empty-but-valid payloads so the UI never breaks. `/search` is auth-gated,
  so the new UI wasn't visually QA'd yet.

---

## [Unreleased] — Semantic search Phase 1: HyDE + hybrid retrieval

### Added
- **HyDE (Hypothetical Document Embeddings)** in `backend/app/semantic_search.py`.
  Short queries (≤ 8 words) are expanded by the model into one dense factual
  sentence; the query **plus** that sentence is embedded, so a bare 2-word query
  retrieves far better. Best-effort: falls back to the raw query on any failure,
  for long/specific queries, or when `SEARCH_HYDE=0`.
- **Hybrid retrieval (dense ⊕ lexical, RRF)**. Dense Pinecone candidates are
  over-fetched (≥ 4×) and fused with a lightweight BM25-ish lexical ranking over
  the **original** query via Reciprocal Rank Fusion, then diversified with the
  existing MMR pass. Recovers exact terms, acronyms and proper names that pure
  vector search blurs. Verified: lexical scorer (0.8 vs 0.0 on term match) and
  RRF ordering unit-tested.
- **Suggestions in Neural Semantic Search** (`frontend/src/components/SemanticSearchPage.jsx`):
  new **Recent** (per-browser, deduped, capped at 8) and **For you** (from the
  user's onboarding interests) chip rows, above the existing rotating **Explore**
  chips. Theme-aware.

### Config
- `SEARCH_HYDE` (default `1`) — set `0` to disable HyDE.

### Caveats
- Needs a live run to confirm HyDE answer quality and end-to-end ranking (backend
  offline during development).

---

## [prior work this cycle] — Free key, rate limits, theming, reports

### Free API key
- **Instant free key**: a signed-in user with no key is auto-provisioned a pooled
  starter key on their first run (research, debate, and legacy `/ask`), instead
  of an "add your key" error.
- **Shared-key model**: the single `FREE_KEY` is now shared across all users
  (rate-limited per user) instead of being consumed by the first claimer.
- **Daily cap**: free key limited to `FREE_TRIAL_DAILY_RUNS` (default **3**) runs
  per day, resets at UTC midnight, without ending the trial. Surfaced in the
  Settings banner and the active-key card.
- **Switching to your own key** ends the trial, drops the pooled key, and makes
  your key active; a guard in `enforce()` never rate-limits a user on their own key.
- **Gemini** is the free provider: `FREE_KEY_PROVIDER=google`, friendly label
  "Gemini" everywhere; explicit "Free Gemini key active" display in Settings.

### Abuse protection
- Per-IP rate limits on auth: **register 5/hour**, **login 10/5 min** (429 +
  Retry-After).

### UX
- Redesigned the free-key welcome modal (`TrialWelcome.jsx`): minimalist, premium,
  theme-aware, correct "3 runs/day" copy.

### Theming
- Light/dark theme system: `theme.css` (scoped `[data-theme]` tokens), no-flash
  boot, `ThemeProvider` + `ThemeToggle`, applied across the app shell and both
  reports. Marketing/landing pages intentionally stay dark. (Some gradient-heavy
  functional pages still need a polish pass.)

### Reports (research + debate)
- Debate report given its own identity (Debate Chamber palette), real argument
  points + rebuttals, real sensitivity recompute, tribunal integrity checks,
  fixed `[object Object]`, cost, vote persistence, cross-exam + fallacy audit
  (backed by a new backend analyst).
- Research report: unique per-topic evidence-per-year chart, richer evidence /
  source-quality / confidence sections, grounded local "interrogate" fallback,
  premium light-paper PDF, public no-sign-in share links (`/r/:id`, `/d/:id`).
