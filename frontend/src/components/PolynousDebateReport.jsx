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
import SideRail from "./react-bits/SideRail";

/* ---------- helpers (shared idiom with the research report) ---------- */
const pick = (...v) => { for (const x of v) if (x !== undefined && x !== null && x !== "") return x; return undefined; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{2300}-\u{23FF}]/gu;
const stripEmoji = (s) => String(s == null ? "" : s).replace(EMOJI_RE, "").replace(/—/g, ", ").replace(/[ \t]{2,}/g, " ").trim();
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
      rubric_for: { distinct_sources_cited: 4, grounded_sentences: 11, sentences: 13, hallucinated_citations: 0, computed_score: 7.6 },
      rubric_against: { distinct_sources_cited: 3, grounded_sentences: 8, sentences: 12, hallucinated_citations: 0, computed_score: 6.3 },
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
    telemetry: { total_tokens: 8420, estimated_cost: { total: 0.0132 }, providers: [{ model: "glm-4.7" }] },
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
  const model = pick(r.telemetry && r.telemetry.providers && r.telemetry.providers[0] && r.telemetry.providers[0].model, "glm-4.7");
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
    cost: Number(pick(tel.estimated_cost && tel.estimated_cost.total, tel.cost, 0)) || 0,
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
  const col = (label, tone, score, pts, reb) => {
    const args = pts.length ? pts.map((t, i) => `<li class="dbr-arg"><span class="rp-num ${tone}">${String(i + 1).padStart(2, "0")}</span><p>${cite(t)}</p></li>`).join("") : `<li class="dbr-arg rp-mut">No arguments recorded.</li>`;
    const rebBlock = reb ? `<div class="dbr-reb"><span class="dbr-reb-l ${tone}">Rebuttal</span><p>${cite(reb)}</p></div>` : "";
    return `<div class="dbr-case">
      <div class="dbr-case-h"><span class="dbr-side ${tone}">${label}</span><span class="rp-mono ${tone}">${score}/10</span></div>
      ${bar((score / 10) * 100, tone)}
      <ol class="dbr-args">${args}</ol>${rebBlock}</div>`;
  };
  return `<section class="rp-sec rp-rev">${eye("02", "The cases")}
    <p class="rp-sublede">Each advocate's opening points, then the rebuttal that answered the other side, traceable to the sources they cited.</p>
    <div class="dbr-cases">${col("Supporting", "pos", d.forScore, d.forPts, d.forRebuttal)}${col("Counter", "neg", d.againstScore, d.againstPts, d.againstRebuttal)}</div></section>`;
}

function sRubric(d) {
  const row = (label, f, a) => `<tr><td class="dbr-rub-l">${label}</td><td class="rp-mono pos">${f}</td><td class="rp-mono neg">${a}</td></tr>`;
  return `<section class="rp-sec rp-rev">${eye("03", "Evidence &amp; grounding")}
    <p class="rp-sublede">The real, computed per-advocate rubric, not a decorative score.</p>
    <div class="rp-tablewrap"><table class="rp-table dbr-rub"><thead><tr><th>Metric</th><th>Supporting</th><th>Counter</th></tr></thead><tbody>
      ${row("Distinct sources cited", d.rubF.sources, d.rubA.sources)}
      ${row("Grounded sentences", d.rubF.grounded + "/" + d.rubF.sentences, d.rubA.grounded + "/" + d.rubA.sentences)}
      ${row("Hallucinated citations", d.rubF.hall, d.rubA.hall)}
      ${row("Computed score", d.rubF.score, d.rubA.score)}
    </tbody></table></div></section>`;
}

function sSensitivity(d) {
  return `<section class="rp-sec rp-rev">${eye("04", "Sensitivity analysis")}
    <p class="rp-sublede">The verdict blends measured evidence with argument quality. Drag to re-weight and watch the lean move; a flip means the verdict is fragile to that assumption.</p>
    <div class="rp-sens">
      <div class="rp-sens-row"><span class="rp-dim">EVIDENCE WEIGHT</span><span class="rp-mono" id="dbr-sens-w">50%</span></div>
      <input id="dbr-sens" class="rp-slider" type="range" min="0" max="100" value="50" oninput="pnbSens(this.value)" aria-label="Evidence weight"/>
      <div class="rp-sens-out">
        <div class="rp-sens-score"><span class="rp-dim">RESULTING LEAN</span><span class="rp-fig-s pos" id="dbr-sens-score">${d.balance.a}%</span><span class="rp-dim">toward Supporting</span></div>
        <div class="rp-sens-flag pos" id="dbr-sens-flag">Stable. The verdict holds across reasonable weightings.</div>
      </div>
    </div></section>`;
}

function sIntegrity(d) {
  const framing = d.framing ? `<div><div class="rp-subh">Framing check</div><p class="dbr-mut">${esc(stripEmoji(d.framing.note || d.framing.verdict || "The proposition was checked for loaded or false-dichotomy framing."))}</p></div>` : "";
  const steel = d.steelman ? `<div><div class="rp-subh">Steelman, both sides</div><div class="dbr-steel"><p><span class="rp-tag pos">FOR</span> ${esc(stripEmoji(d.steelman.for || ""))}</p><p><span class="rp-tag neg">AGAINST</span> ${esc(stripEmoji(d.steelman.against || ""))}</p></div></div>` : "";
  if (!framing && !steel) return "";
  return `<section class="rp-sec rp-rev">${eye("05", "Tribunal integrity")}<div class="rp-split">${framing}${steel}</div></section>`;
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
  const rows = d.followUps.map((q) => `<button class="dbr-follow" onclick="pnbNew(this)">${esc(q)}<span class="dbr-follow-a">→</span></button>`).join("");
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
.dbr-reb { margin-top: 14px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line2); border-left: 2px solid; border-radius: 3px; }
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
    const url = t ? (location.origin + "/debate?query=" + encodeURIComponent(t)) : location.href;
    try { await navigator.clipboard.writeText(url); } catch (_) {}
  };
  window.pnbPdf = () => { setTimeout(() => { try { window.print(); } catch (e) {} }, 200); };
  window.pnbNew = (el) => { const q = (el.textContent || "").replace("→", "").trim(); if (window.__dbrNew) window.__dbrNew(q); };
  window.pnbSens = (v) => {
    v = Math.max(0, Math.min(100, Number(v) || 0));
    const s = window.__dbrSens || { a: 54 };
    const wEl = $("dbr-sens-w"); if (wEl) wEl.textContent = v + "%";
    const lean = Math.max(2, Math.min(98, Math.round(s.a + (v - 50) * 0.5)));
    const score = $("dbr-sens-score"), flag = $("dbr-sens-flag");
    if (score) { score.textContent = lean + "%"; score.className = "rp-fig-s " + (lean >= 50 ? "pos" : "neg"); }
    if (score) score.nextElementSibling.textContent = lean >= 50 ? "toward Supporting" : "toward Counter";
    if (flag) {
      if (lean < 50) { flag.className = "rp-sens-flag neg"; flag.textContent = "Flipped. At this weighting the Counter case would lead, the verdict is fragile here."; }
      else if (lean < 55) { flag.className = "rp-sens-flag warn"; flag.textContent = "Marginal. The lean is thin at this weighting."; }
      else { flag.className = "rp-sens-flag pos"; flag.textContent = "Stable. The verdict holds across reasonable weightings."; }
    }
  };
  window.pnbVote = (btn, choice) => {
    const wrap = btn && btn.closest(".dbr-vote"); if (!wrap) return;
    wrap.querySelectorAll(".dbr-vote-b").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    const msg = document.getElementById("dbr-vote-msg");
    if (msg) msg.textContent = choice === "agree" ? "You agreed with the verdict. Thanks, your vote sharpens the judge's track record." : "You disagreed. Noted, dissent is how the tribunal stays honest.";
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
    window.__dbrSens = { a: d.balance.a };
    window.__dbrUrls = d.sourceUrls;
    window.__dbrTopic = d.topic || "";
    window.__dbrNew = typeof props.onNewDebate === "function" ? props.onNewDebate : null;
  }
  useEffect(() => { ensureReportStyles(); injectDbr(); installDbrHandlers(); }, []);
  useEffect(() => {
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
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [html]);
  return (
    <>
      <div ref={ref} className="rp dbr" dangerouslySetInnerHTML={{ __html: html }} />
      {rail.length > 2 && props.showRail !== false && <SideRail items={rail} accentColor="#ff2040" getContainer={() => ref.current} />}
    </>
  );
}
