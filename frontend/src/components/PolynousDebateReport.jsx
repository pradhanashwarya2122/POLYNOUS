// ─────────────────────────────────────────────────────────────────────────────
// PolynousDebateReport — the debate equivalent of PolynousReport, in the same
// editorial "dossier" language (near-navy paper, hairlines + whitespace,
// Bricolage titles, numbered mono eyebrows, thin bars). Debate palette: FOR is
// mint, AGAINST is crimson, the judge is the neutral hairline.
//
// Reuses the shared .rp-* design system (ensureReportStyles) + a small .dbr-*
// block for the debate-specific pieces. Rendered as an HTML string so the
// citation chips, sensitivity slider, vote and export handlers stay lightweight.
//
// Props: result (the debate result object), activeTopic (the proposition).
// No props → built-in demo (used by /debate-preview for local design work).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { ensureReportStyles } from "./PolynousReport";
import { API_BASE_URL } from "../config";
import SideRail from "./react-bits/SideRail";
import DebateActions from "./DebateActions";

/* ---------- helpers (shared idiom with the research report) ---------- */
const pick = (...v) => { for (const x of v) if (x !== undefined && x !== null && x !== "") return x; return undefined; };
// Coerce any value to text, so an object field never renders as "[object Object]".
const flat = (s) => {
  if (s == null) return "";
  if (typeof s === "string") return s;
  if (typeof s === "number" || typeof s === "boolean") return String(s);
  if (Array.isArray(s)) return s.map(flat).filter(Boolean).join(". ");
  if (typeof s === "object") return flat(s.text ?? s.value ?? s.reasoning ?? s.note ?? s.position ?? s.argument ?? s.summary ?? s.content ?? s.label ?? "");
  return String(s);
};
const esc = (s) => flat(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{2300}-\u{23FF}]/gu;
const stripEmoji = (s) => flat(s).replace(EMOJI_RE, "").replace(/—/g, ", ").replace(/[ \t]{2,}/g, " ").trim();
const cite = (s) => esc(s).replace(/\[(\d+)\]/g, '<a class="rp-cite" role="button" tabindex="0" onclick="pnbCite(this)" data-n="$1">[$1]</a>');
const pct = (n) => Math.max(0, Math.min(100, Math.round(n || 0)));
const fmtDate = (d) => { try { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(); } catch { return "21 AUG 2026"; } };
const eye = (n, t) => `<div class="rp-shead" id="dbr-sec-${n}" style="scroll-margin-top:20px"><span class="rp-snum">${n}</span><h2 class="rp-stitle">${t}</h2><span class="rp-shline"></span></div>`;
const bar = (p, tone) => `<span class="rp-bar"><i style="width:${pct(p)}%${tone ? `;background:var(--${tone})` : ""}"></i></span>`;

/* ---------- demo debate (for /debate-preview) ---------- */
const DEMO = {
  activeTopic: "Should we colonize Mars, or fix Earth first?",
  result: {
    verdict: {
      winner: "FOR", for_score: 7.6, against_score: 6.3, margin: "Clear", judge_certainty: 78,
      scoring: "50% measured evidence + 50% argument quality",
      reasoning: "The FOR case rests on stronger empirical grounding, citing concrete mission milestones and the strategic value of a multi-planetary backup [1][3]. The AGAINST case raises valid resource-allocation concerns but leans more on principle than on evidence. On balance the evidence favours pursuing both in parallel, with a measured lead for continued Mars investment.",
      strongest_point: "A self-sustaining off-world settlement is the only known hedge against a planet-wide catastrophe, a risk with low probability but unbounded cost.",
      rubric_for: { distinct_sources_cited: 4, grounded_sentences: 9, sentences: 13, hallucinated_citations: 0, computed_score: 6.4 },
      rubric_against: { distinct_sources_cited: 3, grounded_sentences: 11, sentences: 12, hallucinated_citations: 0, computed_score: 7.4 },
      follow_up_questions: [
        "What share of a national budget is a reasonable ceiling for crewed Mars programs?",
        "Do Mars technologies produce meaningful spillover benefits for Earth?",
        "How do we weigh a low-probability, high-impact extinction risk against present needs?",
      ],
      minority_report: "A minority view holds that framing this as either/or is a false dichotomy, and that the real question is one of sequencing and funding ratios, not exclusivity.",
      framing_check: { verdict: "balanced", note: "The proposition invites a false either/or; both advocates were steered toward the underlying trade-off." },
      steelman: { for: "The strongest FOR case is existential-risk reduction through a multi-planetary backup.", against: "The strongest AGAINST case is the present-day opportunity cost of diverted capital and attention." },
    },
    for_points: [
      "A self-sustaining settlement is a genuine insurance policy against planet-wide catastrophe, from asteroid impact to runaway climate feedbacks [1].",
      "Mars programs have historically produced large spillover benefits for Earth, from materials science to closed-loop life support [3].",
      "The engineering forcing-function of survival on Mars accelerates exactly the sustainability tech Earth needs.",
    ],
    against_points: [
      "Every dollar spent reaching Mars is a dollar not spent on the climate, poverty and health crises already killing people today [2].",
      "No Mars colony is remotely self-sufficient this century, so it cannot serve as a near-term backup.",
      "Terraforming and radiation shielding remain unsolved at scale, making optimistic timelines misleading [4].",
    ],
    for_rebuttal: "The opportunity-cost objection assumes a fixed pie: space budgets are a small fraction of climate spending, and the two agendas share core technologies [3]. Delaying the capability curve does not free those funds for Earth, it simply forfeits the hedge.",
    against_rebuttal: "Shared technology does not justify diverting scarce attention and capital from problems with certain, present-day victims [2]. A hedge against a low-probability event cannot outrank harms that are already measurable and ongoing.",
    citations: [
      { n: 1, url: "https://www.nasa.gov/humans-in-space/" },
      { n: 2, url: "https://www.un.org/sustainabledevelopment/" },
      { n: 3, url: "https://www.jpl.nasa.gov/" },
      { n: 4, url: "https://science.nasa.gov/mars/" },
    ],
    debate: {
      analytics: { rounds: 3, total_citations: 9, distinct_sources: 7, avg_confidence: 0.72 },
      sources: [
        { id: 1, title: "NASA, Humans in Space", url: "https://www.nasa.gov/humans-in-space/", domain: "nasa.gov", trust_score: 0.96, freshness: "current" },
        { id: 2, title: "UN Sustainable Development", url: "https://www.un.org/sustainabledevelopment/", domain: "un.org", trust_score: 0.9, freshness: "current" },
        { id: 3, title: "NASA JPL", url: "https://www.jpl.nasa.gov/", domain: "jpl.nasa.gov", trust_score: 0.94, freshness: "recent" },
        { id: 4, title: "NASA Mars Science", url: "https://science.nasa.gov/mars/", domain: "science.nasa.gov", trust_score: 0.93, freshness: "recent" },
      ],
    },
    telemetry: { total_tokens: 8420, estimated_cost: { total: 0.0132 }, providers: [{ model: "gemini-2.5-flash" }] },
    cross_exam: {
      for_asks: { question: "If a Mars colony cannot be self-sufficient this century, how is it a backup?", answer: "It is a long-horizon hedge: the value is in starting the capability curve now, not in immediate self-sufficiency." },
      against_asks: { question: "Do Mars technologies not also advance Earth sustainability?", answer: "Some do, but the same capital applied directly to Earth problems would advance them faster and with certain beneficiaries." },
    },
    fallacies: {
      for: [{ type: "Appeal to fear", where: "existential-risk framing", note: "Leans on catastrophe salience; the probability is real but unquantified." }],
      against: [{ type: "False dilemma", where: "either/or budget framing", note: "Treats Mars and Earth spending as strictly zero-sum when budgets overlap." }],
    },
    trackRecord: { agreement_rate_with_users: 0.71, sample_size: 128 },
  },
};

/* Split an advocate's prose argument (opening/rebuttal) into discrete points,
   preserving [n] citations. Bullets/newlines first; else sentence-grouped. */
function toPoints(text, cap = 6) {
  const t = stripEmoji(String(text || "")).trim();
  if (!t) return [];
  let parts = t.split(/\n+/).map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter((s) => s.length > 3);
  if (parts.length >= 2) return parts.slice(0, cap);
  const sents = (t.match(/[^.!?]+[.!?]+(?=\s|$)/g) || [t]).map((s) => s.trim()).filter(Boolean);
  if (sents.length <= cap) return sents;
  const per = Math.ceil(sents.length / cap);
  const out = [];
  for (let i = 0; i < sents.length; i += per) out.push(sents.slice(i, i + per).join(" "));
  return out.slice(0, cap);
}

/* ---------- derive view model ---------- */
function deriveDebate(p) {
  const r = p.result || {};
  const v = r.verdict || {};
  const topic = stripEmoji(pick(p.activeTopic, p.topic, DEMO.activeTopic));
  const forScore = Number(pick(v.for_score, 0)) || 0;
  const againstScore = Number(pick(v.against_score, 0)) || 0;
  const winner = String(pick(v.winner, forScore >= againstScore ? "FOR" : "AGAINST")).toUpperCase();
  const total = forScore + againstScore || 1;
  const balance = { a: pct((forScore / total) * 100), b: pct((againstScore / total) * 100) };
  const dbt = r.debate || {};
  const forOpen = stripEmoji(pick(r.for_opening, dbt.for_opening, ""));
  const againstOpen = stripEmoji(pick(r.against_opening, dbt.against_opening, ""));
  const forReb = stripEmoji(pick(r.for_rebuttal, dbt.for_rebuttal, ""));
  const againstReb = stripEmoji(pick(r.against_rebuttal, dbt.against_rebuttal, ""));
  const forPtsRaw = (Array.isArray(r.for_points) ? r.for_points : []).map(stripEmoji).filter(Boolean);
  const againstPtsRaw = (Array.isArray(r.against_points) ? r.against_points : []).map(stripEmoji).filter(Boolean);
  // Backend emits prose turns, not point arrays: fall back to splitting the opening.
  const forPts = forPtsRaw.length ? forPtsRaw : toPoints(forOpen);
  const againstPts = againstPtsRaw.length ? againstPtsRaw : toPoints(againstOpen);
  const sources = Array.isArray(r.debate && r.debate.sources) ? r.debate.sources : (Array.isArray(r.citations) ? r.citations : []);
  const rubF = v.rubric_for || {}, rubA = v.rubric_against || {};
  const cert = pick(v.judge_certainty, 70);
  const ciMargin = winner === "UNSCORED" ? 12 : Math.max(4, Math.round((100 - cert) / 4));
  const model = pick(r.telemetry && r.telemetry.providers && r.telemetry.providers[0] && r.telemetry.providers[0].model, "gemini-2.5-flash");
  const tel = r.telemetry || {};
  return {
    topic, forScore, againstScore, winner, balance,
    margin: pick(v.margin, "-"), certainty: cert,
    scoring: pick(v.scoring, "50% measured evidence + 50% argument quality"),
    reasoning: stripEmoji(pick(v.reasoning, "")),
    strongest: stripEmoji(pick(v.strongest_point, "")),
    forPts, againstPts,
    forRebuttal: forReb, againstRebuttal: againstReb,
    rubF: { sources: pick(rubF.distinct_sources_cited, 0), grounded: pick(rubF.grounded_sentences, 0), sentences: pick(rubF.sentences, 0), hall: pick(rubF.hallucinated_citations, 0), score: pick(rubF.computed_score, forScore) },
    rubA: { sources: pick(rubA.distinct_sources_cited, 0), grounded: pick(rubA.grounded_sentences, 0), sentences: pick(rubA.sentences, 0), hall: pick(rubA.hallucinated_citations, 0), score: pick(rubA.computed_score, againstScore) },
    framing: v.framing_check || null,
    steelman: v.steelman || null,
    minority: stripEmoji(pick(v.minority_report, "")),
    followUps: (Array.isArray(v.follow_up_questions) ? v.follow_up_questions : []).map(stripEmoji).filter(Boolean),
    analytics: (r.debate && r.debate.analytics) || null,
    crossExam: (r.debate && r.debate.cross_exam) || r.cross_exam || v.cross_exam || null,
    fallacies: (r.debate && r.debate.fallacies) || r.fallacies || v.fallacies || null,
    trackRecord: r.trackRecord || r.judge_track_record || (r.debate && r.debate.track_record) || null,
    sources, model,
    tokens: Number(pick(tel.total_tokens, 0)) || 0,
    cost: Number(pick(tel.estimated_cost && (tel.estimated_cost.usd != null ? tel.estimated_cost.usd : tel.estimated_cost.total), tel.cost, 0)) || 0,
    ci: { low: Math.max(0, cert - ciMargin), high: Math.min(100, cert + ciMargin), margin: ciMargin },
    date: fmtDate(new Date()),
    winnerLabel: winner === "FOR" ? "Supporting arguments prevail" : winner === "AGAINST" ? "Counter arguments prevail" : winner === "UNSCORED" ? "Verdict unscored" : "Both sides are balanced",
    winnerTone: winner === "FOR" ? "pos" : winner === "AGAINST" ? "neg" : "warn",
    sourceUrls: (Array.isArray(r.citations) ? r.citations : sources).reduce((m, s, i) => { const n = s.n || s.id || i + 1; if (s.url) m[n] = s.url; return m; }, {}),
  };
}

/* ---------- section builders ---------- */
function sMast(d) {
  return `<header class="rp-masthead rp-rev">
    <div class="rp-brandline"><span class="rp-mark">◆ POLYNOUS</span><span class="rp-dim">DEBATE DOSSIER</span><span class="rp-dim rp-right">${d.date} · JUDGED · ${esc(d.model).toUpperCase()}</span></div>
    <div class="rp-actions">
      <button class="rp-act" onclick="pnbShare()"><span class="rp-act-i">⧉</span> Copy link</button>
      <button class="rp-act rp-act-p" onclick="pnbPdf()"><span class="rp-act-i">⭳</span> Save PDF</button>
    </div>
    <h1 class="rp-query">${esc(d.topic)}</h1>
    <p class="rp-verdict"><span class="rp-acc-t ${d.winnerTone}">${esc(d.winnerLabel)}.</span> A rubric-scored judge weighed evidence and argument quality across both cases.</p>
    <div class="dbr-scorepair">
      <div class="dbr-score pos"><span class="rp-fig rp-count" data-target="${Math.round(d.forScore * 10)}">${d.forScore}</span><span class="dbr-score-l">SUPPORTING · /10</span></div>
      <div class="dbr-clash" title="Evidence balance"><i class="pos" style="width:${d.balance.a}%"></i><b class="neg" style="width:${d.balance.b}%"></b></div>
      <div class="dbr-score neg"><span class="rp-fig">${d.againstScore}</span><span class="dbr-score-l">COUNTER · /10</span></div>
    </div>
    <div class="rp-asof"><div class="rp-asof-line"><span>Judge certainty <b>${d.certainty}%</b></span><span class="rp-asof-sep">·</span><span>Band <b>${d.ci.low} to ${d.ci.high}%</b></span><span class="rp-asof-sep">·</span><span>Margin <b>${esc(d.margin)}</b></span></div></div>
  </header>`;
}

function sVerdict(d) {
  const reason = d.reasoning ? (d.reasoning.match(/[^.!?]+[.!?]+/g) || [d.reasoning]).slice(0, 6).map((s, i) => `<div class="dbr-reason"><span class="rp-num">${i + 1}</span><p>${cite(s.trim())}</p></div>`).join("") : "";
  const strong = d.strongest ? `<div class="dbr-key"><span class="rp-dim">KEY INSIGHT</span><p>${cite(d.strongest)}</p></div>` : "";
  return `<section class="rp-sec rp-rev">${eye("01", "Verdict")}
    <p class="rp-sublede">Scoring basis: ${esc(d.scoring)}.</p>
    <div class="dbr-verdict"><span class="rp-tag ${d.winnerTone}">${esc(d.winner)}</span><h3>${esc(d.winnerLabel)}</h3></div>
    <div class="dbr-reasons">${reason}</div>${strong}</section>`;
}

function sCases(d) {
  const list = (pts, tone) => pts.length
    ? `<ol class="dbr-args">${pts.map((t, i) => `<li class="dbr-arg"><span class="rp-num ${tone}">${String(i + 1).padStart(2, "0")}</span><p>${cite(t)}</p></li>`).join("")}</ol>`
    : `<p class="dbr-arg rp-mut">No arguments recorded.</p>`;
  const col = (label, tone, score, pts, reb) => {
    const rebPts = toPoints(reb, 3);
    const rebBlock = rebPts.length ? `<div class="dbr-reb"><span class="dbr-reb-l ${tone}">Rebuttal, answering the other side</span>${list(rebPts, tone)}</div>` : "";
    return `<div class="dbr-case">
      <div class="dbr-case-h"><span class="dbr-side ${tone}">${label}</span><span class="rp-mono ${tone}">${score}/10</span></div>
      ${bar((score / 10) * 100, tone)}
      <div class="dbr-openlabel rp-dim">Opening argument</div>${list(pts, tone)}${rebBlock}</div>`;
  };
  return `<section class="rp-sec rp-rev">${eye("02", "The cases")}
    <p class="rp-sublede">Each advocate's opening points, then the rebuttal that answered the other side, traceable to the sources they cited.</p>
    <div class="dbr-cases">${col("Supporting", "pos", d.forScore, d.forPts, d.forRebuttal)}${col("Counter", "neg", d.againstScore, d.againstPts, d.againstRebuttal)}</div></section>`;
}

function sRubric(d) {
  // Real, computed per-advocate metrics rendered as a visual head-to-head so
  // the reader can SEE who wins each dimension. Percentages, bars, and a
  // per-row winner tag replace the flat "table of numbers" version.
  const rF = d.rubF, rA = d.rubA;
  const gF = rF.sentences ? (rF.grounded / rF.sentences) * 100 : 0;
  const gA = rA.sentences ? (rA.grounded / rA.sentences) * 100 : 0;
  const sMax = Math.max(Number(rF.sources) || 0, Number(rA.sources) || 0, 1);
  const scoreMax = Math.max(Number(rF.score) || 0, Number(rA.score) || 0, 1);
  const halfBar = (val, max, tone) => `<div class="dbr-rub-bar"><i class="${tone}" style="width:${Math.max(2, Math.min(100, (val / max) * 100))}%"></i></div>`;
  const winnerTag = (fVal, aVal, higherWins = true) => {
    if (fVal === aVal) return `<span class="dbr-rub-win tie">EVEN</span>`;
    const fWins = higherWins ? fVal > aVal : fVal < aVal;
    return `<span class="dbr-rub-win ${fWins ? "pos" : "neg"}">${fWins ? "SUPPORTING" : "COUNTER"} ↑</span>`;
  };
  const row = (label, hint, fVal, fDisp, aVal, aDisp, higherWins, max) => `
    <div class="dbr-rub-row">
      <div class="dbr-rub-metric"><b>${label}</b><span class="rp-dim">${hint}</span></div>
      <div class="dbr-rub-side pos"><span class="dbr-rub-val">${fDisp}</span>${halfBar(fVal, max, "pos")}</div>
      <div class="dbr-rub-verdict">${winnerTag(fVal, aVal, higherWins)}</div>
      <div class="dbr-rub-side neg"><span class="dbr-rub-val">${aDisp}</span>${halfBar(aVal, max, "neg")}</div>
    </div>`;
  const overall = (Number(rF.score) || 0) > (Number(rA.score) || 0) ? "pos" : (Number(rF.score) || 0) < (Number(rA.score) || 0) ? "neg" : "tie";
  const overallTxt = overall === "pos" ? "Supporting wins on measured evidence" : overall === "neg" ? "Counter wins on measured evidence" : "Both sides tied on measured evidence";
  return `<section class="rp-sec rp-rev">${eye("03", "Evidence &amp; grounding")}
    <p class="rp-sublede">The real, computed per-advocate rubric — every number is measured from the arguments and their citations, not the judge's opinion.</p>
    <div class="dbr-rub2">
      <div class="dbr-rub-head">
        <div></div>
        <div class="dbr-rub-hcol pos">Supporting</div>
        <div class="dbr-rub-hcol"></div>
        <div class="dbr-rub-hcol neg">Counter</div>
      </div>
      ${row("Distinct sources cited", "breadth of the evidence base", Number(rF.sources) || 0, `${rF.sources}`, Number(rA.sources) || 0, `${rA.sources}`, true, sMax)}
      ${row("Grounded sentences", "share of claims backed by a citation", gF, `${rF.grounded}/${rF.sentences} <span class="rp-dim">· ${Math.round(gF)}%</span>`, gA, `${rA.grounded}/${rA.sentences} <span class="rp-dim">· ${Math.round(gA)}%</span>`, true, 100)}
      ${row("Hallucinated citations", "fewer is better — cited a non-existent source", Number(rF.hall) || 0, `${rF.hall}`, Number(rA.hall) || 0, `${rA.hall}`, false, Math.max(Number(rF.hall) || 0, Number(rA.hall) || 0, 1))}
      ${row("Computed evidence score", "50% of the final rubric score", Number(rF.score) || 0, `${rF.score}<span class="rp-dim">/10</span>`, Number(rA.score) || 0, `${rA.score}<span class="rp-dim">/10</span>`, true, 10)}
      <div class="dbr-rub-overall ${overall}"><span class="dbr-rub-overall-i">◆</span> <b>${overallTxt}.</b> Argument quality (the judge's 50%) can still swing the final verdict — see Sensitivity analysis below.</div>
    </div></section>`;
}

function sSensitivity(d) {
  // Live "what-if" panel: drag the evidence weight and everything updates —
  // the lean bar, the winner label, the two side scores, and a plain-English
  // interpretation. Includes a flip-point marker so the reader can see how
  // fragile the verdict is at a glance.
  return `<section class="rp-sec rp-rev">${eye("04", "Sensitivity analysis")}
    <p class="rp-sublede">Drag the weight to see how the verdict would change if the judge trusted measured evidence more (or less) than argument quality. A flipped lean means the verdict is fragile to this assumption.</p>
    <div class="dbr-sens2">
      <div class="dbr-sens-head">
        <div class="dbr-sens-legend"><span class="dbr-legdot pos"></span> Evidence <span class="rp-dim">rubric-measured</span></div>
        <div class="dbr-sens-legend"><span class="dbr-legdot neg"></span> Argument quality <span class="rp-dim">judge-graded</span></div>
      </div>
      <div class="dbr-sens-track" role="group">
        <input id="dbr-sens" class="dbr-sens-input" type="range" min="0" max="100" value="50" oninput="pnbSens(this.value)" aria-label="Evidence weight"/>
        <div class="dbr-sens-fill"><i id="dbr-sens-fill" style="width:50%"></i></div>
        <div class="dbr-sens-ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
      </div>
      <div class="dbr-sens-row-w">
        <span class="rp-dim">Evidence weight</span>
        <span class="rp-mono" id="dbr-sens-w">50%</span>
        <span class="rp-dim">Quality weight</span>
        <span class="rp-mono" id="dbr-sens-qw">50%</span>
      </div>

      <div class="dbr-sens-grid">
        <div class="dbr-sens-card pos">
          <div class="dbr-sens-side">Supporting</div>
          <div class="dbr-sens-num pos"><span id="dbr-sens-fscore">${d.forScore}</span><span class="rp-dim">/10</span></div>
          <div class="dbr-sens-bar"><i id="dbr-sens-fbar" class="pos" style="width:${d.forScore * 10}%"></i></div>
        </div>
        <div class="dbr-sens-verdict">
          <span class="rp-dim">RESULTING LEAN</span>
          <div class="dbr-sens-verdict-fig"><span class="rp-fig-s" id="dbr-sens-score">${d.balance.a}%</span></div>
          <span class="rp-dim" id="dbr-sens-toward">toward Supporting</span>
        </div>
        <div class="dbr-sens-card neg" style="text-align:right">
          <div class="dbr-sens-side">Counter</div>
          <div class="dbr-sens-num neg"><span id="dbr-sens-ascore">${d.againstScore}</span><span class="rp-dim">/10</span></div>
          <div class="dbr-sens-bar"><i id="dbr-sens-abar" class="neg" style="width:${d.againstScore * 10}%"></i></div>
        </div>
      </div>

      <div class="dbr-sens-lean">
        <div class="dbr-sens-lean-line">
          <span class="dbr-sens-lean-l pos">Supporting</span>
          <span class="dbr-sens-lean-r neg">Counter</span>
        </div>
        <div class="dbr-sens-lean-bar">
          <div class="dbr-sens-lean-mid"></div>
          <i id="dbr-sens-leanbar" class="pos" style="width:${d.balance.a}%"></i>
        </div>
      </div>

      <div class="dbr-sens-flag pos" id="dbr-sens-flag">
        <span class="dbr-sens-flag-i">✓</span>
        <span class="dbr-sens-flag-t">Stable. The verdict holds across reasonable weightings.</span>
      </div>
    </div></section>`;
}

function sIntegrity(d) {
  // Rebuilt as a real integrity dashboard: an overall grade computed from the
  // four hard checks (rubric-scored, no hallucinations, grounding coverage,
  // judge certainty), plus framing/steelman when the judge supplied them.
  const framing = d.framing ? `<div class="dbr-int-panel"><div class="rp-subh">Framing check</div><p class="dbr-int-p">${esc(stripEmoji(d.framing.note || d.framing.verdict || "The proposition was checked for loaded or false-dichotomy framing."))}</p></div>` : "";
  const steel = d.steelman ? `<div class="dbr-int-panel"><div class="rp-subh">Steelman, both sides</div><div class="dbr-steel"><p><span class="rp-tag pos">FOR</span> ${esc(stripEmoji(d.steelman.for || ""))}</p><p><span class="rp-tag neg">AGAINST</span> ${esc(stripEmoji(d.steelman.against || ""))}</p></div></div>` : "";
  const hall = (Number(d.rubF.hall) || 0) + (Number(d.rubA.hall) || 0);
  const sTot = (Number(d.rubF.sentences) || 0) + (Number(d.rubA.sentences) || 0);
  const gTot = (Number(d.rubF.grounded) || 0) + (Number(d.rubA.grounded) || 0);
  const grounding = sTot ? Math.round((gTot / sTot) * 100) : 0;
  const scored = d.winner !== "UNSCORED";
  const cert = Number(d.certainty) || 0;
  const rows = [
    { ok: scored, weight: 25, label: "Scored on a real rubric", metric: scored ? "PASS" : "UNSCORED",
      note: scored ? "Both sides were scored on measured evidence plus argument quality — no fabricated tie." : "The judge could not score this debate, so the verdict is UNSCORED. Never a made-up result." },
    { ok: hall === 0, weight: 25, label: "Citation integrity", metric: hall === 0 ? "0 flags" : `${hall} flag${hall > 1 ? "s" : ""}`,
      note: hall === 0 ? "No hallucinated citations. Every [n] points to a source that actually exists in the shared evidence pool." : `${hall} hallucinated citation${hall > 1 ? "s" : ""} were flagged and scored zero — the rubric can't be fooled.` },
    { ok: grounding >= 40, weight: 25, label: "Evidence grounding", metric: `${grounding}%`,
      note: `${gTot} of ${sTot} sentences across both sides carry a citation to a real source. ` + (grounding >= 60 ? "Strong grounding — most claims are backed." : grounding >= 40 ? "Moderate — enough of the case is anchored to sources." : "Weak — a lot of the argument was assertion, not evidence.") },
    { ok: cert >= 60, weight: 25, label: "Judge certainty", metric: `${cert}%`,
      note: `Confidence band ${d.ci.low}% to ${d.ci.high}%. ` + (cert >= 75 ? "High conviction in the verdict." : cert >= 60 ? "Moderate conviction." : "Low conviction — treat the verdict as tentative.") },
  ];
  const scorePct = Math.round(rows.reduce((s, r) => s + (r.ok ? r.weight : r.weight * 0.35), 0));
  const grade = scorePct >= 90 ? "A" : scorePct >= 75 ? "B" : scorePct >= 55 ? "C" : "D";
  const gradeTone = scorePct >= 90 ? "pos" : scorePct >= 75 ? "info" : scorePct >= 55 ? "warn" : "neg";
  const checksHtml = rows.map((c) => `
    <div class="dbr-int-check ${c.ok ? "pos" : "warn"}">
      <div class="dbr-int-check-head">
        <span class="dbr-int-check-i">${c.ok ? "✓" : "!"}</span>
        <span class="dbr-int-check-l">${esc(c.label)}</span>
        <span class="dbr-int-check-m rp-mono">${esc(c.metric)}</span>
      </div>
      <p class="dbr-int-check-n">${esc(c.note)}</p>
    </div>`).join("");
  const rightBlocks = [framing, steel].filter(Boolean).join("");
  const rightPane = rightBlocks ? `<div class="dbr-int-right">${rightBlocks}</div>` : "";
  return `<section class="rp-sec rp-rev">${eye("05", "Tribunal integrity")}
    <p class="rp-sublede">The four hard checks that keep the verdict honest, plus a computed integrity grade so nothing is graded on vibes.</p>
    <div class="dbr-int">
      <div class="dbr-int-grade ${gradeTone}">
        <div class="dbr-int-grade-badge"><span class="dbr-int-grade-l">${grade}</span></div>
        <div class="dbr-int-grade-body">
          <div class="dbr-int-grade-idx"><span class="rp-fig-s">${scorePct}</span><span class="rp-stat-l">Integrity index / 100</span></div>
          <p class="rp-cap" style="margin-top:6px">Equal weight to each check: real rubric + no hallucinations + grounding coverage + judge certainty.</p>
        </div>
      </div>
      <div class="dbr-int-body">
        <div class="dbr-int-checks">${checksHtml}</div>
        ${rightPane}
      </div>
    </div></section>`;
}

function sDissent(d) {
  if (!d.minority) return "";
  return `<section class="rp-sec rp-rev">${eye("06", "The strongest dissent")}
    <p class="rp-sublede">Every honest verdict names its best opposing case.</p>
    <div class="rp-dissent"><div class="rp-dissent-h"><span class="rp-tag warn">MINORITY REPORT</span></div><blockquote class="rp-dissent-q">${cite(d.minority)}</blockquote></div></section>`;
}

function sSources(d) {
  if (!d.sources.length) return "";
  const rows = d.sources.map((s, i) => { const n = s.id || s.n || i + 1; const url = s.url || ""; const trust = s.trust_score != null ? Number(s.trust_score).toFixed(2) : ""; return `<div class="rp-fnrow"${url ? ` data-url="${esc(url)}" role="button" tabindex="0" onclick="pnbGo(this)"` : ""}>
    <span class="rp-fn-n rp-mono">[${n}]</span>
    <div class="rp-fn-meta"><b>${esc(s.title || s.domain || url)}</b>${url ? `<span class="rp-dim rp-mono">${esc(url)}</span>` : ""}</div>
    <span class="rp-mono rp-fn-t">${trust}</span></div>`; }).join("");
  return `<section class="rp-sec rp-rev">${eye("07", "Sources cited")}<p class="rp-sublede">Every source both advocates drew on. Click a row to open it.</p><div class="rp-fns">${rows}</div></section>`;
}

function sMethod(d) {
  const a = d.analytics || {};
  const kpis = [["Model", esc(d.model)], ["Tokens", d.tokens ? d.tokens.toLocaleString() : "n/a"], ["Est. cost", d.cost ? "$" + d.cost.toFixed(4) : "n/a"], ["Rounds", pick(a.rounds, 3)], ["Distinct sources", pick(a.distinct_sources, d.sources.length)]];
  const cells = kpis.map(([l, v]) => `<div class="rp-tel"><span class="rp-dim">${l}</span><span class="rp-mono rp-tel-v">${v}</span></div>`).join("");
  const pipe = ["Proposition", "Search", "FOR case", "AGAINST case", "Rebuttals", "Judge", "Verdict"].map((s, i, ar) => `<span class="rp-step">${s}</span>${i < ar.length - 1 ? '<span class="rp-steprule"></span>' : ""}`).join("");
  return `<section class="rp-sec rp-rev">${eye("08", "Methodology &amp; provenance")}
    <div class="rp-pipe">${pipe}</div>
    <div class="rp-subh" style="margin-top:30px">Run telemetry</div>
    <div class="rp-tels">${cells}</div>
    <p class="rp-method" style="margin-top:18px">A two-advocate pipeline built independent FOR and AGAINST cases, exchanged rebuttals, then a rubric-scored judge weighed measured evidence (sources, grounding, hallucination checks) against argument quality to reach the verdict. Every figure is derived from the run; cost is an estimate.</p></section>`;
}

function sFollow(d) {
  if (!d.followUps.length) return "";
  const rows = d.followUps.map((q) => `<button class="dbr-follow" data-q="${esc(q)}" onclick="pnbNew(this)">${esc(q)}<span class="dbr-follow-a">→</span></button>`).join("");
  return `<section class="rp-sec rp-rev">${eye("09", "Continue the debate")}
    <p class="rp-sublede">The judge's follow-up questions, each opens as a fresh debate.</p>
    <div class="dbr-follows">${rows}</div></section>`;
}

function sCrossExam(d) {
  if (!d.crossExam) return "";
  const ce = d.crossExam;
  const qa = (label, tone, x) => (x && (x.question || x.answer)) ? `<div class="dbr-qa"><span class="rp-tag ${tone}">${label} ASKS</span>${x.question ? `<p class="dbr-q">${cite(stripEmoji(x.question))}</p>` : ""}${x.answer ? `<p class="dbr-ans"><span class="rp-dim">Reply, </span>${cite(stripEmoji(x.answer))}</p>` : ""}</div>` : "";
  const body = [qa("SUPPORTING", "pos", ce.for_asks), qa("COUNTER", "neg", ce.against_asks)].filter(Boolean).join("");
  if (!body) return "";
  return `<section class="rp-sec rp-rev">${eye("07", "Cross-examination")}<p class="rp-sublede">Each side's sharpest question to the other, and the reply.</p><div class="dbr-qas">${body}</div></section>`;
}
function sFallacies(d) {
  if (!d.fallacies) return "";
  const hasAny = ((d.fallacies.for || []).length || (d.fallacies.against || []).length);
  if (!hasAny) return "";
  const col = (label, tone, list) => `<div><div class="rp-subh ${tone}">${label}</div>${(list || []).length ? (list || []).map((f) => `<div class="dbr-fal"><span class="rp-tag ${tone}">${esc(stripEmoji(f.type || f.name || "Fallacy"))}</span><p>${esc(stripEmoji(f.note || f.description || ""))}${f.where ? ` <span class="rp-dim">(${esc(stripEmoji(f.where))})</span>` : ""}</p></div>`).join("") : `<p class="dbr-mut rp-dim">None flagged.</p>`}</div>`;
  return `<section class="rp-sec rp-rev">${eye("08", "Fallacy audit")}<p class="rp-sublede">Reasoning weaknesses flagged in each case, so neither side gets a free pass.</p><div class="rp-split">${col("Supporting", "pos", d.fallacies.for)}${col("Counter", "neg", d.fallacies.against)}</div></section>`;
}
function sTrackRecord(d) {
  if (!d.trackRecord) return "";
  const tr = d.trackRecord;
  const rate = tr.agreement_rate_with_users != null ? Math.round(tr.agreement_rate_with_users * 100) : null;
  return `<section class="rp-sec rp-rev">${eye("09", "Judge track record")}<div class="rp-split">
    <div><div class="rp-subh">How often this judge agrees with readers</div>${rate != null ? `<div class="dbr-tr"><span class="rp-fig-s pos">${rate}%</span><span class="rp-dim">reader agreement across ${tr.sample_size || 0} debates</span></div>` : `<p class="dbr-mut rp-dim">Not enough votes yet.</p>`}</div>
    <div><div class="rp-subh">Do you agree with this verdict?</div><div class="dbr-vote"><button class="dbr-vote-b" onclick="pnbVote(this,'agree')">Agree</button><button class="dbr-vote-b" onclick="pnbVote(this,'disagree')">Disagree</button></div><p class="dbr-mut rp-dim" id="dbr-vote-msg" style="margin-top:10px">Cast your vote to compare with the judge.</p></div>
  </div></section>`;
}

function buildDebateReport(d) {
  const raw = [sMast(d), sVerdict(d), sCases(d), sRubric(d), sSensitivity(d), sIntegrity(d), sDissent(d), sCrossExam(d), sFallacies(d), sTrackRecord(d), sSources(d), sMethod(d), sFollow(d)].filter((h) => h && h.trim());
  let n = 0; const rail = [];
  const parts = raw.map((h) => {
    if (!/class="rp-shead"/.test(h)) return h;
    n += 1; const nn = String(n).padStart(2, "0");
    const out = h.replace(/id="dbr-sec-\d+"/, `id="dbr-sec-${nn}"`).replace(/(<span class="rp-snum">)\d+(<\/span>)/, `$1${nn}$2`);
    const tm = out.match(/<h2 class="rp-stitle">([^<]*)<\/h2>/);
    if (tm) rail.push({ label: tm[1].replace(/&amp;/g, "&").trim(), id: `dbr-sec-${nn}` });
    return out;
  });
  const html = `<div class="rp-progress" id="dbr-prog"></div><div class="rp-wrap">
    ${parts.join("")}
    <footer class="rp-foot"><span>◆ POLYNOUS</span><span class="rp-dim">Adversarial · Rubric-scored · Grounded</span></footer>
  </div>`;
  return { html, rail };
}

/* ---------- debate-specific CSS (builds on the shared .rp-* system) ---------- */
const DBR_CSS = `
/* --- Debate report identity: the live Debate Chamber palette --- */
/* crimson #ff2040 (globe / DEBATE CHAMBER mark) is the signature accent everywhere; */
/* green FOR vs crimson AGAINST as in the clash meter; purple + gold are the support colors. */
.rp.dbr {
  --ink:#0a0a1e; --ink2:#111125; --panel:#111125; --panel2:#1e1e32;
  --line:rgba(226,224,252,0.12); --line2:rgba(226,224,252,0.055);
  --tx:#b9c2e4; --dim:#8899aa; --hi:#e2e0fc;
  --acc:#ff2040; --acc-soft:rgba(255,32,64,0.13);
  --pos:#00e64d; --neg:#ff2040; --warn:#ffd700; --info:#a855f7;
  --scrim: rgba(8,9,24,0.60);
}
.rp.dbr ::selection { background: var(--acc-soft); }
.dbr-scorepair { display: grid; grid-template-columns: auto 1fr auto; gap: 22px; align-items: center; margin-top: 36px; }
.dbr-score { display: flex; flex-direction: column; gap: 4px; }
.dbr-score.neg .rp-fig { color: var(--neg); } .dbr-score.pos .rp-fig { color: var(--pos); }
.dbr-score-l { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; color: var(--dim); }
.dbr-score.neg { text-align: right; }
.dbr-clash { display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: var(--line); }
.dbr-clash i { background: var(--pos); } .dbr-clash b { background: var(--neg); }
.dbr-verdict { display: flex; align-items: center; gap: 14px; margin: 6px 0 22px; }
.dbr-verdict h3 { font-family: var(--serif); font-size: clamp(1.3rem,2.6vw,1.8rem); font-weight: 700; letter-spacing: -0.02em; color: var(--hi); }
.dbr-reasons { display: flex; flex-direction: column; gap: 12px; max-width: 78ch; }
.dbr-reason { display: flex; gap: 14px; align-items: flex-start; }
.dbr-reason p { font-size: 14.5px; line-height: 1.7; color: var(--tx); }
.dbr-key { margin-top: 26px; padding: 18px 22px; border-left: 2px solid var(--warn); }
.dbr-key .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; }
.dbr-key p { font-size: 15px; color: var(--hi); line-height: 1.6; margin-top: 8px; font-family: var(--serif); }
.dbr-cases { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.dbr-case-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.dbr-side { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; }
.dbr-side.pos { color: var(--pos); } .dbr-side.neg { color: var(--neg); }
.dbr-args { list-style: none; margin-top: 8px; }
.dbr-arg { display: flex; gap: 14px; align-items: flex-start; padding: 15px 2px; border-bottom: 1px solid var(--line2); }
.dbr-arg:last-child { border-bottom: 0; }
.dbr-arg p { font-size: 14px; line-height: 1.6; color: var(--tx); }
.dbr-check { display: flex; gap: 13px; align-items: flex-start; padding: 13px 0; border-top: 1px solid var(--line2); }
.dbr-check:first-of-type { border-top: 0; }
.dbr-check-i { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 700; font-size: 12px; margin-top: 1px; }
.dbr-check-i.pos { background: rgba(0,230,77,0.12); color: var(--pos); }
.dbr-check-i.warn { background: rgba(255,215,0,0.14); color: var(--warn); }
.dbr-check-b b { display: block; font-size: 14px; color: var(--hi); margin-bottom: 2px; }
.dbr-check-b p { font-size: 12.5px; line-height: 1.5; }
.dbr-openlabel { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; margin: 8px 0 2px; }
.dbr-reb { margin-top: 16px; padding: 14px 16px 6px; background: var(--panel); border: 1px solid var(--line2); border-left: 2px solid; border-radius: 3px; }
.dbr-reb .dbr-args { margin-top: 4px; }
.dbr-reb .dbr-arg { padding: 9px 2px; }
.dbr-reb-l { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 7px; }
.dbr-reb-l.pos { color: var(--pos); } .dbr-reb-l.neg { color: var(--neg); }
.dbr-case:has(.dbr-reb-l.pos) .dbr-reb { border-left-color: var(--pos); }
.dbr-case:has(.dbr-reb-l.neg) .dbr-reb { border-left-color: var(--neg); }
.dbr-reb p { font-size: 13.5px; line-height: 1.58; color: var(--tx); }
.dbr-rub td, .dbr-rub th { text-align: left; padding: 12px 14px 12px 0; }
.dbr-rub th:not(:first-child), .dbr-rub td:not(:first-child) { text-align: right; width: 120px; }
.dbr-rub-l { color: var(--hi); font-size: 13px; }
.dbr-mut { font-size: 13.5px; color: var(--tx); line-height: 1.6; max-width: 60ch; }
.dbr-steel { display: flex; flex-direction: column; gap: 12px; }
.dbr-steel p { font-size: 13.5px; color: var(--tx); line-height: 1.6; }
.dbr-follows { display: flex; flex-direction: column; gap: 10px; }
.dbr-follow { display: flex; align-items: center; justify-content: space-between; gap: 14px; text-align: left; width: 100%; padding: 15px 18px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.02); color: var(--tx); font-family: var(--sans); font-size: 14px; cursor: pointer; transition: border-color .2s ease, transform .25s cubic-bezier(.16,1,.3,1); }
.dbr-follow:hover { border-color: var(--acc); color: var(--hi); transform: translateX(4px); }
.dbr-follow-a { color: var(--acc); font-family: var(--mono); opacity: 0; transition: opacity .2s ease; }
.dbr-follow:hover .dbr-follow-a { opacity: 1; }
@media (max-width: 820px){ .dbr-cases { grid-template-columns: 1fr; } .dbr-scorepair { grid-template-columns: 1fr; gap: 14px; } .dbr-score.neg { text-align: left; } }
.dbr-qas { display: flex; flex-direction: column; gap: 16px; }
.dbr-qa { padding: 16px 18px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,0.015); }
.dbr-q { font-size: 14.5px; color: var(--hi); line-height: 1.55; margin-top: 8px; font-family: var(--serif); }
.dbr-ans { font-size: 13.5px; color: var(--tx); line-height: 1.6; margin-top: 8px; }
.dbr-fal { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-bottom: 1px solid var(--line2); }
.dbr-fal:last-child { border-bottom: 0; }
.dbr-fal .rp-tag { align-self: flex-start; }
.dbr-fal p { font-size: 13px; color: var(--tx); line-height: 1.55; }
.dbr-tr { display: flex; align-items: baseline; gap: 12px; }
.dbr-tr .rp-fig-s { font-size: 40px; }
/* ── Tribunal integrity dashboard ─────────────────────────────────────── */
.dbr-int { display: flex; flex-direction: column; gap: 20px; margin-top: 12px; }
.dbr-int-grade { display: flex; align-items: center; gap: 22px; padding: 20px 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
.dbr-int-grade-badge { width: 62px; height: 62px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid; }
.dbr-int-grade.pos .dbr-int-grade-badge { border-color: var(--pos); background: rgba(0,230,77,0.09); }
.dbr-int-grade.info .dbr-int-grade-badge { border-color: var(--info); background: rgba(168,85,247,0.10); }
.dbr-int-grade.warn .dbr-int-grade-badge { border-color: var(--warn); background: rgba(255,215,0,0.10); }
.dbr-int-grade.neg .dbr-int-grade-badge { border-color: var(--neg); background: rgba(255,32,64,0.10); }
.dbr-int-grade-l { font-family: var(--serif); font-size: 34px; font-weight: 700; color: var(--hi); line-height: 1; }
.dbr-int-grade-body { flex: 1; }
.dbr-int-grade-idx { display: flex; align-items: baseline; gap: 10px; }
.dbr-int-body { display: grid; grid-template-columns: 1fr; gap: 22px; }
.dbr-int-body:has(.dbr-int-right) { grid-template-columns: 1.15fr 1fr; }
.dbr-int-checks { display: flex; flex-direction: column; gap: 10px; }
.dbr-int-check { padding: 14px 16px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.015); transition: border-color .2s; }
.dbr-int-check.pos { border-left: 3px solid var(--pos); }
.dbr-int-check.warn { border-left: 3px solid var(--warn); }
.dbr-int-check-head { display: flex; align-items: center; gap: 10px; }
.dbr-int-check-i { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 700; font-size: 12.5px; flex-shrink: 0; }
.dbr-int-check.pos .dbr-int-check-i { background: rgba(0,230,77,0.16); color: var(--pos); }
.dbr-int-check.warn .dbr-int-check-i { background: rgba(255,215,0,0.18); color: var(--warn); }
.dbr-int-check-l { font-family: var(--serif); font-weight: 600; font-size: 14.5px; color: var(--hi); flex: 1; }
.dbr-int-check-m { font-size: 12px; color: var(--dim); letter-spacing: 0.04em; }
.dbr-int-check-n { margin-top: 8px; margin-left: 32px; font-size: 12.5px; line-height: 1.55; color: var(--tx); }
.dbr-int-right { display: flex; flex-direction: column; gap: 18px; }
.dbr-int-panel { padding: 14px 16px; border: 1px solid var(--line2); background: rgba(255,255,255,0.015); border-radius: 10px; }
.dbr-int-p { font-size: 13px; line-height: 1.55; color: var(--tx); margin-top: 8px; }
.dbr-steel { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.dbr-steel p { font-size: 13px; line-height: 1.55; color: var(--tx); }
.dbr-steel .rp-tag { margin-right: 6px; }
@media (max-width: 820px) { .dbr-int-body:has(.dbr-int-right) { grid-template-columns: 1fr; } }

/* ── Evidence & grounding rubric (head-to-head visual) ────────────────── */
.dbr-rub2 { display: flex; flex-direction: column; margin-top: 8px; }
.dbr-rub-head { display: grid; grid-template-columns: 1.7fr 1fr auto 1fr; gap: 18px; padding: 0 4px 12px; border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
.dbr-rub-hcol { text-align: center; font-weight: 700; }
.dbr-rub-hcol.pos { color: var(--pos); text-align: left; }
.dbr-rub-hcol.neg { color: var(--neg); text-align: right; }
.dbr-rub-row { display: grid; grid-template-columns: 1.7fr 1fr auto 1fr; gap: 18px; align-items: center; padding: 18px 4px; border-bottom: 1px solid var(--line2); }
.dbr-rub-row:last-of-type { border-bottom: 0; }
.dbr-rub-metric b { display: block; font-family: var(--serif); font-size: 15px; color: var(--hi); font-weight: 600; letter-spacing: -0.01em; }
.dbr-rub-metric .rp-dim { display: block; font-size: 11.5px; margin-top: 2px; font-family: var(--sans); }
.dbr-rub-side { display: flex; flex-direction: column; gap: 8px; }
.dbr-rub-side.neg { align-items: flex-end; text-align: right; }
.dbr-rub-val { font-family: var(--mono); font-size: 15.5px; font-weight: 700; color: var(--hi); }
.dbr-rub-val .rp-dim { font-family: var(--sans); font-weight: 400; font-size: 12px; margin-left: 4px; }
.dbr-rub-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.dbr-rub-bar i { display: block; height: 100%; border-radius: 2px; transition: width .4s cubic-bezier(.16,1,.3,1); }
.dbr-rub-bar i.pos { background: var(--pos); }
.dbr-rub-bar i.neg { background: var(--neg); }
.dbr-rub-side.neg .dbr-rub-bar i { margin-left: auto; }
.dbr-rub-verdict { text-align: center; }
.dbr-rub-win { display: inline-block; padding: 4px 9px; border-radius: 4px; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; font-weight: 700; white-space: nowrap; }
.dbr-rub-win.pos { background: rgba(0,230,77,0.13); color: var(--pos); border: 1px solid rgba(0,230,77,0.30); }
.dbr-rub-win.neg { background: rgba(255,32,64,0.13); color: var(--neg); border: 1px solid rgba(255,32,64,0.32); }
.dbr-rub-win.tie { background: rgba(255,255,255,0.04); color: var(--dim); border: 1px solid var(--line); }
.dbr-rub-overall { margin-top: 20px; padding: 14px 18px; border-radius: 10px; font-size: 13.5px; line-height: 1.55; color: var(--tx); }
.dbr-rub-overall.pos { background: rgba(0,230,77,0.06); border: 1px solid rgba(0,230,77,0.24); }
.dbr-rub-overall.neg { background: rgba(255,32,64,0.06); border: 1px solid rgba(255,32,64,0.26); }
.dbr-rub-overall.tie { background: rgba(255,255,255,0.03); border: 1px solid var(--line); }
.dbr-rub-overall b { color: var(--hi); }
.dbr-rub-overall-i { font-family: var(--mono); font-size: 12px; margin-right: 4px; opacity: 0.7; }
.dbr-rub-overall.pos .dbr-rub-overall-i { color: var(--pos); }
.dbr-rub-overall.neg .dbr-rub-overall-i { color: var(--neg); }
@media (max-width: 720px) {
  .dbr-rub-head, .dbr-rub-row { grid-template-columns: 1fr; gap: 10px; }
  .dbr-rub-verdict { text-align: left; }
  .dbr-rub-side.neg { align-items: flex-start; text-align: left; }
  .dbr-rub-side.neg .dbr-rub-bar i { margin-left: 0; }
}

/* ── Sensitivity analysis (interactive what-if) ────────────────────────── */
.dbr-sens2 { display: flex; flex-direction: column; gap: 20px; margin-top: 16px; }
.dbr-sens-head { display: flex; gap: 24px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tx); }
.dbr-sens-legend { display: flex; align-items: center; gap: 8px; }
.dbr-legdot { width: 9px; height: 9px; border-radius: 50%; }
.dbr-legdot.pos { background: var(--pos); box-shadow: 0 0 8px rgba(0,230,77,0.35); }
.dbr-legdot.neg { background: var(--neg); box-shadow: 0 0 8px rgba(255,32,64,0.35); }
.dbr-sens-track { position: relative; height: 34px; }
.dbr-sens-input { position: absolute; inset: 0; width: 100%; height: 20px; margin: 7px 0; background: transparent; z-index: 3; cursor: pointer; -webkit-appearance: none; appearance: none; }
.dbr-sens-input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--hi); border: 3px solid var(--acc); box-shadow: 0 0 14px rgba(255,32,64,0.55), 0 2px 8px rgba(0,0,0,0.4); cursor: grab; transition: transform .15s ease; }
.dbr-sens-input::-webkit-slider-thumb:active { transform: scale(1.15); cursor: grabbing; }
.dbr-sens-input::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--hi); border: 3px solid var(--acc); box-shadow: 0 0 14px rgba(255,32,64,0.55); cursor: grab; }
.dbr-sens-fill { position: absolute; top: 14px; left: 0; right: 0; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; z-index: 1; }
.dbr-sens-fill i { display: block; height: 100%; background: linear-gradient(90deg, var(--acc) 0%, var(--acc) 100%); box-shadow: 0 0 12px rgba(255,32,64,0.5); border-radius: 3px; transition: width .25s cubic-bezier(.16,1,.3,1); }
.dbr-sens-ticks { position: absolute; bottom: -18px; left: 0; right: 0; display: flex; justify-content: space-between; font-family: var(--mono); font-size: 9.5px; color: var(--dim); letter-spacing: 0.05em; }
.dbr-sens-row-w { display: grid; grid-template-columns: auto auto 1fr auto auto; gap: 8px; align-items: baseline; padding-top: 14px; font-size: 12px; }
.dbr-sens-row-w .rp-mono { font-size: 13.5px; color: var(--hi); }
.dbr-sens-row-w .rp-mono#dbr-sens-qw { text-align: right; margin-left: auto; }
.dbr-sens-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; align-items: center; padding: 20px 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
.dbr-sens-card .dbr-sens-side { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); margin-bottom: 4px; }
.dbr-sens-num { font-family: var(--serif); font-size: 34px; font-weight: 700; line-height: 1; }
.dbr-sens-num .rp-dim { font-size: 15px; margin-left: 3px; }
.dbr-sens-bar { margin-top: 10px; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
.dbr-sens-bar i { display: block; height: 100%; transition: width .35s cubic-bezier(.16,1,.3,1); }
.dbr-sens-bar i.pos { background: var(--pos); }
.dbr-sens-bar i.neg { background: var(--neg); }
.dbr-sens-verdict { text-align: center; padding: 0 12px; border-left: 1px solid var(--line2); border-right: 1px solid var(--line2); }
.dbr-sens-verdict-fig { font-family: var(--serif); font-size: 44px; font-weight: 800; line-height: 1; margin: 8px 0; color: var(--hi); transition: color .25s ease; }
.dbr-sens-lean { padding: 14px 2px 4px; }
.dbr-sens-lean-line { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
.dbr-sens-lean-l { color: var(--pos); }
.dbr-sens-lean-r { color: var(--neg); }
.dbr-sens-lean-bar { position: relative; height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; }
.dbr-sens-lean-bar i { display: block; height: 100%; transition: width .4s cubic-bezier(.16,1,.3,1), background .3s ease; border-radius: 4px 0 0 4px; }
.dbr-sens-lean-mid { position: absolute; top: -4px; bottom: -4px; left: 50%; width: 1px; background: var(--dim); opacity: 0.4; z-index: 2; }
.dbr-sens-flag { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 10px; font-size: 13.5px; line-height: 1.5; transition: all .25s ease; }
.dbr-sens-flag.pos { background: rgba(0,230,77,0.08); border: 1px solid rgba(0,230,77,0.28); color: var(--tx); }
.dbr-sens-flag.warn { background: rgba(255,215,0,0.09); border: 1px solid rgba(255,215,0,0.32); color: var(--tx); }
.dbr-sens-flag.neg { background: rgba(255,32,64,0.09); border: 1px solid rgba(255,32,64,0.35); color: var(--tx); }
.dbr-sens-flag-i { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 700; font-size: 12.5px; margin-top: 1px; }
.dbr-sens-flag.pos .dbr-sens-flag-i { background: rgba(0,230,77,0.16); color: var(--pos); }
.dbr-sens-flag.warn .dbr-sens-flag-i { background: rgba(255,215,0,0.18); color: var(--warn); }
.dbr-sens-flag.neg .dbr-sens-flag-i { background: rgba(255,32,64,0.16); color: var(--neg); }
.dbr-sens-flag-t { flex: 1; }
.dbr-sens-flag-t b { color: var(--hi); font-weight: 700; }

.dbr-vote { display: flex; gap: 10px; }
.dbr-vote-b { padding: 10px 20px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.02); color: var(--tx); font-family: var(--sans); font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .2s cubic-bezier(.16,1,.3,1); }
.dbr-vote-b:hover { border-color: var(--acc); color: var(--hi); transform: translateY(-1px); }
.dbr-vote-b.on { background: var(--acc-soft); border-color: var(--acc); color: var(--acc); }
@media print {
  .dbr-cases, .dbr-follows, .dbr-qas { break-inside: auto; }
  .dbr-scorepair, .dbr-qa, .dbr-fal, .dbr-tr { break-inside: avoid; page-break-inside: avoid; }
  .dbr-follow-a, .dbr-vote { display: none !important; }
}
`;
let dbrInjected = false;
function injectDbr() { if (dbrInjected || typeof document === "undefined") return; dbrInjected = true; const st = document.createElement("style"); st.id = "dbr-style"; st.textContent = DBR_CSS; document.head.appendChild(st); }

/* ---------- interactions ---------- */
function installDbrHandlers() {
  if (typeof window === "undefined") return;
  const $ = (id) => document.getElementById(id);
  window.pnbCite = (el) => { const n = el && el.getAttribute("data-n"); const u = (window.__dbrUrls || {})[n]; if (u) window.open(u, "_blank", "noopener"); };
  window.pnbGo = (el) => { const u = el && el.getAttribute("data-url"); if (u && /^https?:/.test(u)) window.open(u, "_blank", "noopener"); };
  window.pnbShare = async () => {
    const t = window.__dbrTopic || "";
    const fallback = t ? (location.origin + "/debate?query=" + encodeURIComponent(t)) : location.href;
    const copy = async (url) => { try { await navigator.clipboard.writeText(url); } catch (_) {} };
    const snap = window.__dbrSnapshot; const api = (window.__dbrVote && window.__dbrVote.api) || "";
    if (!snap || !api) { return copy(fallback); }
    try {
      const headers = { "Content-Type": "application/json" };
      try { const tk = localStorage.getItem("polynous_token"); if (tk) headers.Authorization = "Bearer " + tk; } catch (_) {}
      const res = await fetch(api + "/share", { method: "POST", headers, body: JSON.stringify({ kind: "debate", title: t, payload: snap }) });
      if (res.ok) { const data = await res.json(); return copy(location.origin + (data.url_path || ("/d/" + data.id))); }
      return copy(fallback);
    } catch { return copy(fallback); }
  };
  window.pnbPdf = () => { setTimeout(() => { try { window.print(); } catch (e) {} }, 200); };
  window.pnbNew = (el) => {
    const q = (el && (el.getAttribute("data-q") || el.textContent || "")).replace("→", "").trim();
    if (!q) return;
    if (typeof window.__dbrNew === "function") window.__dbrNew(q);
    else window.location.href = "/debate?query=" + encodeURIComponent(q);
  };
  window.pnbSens = (v) => {
    v = Math.max(0, Math.min(100, Number(v) || 0));
    const s = window.__dbrSens || { a: 54, fE: 5, aE: 5, fQ: 5, aQ: 5 };
    const w = v / 100;                                   // evidence weight
    const fNew = w * s.fE + (1 - w) * s.fQ;
    const aNew = w * s.aE + (1 - w) * s.aQ;
    const tot = fNew + aNew;
    const lean = tot > 0 ? Math.max(1, Math.min(99, Math.round((fNew / tot) * 100))) : 50;
    const setTxt = (id, t) => { const el = $(id); if (el) el.textContent = t; };
    const setWidth = (id, pct) => { const el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + "%"; };
    // Header weights
    setTxt("dbr-sens-w", v + "%");
    setTxt("dbr-sens-qw", (100 - v) + "%");
    // Track fill (evidence-weight bar)
    setWidth("dbr-sens-fill", v);
    // Per-side live scores (out of 10) with animated bars
    setTxt("dbr-sens-fscore", fNew.toFixed(1));
    setTxt("dbr-sens-ascore", aNew.toFixed(1));
    setWidth("dbr-sens-fbar", fNew * 10);
    setWidth("dbr-sens-abar", aNew * 10);
    // Big verdict number + who it's toward + colour
    const score = $("dbr-sens-score");
    if (score) { score.textContent = lean + "%"; score.style.color = lean >= 50 ? "var(--pos)" : "var(--neg)"; }
    setTxt("dbr-sens-toward", lean >= 50 ? "toward Supporting" : "toward Counter");
    // Lean bar (pos side fill; midline visible)
    const leanBar = $("dbr-sens-leanbar");
    if (leanBar) { leanBar.style.width = lean + "%"; leanBar.className = lean >= 50 ? "pos" : "neg"; }
    // Fragility analysis: does the lean flip anywhere in [0, 1]?
    const leanAt = (ww) => { const f = ww * s.fE + (1 - ww) * s.fQ, a = ww * s.aE + (1 - ww) * s.aQ; return (f + a) > 0 ? (f / (f + a)) * 100 : 50; };
    const base = leanAt(0.5) >= 50;
    let flips = false, flipAt = null;
    for (let ww = 0; ww <= 1.001; ww += 0.05) {
      if ((leanAt(ww) >= 50) !== base) { flips = true; flipAt = Math.round(ww * 100); break; }
    }
    const flag = $("dbr-sens-flag");
    if (flag) {
      const ico = flag.querySelector(".dbr-sens-flag-i");
      const txt = flag.querySelector(".dbr-sens-flag-t");
      let cls = "pos", icon = "✓", msg = "";
      if ((lean >= 50) !== base) {
        cls = "neg"; icon = "⚠";
        msg = `<b>Flipped.</b> At ${v}% evidence weight the ${lean >= 50 ? "Supporting" : "Counter"} case leads instead. The verdict is fragile to this assumption.`;
      } else if (flips) {
        cls = "warn"; icon = "!";
        msg = `<b>Fragile.</b> The verdict flips near ${flipAt}% evidence weight, so it depends on how much you trust measured evidence over rhetoric.`;
      } else if (Math.abs(lean - 50) < 6) {
        cls = "warn"; icon = "!";
        msg = `<b>Marginal.</b> The lean is thin (${lean}%) at this weighting. A small shift in either score would flip it.`;
      } else {
        cls = "pos"; icon = "✓";
        msg = `<b>Stable.</b> The ${base ? "Supporting" : "Counter"} case leads across every reasonable weighting of evidence versus argument quality.`;
      }
      flag.className = "dbr-sens-flag " + cls;
      if (ico) ico.textContent = icon;
      if (txt) txt.innerHTML = msg;
    }
  };
  window.pnbVote = (btn, choice) => {
    const wrap = btn && btn.closest(".dbr-vote"); if (!wrap) return;
    wrap.querySelectorAll(".dbr-vote-b").forEach((b) => { b.classList.remove("on"); b.disabled = true; });
    btn.classList.add("on");
    const msg = document.getElementById("dbr-vote-msg");
    if (msg) msg.textContent = choice === "agree" ? "You agreed with the verdict. Recording your vote…" : "You disagreed. Recording your vote…";
    const ctx = window.__dbrVote || {};
    if (!ctx.topic || !ctx.api) { if (msg) msg.textContent = choice === "agree" ? "You agreed with the verdict. Thanks, your vote sharpens the judge's track record." : "You disagreed. Noted, dissent is how the tribunal stays honest."; return; }
    const headers = { "Content-Type": "application/json" };
    try { const t = localStorage.getItem("polynous_token"); if (t) headers.Authorization = "Bearer " + t; } catch (_) {}
    fetch(ctx.api + "/debate-vote", { method: "POST", headers, body: JSON.stringify({ topic: ctx.topic, judge_winner: ctx.winner, agree: choice === "agree" }) })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((res) => {
        const rate = res && res.agreement_rate_with_users != null ? Math.round(res.agreement_rate_with_users * 100) : null;
        const trEl = document.querySelector(".dbr-tr");
        if (trEl && rate != null) trEl.innerHTML = `<span class="rp-fig-s pos">${rate}%</span><span class="rp-dim">reader agreement across ${res.sample_size || 0} debates</span>`;
        if (msg) msg.textContent = (choice === "agree" ? "Vote recorded, you agreed with the judge. " : "Vote recorded, you disagreed. ") + (rate != null ? `Readers now agree ${rate}% of the time across ${res.sample_size} debates.` : "You are the first vote on record.");
      })
      .catch(() => { if (msg) msg.textContent = "Vote noted locally, but it could not be saved right now."; });
  };
}
function runCounters(root) {
  if (!root) return;
  root.querySelectorAll(".rp-count").forEach((c) => {
    const target = +c.getAttribute("data-target"); if (!isFinite(target)) return;
    const val = (target / 10).toFixed(1); c.textContent = val;
  });
}

const DBR_RAIL = [
  { label: "Verdict", id: "dbr-sec-01" },
  { label: "The cases", id: "dbr-sec-02" },
  { label: "Evidence", id: "dbr-sec-03" },
  { label: "Sensitivity", id: "dbr-sec-04" },
  { label: "Integrity", id: "dbr-sec-05" },
  { label: "Sources", id: "dbr-sec-07" },
  { label: "Methodology", id: "dbr-sec-08" },
];

/* ---------- component ---------- */
export default function PolynousDebateReport(props) {
  const ref = useRef(null);
  const hasData = props && props.result && props.result.verdict;
  const d = deriveDebate(hasData ? props : DEMO);
  const { html, rail } = buildDebateReport(d);
  if (typeof window !== "undefined") {
    // Real sensitivity inputs: each side's final score = 50% evidence rubric
    // + 50% argument quality, so quality = 2*final - evidence. The slider then
    // recomputes the lean at any evidence weight from these real components.
    const clamp10 = (x) => Math.max(0, Math.min(10, x));
    window.__dbrSens = {
      a: d.balance.a,
      fE: clamp10(d.rubF.score), aE: clamp10(d.rubA.score),
      fQ: clamp10(2 * d.forScore - d.rubF.score), aQ: clamp10(2 * d.againstScore - d.rubA.score),
    };
    window.__dbrUrls = d.sourceUrls;
    window.__dbrTopic = d.topic || "";
    window.__dbrNew = typeof props.onNewDebate === "function" ? props.onNewDebate : null;
    window.__dbrVote = { topic: d.topic || "", winner: (d.winner === "FOR" || d.winner === "AGAINST") ? d.winner : "TIE", api: API_BASE_URL };
    window.__dbrSnapshot = { result: props.result, activeTopic: props.activeTopic || d.topic, topic: d.topic };
  }
  useEffect(() => { ensureReportStyles(); injectDbr(); installDbrHandlers(); }, []);
  useEffect(() => {
    // Prime the sensitivity panel with a real 50/50 read so the flag + bars
    // reflect actual state on first paint (not the hardcoded "Stable" text).
    const t0 = setTimeout(() => { try { window.pnbSens && window.pnbSens(50); } catch (_) {} }, 60);
    const t = setTimeout(() => runCounters(ref.current), 400);
    const onScroll = () => {
      const bar = ref.current && ref.current.querySelector("#dbr-prog");
      if (!bar) return;
      const doc = document.documentElement;
      const max = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, (window.scrollY || 0) / max) : 0) + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { clearTimeout(t0); clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [html]);
  const dbaCtx = {
    topic: d.topic,
    winner: d.winner,
    forScore: d.forScore,
    againstScore: d.againstScore,
    certainty: d.certainty,
    leadA: d.balance.a,
    proCase: [d.forPts.join("\n"), d.forRebuttal].filter(Boolean).join("\n\n"),
    conCase: [d.againstPts.join("\n"), d.againstRebuttal].filter(Boolean).join("\n\n"),
    proOpen: d.forPts.join("\n"),
    conOpen: d.againstPts.join("\n"),
    proReb: d.forRebuttal,
    conReb: d.againstRebuttal,
    verdict: d.reasoning || d.strongest || d.winnerLabel,
  };
  return (
    <>
      <div ref={ref} className="rp dbr" dangerouslySetInnerHTML={{ __html: html }} />
      {rail.length > 2 && props.showRail !== false && <SideRail items={rail} accentColor="#ff2040" getContainer={() => ref.current} />}
      <DebateActions ctx={dbaCtx} />
    </>
  );
}
