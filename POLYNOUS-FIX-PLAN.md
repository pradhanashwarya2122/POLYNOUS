# POLYNOUS — Fix & Enhancement Plan

> Master task list compiled from the walkthrough. Hand me tasks **by ID** (e.g. "do DBT-03, DBT-04") and I'll implement them one batch at a time.

## ✅ IMPLEMENTATION STATUS — ALL PHASES COMPLETE

Every task below is implemented and builds clean. Scoring/confidence/critic logic was verified against the real OpenAI key and deterministic tests.

| ID | Task | Status |
|----|------|--------|
| DBT-01 | Advocate real scores + grounded/fabricated | ✅ Evidence Ledger; verified live |
| DBT-02 | Citation chips clickable → source | ✅ |
| DBT-03 | Full-width on sidebar collapse | ✅ |
| DBT-04 | 100% finalizing loader | ✅ (debate + research) |
| DBT-05 | Framing alternatives clickable → re-run | ✅ |
| DBT-06 | Steelman font enlarged | ✅ |
| DBT-07 | Supporting/Counter sizing normalized | ✅ |
| DBT-08 | Split oversized points | ✅ unit-tested |
| DBT-09 | Clash Meter redesign | ✅ |
| DBT-10 | Judge's Lens works | ✅ CORS root-cause fix |
| DBT-11 | "What flips this" slider real | ✅ |
| DBT-12 | Cross-examination works | ✅ |
| DBT-13 | Join the Debate works | ✅ |
| DBT-14 | Telemetry before follow-ups | ✅ |
| DBT-15 | Judge Track Record | ✅ wired end-to-end |
| DBT-16 | Agree/Disagree vote | ✅ wired end-to-end |
| DBT-17 | Global debate typography | ✅ |
| RES-01 | Latest sources openable | ✅ |
| RES-02 | Context-depth graph clickable | ✅ |
| RES-03 | Key Insights overflow | ✅ |
| RES-04 | Source-backed graphs clickable | ✅ |
| RES-05 | Critique completeness | ✅ landscape/insight/gap; verified |
| RES-06 | Draft ↔ report parity | ✅ verified same source (presentational only) |
| RES-07 | Contradiction analysis | ✅ |
| RES-08 | different_scope humanized | ✅ |
| RES-09 | Faithfulness flagged | ✅ |
| RPT-01 | Low-confidence nag rare | ✅ |
| RPT-02 | Trajectory formatting | ✅ (bold render) |
| RPT-03 | Chat with report works | ✅ never-disabled + premium |
| RPT-04 | Confidence provenance premium | ✅ interactive |
| RPT-05 | Confidence computation | ✅ calibration-tested |
| RPT-06 | Contradiction resolution structure | ✅ unit-tested |
| RPT-07 | Source Quality detailed | ✅ per-source cards + tiers |
| RPT-08 | Consensus/Divergence | ✅ collapsible + formatted |
| RPT-09 | Source Intelligence detailed | ✅ per-source rows + links |
| RPT-10 | Executive Summary hero | ✅ |

Original spec follows below.

## Global principles (apply to every task below)
- **G1 — Real, not fake:** Every score, count, and metric must be computed from actual data (sources, LLM output, retrieval). No hard-coded, random, or "for-show" values anywhere.
- **G2 — Clickable citations:** Any citation / source reference must be a real link that opens in a **new tab** (`target="_blank" rel="noopener"`).
- **G3 — Full-bleed layout:** Debate & Research chambers must expand edge-to-edge (extreme left to extreme right). Collapsing the sidebar must make the content area grow to fill the freed space, never shrink to a narrow column.
- **G4 — Readable, premium typography:** No tiny/illegible text. Consistent font scale. Break long blobs into digestible points. Nothing should look "cheap" or "gimmicky."
- **G5 — Honest loading states:** Any long/period-ending-at-100% process shows a live loading animation so the user never wonders whether it's working.

---

## SECTION A — DEBATE CHAMBER / DEBATE ENGINE

### A1. Advocate evidence & scoring (grounded vs hallucinated) — `DBT-01`
- For **both** FOR-advocate and AGAINST-advocate, clearly display:
  - Sources cited (as clickable links, per G2).
  - **How many are grounded** vs **how many are hallucinated** (real counts).
  - The **score for each advocate**, computed factually (from grounding/rubric), **not hard-coded or random**.
- Acceptance: numbers change with the actual debate content; a fabricated citation is counted as hallucinated; scores are reproducible from the underlying data.

### A2. Citations-per-paragraph graph is interactive — `DBT-02`
- The "citations per paragraph" chart: on hover, allow **click → open the cited link** (new tab).
- Acceptance: hovering shows the source; clicking navigates to the real URL.

### A3. Full-width debate area — `DBT-03`
- Debate engine must span full viewport width. When the sidebar is collapsed, the debate area **expands** to fill it (currently it goes minimal/narrow — wrong).
- Acceptance: at collapsed-sidebar, content uses the full width with no dead gutter.

### A4. Progress loading animation — `DBT-04`
- Where progress reaches 100% (and during the run), add a clear **loading animation** so the state is obvious.
- Acceptance: user always sees motion/feedback while work is in progress.

### A5. Framing Check → "Alternative framing" formatting + navigation — `DBT-05`
- Format the **Alternative Framing** section properly. Each alternative-framing point must be **clickable** and take the user to that specific framing approach (actually implemented, not a dead link).
- Acceptance: points are structured, legible, and each navigates to its framing view.

### A6. Steelman Check readability — `DBT-06`
- Font style/size in **Steelman Check** is far too small / invisible. Enlarge (likely enlarge the whole component/board).
- Acceptance: comfortably readable at normal zoom.

### A7. Supporting & Counter point sizing — `DBT-07`
- In **Supporting & Counter**, point text sizing is inconsistent (some tiny, some huge) and unreadable. Normalize to one good font style/size.
- Acceptance: uniform, readable typography across all points.

### A8. Split oversized argument points — `DBT-08`
- "Encounter 1 / Encounter 2" (counter) point text is far too long/big. Devise a method to **split long points into sub-points** based on how much text a single point contains, using one consistent font size/style.
- Acceptance: long arguments are broken into readable bullet sub-points automatically.

### A9. Clash Meter redesign — `DBT-09`
- The **Clash Meter** looks cheap/gimmicky. Redesign to premium (real value-driven, tasteful animation).
- Acceptance: reads as a polished, data-backed component.

### A10. Judge's Lens personas actually work — `DBT-10`
- Clicking **Impartial Economist / [Assist] / Pragmatist** currently fails with "can't reach the server." It must **re-run/re-score the judgment through that persona lens** and update the verdict.
- Acceptance: each lens produces a distinct, real re-judgment; no connection error.

### A11. "What flips this?" slider is functional — `DBT-11`
- Currently hard-coded and "just for show" — adjusting it changes nothing. Make it **actually recompute** the flip threshold/outcome as the user scrubs.
- Acceptance: moving the slider changes the displayed outcome based on real logic.

### A12. Cross-examination works — `DBT-12`
- Currently "can't reach the server." Restore/enforce functionality (worked earlier).
- Acceptance: cross-examination runs and returns real content.

### A13. Join the Debate (user-supplied points) — `DBT-13`
- Currently always broken. When a user submits their own supporting/counter text, it should **re-run the debate engine WITHOUT scraping the web** — reuse existing sources, spend only slight LLM/API cost.
- Acceptance: user points are incorporated; a new debate pass runs with no web-scrape; cost is minimal.

### A14. Telemetry placement — `DBT-14`
- The **real usage / run telemetry** panel should appear **at the end, before the follow-up questions** section.
- Acceptance: ordering is telemetry → follow-ups.

### A15. Judge Track Record works — `DBT-15`
- Currently non-functional. Make it show a real track record.
- Acceptance: displays actual historical judging data.

### A16. Agree / Disagree works — `DBT-16`
- The agree/disagree controls don't work. Wire them to real behavior.
- Acceptance: interactions register and have an effect.

### A17. Global debate typography pass — `DBT-17`
- Fonts across the debate chamber are too small and the whole thing "looks cheap." Do a consistent premium typography/spacing pass (umbrella over A6/A7/A8).

---

## SECTION B — RESEARCH CHAMBER

### Search Agent (Neural Search Engine)
### B1. Latest sources are openable — `RES-01`
- In **Latest Sources**, the user can't see/reach the source links. On hover, show an **open-link** option; make each source clickable (new tab).
- Acceptance: every latest source exposes its real URL and opens it.

### B2. "Context depth per source" graph clickable — `RES-02`
- That graph should be **clickable**, opening/expanding to show the details behind each bar/point.
- Acceptance: clicking a graph element reveals real per-source detail.

### Summarise Agent
### B3. Key Insights overflow — `RES-03`
- Text is **overflowing** in "Key Insights Extracted." Fix containment/wrapping.
- Acceptance: no clipped/overflowing text at any width.

### B4. All graphs clickable — `RES-04`
- Every generated graph in the Research chamber must have a **clickable** affordance (drill-down/detail or source link).
- Acceptance: no purely-decorative charts; each responds to click.

### Critique Agent
### B5. Critique Agent completeness — `RES-05`
- The Critique Agent is **missing essential components**; build them out to **fill the whole card** with real critique content.
- Acceptance: card is complete, substantive, and data-backed.

### Writer Agent
### B6. Draft ↔ Report parity — `RES-06`
- The Writer Agent's **"current draft" doesn't match** what the final report shows. Make them consistent (same content/source of truth).
- Acceptance: draft reflects the report (or is clearly the same pipeline output).

### Cross-cutting analysis panels
### B7. Contradiction analysis works — `RES-07`
- Contradiction analysis doesn't work properly. Fix it end-to-end.

### B8. `different_scope` clarified — `RES-08`
- The `different_scope` indicator "shows something" unclear — define, label, and render it meaningfully.

### B9. Faithfulness "Other flagged statements" — `RES-09`
- In **Faithfulness Analysis**, "Other flagged statements" shows **"no signal data yet"** and doesn't work. Wire it to real faithfulness signals.
- Acceptance: flagged statements populate from actual analysis.

---

## SECTION C — RESEARCH REPORT

### C1. Reduce low-confidence fallback frequency — `RPT-01`
- The scenario "**answer's confidence 53% is below your 86% threshold… treat as a lead, not a conclusion… consider a follow-up**" happens too often. Make it happen **much less** (revisit confidence computation and/or threshold defaults so genuine results aren't penalized).
- Acceptance: well-sourced answers clear the threshold; the warning is rare and justified.

### C2. Research Trajectory formatting — `RPT-02`
- "Where to go next" / Research Trajectory text is **unformatted**. Format into clean, structured steps.

### C3. Chat with report works — `RPT-03`
- "Chat with [report]" (currently disabled/broken) must **actually work**.
- Acceptance: user can ask follow-up questions grounded in the report.

### C4. Confidence Provenance premium redesign — `RPT-04`
- Looks cheap → make **premium**.

### C5. Confidence Analysis correctness — `RPT-05`
- Doesn't work well → fix computation + presentation.

### C6. Contradiction Resolution formatting — `RPT-06`
- **Claim A / Claim B** etc. are just **dumped as raw text**. Parse and format into a clear, structured layout.

### C7. Source Quality Assessment — `RPT-07`
- Looks **raw**; make it **more detailed** and well-formatted.

### C8. Consensus Map & Divergence Map — `RPT-08`
- Both render poorly → enhance content + presentation (builds on the new expandable-card treatment).

### C9. Source Intelligence — `RPT-09`
- "Isn't working that good" → enhance this section.

### C10. Executive Summary as the hero — `RPT-10`
- Should be the **highlight of the page**: premium, designed, not "pasted/dumped" text.
- Acceptance: visually leads the report; reads as authored, not raw.

---

## Cross-reference: recurring themes
- **Real scoring / no fakes:** DBT-01, DBT-11, DBT-15, RPT-01, RPT-05.
- **Clickable links / graphs (new tab):** DBT-02, RES-01, RES-02, RES-04, RPT (citations throughout).
- **Broken backend calls to restore:** DBT-10, DBT-12, DBT-13, RPT-03 (likely shared auth/provider/route root cause — investigate together).
- **Typography / readability:** DBT-06, DBT-07, DBT-08, DBT-17, RES-03, RPT-02, RPT-06.
- **Premium redesign:** DBT-09, RPT-04, RPT-07, RPT-08, RPT-09, RPT-10.
- **Layout full-bleed:** DBT-03 (and verify Research chamber too).

---

## Suggested execution order (by phase)

**Phase 1 — Make the broken things work (highest user impact):**
DBT-10, DBT-12, DBT-13, RPT-03 (shared "can't reach server" root cause) → DBT-16, DBT-15, RES-07, RES-09.

**Phase 2 — Real data / scoring integrity:**
DBT-01, DBT-11, RPT-01, RPT-05, RES-06, RES-08.

**Phase 3 — Interactivity (clickable links & graphs):**
DBT-02, RES-01, RES-02, RES-04.

**Phase 4 — Layout & feedback:**
DBT-03, DBT-04, DBT-14, RES-03.

**Phase 5 — Typography & point-splitting:**
DBT-06, DBT-07, DBT-08, DBT-17, RPT-02, RPT-06.

**Phase 6 — Premium redesigns:**
DBT-09, DBT-05, RES-05, RPT-04, RPT-07, RPT-08, RPT-09, RPT-10.

> Tell me which phase or which IDs to start with and I'll implement that batch, verify it, and report back.
