# POLYNOUS — Changelog

A running log of changes, grouped by version. Newest first. "Shipped" = in the
code; caveats note anything that still needs a live/runtime check (the Railway
backend has been offline during this work, so backend behaviour is unit-tested
and compile-verified but not yet exercised end-to-end in production).

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
