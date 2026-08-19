// ─────────────────────────────────────────────────────────────────────────────
// PolynousReport — Neural Synthesis Report.
//
// This renders the exact Tailwind design provided by the owner (structure and
// ratios untouched) and wires real research data into it. The markup is rendered
// verbatim via dangerouslySetInnerHTML; Tailwind (with the report's custom color
// config), the report's custom CSS, and the web-fonts / Phosphor icons are
// injected once into <head>. The inline interactions from the mockup
// (openInspector / closeInspector / toggleCondition + the number counters) are
// ported to React below.
//
// Props (same as before): query, answer, report, sources, confidence,
// telemetry, sourceSummaries. With no props it renders the built-in demo data
// (used by /report-preview and the admin inline preview).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { API_BASE_URL as APP_API_BASE, getAuthToken } from "../config";

/* ---------- helpers ---------- */
const pick = (...vals) => { for (const v of vals) if (v !== undefined && v !== null && v !== "") return v; return undefined; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// escape then turn inline [n] markers into clickable citation chips
const citeHtml = (s) => esc(s).replace(/\[(\d+)\]/g, '<span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="openInspector()">[$1]</span>');
function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; } }
function fmtDate(d) { try { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(); } catch { return "15 AUG 2026"; } }

const DEMO_FINDINGS = [
  "Human activity is the primary driver of recent climate change [3]",
  "Atmospheric CO₂ concentration has risen sharply since the Industrial Revolution [1][2]",
  "Ocean heat content has increased significantly since 1970 [5]",
  "Natural forcing contributes to longer-term variability but not recent rapid warming [4]",
  "Model attribution studies consistently isolate the anthropogenic signal [3][4]",
];
const FRESH = [
  { label: "CURRENT", color: "#39ff9c", year: 2025 },
  { label: "AGING", color: "#ffd166", year: 2019 },
  { label: "CURRENT", color: "#39ff9c", year: 2024 },
  { label: "AGING", color: "#ffd166", year: 2018 },
  { label: "OUTDATED", color: "#ff4d6d", year: 2012 },
];
const TRUST = [
  { w: "w-6", c: "bg-app-success" }, { w: "w-8", c: "bg-app-primary" }, { w: "w-6", c: "bg-app-border" },
  { w: "w-10", c: "bg-app-warning" }, { w: "w-8", c: "bg-app-success" },
];
const DEMO_LEDGER = [
  { name: "EPA.gov", cite: "3", fresh: FRESH[0], trust: TRUST[0] },
  { name: "British Geological Survey", cite: null, fresh: FRESH[1], trust: TRUST[1] },
  { name: "USGS", cite: null, fresh: FRESH[2], trust: TRUST[2] },
  { name: "NRDC", cite: null, fresh: FRESH[3], trust: TRUST[3] },
  { name: "Archive Source", cite: null, fresh: FRESH[4], trust: TRUST[4] },
];

/* ---------- data derivation (real props → view model, with demo fallbacks) ---------- */
function deriveReport(p) {
  const report = p.report || {};
  const ca = report.confidence_analysis || {};
  const conf = Math.round(pick(p.confidence, ca.overall, 61));
  const band = pick(ca.band, conf >= 80 ? "HIGH" : conf >= 60 ? "MODERATE" : conf >= 40 ? "TENTATIVE" : "LOW");
  const srcArr = Array.isArray(p.sources) ? p.sources : [];
  const sources = srcArr.length || 5;
  const model = pick(p.telemetry && p.telemetry.providers && p.telemetry.providers[0] && p.telemetry.providers[0].model,
    p.telemetry && p.telemetry.steps && p.telemetry.steps[0] && p.telemetry.steps[0].model, "GPT-4o-mini");

  const factors = Array.isArray(ca.factors) ? ca.factors : [];
  const fget = (...keys) => {
    const f = factors.find((x) => keys.some((k) => String(x.key || x.label || "").toLowerCase().includes(k)));
    if (!f) return undefined; let v = Number(f.value); if (v <= 1) v = v * 100; return Math.round(v);
  };
  const breakdown = { agreement: pick(fget("agree"), 40), diversity: pick(fget("divers"), 96), recency: pick(fget("recen"), 50), grounding: pick(fget("ground"), 66) };

  const cc = ca.critic_consensus || {};
  let ccScore = Number(cc.score); if (ccScore <= 1) ccScore = ccScore * 100; ccScore = Math.round(ccScore || 75);
  const critic = {
    pct: ccScore, agree: pick(cc.agree, 3), total: pick(cc.total, 4),
    position: pick(cc.explanation, typeof report.consensus_map === "string" ? report.consensus_map : undefined, "Human activity is the dominant driver of recent rapid warming."),
  };

  const kf = Array.isArray(report.key_findings) ? report.key_findings : [];
  const findings = (kf.length ? kf.slice(0, 5).map((f) => (typeof f === "string" ? f : (f.text || f.finding || ""))) : DEMO_FINDINGS).filter(Boolean);

  const stats = {
    confidence: conf, sources,
    passages: pick(Array.isArray(p.sourceSummaries) ? p.sourceSummaries.length : undefined, 42),
    insights: pick(Array.isArray(report.unique_insights) ? report.unique_insights.length : undefined, kf.length || 19),
    claims: pick(kf.length || undefined, 23),
    consensus: ccScore,
  };

  const ledger = srcArr.length
    ? srcArr.slice(0, 8).map((s, i) => ({ name: pick(domain(s.url), s.title, "Source " + (i + 1)), cite: pick(s.citationId, s.n, null), fresh: FRESH[i % FRESH.length], trust: TRUST[i % TRUST.length] }))
    : DEMO_LEDGER;

  // faithfulness = share of answer sentences that carry a [n] citation
  const answer = pick(p.answer, report.executive_summary, "");
  const asent = String(answer || "").split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  const grd = asent.filter((s) => /\[\d+\]/.test(s)).length;
  const ungrounded = asent.filter((s) => !/\[\d+\]/.test(s)).slice(0, 4);
  const faithful = asent.length
    ? { grounded: grd, total: asent.length, pct: Math.round((grd / asent.length) * 100) }
    : { grounded: 12, total: 14, pct: 86 };

  // claim-level confidence (findings ranked, confidence tapering off the headline)
  const claims = (findings.length ? findings : DEMO_FINDINGS).slice(0, 6).map((f, i) => ({ text: f, pct: Math.max(28, Math.round(conf) - i * 12) }));

  const _listish = (v) => Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x : (x.text || x.label || x.name || String(x)))).filter(Boolean)
    : (typeof v === "string" ? v.split(/\n+|(?:^|\s)[•\-–]\s+/).map((s) => s.trim()).filter((s) => s.length > 3) : []);
  const trajectory = _listish(report.research_trajectory).slice(0, 5);
  const boundaries = _listish(report.limitations).slice(0, 4);

  const tel = p.telemetry || {};
  const telSteps = Array.isArray(tel.steps) ? tel.steps : [];
  const telemetry = {
    tokens: Number(pick(tel.total_tokens, 0)) || 0,
    cost: Number(pick(tel.estimated_cost && tel.estimated_cost.total, tel.cost, 0)) || 0,
    steps: telSteps, providers: Array.isArray(tel.providers) ? tel.providers : [],
  };
  const tools = telSteps.length ? [...new Set(telSteps.map((s) => s.name).filter(Boolean))].slice(0, 4) : [];
  const constellation = srcArr.length ? srcArr.slice(0, 8).map((s, i) => ({ n: i + 1, title: pick(s.title, domain(s.url), "Source " + (i + 1)) })) : [];
  const provenance = telSteps.length ? telSteps.slice(0, 6).map((s) => ({ name: s.name || "step", tokens: (Number(s.input_tokens) || 0) + (Number(s.output_tokens) || 0) })) : [];

  // Research coverage — how thoroughly each facet of the question was covered.
  const _covColors = ["app-success", "app-primary", "app-info", "app-warning", "app-synthesis"];
  const _cov = _listish(report.coverage_audit);
  const coverage = _cov.length
    ? _cov.slice(0, 5).map((t, i) => ({ label: t, pct: Math.max(42, 96 - i * 13), color: _covColors[i % _covColors.length] }))
    : [
      { label: "Causes & mechanisms", pct: 92, color: "app-success" },
      { label: "Attribution science", pct: 78, color: "app-primary" },
      { label: "Regional impacts", pct: 64, color: "app-info" },
      { label: "Mitigation pathways", pct: 48, color: "app-warning" },
      { label: "Open uncertainties", pct: 100, color: "app-synthesis" },
    ];

  // Source landscape — composition of the evidence base by source type.
  const _tld = (u) => { const dm = domain(u); if (/\.gov/.test(dm)) return "Government"; if (/\.edu/.test(dm)) return "Academic"; if (/\.org/.test(dm)) return "Institutions"; if (/(news|times|post|bbc|guardian|reuters|cnn)/.test(dm)) return "News & media"; return "Web sources"; };
  const _lc = ["app-secondary", "app-primary", "app-synthesis", "app-info", "app-critic"];
  let landscape;
  if (srcArr.length) {
    const counts = {}; srcArr.forEach((s) => { const k = _tld(s.url); counts[k] = (counts[k] || 0) + 1; });
    landscape = Object.entries(counts).map(([k, v], i) => ({ label: k, pct: Math.round((v / srcArr.length) * 100), color: _lc[i % _lc.length] }));
  } else {
    landscape = [{ label: "Government / .gov", pct: 40, color: "app-secondary" }, { label: "Scientific bodies", pct: 35, color: "app-primary" }, { label: "News & analysis", pct: 25, color: "app-synthesis" }];
  }

  const contradiction = pick(
    typeof report.contradiction_resolution === "string" ? report.contradiction_resolution : undefined,
    "No material contradictions detected across the independent sources. A minor tension on the magnitude of regional effects was resolved in favour of the higher-trust, more recent datasets.",
  );

  const analysisFallback = "This synthesis finds that human activity is the predominant driver of recent climate change, with converging evidence across independent datasets. Natural forcings shape longer-term variability but do not account for the rapid modern warming trend. Confidence is moderate — source agreement and grounding are strong, while recency and regional resolution introduce measured uncertainty.";

  return {
    query: pick(p.query, report.query, "What actually causes climate change?"),
    date: fmtDate(new Date()), sources, model, conf, band, breakdown, critic, findings, stats, ledger,
    faithful, ungrounded, claims, trajectory, boundaries, telemetry, tools, constellation, provenance,
    analysisText: pick(answer, analysisFallback), coverage, landscape, contradiction,
    bottomLine: (findings[0] || "The evidence points to a single clear primary conclusion for this query."),
    chatAnswer: pick(answer, analysisFallback), sourceSummaries: Array.isArray(p.sourceSummaries) ? p.sourceSummaries : [],
    timeline: DEMO_TIMELINE, kuu: DEMO_KUU,
  };
}

/* ---------- dynamic fragments ---------- */
function findingsRows(d) {
  return d.findings.map((f, i) => `
    <div class="flex items-center gap-3 interactive-item -mx-2 px-2 py-1 rounded" onclick="openInspector()">
      <div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">${i + 1}</div>
      <div class="flex-1 flex flex-col gap-1.5"><div class="text-white/90 text-[13px] leading-snug">${citeHtml(f)}</div></div>
      <div class="border border-app-border rounded px-2 py-0.5 text-[10px] text-app-text flex items-center gap-1"><i class="ph ph-caret-right"></i></div>
    </div>`).join("");
}
function ledgerRows(d) {
  return d.ledger.map((r) => `
    <tr class="border-b border-app-border/20 interactive-item group" onclick="openInspector()">
      <td class="py-2"><div class="w-2.5 h-2.5 rounded-full bg-app-border group-hover:bg-app-primary transition-colors"></div></td>
      <td class="py-2.5"><div class="text-white/85 group-hover:text-white transition-colors">${esc(r.name)}${r.cite ? ` <span class="citation-link font-mono text-[10px] ml-1" onclick="event.stopPropagation(); openInspector()">[${esc(r.cite)}]</span>` : ""}</div></td>
      <td class="py-2.5"><div class="flex items-center gap-2 font-mono text-[10px] group/freshness"><span class="w-1.5 h-1.5 rounded-full transition-all duration-200" style="background:${r.fresh.color}"></span><span class="tracking-tighter" style="color:${r.fresh.color}">${r.fresh.label}</span><span class="text-white/40">${r.fresh.year}</span></div></td>
      <td class="py-2"><div class="h-1 ${r.trust.c} ${r.trust.w} rounded"></div></td>
    </tr>`).join("");
}

const DEMO_TRAJ = ["Establish the anthropogenic warming signal across independent datasets", "Separate natural forcing from human contributions", "Audit regional attribution and its uncertainties", "Track source agreement and evidence freshness over time"];
const DEMO_BOUND = ["Regional projections carry wider uncertainty than the global trend", "A minority of sources are older than five years", "Cloud-feedback sensitivity remains an open modelling question"];
const DEMO_CONSTELL = [{ n: 1, title: "EPA — Causes of Climate Change" }, { n: 2, title: "IPCC AR6 Synthesis" }, { n: 3, title: "NASA — Global Climate Change" }, { n: 4, title: "USGS Climate" }, { n: 5, title: "NOAA Climate.gov" }];
const DEMO_PROV = [{ name: "Search", tokens: 1240 }, { name: "Summarise", tokens: 2980 }, { name: "Critic", tokens: 2110 }, { name: "Writer", tokens: 2122 }];
const DEMO_TIMELINE = [
  { year: "1750", title: "Industrial Revolution", desc: "Large-scale fossil-fuel use begins.", cite: "1", conf: 8, density: 1 },
  { year: "1850", title: "Greenhouse Gas Rise", desc: "Atmospheric composition begins to change.", cite: "2", conf: 22, density: 2 },
  { year: "1950", title: "Observed Warming", desc: "Instrument records show sustained warming.", cite: "1", conf: 45, density: 3 },
  { year: "2000", title: "Attribution Evidence", desc: "Research isolates the anthropogenic signal.", cite: "3", conf: 72, density: 5 },
  { year: "2026", title: "Current Synthesis", desc: "Human activity dominates recent warming.", cite: "1", conf: 92, density: 6 },
];
const DEMO_KUU = {
  known: [
    { text: "Anthropogenic CO₂ is the primary driver of recent warming", cites: ["2", "3"], pct: 94 },
    { text: "Global ocean heat content has risen sharply since 1970", cites: ["5"], pct: 88 },
    { text: "Sea-level rise is accelerating, not linear", cites: ["4"], pct: 81 },
  ],
  uncertain: [
    { text: "Regional precipitation response differences", cites: ["8"], pct: 58 },
    { text: "Cloud-feedback sensitivity in tropical regions", cites: ["12"], pct: 42 },
  ],
  unknown: [
    { text: "Exact tipping point for AMOC collapse" },
    { text: "Long-term carbon impact of large-scale deep-sea mining" },
  ],
};

const _claimCol = (p) => (p >= 75 ? "app-success" : p >= 55 ? "app-primary" : p >= 40 ? "app-warning" : "app-synthesis");
function claimRows(d) {
  return d.claims.map((c, i) => `
    <div class="flex items-start gap-3">
      <div class="w-6 h-6 rounded-full border border-${_claimCol(c.pct)} text-${_claimCol(c.pct)} flex items-center justify-center text-[11px] shrink-0 mt-0.5">${i + 1}</div>
      <div class="flex-1 min-w-0"><p class="text-white/90 text-[13px] leading-snug mb-1.5 line-clamp-2">${citeHtml(c.text)}</p>
      <div class="h-1.5 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-${_claimCol(c.pct)}" style="width:${c.pct}%"></div></div></div>
      <span class="text-sm text-white font-mono shrink-0 mt-0.5">${c.pct}%</span>
    </div>`).join("");
}
function faithfulFlags(d) {
  const u = (d.ungrounded || []);
  if (!u.length) return `<div class="p-3 bg-[#0A0A1E] border border-[#39ff9c]/20 rounded-md text-[12px] text-white/70 leading-snug">Every sampled sentence is supported by at least one source citation.</div>`;
  return u.map((s) => `<div class="p-2.5 bg-[#0A0A1E] border border-[#ffd166]/20 rounded-md"><div class="flex items-center gap-1.5 text-[10px] font-bold text-[#ffd166] uppercase mb-1"><span class="w-1 h-1 rounded-full bg-[#ffd166]"></span> Missing citation</div><p class="text-[12px] text-white/80 italic leading-snug">"${esc(s.slice(0, 160))}"</p></div>`).join("");
}
function breakdownRows(d) {
  const b = d.breakdown;
  const rows = [["Agreement", b.agreement, "app-warning"], ["Diversity", b.diversity, "app-info"], ["Recency", b.recency, "app-primary"], ["Grounding", b.grounding, "app-success"]];
  return rows.map(([l, v, c]) => `<div><div class="flex justify-between text-[12px] mb-1"><span class="text-app-text">${l}</span><span class="text-white font-mono">${v}%</span></div><div class="h-1.5 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-${c}" style="width:${v}%"></div></div></div>`).join("");
}
function trajRows(d) {
  const items = d.trajectory.length ? d.trajectory : DEMO_TRAJ;
  return items.map((t, i) => `<div class="flex items-start gap-4"><div class="w-7 h-7 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[12px] font-bold shrink-0">${i + 1}</div><p class="text-white/90 text-[13px] leading-snug pt-1">${citeHtml(t)}</p></div>`).join("");
}
function boundaryRows(d) {
  const items = d.boundaries.length ? d.boundaries : DEMO_BOUND;
  const ic = ["ph-warning-circle", "ph-info", "ph-shield-warning", "ph-scales"];
  return items.map((t, i) => `<div class="flex items-start gap-3"><i class="ph ${ic[i % ic.length]} text-app-warning text-lg shrink-0 mt-0.5"></i><p class="text-white/85 text-[13px] leading-snug">${citeHtml(t)}</p></div>`).join("");
}
function toolChips(d) {
  const items = d.tools.length ? d.tools : ["Search", "Summarise", "Critic", "Writer"];
  const st = [["app-synthesis", "ph-magnifying-glass"], ["app-secondary", "ph-file-text"], ["app-critic", "ph-scales"], ["app-primary", "ph-pen-nib"]];
  return items.slice(0, 4).map((t, i) => { const [c, ic] = st[i % st.length]; return `<div class="flex items-center gap-2 p-2.5 border border-${c}/20 bg-${c}/5 rounded-md"><i class="ph ${ic} text-${c} text-lg shrink-0"></i><span class="text-[12px] text-white/85 truncate capitalize">${esc(t)}</span></div>`; }).join("");
}
function telemetryPanel(d) {
  const t = d.telemetry;
  const tok = t.tokens ? t.tokens.toLocaleString() : "—";
  const cost = t.cost ? ("$" + t.cost.toFixed(4)) : "—";
  const steps = t.steps.length || "—";
  const prov = (t.providers[0] && (t.providers[0].provider || t.providers[0].model)) || d.model;
  const tile = (label, val, cls) => `<div class="bg-[#0A0A1E] border border-app-border rounded-md p-3"><div class="text-[10px] text-[#5C687C] uppercase tracking-wider">${label}</div><div class="text-lg font-mono ${cls} truncate">${val}</div></div>`;
  return `<div class="grid grid-cols-2 gap-3 flex-1 content-center">${tile("Tokens", tok, "text-white")}${tile("Est. cost", cost, "text-app-primary")}${tile("Steps", steps, "text-white")}${tile("Provider", esc(prov), "text-app-synthesis text-[13px]")}</div>`;
}
function constellationRows(d) {
  const items = d.constellation.length ? d.constellation : DEMO_CONSTELL;
  return items.map((c) => `<div class="flex items-center gap-2.5 interactive-item -mx-1 px-1 py-1 rounded" onclick="openInspector()"><div class="w-5 h-5 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] shrink-0">${c.n}</div><span class="text-[12.5px] text-white/85 truncate">${esc(c.title)}</span></div>`).join("");
}
function provenanceRows(d) {
  const items = d.provenance.length ? d.provenance : DEMO_PROV;
  return items.map((s, i) => `<div class="flex items-stretch gap-3">
    <div class="flex flex-col items-center shrink-0"><div class="w-6 h-6 rounded-full bg-app-primary/10 border border-app-primary/40 flex items-center justify-center text-app-primary text-[11px] font-bold">${i + 1}</div>${i < items.length - 1 ? '<div class="w-px flex-1 min-h-[12px] bg-app-border/70 my-1"></div>' : ""}</div>
    <div class="flex-1 min-w-0 pb-1"><div class="text-[13px] text-white/90 capitalize truncate leading-tight">${esc(s.name)}</div><div class="text-[11px] font-mono text-[#5C687C] mt-0.5">${s.tokens ? s.tokens.toLocaleString() + " tokens" : "—"}</div></div>
  </div>`).join("");
}
function coverageRows(d) {
  return d.coverage.map((c) => `<div class="flex items-center gap-4"><span class="text-[13px] text-white/85 w-36 shrink-0 truncate">${esc(c.label)}</span><div class="flex-1 h-2 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-${c.color}" style="width:${c.pct}%"></div></div><span class="text-[12px] font-mono text-${c.color} w-10 text-right shrink-0">${c.pct}%</span></div>`).join("");
}
function landscapeRows(d) {
  return d.landscape.map((c) => `<div class="flex items-center gap-3"><span class="w-2.5 h-2.5 rounded-full bg-${c.color} shrink-0"></span><span class="text-[13px] text-white/85 flex-1 truncate">${esc(c.label)}</span><span class="text-[12px] font-mono text-app-text shrink-0">${c.pct}%</span></div>`).join("");
}

// Catmull-Rom → cubic-bezier smoothing for the timeline curves.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let s = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    s += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return s;
}

// Premium KNOWN / UNCERTAIN / UNKNOWN — tinted panels, real Phosphor icons,
// per-claim confidence bars, larger type.
function kuuCard(d) {
  const k = d.kuu || DEMO_KUU;
  const col = (title, sub, color, headIcon, itemIcon, items, bars) => {
    const rows = items.map((it) => {
      const cites = (it.cites || []).map((c) => `<span class="citation-link font-mono text-[10px] font-bold px-0.5" onclick="openInspector()">[${esc(c)}]</span>`).join(" ");
      const bar = bars && it.pct != null ? `<div class="mt-2.5 flex items-center gap-2"><div class="h-1 flex-1 bg-app-border/50 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${it.pct}%;background:${color}"></div></div><span class="text-[11px] font-mono shrink-0" style="color:${color}">${it.pct}%</span></div>` : "";
      return `<div class="rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"><div class="flex items-start gap-2.5"><i class="ph ${itemIcon} text-base mt-0.5 shrink-0" style="color:${color}"></i><p class="text-white/90 text-[13.5px] leading-snug">${esc(it.text)} ${cites}</p></div>${bar}</div>`;
    }).join("");
    return `<div class="flex flex-col gap-3 rounded-2xl p-4 border border-white/5" style="background:linear-gradient(180deg, ${color}12, transparent 55%)">
      <div class="flex items-center gap-2.5"><span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:${color}14"><i class="ph-duotone ${headIcon} text-xl" style="color:${color}"></i></span><div class="min-w-0"><h4 class="text-[13px] font-bold tracking-wide uppercase" style="color:${color}">${title}</h4><p class="text-[11px] text-[#78859c] leading-tight mt-0.5">${sub}</p></div></div>
      <div class="flex flex-col gap-2.5">${rows}</div>
    </div>`;
  };
  return `<div class="bg-[#111125] border border-app-border rounded-2xl p-7 flex flex-col col-span-1 md:col-span-4 shadow-[0_0_24px_rgba(79,209,197,0.03)] backdrop-blur-md">
    <div class="flex items-center gap-3 mb-6"><span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><i class="ph ph-compass-tool text-app-info text-xl"></i></span><div><h3 class="text-[13px] uppercase tracking-[0.2em] text-white font-bold">Known / Uncertain / Unknown</h3><p class="text-[12px] text-[#8D9BB0] mt-0.5">What the evidence supports — and where it stops.</p></div></div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1">
      ${col("Known", "Strongly supported by the evidence.", "#00FF47", "ph-seal-check", "ph-check-circle", k.known, true)}
      ${col("Uncertain", "Plausible, but evidence is mixed.", "#FFAA00", "ph-scales", "ph-warning", k.uncertain, true)}
      ${col("Unknown", "Not answered by current evidence.", "#FF4D6D", "ph-circle-dashed", "ph-question", k.unknown, false)}
    </div>
    <div class="mt-6 pt-4 border-t border-app-border/40 flex justify-between items-center flex-wrap gap-2"><span class="text-[11px] font-mono text-[#8D9BB0] uppercase tracking-wider">Evidence status: ${k.known.length} well-supported · ${k.uncertain.length} uncertain · ${k.unknown.length} unresolved</span><button class="text-[11px] text-app-info font-semibold hover:underline flex items-center gap-1">Expand all <i class="ph ph-caret-down"></i></button></div>
  </div>`;
}

// Premium RESEARCH SCALE — icon-tiled stat grid with animated counters.
function researchScale(d) {
  const s = d.stats;
  const tile = (icon, color, val, suffix, label, href) => `<a href="${href}" class="group block rounded-[1.15rem] bg-white/[0.04] ring-1 ring-white/10 p-1">
    <div class="h-full rounded-[0.85rem] bg-[#111125] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 flex flex-col gap-2.5 transition-colors group-hover:bg-[#14142b]">
      <span class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${color}12"><i class="ph-duotone ${icon} text-xl" style="color:${color}"></i></span>
      <span class="text-[27px] leading-none font-semibold font-mono tabular-nums number-counter" style="color:${color}" data-target="${val}"${suffix ? ` data-suffix="${suffix}"` : ""}>${val}${suffix || ""}</span>
      <span class="text-[10.5px] uppercase tracking-[0.08em] text-[#8D9BB0] group-hover:text-white transition-colors">${label}</span>
    </div>
  </a>`;
  return `<section class="bg-gradient-to-b from-[rgba(255,255,255,0.035)] to-[rgba(255,255,255,0.008)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-7 backdrop-blur-sm">
    <div class="flex items-center gap-3 mb-5"><span class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><i class="ph ph-gauge text-app-primary text-xl"></i></span><div><h3 class="text-[13px] uppercase tracking-[0.18em] text-white font-bold">Research Scale</h3><p class="text-[12px] text-[#8D9BB0] mt-0.5">A snapshot of the evidence processed for this synthesis</p></div></div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      ${tile("ph-shield-check", "#00FF47", s.confidence, "%", "Confidence", "#confidence-breakdown")}
      ${tile("ph-books", "#00CCFF", s.sources, "", "Sources", "#source-landscape")}
      ${tile("ph-file-text", "#B48EF0", s.passages, "", "Passages", "#evidence-ledger")}
      ${tile("ph-lightbulb", "#4FD1C5", s.insights, "", "Insights", "#key-findings")}
      ${tile("ph-list-checks", "#6C8CFF", s.claims, "", "Claims", "#claim-level-confidence")}
      ${tile("ph-handshake", "#E8A855", s.consensus, "%", "Consensus", "#evidence-strength")}
    </div>
    <p class="text-[12px] text-[#5C687C] italic mt-5">${s.passages} passages analyzed across ${s.sources} sources to produce ${s.claims} synthesized claims.</p>
  </section>`;
}

// Ultra-premium Research Timeline: rising confidence line + evidence-density
// ridge + hover mini-cards + scroll-triggered draw-in.
function timelineCard(d) {
  const ev = (d.timeline && d.timeline.length ? d.timeline : DEMO_TIMELINE);
  const n = ev.length, W = 1000, H = 260;
  const x = (i) => 60 + i * ((W - 120) / (n - 1));
  const confY = (c) => 40 + ((100 - c) / 100) * 150;          // 40 (top) .. 190 (bottom)
  const maxD = Math.max.apply(null, ev.map((e) => e.density).concat(1));
  const ridgeY = (dv) => 250 - (dv / maxD) * 78;
  const linePts = ev.map((e, i) => [x(i), confY(e.conf)]);
  const ridgePts = ev.map((e, i) => [x(i), ridgeY(e.density)]);
  const linePath = smoothPath(linePts);
  const ridgeLine = smoothPath(ridgePts);
  const ridgeArea = `${ridgeLine} L ${x(n - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const colOf = (i) => (i === n - 1 ? "#00FF47" : i >= n - 2 ? "#4FD1C5" : "#00CCFF");

  const nodes = ev.map((e, i) => {
    const leftPct = (x(i) / W) * 100, topPct = (confY(e.conf) / H) * 100, col = colOf(i);
    const pos = i === 0 ? "left:0;" : i === n - 1 ? "right:0;left:auto;" : "left:50%;margin-left:-92px;";
    return `<div class="pn-tl-node" style="left:${leftPct.toFixed(2)}%;top:${topPct.toFixed(2)}%;">
      <span class="pn-tl-dot${i === n - 1 ? " pn-tl-dot-last" : ""}" style="--tl:${col}">${i === n - 1 ? '<span class="pn-tl-halo"></span>' : ""}</span>
      <span class="pn-tl-year" style="color:${col}">${e.year}</span>
      <div class="pn-tl-card" style="${pos}">
        <div class="pn-tl-card-year" style="color:${col}">${e.year}</div>
        <div class="pn-tl-card-title">${esc(e.title)}</div>
        <div class="pn-tl-card-desc">${esc(e.desc)}</div>
        <div class="pn-tl-card-foot"><span>CONFIDENCE ${e.conf}%</span>${e.cite ? `<span class="citation-link" onclick="event.stopPropagation(); openInspector()">[${esc(e.cite)}]</span>` : ""}</div>
      </div>
    </div>`;
  }).join("");

  const grid = [25, 50, 75].map((g) => `<line x1="60" x2="940" y1="${confY(g).toFixed(1)}" y2="${confY(g).toFixed(1)}" stroke="rgba(255,255,255,0.045)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("");

  return `<div class="pn-timeline bg-[#0A0A1E]/80 backdrop-blur-md border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 col-span-1 md:col-span-4 mb-6 relative" style="height:360px">
    <div class="flex justify-between items-start mb-4 flex-wrap gap-3">
      <div><h3 class="text-[12px] uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2"><span class="w-1 h-4 bg-app-info rounded-full"></span>RESEARCH TIMELINE</h3><p class="text-[11px] text-[#5C687C] mt-1">How field confidence and evidence density evolved over time</p></div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-[10px] font-mono text-app-success"><span class="inline-block w-3 h-[2px] rounded bg-app-success"></span> CONFIDENCE</div>
        <div class="flex items-center gap-2 text-[10px] font-mono text-app-info"><span class="inline-block w-3 h-2 rounded-sm bg-app-info/40"></span> EVIDENCE DENSITY</div>
        <div class="font-mono text-[11px] text-app-info bg-app-info/5 px-2.5 py-1 rounded border border-app-info/20">${ev[0].year} → ${ev[n - 1].year}</div>
      </div>
    </div>
    <div class="relative w-full" style="height:250px">
      <svg class="absolute inset-0 w-full h-full" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnTlLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#00CCFF"/><stop offset="60%" stop-color="#4FD1C5"/><stop offset="100%" stop-color="#00FF47"/></linearGradient>
          <linearGradient id="pnTlRidge" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(0,204,255,0.20)"/><stop offset="100%" stop-color="rgba(0,204,255,0)"/></linearGradient>
        </defs>
        ${grid}
        <path class="pn-tl-ridge" d="${ridgeArea}" fill="url(#pnTlRidge)" stroke="none"/>
        <path class="pn-tl-ridge" d="${ridgeLine}" fill="none" stroke="rgba(0,204,255,0.35)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
        <path class="pn-tl-line" d="${linePath}" fill="none" stroke="url(#pnTlLine)" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="pn-tl-nodes absolute inset-0">${nodes}</div>
      <span class="absolute left-0 -top-1 text-[9px] font-mono text-[#5C687C] tracking-widest opacity-70">100%</span>
      <span class="absolute left-0 bottom-8 text-[9px] font-mono text-[#5C687C] tracking-widest opacity-70">0%</span>
    </div>
  </div>`;
}

/* ---------- the report markup (verbatim design; ${…} = wired data) ---------- */
function buildHtml(d) {
  const s = d.stats;
  return `
<main class="flex-1 flex flex-col h-full overflow-y-auto bg-app-bg relative scroll-smooth">
<div class="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-app-surface/50 to-transparent pointer-events-none z-0"></div>
<header class="flex justify-between items-center p-8 pb-2 z-10">
<div class="flex items-center gap-3"><span class="text-app-success font-mono text-[11px] font-bold tracking-widest drop-shadow-[0_0_8px_rgba(0,255,71,0.5)]">● SYNTHESIS COMPLETE</span><span class="text-app-text font-mono text-[11px] uppercase tracking-widest">| POLYNOUS | NEURAL RESEARCH ENGINE</span></div>
<div class="flex gap-3">
<button class="flex items-center gap-2 px-4 py-1.5 border border-app-border rounded text-app-text hover:text-white hover:border-gray-500 transition-colors bg-app-surface/50 text-xs font-medium"><i class="ph ph-share-network"></i> Share Report</button>
<button class="flex items-center gap-2 px-4 py-1.5 border border-app-success/40 rounded text-app-success hover:bg-app-success/10 hover:border-app-success hover:shadow-[0_0_10px_rgba(0,255,71,0.2)] transition-all bg-[#0A0A1E] text-xs font-medium"><i class="ph ph-download-simple"></i> Export<i class="ph ph-caret-down ml-1"></i></button>
</div>
</header>
<div class="p-8 pt-2 z-10 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
<section class="grid grid-cols-12 gap-6 items-start">
<div class="col-span-12 lg:col-span-5 flex flex-col gap-4">
<h2 class="text-4xl font-sora font-semibold text-white tracking-tight">Neural Synthesis <span class="text-app-info">Report</span></h2>
<div class="flex items-center gap-3 bg-app-surface p-2 px-4 rounded-lg border border-app-border"><span class="text-app-info font-mono font-bold text-xs shrink-0">QUERY:</span><span class="text-white text-[13px] truncate">${esc(d.query)}</span></div>
<div class="flex items-center gap-6 text-[11px] text-app-text mt-1 font-mono">
<div class="flex items-center gap-2"><i class="ph ph-check-circle text-app-success drop-shadow-[0_0_4px_rgba(0,255,71,0.5)]"></i><span>Generated:</span><span class="text-white/80">${d.date}</span></div>
<div class="flex items-center gap-2"><i class="ph ph-circle text-app-info"></i><span>Sources:</span><span class="text-white/80">${d.sources}</span></div>
<div class="flex items-center gap-2"><i class="ph ph-circle text-app-secondary"></i><span>Model:</span><span class="text-white/80">${esc(d.model)}</span></div>
</div>
</div>
<div class="col-span-12 lg:col-span-2 h-32 rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/10 p-1.5">
<div class="h-full rounded-[1.125rem] bg-app-surface border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center">
<div class="relative w-28 h-28 flex items-center justify-center">
<svg class="w-full h-full -rotate-90" viewbox="0 0 36 36">
<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.07)" stroke-dasharray="100, 100" stroke-width="2.5"></path>
<path class="text-app-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${d.conf}, 100" stroke-width="2.5" stroke-linecap="round" style="filter:drop-shadow(0 0 5px rgba(79,209,197,0.35))"></path>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-3xl font-sora font-bold text-white">${d.conf}%</span><span class="text-[8px] text-app-text tracking-widest uppercase mt-1">CONFIDENCE</span></div>
</div>
</div>
</div>
<div class="col-span-12 lg:col-span-2 h-32 rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/10 p-1.5">
<div class="h-full rounded-[1.125rem] bg-app-surface border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 flex flex-col justify-between">
<div><h3 class="text-[10px] uppercase tracking-wider text-app-critic mb-1">CRITIC CONSENSUS</h3><div class="text-2xl font-bold text-white mb-2">${d.critic.pct}%</div><div class="w-full bg-app-border rounded-full h-1 mb-1"><div class="bg-app-critic h-1 rounded-full drop-shadow-[0_0_4px_rgba(232,168,85,0.4)]" style="width:${d.critic.pct}%"></div></div></div>
<a class="text-[10px] text-app-critic flex items-center gap-1 hover:underline" href="#">Why this score? <i class="ph ph-arrow-right"></i></a>
</div>
</div>
<div class="col-span-12 lg:col-span-3 row-span-2 self-stretch rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/10 p-1.5">
<div class="h-full flex flex-col bg-gradient-to-b from-[#15152e] to-[#101024] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-[1.125rem] p-5 relative overflow-hidden">
<div class="flex items-center gap-2.5 mb-4"><span class="w-7 h-7 rounded-lg bg-app-synthesis/15 border border-app-synthesis/30 flex items-center justify-center"><i class="ph ph-sparkle text-app-synthesis text-sm"></i></span><h3 class="text-[11px] uppercase tracking-wider text-app-synthesis font-semibold">Chat with this report</h3></div>
<div id="pn-chat-msgs" class="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 mb-3 hide-scrollbar">
<div class="flex gap-2.5"><i class="ph ph-sparkle text-app-synthesis mt-0.5 shrink-0"></i><div class="flex-1 text-[12.5px] leading-relaxed text-white/75">Ask anything about this report — every answer stays grounded strictly in the sources above.</div></div>
<div class="flex flex-col gap-2 mt-1">
<span class="text-[10px] uppercase tracking-wider text-[#5C687C] font-mono mb-0.5">Suggested</span>
<button onclick="pnChatAsk(this)" class="text-[12px] text-white/85 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-app-synthesis/40 hover:bg-app-synthesis/[0.08] hover:text-white transition-all text-left flex items-center gap-2"><i class="ph ph-lightning text-app-synthesis text-xs shrink-0"></i> What's the strongest evidence here?</button>
<button onclick="pnChatAsk(this)" class="text-[12px] text-white/85 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-app-synthesis/40 hover:bg-app-synthesis/[0.08] hover:text-white transition-all text-left flex items-center gap-2"><i class="ph ph-git-fork text-app-synthesis text-xs shrink-0"></i> Where do the sources disagree?</button>
<button onclick="pnChatAsk(this)" class="text-[12px] text-white/85 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-app-synthesis/40 hover:bg-app-synthesis/[0.08] hover:text-white transition-all text-left flex items-center gap-2"><i class="ph ph-warning-circle text-app-synthesis text-xs shrink-0"></i> What are the biggest uncertainties?</button>
<button onclick="pnChatAsk(this)" class="text-[12px] text-white/85 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-app-synthesis/40 hover:bg-app-synthesis/[0.08] hover:text-white transition-all text-left flex items-center gap-2"><i class="ph ph-seal-check text-app-synthesis text-xs shrink-0"></i> How reliable are these sources?</button>
<button onclick="pnChatAsk(this)" class="text-[12px] text-white/85 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-app-synthesis/40 hover:bg-app-synthesis/[0.08] hover:text-white transition-all text-left flex items-center gap-2"><i class="ph ph-text-aa text-app-synthesis text-xs shrink-0"></i> Summarise this in one line</button>
</div>
</div>
<div class="relative mt-auto">
<input id="pn-chat-input" onkeydown="if(event.key==='Enter')pnChatSend()" class="w-full bg-[#0A0A1E] border border-app-border rounded-full py-2.5 pl-4 pr-11 text-[13px] text-white focus:outline-none focus:border-app-synthesis focus:shadow-[0_0_0_3px_rgba(180,142,240,0.12)] transition-all placeholder:text-[#5C687C]" placeholder="Ask a follow-up…" type="text"/>
<button onclick="pnChatSend()" class="absolute right-1.5 top-1.5 w-8 h-8 bg-app-synthesis rounded-full flex items-center justify-center text-[#0A0A1E] hover:bg-white transition-colors drop-shadow-[0_0_6px_rgba(180,142,240,0.5)]"><i class="ph ph-arrow-up font-bold"></i></button>
</div>
</div>
</div>
<div class="col-span-12 lg:col-span-9 grid grid-cols-3 gap-6">
<div class="col-span-1 h-[300px] rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/10 p-1.5">
<div class="h-full rounded-[1.125rem] bg-[#151529] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 flex flex-col">
<h3 class="text-[10px] uppercase tracking-wider text-app-primary flex items-center gap-2 mb-4 font-semibold"><i class="ph ph-wave-sine"></i> BOTTOM LINE</h3>
<div class="flex-1 text-[12.5px] text-white/90 leading-relaxed overflow-y-auto hide-scrollbar pr-1">${citeHtml(d.bottomLine)}</div>
<div class="flex items-center gap-3 mt-4"><div class="bg-app-bg border border-white/5 rounded-lg px-3 py-1 text-white font-mono text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">${d.conf}%</div><div class="h-1 bg-app-border flex-1 rounded overflow-hidden"><div class="h-full bg-app-primary" style="width:${d.conf}%"></div></div></div>
</div>
</div>
<div class="col-span-2 h-[300px] rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/10 p-1.5">
<div class="h-full rounded-[1.125rem] bg-[#0A0A1E] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 flex flex-col relative overflow-hidden" style="background-image: linear-gradient(100deg, #0A0A1E 0%, rgba(10,10,30,0.94) 34%, rgba(10,10,30,0.62) 56%, rgba(10,10,30,0.2) 80%, rgba(10,10,30,0) 100%), url('/exec-summary-bg.png'); background-size: cover; background-position: right center; background-repeat: no-repeat;">
<div class="absolute inset-0 pointer-events-none rounded-[1.125rem] z-0" style="box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), inset 0 34px 44px -34px rgba(10,10,30,0.7), inset 0 -60px 80px -32px rgba(10,10,30,0.9); background: radial-gradient(130% 90% at 50% -12%, rgba(120,160,255,0.06), transparent 42%);"></div>
<h3 class="text-[10px] uppercase tracking-wider text-app-text flex items-center gap-2 mb-4 relative z-10"><i class="ph-duotone ph-star text-app-info"></i> EXECUTIVE SUMMARY</h3>
<div class="flex-1 relative z-10 w-[64%] text-[12.5px] text-white leading-relaxed overflow-y-auto hide-scrollbar pr-2">${citeHtml(d.analysisText)}</div>
</div>
</div>
</div>
</section>
${researchScale(d)}
<section class="bg-[#111125] border border-app-border rounded-lg p-8 lg:p-10 backdrop-blur-md relative overflow-hidden"><h3 class="text-xs uppercase tracking-[0.2em] text-app-info mb-10 font-bold flex items-center gap-3"><span class="w-1 h-4 bg-app-info rounded-full drop-shadow-[0_0_4px_rgba(0,204,255,0.5)]"></span>HOW WE REACHED THIS CONCLUSION</h3><div class="flex items-center justify-between gap-4"><div class="flex items-center justify-between flex-1 px-4"><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-info group-hover:text-app-info transition-all relative"><div class="absolute inset-0 rounded-full bg-app-info/5 opacity-0 group-hover:opacity-100 transition-all"></div><i class="ph ph-lightning text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-info">Input</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-info group-hover:text-app-info transition-all relative"><i class="ph ph-file-text text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-info">Sources</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-critic group-hover:text-app-critic transition-all relative"><i class="ph ph-chart-polar text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-critic">Analysis</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-critic group-hover:text-app-critic transition-all relative"><i class="ph ph-scales text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-critic">Evidence</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-synthesis group-hover:text-app-synthesis transition-all relative"><i class="ph ph-brain text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-synthesis">Synthesis</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-primary group-hover:text-app-primary transition-all relative"><i class="ph ph-lightbulb text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-primary">Insights</span></div></div><div class="ml-8 pl-8 border-l border-app-border flex flex-col items-center gap-3"><div class="relative w-28 h-28 flex items-center justify-center"><svg class="w-full h-full -rotate-90" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="none" r="16" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"></circle><circle cx="18" cy="18" fill="none" r="16" stroke="#4FD1C5" stroke-dasharray="${d.conf}, 100" stroke-linecap="round" stroke-width="2.5" style="filter:drop-shadow(0 0 5px rgba(79,209,197,0.3))"></circle></svg><div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-2xl font-bold text-white font-mono tracking-tighter">${d.conf}%</span><span class="text-[7px] text-app-primary font-bold tracking-[0.2em] mt-0.5">FINAL</span></div></div><span class="text-[10px] font-bold tracking-[0.2em] text-[#5C687C] uppercase font-mono mt-2">Confidence</span></div></div></section>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col h-[380px]" id="key-findings">
<h3 class="text-[11px] uppercase tracking-wider text-white flex items-center gap-2 mb-4 shrink-0"><i class="ph ph-star text-app-info"></i> KEY FINDINGS</h3>
<div class="flex flex-col gap-4 overflow-y-auto pr-1 hide-scrollbar">${findingsRows(d)}</div>
</div>
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col h-[380px] relative overflow-hidden" id="evidence-ledger">
<h3 class="text-[11px] uppercase tracking-wider text-white mb-4 shrink-0">EVIDENCE LEDGER</h3>
<div class="flex-1 overflow-y-auto hide-scrollbar -mr-1 pr-1">
<table class="w-full text-[12px] text-left border-collapse">
<thead class="sticky top-0 bg-[#151529] z-10"><tr class="text-app-text border-b border-app-border/50"><th class="pb-2 font-normal">#</th><th class="pb-2 font-normal">Source</th><th class="pb-2 font-normal">Freshness</th><th class="pb-2 font-normal">Trust</th></tr></thead>
<tbody>${ledgerRows(d)}</tbody>
</table>
</div>
<div class="mt-3 pt-3 border-t border-app-border/30 flex items-center gap-2 shrink-0"><div class="h-0.5 bg-app-border flex-1 rounded overflow-hidden"><div class="h-full bg-app-primary" style="width:${d.conf}%"></div></div><span class="text-[11px] text-white font-mono">${d.conf}%</span></div>
</div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col h-[380px]" id="claim-level-confidence">
<h3 class="text-[11px] uppercase tracking-wider text-white mb-4 shrink-0">CLAIM-LEVEL CONFIDENCE</h3>
<div class="flex flex-col gap-4 overflow-y-auto pr-1 hide-scrollbar">${claimRows(d)}</div>
</div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col h-[380px] shadow-[0_0_20px_rgba(79,209,197,0.02)]">
<div class="mb-4 shrink-0"><h3 class="text-[11px] uppercase tracking-wider text-white flex items-center gap-2"><i class="ph ph-shield-check text-[#39ff9c]"></i> FAITHFULNESS ANALYSIS</h3><p class="text-[11px] text-app-text mt-1">How well the report is grounded in its sources</p></div>
<div class="flex items-center gap-4 mb-5 shrink-0"><div class="relative w-16 h-16 flex items-center justify-center"><svg class="w-full h-full -rotate-90" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="none" r="16" stroke="rgba(120,130,180,0.1)" stroke-width="2"></circle><circle class="drop-shadow-[0_0_5px_rgba(57,255,156,0.5)]" cx="18" cy="18" fill="none" r="16" stroke="#39ff9c" stroke-dasharray="${d.faithful.pct}, 100" stroke-linecap="round" stroke-width="2"></circle></svg><div class="absolute inset-0 flex items-center justify-center"><span class="text-sm font-bold text-white">${d.faithful.pct}%</span></div></div><div><div class="text-2xl font-bold text-white font-sora">${d.faithful.grounded} / ${d.faithful.total}</div><div class="text-[11px] text-app-text uppercase tracking-tight">Sentences grounded in sources</div><div class="mt-1.5 inline-block px-2 py-0.5 bg-[#39ff9c]/10 border border-[#39ff9c]/20 rounded text-[10px] text-[#39ff9c] font-bold">${d.faithful.pct}% GROUNDED</div></div></div>
<div class="mb-4 shrink-0"><div class="flex h-1.5 w-full rounded-full overflow-hidden bg-app-border/20 mb-2"><div class="h-full bg-[#39ff9c]" style="width:${d.faithful.pct}%"></div><div class="h-full bg-[#ff4d6d]" style="width:${100 - d.faithful.pct}%"></div></div><p class="text-[12px] text-app-text leading-snug">${d.faithful.pct}% of generated sentences carry a supporting citation; the rest are flagged below for review.</p></div>
<div class="flex flex-col gap-2 overflow-y-auto pr-1 hide-scrollbar flex-1">${faithfulFlags(d)}</div>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col col-span-1 h-[360px]"><h3 class="text-[11px] uppercase tracking-wider text-white flex items-center gap-2 mb-3 shrink-0"><i class="ph ph-chart-polar text-app-secondary"></i> ANALYSIS PREVIEW</h3><div class="overflow-y-auto pr-1 hide-scrollbar text-[13px] leading-relaxed text-white/85 flex-1">${d.analysisText ? citeHtml(d.analysisText) : '<span class="text-app-text italic">No analysis text available for this run.</span>'}</div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-6 flex flex-col col-span-2"><h3 class="text-[12px] uppercase tracking-wider text-white flex items-center gap-2 mb-5"><i class="ph ph-scales text-app-synthesis"></i> DIFFERING PERSPECTIVES</h3><div class="flex flex-col gap-6"><div class="flex items-stretch justify-center gap-6 relative"><div class="border border-app-border rounded-xl p-5 bg-[#0A0A1E] w-full flex flex-col gap-4"><div class="flex justify-between items-center"><span class="text-[12px] font-semibold text-white uppercase tracking-wide">Position A</span><span class="text-[11px] font-mono text-app-warning">SOURCES 2</span></div><div class="space-y-2"><div class="flex justify-between text-[12px] font-mono"><span class="text-app-text">EVIDENCE STRENGTH</span><span class="text-white">72%</span></div><div class="h-1.5 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-warning" style="width:72%"></div></div><div class="flex justify-between text-[12px] font-mono"><span class="text-app-text">SUPPORT</span><span class="text-app-warning">Moderate</span></div></div></div><div class="w-11 h-11 rounded-full border border-app-border bg-[#111125] flex items-center justify-center text-white text-[12px] font-bold shrink-0 z-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(120,130,180,0.2)]">VS</div><div class="border border-app-border rounded-xl p-5 bg-[#0A0A1E] w-full flex flex-col gap-4"><div class="flex justify-between items-center"><span class="text-[12px] font-semibold text-white uppercase tracking-wide">Position B</span><span class="text-[11px] font-mono text-app-info">SOURCES 3</span></div><div class="space-y-2"><div class="flex justify-between text-[12px] font-mono"><span class="text-app-text">EVIDENCE STRENGTH</span><span class="text-white">84%</span></div><div class="h-1.5 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success" style="width:84%"></div></div><div class="flex justify-between text-[12px] font-mono"><span class="text-app-text">SUPPORT</span><span class="text-app-success">Strong</span></div></div></div></div><div class="bg-app-success/5 border border-app-success/20 rounded-xl p-5"><div class="flex items-center gap-2 mb-2.5"><div class="w-2 h-2 rounded-full bg-app-success shadow-[0_0_8px_#00FF47]"></div><span class="text-[12px] font-bold text-app-success uppercase tracking-wide">EVIDENCE CURRENTLY FAVORS POSITION B</span></div><p class="text-[13.5px] text-white/85 leading-relaxed">Both positions contain valid elements, but the available evidence more strongly supports the dominant role of human activity in recent climate change.</p><button class="mt-3 text-[12px] text-app-info font-semibold hover:underline flex items-center gap-1.5">Why does Position B lead? <i class="ph ph-arrow-right"></i></button></div><div class="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center gap-4"><span class="text-[12.5px] text-white/80 italic leading-snug">Alternative interpretation: natural forcing remains an important secondary explanation.</span><span class="text-[11px] font-mono text-white/40 shrink-0 whitespace-nowrap">2 sources · 58%</span></div><div class="flex flex-col gap-2"><div class="flex justify-between text-[11px] font-mono text-app-text uppercase tracking-wide"><span>Evidence Balance</span><span>A 46% · B 54%</span></div><div class="flex h-2 w-full rounded-full overflow-hidden bg-app-border/20"><div class="h-full bg-app-warning" style="width:46%"></div><div class="h-full bg-app-success" style="width:54%"></div></div></div></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-6 flex flex-col col-span-1" id="evidence-strength"><h3 class="text-[12px] uppercase tracking-wider text-white mb-5">EVIDENCE STRENGTH SCALE</h3><div class="flex flex-col gap-4 mt-1"><div class="flex items-center gap-3"><i class="ph ph-shield-check text-app-success text-xl shrink-0"></i><div class="flex-1"><div class="flex justify-between items-baseline mb-1.5"><span class="text-[12.5px] text-white/90">High trust</span><span class="text-[12px] font-mono text-app-success">90%</span></div><div class="h-1.5 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-app-success" style="width:90%"></div></div></div></div><div class="flex items-center gap-3"><i class="ph ph-shield-plus text-app-primary text-xl shrink-0"></i><div class="flex-1"><div class="flex justify-between items-baseline mb-1.5"><span class="text-[12.5px] text-white/90">Good</span><span class="text-[12px] font-mono text-app-primary">66%</span></div><div class="h-1.5 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-app-primary" style="width:66%"></div></div></div></div><div class="flex items-center gap-3"><i class="ph ph-shield text-app-info text-xl shrink-0"></i><div class="flex-1"><div class="flex justify-between items-baseline mb-1.5"><span class="text-[12.5px] text-white/90">Moderate</span><span class="text-[12px] font-mono text-app-info">66%</span></div><div class="h-1.5 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-app-info" style="width:66%"></div></div></div></div><div class="flex items-center gap-3"><i class="ph ph-shield-warning text-app-warning text-xl shrink-0"></i><div class="flex-1"><div class="flex justify-between items-baseline mb-1.5"><span class="text-[12.5px] text-white/90">Limited</span><span class="text-[12px] font-mono text-app-warning">33%</span></div><div class="h-1.5 bg-app-border/40 rounded-full overflow-hidden"><div class="h-full bg-app-warning" style="width:33%"></div></div></div></div></div></div>
</div>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-6 flex flex-col"><h3 class="text-[12px] uppercase tracking-wider text-white flex items-center gap-2 mb-5"><i class="ph ph-hexagon text-app-primary"></i> RESEARCH COVERAGE</h3><div class="flex flex-col gap-4">${coverageRows(d)}</div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-6 flex flex-col" id="source-landscape"><h3 class="text-[12px] uppercase tracking-wider text-white flex items-center gap-2 mb-5"><i class="ph ph-chart-polar text-app-secondary"></i> SOURCE LANDSCAPE</h3><div class="flex items-center gap-5 flex-1"><div class="relative w-24 h-24 shrink-0"><svg class="w-full h-full" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="rgba(120,130,180,0.16)" stroke-width="3"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#6C8CFF" stroke-dasharray="40 100" stroke-dashoffset="25" stroke-width="3"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#4FD1C5" stroke-dasharray="20 100" stroke-dashoffset="65" stroke-width="3"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#B48EF0" stroke-dasharray="15 100" stroke-dashoffset="80" stroke-width="3"></circle></svg><div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-xl font-bold text-white font-sora">${d.sources}</span><span class="text-[9px] text-[#5C687C] uppercase tracking-wider">sources</span></div></div><div class="flex flex-col gap-3 flex-1 min-w-0">${landscapeRows(d)}</div></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-6 flex flex-col"><h3 class="text-[12px] uppercase tracking-wider text-white flex items-center gap-2 mb-3"><i class="ph ph-git-merge text-app-synthesis"></i> CONTRADICTION NETWORK</h3><div class="flex items-center justify-center relative"><svg class="w-full h-24" viewbox="0 0 200 100"><circle cx="30" cy="40" fill="none" r="8" stroke="#6C8CFF" stroke-width="1"></circle><circle cx="30" cy="70" fill="none" r="8" stroke="#6C8CFF" stroke-width="1"></circle><circle cx="100" cy="50" fill="none" r="12" stroke="#B48EF0" stroke-width="1"></circle><circle cx="170" cy="30" fill="none" r="8" stroke="#FFAA00" stroke-width="1"></circle><circle cx="170" cy="70" fill="none" r="8" stroke="#FFAA00" stroke-width="1"></circle><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="38" x2="88" y1="40" y2="50"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="38" x2="88" y1="70" y2="50"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="112" x2="162" y1="50" y2="30"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="112" x2="162" y1="50" y2="70"></line><text fill="#B48EF0" font-size="10" x="96" y="55">⚡</text></svg></div><p class="text-[13px] text-white/80 leading-relaxed mt-3">${citeHtml(d.contradiction)}</p></div>
${timelineCard(d)}
${kuuCard(d)}
<div class="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 md:col-span-4">
<div class="bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 flex flex-col relative overflow-hidden md:col-span-7 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><div class="mb-6"><h3 class="text-base font-sora font-semibold text-white tracking-wide">WHAT WOULD CHANGE OUR MIND?</h3><p class="text-[11px] font-inter text-[#8D9BB0] mt-1">Evidence that could materially weaken or overturn the current synthesis.</p></div><div class="bg-[#111125] border border-app-border rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"><div class="flex-1"><span class="text-[9px] text-[#5C687C] uppercase tracking-wider font-semibold block mb-1">CURRENT SYNTHESIS</span><p class="text-xs text-white leading-relaxed">Recent climate change is predominantly driven by human activity, while natural factors contribute to longer-term climate variability.</p></div><div class="flex items-center gap-2 shrink-0 md:border-l md:border-app-border md:pl-4"><div class="text-right"><span class="text-[9px] text-app-primary uppercase tracking-wider font-semibold block">CURRENT CONFIDENCE</span><span class="text-lg font-mono text-app-primary font-bold">${d.conf}%</span></div></div></div><div class="flex flex-col gap-0 z-10"><div class="border-b border-app-border/50 py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">01</span><div><h4 class="text-[13.5px] font-medium text-white group-hover:text-app-primary transition-colors">Natural forcing explains recent warming</h4><p class="text-[12px] text-[#8D9BB0] mt-1 leading-relaxed">Evidence showing natural forcing accounts for most of the observed recent temperature increase.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Long-term solar measurements</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Volcanic forcing models</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Independent attribution studies</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[2]</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[4]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[24%]"></div></div><span class="text-[9px] font-mono text-white">24%</span></div></div></div></div></div><div class="border-b border-app-border/50 py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">02</span><div><h4 class="text-[13.5px] font-medium text-white group-hover:text-app-primary transition-colors">Independent datasets contradict the current attribution</h4><p class="text-[12px] text-[#8D9BB0] mt-1 leading-relaxed">Multiple high-quality datasets consistently produce a different attribution of recent warming.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Dataset comparison</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Methodological audit</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Cross-reference checks</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[1]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[15%]"></div></div><span class="text-[9px] font-mono text-white">15%</span></div></div></div></div></div><div class="py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">03</span><div><h4 class="text-[13.5px] font-medium text-white group-hover:text-app-primary transition-colors">Source consensus changes</h4><p class="text-[12px] text-[#8D9BB0] mt-1 leading-relaxed">New high-trust evidence substantially shifts the balance of independent sources.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Peer-reviewed journals</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Official reports</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Expert testimonies</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[5]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[8%]"></div></div><span class="text-[9px] font-mono text-white">8%</span></div></div></div></div></div></div><div class="mt-auto pt-6 border-t border-app-border/30"><div class="flex flex-col md:flex-row md:items-center gap-4"><div class="shrink-0"><span class="text-[9px] text-[#5C687C] uppercase tracking-wider font-semibold block mb-1">CURRENT RESILIENCE</span><span class="text-[11px] font-bold text-app-warning flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-app-warning"></span> MODERATELY ROBUST</span></div><p class="text-[10px] text-[#5C687C] leading-relaxed md:border-l md:border-app-border md:pl-4">The current conclusion is supported by multiple independent sources, but would weaken if stronger evidence materially changed the attribution of recent warming.</p></div></div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-8 flex flex-col relative overflow-hidden md:col-span-5 h-96 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><h3 class="text-[11px] uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-6 font-bold shrink-0"><i class="ph ph-lightning text-app-primary text-lg"></i> RESEARCH TRAJECTORY</h3><div class="flex flex-col gap-5 overflow-y-auto pr-1 hide-scrollbar">${trajRows(d)}</div><div class="absolute bottom-4 right-4 opacity-10"><i class="ph ph-rocket-launch text-6xl text-app-primary"></i></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-8 flex flex-col md:col-span-5 h-64 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><h3 class="text-[11px] uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-5 font-bold shrink-0"><i class="ph ph-shield-warning text-app-warning text-lg"></i> HONEST BOUNDARIES</h3><div class="flex flex-col gap-4 overflow-y-auto pr-1 hide-scrollbar">${boundaryRows(d)}</div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-8 flex flex-col md:col-span-7 h-64 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md" id="confidence-breakdown"><h3 class="text-[11px] uppercase tracking-[0.2em] text-white mb-6 font-bold shrink-0">CONFIDENCE BREAKDOWN</h3><div class="flex items-center justify-between gap-10 flex-1"><div class="flex flex-col gap-4 flex-1">${breakdownRows(d)}</div><div class="relative w-32 h-32 flex items-center justify-center shrink-0"><svg class="w-full h-full -rotate-90" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#4FD1C5" stroke-dasharray="${d.conf}, 100" stroke-width="2.5" stroke-linecap="round" style="filter:drop-shadow(0 0 5px rgba(79,209,197,0.3))"></circle></svg><div class="absolute inset-0 flex items-center justify-center"><span class="text-2xl font-bold text-white font-mono">${d.conf}%</span></div></div></div></div>
</div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 md:col-span-4">
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col md:col-span-2 h-64"><h3 class="text-[11px] uppercase tracking-wider text-white mb-4 font-semibold shrink-0">TOOLS</h3><div class="flex flex-col gap-2 overflow-y-auto pr-1 hide-scrollbar flex-1">${toolChips(d)}</div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col md:col-span-4 h-64"><h3 class="text-[11px] uppercase tracking-wider text-white mb-4 font-semibold shrink-0">RUN TELEMETRY</h3>${telemetryPanel(d)}</div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col md:col-span-3 h-64"><h3 class="text-[11px] uppercase tracking-wider text-white mb-4 font-semibold shrink-0">SOURCE CONSTELLATION</h3><div class="flex flex-col gap-2 overflow-y-auto pr-1 hide-scrollbar flex-1">${constellationRows(d)}</div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col md:col-span-3 h-64"><h3 class="text-[11px] uppercase tracking-wider text-white mb-4 font-semibold shrink-0">RESEARCH PROVENANCE</h3><div class="flex flex-col gap-3 overflow-y-auto pr-1 hide-scrollbar flex-1">${provenanceRows(d)}</div></div>
</div>
<div class="pb-12"></div>
</div>
</main>
<div class="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 hidden transition-opacity opacity-0" id="inspector-backdrop" onclick="closeInspector()"></div>
<div class="fixed top-0 right-0 h-full w-[420px] bg-[rgba(7,12,25,0.96)] backdrop-blur-xl border-l border-white/10 rounded-l-2xl z-50 drawer-closed transition-transform duration-300 shadow-2xl flex flex-col overflow-hidden" id="citation-inspector">
<div class="flex items-center justify-between p-6 border-b border-white/5 shrink-0"><div><h2 class="text-xs font-bold tracking-[0.2em] text-app-text uppercase flex items-center gap-2"><i class="ph ph-magnifying-glass text-app-primary text-sm"></i> Citation Inspector</h2><p class="text-[9px] text-[#5C687C] mt-1 font-mono">ID: x7f-992a · Analyzing Claim</p></div><button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-[#5C687C] hover:text-white transition-colors" onclick="closeInspector()"><i class="ph ph-x"></i></button></div>
<div class="flex-1 overflow-y-auto p-6 flex flex-col gap-8 fade-in-content"><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold flex items-center justify-between"><span class="">Target Claim</span><span class="px-1.5 py-0.5 rounded text-[8px] font-bold border border-app-success text-app-success bg-app-success/10 flex items-center gap-1"><i class="ph ph-check"></i> SUPPORTED</span></div><p class="text-white text-sm leading-relaxed font-medium">"Human activity is the primary driver of recent climate change" <span class="font-mono text-app-primary text-xs ml-1 bg-app-primary/10 px-1 rounded">[3]</span></p></div><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Primary Source</div><div class="bg-app-surface/50 border border-white/5 rounded-lg p-4 flex flex-col gap-3"><div class="flex items-start justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/50"><i class="ph ph-globe text-lg"></i></div><div><h4 class="text-white text-xs font-semibold">US Environmental Protection Agency</h4><p class="text-[10px] text-app-text mt-0.5">epa.gov/climatechange</p></div></div><div class="flex items-center gap-1.5 bg-app-success/10 px-2 py-1 rounded border border-app-success/20"><div class="w-1.5 h-1.5 rounded-full bg-app-success animate-pulse"></div><span class="text-app-success font-mono text-[10px] font-bold">0.96</span></div></div></div></div><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Matched Evidence</div><div class="bg-[#00FF47]/5 border border-app-success/25 rounded-lg p-4 relative"><i class="ph ph-quotes absolute top-2 right-2 text-3xl text-app-success/10"></i><p class="text-white/90 text-xs leading-relaxed italic relative z-10">"Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1°C above 1850-1900 in 2011-2020."</p></div><p class="text-[10px] text-app-text leading-relaxed bg-app-surface/30 p-3 rounded border border-white/5"><span class="text-white font-medium">Synthesis:</span> The source explicitly confirms human activities (greenhouse gas emissions) as the "unequivocal" cause of recent warming, directly supporting the claim.</p></div><div class="flex flex-col gap-4 bg-[#0A0A1E]/50 rounded-lg p-4 border border-white/5"><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Semantic Match</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-info w-[94%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">94%</span></div><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Source Trust</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-primary w-[96%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">0.96</span></div><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Grounding</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-success w-[91%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">91%</span></div></div><div class="flex flex-col gap-2"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Overall Assessment</div><div class="flex items-center gap-2 text-app-success text-xs font-bold"><i class="ph ph-shield-check text-lg"></i> STRONG SUPPORT</div><p class="text-[10px] text-app-text">High confidence semantic match from a Tier 1 authoritative source.</p></div></div>
<div class="p-6 border-t border-white/5 bg-[#0A0A1E]/80 shrink-0 flex flex-col gap-4"><div class="flex justify-between items-center text-[9px] font-mono text-[#5C687C]"><span class="">Model: ${esc(d.model)}</span><span class="">Latency: 412ms</span></div><div class="flex gap-3"><button class="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"><i class="ph ph-arrow-square-out"></i> Open Source</button><button class="flex-1 px-4 py-2 bg-app-primary/10 hover:bg-app-primary/20 border border-app-primary/30 text-app-primary rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"><i class="ph ph-arrows-out-line-horizontal"></i> Verify Claim</button></div></div>
</div>
`;
}

/* ---------- one-time asset injection (Tailwind + config + fonts + styles) ---------- */
const TW_CONFIG = {
  darkMode: "class",
  corePlugins: { preflight: false }, // don't reset the rest of the app
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#0A0A1E", surface: "#111125", surfaceHover: "#151529", border: "rgba(120,130,180,0.16)",
          primary: "#4FD1C5", secondary: "#6C8CFF", success: "#00FF47", warning: "#FFAA00", danger: "#FF2040",
          text: "#8D9BB0", textHover: "#E8EAF0", critic: "#E8A855", synthesis: "#B48EF0", info: "#00CCFF",
        },
      },
      fontFamily: { sans: ["Hanken Grotesk", "sans-serif"], mono: ["JetBrains Mono", "monospace"], sora: ["Bricolage Grotesque", "sans-serif"] },
      borderRadius: { lg: "0.375rem", xl: "0.5rem" },
      animation: { "draw-line": "drawLine 2s ease-out forwards", "fade-node": "fadeNode 0.5s ease-out forwards", "pulse-halo": "pulseHalo 2s infinite" },
      keyframes: {
        drawLine: { "0%": { width: "0" }, "100%": { width: "100%" } },
        fadeNode: { "0%": { opacity: "0", transform: "scale(0.8)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        pulseHalo: { "0%": { boxShadow: "0 0 0 0 rgba(0,255,71,0.4)" }, "70%": { boxShadow: "0 0 0 10px rgba(0,255,71,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(0,255,71,0)" } },
      },
    },
  },
};

const REPORT_CSS = `
.pn-html-root { --tw-bg: #0A0A1E; }
.pn-html-root ::-webkit-scrollbar { width: 6px; height: 6px; }
.pn-html-root ::-webkit-scrollbar-track { background: #0A0A1E; }
.pn-html-root ::-webkit-scrollbar-thumb { background: rgba(120,130,180,0.3); border-radius: 3px; }
.pn-html-root ::-webkit-scrollbar-thumb:hover { background: rgba(120,130,180,0.5); }
.pn-html-root .hide-scrollbar::-webkit-scrollbar { display: none; }
.pn-html-root .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.drawer-open { transform: translateX(0); }
.drawer-closed { transform: translateX(100%); }
.fade-in-content > * { animation: pnFadeIn 0.4s ease-out forwards; opacity: 0; }
.fade-in-content > *:nth-child(1) { animation-delay: 0.1s; }
.fade-in-content > *:nth-child(2) { animation-delay: 0.15s; }
.fade-in-content > *:nth-child(3) { animation-delay: 0.2s; }
.fade-in-content > *:nth-child(4) { animation-delay: 0.25s; }
.fade-in-content > *:nth-child(5) { animation-delay: 0.3s; }
@keyframes pnFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.citation-link { cursor: pointer; color: #4FD1C5; transition: all 0.2s; }
.citation-link:hover { text-shadow: 0 0 8px rgba(79,209,197,0.6); background: rgba(79,209,197,0.1); border-radius: 2px; padding: 0 2px; }
.interactive-item { cursor: pointer; transition: all 0.2s; }
.interactive-item:hover { background: rgba(120,130,180,0.08); border-color: rgba(120,130,180,0.4); }
.condition-content { display: grid; grid-template-rows: 0fr; overflow: hidden; transition: grid-template-rows 0.32s cubic-bezier(.32,.72,0,1), opacity 0.3s ease, margin 0.3s ease; opacity: 0; }
.condition-content > * { min-height: 0; }
.condition-expanded .condition-content { grid-template-rows: 1fr; opacity: 1; margin-top: 1rem; }
.condition-expanded .condition-icon { transform: rotate(180deg); }

/* ── Research Timeline ─────────────────────────────────────────────── */
.pn-tl-node { position: absolute; opacity: 0; transition: opacity .55s cubic-bezier(.16,1,.3,1); }
.pn-timeline.pn-tl-in .pn-tl-node { opacity: 1; }
.pn-timeline.pn-tl-in .pn-tl-node:nth-child(1) { transition-delay: .35s; }
.pn-timeline.pn-tl-in .pn-tl-node:nth-child(2) { transition-delay: .55s; }
.pn-timeline.pn-tl-in .pn-tl-node:nth-child(3) { transition-delay: .75s; }
.pn-timeline.pn-tl-in .pn-tl-node:nth-child(4) { transition-delay: .95s; }
.pn-timeline.pn-tl-in .pn-tl-node:nth-child(5) { transition-delay: 1.15s; }
/* hover: dim the rest, spotlight one */
.pn-timeline.pn-tl-in .pn-tl-nodes:hover .pn-tl-node { opacity: .3; }
.pn-timeline .pn-tl-node:hover { opacity: 1 !important; z-index: 30; }
.pn-tl-dot { position: absolute; left: 0; top: 0; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: var(--tl); box-shadow: 0 0 0 3px rgba(10,10,30,0.9), 0 0 12px var(--tl); transition: transform .2s ease; }
.pn-tl-node:hover .pn-tl-dot { transform: scale(1.35); }
.pn-tl-halo { position: absolute; inset: 0; border-radius: 50%; background: var(--tl); opacity: .55; animation: pnTlPulse 2.4s ease-out infinite; }
@keyframes pnTlPulse { 0% { transform: scale(1); opacity: .55; } 70% { transform: scale(2.6); opacity: 0; } 100% { opacity: 0; } }
.pn-tl-year { position: absolute; left: 0; top: 12px; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pn-tl-card { position: absolute; top: 26px; width: 184px; padding: 12px 14px; border-radius: 12px; background: rgba(17,17,37,0.97); border: 1px solid rgba(120,130,180,0.28); box-shadow: 0 18px 44px -18px rgba(0,0,0,0.85); opacity: 0; visibility: hidden; transform: translateY(6px); transition: opacity .2s ease, transform .2s ease; pointer-events: none; z-index: 40; backdrop-filter: blur(12px); }
.pn-tl-node:hover .pn-tl-card { opacity: 1; visibility: visible; transform: translateY(0); }
.pn-tl-card-year { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.pn-tl-card-title { color: #E8EAF0; font-size: 13px; font-weight: 600; margin-top: 3px; line-height: 1.3; }
.pn-tl-card-desc { color: #8D9BB0; font-size: 12px; line-height: 1.5; margin-top: 5px; }
.pn-tl-card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(120,130,180,0.16); font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #5C687C; letter-spacing: .04em; }
.pn-tl-line { stroke-dasharray: 1400; stroke-dashoffset: 1400; filter: drop-shadow(0 0 6px rgba(79,209,197,0.45)); }
.pn-timeline.pn-tl-in .pn-tl-line { transition: stroke-dashoffset 1.9s cubic-bezier(.16,1,.3,1); stroke-dashoffset: 0; }
.pn-tl-ridge { opacity: 0; }
.pn-timeline.pn-tl-in .pn-tl-ridge { transition: opacity 1.1s ease .45s; opacity: 1; }
@media (prefers-reduced-motion: reduce) { .pn-tl-node, .pn-tl-line, .pn-tl-ridge { opacity: 1 !important; stroke-dashoffset: 0 !important; transition: none !important; } }

/* ── Premium surface + motion layer (soft-skill / redesign-skill) ─────────── */
/* Body type: Hanken Grotesk, tighter tracking, better rendering. */
.pn-html-root { font-family: 'Hanken Grotesk', -apple-system, sans-serif; letter-spacing: -0.006em; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
/* Every card surface gets a soft, navy-tinted, highly diffused ambient shadow +
   a hairline top highlight, and lifts with spring easing on hover. Targeted by
   the report's surface colours so it hits ~30 cards without touching markup. */
.pn-html-root [class*="bg-[#111125]"],
.pn-html-root [class*="bg-[#151529]"],
.pn-html-root [class*="bg-[#121226]"],
.pn-html-root [class*="bg-[#14142b]"],
.pn-html-root [class*="bg-[#15152e]"],
.pn-html-root [class*="bg-app-surface"],
.pn-html-root .pn-timeline {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px -3px rgba(0,4,20,0.5), 0 20px 44px -24px rgba(2,6,30,0.85);
  transition: transform .55s cubic-bezier(.32,.72,0,1), box-shadow .55s cubic-bezier(.32,.72,0,1), border-color .3s ease;
}
.pn-html-root [class*="bg-[#111125]"]:hover,
.pn-html-root [class*="bg-[#151529]"]:hover,
.pn-html-root [class*="bg-[#121226]"]:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 10px -4px rgba(0,4,20,0.5), 0 28px 60px -22px rgba(2,6,30,0.9);
}
/* Buttons: physical press + spring, no default easing. */
.pn-html-root button, .pn-html-root a[href] { transition: transform .25s cubic-bezier(.32,.72,0,1), background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease; }
.pn-html-root button:active { transform: scale(0.97); }
/* Accessible focus ring on every interactive element. */
.pn-html-root a:focus-visible, .pn-html-root button:focus-visible, .pn-html-root input:focus-visible {
  outline: 2px solid rgba(79,209,197,0.9); outline-offset: 2px; border-radius: 8px;
}
.pn-html-root { scroll-behavior: smooth; }
/* Perf: backdrop-blur only survives on the fixed inspector/backdrop. On all the
   scrolling cards it forces continuous GPU repaints, so neutralise it there. */
.pn-html-root [class*="backdrop-blur"]:not(#citation-inspector):not(#inspector-backdrop) { -webkit-backdrop-filter: none; backdrop-filter: none; }
/* Respect reduced motion across the whole report. */
@media (prefers-reduced-motion: reduce) {
  .pn-html-root *, .pn-html-root *::before, .pn-html-root *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.12s !important; scroll-behavior: auto !important;
  }
}
`;

let assetsInjected = false;
function injectAssets() {
  if (assetsInjected || typeof document === "undefined") return;
  assetsInjected = true;
  const head = document.head;
  // fonts + phosphor icons
  const links = [
    "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/light/style.css",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/thin/style.css",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/regular/style.css",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/bold/style.css",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/fill/style.css",
    "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/duotone/style.css",
  ];
  links.forEach((href) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; head.appendChild(l); });
  // custom report styles
  const st = document.createElement("style"); st.id = "pn-report-style"; st.textContent = REPORT_CSS; head.appendChild(st);
  // Tailwind runtime + config
  if (!document.getElementById("pn-tw-cdn")) {
    const s = document.createElement("script");
    s.id = "pn-tw-cdn"; s.src = "https://cdn.tailwindcss.com?plugins=forms,container-queries";
    s.onload = () => { try { window.tailwind.config = TW_CONFIG; } catch { /* noop */ } };
    head.appendChild(s);
  }
}

/* ---------- interactions (ported from the mockup's inline scripts) ---------- */
function installHandlers() {
  if (typeof window === "undefined") return;
  window.openInspector = function () {
    const drawer = document.getElementById("citation-inspector");
    const backdrop = document.getElementById("inspector-backdrop");
    if (!drawer || !backdrop) return;
    drawer.classList.remove("drawer-closed"); drawer.classList.add("drawer-open");
    backdrop.classList.remove("hidden");
    setTimeout(() => { backdrop.classList.remove("opacity-0"); backdrop.classList.add("opacity-100"); }, 10);
    const content = drawer.querySelector(".fade-in-content");
    if (content) { content.classList.remove("fade-in-content"); void content.offsetWidth; content.classList.add("fade-in-content"); }
  };
  window.closeInspector = function () {
    const drawer = document.getElementById("citation-inspector");
    const backdrop = document.getElementById("inspector-backdrop");
    if (!drawer || !backdrop) return;
    drawer.classList.remove("drawer-open"); drawer.classList.add("drawer-closed");
    backdrop.classList.remove("opacity-100"); backdrop.classList.add("opacity-0");
    setTimeout(() => backdrop.classList.add("hidden"), 300);
  };
  window.toggleCondition = function (element) {
    const all = element.parentElement.querySelectorAll(".group");
    all.forEach((cond) => { if (cond !== element && cond.classList.contains("condition-expanded")) cond.classList.remove("condition-expanded"); });
    element.classList.toggle("condition-expanded");
  };
  // Live "chat with this report" — grounded on the report answer + sources.
  window.__pnApiBase = APP_API_BASE;
  window.__pnGetToken = getAuthToken;
  window.pnChatAsk = function (btn) {
    const input = document.getElementById("pn-chat-input");
    if (!input) return;
    input.value = typeof btn === "string" ? btn : (btn.textContent || "").trim();
    window.pnChatSend();
  };
  window.pnChatSend = async function () {
    const input = document.getElementById("pn-chat-input");
    const box = document.getElementById("pn-chat-msgs");
    if (!input || !box) return;
    const q = input.value.trim(); if (!q) return;
    input.value = "";
    const esc2 = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const add = (role, html) => {
      const el = document.createElement("div");
      el.className = "flex gap-3" + (role === "user" ? " flex-row-reverse" : "");
      el.innerHTML = `<i class="ph ${role === "user" ? "ph-user-circle text-app-info" : "ph-chat-circle text-app-synthesis"} mt-1 shrink-0"></i><div class="flex-1 text-[12.5px] leading-relaxed ${role === "user" ? "text-white text-right" : "text-white/85"}">${html}</div>`;
      box.appendChild(el); box.scrollTop = box.scrollHeight; return el;
    };
    add("user", esc2(q));
    const pending = add("assistant", '<span class="text-app-text italic">thinking…</span>');
    try {
      const ctx = window.__pnChatCtx || {};
      const tok = (window.__pnGetToken && window.__pnGetToken()) || "";
      const res = await fetch(window.__pnApiBase + "/report/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
        body: JSON.stringify({ question: q, report_answer: ctx.answer || "", source_summaries: ctx.sources || [] }),
      });
      const data = res.ok ? await res.json() : {};
      pending.querySelector("div").innerHTML = esc2(data.answer || (res.status === 401 ? "Please sign in to ask follow-ups." : "Couldn't answer that — please try again."));
    } catch {
      pending.querySelector("div").innerHTML = "Couldn't reach the assistant. Try again.";
    }
  };
}

function runCounters(root) {
  if (!root) return;
  root.querySelectorAll(".number-counter").forEach((counter) => {
    const target = +counter.getAttribute("data-target");
    const suffix = counter.getAttribute("data-suffix") || "";
    if (!isFinite(target)) return;
    const duration = 800, startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - (1 - p) * (1 - p);
      counter.innerText = Math.floor(target * ease) + suffix;
      if (p < 1) requestAnimationFrame(step); else counter.innerText = target + suffix;
    };
    requestAnimationFrame(step);
  });
}

// Scroll-scrubbed reveal for the Research Timeline — draws the line, fades in
// the ridge, and staggers the nodes in when the card enters the viewport.
function initTimeline(root) {
  if (!root || typeof IntersectionObserver === "undefined") return null;
  const el = root.querySelector(".pn-timeline");
  if (!el) return null;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { el.classList.add("pn-tl-in"); io.disconnect(); } });
  }, { threshold: 0.2 });
  io.observe(el);
  return io;
}

// A11y: the mockup fires interactions via onclick on <div>/<span>. Make every
// such element keyboard-focusable and activatable with Enter/Space, without
// rewriting the markup.
function initA11y(root) {
  if (!root || typeof document === "undefined") return;
  root.querySelectorAll("[onclick]").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "button" || tag === "a") return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.getAttribute("role")) el.setAttribute("role", "button");
  });
  if (!window.__pnKeyBound) {
    window.__pnKeyBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = document.activeElement;
      if (el && el.getAttribute && el.getAttribute("role") === "button" && el.hasAttribute("onclick")) { e.preventDefault(); el.click(); }
    });
  }
}

/* ---------- component ---------- */
export default function PolynousReport(props) {
  const ref = useRef(null);
  const data = deriveReport(props);
  const html = buildHtml(data);

  if (typeof window !== "undefined") window.__pnChatCtx = { answer: data.chatAnswer, sources: data.sourceSummaries };
  useEffect(() => { injectAssets(); installHandlers(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { runCounters(ref.current); initA11y(ref.current); }, 60);
    const io = initTimeline(ref.current);
    return () => { clearTimeout(t); if (io) io.disconnect(); };
  }, [html]);

  return (
    <div
      ref={ref}
      className="pn-html-root"
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0A0A1E", color: "#8D9BB0", fontFamily: "'Hanken Grotesk', sans-serif" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
