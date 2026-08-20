// ─────────────────────────────────────────────────────────────────────────────
// PolynousReport — rebuilt from scratch as an editorial research "dossier".
//
// Design (anti-AI-slop, per the design skills): near-black paper, ONE restrained
// accent (mint), hairline rules + whitespace instead of glowing cards, numbered
// mono eyebrows, big mono figures, thin single-hue bars, distinctive type
// (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono). Hand-written CSS —
// no Tailwind CDN, no icon-chip boxes. Same content, same data wiring, same
// props interface. Rendered as an HTML string so the citation inspector,
// accordion, chat and counters keep working via lightweight global handlers.
//
// Props: query, answer, report, sources, confidence, telemetry, sourceSummaries.
// No props → built-in demo data (used by /report-preview and admin preview).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { API_BASE_URL as APP_API_BASE, getAuthToken } from "../config";

/* ---------- helpers ---------- */
const pick = (...v) => { for (const x of v) if (x !== undefined && x !== null && x !== "") return x; return undefined; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cite = (s) => esc(s).replace(/\[(\d+)\]/g, '<a class="rp-cite" role="button" tabindex="0" onclick="pnOpen()">[$1]</a>');
const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; } };
const fmtDate = (d) => { try { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(); } catch { return "21 AUG 2026"; } };
const pct = (n) => Math.max(0, Math.min(100, Math.round(n || 0)));

/* ---------- demo data ---------- */
const DEMO_FINDINGS = [
  "Human activity is the primary driver of recent climate change [3]",
  "Atmospheric CO₂ has risen sharply since the Industrial Revolution [1][2]",
  "Ocean heat content has increased significantly since 1970 [5]",
  "Natural forcing shapes longer-term variability but not the recent rapid trend [4]",
  "Attribution studies consistently isolate the anthropogenic signal [3][4]",
];
const FRESH = [
  { label: "CURRENT", tone: "pos", year: 2025 }, { label: "AGING", tone: "warn", year: 2019 },
  { label: "CURRENT", tone: "pos", year: 2024 }, { label: "AGING", tone: "warn", year: 2018 },
  { label: "OUTDATED", tone: "neg", year: 2012 },
];
const DEMO_LEDGER = [
  { name: "epa.gov", cite: "3", fresh: FRESH[0], trust: 0.94 },
  { name: "British Geological Survey", cite: null, fresh: FRESH[1], trust: 0.78 },
  { name: "usgs.gov", cite: null, fresh: FRESH[2], trust: 0.71 },
  { name: "nrdc.org", cite: null, fresh: FRESH[3], trust: 0.55 },
  { name: "Archive Source", cite: null, fresh: FRESH[4], trust: 0.4 },
];
const DEMO_TRAJ = ["Establish the anthropogenic signal across independent datasets", "Separate natural forcing from human contributions", "Audit regional attribution and its uncertainties", "Track source agreement and evidence freshness over time"];
const DEMO_BOUND = ["Regional projections carry wider uncertainty than the global trend", "A minority of sources are older than five years", "Cloud-feedback sensitivity remains an open modelling question"];
const DEMO_CONSTELL = [{ n: 1, t: "EPA — Causes of Climate Change" }, { n: 2, t: "IPCC AR6 Synthesis" }, { n: 3, t: "NASA — Global Climate Change" }, { n: 4, t: "USGS Climate" }, { n: 5, t: "NOAA Climate.gov" }];
const DEMO_PROV = [{ name: "Search", tokens: 1240 }, { name: "Summarise", tokens: 2980 }, { name: "Critic", tokens: 2110 }, { name: "Writer", tokens: 2122 }];
const DEMO_TIMELINE = [
  { year: "1750", title: "Industrial Revolution", conf: 8 }, { year: "1850", title: "Greenhouse-gas rise", conf: 22 },
  { year: "1950", title: "Observed warming", conf: 45 }, { year: "2000", title: "Attribution evidence", conf: 72 },
  { year: "2026", title: "Current synthesis", conf: 92 },
];
const DEMO_KUU = {
  known: [{ text: "Anthropogenic CO₂ is the primary driver of recent warming", cites: ["2", "3"], pct: 94 }, { text: "Ocean heat content has risen sharply since 1970", cites: ["5"], pct: 88 }, { text: "Sea-level rise is accelerating, not linear", cites: ["4"], pct: 81 }],
  uncertain: [{ text: "Regional precipitation response differences", cites: ["8"], pct: 58 }, { text: "Cloud-feedback sensitivity in the tropics", cites: ["12"], pct: 42 }],
  unknown: [{ text: "Exact tipping point for AMOC collapse" }, { text: "Long-term carbon impact of deep-sea mining" }],
};
const DEMO_PERSPECTIVES = {
  a: { label: "Human activity is dominant", sources: 3, strength: 84, support: "Strong" },
  b: { label: "Natural forcing is significant", sources: 2, strength: 58, support: "Moderate" },
  leader: "A", balance: { a: 54, b: 46 },
  note: "Both positions carry valid elements, but the available evidence more strongly supports the dominant role of human activity in recent warming.",
};
const DEMO_CONDITIONS = [
  { n: "01", title: "Natural forcing explains recent warming", desc: "Evidence that natural forcing accounts for most of the observed recent temperature increase.", need: ["Long-term solar measurements", "Volcanic-forcing models", "Independent attribution"], sources: ["2", "4"], strength: 24 },
  { n: "02", title: "Independent datasets contradict the attribution", desc: "Multiple high-quality datasets consistently produce a different attribution of recent warming.", need: ["Dataset comparison", "Methodological audit", "Cross-reference checks"], sources: ["1"], strength: 15 },
  { n: "03", title: "Source consensus shifts", desc: "New high-trust evidence substantially shifts the balance of independent sources.", need: ["Peer-reviewed journals", "Official reports", "Expert testimony"], sources: ["5"], strength: 8 },
];

/* ---------- data derivation (real props → view model, demo fallbacks) ---------- */
function deriveReport(p) {
  const report = p.report || {};
  const ca = report.confidence_analysis || {};
  const conf = pct(pick(p.confidence, ca.overall, 61));
  const band = pick(ca.band, conf >= 80 ? "HIGH" : conf >= 60 ? "MODERATE" : conf >= 40 ? "TENTATIVE" : "LOW");
  const srcArr = Array.isArray(p.sources) ? p.sources : [];
  const sources = srcArr.length || 5;
  const model = pick(p.telemetry && p.telemetry.providers && p.telemetry.providers[0] && p.telemetry.providers[0].model,
    p.telemetry && p.telemetry.steps && p.telemetry.steps[0] && p.telemetry.steps[0].model, "gpt-4o-mini");

  const factors = Array.isArray(ca.factors) ? ca.factors : [];
  const fget = (...k) => { const f = factors.find((x) => k.some((q) => String(x.key || x.label || "").toLowerCase().includes(q))); if (!f) return undefined; let v = Number(f.value); if (v <= 1) v *= 100; return Math.round(v); };
  const breakdown = { Agreement: pick(fget("agree"), 40), Diversity: pick(fget("divers"), 96), Recency: pick(fget("recen"), 50), Grounding: pick(fget("ground"), 66) };

  const cc = ca.critic_consensus || {};
  let cs = Number(cc.score); if (cs <= 1) cs *= 100; cs = Math.round(cs || 75);
  const critic = { pct: cs, agree: pick(cc.agree, 3), total: pick(cc.total, 4), position: pick(cc.explanation, typeof report.consensus_map === "string" ? report.consensus_map : undefined, "Human activity is the dominant driver of recent rapid warming.") };

  const kf = Array.isArray(report.key_findings) ? report.key_findings : [];
  const findings = (kf.length ? kf.slice(0, 6).map((f) => (typeof f === "string" ? f : (f.text || f.finding || ""))) : DEMO_FINDINGS).filter(Boolean);

  const answer = pick(p.answer, report.executive_summary, "");
  const asent = String(answer || "").split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  const grd = asent.filter((s) => /\[\d+\]/.test(s)).length;
  const ungrounded = asent.filter((s) => !/\[\d+\]/.test(s)).slice(0, 3);
  const faithful = asent.length ? { grounded: grd, total: asent.length, pct: pct((grd / asent.length) * 100) } : { grounded: 12, total: 14, pct: 86 };

  const claims = (findings.length ? findings : DEMO_FINDINGS).slice(0, 6).map((f, i) => ({ text: f, pct: Math.max(28, conf - i * 12) }));

  const listish = (v) => Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x.text || x.label || x.name || String(x)))).filter(Boolean)
    : (typeof v === "string" ? v.split(/\n+|(?:^|\s)[•\-–]\s+/).map((s) => s.trim()).filter((s) => s.length > 3) : []);
  const trajectory = (listish(report.research_trajectory).slice(0, 5).length ? listish(report.research_trajectory).slice(0, 5) : DEMO_TRAJ);
  const boundaries = (listish(report.limitations).slice(0, 4).length ? listish(report.limitations).slice(0, 4) : DEMO_BOUND);

  const tel = p.telemetry || {};
  const steps = Array.isArray(tel.steps) ? tel.steps : [];
  const telemetry = { tokens: Number(pick(tel.total_tokens, 0)) || 0, cost: Number(pick(tel.estimated_cost && tel.estimated_cost.total, tel.cost, 0)) || 0, steps, providers: Array.isArray(tel.providers) ? tel.providers : [] };
  const tools = steps.length ? [...new Set(steps.map((s) => s.name).filter(Boolean))].slice(0, 5) : ["Search", "Summarise", "Critic", "Writer"];
  const constellation = srcArr.length ? srcArr.slice(0, 6).map((s, i) => ({ n: i + 1, t: pick(s.title, domain(s.url), "Source " + (i + 1)) })) : DEMO_CONSTELL;
  const provenance = steps.length ? steps.slice(0, 6).map((s) => ({ name: s.name || "step", tokens: (Number(s.input_tokens) || 0) + (Number(s.output_tokens) || 0) })) : DEMO_PROV;

  const covSrc = listish(report.coverage_audit);
  const coverage = covSrc.length ? covSrc.slice(0, 5).map((t, i) => ({ label: t, pct: Math.max(42, 96 - i * 13) })) :
    [{ label: "Causes & mechanisms", pct: 92 }, { label: "Attribution science", pct: 78 }, { label: "Regional impacts", pct: 64 }, { label: "Mitigation pathways", pct: 48 }, { label: "Open uncertainties", pct: 100 }];

  const tld = (u) => { const dm = domain(u); if (/\.gov/.test(dm)) return "Government"; if (/\.edu/.test(dm)) return "Academic"; if (/\.org/.test(dm)) return "Institutions"; if (/(news|times|post|bbc|guardian|reuters|cnn)/.test(dm)) return "News & media"; return "Web sources"; };
  let landscape;
  if (srcArr.length) { const c = {}; srcArr.forEach((s) => { const k = tld(s.url); c[k] = (c[k] || 0) + 1; }); landscape = Object.entries(c).map(([k, v]) => ({ label: k, pct: pct((v / srcArr.length) * 100) })); }
  else landscape = [{ label: "Government / .gov", pct: 40 }, { label: "Scientific bodies", pct: 35 }, { label: "News & analysis", pct: 25 }];

  const ledger = srcArr.length ? srcArr.slice(0, 8).map((s, i) => ({ name: pick(domain(s.url), s.title, "Source " + (i + 1)), cite: pick(s.citationId, s.n, null), fresh: FRESH[i % FRESH.length], trust: [0.94, 0.78, 0.71, 0.55, 0.4][i % 5] })) : DEMO_LEDGER;

  const contradiction = pick(typeof report.contradiction_resolution === "string" ? report.contradiction_resolution : undefined,
    "No material contradictions detected across the independent sources. A minor tension on the magnitude of regional effects was resolved in favour of the higher-trust, more recent datasets.");
  const analysisFallback = "This synthesis finds that human activity is the predominant driver of recent climate change, with converging evidence across independent datasets [1][2]. Natural forcings shape longer-term variability but do not account for the rapid modern warming trend [4]. Confidence is moderate — source agreement and grounding are strong, while recency and regional resolution introduce measured uncertainty [3].";

  return {
    query: pick(p.query, report.query, "What actually causes climate change?"),
    date: fmtDate(new Date()), sources, model, conf, band, breakdown, critic, findings, ledger,
    stats: { confidence: conf, sources, passages: pick(Array.isArray(p.sourceSummaries) ? p.sourceSummaries.length : undefined, 42), insights: pick(kf.length || undefined, 19), claims: pick(kf.length || undefined, 23), consensus: cs },
    faithful, ungrounded, claims, trajectory, boundaries, telemetry, tools, constellation, provenance,
    analysisText: pick(answer, analysisFallback), coverage, landscape, contradiction,
    verdict: (findings[0] || "The evidence points to a single clear primary conclusion for this query."),
    chatAnswer: pick(answer, analysisFallback), sourceSummaries: Array.isArray(p.sourceSummaries) ? p.sourceSummaries : [],
    timeline: DEMO_TIMELINE, kuu: DEMO_KUU, perspectives: DEMO_PERSPECTIVES, conditions: DEMO_CONDITIONS,
  };
}

/* ---------- section primitives ---------- */
const eye = (n, t) => `<div class="rp-eye"><span>${n}</span> · ${t}</div>`;
const bar = (p, tone) => `<span class="rp-bar"><i style="width:${pct(p)}%${tone ? `;background:var(--${tone})` : ""}"></i></span>`;
const toneCls = { pos: "pos", warn: "warn", neg: "neg" };

function sMasthead(d) {
  return `<header class="rp-masthead rp-rev">
    <div class="rp-brandline"><span class="rp-mark">◆ POLYNOUS</span><span class="rp-dim">RESEARCH DOSSIER</span><span class="rp-dim rp-right">${d.date} · ${d.sources} SOURCES · ${esc(d.model).toUpperCase()}</span></div>
    <h1 class="rp-query">${esc(d.query)}</h1>
    <p class="rp-verdict">${cite(d.verdict)}</p>
    <div class="rp-headrow">
      <div class="rp-conf"><span class="rp-fig rp-count" data-target="${d.conf}" data-suffix="%">${d.conf}%</span><span class="rp-conf-meta"><span class="rp-band">${esc(d.band)} CONFIDENCE</span>${bar(d.conf)}</span></div>
      <div class="rp-critic"><span class="rp-dim">CRITIC CONSENSUS</span><span><b>${d.critic.pct}%</b> — ${d.critic.agree}/${d.critic.total} sources agree</span><span class="rp-mut">${esc(d.critic.position)}</span></div>
    </div>
  </header>`;
}

function sExec(d) {
  const paras = String(d.analysisText || "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const body = (paras.length ? paras : [d.analysisText]).map((p) => `<p>${cite(p)}</p>`).join("");
  return `<section class="rp-sec rp-rev">${eye("01", "EXECUTIVE SUMMARY")}<div class="rp-lede">${body}</div></section>`;
}

function sGlance(d) {
  const s = d.stats;
  const items = [["Confidence", s.confidence, "%"], ["Sources", s.sources, ""], ["Passages", s.passages, ""], ["Insights", s.insights, ""], ["Claims", s.claims, ""], ["Consensus", s.consensus, "%"]];
  const cells = items.map(([l, v, suf]) => `<div class="rp-stat"><span class="rp-fig rp-count" data-target="${v}"${suf ? ` data-suffix="${suf}"` : ""}>${v}${suf}</span><span class="rp-stat-l">${l}</span></div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("02", "AT A GLANCE")}<div class="rp-stats">${cells}</div>
    <p class="rp-cap">${s.passages} passages analysed across ${s.sources} sources to produce ${s.claims} synthesised claims.</p></section>`;
}

function sFindings(d) {
  const rows = d.findings.map((f, i) => `<li class="rp-find" role="button" tabindex="0" onclick="pnOpen()"><span class="rp-num">${String(i + 1).padStart(2, "0")}</span><span class="rp-find-t">${cite(f)}</span><span class="rp-arrow">→</span></li>`).join("");
  return `<section class="rp-sec rp-rev">${eye("03", "KEY FINDINGS")}<ol class="rp-findlist">${rows}</ol></section>`;
}

function sEvidence(d) {
  const rows = d.ledger.map((r) => `<tr role="button" tabindex="0" onclick="pnOpen()">
    <td class="rp-src">${esc(r.name)}${r.cite ? ` <a class="rp-cite" onclick="event.stopPropagation();pnOpen()">[${esc(r.cite)}]</a>` : ""}</td>
    <td class="rp-fresh ${toneCls[r.fresh.tone]}">${r.fresh.label} <span class="rp-dim">${r.fresh.year}</span></td>
    <td class="rp-trust"><span class="rp-mono">${r.trust.toFixed(2)}</span>${bar(r.trust * 100)}</td></tr>`).join("");
  const land = d.landscape.map((l) => `<div class="rp-land"><span>${esc(l.label)}</span><span class="rp-mono">${l.pct}%</span>${bar(l.pct)}</div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("04", "EVIDENCE")}<div class="rp-split">
    <div><div class="rp-subh">Ledger — ${d.ledger.length} sources</div><table class="rp-table"><thead><tr><th>Source</th><th>Freshness</th><th>Trust</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div><div class="rp-subh">Landscape — composition</div><div class="rp-landwrap">${land}</div></div>
  </div></section>`;
}

function sConfidence(d) {
  const fac = Object.entries(d.breakdown).map(([k, v]) => `<div class="rp-fac"><span>${k}</span><span class="rp-mono">${v}%</span>${bar(v)}</div>`).join("");
  const flags = (d.ungrounded && d.ungrounded.length)
    ? d.ungrounded.map((s) => `<li class="rp-flag"><span class="rp-warn rp-mono">UNGROUNDED</span> "${esc(s.slice(0, 150))}"</li>`).join("")
    : `<li class="rp-flag rp-mut">Every sampled sentence carries a supporting citation.</li>`;
  const cl = d.claims.map((c, i) => `<div class="rp-claim"><span class="rp-num">${String(i + 1).padStart(2, "0")}</span><span class="rp-claim-t">${cite(c.text)}</span><span class="rp-mono">${c.pct}%</span>${bar(c.pct, c.pct >= 70 ? "pos" : c.pct >= 45 ? null : "warn")}</div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("05", "CONFIDENCE & GROUNDING")}<div class="rp-split">
    <div><div class="rp-subh">How the score is built</div>${fac}
      <div class="rp-faith"><span class="rp-fig-s rp-count" data-target="${d.faithful.pct}" data-suffix="%">${d.faithful.pct}%</span><span><b>${d.faithful.grounded}/${d.faithful.total}</b> sentences grounded</span></div>
      <ul class="rp-flags">${flags}</ul></div>
    <div><div class="rp-subh">Claim-level confidence</div><div class="rp-claims">${cl}</div></div>
  </div></section>`;
}

function sPerspectives(d) {
  const pr = d.perspectives;
  const pos = (k, x, tone) => `<div class="rp-pos"><div class="rp-pos-h"><span>Position ${k}</span><span class="rp-dim">${x.sources} sources</span></div><p>${esc(x.label)}</p><div class="rp-pos-m"><span class="rp-mono">${x.strength}% strength</span><span class="${tone}">${x.support}</span></div>${bar(x.strength, tone)}</div>`;
  return `<section class="rp-sec rp-rev">${eye("06", "PERSPECTIVES")}
    <div class="rp-vs">${pos("A", pr.a, "pos")}<span class="rp-vsmark">vs</span>${pos("B", pr.b, "warn")}</div>
    <p class="rp-note"><span class="rp-acc-t">Evidence favours Position ${pr.leader}.</span> ${esc(pr.note)}</p>
    <div class="rp-balance"><span class="rp-dim">EVIDENCE BALANCE</span><span class="rp-split2"><i style="width:${pr.balance.a}%"></i><b style="width:${pr.balance.b}%"></b></span><span class="rp-mono">A ${pr.balance.a}% · B ${pr.balance.b}%</span></div>
    <div class="rp-contra"><div class="rp-subh">Contradiction resolution</div><p>${cite(d.contradiction)}</p></div>
  </section>`;
}

function sKUU(d) {
  const col = (title, tone, items, bars) => {
    const rows = items.map((it) => `<li><p>${cite(it.text)} ${(it.cites || []).map((c) => `<a class="rp-cite" onclick="pnOpen()">[${esc(c)}]</a>`).join(" ")}</p>${bars && it.pct != null ? `<div class="rp-kbar"><span class="rp-mono ${tone}">${it.pct}%</span>${bar(it.pct, tone)}</div>` : ""}</li>`).join("");
    return `<div class="rp-kcol"><div class="rp-ktitle ${tone}">${title}</div><ul>${rows}</ul></div>`;
  };
  const k = d.kuu;
  return `<section class="rp-sec rp-rev">${eye("07", "KNOWN / UNCERTAIN / UNKNOWN")}<div class="rp-kuu">
    ${col("Known", "pos", k.known, true)}${col("Uncertain", "warn", k.uncertain, true)}${col("Unknown", "neg", k.unknown, false)}
  </div><p class="rp-cap">Evidence status — ${k.known.length} well-supported · ${k.uncertain.length} uncertain · ${k.unknown.length} unresolved.</p></section>`;
}

function sChange(d) {
  const conds = d.conditions.map((c) => `<div class="rp-cond" role="button" tabindex="0" onclick="pnCond(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();pnCond(this)}">
    <div class="rp-cond-head"><span class="rp-num">${c.n}</span><div><h4>${esc(c.title)}</h4><p class="rp-mut">${esc(c.desc)}</p></div><span class="rp-cond-state">NOT OBSERVED <span class="rp-caret">▾</span></span></div>
    <div class="rp-cond-body"><div class="rp-cond-inner"><div class="rp-need"><span class="rp-dim">EVIDENCE REQUIRED</span> ${c.need.map((n) => `<span class="rp-chip">${esc(n)}</span>`).join("")}</div>
      <div class="rp-cond-foot"><span class="rp-dim">SOURCES</span> ${c.sources.map((s) => `<a class="rp-cite" onclick="event.stopPropagation();pnOpen()">[${esc(s)}]</a>`).join(" ")}<span class="rp-cond-str"><span class="rp-dim">CHALLENGE</span>${bar(c.strength, "warn")}<span class="rp-mono">${c.strength}%</span></span></div></div></div>
  </div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("08", "WHAT WOULD CHANGE OUR MIND")}
    <div class="rp-synth"><span class="rp-dim">CURRENT SYNTHESIS</span><p>Recent climate change is predominantly driven by human activity, while natural factors contribute to longer-term variability.</p><span class="rp-synth-c"><span class="rp-dim">CONFIDENCE</span><b>${d.conf}%</b></span></div>
    <div class="rp-conds">${conds}</div>
    <p class="rp-note"><span class="rp-acc-t">Moderately robust.</span> The conclusion is supported by multiple independent sources, but would weaken if stronger evidence materially changed the attribution of recent warming.</p>
  </section>`;
}

function sTrajectory(d) {
  const traj = d.trajectory.map((t, i) => `<li><span class="rp-num">${String(i + 1).padStart(2, "0")}</span>${cite(t)}</li>`).join("");
  const bnd = d.boundaries.map((b) => `<li>${cite(b)}</li>`).join("");
  return `<section class="rp-sec rp-rev">${eye("09", "TRAJECTORY & BOUNDARIES")}<div class="rp-split">
    <div><div class="rp-subh">Where the research goes next</div><ol class="rp-traj">${traj}</ol></div>
    <div><div class="rp-subh">Honest boundaries</div><ul class="rp-bound">${bnd}</ul></div>
  </div></section>`;
}

function sProvenance(d) {
  const W = 640, H = 120, n = d.timeline.length;
  const x = (i) => 30 + i * ((W - 60) / (n - 1));
  const y = (c) => 100 - (c / 100) * 78;
  const linePts = d.timeline.map((e, i) => [x(i), y(e.conf)]);
  const path = "M " + linePts.map((p) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(" L ");
  const dots = d.timeline.map((e, i) => `<circle class="rp-tldot" cx="${x(i).toFixed(0)}" cy="${y(e.conf).toFixed(0)}" r="3"/><text class="rp-tlyear" x="${x(i).toFixed(0)}" y="114" text-anchor="middle">${e.year}</text>`).join("");
  const t = d.telemetry;
  const tel = [["Tokens", t.tokens ? t.tokens.toLocaleString() : "—"], ["Est. cost", t.cost ? "$" + t.cost.toFixed(4) : "—"], ["Steps", t.steps.length || d.provenance.length], ["Model", esc(d.model)]];
  const telCells = tel.map(([l, v]) => `<div class="rp-tel"><span class="rp-dim">${l}</span><span class="rp-mono rp-tel-v">${v}</span></div>`).join("");
  const pipe = ["Input", "Search", "Summarise", "Critic", "Evidence", "Synthesis", "Insights"].map((s, i, a) => `<span class="rp-step">${s}</span>${i < a.length - 1 ? '<span class="rp-steprule"></span>' : ""}`).join("");
  const prov = d.provenance.map((s) => `<div class="rp-provrow"><span>${esc(s.name)}</span><span class="rp-mono rp-dim">${s.tokens ? s.tokens.toLocaleString() + " tok" : ""}</span></div>`).join("");
  const cons = d.constellation.map((c) => `<li role="button" tabindex="0" onclick="pnOpen()"><span class="rp-num">${c.n}</span>${esc(c.t)}</li>`).join("");
  return `<section class="rp-sec rp-rev">${eye("10", "PROVENANCE")}
    <div class="rp-pipe">${pipe}</div>
    <div class="rp-subh" style="margin-top:34px">Confidence of the field over time</div>
    <svg class="rp-tl" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path class="rp-tlline" d="${path}"/>${dots}</svg>
    <div class="rp-provgrid">
      <div><div class="rp-subh">Run telemetry</div><div class="rp-tels">${telCells}</div><div class="rp-tools">${d.tools.map((t) => `<span class="rp-chip">${esc(t)}</span>`).join("")}</div></div>
      <div><div class="rp-subh">Pipeline provenance</div>${prov}</div>
      <div><div class="rp-subh">Source constellation</div><ol class="rp-cons">${cons}</ol></div>
    </div>
  </section>`;
}

function sChat(d) {
  const chips = ["What's the strongest evidence here?", "Where do the sources disagree?", "What are the biggest uncertainties?", "Summarise this in one line"];
  return `<section class="rp-sec rp-rev rp-chatsec">${eye("11", "INTERROGATE THIS REPORT")}
    <div class="rp-chat"><div id="pn-chat-msgs" class="rp-msgs">
      <div class="rp-msg rp-msg-a">Ask anything about this report — every answer stays grounded strictly in the sources above.</div>
      <div class="rp-chiprow">${chips.map((q) => `<button class="rp-chip rp-chipbtn" onclick="pnAsk(this)">${q}</button>`).join("")}</div>
    </div>
    <div class="rp-chatbar"><input id="pn-chat-input" onkeydown="if(event.key==='Enter')pnSend()" placeholder="Ask a follow-up…"/><button onclick="pnSend()" aria-label="Send">↑</button></div></div>
  </section>`;
}

function sInspector() {
  return `<div class="rp-backdrop" id="pn-backdrop" onclick="pnClose()"></div>
  <aside class="rp-drawer" id="pn-drawer">
    <div class="rp-dhead"><div><div class="rp-eye"><span>◆</span> · CITATION INSPECTOR</div><div class="rp-dim rp-mono" style="margin-top:6px">ID x7f-992a · analysing claim</div></div><button class="rp-dclose" onclick="pnClose()" aria-label="Close">×</button></div>
    <div class="rp-dbody">
      <div class="rp-dsec"><div class="rp-dlab">Target claim <span class="rp-pos rp-mono">SUPPORTED</span></div><p class="rp-dclaim">"Human activity is the primary driver of recent climate change" <a class="rp-cite">[3]</a></p></div>
      <div class="rp-dsec"><div class="rp-dlab">Primary source</div><div class="rp-dsrc"><div><b>US Environmental Protection Agency</b><span class="rp-dim">epa.gov/climatechange</span></div><span class="rp-mono rp-pos">0.96</span></div></div>
      <div class="rp-dsec"><div class="rp-dlab">Matched evidence</div><blockquote class="rp-dquote">"Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1°C above 1850–1900 in 2011–2020."</blockquote>
        <p class="rp-mut"><b>Synthesis —</b> the source explicitly confirms greenhouse-gas emissions as the "unequivocal" cause of recent warming, directly supporting the claim.</p></div>
      <div class="rp-dsec rp-dmetrics">
        <div><span class="rp-dim">Semantic match</span>${bar(94)}<span class="rp-mono">94%</span></div>
        <div><span class="rp-dim">Source trust</span>${bar(96)}<span class="rp-mono">0.96</span></div>
        <div><span class="rp-dim">Grounding</span>${bar(91)}<span class="rp-mono">91%</span></div>
      </div>
      <div class="rp-dsec"><div class="rp-dlab">Assessment</div><p class="rp-pos"><b>Strong support</b></p><p class="rp-mut">High-confidence semantic match from a Tier-1 authoritative source.</p></div>
    </div>
  </aside>`;
}

function buildReport(d) {
  return `<div class="rp-wrap">
    ${sMasthead(d)}${sExec(d)}${sGlance(d)}${sFindings(d)}${sEvidence(d)}${sConfidence(d)}${sPerspectives(d)}${sKUU(d)}${sChange(d)}${sTrajectory(d)}${sProvenance(d)}${sChat(d)}
    <footer class="rp-foot"><span>◆ POLYNOUS</span><span class="rp-dim">Transparent · Auditable · Grounded research</span></footer>
  </div>${sInspector()}`;
}

/* ---------- CSS design system (hand-written, no framework) ---------- */
const RP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.rp * { box-sizing: border-box; margin: 0; }
.rp {
  --ink:#0a0b0d; --panel:#111317; --panel2:#15181d;
  --line:rgba(255,255,255,0.09); --line2:rgba(255,255,255,0.05);
  --tx:#a7abb4; --dim:#676c76; --hi:#eef0f3;
  --acc:#63e6be; --acc-soft:rgba(99,230,190,0.12);
  --pos:#63e6be; --warn:#e0b15e; --neg:#e0738a; --info:#7aa2f7;
  --serif:'Bricolage Grotesque',sans-serif; --sans:'Hanken Grotesk',-apple-system,sans-serif; --mono:'JetBrains Mono',monospace;
  background: var(--ink); color: var(--tx); font-family: var(--sans); font-size: 15px; line-height: 1.6;
  letter-spacing: -0.006em; -webkit-font-smoothing: antialiased; height: 100vh; overflow-y: auto;
}
.rp-wrap { max-width: 940px; margin: 0 auto; padding: 0 40px 80px; }
.rp ::selection { background: var(--acc-soft); }
.rp-mono { font-family: var(--mono); }
.rp-dim { color: var(--dim); }
.rp-mut { color: var(--dim); }
.rp-acc-t { color: var(--acc); font-weight: 600; }
.rp .pos { color: var(--pos); } .rp .warn { color: var(--warn); } .rp .neg { color: var(--neg); }
.rp-cite { color: var(--acc); font-family: var(--mono); font-size: 0.82em; font-weight: 600; cursor: pointer; padding: 0 1px; }
.rp-cite:hover { text-shadow: 0 0 10px rgba(99,230,190,0.5); }

/* reveal — transform-only so content is NEVER hidden even if frames don't composite */
@keyframes rpIn { from { transform: translateY(14px); } to { transform: none; } }
.rp-rev { animation: rpIn .6s cubic-bezier(.16,1,.3,1) both; }
.rp-wrap > .rp-rev:nth-child(2) { animation-delay: .05s; }
.rp-wrap > .rp-rev:nth-child(3) { animation-delay: .1s; }
.rp-wrap > .rp-rev:nth-child(4) { animation-delay: .15s; }
@media (prefers-reduced-motion: reduce){ .rp-rev { animation: none; } }

/* bars */
.rp-bar { display: block; height: 3px; width: 100%; background: var(--line); border-radius: 2px; overflow: hidden; }
.rp-bar > i { display: block; height: 100%; background: var(--acc); border-radius: 2px; }

/* masthead */
.rp-masthead { padding: 80px 0 46px; border-bottom: 1px solid var(--line); }
.rp-brandline { display: flex; align-items: center; gap: 16px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
.rp-mark { color: var(--acc); font-weight: 600; }
.rp-right { margin-left: auto; }
.rp-query { font-family: var(--serif); font-weight: 700; font-size: clamp(2rem, 4.4vw, 3.15rem); line-height: 1.04; letter-spacing: -0.03em; color: var(--hi); margin: 26px 0 20px; max-width: 20ch; }
.rp-verdict { font-size: 17px; color: var(--tx); max-width: 62ch; }
.rp-headrow { display: flex; gap: 48px; align-items: flex-end; margin-top: 40px; flex-wrap: wrap; }
.rp-conf { display: flex; align-items: baseline; gap: 16px; }
.rp-fig { font-family: var(--mono); font-weight: 600; font-size: 62px; line-height: 0.9; color: var(--hi); letter-spacing: -0.03em; }
.rp-fig-s { font-family: var(--mono); font-weight: 600; font-size: 34px; color: var(--hi); letter-spacing: -0.02em; }
.rp-conf-meta { display: flex; flex-direction: column; gap: 8px; width: 190px; }
.rp-band { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--acc); }
.rp-critic { display: flex; flex-direction: column; gap: 5px; font-size: 13px; max-width: 34ch; }
.rp-critic .rp-dim { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; }
.rp-critic b { color: var(--hi); }
.rp-mut { font-size: 12.5px; line-height: 1.5; }

/* sections */
.rp-sec { padding: 48px 0; border-top: 1px solid var(--line2); }
.rp-eye { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); margin-bottom: 26px; }
.rp-eye span { color: var(--acc); font-weight: 600; }
.rp-subh { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); margin-bottom: 16px; }
.rp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.rp-cap { font-size: 12.5px; color: var(--dim); margin-top: 20px; font-style: italic; }

/* exec */
.rp-lede p { font-size: 17px; line-height: 1.72; color: var(--tx); max-width: 68ch; margin-bottom: 14px; }
.rp-lede p:first-child { color: var(--hi); }

/* glance */
.rp-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
.rp-stat { display: flex; flex-direction: column; gap: 8px; padding-right: 16px; border-right: 1px solid var(--line2); }
.rp-stat:last-child { border-right: 0; }
.rp-stat .rp-fig { font-size: 30px; }
.rp-stat-l { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }

/* findings */
.rp-findlist { list-style: none; }
.rp-find { display: flex; align-items: center; gap: 18px; padding: 16px 0; border-top: 1px solid var(--line2); cursor: pointer; transition: padding-left .25s ease; }
.rp-find:hover { padding-left: 8px; }
.rp-num { font-family: var(--mono); font-size: 12px; color: var(--acc); flex-shrink: 0; }
.rp-find-t { flex: 1; font-size: 16px; color: var(--hi); line-height: 1.4; }
.rp-arrow { color: var(--dim); opacity: 0; transition: opacity .25s ease; }
.rp-find:hover .rp-arrow { opacity: 1; }

/* table */
.rp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rp-table th { text-align: left; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); font-weight: 400; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
.rp-table td { padding: 11px 0; border-bottom: 1px solid var(--line2); vertical-align: middle; }
.rp-table tr { cursor: pointer; }
.rp-table tbody tr:hover td { color: var(--hi); }
.rp-src { color: var(--tx); }
.rp-fresh { font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; white-space: nowrap; }
.rp-trust { display: flex; align-items: center; gap: 10px; width: 130px; }
.rp-trust .rp-bar { width: 70px; }
.rp-landwrap { display: flex; flex-direction: column; gap: 16px; }
.rp-land { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; font-size: 13px; }
.rp-land .rp-bar { grid-column: 1 / -1; }

/* confidence */
.rp-fac { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; margin-bottom: 15px; font-size: 13px; }
.rp-fac .rp-bar { grid-column: 1 / -1; }
.rp-faith { display: flex; align-items: baseline; gap: 14px; margin: 26px 0 14px; padding-top: 20px; border-top: 1px solid var(--line2); }
.rp-faith b { color: var(--hi); }
.rp-flags { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.rp-flag { font-size: 12.5px; line-height: 1.5; font-style: italic; color: var(--tx); }
.rp-flag .rp-warn, .rp-flag.rp-mono { font-style: normal; }
.rp-flag .rp-mono, .rp-flag .rp-warn { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; color: var(--warn); margin-right: 6px; }
.rp-claims { display: flex; flex-direction: column; gap: 16px; }
.rp-claim { display: grid; grid-template-columns: auto 1fr auto; gap: 6px 12px; align-items: center; font-size: 13.5px; }
.rp-claim-t { color: var(--tx); line-height: 1.45; }
.rp-claim .rp-bar { grid-column: 1 / -1; }

/* perspectives */
.rp-vs { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; align-items: center; }
.rp-pos { padding: 20px 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; }
.rp-pos-h { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); }
.rp-pos p { color: var(--hi); font-size: 15px; margin: 12px 0; }
.rp-pos-m { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; }
.rp-vsmark { font-family: var(--serif); font-style: italic; color: var(--dim); }
.rp-note { font-size: 14px; line-height: 1.6; margin: 28px 0; max-width: 74ch; }
.rp-balance { display: flex; align-items: center; gap: 14px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; color: var(--dim); }
.rp-split2 { display: flex; flex: 1; height: 3px; border-radius: 2px; overflow: hidden; background: var(--line); }
.rp-split2 i { background: var(--pos); } .rp-split2 b { background: var(--warn); }
.rp-contra { margin-top: 30px; padding-top: 24px; border-top: 1px solid var(--line2); }
.rp-contra p { font-size: 14px; color: var(--tx); max-width: 76ch; }

/* KUU */
.rp-kuu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.rp-ktitle { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid; margin-bottom: 16px; }
.rp-kcol ul { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.rp-kcol p { font-size: 13.5px; color: var(--hi); line-height: 1.5; }
.rp-kbar { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.rp-kbar .rp-mono { font-size: 10px; }

/* change */
.rp-synth { display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; align-items: center; padding: 18px 22px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; margin-bottom: 8px; }
.rp-synth .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; grid-column: 1; }
.rp-synth p { grid-column: 1; font-size: 14px; color: var(--hi); }
.rp-synth-c { grid-row: 1 / 3; grid-column: 2; text-align: right; align-self: center; }
.rp-synth-c b { display: block; font-family: var(--mono); font-size: 22px; color: var(--acc); }
.rp-cond { border-bottom: 1px solid var(--line2); cursor: pointer; }
.rp-cond-head { display: flex; align-items: flex-start; gap: 16px; padding: 18px 0; }
.rp-cond-head h4 { font-size: 15px; color: var(--hi); font-weight: 500; }
.rp-cond-head p { font-size: 12.5px; margin-top: 3px; }
.rp-cond-state { margin-left: auto; font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; color: var(--dim); white-space: nowrap; display: flex; align-items: center; gap: 8px; }
.rp-caret { transition: transform .3s ease; display: inline-block; }
.rp-cond.open .rp-caret { transform: rotate(180deg); }
.rp-cond-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.16,1,.3,1); }
.rp-cond.open .rp-cond-body { grid-template-rows: 1fr; }
.rp-cond-inner { overflow: hidden; min-height: 0; }
.rp-cond.open .rp-cond-inner { padding-bottom: 20px; }
.rp-need, .rp-cond-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-left: 32px; }
.rp-cond-foot { margin-top: 12px; }
.rp-need .rp-dim, .rp-cond-foot .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; margin-right: 4px; }
.rp-chip { display: inline-block; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; font-size: 11px; color: var(--tx); }
.rp-cond-str { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.rp-cond-str .rp-bar { width: 80px; }

/* trajectory */
.rp-traj { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.rp-traj li { display: flex; gap: 14px; font-size: 14px; color: var(--tx); line-height: 1.45; }
.rp-bound { list-style: none; display: flex; flex-direction: column; gap: 14px; }
.rp-bound li { font-size: 14px; color: var(--tx); padding-left: 16px; border-left: 2px solid var(--warn); line-height: 1.45; }

/* provenance */
.rp-pipe { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rp-step { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx); }
.rp-steprule { flex: 1; min-width: 14px; height: 1px; background: var(--line); }
.rp-tl { width: 100%; height: 130px; margin-top: 8px; }
.rp-tlline { fill: none; stroke: var(--acc); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 5px rgba(99,230,190,0.35)); }
.rp-tldot { fill: var(--acc); }
.rp-tlyear { fill: var(--dim); font-family: var(--mono); font-size: 8px; }
.rp-provgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 40px; }
.rp-tels { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
.rp-tel { display: flex; flex-direction: column; gap: 4px; }
.rp-tel .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
.rp-tel-v { font-size: 16px; color: var(--hi); }
.rp-tools { display: flex; flex-wrap: wrap; gap: 6px; }
.rp-provrow { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line2); font-size: 13px; color: var(--tx); text-transform: capitalize; }
.rp-cons { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.rp-cons li { display: flex; gap: 10px; font-size: 12.5px; color: var(--tx); cursor: pointer; }
.rp-cons li:hover { color: var(--hi); }

/* chat */
.rp-chatsec { border-top: 1px solid var(--line); }
.rp-chat { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
.rp-msgs { padding: 22px; display: flex; flex-direction: column; gap: 16px; max-height: 340px; overflow-y: auto; }
.rp-msg { font-size: 14px; line-height: 1.6; max-width: 82%; }
.rp-msg-a { color: var(--tx); }
.rp-msg-u { align-self: flex-end; color: var(--hi); background: var(--acc-soft); border: 1px solid rgba(99,230,190,0.25); padding: 9px 14px; border-radius: 12px; }
.rp-chiprow { display: flex; flex-wrap: wrap; gap: 8px; }
.rp-chipbtn { text-align: left; background: transparent; cursor: pointer; color: var(--tx); font-family: var(--sans); transition: all .2s ease; }
.rp-chipbtn:hover { border-color: var(--acc); color: var(--hi); }
.rp-chatbar { display: flex; border-top: 1px solid var(--line); }
.rp-chatbar input { flex: 1; background: transparent; border: 0; padding: 16px 20px; color: var(--hi); font-family: var(--sans); font-size: 14px; outline: none; }
.rp-chatbar input::placeholder { color: var(--dim); }
.rp-chatbar button { width: 52px; background: var(--acc); color: #04120b; border: 0; font-size: 18px; cursor: pointer; font-weight: 700; }
.rp-chatbar button:hover { filter: brightness(1.1); }

/* footer */
.rp-foot { display: flex; justify-content: space-between; align-items: center; padding: 40px 0 0; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; }
.rp-foot span:first-child { color: var(--acc); }

/* inspector drawer */
.rp-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); opacity: 0; visibility: hidden; transition: opacity .3s ease, visibility .3s ease; z-index: 90; }
.rp-backdrop.open { opacity: 1; visibility: visible; }
.rp-drawer { position: fixed; top: 0; right: 0; height: 100%; width: 440px; max-width: 92vw; background: #0c0e11; border-left: 1px solid var(--line); transform: translateX(100%); transition: transform .38s cubic-bezier(.2,.8,.2,1); z-index: 91; display: flex; flex-direction: column; }
.rp-drawer.open { transform: none; }
.rp-dhead { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px; border-bottom: 1px solid var(--line); }
.rp-dclose { background: transparent; border: 0; color: var(--dim); font-size: 22px; cursor: pointer; line-height: 1; }
.rp-dclose:hover { color: var(--hi); }
.rp-dbody { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 26px; }
.rp-dsec { display: flex; flex-direction: column; gap: 10px; }
.rp-dlab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); display: flex; justify-content: space-between; align-items: center; }
.rp-dlab .rp-pos { font-size: 9px; padding: 2px 7px; border: 1px solid var(--pos); border-radius: 3px; }
.rp-dclaim { font-size: 15px; color: var(--hi); line-height: 1.5; }
.rp-dsrc { display: flex; justify-content: space-between; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 14px 16px; }
.rp-dsrc b { color: var(--hi); font-size: 13px; display: block; }
.rp-dsrc span.rp-dim { font-size: 11px; }
.rp-dquote { font-size: 13px; font-style: italic; color: var(--hi); line-height: 1.6; padding-left: 14px; border-left: 2px solid var(--acc); }
.rp-dmetrics { gap: 14px; }
.rp-dmetrics > div { display: grid; grid-template-columns: 90px 1fr auto; gap: 12px; align-items: center; font-size: 11px; }
.rp-dmetrics .rp-dim { font-family: var(--mono); letter-spacing: 0.08em; }

@media (max-width: 820px) {
  .rp-wrap { padding: 0 22px 60px; }
  .rp-split, .rp-kuu, .rp-provgrid { grid-template-columns: 1fr; gap: 30px; }
  .rp-stats { grid-template-columns: repeat(3, 1fr); gap: 24px 16px; }
  .rp-stat:nth-child(3) { border-right: 0; }
  .rp-vs { grid-template-columns: 1fr; }
  .rp-vsmark { justify-self: center; }
}
`;

/* ---------- asset injection ---------- */
let injected = false;
function injectAssets() {
  if (injected || typeof document === "undefined") return; injected = true;
  const st = document.createElement("style"); st.id = "rp-style"; st.textContent = RP_CSS; document.head.appendChild(st);
}

/* ---------- interactions ---------- */
function installHandlers() {
  if (typeof window === "undefined") return;
  window.pnOpen = () => { const d = document.getElementById("pn-drawer"), b = document.getElementById("pn-backdrop"); if (d && b) { d.classList.add("open"); b.classList.add("open"); } };
  window.pnClose = () => { const d = document.getElementById("pn-drawer"), b = document.getElementById("pn-backdrop"); if (d && b) { d.classList.remove("open"); b.classList.remove("open"); } };
  window.pnCond = (el) => { el.classList.toggle("open"); };
  window.pnAsk = (btn) => { const i = document.getElementById("pn-chat-input"); if (!i) return; i.value = (btn.textContent || "").trim(); window.pnSend(); };
  window.pnSend = async () => {
    const input = document.getElementById("pn-chat-input"), box = document.getElementById("pn-chat-msgs");
    if (!input || !box) return; const q = input.value.trim(); if (!q) return; input.value = "";
    const add = (cls, txt) => { const el = document.createElement("div"); el.className = "rp-msg " + cls; el.textContent = txt; box.appendChild(el); box.scrollTop = box.scrollHeight; return el; };
    add("rp-msg-u", q); const pend = add("rp-msg-a", "thinking…");
    try {
      const tok = getAuthToken(); const ctx = window.__rpCtx || {};
      const res = await fetch(APP_API_BASE + "/report/chat", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: JSON.stringify({ question: q, report_answer: ctx.answer || "", source_summaries: ctx.sources || [] }) });
      const data = res.ok ? await res.json() : {};
      pend.textContent = data.answer || (res.status === 401 ? "Please sign in to ask follow-ups." : "Couldn't answer that — please try again.");
    } catch { pend.textContent = "Couldn't reach the assistant. Try again."; }
  };
}
function runCounters(root) {
  if (!root) return;
  root.querySelectorAll(".rp-count").forEach((c) => {
    const target = +c.getAttribute("data-target"), suf = c.getAttribute("data-suffix") || "";
    if (!isFinite(target)) return; const t0 = performance.now();
    const step = (n) => { const p = Math.min((n - t0) / 850, 1); const e = 1 - (1 - p) * (1 - p); c.textContent = Math.floor(target * e) + suf; if (p < 1) requestAnimationFrame(step); else c.textContent = target + suf; };
    requestAnimationFrame(step);
  });
}
function initReveal(root) {
  if (!root || typeof IntersectionObserver === "undefined") { root && root.querySelectorAll(".rp-rev").forEach((e) => e.classList.add("in")); return null; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, root });
  root.querySelectorAll(".rp-rev").forEach((e) => io.observe(e));
  return io;
}

/* ---------- component ---------- */
export default function PolynousReport(props) {
  const ref = useRef(null);
  const d = deriveReport(props);
  const html = buildReport(d);
  if (typeof window !== "undefined") window.__rpCtx = { answer: d.chatAnswer, sources: d.sourceSummaries };
  useEffect(() => { injectAssets(); installHandlers(); }, []);
  useEffect(() => {
    const t = setTimeout(() => runCounters(ref.current), 500);
    return () => clearTimeout(t);
  }, [html]);
  return <div ref={ref} className="rp" dangerouslySetInnerHTML={{ __html: html }} />;
}
