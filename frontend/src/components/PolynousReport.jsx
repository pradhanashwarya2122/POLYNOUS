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
    ? srcArr.slice(0, 5).map((s, i) => ({ name: pick(domain(s.url), s.title, "Source " + (i + 1)), cite: pick(s.citationId, s.n, null), fresh: FRESH[i % FRESH.length], trust: TRUST[i % TRUST.length] }))
    : DEMO_LEDGER;

  return {
    query: pick(p.query, report.query, "What actually causes climate change?"),
    date: fmtDate(new Date()), sources, model, conf, band, breakdown, critic, findings, stats, ledger,
  };
}

/* ---------- dynamic fragments ---------- */
function findingsRows(d) {
  return d.findings.map((f, i) => `
    <div class="flex items-center gap-3 interactive-item -mx-2 px-2 py-1 rounded" onclick="openInspector()">
      <div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">${i + 1}</div>
      <div class="flex-1 flex flex-col gap-1.5"><div class="text-white text-xs leading-tight">${citeHtml(f)}</div></div>
      <div class="border border-app-border rounded px-2 py-0.5 text-[10px] text-app-text flex items-center gap-1"><i class="ph ph-caret-right"></i></div>
    </div>`).join("");
}
function ledgerRows(d) {
  return d.ledger.map((r) => `
    <tr class="border-b border-app-border/20 interactive-item group" onclick="openInspector()">
      <td class="py-2"><div class="w-2.5 h-2.5 rounded-full bg-app-border group-hover:bg-app-primary transition-colors"></div></td>
      <td class="py-2"><div class="text-white/80 group-hover:text-white transition-colors">${esc(r.name)}${r.cite ? ` <span class="citation-link font-mono text-[8px] ml-1" onclick="event.stopPropagation(); openInspector()">[${esc(r.cite)}]</span>` : ""}</div></td>
      <td class="py-2"><div class="flex items-center gap-2 font-mono text-[8px] group/freshness"><span class="w-1.5 h-1.5 rounded-full transition-all duration-200" style="background:${r.fresh.color}"></span><span class="tracking-tighter" style="color:${r.fresh.color}">${r.fresh.label}</span><span class="text-white/40">${r.fresh.year}</span></div></td>
      <td class="py-2"><div class="h-1 ${r.trust.c} ${r.trust.w} rounded"></div></td>
    </tr>`).join("");
}

/* ---------- the report markup (verbatim design; ${…} = wired data) ---------- */
function buildHtml(d) {
  const s = d.stats;
  return `
<main class="flex-1 flex flex-col h-full overflow-y-auto bg-app-bg relative scroll-smooth">
<div class="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-app-surface/50 to-transparent pointer-events-none z-0"></div>
<header class="relative h-[220px] p-8 z-20 border-b border-app-border/20 overflow-hidden">
<div class="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
<svg class="w-full h-full" viewbox="0 0 1000 200">
<circle cx="500" cy="100" fill="none" r="150" stroke="#4FD1C5" stroke-dasharray="4 4" stroke-width="0.5"></circle>
<circle cx="500" cy="100" fill="none" r="100" stroke="#00FF47" stroke-dasharray="2 2" stroke-width="0.5"></circle>
<line stroke="#4FD1C5" stroke-width="0.2" x1="0" x2="1000" y1="100" y2="100"></line>
<line stroke="#4FD1C5" stroke-width="0.2" x1="500" x2="500" y1="0" y2="200"></line>
</svg>
</div>
<div class="relative z-10 grid grid-cols-12 gap-8 h-full items-center max-w-[1600px] mx-auto w-full">
<div class="col-span-4 flex flex-col gap-3">
<div class="flex items-center gap-3">
<span class="text-app-success font-mono text-[10px] tracking-widest">● SYNTHESIS COMPLETE</span>
<span class="text-[#5C687C] font-mono text-[10px] uppercase tracking-widest">| POLYNOUS | NEURAL RESEARCH ENGINE</span>
</div>
<h1 class="text-4xl font-sora font-semibold text-white tracking-tight">Neural Synthesis <span class="text-app-info">Report</span></h1>
<div class="bg-white/5 border border-white/10 rounded px-4 py-2">
<p class="text-white text-[15px] font-inter">${esc(d.query)}</p>
</div>
<div class="flex items-center gap-4 font-mono text-[10px] text-[#5C687C] uppercase tracking-wider">
<span>GENERATED: ${d.date}</span><span class="opacity-30">·</span>
<span>SOURCES: ${d.sources}</span><span class="opacity-30">·</span>
<span>MODEL: ${esc(d.model)}</span>
</div>
</div>
<div class="col-span-4 flex flex-col items-center justify-center">
<div class="relative w-32 h-32 flex items-center justify-center group cursor-pointer">
<svg class="w-full h-full -rotate-90" viewbox="0 0 36 36">
<circle cx="18" cy="18" fill="none" r="16" stroke="rgba(120,130,180,0.1)" stroke-width="2"></circle>
<circle class="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(79,209,197,0.6)]" cx="18" cy="18" fill="none" r="16" stroke="url(#gauge-grad)" stroke-dasharray="${d.conf}, 100" stroke-linecap="round" stroke-width="2"></circle>
<defs><lineargradient id="gauge-grad" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" style="stop-color:#4FD1C5"></stop><stop offset="100%" style="stop-color:#00FF47"></stop></lineargradient></defs>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<span class="text-3xl font-sora font-bold text-white">${d.conf}%</span>
<div class="flex flex-col items-center -mt-1">
<span class="text-[8px] text-[#5C687C] tracking-[0.2em] uppercase">CONFIDENCE</span>
<span class="text-[8px] text-app-primary font-bold tracking-widest">${esc(d.band)}</span>
</div>
</div>
<div class="absolute top-full mt-2 bg-app-surface border border-app-border p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 shadow-2xl">
<div class="space-y-2">
<div class="flex justify-between text-[9px] font-mono"><span>Agreement</span><span class="text-white">${d.breakdown.agreement}%</span></div>
<div class="flex justify-between text-[9px] font-mono"><span>Diversity</span><span class="text-white">${d.breakdown.diversity}%</span></div>
<div class="flex justify-between text-[9px] font-mono"><span>Recency</span><span class="text-white">${d.breakdown.recency}%</span></div>
<div class="flex justify-between text-[9px] font-mono"><span>Grounding</span><span class="text-white">${d.breakdown.grounding}%</span></div>
</div>
</div>
</div>
<button class="mt-4 text-[10px] font-bold text-app-primary hover:text-white transition-all flex items-center gap-1 group">WHY THIS SCORE? <span class="group-hover:translate-x-1 transition-transform">→</span></button>
</div>
<div class="col-span-4 flex flex-col h-full justify-between py-2">
<div class="flex justify-end gap-3">
<button class="flex items-center gap-2 px-4 py-1.5 border border-app-border rounded text-app-text hover:text-white hover:border-white/40 transition-colors bg-transparent text-xs font-medium"><i class="ph ph-share-network"></i> Share Report</button>
<button class="flex items-center gap-2 px-4 py-1.5 bg-app-success/10 border border-app-success/30 rounded text-app-success hover:bg-app-success/20 hover:shadow-[0_0_15px_rgba(0,255,71,0.2)] transition-all text-xs font-medium group"><i class="ph ph-download-simple group-hover:-translate-y-0.5 transition-transform"></i> Export<i class="ph ph-caret-down ml-1"></i></button>
</div>
<div class="bg-app-surface/30 border border-app-border/50 rounded-lg p-4 flex flex-col gap-2">
<div class="flex justify-between items-center">
<span class="text-[10px] font-bold text-app-critic uppercase tracking-wider">CRITIC CONSENSUS: ${d.critic.pct}%</span>
<span class="text-[9px] font-mono text-[#5C687C]">${d.critic.agree} / ${d.critic.total} sources agree</span>
</div>
<p class="text-[11px] text-white/80 leading-relaxed"><span class="text-[#5C687C] font-bold">MOST COMMON POSITION:</span> ${esc(d.critic.position)}</p>
<div class="flex gap-4 mt-1">
<a class="text-[9px] font-bold text-app-info hover:underline flex items-center gap-1" href="#">VIEW ANALYSIS →</a>
<a class="text-[9px] font-bold text-app-critic hover:underline flex items-center gap-1" href="#">WHY THIS SCORE? →</a>
</div>
</div>
</div>
</div>
<div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-app-info/30 to-transparent"></div>
</header>
<div class="p-8 pt-0 z-10 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
<section class="bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 backdrop-blur-sm">
<div class="flex flex-col gap-4">
<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
<div>
<h3 class="text-[10px] uppercase tracking-wider text-[#8D9BB0] font-bold flex items-center gap-2">RESEARCH SCALE</h3>
<p class="text-[9px] text-[#5C687C] mt-1">A snapshot of the evidence processed for this synthesis</p>
</div>
</div>
<div class="flex overflow-x-auto pb-2 md:pb-0 hide-scrollbar gap-8 md:justify-between items-center whitespace-nowrap">
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#confidence-breakdown"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#00FF47] number-counter" data-suffix="%" data-target="${s.confidence}">${s.confidence}%</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">CONFIDENCE</span></a>
<div class="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0 hidden md:block"></div>
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#source-landscape"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#00CCFF] number-counter" data-target="${s.sources}">${s.sources}</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">SOURCES</span></a>
<div class="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0 hidden md:block"></div>
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#evidence-ledger"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#B48EF0] number-counter" data-target="${s.passages}">${s.passages}</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">PASSAGES</span></a>
<div class="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0 hidden md:block"></div>
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#key-findings"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#4FD1C5] number-counter" data-target="${s.insights}">${s.insights}</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">INSIGHTS</span></a>
<div class="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0 hidden md:block"></div>
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#claim-level-confidence"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#6C8CFF] number-counter" data-target="${s.claims}">${s.claims}</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">CLAIMS</span></a>
<div class="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0 hidden md:block"></div>
<a class="flex flex-col items-center gap-1 group cursor-pointer shrink-0" href="#evidence-strength"><span class="text-2xl md:text-[28px] font-semibold font-mono tabular-nums text-[#E8A855] number-counter" data-suffix="%" data-target="${s.consensus}">${s.consensus}%</span><span class="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#5C687C] group-hover:text-white transition-colors">CONSENSUS</span></a>
</div>
<div><p class="text-[10px] text-[#5C687C] italic opacity-80">${s.passages} passages analyzed across ${s.sources} sources to produce ${s.claims} synthesized claims.</p></div>
</div>
</section>
<section class="bg-[#111125] border border-app-border rounded-lg p-8 lg:p-10 backdrop-blur-md relative overflow-hidden"><h3 class="text-xs uppercase tracking-[0.2em] text-app-info mb-10 font-bold flex items-center gap-3"><span class="w-1 h-4 bg-app-info rounded-full drop-shadow-[0_0_4px_rgba(0,204,255,0.5)]"></span>HOW WE REACHED THIS CONCLUSION</h3><div class="flex items-center justify-between gap-4"><div class="flex items-center justify-between flex-1 px-4"><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-info group-hover:text-app-info transition-all relative"><div class="absolute inset-0 rounded-full bg-app-info/5 opacity-0 group-hover:opacity-100 transition-all"></div><i class="ph ph-lightning text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-info">Input</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-info group-hover:text-app-info transition-all relative"><i class="ph ph-file-text text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-info">Sources</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-critic group-hover:text-app-critic transition-all relative"><i class="ph ph-chart-polar text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-critic">Analysis</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-critic group-hover:text-app-critic transition-all relative"><i class="ph ph-scales text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-critic">Evidence</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-synthesis group-hover:text-app-synthesis transition-all relative"><i class="ph ph-brain text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-synthesis">Synthesis</span></div><div class="h-px flex-1 bg-app-border mx-2"></div><div class="flex flex-col items-center gap-4 group relative"><div class="w-16 h-16 rounded-full border border-app-border bg-[#0A0A1E] flex items-center justify-center text-[#5C687C] group-hover:border-app-primary group-hover:text-app-primary transition-all relative"><i class="ph ph-lightbulb text-xl relative z-10"></i></div><span class="text-[9px] font-bold tracking-[0.15em] text-[#5C687C] uppercase font-mono group-hover:text-app-primary">Insights</span></div></div><div class="ml-8 pl-8 border-l border-app-border flex flex-col items-center gap-3"><div class="relative w-28 h-28 flex items-center justify-center"><svg class="absolute inset-0 w-full h-full opacity-20" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="none" r="17.5" stroke="#4FD1C5" stroke-dasharray="1 3" stroke-width="0.5"></circle></svg><svg class="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(79,209,197,0.3)]" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="none" r="16" stroke="rgba(120,130,180,0.16)" stroke-width="1.5"></circle><circle cx="18" cy="18" fill="none" r="16" stroke="#4FD1C5" stroke-dasharray="${d.conf}, 100" stroke-linecap="round" stroke-width="2"></circle><circle cx="18" cy="18" fill="none" r="13" stroke="rgba(120,130,180,0.16)" stroke-dasharray="2 2" stroke-width="0.5"></circle></svg><div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-2xl font-bold text-white font-mono tracking-tighter">${d.conf}%</span><span class="text-[7px] text-app-primary font-bold tracking-[0.2em] mt-0.5">FINAL</span></div></div><span class="text-[10px] font-bold tracking-[0.2em] text-[#5C687C] uppercase font-mono mt-2">Confidence</span></div></div></section>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col" id="key-findings">
<h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-star text-app-info"></i> KEY FINDINGS</h3>
<div class="flex flex-col gap-4">${findingsRows(d)}</div>
</div>
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col relative overflow-hidden" id="evidence-ledger">
<h3 class="text-[10px] uppercase tracking-wider text-white mb-4">EVIDENCE LEDGER</h3>
<table class="w-full text-[10px] text-left border-collapse">
<thead><tr class="text-app-text border-b border-app-border/50"><th class="pb-2 font-normal">--</th><th class="pb-2 font-normal">Source</th><th class="pb-2 font-normal">Freshness</th><th class="pb-2 font-normal">Trust</th></tr></thead>
<tbody>${ledgerRows(d)}</tbody>
</table>
<div class="mt-auto pt-4 flex items-center gap-2"><div class="h-0.5 bg-app-border flex-1 rounded overflow-hidden"><div class="h-full bg-app-primary w-2/3"></div></div><span class="text-[10px] text-white font-mono">${d.conf}%</span></div>
</div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col" id="claim-level-confidence">
<h3 class="text-[10px] uppercase tracking-wider text-white mb-4">CLAIM-LEVEL CONFIDENCE</h3>
<div class="flex flex-col gap-4">
<div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">1</div><div class="flex-1 flex flex-col gap-1.5"><div class="h-1.5 bg-app-border rounded w-4/5"></div><div class="h-1 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-app-success w-[90%] drop-shadow-[0_0_4px_rgba(0,255,71,0.5)]"></div></div></div><span class="text-xs text-white font-mono">90%</span></div>
<div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">2</div><div class="flex-1 flex flex-col gap-1.5"><div class="h-1.5 bg-app-border rounded w-full"></div><div class="h-1 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-app-success w-[75%]"></div></div></div><span class="text-xs text-white font-mono">75%</span></div>
<div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">3</div><div class="flex-1 flex flex-col gap-1.5"><div class="h-1.5 bg-app-border rounded w-5/6"></div><div class="h-1 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-app-primary w-[60%]"></div></div></div><span class="text-xs text-white font-mono">60%</span></div>
<div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border border-app-success text-app-success flex items-center justify-center text-[10px] shrink-0">4</div><div class="flex-1 flex flex-col gap-1.5"><div class="h-1.5 bg-app-border rounded w-3/4"></div><div class="h-1 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-app-warning w-[45%]"></div></div></div><span class="text-xs text-white font-mono">45%</span></div>
<div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] shrink-0">5</div><div class="flex-1 flex flex-col gap-1.5"><div class="h-1.5 bg-app-border rounded w-2/3"></div><div class="h-1 bg-app-border rounded w-full overflow-hidden"><div class="h-full bg-app-synthesis w-[30%]"></div></div></div><span class="text-xs text-white font-mono">30%</span></div>
</div>
</div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col h-full shadow-[0_0_20px_rgba(79,209,197,0.02)]">
<div class="flex justify-between items-start mb-4"><div><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2"><i class="ph ph-shield-check text-[#39ff9c]"></i> FAITHFULNESS ANALYSIS</h3><p class="text-[8px] text-app-text mt-0.5">How well the report is grounded in its sources</p></div></div>
<div class="flex items-center gap-4 mb-6"><div class="relative w-14 h-14 flex items-center justify-center"><svg class="w-full h-full -rotate-90" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="none" r="16" stroke="rgba(120,130,180,0.1)" stroke-width="1.5"></circle><circle class="drop-shadow-[0_0_4px_rgba(57,255,156,0.4)]" cx="18" cy="18" fill="none" r="16" stroke="#39ff9c" stroke-dasharray="86, 100" stroke-width="1.5"></circle></svg><div class="absolute inset-0 flex items-center justify-center"><span class="text-[10px] font-bold text-white">86%</span></div></div><div><div class="text-xl font-bold text-white">12 / 14</div><div class="text-[8px] text-app-text uppercase tracking-tighter">Sentences Grounded</div><div class="mt-1 inline-block px-1.5 py-0.5 bg-[#39ff9c]/10 border border-[#39ff9c]/20 rounded text-[8px] text-[#39ff9c] font-bold">86% GROUNDED</div></div></div>
<div class="mb-6"><div class="flex h-1 w-full rounded-full overflow-hidden bg-app-border/20 mb-2"><div class="h-full bg-[#39ff9c]" style="width: 86%"></div><div class="h-full bg-[#ffd166]" style="width: 7%"></div><div class="h-full bg-[#ff4d6d]" style="width: 7%"></div></div><p class="text-[8px] text-app-text leading-tight">86% of generated sentences have supporting source citations.</p></div>
<div class="flex flex-col gap-2 mb-4"><div class="p-2 bg-[#0A0A1E] border border-[#ffd166]/20 rounded-md"><div class="flex items-center gap-1.5 text-[7px] font-bold text-[#ffd166] uppercase mb-1"><span class="w-1 h-1 rounded-full bg-[#ffd166]"></span> SCORE 0.45 · MISSING CITATION</div><p class="text-[9px] text-white/80 italic">"Topological qubits are ready for commercial deployment."</p></div><div class="p-2 bg-[#0A0A1E] border border-[#ff4d6d]/20 rounded-md"><div class="flex items-center gap-1.5 text-[7px] font-bold text-[#ff4d6d] uppercase mb-1"><span class="w-1 h-1 rounded-full bg-[#ff4d6d]"></span> SCORE 0.12 · CONTRADICTS SOURCE</div><p class="text-[9px] text-white/80 italic">"IBM announced 1M qubits by 2030."</p></div></div>
<div class="mt-auto flex justify-end"><button class="text-[9px] text-[#39ff9c] font-bold hover:underline flex items-center gap-1">View all <i class="ph ph-arrow-right"></i></button></div>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col col-span-1"><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-chart-polar text-app-secondary"></i> ANALYSIS PREVIEW</h3><div class="flex flex-col gap-3"><div class="h-2 bg-app-border/80 rounded w-full"></div><div class="h-2 bg-app-border/80 rounded w-5/6"></div><div class="h-2 bg-app-border/80 rounded w-full"></div><div class="h-2 bg-app-border/80 rounded w-4/6"></div></div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col col-span-2"><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-scales text-app-synthesis"></i> DIFFERING PERSPECTIVES</h3><div class="flex flex-col gap-6"><div class="flex items-center justify-center gap-6 mt-2 relative"><div class="border border-app-border rounded-lg p-4 bg-[#0A0A1E] w-full flex flex-col gap-3"><div class="flex justify-between items-start"><span class="text-[9px] font-bold text-app-text uppercase tracking-widest">Position A</span><span class="text-[8px] font-mono text-app-warning">SOURCES 2</span></div><div class="h-1.5 bg-app-border rounded w-full"></div><div class="h-1.5 bg-app-border rounded w-5/6"></div><div class="mt-2 space-y-2"><div class="flex justify-between text-[9px] font-mono"><span class="text-app-text">EVIDENCE STRENGTH</span><span class="text-white">72%</span></div><div class="h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-warning animate-pulse" style="width: 72%"></div></div><div class="flex justify-between text-[9px] font-mono"><span class="text-app-text">SUPPORT</span><span class="text-app-warning">Moderate</span></div></div></div><div class="w-10 h-10 rounded-full border border-app-border bg-[#111125] flex items-center justify-center text-white text-[10px] font-bold shrink-0 z-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(120,130,180,0.2)]">VS</div><div class="border border-app-border rounded-lg p-4 bg-[#0A0A1E] w-full flex flex-col gap-3"><div class="flex justify-between items-start"><span class="text-[9px] font-bold text-app-text uppercase tracking-widest">Position B</span><span class="text-[8px] font-mono text-app-info">SOURCES 3</span></div><div class="h-1.5 bg-app-border rounded w-full"></div><div class="h-1.5 bg-app-border rounded w-4/5"></div><div class="mt-2 space-y-2"><div class="flex justify-between text-[9px] font-mono"><span class="text-app-text">EVIDENCE STRENGTH</span><span class="text-white">84%</span></div><div class="h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success animate-pulse" style="width: 84%"></div></div><div class="flex justify-between text-[9px] font-mono"><span class="text-app-text">SUPPORT</span><span class="text-app-success">Strong</span></div></div></div></div><div class="bg-app-success/5 border border-app-success/20 rounded-lg p-4"><div class="flex items-center gap-2 mb-2"><div class="w-2 h-2 rounded-full bg-app-success shadow-[0_0_8px_#00FF47]"></div><span class="text-[9px] font-bold text-app-success uppercase tracking-widest">EVIDENCE CURRENTLY FAVORS POSITION B</span></div><p class="text-[10px] text-white/80 leading-relaxed">Both positions contain valid elements, but the available evidence more strongly supports the dominant role of human activity in recent climate change.</p><button class="mt-2 text-[9px] text-app-info font-bold hover:underline flex items-center gap-1">Why does Position B lead? <i class="ph ph-arrow-right"></i></button></div><div class="p-3 bg-white/5 border border-white/5 rounded-md"><div class="flex justify-between items-center mb-1"><span class="text-[9px] text-app-text italic">Alternative Interpretation: Natural forcing remains an important explanation...</span><span class="text-[8px] font-mono text-white/40">2 sources · 58% strength</span></div></div><div class="flex flex-col gap-1.5"><div class="flex justify-between text-[8px] font-mono text-app-text uppercase tracking-widest"><span class="">Evidence Balance</span><span class="">A (46%) vs B (54%)</span></div><div class="flex h-1 w-full rounded-full overflow-hidden bg-app-border/20"><div class="h-full bg-app-warning" style="width: 46%"></div><div class="h-full bg-app-success" style="width: 54%"></div></div></div></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col col-span-1" id="evidence-strength"><h3 class="text-[10px] uppercase tracking-wider text-white mb-4">EVIDENCE STRENGTH SCALE</h3><div class="flex flex-col gap-4 mt-2"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="ph ph-shield-check text-app-success"></i><div class="flex gap-1"><div class="h-1 w-6 bg-app-success rounded-sm"></div><div class="h-1 w-6 bg-app-success rounded-sm"></div><div class="h-1 w-6 bg-app-success rounded-sm"></div></div></div><span class="text-[10px] font-mono text-[#5C687C]">90%</span></div><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="ph ph-shield-plus text-app-primary"></i><div class="flex gap-1"><div class="h-1 w-6 bg-app-primary rounded-sm"></div><div class="h-1 w-6 bg-app-primary rounded-sm"></div><div class="h-1 w-6 bg-app-border rounded-sm"></div></div></div><span class="text-[10px] font-mono text-[#5C687C]">66%</span></div><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="ph ph-shield text-app-success"></i><div class="flex gap-1"><div class="h-1 w-6 bg-app-success rounded-sm"></div><div class="h-1 w-6 bg-app-success rounded-sm"></div><div class="h-1 w-6 bg-app-border rounded-sm"></div></div></div><span class="text-[10px] font-mono text-[#5C687C]">66%</span></div><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="ph ph-shield-warning text-app-warning"></i><div class="flex gap-1"><div class="h-1 w-6 bg-app-warning rounded-sm"></div><div class="h-1 w-6 bg-app-border rounded-sm"></div><div class="h-1 w-6 bg-app-border rounded-sm"></div></div></div><span class="text-[10px] font-mono text-[#5C687C]">33%</span></div></div></div>
</div>
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col"><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-hexagon text-app-primary"></i> RESEARCH COVERAGE</h3><div class="flex flex-col gap-4"><div class="flex items-center justify-between gap-4"><div class="h-1.5 bg-app-border/50 rounded w-1/3"></div><div class="flex-1 h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success w-3/4"></div></div><div class="w-8 h-2 bg-app-border/50 rounded"></div></div><div class="flex items-center justify-between gap-4"><div class="h-1.5 bg-app-border/50 rounded w-1/2"></div><div class="flex-1 h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-primary w-1/2"></div></div><div class="w-8 h-2 bg-app-border/50 rounded"></div></div><div class="flex items-center justify-between gap-4"><div class="h-1.5 bg-app-border/50 rounded w-1/4"></div><div class="flex-1 h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success w-2/3"></div></div><div class="w-8 h-2 bg-app-border/50 rounded"></div></div><div class="flex items-center justify-between gap-4"><div class="h-1.5 bg-app-border/50 rounded w-2/3"></div><div class="flex-1 h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-primary w-1/4"></div></div><div class="w-8 h-2 bg-app-border/50 rounded"></div></div><div class="flex items-center justify-between gap-4 mt-2"><div class="h-1.5 bg-app-border/50 rounded w-1/3"></div><div class="flex-1 h-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-synthesis w-full"></div></div><span class="text-[10px] text-app-synthesis font-mono">100%</span></div></div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col" id="source-landscape"><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-chart-polar text-app-secondary"></i> SOURCE LANDSCAPE</h3><div class="grid grid-cols-2 gap-4 flex-1"><div class="flex items-center justify-center"><div class="relative w-20 h-20"><svg class="w-full h-full" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="rgba(120,130,180,0.16)" stroke-width="2"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#6C8CFF" stroke-dasharray="40 100" stroke-dashoffset="25" stroke-width="2"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#4FD1C5" stroke-dasharray="20 100" stroke-dashoffset="65" stroke-width="2"></circle><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#B48EF0" stroke-dasharray="15 100" stroke-dashoffset="80" stroke-width="2"></circle></svg></div></div><div class="flex flex-col gap-2 justify-center"><div class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-app-secondary"></div><div class="h-1.5 bg-app-border/50 rounded w-full"></div></div><div class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-app-primary"></div><div class="h-1.5 bg-app-border/50 rounded w-full"></div></div><div class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-app-synthesis"></div><div class="h-1.5 bg-app-border/50 rounded w-full"></div></div></div></div><div class="mt-4 flex items-center justify-between"><div class="w-20 h-10 opacity-20"><i class="ph ph-hexagon text-4xl"></i></div><div class="flex flex-col gap-1 w-1/2"><div class="h-1 bg-app-border/50 rounded w-full"></div><div class="h-1 bg-app-border/50 rounded w-2/3"></div></div></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col"><h3 class="text-[10px] uppercase tracking-wider text-white flex items-center gap-2 mb-4"><i class="ph ph-git-merge text-app-synthesis"></i> CONTRADICTION NETWORK</h3><div class="flex-1 flex items-center justify-center relative"><svg class="w-full h-24" viewbox="0 0 200 100"><circle cx="30" cy="40" fill="none" r="8" stroke="#6C8CFF" stroke-width="1"></circle><circle cx="30" cy="70" fill="none" r="8" stroke="#6C8CFF" stroke-width="1"></circle><circle cx="100" cy="50" fill="none" r="12" stroke="#B48EF0" stroke-width="1"></circle><circle cx="170" cy="30" fill="none" r="8" stroke="#FFAA00" stroke-width="1"></circle><circle cx="170" cy="70" fill="none" r="8" stroke="#FFAA00" stroke-width="1"></circle><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="38" x2="88" y1="40" y2="50"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="38" x2="88" y1="70" y2="50"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="112" x2="162" y1="50" y2="30"></line><line stroke="rgba(120,130,180,0.5)" stroke-dasharray="2 2" x1="112" x2="162" y1="50" y2="70"></line><text fill="#B48EF0" font-size="10" x="96" y="55">⚡</text></svg></div><button class="mt-4 w-full py-1.5 bg-[#0A0A1E] border border-app-border rounded text-[10px] text-[#5C687C] hover:text-white transition-colors">RUN ANALYSIS</button></div>
<div class="bg-[#0A0A1E]/80 backdrop-blur-md border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 col-span-1 md:col-span-4 mb-6 relative overflow-hidden h-[250px]"><div class="flex justify-between items-start mb-6"><div><h3 class="text-[10px] uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2"><span class="w-1 h-4 bg-app-info rounded-full"></span>RESEARCH TIMELINE</h3><p class="text-[9px] text-[#5C687C] mt-1">How the evidence evolved over time</p></div><div class="font-mono text-[10px] text-app-info bg-app-info/5 px-2 py-1 rounded border border-app-info/20">1750 → 2026</div></div><div class="absolute bottom-0 left-0 w-full h-[120px] pointer-events-none z-0"><svg class="w-full h-full" preserveaspectratio="none" viewbox="0 0 100 40"><path d="M0 40 Q 40 40, 70 20 T 100 5" fill="none" stroke="rgba(0, 204, 255, 0.1)" stroke-width="0.5"></path><path d="M0 40 Q 40 40, 70 20 T 100 5 L 100 40 L 0 40 Z" fill="url(#density-grad)"></path><defs><lineargradient id="density-grad" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" style="stop-color:rgba(0, 204, 255, 0)"></stop><stop offset="100%" style="stop-color:rgba(0, 204, 255, 0.05)"></stop></lineargradient></defs></svg><span class="absolute bottom-2 right-4 text-[7px] text-[#5C687C] font-mono tracking-widest opacity-50">EVIDENCE DENSITY</span></div><div class="relative mt-8 mb-4 h-full z-10 flex items-center"><div class="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2"><div class="h-full bg-gradient-to-r from-app-info/20 via-app-primary/50 to-app-success/80 w-0 animate-draw-line"></div></div><div class="relative flex justify-between items-center w-full"><div class="flex-1 flex flex-col items-center text-center group relative opacity-0 animate-fade-node" style="animation-delay: 0.5s;"><div class="w-2 h-2 rounded-full bg-[#5C687C] z-10 mb-3 border border-app-bg"></div><div class="flex flex-col items-center absolute top-5 w-32"><span class="font-mono text-[9px] text-[#5C687C] font-bold">1750</span><h4 class="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-1">Industrial Revolution</h4><p class="text-[7px] text-[#5C687C] mt-1 leading-tight">Large-scale fossil-fuel use begins.</p><span class="font-mono text-[7px] text-app-info mt-0.5">[1]</span></div></div><div class="flex-1 flex flex-col items-center text-center group relative opacity-0 animate-fade-node" style="animation-delay: 0.8s;"><div class="w-2 h-2 rounded-full bg-app-info/50 z-10 mb-3 border border-app-bg"></div><div class="flex flex-col items-center absolute top-5 w-32"><span class="font-mono text-[9px] text-app-info/70 font-bold">1850</span><h4 class="text-[8px] font-bold text-white/80 uppercase tracking-wider mt-1">Greenhouse Gas Increase</h4><p class="text-[7px] text-[#5C687C] mt-1 leading-tight">Atmospheric composition begins changing.</p><span class="font-mono text-[7px] text-app-info mt-0.5">[2]</span></div></div><div class="flex-1 flex flex-col items-center text-center group relative opacity-0 animate-fade-node" style="animation-delay: 1.1s;"><div class="w-2.5 h-2.5 rounded-full bg-app-info shadow-[0_0_8px_rgba(0,204,255,0.4)] z-10 mb-3 border border-app-bg"></div><div class="flex flex-col items-center absolute top-5 w-32"><span class="font-mono text-[9px] text-app-info font-bold">1950</span><h4 class="text-[8px] font-bold text-white uppercase tracking-wider mt-1">Observed Warming</h4><p class="text-[7px] text-[#5C687C] mt-1 leading-tight">Records show sustained warming.</p><span class="font-mono text-[7px] text-app-info mt-0.5">[1][3]</span></div></div><div class="flex-1 flex flex-col items-center text-center group relative opacity-0 animate-fade-node" style="animation-delay: 1.4s;"><div class="w-2.5 h-2.5 rounded-full bg-app-primary shadow-[0_0_8px_rgba(79,209,197,0.5)] z-10 mb-3 border border-app-bg"></div><div class="flex flex-col items-center absolute top-5 w-32"><span class="font-mono text-[9px] text-app-primary font-bold">2000</span><h4 class="text-[8px] font-bold text-white uppercase tracking-wider mt-1">Attribution Evidence</h4><p class="text-[7px] text-[#5C687C] mt-1 leading-tight">Research distinguishes anthropogenic warming.</p><span class="font-mono text-[7px] text-app-info mt-0.5">[3][4]</span></div></div><div class="flex-1 flex flex-col items-center text-center group relative opacity-0 animate-fade-node" style="animation-delay: 2s;"><div class="relative w-4 h-4 z-10 mb-2"><div class="absolute inset-0 rounded-full bg-app-success animate-pulse-halo"></div><div class="absolute inset-0 rounded-full bg-app-success border-2 border-app-bg shadow-[0_0_12px_#00FF47]"></div></div><div class="flex flex-col items-center absolute top-5 w-32"><span class="font-mono text-[10px] text-app-success font-bold">2026</span><h4 class="text-[9px] font-bold text-white uppercase tracking-wider mt-1">Current Synthesis</h4><p class="text-[8px] text-white/90 mt-1 leading-tight">Human activity dominates warming.</p><span class="font-mono text-[7px] text-app-info mt-0.5">[1][3]</span></div></div></div></div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-6 flex flex-col col-span-1 md:col-span-4 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><div class="mb-8"><h3 class="text-[10px] uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">KNOWN / UNCERTAIN / UNKNOWN</h3><p class="text-[9px] text-[#5C687C] mt-1">What the evidence supports — and where it stops.</p></div><div class="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1"><div class="flex flex-col gap-4 border-t border-app-success/30 pt-4"><div><h4 class="text-[9px] font-bold text-app-success tracking-widest uppercase flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-app-success"></span> KNOWN</h4><p class="text-[8px] text-[#5C687C] mt-0.5">Strongly supported by the available evidence.</p></div><div class="flex flex-col gap-3"><div class="group cursor-pointer"><div class="flex items-start gap-2"><i class="ph ph-check text-app-success text-[10px] mt-0.5"></i><p class="text-white text-[11px] leading-tight">Anthropogenic CO2 is the primary driver of warming <span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="openInspector()">[2][3]</span></p></div><div class="mt-1.5 flex items-center gap-2"><div class="h-0.5 flex-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success w-[94%]"></div></div><span class="text-[8px] font-mono text-app-success">94%</span></div></div><div class="group cursor-pointer"><div class="flex items-start gap-2"><i class="ph ph-check text-app-success text-[10px] mt-0.5"></i><p class="text-white text-[11px] leading-tight">Ocean heat content has increased significantly since 1970 <span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="openInspector()">[5]</span></p></div><div class="mt-1.5 flex items-center gap-2"><div class="h-0.5 flex-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-success w-[88%]"></div></div><span class="text-[8px] font-mono text-app-success">88%</span></div></div></div></div><div class="flex flex-col gap-4 border-t border-app-warning/30 pt-4"><div><h4 class="text-[9px] font-bold text-app-warning tracking-widest uppercase flex items-center gap-1.5"><span class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-app-warning"></span> UNCERTAIN</h4><p class="text-[8px] text-[#5C687C] mt-0.5">Plausible, but evidence is incomplete or mixed.</p></div><div class="flex flex-col gap-3"><div class="group cursor-pointer"><div class="flex items-start gap-2"><span class="text-app-warning text-[10px] mt-0.5">△</span><p class="text-white text-[11px] leading-tight">Regional precipitation response differences <span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="openInspector()">[8]</span></p></div><div class="mt-1.5 flex items-center gap-2"><div class="h-0.5 flex-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-warning w-[58%]"></div></div><span class="text-[8px] font-mono text-app-warning">58%</span></div></div><div class="group cursor-pointer"><div class="flex items-start gap-2"><span class="text-app-warning text-[10px] mt-0.5">△</span><p class="text-white text-[11px] leading-tight">Cloud feedback sensitivity in tropical regions <span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="openInspector()">[12]</span></p></div><div class="mt-1.5 flex items-center gap-2"><div class="h-0.5 flex-1 bg-app-border rounded-full overflow-hidden"><div class="h-full bg-app-warning w-[42%]"></div></div><span class="text-[8px] font-mono text-app-warning">42%</span></div></div></div></div><div class="flex flex-col gap-4 border-t border-[#ff4d6d]/30 pt-4"><div><h4 class="text-[9px] font-bold text-[#ff4d6d] tracking-widest uppercase flex items-center gap-1.5"><span class="text-[12px] leading-none">?</span> UNKNOWN</h4><p class="text-[8px] text-[#5C687C] mt-0.5">Not sufficiently answered by current evidence.</p></div><div class="flex flex-col gap-3"><div class="flex items-start gap-2"><span class="text-[#ff4d6d] text-[10px] mt-0.5">?</span><p class="text-white text-[11px] leading-tight">Exact tipping point for AMOC collapse</p></div><div class="flex items-start gap-2"><span class="text-[#ff4d6d] text-[10px] mt-0.5">?</span><p class="text-white text-[11px] leading-tight">Long-term impact of deep-sea mining on carbon sequestration</p></div></div></div></div><div class="mt-8 pt-4 border-t border-app-border/30 flex justify-between items-center"><span class="text-[8px] font-mono text-[#5C687C] uppercase tracking-wider">EVIDENCE STATUS: 3 well-supported · 3 uncertain · 2 unresolved</span><button class="text-[9px] text-app-info font-bold hover:underline flex items-center gap-1 transition-all duration-200">+ more <i class="ph ph-caret-down"></i></button></div></div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
<div class="bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 flex flex-col relative overflow-hidden md:col-span-7 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><div class="mb-6"><h3 class="text-base font-sora font-semibold text-white tracking-wide">WHAT WOULD CHANGE OUR MIND?</h3><p class="text-[11px] font-inter text-[#8D9BB0] mt-1">Evidence that could materially weaken or overturn the current synthesis.</p></div><div class="bg-[#111125] border border-app-border rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"><div class="flex-1"><span class="text-[9px] text-[#5C687C] uppercase tracking-wider font-semibold block mb-1">CURRENT SYNTHESIS</span><p class="text-xs text-white leading-relaxed">Recent climate change is predominantly driven by human activity, while natural factors contribute to longer-term climate variability.</p></div><div class="flex items-center gap-2 shrink-0 md:border-l md:border-app-border md:pl-4"><div class="text-right"><span class="text-[9px] text-app-primary uppercase tracking-wider font-semibold block">CURRENT CONFIDENCE</span><span class="text-lg font-mono text-app-primary font-bold">${d.conf}%</span></div></div></div><div class="flex flex-col gap-0 z-10"><div class="border-b border-app-border/50 py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">01</span><div><h4 class="text-xs font-medium text-white group-hover:text-app-primary transition-colors">Natural forcing explains recent warming</h4><p class="text-[10px] text-[#5C687C] mt-1 leading-relaxed">Evidence showing natural forcing accounts for most of the observed recent temperature increase.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Long-term solar measurements</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Volcanic forcing models</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Independent attribution studies</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[2]</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[4]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[24%]"></div></div><span class="text-[9px] font-mono text-white">24%</span></div></div></div></div></div><div class="border-b border-app-border/50 py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">02</span><div><h4 class="text-xs font-medium text-white group-hover:text-app-primary transition-colors">Independent datasets contradict the current attribution</h4><p class="text-[10px] text-[#5C687C] mt-1 leading-relaxed">Multiple high-quality datasets consistently produce a different attribution of recent warming.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Dataset comparison</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Methodological audit</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Cross-reference checks</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[1]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[15%]"></div></div><span class="text-[9px] font-mono text-white">15%</span></div></div></div></div></div><div class="py-4 group cursor-pointer" onclick="toggleCondition(this)"><div class="flex items-start md:items-center justify-between gap-4"><div class="flex items-start gap-4 flex-1"><span class="font-mono text-xs font-bold text-app-text mt-0.5 md:mt-0">03</span><div><h4 class="text-xs font-medium text-white group-hover:text-app-primary transition-colors">Source consensus changes</h4><p class="text-[10px] text-[#5C687C] mt-1 leading-relaxed">New high-trust evidence substantially shifts the balance of independent sources.</p></div></div><div class="flex items-center gap-3 shrink-0"><span class="text-[9px] text-[#5C687C] font-mono flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#5C687C]"></span> NOT OBSERVED</span><i class="ph ph-caret-down text-app-text condition-icon transition-transform"></i></div></div><div class="condition-content"><div class="pt-2 flex flex-col gap-4"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] block mb-2">Evidence Required</span><div class="flex flex-wrap gap-2"><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Peer-reviewed journals</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Official reports</span><span class="px-2 py-1 border border-app-border rounded text-[10px] text-white/80">Expert testimonies</span></div></div><div class="flex items-center justify-between"><div><span class="text-[9px] uppercase tracking-wider text-[#5C687C] mr-2">Relevant Sources</span><span class="citation-link font-mono text-[9px] font-bold px-0.5" onclick="event.stopPropagation(); openInspector()">[5]</span></div><div class="flex items-center gap-2 w-1/3"><span class="text-[9px] uppercase tracking-wider text-[#5C687C]">Challenge Strength</span><div class="h-1 bg-app-border/50 rounded flex-1 overflow-hidden"><div class="h-full bg-app-warning w-[8%]"></div></div><span class="text-[9px] font-mono text-white">8%</span></div></div></div></div></div></div><div class="mt-auto pt-6 border-t border-app-border/30"><div class="flex flex-col md:flex-row md:items-center gap-4"><div class="shrink-0"><span class="text-[9px] text-[#5C687C] uppercase tracking-wider font-semibold block mb-1">CURRENT RESILIENCE</span><span class="text-[11px] font-bold text-app-warning flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-app-warning"></span> MODERATELY ROBUST</span></div><p class="text-[10px] text-[#5C687C] leading-relaxed md:border-l md:border-app-border md:pl-4">The current conclusion is supported by multiple independent sources, but would weaken if stronger evidence materially changed the attribution of recent warming.</p></div></div></div>
<div class="bg-[#151529] border border-app-border rounded-lg p-8 flex flex-col relative overflow-hidden md:col-span-5 h-96 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><h3 class="text-[10px] uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-8 font-bold"><i class="ph ph-lightning text-app-primary text-lg"></i> RESEARCH TRAJECTORY</h3><div class="flex flex-col gap-6"><div class="flex items-center gap-4"><div class="w-6 h-6 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] font-bold shrink-0">1</div><div class="h-1.5 bg-app-border/50 rounded w-3/4"></div></div><div class="flex items-center gap-4"><div class="w-6 h-6 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] font-bold shrink-0">2</div><div class="h-1.5 bg-app-border/50 rounded w-2/3"></div></div><div class="flex items-center gap-4"><div class="w-6 h-6 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] font-bold shrink-0">3</div><div class="h-1.5 bg-app-border/50 rounded w-1/2"></div></div><div class="flex items-center gap-4"><div class="w-6 h-6 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[10px] font-bold shrink-0">4</div><div class="h-1.5 bg-app-border/50 rounded w-4/5"></div></div></div><div class="absolute bottom-4 right-4 opacity-10"><i class="ph ph-rocket-launch text-6xl text-app-primary"></i></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-8 flex flex-col md:col-span-5 h-64 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md"><h3 class="text-[10px] uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-6 font-bold"><i class="ph ph-shield-warning text-app-warning text-lg"></i> HONEST BOUNDARIES</h3><div class="flex flex-col gap-5"><div class="flex items-center gap-4"><i class="ph ph-warning-circle text-app-warning text-lg"></i><div class="h-1.5 bg-app-border/50 rounded w-3/4"></div></div><div class="flex items-center gap-4"><i class="ph ph-info text-app-warning text-lg"></i><div class="h-1.5 bg-app-border/50 rounded w-2/3"></div></div></div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-8 flex flex-col md:col-span-7 h-64 shadow-[0_0_20px_rgba(79,209,197,0.02)] backdrop-blur-md" id="confidence-breakdown"><h3 class="text-[10px] uppercase tracking-[0.2em] text-white mb-6 font-bold">CONFIDENCE BREAKDOWN</h3><div class="flex items-center justify-between gap-10 flex-1"><div class="flex flex-col gap-4 flex-1"><div class="h-1.5 bg-app-border/50 rounded w-full"></div><div class="h-1.5 bg-app-border/50 rounded w-4/5"></div><div class="h-1.5 bg-app-border/50 rounded w-3/4"></div></div><div class="relative w-32 h-32 flex items-center justify-center shrink-0"><svg class="w-full h-full -rotate-90" viewbox="0 0 36 36"><circle cx="18" cy="18" fill="transparent" r="15.9" stroke="rgba(120,130,180,0.16)" stroke-width="1.5"></circle><circle class="drop-shadow-[0_0_4px_rgba(79,209,197,0.4)]" cx="18" cy="18" fill="transparent" r="15.9" stroke="#4FD1C5" stroke-dasharray="${d.conf}, 100" stroke-width="1.5"></circle></svg><div class="absolute inset-0 flex items-center justify-center"><span class="text-2xl font-bold text-white font-mono">${d.conf}%</span></div></div></div></div>
</div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
<div class="bg-[#151529] border border-app-border rounded-lg p-5 flex flex-col md:col-span-2 h-64"><h3 class="text-[10px] uppercase tracking-wider text-white mb-4 font-semibold">TOOLS</h3><div class="grid grid-cols-2 gap-2 flex-1"><div class="flex flex-col items-center justify-center gap-2 p-2 border border-app-synthesis/20 bg-app-synthesis/5 rounded-md"><i class="ph ph-shield text-app-synthesis text-lg"></i><div class="h-1 w-full bg-app-border rounded"></div><i class="ph ph-caret-down text-[8px] text-app-synthesis"></i></div><div class="flex flex-col items-center justify-center gap-2 p-2 border border-app-secondary/20 bg-app-secondary/5 rounded-md"><i class="ph ph-chart-polar text-app-secondary text-lg"></i><div class="h-1 w-full bg-app-border rounded"></div><i class="ph ph-caret-down text-[8px] text-app-secondary"></i></div><div class="flex flex-col items-center justify-center gap-2 p-2 border border-app-success/20 bg-app-success/5 rounded-md"><i class="ph ph-share-network text-app-success text-lg"></i><div class="h-1 w-full bg-app-border rounded"></div><i class="ph ph-caret-down text-[8px] text-app-success"></i></div><div class="flex flex-col items-center justify-center gap-2 p-2 border border-app-warning/20 bg-app-warning/5 rounded-md"><i class="ph ph-download-simple text-app-warning text-lg"></i><div class="h-1 w-full bg-app-border rounded"></div><i class="ph ph-caret-down text-[8px] text-app-warning"></i></div></div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col md:col-span-4 h-64"><h3 class="text-[10px] uppercase tracking-wider text-white mb-4 font-semibold">RUN TELEMETRY</h3><div class="flex gap-4 flex-1"><div class="flex-1 relative"><svg class="w-full h-full" preserveaspectratio="none" viewbox="0 0 100 40"><path d="M0 35 L10 32 L20 38 L30 30 L40 34 L50 25 L60 30 L70 15 L80 25 L90 10" fill="none" stroke="#B48EF0" stroke-width="0.5"></path><path d="M0 35 L10 32 L20 38 L30 30 L40 34 L50 25 L60 30 L70 15 L80 25 L90 10 L90 40 L0 40 Z" fill="url(#telemetry-grad)"></path><defs><lineargradient id="telemetry-grad" x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" style="stop-color:#B48EF0;stop-opacity:0.1"></stop><stop offset="100%" style="stop-color:#B48EF0;stop-opacity:0"></stop></lineargradient></defs></svg></div><div class="w-1/3 flex flex-col gap-2 justify-center"><div class="h-1 bg-app-border/50 rounded w-full"></div><div class="h-1 bg-app-border/50 rounded w-3/4"></div><div class="h-1 bg-app-border/50 rounded w-full"></div><div class="h-1 bg-app-border/50 rounded w-1/2"></div></div></div></div>
<div class="bg-[#121226] border border-app-border rounded-lg p-5 flex flex-col md:col-span-3 h-64"><h3 class="text-[10px] uppercase tracking-wider text-white mb-4 font-semibold">SOURCE CONSTELLATION</h3><div class="flex gap-4 flex-1"><div class="flex flex-col gap-2 w-1/2"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[6px]">1</div><div class="h-1 bg-app-border/50 rounded w-full"></div></div><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[6px]">2</div><div class="h-1 bg-app-border/50 rounded w-3/4"></div></div><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[6px]">3</div><div class="h-1 bg-app-border/50 rounded w-full"></div></div><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border border-app-secondary text-app-secondary flex items-center justify-center text-[6px]">4</div><div class="h-1 bg-app-border/50 rounded w-1/2"></div></div></div><div class="flex-1 flex items-center justify-center opacity-20"><svg class="w-16 h-16 text-app-secondary fill-transparent stroke-current stroke-[0.5]" viewbox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke-dasharray="2 2"></circle><ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(45 50 50)"></ellipse><ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(-45 50 50)"></ellipse><circle cx="50" cy="50" r="2"></circle></svg></div></div></div>
<div class="bg-[#111125] border border-app-border rounded-lg p-5 flex flex-col md:col-span-3 h-64"><h3 class="text-[10px] uppercase tracking-wider text-white mb-4 font-semibold">RESEARCH PROVENANCE</h3><div class="flex flex-col gap-3 justify-center flex-1"><div class="h-1.5 bg-app-border/50 rounded w-3/4"></div><div class="h-1.5 bg-app-border/50 rounded w-1/2"></div><div class="h-1.5 bg-app-border/50 rounded w-2/3"></div><div class="h-1.5 bg-app-border/50 rounded w-1/4"></div></div></div>
</div>
<div class="pb-12"></div>
</div>
</main>
<div class="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-40 hidden transition-opacity opacity-0" id="inspector-backdrop" onclick="closeInspector()"></div>
<div class="fixed top-0 right-0 h-full w-[420px] bg-[rgba(7,12,25,0.96)] backdrop-blur-xl border-l border-white/10 rounded-l-2xl z-50 drawer-closed transition-transform duration-300 shadow-2xl flex flex-col overflow-hidden" id="citation-inspector">
<div class="flex items-center justify-between p-6 border-b border-white/5 shrink-0"><div><h2 class="text-xs font-bold tracking-[0.2em] text-app-text uppercase flex items-center gap-2"><i class="ph ph-magnifying-glass text-app-primary text-sm"></i> Citation Inspector</h2><p class="text-[9px] text-[#5C687C] mt-1 font-mono">ID: x7f-992a · Analyzing Claim</p></div><button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-[#5C687C] hover:text-white transition-colors" onclick="closeInspector()"><i class="ph ph-x"></i></button></div>
<div class="flex-1 overflow-y-auto p-6 flex flex-col gap-8 fade-in-content"><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold flex items-center justify-between"><span class="">Target Claim</span><span class="px-1.5 py-0.5 rounded text-[8px] font-bold border border-app-success text-app-success bg-app-success/10 flex items-center gap-1"><i class="ph ph-check"></i> SUPPORTED</span></div><p class="text-white text-sm leading-relaxed font-medium">"Human activity is the primary driver of recent climate change" <span class="font-mono text-app-primary text-xs ml-1 bg-app-primary/10 px-1 rounded">[3]</span></p></div><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Primary Source</div><div class="bg-app-surface/50 border border-white/5 rounded-lg p-4 flex flex-col gap-3"><div class="flex items-start justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/50"><i class="ph ph-globe text-lg"></i></div><div><h4 class="text-white text-xs font-semibold">US Environmental Protection Agency</h4><p class="text-[10px] text-app-text mt-0.5">epa.gov/climatechange</p></div></div><div class="flex items-center gap-1.5 bg-app-success/10 px-2 py-1 rounded border border-app-success/20"><div class="w-1.5 h-1.5 rounded-full bg-app-success animate-pulse"></div><span class="text-app-success font-mono text-[10px] font-bold">0.96</span></div></div></div></div><div class="flex flex-col gap-3"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Matched Evidence</div><div class="bg-[#00FF47]/5 border-l-2 border-app-success rounded-r-lg p-4 relative"><i class="ph ph-quotes absolute top-2 right-2 text-3xl text-app-success/10"></i><p class="text-white/90 text-xs leading-relaxed italic relative z-10">"Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1°C above 1850-1900 in 2011-2020."</p></div><p class="text-[10px] text-app-text leading-relaxed bg-app-surface/30 p-3 rounded border border-white/5"><span class="text-white font-medium">Synthesis:</span> The source explicitly confirms human activities (greenhouse gas emissions) as the "unequivocal" cause of recent warming, directly supporting the claim.</p></div><div class="flex flex-col gap-4 bg-[#0A0A1E]/50 rounded-lg p-4 border border-white/5"><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Semantic Match</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-info w-[94%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">94%</span></div><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Source Trust</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-primary w-[96%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">0.96</span></div><div class="flex items-center justify-between gap-4"><span class="text-[10px] text-[#5C687C] uppercase tracking-wider w-24">Grounding</span><div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div class="h-full bg-app-success w-[91%]"></div></div><span class="text-[10px] font-mono text-white w-8 text-right">91%</span></div></div><div class="flex flex-col gap-2"><div class="text-[10px] uppercase tracking-widest text-[#5C687C] font-semibold">Overall Assessment</div><div class="flex items-center gap-2 text-app-success text-xs font-bold"><i class="ph ph-shield-check text-lg"></i> STRONG SUPPORT</div><p class="text-[10px] text-app-text">High confidence semantic match from a Tier 1 authoritative source.</p></div></div>
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
      fontFamily: { sans: ["Inter", "sans-serif"], mono: ["JetBrains Mono", "monospace"], sora: ["Sora", "sans-serif"] },
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
.condition-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out, opacity 0.3s ease-out, margin 0.3s ease-out; opacity: 0; }
.condition-expanded .condition-content { max-height: 400px; opacity: 1; margin-top: 1rem; }
.condition-expanded .condition-icon { transform: rotate(180deg); }
`;

let assetsInjected = false;
function injectAssets() {
  if (assetsInjected || typeof document === "undefined") return;
  assetsInjected = true;
  const head = document.head;
  // fonts + phosphor icons
  const links = [
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap",
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

/* ---------- component ---------- */
export default function PolynousReport(props) {
  const ref = useRef(null);
  const data = deriveReport(props);
  const html = buildHtml(data);

  useEffect(() => { injectAssets(); installHandlers(); }, []);
  useEffect(() => { const t = setTimeout(() => runCounters(ref.current), 60); return () => clearTimeout(t); }, [html]);

  return (
    <div
      ref={ref}
      className="pn-html-root"
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0A0A1E", color: "#8D9BB0", fontFamily: "'Inter', sans-serif" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
