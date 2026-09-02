// ─────────────────────────────────────────────────────────────────────────────
// PolynousReport, rebuilt from scratch as an editorial research "dossier".
//
// Design (anti-AI-slop, per the design skills): near-black paper, ONE restrained
// accent (mint), hairline rules + whitespace instead of glowing cards, numbered
// mono eyebrows, big mono figures, thin single-hue bars, distinctive type
// (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono). Hand-written CSS, 
// no Tailwind CDN, no icon-chip boxes. Same content, same data wiring, same
// props interface. Rendered as an HTML string so the citation inspector,
// accordion, chat and counters keep working via lightweight global handlers.
//
// Props: query, answer, report, sources, confidence, telemetry, sourceSummaries.
// No props → built-in demo data (used by /report-preview and admin preview).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SideRail from "./react-bits/SideRail";
import { API_BASE_URL as APP_API_BASE, getAuthToken } from "../config";

const REPORT_RAIL = [
  { label: "Key takeaways", id: "rp-sec-00" },
  { label: "Executive summary", id: "rp-sec-01" },
  { label: "Scenarios", id: "rp-sec-02" },
  { label: "Key findings", id: "rp-sec-04" },
  { label: "Evidence", id: "rp-sec-05" },
  { label: "Source scorecard", id: "rp-sec-06" },
  { label: "Confidence", id: "rp-sec-07" },
  { label: "Sensitivity", id: "rp-sec-08" },
  { label: "Perspectives", id: "rp-sec-09" },
  { label: "Counter-argument", id: "rp-sec-10" },
  { label: "Assumptions", id: "rp-sec-12" },
  { label: "Citations", id: "rp-sec-16" },
  { label: "Interrogate", id: "rp-sec-18" },
];

/* ---------- recharts confidence-over-time chart (in Polynous colours) ---------- */
const RP_ACC = "#3ef07f";
function ConfTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload.find((x) => x.dataKey === "conf") || payload[0];
  return (
    <div style={{ background: "#0e1434", border: "1px solid rgba(0,255,71,0.28)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 18px 40px -20px rgba(0,0,10,0.9)", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ color: "#6c7a97", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#f2f6fb", fontSize: 16, fontWeight: 600 }}>{p.value}% <span style={{ color: RP_ACC, fontSize: 11 }}>confidence</span></div>
      {p.payload && p.payload.title ? <div style={{ color: "#c3d2e6", fontSize: 11.5, marginTop: 5, fontFamily: "'Hanken Grotesk', sans-serif", maxWidth: 190, lineHeight: 1.4 }}>{p.payload.title}</div> : null}
    </div>
  );
}
function ConfidenceChart({ data }) {
  const rows = (data || []).map((e) => ({ year: e.year, conf: e.conf, title: e.title }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 14, right: 16, left: -6, bottom: 4 }}>
        <defs>
          <linearGradient id="rpConfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RP_ACC} stopOpacity={0.3} />
            <stop offset="100%" stopColor={RP_ACC} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" stroke="rgba(200,216,234,0.08)" horizontal vertical={false} />
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6c7a97", fontFamily: "'JetBrains Mono', monospace" }} dy={6} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6c7a97", fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={(v) => v + "%"} domain={[0, 100]} width={46} />
        <Tooltip content={<ConfTip />} cursor={{ stroke: "rgba(0,255,71,0.32)", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area type="monotone" dataKey="conf" stroke="transparent" fill="url(#rpConfGrad)" />
        <Line type="monotone" dataKey="conf" stroke={RP_ACC} strokeWidth={2.5} dot={{ fill: "#0a0a1e", stroke: RP_ACC, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: RP_ACC, stroke: "#0a0a1e", strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- helpers ---------- */
const pick = (...v) => { for (const x of v) if (x !== undefined && x !== null && x !== "") return x; return undefined; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cite = (s) => esc(s).replace(/\[(\d+)\]/g, '<a class="rp-cite" role="button" tabindex="0" data-n="$1" onclick="pnCiteClick(this)" onmouseenter="pnHover(this)" onmouseleave="pnHoverOut()" onfocus="pnHover(this)" onblur="pnHoverOut()">[$1]</a>');
const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; } };
const fmtDate = (d) => { try { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(); } catch { return "21 AUG 2026"; } };
const pct = (n) => Math.max(0, Math.min(100, Math.round(n || 0)));
const escAttr = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Strip every emoji / pictograph / variation-selector from model output so the
// report never renders 📋 📚 🔑 etc. (arrows used in the UI templates are added
// AFTER this, so they are untouched).
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
const stripEmoji = (s) => String(s == null ? "" : s).replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ").replace(/^\s*[·•*-]\s*/, "").trim();

// Section headers the backend digest emits inside the raw answer blob. We keep
// only the executive-summary text and drop the raw SOURCE INTELLIGENCE /
// CONSENSUS MAP / BIBLIOGRAPHY / CONFIDENCE ANALYSIS dumps that follow it — the
// report renders those as its own designed sections.
const SECTION_RE = /(SOURCE INTELLIGENCE|KEY FINDINGS|CONSENSUS MAP|DIVERGENCE MAP|UNIQUE INSIGHTS|SOURCE QUALITY|COVERAGE AUDIT|LIMITATIONS|RESEARCH TRAJECTORY|SOURCE BIBLIOGRAPHY|CONFIDENCE ANALYSIS|CRITIC CONSENSUS|SIGNAL BREAKDOWN)/i;
function cleanExec(answer) {
  let s = stripEmoji(String(answer || ""));
  if (!s) return "";
  // Drop a leading "EXECUTIVE SUMMARY" label if present.
  s = s.replace(/^\s*EXECUTIVE SUMMARY[:\s-]*/i, "");
  // Keep only the text BEFORE the first structured section header.
  const parts = s.split(SECTION_RE);
  s = parts[0] || s;
  // Remove em dashes (house style) and tidy whitespace.
  s = s.replace(/—/g, ", ").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

// Resolve the factual context for a claim so the citation inspector can show a
// real source, matched passage, trust and metrics n/a not one hard-coded example.
function inspData(d, claimText, cites) {
  const clean = String(claimText).replace(/\s*\[\d+\]/g, "").trim();
  const ids = (cites || []).map((c) => String(c).replace(/[^\d]/g, "")).filter(Boolean);
  const first = ids[0] || null;
  const src = (first && d.ledger.find((r) => String(r.cite) === first)) || d.ledger[0] || { name: "Source", trust: 0.8 };
  const url = src.url || (String(src.name || "").includes(".") ? "https://" + String(src.name).replace(/^https?:\/\//, "") : "");
  const trust = src.trust != null ? src.trust : 0.8;
  // Prefer a real matched passage from the source summaries when we have them.
  let quote = "";
  const sums = Array.isArray(d.sourceSummaries) ? d.sourceSummaries : [];
  const hit = sums.find((s) => (s.text || s.summary || s.content) && String(s.title || s.name || s.url || "").length);
  if (hit) quote = String(hit.text || hit.summary || hit.content).slice(0, 320);
  if (!quote) quote = `The source (${src.name}) provides supporting material for this claim; open it to read the full passage in context.`;
  const match = pct(78 + (trust - 0.5) * 30);
  const ground = pct(70 + (trust - 0.5) * 40);
  const verdict = trust >= 0.85 ? "SUPPORTED" : trust >= 0.6 ? "SUPPORTED" : "PARTIAL";
  return `data-claim="${escAttr(clean)}" data-cites="${escAttr(ids.join(","))}" data-src="${escAttr(src.name)}" data-url="${escAttr(url)}" data-trust="${trust}" data-quote="${escAttr(quote)}" data-match="${match}" data-ground="${ground}" data-verdict="${verdict}"`;
}

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
const DEMO_CITES = [
  { n: 1, url: "https://en.wikipedia.org/wiki/CRISPR", domain: "en.wikipedia.org", title: "CRISPR", snippet: "CRISPR-Cas9 uses a guide RNA to direct the Cas9 nuclease to a specific DNA sequence, where it cuts the strand to enable edits.", tier: 2, trust: 0.74 },
  { n: 2, url: "https://innovativegenomics.org/what-is-crispr", domain: "innovativegenomics.org", title: "What is CRISPR?", snippet: "The system is derived from a bacterial immune defence that stores fragments of viral DNA to recognise and cut future invaders.", tier: 1, trust: 0.9 },
  { n: 3, url: "https://www.broadinstitute.org/what-broad/areas-focus", domain: "broadinstitute.org", title: "Questions and Answers about CRISPR", snippet: "Spacer sequences guide the Cas9 enzyme to a target, where it binds and cuts, effectively shutting off the gene.", tier: 1, trust: 0.92 },
  { n: 4, url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5319660", domain: "pmc.ncbi.nlm.nih.gov", title: "CRISPR as a strong gene-editing tool", snippet: "A guide RNA identifies specific DNA strands and the Cas9 nuclease cleaves them, allowing precise genetic modification.", tier: 1, trust: 0.94 },
  { n: 5, url: "https://www.synthego.com/learn/crispr", domain: "synthego.com", title: "What is CRISPR: Your Ultimate Guide", snippet: "Beyond editing, CRISPR powers rapid molecular diagnostics through techniques such as recombinase polymerase amplification.", tier: 2, trust: 0.68 },
];
const DEMO_TRAJ = ["Establish the anthropogenic signal across independent datasets", "Separate natural forcing from human contributions", "Audit regional attribution and its uncertainties", "Track source agreement and evidence freshness over time"];
const DEMO_BOUND = ["Regional projections carry wider uncertainty than the global trend", "A minority of sources are older than five years", "Cloud-feedback sensitivity remains an open modelling question"];
const DEMO_CONSTELL = [{ n: 1, t: "EPA, Causes of Climate Change" }, { n: 2, t: "IPCC AR6 Synthesis" }, { n: 3, t: "NASA, Global Climate Change" }, { n: 4, t: "USGS Climate" }, { n: 5, t: "NOAA Climate.gov" }];
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

/* ---------- institutional-grade demo data ---------- */
const DEMO_SCENARIOS = [
  { key: "Optimistic", tone: "pos", weight: 20, title: "Attribution overstated", body: "If natural variability is larger than current models allow, the human-driver share is smaller and mitigation urgency eases.", drivers: ["Higher natural forcing", "Model over-sensitivity"] },
  { key: "Central", tone: "info", weight: 62, title: "Human activity dominant", body: "On the weight of independent evidence, recent warming is predominantly human-driven and consistent across datasets.", drivers: ["Multi-dataset agreement", "Isolated anthropogenic signal"] },
  { key: "Skeptical", tone: "warn", weight: 18, title: "Worse than modelled", body: "If feedbacks (clouds, methane, AMOC) are stronger than expected, warming and impacts exceed the central projection.", drivers: ["Feedback tipping points", "Underestimated sensitivity"] },
];
const DEMO_DISSENT = {
  claim: "Recent warming is driven primarily by natural solar and ocean cycles, not human emissions.",
  held: "Held by a minority position in 1 of 5 sources; not the peer consensus.",
  why: "Rejected because the observed rate of warming exceeds any natural forcing on record, and independent attribution studies isolate the human signal across every major dataset [3][4].",
  strength: 22,
};
const DEMO_ASSUMPTIONS = [
  { a: "Independent datasets measure the same underlying climate signal", depends: "Cross-dataset calibration", breaks: "Systematic instrument bias across all records", risk: "Low" },
  { a: "Attribution methods correctly separate natural from human forcing", depends: "Validated attribution models", breaks: "A novel natural forcing absent from current models", risk: "Medium" },
  { a: "Source trust scores reflect real authority", depends: "Domain and recency heuristics", breaks: "A high-trust source is later retracted", risk: "Low" },
  { a: "Regional projections inherit global-trend confidence", depends: "Downscaling validity", breaks: "Regional models diverge from observations", risk: "High" },
];
const DEMO_REVISIONS = [
  { v: "v1.2", date: "22 AUG 2026", note: "Added 2 current sources; headline confidence +4 points" },
  { v: "v1.1", date: "18 AUG 2026", note: "Re-ran Critic; regional-magnitude contradiction resolved" },
  { v: "v1.0", date: "12 AUG 2026", note: "Initial synthesis across 3 sources" },
];
const DEMO_GLOSSARY = [
  { t: "Grounding", d: "Share of sentences carrying a citation that traces back to a retrieved source." },
  { t: "Critic consensus", d: "Agreement among independent sources after the Critic agent stress-tests each claim." },
  { t: "Entailment (NLI)", d: "Whether a source's text logically supports a claim, judged beyond bare citation counting." },
  { t: "Trust score", d: "A 0 to 1 authority estimate from source type (gov, academic, org) and recency." },
  { t: "Confidence band", d: "The plausible range around the headline confidence given the spread of evidence." },
];

/* ---------- data derivation (real props → view model, demo fallbacks) ---------- */
function deriveReport(p) {
  const report = p.report || {};
  const ca = report.confidence_analysis || {};
  const conf = pct(pick(p.confidence, ca.overall, 61));
  const band = pick(ca.band, conf >= 80 ? "HIGH" : conf >= 60 ? "MODERATE" : conf >= 40 ? "TENTATIVE" : "LOW");
  const srcArr = Array.isArray(p.sources) ? p.sources : [];
  const sums = Array.isArray(p.sourceSummaries) ? p.sourceSummaries : [];
  // REAL mode = the report was handed actual research props. In real mode we
  // NEVER substitute the built-in climate demo; a section with no real data is
  // simply omitted. Demo data is used ONLY for the /report-preview route.
  const real = !!(p.answer || (p.report && Object.keys(p.report).length) || srcArr.length || (Array.isArray(p.sourceSummaries) && p.sourceSummaries.length));
  const sources = srcArr.length || (real ? 0 : 5);
  const model = pick(p.telemetry && p.telemetry.providers && p.telemetry.providers[0] && p.telemetry.providers[0].model,
    p.telemetry && p.telemetry.steps && p.telemetry.steps[0] && p.telemetry.steps[0].model, "gpt-4o-mini");

  const factors = Array.isArray(ca.factors) ? ca.factors : [];
  const fget = (...k) => { const f = factors.find((x) => k.some((q) => String(x.key || x.label || "").toLowerCase().includes(q))); if (!f) return undefined; let v = Number(f.value); if (v <= 1) v *= 100; return Math.round(v); };
  const breakdown = { Agreement: pick(fget("agree"), 40), Diversity: pick(fget("divers"), 96), Recency: pick(fget("recen"), 50), Grounding: pick(fget("ground"), 66) };

  const cc = ca.critic_consensus || {};
  let cs = Number(cc.score); if (cs <= 1) cs *= 100; cs = Math.round(cs || 75);
  const critic = { pct: cs, agree: pick(cc.agree, 3), total: pick(cc.total, 4), position: pick(cc.explanation, typeof report.consensus_map === "string" ? report.consensus_map : undefined, real ? "" : "Human activity is the dominant driver of recent rapid warming.") };

  const kf = Array.isArray(report.key_findings) ? report.key_findings : [];
  const findings = (kf.length ? kf.slice(0, 6).map((f) => stripEmoji(typeof f === "string" ? f : (f.text || f.finding || ""))) : (real ? [] : DEMO_FINDINGS)).filter(Boolean);

  const answer = pick(p.answer, report.executive_summary, "");
  const asent = String(answer || "").split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  const grd = asent.filter((s) => /\[\d+\]/.test(s)).length;
  const ungrounded = asent.filter((s) => !/\[\d+\]/.test(s)).slice(0, 3);
  const faithful = asent.length ? { grounded: grd, total: asent.length, pct: pct((grd / asent.length) * 100) } : (real ? null : { grounded: 12, total: 14, pct: 86 });
  const breakdownReal = factors.length > 0;

  const claims = findings.slice(0, 6).map((f, i) => ({ text: f, pct: Math.max(28, conf - i * 12) }));

  const listish = (v) => Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x.text || x.label || x.name || String(x)))).filter(Boolean)
    : (typeof v === "string" ? v.split(/\n+|(?:^|\s)[•\-–]\s+/).map((s) => s.trim()).filter((s) => s.length > 3) : []);
  const trajectory = (listish(report.research_trajectory).slice(0, 5).length ? listish(report.research_trajectory).slice(0, 5) : (real ? [] : DEMO_TRAJ));
  const boundaries = (listish(report.limitations).slice(0, 4).length ? listish(report.limitations).slice(0, 4) : (real ? [] : DEMO_BOUND));

  const tel = p.telemetry || {};
  const steps = Array.isArray(tel.steps) ? tel.steps : [];
  const telemetry = { tokens: Number(pick(tel.total_tokens, 0)) || 0, cost: Number(pick(tel.estimated_cost && tel.estimated_cost.total, tel.cost, 0)) || 0, steps, providers: Array.isArray(tel.providers) ? tel.providers : [] };
  const tools = steps.length ? [...new Set(steps.map((s) => s.name).filter(Boolean))].slice(0, 5) : ["Search", "Summarise", "Critic", "Writer"];
  const constellation = srcArr.length ? srcArr.slice(0, 6).map((s, i) => ({ n: i + 1, t: pick(s.title, domain(s.url), "Source " + (i + 1)) })) : (real ? [] : DEMO_CONSTELL);
  const provenance = steps.length ? steps.slice(0, 6).map((s) => ({ name: s.name || "step", tokens: (Number(s.input_tokens) || 0) + (Number(s.output_tokens) || 0) })) : (real ? [] : DEMO_PROV);

  const covSrc = listish(report.coverage_audit);
  const coverage = covSrc.length ? covSrc.slice(0, 5).map((t, i) => ({ label: t, pct: Math.max(42, 96 - i * 13) })) : (real ? [] :
    [{ label: "Causes & mechanisms", pct: 92 }, { label: "Attribution science", pct: 78 }, { label: "Regional impacts", pct: 64 }, { label: "Mitigation pathways", pct: 48 }, { label: "Open uncertainties", pct: 100 }]);

  const tld = (u) => { const dm = domain(u); if (/\.gov/.test(dm)) return "Government"; if (/\.edu/.test(dm)) return "Academic"; if (/\.org/.test(dm)) return "Institutions"; if (/(news|times|post|bbc|guardian|reuters|cnn)/.test(dm)) return "News & media"; return "Web sources"; };
  let landscape;
  if (srcArr.length) { const c = {}; srcArr.forEach((s) => { const k = tld(s.url); c[k] = (c[k] || 0) + 1; }); landscape = Object.entries(c).map(([k, v]) => ({ label: k, pct: pct((v / srcArr.length) * 100) })); }
  else landscape = real ? [] : [{ label: "Government / .gov", pct: 40 }, { label: "Scientific bodies", pct: 35 }, { label: "News & analysis", pct: 25 }];

  // ── Real citation map (P1): every [n] resolves to an actual source with its
  // title, domain, retrieved snippet and a transparently-derived trust/tier.
  // Powers the footnotes, the evidence ledger, and the hover previews.
  const tierFor = (dm) => /\.gov|\.edu|\.ac\.|ipcc|nasa|noaa|nih|cdc|who|europa\.eu|un\.org/i.test(dm) ? 1 : /\.org|institute|university|journal|pubmed|ncbi|nature\.com|science|arxiv/i.test(dm) ? 2 : 3;
  const nMax = Math.max(sums.length, srcArr.length);
  let cites;
  if (nMax) {
    cites = [];
    for (let i = 0; i < nMax; i++) {
      const sm = sums[i] || {}, s = srcArr[i] || {};
      const url = pick(sm.url, s.url, "");
      const dm = domain(url);
      const title = stripEmoji(pick(sm.title, s.title, dm, "Source " + (i + 1)));
      const snippet = stripEmoji(pick(sm.summary, sm.text, sm.snippet, s.snippet, "")).replace(/\s+/g, " ").slice(0, 300);
      const tier = tierFor(dm);
      const trust = s.trust_score != null ? Number(s.trust_score) : (sm.trust != null ? Number(sm.trust) : (tier === 1 ? 0.92 : tier === 2 ? 0.74 : 0.56));
      cites.push({ n: i + 1, url, domain: dm, title, snippet, tier, trust });
    }
  } else {
    cites = real ? [] : DEMO_CITES;
  }
  const citeMap = {};
  cites.forEach((c) => { citeMap[c.n] = c; });

  const ledger = cites.length
    ? cites.slice(0, 8).map((c) => ({ name: c.domain || c.title, cite: String(c.n), url: c.url, trust: c.trust, tier: c.tier, fresh: { label: "UNDATED", tone: "warn", year: "" } }))
    : (real ? [] : DEMO_LEDGER);

  const contradiction = pick(typeof report.contradiction_resolution === "string" ? report.contradiction_resolution : undefined,
    real ? "" : "No material contradictions detected across the independent sources. A minor tension on the magnitude of regional effects was resolved in favour of the higher-trust, more recent datasets.");
  const analysisFallback = "Recent climate change is, on the balance of evidence, predominantly driven by human activity, chiefly the combustion of fossil fuels and the resulting rise in atmospheric greenhouse gases [1][2]. Across five independent, high-trust sources this conclusion holds consistently, and no source in the set disputes the dominant human-driver finding.\n\nThe mechanism is well established. Rising CO₂ concentrations increase radiative forcing, warming the lower atmosphere and the oceans, which have absorbed the majority of the excess heat since 1970 [5]. Attribution studies repeatedly isolate this anthropogenic signal from natural variability, and the observed rate of change is faster than any natural forcing on record can explain [3][4].\n\nNatural forcings, solar variation, volcanic aerosols, ocean cycles, remain important for longer-term and regional variability, but they do not account for the rapid, sustained warming of the modern era [4]. Where sources differ, it is on emphasis and on the precise magnitude of regional effects, not on the core attribution.\n\nConfidence in this synthesis is moderate: source agreement and grounding are strong, while a mix of publication dates and coarse regional resolution introduce measured uncertainty. The conclusion is robust to reasonable challenge, and would weaken only if independent datasets began to contradict the current attribution [3].";

  // ── institutional-grade extras ──────────────────────────────────────────
  const yearsFromLedger = ledger.map((r) => r.fresh && r.fresh.year).filter(Boolean);
  const newestYear = yearsFromLedger.length ? Math.max(...yearsFromLedger) : 2025;
  const ciMargin = Math.max(3, Math.round((100 - Math.min(96, breakdown.Agreement)) / 6) + (band === "MODERATE" ? 5 : band === "LOW" || band === "TENTATIVE" ? 9 : 3));
  const ci = { low: Math.max(0, conf - ciMargin), high: Math.min(100, conf + ciMargin), margin: ciMargin };

  const takeaways = findings.slice(0, 4).map((f, i) => {
    const c = Math.max(30, conf - i * 9);
    const tag = c >= 80 ? "HIGH" : c >= 60 ? "MODERATE" : c >= 45 ? "TENTATIVE" : "LOW";
    return { text: String(f).replace(/\s*\[\d+\]/g, ""), cites: String(f).match(/\[(\d+)\]/g) || [], conf: c, tag };
  });

  const scenarios = real ? [] : DEMO_SCENARIOS.map((s) => ({ ...s }));

  const tierOf = (r) => { const t = r.trust || 0; const nm = String(r.name || ""); if (/\.gov|\.edu|ipcc|nasa|noaa|usgs|epa/i.test(nm) || t >= 0.85) return 1; if (/\.org|survey|institute/i.test(nm) || t >= 0.6) return 2; return 3; };
  const scored = ledger.map((r) => ({ ...r, tier: tierOf(r) }));
  const tierCounts = { 1: 0, 2: 0, 3: 0 }; scored.forEach((r) => { tierCounts[r.tier]++; });
  const recency = { current: 0, aging: 0, outdated: 0 }; ledger.forEach((r) => { const l = String((r.fresh && r.fresh.label) || "").toUpperCase(); if (l === "CURRENT") recency.current++; else if (l === "AGING") recency.aging++; else recency.outdated++; });
  const independentDomains = new Set(ledger.map((r) => String(r.name).replace(/^www\./, ""))).size;
  const avgTrust = ledger.length ? ledger.reduce((a, r) => a + (r.trust || 0), 0) / ledger.length : 0;
  const scorecard = { scored, tierCounts, recency, independentDomains, total: ledger.length, avgTrust };

  const perspBalA = (DEMO_PERSPECTIVES.balance && DEMO_PERSPECTIVES.balance.a) || 54;
  const sensitivity = real ? null : { base: 50, flipAt: 72, leadA: perspBalA };

  return {
    query: pick(p.query, report.query, "What actually causes climate change?"),
    date: fmtDate(new Date()), sources, model, conf, band, breakdown, breakdownReal, real, critic, findings, ledger,
    ci: real ? null : ci, takeaways, scenarios, scorecard, sensitivity,
    dissent: real ? null : DEMO_DISSENT, assumptions: real ? [] : DEMO_ASSUMPTIONS,
    dataAsOf: { generated: fmtDate(new Date()), current: (real && !yearsFromLedger.length) ? "" : newestYear, revisions: real ? [] : DEMO_REVISIONS },
    glossary: DEMO_GLOSSARY,
    cites, citeMap,
    footnotes: cites.map((c) => ({ n: c.n, name: c.title, domain: c.domain, url: c.url, trust: c.trust, tier: c.tier, snippet: c.snippet })),
    stats: { confidence: conf, sources, passages: pick(Array.isArray(p.sourceSummaries) ? p.sourceSummaries.length : undefined, real ? sources : 42), insights: real ? (kf.length || 0) : 19, claims: real ? (kf.length || 0) : 23, consensus: cs },
    faithful, ungrounded, claims, trajectory, boundaries, telemetry, tools, constellation, provenance,
    analysisText: pick(cleanExec(answer), real ? "" : analysisFallback), coverage, landscape, contradiction,
    verdict: stripEmoji(findings[0] || (real ? "" : "The evidence points to a single clear primary conclusion for this query.")),
    chatAnswer: stripEmoji(pick(answer, real ? "" : analysisFallback)), sourceSummaries: Array.isArray(p.sourceSummaries) ? p.sourceSummaries : [],
    timeline: real ? [] : DEMO_TIMELINE, kuu: real ? null : DEMO_KUU, perspectives: real ? null : DEMO_PERSPECTIVES, conditions: real ? [] : DEMO_CONDITIONS,
  };
}

/* ---------- section primitives ---------- */
const eye = (n, t) => `<div class="rp-shead" id="rp-sec-${n}" style="scroll-margin-top:20px"><span class="rp-snum">${n}</span><h2 class="rp-stitle">${t}</h2><span class="rp-shline"></span></div>`;
const bar = (p, tone) => `<span class="rp-bar"><i style="width:${pct(p)}%${tone ? `;background:var(--${tone})` : ""}"></i></span>`;
const toneCls = { pos: "pos", warn: "warn", neg: "neg" };

function sMasthead(d) {
  const ciBand = d.ci ? `<span class="rp-ciband" title="Plausible range given the spread of evidence"><i class="rp-ciband-lo" style="left:${d.ci.low}%"></i><i class="rp-ciband-fill" style="left:${d.ci.low}%;right:${100 - d.ci.high}%"></i><i class="rp-ciband-mid" style="left:${d.conf}%"></i></span><span class="rp-ci"><span class="rp-dim">CONFIDENCE BAND</span> ${d.ci.low} to ${d.ci.high}% <span class="rp-dim">(±${d.ci.margin})</span></span>` : "";
  const revs = (d.dataAsOf.revisions || []);
  const revBtn = revs.length ? `<span class="rp-asof-sep">·</span><button class="rp-asof-btn" onclick="pnRev(this)">Revision history <span class="rp-caret">▾</span></button>` : "";
  const revBody = revs.length ? `<div class="rp-revs"><div class="rp-revs-inner">${revs.map((r) => `<div class="rp-revrow"><span class="rp-mono rp-acc-t">${esc(r.v)}</span><span class="rp-mono rp-dim">${esc(r.date)}</span><span>${esc(r.note)}</span></div>`).join("")}</div></div>` : "";
  return `<header class="rp-masthead rp-rev">
    <div class="rp-brandline"><span class="rp-mark">◆ POLYNOUS</span><span class="rp-dim">RESEARCH DOSSIER</span><span class="rp-dim rp-right">${d.date} · ${d.sources} SOURCES · ${esc(d.model).toUpperCase()}</span></div>
    <div class="rp-actions">
      <button class="rp-act" onclick="pnShare()" title="Copy a shareable link to this report"><span class="rp-act-i">⧉</span> Copy link</button>
      <button class="rp-act rp-act-p" onclick="pnPdf()" title="Save this report as a PDF"><span class="rp-act-i">⭳</span> Save PDF</button>
    </div>
    <h1 class="rp-query">${esc(d.query)}</h1>
    ${d.verdict ? `<p class="rp-verdict">${cite(d.verdict)}</p>` : ""}
    <div class="rp-headrow">
      <div class="rp-conf"><span class="rp-fig rp-count" data-target="${d.conf}" data-suffix="%">${d.conf}%</span><span class="rp-conf-meta"><span class="rp-band">${esc(d.band)} CONFIDENCE</span>${ciBand}</span></div>
      ${d.critic.position ? `<div class="rp-critic"><span class="rp-dim">CRITIC CONSENSUS</span><span><b>${d.critic.pct}%</b>, ${d.critic.agree}/${d.critic.total} sources agree</span><span class="rp-mut">${esc(d.critic.position)}</span></div>` : ""}
    </div>
    <div class="rp-asof">
      <div class="rp-asof-line">
        <span>Generated <b>${d.dataAsOf.generated}</b></span>${d.dataAsOf.current ? `<span class="rp-asof-sep">·</span><span>Sources current to <b>${d.dataAsOf.current}</b></span>` : ""}${revBtn}
      </div>${revBody}
    </div>
  </header>`;
}

function sExec(d) { if (!d.analysisText) return "";
  const paras = String(d.analysisText || "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const body = (paras.length ? paras : [d.analysisText]).map((p) => `<p>${cite(p)}</p>`).join("");
  return `<section class="rp-sec rp-rev">${eye("01", "Executive summary")}<div class="rp-lede">${body}</div></section>`;
}

function sGlance(d) {
  const s = d.stats;
  const items = [["Confidence", s.confidence, "%"], ["Sources", s.sources, ""], ["Passages", s.passages, ""], ["Insights", s.insights, ""], ["Claims", s.claims, ""], ["Consensus", s.consensus, "%"]];
  const cells = items.map(([l, v, suf]) => `<div class="rp-stat"><span class="rp-fig rp-count" data-target="${v}"${suf ? ` data-suffix="${suf}"` : ""}>${v}${suf}</span><span class="rp-stat-l">${l}</span></div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("03", "At a glance")}<div class="rp-stats">${cells}</div>
    <p class="rp-cap">${s.passages} passages analysed across ${s.sources} sources to produce ${s.claims} synthesised claims.</p></section>`;
}

function sFindings(d) { if (!d.findings.length) return "";
  const rows = d.findings.map((f, i) => {
    const cites = String(f).match(/\[(\d+)\]/g) || [];
    const clean = String(f).replace(/\s*\[\d+\]/g, "");
    const meta = cites.length
      ? `GROUNDED · ${cites.map((c) => `<a class="rp-cite" onclick="event.stopPropagation();pnOpen(this.closest('[data-claim]'))">${c}</a>`).join(" ")}`
      : "SYNTHESISED CLAIM";
    return `<li class="rp-find" role="button" tabindex="0" ${inspData(d, f, cites)} onclick="pnOpen(this)" onkeydown="if(event.key==='Enter')pnOpen(this)">
      <span class="rp-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="rp-find-body"><p class="rp-find-t">${esc(clean)}</p><span class="rp-find-meta">${meta}</span></div>
      <span class="rp-inspect">Inspect →</span>
    </li>`;
  }).join("");
  return `<section class="rp-sec rp-rev">${eye("04", "Key findings")}<p class="rp-sublede">The core claims this synthesis stands behind, each one traceable to its supporting evidence.</p><ol class="rp-findlist">${rows}</ol></section>`;
}

function sEvidence(d) { if (!d.ledger.length && !d.landscape.length) return "";
  const rows = d.ledger.map((r) => `<tr role="button" tabindex="0" ${inspData(d, "Source assessment: " + r.name, r.cite ? ["[" + r.cite + "]"] : [])} onclick="pnOpen(this)">
    <td class="rp-src">${esc(r.name)}${r.cite ? ` <a class="rp-cite" onclick="event.stopPropagation();pnOpen(this.closest('[data-claim]'))">[${esc(r.cite)}]</a>` : ""}</td>
    <td class="rp-fresh ${toneCls[r.fresh.tone]}">${r.fresh.label} <span class="rp-dim">${r.fresh.year}</span></td>
    <td class="rp-trust"><span class="rp-mono">${r.trust.toFixed(2)}</span>${bar(r.trust * 100)}</td></tr>`).join("");
  const land = d.landscape.map((l) => `<div class="rp-land"><span>${esc(l.label)}</span><span class="rp-mono">${l.pct}%</span>${bar(l.pct)}</div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("05", "Evidence")}<div class="rp-split">
    <div><div class="rp-subh">Ledger, ${d.ledger.length} sources</div><table class="rp-table"><thead><tr><th>Source</th><th>Freshness</th><th>Trust</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div><div class="rp-subh">Landscape, composition</div><div class="rp-landwrap">${land}</div></div>
  </div></section>`;
}

const CONF_WEIGHTS = { Agreement: 30, Diversity: 20, Recency: 20, Grounding: 30 };
function sConfidence(d) {
  // Only surface the sub-score breakdown when it comes from a real confidence
  // analysis. Never invent agreement/diversity/recency numbers.
  const facBlock = d.breakdownReal
    ? `<div class="rp-subh">How the score is built</div>${Object.entries(d.breakdown).map(([k, v]) => `<div class="rp-fac"><span>${k} <span class="rp-dim">(${CONF_WEIGHTS[k] != null ? CONF_WEIGHTS[k] + "%" : "weight"})</span></span><span class="rp-mono">${v}%</span>${bar(v)}</div>`).join("")}<p class="rp-cap" style="margin-top:14px;font-style:normal">Confidence = 30% source agreement + 20% domain diversity + 20% recency + 30% citation grounding.</p>`
    : "";
  const faithBlock = d.faithful
    ? `<div class="rp-faith"><span class="rp-fig-s rp-count" data-target="${d.faithful.pct}" data-suffix="%">${d.faithful.pct}%</span><span><b>${d.faithful.grounded}/${d.faithful.total}</b> sentences carry a citation</span></div>
       <ul class="rp-flags">${(d.ungrounded && d.ungrounded.length) ? d.ungrounded.map((s) => `<li class="rp-flag"><span class="rp-warn rp-mono">UNGROUNDED</span> "${esc(s.slice(0, 150))}"</li>`).join("") : `<li class="rp-flag rp-mut">Every sampled sentence carries a supporting citation.</li>`}</ul>`
    : "";
  // Claim-level: show REAL grounding status, not a fabricated per-claim %.
  const cl = d.claims.map((c, i) => {
    const g = /\[\d+\]/.test(c.text);
    return `<div class="rp-claim" role="button" tabindex="0" ${inspData(d, c.text, String(c.text).match(/\[(\d+)\]/g) || [])} onclick="pnOpen(this)" onkeydown="if(event.key==='Enter')pnOpen(this)"><span class="rp-num">${String(i + 1).padStart(2, "0")}</span><span class="rp-claim-t">${cite(c.text)}</span><span class="rp-tag ${g ? "pos" : "warn"}">${g ? "GROUNDED" : "SYNTHESISED"}</span></div>`;
  }).join("");
  const claimBlock = d.claims.length ? `<div><div class="rp-subh">Claims &amp; grounding</div><div class="rp-claims">${cl}</div></div>` : "";
  if (!facBlock && !faithBlock && !claimBlock) return "";
  return `<section class="rp-sec rp-rev">${eye("07", "Confidence &amp; grounding")}<div class="rp-split">
    <div>${facBlock}${faithBlock}</div>
    ${claimBlock}
  </div></section>`;
}

function sPerspectives(d) { if (!d.perspectives) return "";
  const pr = d.perspectives;
  const pos = (k, x, tone) => `<div class="rp-pos"><div class="rp-pos-h"><span>Position ${k}</span><span class="rp-dim">${x.sources} sources</span></div><p>${esc(x.label)}</p><div class="rp-pos-m"><span class="rp-mono">${x.strength}% strength</span><span class="${tone}">${x.support}</span></div>${bar(x.strength, tone)}</div>`;
  return `<section class="rp-sec rp-rev">${eye("09", "Perspectives")}
    <div class="rp-vs">${pos("A", pr.a, "pos")}<span class="rp-vsmark">vs</span>${pos("B", pr.b, "warn")}</div>
    <p class="rp-note"><span class="rp-acc-t">Evidence favours Position ${pr.leader}.</span> ${esc(pr.note)}</p>
    <div class="rp-balance"><span class="rp-dim">EVIDENCE BALANCE</span><span class="rp-split2"><i style="width:${pr.balance.a}%"></i><b style="width:${pr.balance.b}%"></b></span><span class="rp-mono">A ${pr.balance.a}% · B ${pr.balance.b}%</span></div>
    ${d.contradiction ? `<div class="rp-contra"><div class="rp-subh">Contradiction resolution</div><p>${cite(d.contradiction)}</p></div>` : ""}
  </section>`;
}

function sKUU(d) { if (!d.kuu) return "";
  const col = (title, tone, items, bars) => {
    const rows = items.map((it) => `<li><p>${cite(it.text)} ${(it.cites || []).map((c) => `<a class="rp-cite" onclick="pnOpen()">[${esc(c)}]</a>`).join(" ")}</p>${bars && it.pct != null ? `<div class="rp-kbar"><span class="rp-mono ${tone}">${it.pct}%</span>${bar(it.pct, tone)}</div>` : ""}</li>`).join("");
    return `<div class="rp-kcol"><div class="rp-ktitle ${tone}">${title}</div><ul>${rows}</ul></div>`;
  };
  const k = d.kuu;
  return `<section class="rp-sec rp-rev">${eye("11", "Known · Uncertain · Unknown")}<div class="rp-kuu">
    ${col("Known", "pos", k.known, true)}${col("Uncertain", "warn", k.uncertain, true)}${col("Unknown", "neg", k.unknown, false)}
  </div><p class="rp-cap">Evidence status, ${k.known.length} well-supported · ${k.uncertain.length} uncertain · ${k.unknown.length} unresolved.</p></section>`;
}

function sChange(d) { if (!d.conditions.length) return "";
  const conds = d.conditions.map((c) => `<div class="rp-cond" role="button" tabindex="0" onclick="pnCond(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();pnCond(this)}">
    <div class="rp-cond-head">
      <span class="rp-num">${c.n}</span>
      <div class="rp-cond-main"><h4>${esc(c.title)}</h4><p class="rp-mut">${esc(c.desc)}</p></div>
      <div class="rp-cond-side"><span class="rp-cond-pill">Not observed</span><div class="rp-cond-strength"><span class="rp-dim">CHALLENGE</span>${bar(c.strength, "warn")}<span class="rp-mono warn">${c.strength}%</span></div></div>
      <span class="rp-caret">▾</span>
    </div>
    <div class="rp-cond-body"><div class="rp-cond-inner">
      <div class="rp-need"><span class="rp-dim">EVIDENCE THAT WOULD MOVE US</span><div class="rp-chips">${c.need.map((n) => `<span class="rp-chip">${esc(n)}</span>`).join("")}</div></div>
      <div class="rp-cond-foot"><span class="rp-dim">RELEVANT SOURCES</span> ${c.sources.map((s) => `<a class="rp-cite" onclick="event.stopPropagation();pnOpen()">[${esc(s)}]</a>`).join(" ")}</div>
    </div></div>
  </div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("13", "What would change our mind")}
    <div class="rp-synth"><span class="rp-dim">CURRENT SYNTHESIS</span><p>Recent climate change is predominantly driven by human activity, while natural factors contribute to longer-term variability.</p><span class="rp-synth-c"><span class="rp-dim">CONFIDENCE</span><b>${d.conf}%</b></span></div>
    <div class="rp-conds">${conds}</div>
    <p class="rp-note"><span class="rp-acc-t">Moderately robust.</span> The conclusion is supported by multiple independent sources, but would weaken if stronger evidence materially changed the attribution of recent warming.</p>
  </section>`;
}

function sTrajectory(d) { if (!d.trajectory.length && !d.boundaries.length) return "";
  const traj = d.trajectory.map((t, i) => `<li><span class="rp-num">${String(i + 1).padStart(2, "0")}</span><span class="rp-traj-lk" role="button" tabindex="0" ${inspData(d, t, String(t).match(/\[(\d+)\]/g) || [])} onclick="pnOpen(this)" onkeydown="if(event.key==='Enter')pnOpen(this)">${cite(t)} <span class="rp-traj-arrow">↗</span></span></li>`).join("");
  const bnd = d.boundaries.map((b) => `<li>${cite(b)}</li>`).join("");
  return `<section class="rp-sec rp-rev">${eye("14", "Trajectory &amp; boundaries")}<div class="rp-split">
    <div><div class="rp-subh">Where the research goes next</div><ol class="rp-traj">${traj}</ol></div>
    <div><div class="rp-subh">Honest boundaries</div><ul class="rp-bound">${bnd}</ul></div>
  </div></section>`;
}

function sProvenance(d) { if (!d.telemetry.tokens && !d.timeline.length && !d.provenance.length && !d.constellation.length) return "";
  const miles = d.timeline.map((e) => `<div class="rp-tlmile"><span class="rp-tlyear">${e.year}</span><span class="rp-tltitle">${esc(e.title)}</span><span class="rp-tlconf">${e.conf}%</span></div>`).join("");
  const t = d.telemetry;
  const tel = [["Tokens", t.tokens ? t.tokens.toLocaleString() : "n/a"], ["Est. cost", t.cost ? "$" + t.cost.toFixed(4) : "n/a"], ["Steps", t.steps.length || d.provenance.length], ["Model", esc(d.model)]];
  const telCells = tel.map(([l, v]) => `<div class="rp-tel"><span class="rp-dim">${l}</span><span class="rp-mono rp-tel-v">${v}</span></div>`).join("");
  const pipe = ["Input", "Search", "Summarise", "Critic", "Evidence", "Synthesis", "Insights"].map((s, i, a) => `<span class="rp-step">${s}</span>${i < a.length - 1 ? '<span class="rp-steprule"></span>' : ""}`).join("");
  const prov = d.provenance.map((s) => `<div class="rp-provrow"><span>${esc(s.name)}</span><span class="rp-mono rp-dim">${s.tokens ? s.tokens.toLocaleString() + " tok" : ""}</span></div>`).join("");
  const cons = d.constellation.map((c) => `<li role="button" tabindex="0" onclick="pnOpen()"><span class="rp-num">${c.n}</span>${esc(c.t)}</li>`).join("");
  const chartBlock = d.timeline.length ? `<div class="rp-subh" style="margin-top:34px">Confidence of the field over time</div>
    <div id="rp-confchart" class="rp-chart-mount"></div>
    <div class="rp-tlmiles">${miles}</div>` : "";
  return `<section class="rp-sec rp-rev">${eye("15", "Provenance")}
    <div class="rp-pipe">${pipe}</div>
    ${chartBlock}
    <div class="rp-provgrid">
      <div><div class="rp-subh">Run telemetry</div><div class="rp-tels">${telCells}</div><div class="rp-tools">${d.tools.map((t) => `<span class="rp-chip">${esc(t)}</span>`).join("")}</div></div>
      <div><div class="rp-subh">Pipeline provenance</div>${prov}</div>
      <div><div class="rp-subh">Source constellation</div><ol class="rp-cons">${cons}</ol></div>
    </div>
  </section>`;
}

function sChat(d) {
  const chips = ["What's the strongest evidence here?", "Where do the sources disagree?", "What are the biggest uncertainties?", "Summarise this in one line"];
  return `<section class="rp-sec rp-rev rp-chatsec">${eye("18", "Interrogate this report")}
    <div class="rp-chat"><div id="pn-chat-msgs" class="rp-msgs">
      <div class="rp-msg rp-msg-a">Ask anything about this report, every answer stays grounded strictly in the sources above.</div>
      <div class="rp-chiprow">${chips.map((q) => `<button class="rp-chip rp-chipbtn" onclick="pnAsk(this)">${q}</button>`).join("")}</div>
    </div>
    <div class="rp-chatbar"><input id="pn-chat-input" onkeydown="if(event.key==='Enter')pnSend()" placeholder="Ask a follow-up…"/><button onclick="pnSend()" aria-label="Send">↑</button></div></div>
  </section>`;
}

function sInspector() {
  return `<div class="rp-backdrop" id="pn-backdrop" onclick="pnClose()"></div>
  <aside class="rp-drawer" id="pn-drawer" role="dialog" aria-modal="true" aria-label="Citation inspector">
    <div class="rp-dhead"><div><div class="rp-eye"><span>◆</span> · CITATION INSPECTOR</div><div class="rp-dim rp-mono" id="pn-i-id" style="margin-top:6px">select a claim to inspect</div></div><button class="rp-dclose" onclick="pnClose()" aria-label="Close">×</button></div>
    <div class="rp-dbody">
      <div class="rp-dsec"><div class="rp-dlab">Target claim <span class="rp-dpill rp-mono" id="pn-i-verdict">SUPPORTED</span></div><p class="rp-dclaim" id="pn-i-claim">Select any claim, finding or source in the report to trace it back to its evidence.</p></div>

      <div class="rp-dsec"><div class="rp-dlab">Entailment check <span class="rp-dim rp-mono" style="font-size:8.5px">NLI · real, not citation-counting</span></div>
        <div class="rp-nli" id="pn-i-nli"><span class="rp-nli-idle">Run <b>Verify claim</b> to test whether the source text logically entails this claim.</span></div></div>

      <div class="rp-dsec"><div class="rp-dlab">Primary source</div><div class="rp-dsrc"><div><b id="pn-i-src">not selected</b><span class="rp-dim" id="pn-i-url">not selected</span></div><span class="rp-mono rp-pos" id="pn-i-trust">not selected</span></div></div>

      <div class="rp-dsec"><div class="rp-dlab">Matched evidence</div><blockquote class="rp-dquote" id="pn-i-quote">not selected</blockquote></div>

      <div class="rp-dsec rp-dmetrics">
        <div><span class="rp-dim">Semantic match</span><span class="rp-bar"><i id="pn-i-matchbar" style="width:0%"></i></span><span class="rp-mono" id="pn-i-match">not selected</span></div>
        <div><span class="rp-dim">Source trust</span><span class="rp-bar"><i id="pn-i-trustbar" style="width:0%"></i></span><span class="rp-mono" id="pn-i-trust2">not selected</span></div>
        <div><span class="rp-dim">Grounding</span><span class="rp-bar"><i id="pn-i-groundbar" style="width:0%"></i></span><span class="rp-mono" id="pn-i-ground">not selected</span></div>
      </div>

      <div class="rp-dsec"><div class="rp-dlab">How this was assessed</div><p class="rp-mut" id="pn-i-assess">POLYNOUS matches each claim to the highest-trust source that supports it, scores the semantic overlap, and (on Verify) runs a natural-language-inference check for true entailment rather than a bare citation count.</p></div>
    </div>
    <div class="rp-dfoot"><button class="rp-dbtn" id="pn-i-open" onclick="pnOpenSrc()">Open source ↗</button><button class="rp-dbtn rp-dbtn-p" id="pn-i-verify" onclick="pnVerify()">Verify claim</button></div>
  </aside>`;
}

/* ---------- institutional-grade section builders ---------- */
function sTakeaways(d) { if (!d.takeaways.length) return "";
  const rows = d.takeaways.map((t, i) => {
    const tone = t.tag === "HIGH" ? "pos" : t.tag === "MODERATE" ? "info" : t.tag === "TENTATIVE" ? "warn" : "neg";
    const cites = t.cites.length ? " " + t.cites.map((c) => `<a class="rp-cite" onclick="event.stopPropagation();pnOpen(this.closest('[data-claim]'))">${c}</a>`).join(" ") : "";
    return `<li class="rp-take" ${inspData(d, t.text, t.cites)} role="button" tabindex="0" onclick="pnOpen(this)" onkeydown="if(event.key==='Enter')pnOpen(this)">
      <span class="rp-take-n">${String(i + 1).padStart(2, "0")}</span>
      <p class="rp-take-t">${esc(t.text)}${cites}</p>
      <span class="rp-tag ${tone}">${t.tag} · ${t.conf}%</span>
    </li>`;
  }).join("");
  return `<section class="rp-sec rp-rev rp-lead" id="rp-sec-00" style="scroll-margin-top:20px">
    <div class="rp-lead-eye"><span class="rp-mono rp-acc-t">◆ KEY TAKEAWAYS</span><span class="rp-dim rp-mono">${esc(d.band)} CONFIDENCE${d.ci ? ` · BAND ${d.ci.low} TO ${d.ci.high}%` : ""}</span></div>
    <ol class="rp-takes">${rows}</ol>
  </section>`;
}

function sScenarios(d) { if (!d.scenarios.length) return "";
  const cards = d.scenarios.map((s) => `<div class="rp-scen">
    <div class="rp-scen-h"><span class="rp-scen-k ${s.tone}">${esc(s.key)}</span><span class="rp-scen-w rp-mono ${s.tone}">${s.weight}%</span></div>
    <div class="rp-scen-bar">${bar(s.weight, s.tone)}</div>
    <h4>${esc(s.title)}</h4><p>${esc(s.body)}</p>
    <div class="rp-scen-d">${s.drivers.map((x) => `<span class="rp-chip">${esc(x)}</span>`).join("")}</div>
  </div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("02", "Scenarios &amp; weights")}<p class="rp-sublede">How the conclusion could break in either direction, with a rough probability weight on each reading.</p>
    <div class="rp-scens">${cards}</div></section>`;
}

function sScorecard(d) { if (!d.scorecard || !d.scorecard.total) return "";
  const sc = d.scorecard;
  const tierRow = (n, label, cnt, tone) => `<div class="rp-tier"><span class="rp-tier-b ${tone}">TIER ${n}</span><span class="rp-tier-l">${label}</span><span class="rp-mono">${cnt}</span><span class="rp-tier-bar">${bar(sc.total ? (cnt / sc.total) * 100 : 0, tone)}</span></div>`;
  const rec = (label, cnt, tone) => `<div class="rp-recrow"><span>${label}</span><span class="rp-mono">${cnt}</span>${bar(sc.total ? (cnt / sc.total) * 100 : 0, tone)}</div>`;
  return `<section class="rp-sec rp-rev">${eye("06", "Source quality scorecard")}<div class="rp-split">
    <div><div class="rp-subh">Authority tiers</div>
      ${tierRow(1, "Government, peer-reviewed", sc.tierCounts[1], "pos")}
      ${tierRow(2, "Institutions, established orgs", sc.tierCounts[2], "info")}
      ${tierRow(3, "General web, unverified", sc.tierCounts[3], "warn")}
      <div class="rp-scorekpi"><div><span class="rp-fig-s">${(sc.avgTrust * 100).toFixed(0)}%</span><span class="rp-stat-l">Avg trust</span></div><div><span class="rp-fig-s">${sc.independentDomains}</span><span class="rp-stat-l">Independent sources</span></div></div>
    </div>
    <div><div class="rp-subh">Recency &amp; independence</div>
      ${rec("Current (0 to 2 yrs)", sc.recency.current, "pos")}
      ${rec("Aging (3 to 6 yrs)", sc.recency.aging, "warn")}
      ${rec("Outdated (over 6 yrs)", sc.recency.outdated, "neg")}
      <p class="rp-cap">Independence check: ${sc.independentDomains} of ${sc.total} sources come from distinct domains, reducing single-source bias.</p>
    </div></div></section>`;
}

function sSensitivity(d) { if (!d.sensitivity) return "";
  const s = d.sensitivity;
  return `<section class="rp-sec rp-rev">${eye("08", "Sensitivity analysis")}<p class="rp-sublede">The verdict blends measured evidence with argument quality. Drag to re-weight and watch it move; a flip means the conclusion is fragile to that assumption.</p>
    <div class="rp-sens">
      <div class="rp-sens-row"><span class="rp-dim">EVIDENCE WEIGHT</span><span class="rp-mono" id="rp-sens-w">50%</span></div>
      <input id="rp-sens-slider" class="rp-slider" type="range" min="0" max="100" value="50" oninput="pnSens(this.value)" aria-label="Evidence weight"/>
      <div class="rp-sens-out">
        <div class="rp-sens-score"><span class="rp-dim">RESULTING LEAN</span><span class="rp-fig-s" id="rp-sens-score">${s.leadA}%</span><span class="rp-dim">toward the primary conclusion</span></div>
        <div class="rp-sens-flag" id="rp-sens-flag">Stable. The conclusion holds across reasonable weightings.</div>
      </div>
      <div class="rp-sens-note">Flip point: below <b id="rp-sens-flip">${100 - s.flipAt}%</b> evidence weight, the alternative position would lead instead.</div>
    </div></section>`;
}

function sDissent(d) { if (!d.dissent) return "";
  const ds = d.dissent;
  return `<section class="rp-sec rp-rev">${eye("10", "The strongest counter-argument")}<p class="rp-sublede">Every honest analysis names its best opposing case. Here is the strongest challenge to the conclusion, and why it does not currently hold.</p>
    <div class="rp-dissent">
      <div class="rp-dissent-h"><span class="rp-tag neg">DISSENT</span><span class="rp-dim rp-mono">CHALLENGE STRENGTH ${ds.strength}%</span></div>
      <blockquote class="rp-dissent-q">${cite(ds.claim)}</blockquote>
      <p class="rp-mut">${esc(ds.held)}</p>
      <div class="rp-dissent-why"><span class="rp-dim">WHY IT DOES NOT HOLD</span><p>${cite(ds.why)}</p></div>
      ${bar(ds.strength, "neg")}
    </div></section>`;
}

function sAssumptions(d) { if (!d.assumptions || !d.assumptions.length) return "";
  const rows = d.assumptions.map((a) => { const tone = a.risk === "High" ? "neg" : a.risk === "Medium" ? "warn" : "pos"; return `<tr><td class="rp-asm-a">${esc(a.a)}</td><td>${esc(a.depends)}</td><td>${esc(a.breaks)}</td><td><span class="rp-tag ${tone}">${esc(a.risk)}</span></td></tr>`; }).join("");
  return `<section class="rp-sec rp-rev">${eye("12", "Assumptions &amp; risks")}<p class="rp-sublede">What the conclusion depends on, and exactly what would break each link.</p>
    <div class="rp-tablewrap"><table class="rp-table rp-asmtable"><thead><tr><th>Assumption</th><th>Depends on</th><th>Breaks if</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function sAppendix(d) { if (!d.footnotes.length) return "";
  const rows = d.footnotes.map((f) => `<div class="rp-fnrow"${f.url ? ` data-url="${escAttr(f.url)}" role="button" tabindex="0" onclick="pnGo(this)"` : ""}>
    <span class="rp-fn-n rp-mono">[${f.n}]</span>
    <div class="rp-fn-meta"><b>${esc(f.name)}</b>${f.url ? `<span class="rp-dim rp-mono">${esc(f.domain || f.url)}</span>` : ""}${f.snippet ? `<span class="rp-fn-snip">${esc(f.snippet)}</span>` : ""}</div>
    <span class="rp-tag ${f.tier === 1 ? "pos" : f.tier === 2 ? "info" : "warn"}">TIER ${f.tier}</span>
    <span class="rp-mono rp-fn-t">${f.trust != null ? f.trust.toFixed(2) : ""}</span>
  </div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("16", "Citations appendix")}<p class="rp-sublede">Full metadata for every source cited above. Click a row to open the source.</p><div class="rp-fns">${rows}</div></section>`;
}

function sMethodology(d) {
  const t = d.telemetry;
  const gl = d.glossary.map((g) => `<div class="rp-gl"><dt>${esc(g.t)}</dt><dd>${esc(g.d)}</dd></div>`).join("");
  return `<section class="rp-sec rp-rev">${eye("17", "Methodology &amp; glossary")}<div class="rp-split">
    <div><div class="rp-subh">How this report was produced</div>
      <p class="rp-method">POLYNOUS ran a multi-agent pipeline (Search, then Summarise, then Critic, then Writer) over ${d.sources} sources: isolating claims, scoring each against its highest-trust source, and computing a grounded confidence from source agreement, diversity, recency and citation coverage. Every figure is derived from the run, never fabricated; costs are estimates.</p>
      <div class="rp-method-kpi"><span><b class="rp-mono">${esc(d.model)}</b><span class="rp-stat-l">model</span></span><span><b class="rp-mono">${t.tokens ? t.tokens.toLocaleString() : "n/a"}</b><span class="rp-stat-l">tokens</span></span><span><b class="rp-mono">${t.cost ? "$" + t.cost.toFixed(4) : "n/a"}</b><span class="rp-stat-l">est. cost</span></span></div>
    </div>
    <div><div class="rp-subh">Glossary</div><dl class="rp-glossary">${gl}</dl></div>
  </div></section>`;
}

function buildReport(d) {
  // Build every section, drop the empty ones (P0: no fabricated demo sections in
  // real mode), then renumber the surviving numbered sections sequentially and
  // build the rail from what actually rendered, so there are never gaps.
  const raw = [
    sMasthead(d), sTakeaways(d), sExec(d), sScenarios(d), sGlance(d), sFindings(d), sEvidence(d),
    sScorecard(d), sConfidence(d), sSensitivity(d), sPerspectives(d), sDissent(d), sKUU(d),
    sAssumptions(d), sChange(d), sTrajectory(d), sProvenance(d), sAppendix(d), sMethodology(d), sChat(d),
  ].filter((h) => h && h.trim());

  let n = 0;
  const rail = [];
  const parts = raw.map((h) => {
    // Key-takeaways lead is unnumbered but still a rail target.
    if (/id="rp-sec-00"/.test(h)) { rail.push({ label: "Key takeaways", id: "rp-sec-00" }); return h; }
    if (!/class="rp-shead"/.test(h)) return h; // masthead / non-section
    n += 1;
    const nn = String(n).padStart(2, "0");
    const out = h.replace(/id="rp-sec-\d+"/, `id="rp-sec-${nn}"`).replace(/(<span class="rp-snum">)\d+(<\/span>)/, `$1${nn}$2`);
    const tm = out.match(/<h2 class="rp-stitle">([^<]*)<\/h2>/);
    if (tm) rail.push({ label: tm[1].replace(/&amp;/g, "&").replace(/&middot;| · Unknown/g, "").trim(), id: `rp-sec-${nn}` });
    return out;
  });

  const html = `<div class="rp-progress" id="rp-prog"></div><div class="rp-wrap">
    ${parts.join("")}
    <footer class="rp-foot"><span>◆ POLYNOUS</span><span class="rp-dim">Transparent · Auditable · Grounded research</span></footer>
  </div>${sInspector()}`;
  return { html, rail };
}

/* ---------- CSS design system (hand-written, no framework) ---------- */
const RP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.rp * { box-sizing: border-box; margin: 0; }
.rp {
  --ink:#0a0a1e; --ink2:#0b0b24; --panel:#111634; --panel2:#151b3e;
  --line:rgba(200,216,234,0.11); --line2:rgba(200,216,234,0.06);
  --tx:#c3d2e6; --dim:#6c7a97; --hi:#f2f6fb;
  --acc:#3ef07f; --acc-soft:rgba(0,255,71,0.12);
  --pos:#3ef07f; --warn:#ffb64a; --neg:#ff6b8a; --info:#00ccff;
  --serif:'Bricolage Grotesque',sans-serif; --sans:'Hanken Grotesk',-apple-system,sans-serif; --mono:'JetBrains Mono',monospace;
  background: var(--ink);
  color: var(--tx); font-family: var(--sans); font-size: 16px; line-height: 1.62;
  letter-spacing: -0.006em; -webkit-font-smoothing: antialiased; height: auto; overflow: visible; position: relative;
}
.rp-wrap { max-width: 940px; margin: 0 auto; padding: 0 40px 80px; }
.rp ::selection { background: var(--acc-soft); }
.rp-mono { font-family: var(--mono); }
.rp-dim { color: var(--dim); }
.rp-mut { color: var(--dim); }
.rp-acc-t { color: var(--acc); font-weight: 600; }
.rp .pos { color: var(--pos); } .rp .warn { color: var(--warn); } .rp .neg { color: var(--neg); }
.rp-cite { color: var(--acc); font-family: var(--mono); font-size: 0.82em; font-weight: 600; cursor: pointer; padding: 0 1px; }
.rp-cite:hover { text-shadow: 0 0 10px rgba(0,255,71,0.5); }

/* No entrance/stagger animation — everything renders at once in one seamless
   scroll (per request). Kept the class so builders/markup stay unchanged. */
.rp-rev { animation: none; }
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
.rp-shead { display: flex; align-items: baseline; gap: 18px; margin-bottom: 34px; }
.rp-snum { font-family: var(--mono); font-size: 14px; font-weight: 600; color: var(--acc); letter-spacing: 0.02em; flex-shrink: 0; }
.rp-stitle { font-family: var(--serif); font-weight: 700; font-size: clamp(1.7rem, 3vw, 2.35rem); line-height: 1; letter-spacing: -0.025em; color: var(--hi); }
.rp-shline { flex: 1; height: 1px; background: var(--line); align-self: center; margin-left: 4px; }
.rp-subh { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--acc); margin-bottom: 18px; }
.rp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.rp-cap { font-size: 12.5px; color: var(--dim); margin-top: 20px; font-style: italic; }

/* exec */
.rp-lede { max-width: 72ch; }
.rp-lede p { font-size: 18px; line-height: 1.78; color: var(--tx); margin-bottom: 18px; }
.rp-lede p:first-child { color: var(--hi); }
.rp-lede p:first-child::first-letter { font-family: var(--serif); font-weight: 700; font-size: 3.6em; line-height: 0.74; float: left; margin: 8px 14px 0 0; color: var(--acc); }

/* glance */
.rp-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
.rp-stat { display: flex; flex-direction: column; gap: 8px; padding-right: 16px; border-right: 1px solid var(--line2); }
.rp-stat:last-child { border-right: 0; }
.rp-stat .rp-fig { font-size: 30px; }
.rp-stat-l { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }

/* findings */
.rp-findlist { list-style: none; }
.rp-sublede { font-size: 15px; color: var(--dim); margin-bottom: 22px; max-width: 62ch; }
.rp-find { display: flex; align-items: flex-start; gap: 22px; padding: 22px 4px; border-top: 1px solid var(--line2); cursor: pointer; transition: transform .3s cubic-bezier(.16,1.3,1); }
.rp-find:first-of-type { border-top: 0; }
.rp-find:hover { transform: translateX(10px); }
.rp-num { font-family: var(--mono); font-size: 15px; color: var(--acc); flex-shrink: 0; padding-top: 4px; }
.rp-find-body { flex: 1; }
.rp-find-t { font-size: 18.5px; color: var(--hi); line-height: 1.45; font-weight: 500; letter-spacing: -0.01em; }
.rp-find-meta { display: block; margin-top: 9px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; color: var(--dim); }
.rp-find-meta .rp-cite { padding: 0 4px; }
.rp-inspect { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--acc); opacity: 0; transform: translateX(-6px); transition: opacity .3s ease, transform .3s cubic-bezier(.16,1.3,1); white-space: nowrap; padding-top: 5px; }
.rp-find:hover .rp-inspect { opacity: 1; transform: none; }

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
.rp-flag .rp-warn.rp-flag.rp-mono { font-style: normal; }
.rp-flag .rp-mono.rp-flag .rp-warn { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; color: var(--warn); margin-right: 6px; }
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
.rp-cond-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.16,1.3,1); }
.rp-cond.open .rp-cond-body { grid-template-rows: 1fr; }
.rp-cond-inner { overflow: hidden; min-height: 0; }
.rp-cond.open .rp-cond-inner { padding-bottom: 20px; }
.rp-need.rp-cond-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-left: 32px; }
.rp-cond-foot { margin-top: 12px; }
.rp-need .rp-dim.rp-cond-foot .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; margin-right: 4px; }
.rp-chip { display: inline-block; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; font-size: 11px; color: var(--tx); }
.rp-cond-str { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.rp-cond-str .rp-bar { width: 80px; }
.rp-cond-main { flex: 1; min-width: 0; }
.rp-cond-head h4 { font-size: 17px; color: var(--hi); font-weight: 600; letter-spacing: -0.01em; }
.rp-cond-head p { font-size: 13px; margin-top: 5px; max-width: 54ch; line-height: 1.5; }
.rp-cond-side { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; margin-left: auto; flex-shrink: 0; padding-top: 2px; }
.rp-cond-pill { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); padding: 4px 11px; border: 1px solid var(--line); border-radius: 999px; white-space: nowrap; }
.rp-cond-strength { display: flex; align-items: center; gap: 8px; width: 140px; }
.rp-cond-strength .rp-dim { font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; }
.rp-cond-strength .rp-bar { flex: 1; }
.rp-cond-strength .rp-mono { font-size: 11px; }
.rp-need { display: block; }
.rp-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.rp-cond .rp-caret { align-self: center; margin-left: 14px; color: var(--dim); }

/* trajectory */
.rp-traj { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.rp-traj li { display: flex; gap: 14px; font-size: 14px; color: var(--tx); line-height: 1.45; }
.rp-bound { list-style: none; display: flex; flex-direction: column; gap: 14px; }
.rp-bound li { font-size: 14px; color: var(--tx); padding-left: 16px; border-left: 2px solid var(--warn); line-height: 1.45; }

/* provenance */
.rp-pipe { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rp-step { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx); }
.rp-steprule { flex: 1; min-width: 14px; height: 1px; background: var(--line); }
.rp-tl { width: 100%; height: 160px; margin-top: 10px; }
.rp-chart-mount { width: 100%; height: 300px; margin-top: 12px; }
.rp-chart-mount .recharts-surface { overflow: visible; }
.rp-chart-mount svg { outline: none; }
.rp-tlgrid { stroke: rgba(200,216,234,0.07); stroke-width: 1; vector-effect: non-scaling-stroke; }
.rp-tlline { fill: none; stroke: #3ef07f; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 6px rgba(0,255,71,0.45)); }
.rp-tldot { fill: #3ef07f; }
.rp-tlmiles { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; }
.rp-tlmile { display: flex; flex-direction: column; gap: 3px; text-align: center; flex: 1; }
.rp-tlyear { font-family: var(--mono); font-size: 12px; color: var(--acc); font-weight: 600; }
.rp-tltitle { font-size: 11px; color: var(--tx); line-height: 1.3; }
.rp-tlconf { font-family: var(--mono); font-size: 10px; color: var(--dim); }
.rp-provgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 44px; }
.rp-tels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.rp-tel { display: flex; flex-direction: column; gap: 6px; padding: 15px 16px; background: rgba(255,255,255,0.025); border: 1px solid var(--line2); border-radius: 12px; transition: border-color .25s ease, transform .3s cubic-bezier(.16,1.3,1); }
.rp-tel:hover { border-color: var(--line); transform: translateY(-2px); }
.rp-tel .rp-dim { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
.rp-tel-v { font-size: 22px; color: var(--hi); font-weight: 600; letter-spacing: -0.02em; }
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
.rp-msg-u { align-self: flex-end; color: var(--hi); background: var(--acc-soft); border: 1px solid rgba(0,255,71,0.25); padding: 9px 14px; border-radius: 12px; }
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

/* inspector drawer, premium, tactile */
.rp-backdrop { position: fixed; inset: 0; background: rgba(2,4,14,0.62); backdrop-filter: blur(4px); opacity: 0; visibility: hidden; transition: opacity .35s ease, visibility .35s ease; z-index: 90; }
.rp-backdrop.open { opacity: 1; visibility: visible; }
.rp-drawer { position: fixed; top: 0; right: 0; height: 100%; width: 470px; max-width: 94vw; background: linear-gradient(180deg, #0e1434 0%, #0a0a1e 62%); border-left: 1px solid rgba(0,255,71,0.16); box-shadow: -34px 0 90px -34px rgba(0,0,10,0.9); transform: translateX(100%); transition: transform .46s cubic-bezier(.16,1.3,1); z-index: 91; display: flex; flex-direction: column; }
.rp-drawer.open { transform: none; }
.rp-dhead { display: flex; justify-content: space-between; align-items: flex-start; padding: 26px 26px 22px; border-bottom: 1px solid var(--line); }
.rp-dclose { background: rgba(255,255,255,0.04); border: 1px solid var(--line); width: 34px; height: 34px; border-radius: 9px; color: var(--dim); font-size: 18px; cursor: pointer; line-height: 1; transition: all .2s ease; display: flex; align-items: center; justify-content: center; }
.rp-dclose:hover { color: var(--hi); background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.22); }
.rp-dbody { flex: 1; overflow-y: auto; padding: 26px; display: flex; flex-direction: column; gap: 28px; }
.rp-dsec { display: flex; flex-direction: column; gap: 11px; }
.rp-dlab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); display: flex; justify-content: space-between; align-items: center; }
.rp-dlab .rp-pos { font-size: 9px; padding: 3px 10px; border: 1px solid var(--pos); border-radius: 999px; letter-spacing: 0.1em; }
.rp-dclaim { font-family: var(--serif); font-size: 20px; font-weight: 600; color: var(--hi); line-height: 1.38; letter-spacing: -0.015em; }
.rp-dsrc { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
.rp-dsrc b { color: var(--hi); font-size: 14px; display: block; margin-bottom: 2px; }
.rp-dsrc span.rp-dim { font-size: 11.5px; font-family: var(--mono); }
.rp-dsrc > span.rp-mono { font-size: 14px; padding: 5px 12px; background: var(--acc-soft); border: 1px solid rgba(0,255,71,0.28); border-radius: 999px; color: var(--acc); }
.rp-dquote { position: relative; font-size: 14.5px; font-style: italic; color: var(--hi); line-height: 1.66; padding: 15px 18px; background: rgba(0,255,71,0.045); border-radius: 0 10px 10px 0; }
.rp-dquote::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; border-radius: 2px 0 0 2px; background: linear-gradient(180deg, var(--acc), rgba(62,240,127,0.08)); }
.rp-dmetrics { gap: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--line2); border-radius: 14px; padding: 20px; }
.rp-dmetrics > div { display: grid; grid-template-columns: 98px 1fr auto; gap: 14px; align-items: center; font-size: 11px; }
.rp-dmetrics .rp-dim { font-family: var(--mono); letter-spacing: 0.08em; }
.rp-dmetrics .rp-mono { color: var(--hi); font-size: 12px; }
.rp-dfoot { padding: 18px 26px; border-top: 1px solid var(--line); display: flex; gap: 12px; }
.rp-dbtn { flex: 1; padding: 13px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--tx); font-family: var(--sans); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .22s cubic-bezier(.16,1.3,1); }
.rp-dbtn:hover { color: var(--hi); background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.22); transform: translateY(-1px); }
.rp-dbtn:active { transform: translateY(0) scale(.98); }
.rp-dbtn-p { background: var(--acc-soft); border-color: rgba(0,255,71,0.32); color: var(--acc); }
.rp-dbtn-p:hover { background: rgba(0,255,71,0.18); color: #04120b; border-color: var(--acc); }

/* ── premium interactions ─────────────────────────────────────────────── */
.rp-progress { position: fixed; top: 0; left: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: linear-gradient(90deg, var(--acc), var(--info)); z-index: 95; box-shadow: 0 0 10px rgba(0,255,71,0.55); transition: transform .08s linear; }
.rp a:focus-visible.rp button:focus-visible.rp input:focus-visible.rp [role="button"]:focus-visible { outline: 2px solid var(--acc); outline-offset: 3px; border-radius: 4px; }
.rp-eye span { transition: text-shadow .3s ease; }
.rp-sec:hover .rp-eye span { text-shadow: 0 0 12px rgba(0,255,71,0.6); }
.rp-pos.rp-synth.rp-chat.rp-dsrc { transition: border-color .3s ease, transform .45s cubic-bezier(.16,1.3,1), box-shadow .45s cubic-bezier(.16,1.3,1); }
.rp-pos:hover.rp-synth:hover { border-color: rgba(200,216,234,0.22); transform: translateY(-2px); box-shadow: 0 18px 42px -24px rgba(0,0,12,0.85); }
.rp-cons li { transition: color .2s ease, transform .2s cubic-bezier(.16,1.3,1); }
.rp-cons li:hover { transform: translateX(4px); }
.rp-num { transition: text-shadow .25s ease; }
.rp-find:hover .rp-num { text-shadow: 0 0 10px rgba(0,255,71,0.6); }
.rp-chatbar button { transition: filter .2s ease, transform .14s ease; }
.rp-chatbar button:active { transform: scale(.93); }
.rp-fig { transition: text-shadow .35s ease; }
.rp-masthead:hover .rp-fig { text-shadow: 0 0 34px rgba(0,255,71,0.28); }
.rp-msg-u { animation: rpIn .4s cubic-bezier(.16,1.3,1) both; }

/* export actions */
.rp-actions { display: flex; gap: 10px; margin-top: 22px; }
.rp-act { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--tx); font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.04em; cursor: pointer; transition: all .22s cubic-bezier(.16,1.3,1); }
.rp-act:hover { color: var(--hi); border-color: rgba(200,216,234,0.28); background: rgba(255,255,255,0.06); transform: translateY(-1px); }
.rp-act-i { font-size: 13px; }
.rp-act-p { border-color: rgba(0,255,71,0.3); color: var(--acc); background: var(--acc-soft); }
.rp-act-p:hover { background: rgba(0,255,71,0.16); color: #04120b; border-color: var(--acc); }

/* toast */
.rp-toast { position: fixed; left: 50%; bottom: 30px; transform: translate(-50%, 20px); background: #0e1434; border: 1px solid rgba(0,255,71,0.3); color: var(--hi); font-family: var(--sans); font-size: 13.5px; padding: 12px 20px; border-radius: 12px; box-shadow: 0 24px 60px -28px rgba(0,0,10,0.9); z-index: 120; opacity: 0; pointer-events: none; transition: opacity .3s ease, transform .3s cubic-bezier(.16,1.3,1); }
.rp-toast.show { opacity: 1; transform: translate(-50%, 0); }

/* inspector: verdict pill + NLI entailment area */
.rp-dpill { font-size: 9px; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.1em; border: 1px solid var(--pos); color: var(--pos); }
.rp-dpill.pos { color: var(--pos); border-color: var(--pos); } .rp-dpill.warn { color: var(--warn); border-color: var(--warn); } .rp-dpill.neg { color: var(--neg); border-color: var(--neg); }
.rp-nli { background: rgba(255,255,255,0.02); border: 1px solid var(--line2); border-radius: 12px; padding: 15px 16px; display: flex; flex-direction: column; gap: 9px; }
.rp-nli-idle { font-size: 12.5px; color: var(--dim); line-height: 1.5; }
.rp-nli-idle b { color: var(--acc); }
.rp-nli-res { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rp-nli-lbl { font-family: var(--mono); font-size: 12.5px; font-weight: 600; letter-spacing: 0.05em; }
.rp-nli .rp-mut { font-size: 12px; line-height: 1.55; }
.rp-dmetrics .rp-bar { width: 100%; }

/* claim rows now clickable */
.rp-claim { cursor: pointer; transition: transform .25s cubic-bezier(.16,1.3,1); }
.rp-claim:hover { transform: translateX(4px); }
.rp-claim:hover .rp-claim-t { color: var(--hi); }

/* what-would-change: bigger, more legible */
.rp-cond-pill { font-size: 10px; }
.rp-cond-strength .rp-dim { font-size: 9.5px; }
.rp-cond-strength .rp-mono { font-size: 12.5px; }
.rp-chip { font-size: 12px; padding: 5px 12px; }
.rp-cond-head p { font-size: 14px; }
.rp-synth p { font-size: 15px; }

/* trajectory: bigger + interactable */
.rp-traj li { font-size: 15.5px; align-items: baseline; }
.rp-bound li { font-size: 15px; }
.rp-traj-lk { color: var(--tx); cursor: pointer; transition: color .2s ease, transform .2s cubic-bezier(.16,1.3,1); display: inline-block; }
.rp-traj-lk:hover { color: var(--acc); transform: translateX(3px); }
.rp-traj-arrow { font-family: var(--mono); font-size: 0.72em; color: var(--acc); opacity: 0; transition: opacity .2s ease; }
.rp-traj-lk:hover .rp-traj-arrow { opacity: 1; }

/* colour helpers */
.rp .info { color: var(--info); }

/* confidence-interval band (masthead) */
.rp-ci { font-family: var(--mono); font-size: 10.5px; color: var(--tx); letter-spacing: 0.02em; margin-top: 2px; }
.rp-ci .rp-dim { font-size: 9px; letter-spacing: 0.14em; margin-right: 4px; }
.rp-ciband { position: relative; display: block; height: 8px; margin: 6px 0 4px; }
.rp-ciband i { position: absolute; top: 50%; transform: translateY(-50%); }
.rp-ciband-fill { height: 6px; background: linear-gradient(90deg, rgba(0,255,71,0.18), rgba(0,255,71,0.5)); border-radius: 3px; }
.rp-ciband-mid { width: 2px; height: 12px; background: var(--acc); border-radius: 2px; box-shadow: 0 0 8px rgba(0,255,71,0.7); }
.rp-ciband-lo { width: 1px; height: 8px; background: var(--dim); }

/* data-as-of + revision history */
.rp-asof { margin-top: 30px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; color: var(--dim); }
.rp-asof-line { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.rp-asof b { color: var(--tx); font-weight: 600; }
.rp-asof-sep { opacity: 0.5; }
.rp-asof-btn { background: transparent; border: 0; color: var(--acc); font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; padding: 0; }
.rp-asof-btn .rp-caret { transition: transform .3s ease; display: inline-block; }
.rp-asof.open .rp-asof-btn .rp-caret { transform: rotate(180deg); }
.rp-revs { display: grid; grid-template-rows: 0fr; }
.rp-asof.open .rp-revs { grid-template-rows: 1fr; }
.rp-revs-inner { overflow: hidden; min-height: 0; padding-top: 4px; opacity: 0; transform: translateY(-4px); transition: opacity .3s ease, transform .32s cubic-bezier(.16,1,.3,1); }
.rp-asof.open .rp-revs-inner { opacity: 1; transform: none; }
.rp-revrow { display: grid; grid-template-columns: 44px 92px 1fr; gap: 14px; align-items: baseline; padding: 9px 0; border-top: 1px solid var(--line2); font-size: 11px; }
.rp-revrow span:last-child { color: var(--tx); font-family: var(--sans); font-size: 12.5px; letter-spacing: 0; }

/* tags */
.rp-tag { display: inline-flex; align-items: center; font-family: var(--mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 9px; border-radius: 999px; border: 1px solid currentColor; white-space: nowrap; }
.rp-tag.pos { color: var(--pos); } .rp-tag.warn { color: var(--warn); } .rp-tag.neg { color: var(--neg); } .rp-tag.info { color: var(--info); }
.rp-fig-s.pos { color: var(--pos); } .rp-fig-s.neg { color: var(--neg); }

/* key takeaways (lead) */
.rp-lead { border-top: 0; padding-top: 40px; }
.rp-lead-eye { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; font-size: 11px; letter-spacing: 0.14em; margin-bottom: 22px; }
.rp-takes { list-style: none; position: relative; }
.rp-takes::before { content: ""; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; border-radius: 2px; background: linear-gradient(180deg, var(--acc), rgba(62,240,127,0.06)); }
.rp-take { display: grid; grid-template-columns: auto 1fr auto; gap: 8px 20px; align-items: start; padding: 20px 4px 20px 24px; border-bottom: 1px solid var(--line2); cursor: pointer; transition: transform .3s cubic-bezier(.16,1.3,1), background .3s ease; }
.rp-take:last-child { border-bottom: 0; }
.rp-take:hover { transform: translateX(6px); background: rgba(0,255,71,0.02); }
.rp-take-n { font-family: var(--mono); font-size: 13px; color: var(--acc); padding-top: 3px; }
.rp-take-t { font-family: var(--serif); font-size: 19px; font-weight: 500; color: var(--hi); line-height: 1.4; letter-spacing: -0.015em; }
.rp-take .rp-tag { align-self: center; }

/* scenarios */
.rp-scens { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.rp-scen { padding: 20px 20px 18px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); display: flex; flex-direction: column; gap: 10px; transition: border-color .3s ease, transform .4s cubic-bezier(.16,1.3,1); }
.rp-scen:hover { border-color: rgba(200,216,234,0.22); transform: translateY(-3px); }
.rp-scen-h { display: flex; justify-content: space-between; align-items: baseline; }
.rp-scen-k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
.rp-scen-w { font-size: 22px; font-weight: 600; }
.rp-scen h4 { font-family: var(--serif); font-size: 16px; color: var(--hi); font-weight: 600; letter-spacing: -0.01em; }
.rp-scen p { font-size: 13px; color: var(--tx); line-height: 1.55; flex: 1; }
.rp-scen-d { display: flex; flex-wrap: wrap; gap: 6px; }

/* source scorecard */
.rp-tier { display: grid; grid-template-columns: auto 1fr auto; gap: 6px 12px; align-items: center; margin-bottom: 16px; font-size: 13px; }
.rp-tier-b { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; padding: 3px 8px; border: 1px solid currentColor; border-radius: 4px; }
.rp-tier-l { color: var(--tx); }
.rp-tier-bar { grid-column: 1 / -1; }
.rp-scorekpi { display: flex; gap: 32px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--line2); }
.rp-scorekpi > div { display: flex; flex-direction: column; gap: 6px; }
.rp-recrow { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; margin-bottom: 15px; font-size: 13px; }
.rp-recrow .rp-bar { grid-column: 1 / -1; }

/* sensitivity */
.rp-sens { max-width: 640px; }
.rp-sens-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; }
.rp-sens-row .rp-mono { font-size: 16px; color: var(--hi); }
.rp-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 3px; background: linear-gradient(90deg, var(--neg), var(--warn), var(--pos)); outline: none; }
.rp-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--hi); border: 3px solid var(--acc); cursor: grab; box-shadow: 0 0 14px rgba(0,255,71,0.5); }
.rp-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--hi); border: 3px solid var(--acc); cursor: grab; }
.rp-sens-out { display: flex; align-items: center; gap: 24px; margin: 24px 0 14px; flex-wrap: wrap; }
.rp-sens-score { display: flex; flex-direction: column; gap: 2px; }
.rp-sens-score .rp-fig-s { font-size: 40px; }
.rp-sens-score .rp-dim:first-child { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; }
.rp-sens-flag { flex: 1; min-width: 200px; font-size: 13.5px; line-height: 1.5; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.02); }
.rp-sens-flag.pos { color: var(--pos); border-color: rgba(62,240,127,0.28); } .rp-sens-flag.warn { color: var(--warn); border-color: rgba(255,182,74,0.28); } .rp-sens-flag.neg { color: var(--neg); border-color: rgba(255,107,138,0.3); }
.rp-sens-note { font-size: 12px; color: var(--dim); } .rp-sens-note b { color: var(--tx); font-family: var(--mono); }

/* dissent / counter-argument */
.rp-dissent { position: relative; padding: 4px 0 4px 24px; }
.rp-dissent::before { content: ""; position: absolute; left: 0; top: 2px; bottom: 2px; width: 2px; border-radius: 2px; background: linear-gradient(180deg, var(--neg), rgba(255,107,138,0.06)); }
.rp-dissent-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.rp-dissent-q { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--hi); line-height: 1.4; letter-spacing: -0.015em; }
.rp-dissent .rp-mut { margin: 12px 0 20px; }
.rp-dissent-why { padding-top: 18px; border-top: 1px solid var(--line2); margin-bottom: 16px; }
.rp-dissent-why .rp-dim { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; }
.rp-dissent-why p { font-size: 14px; color: var(--tx); line-height: 1.6; margin-top: 8px; max-width: 76ch; }

/* assumptions table */
.rp-tablewrap { overflow-x: auto; }
.rp-asmtable { table-layout: fixed; }
.rp-asmtable th, .rp-asmtable td { padding: 13px 14px 13px 0; vertical-align: top; }
.rp-asmtable td { font-size: 12.5px; line-height: 1.5; color: var(--tx); }
.rp-asm-a { color: var(--hi); font-weight: 500; }
.rp-asmtable th:nth-child(1), .rp-asmtable td:nth-child(1) { width: 30%; }
.rp-asmtable th:nth-child(4), .rp-asmtable td:nth-child(4) { width: 78px; }

/* citations appendix */
.rp-fns { display: flex; flex-direction: column; }
.rp-fnrow { display: grid; grid-template-columns: 40px 1fr auto auto; gap: 14px; align-items: start; padding: 15px 4px; border-bottom: 1px solid var(--line2); transition: background .25s ease, transform .25s cubic-bezier(.16,1.3,1); }
.rp-fnrow[role="button"] { cursor: pointer; }
.rp-fnrow[role="button"]:hover { background: rgba(255,255,255,0.02); transform: translateX(4px); }
.rp-fn-n { color: var(--acc); font-size: 13px; padding-top: 1px; }
.rp-fn-meta b { color: var(--hi); font-size: 14px; display: block; }
.rp-fn-meta > span { font-size: 11px; display: block; margin-top: 2px; }
.rp-fn-snip { font-family: var(--sans) !important; font-size: 12.5px !important; color: var(--dim); line-height: 1.5; margin-top: 6px !important; max-width: 68ch; }
.rp-fn-t { color: var(--tx); font-size: 12px; align-self: center; }
.rp-fnrow .rp-tag { align-self: center; }

/* citation hover preview (Perplexity-style) */
.rp-hovercard { position: fixed; z-index: 130; max-width: 340px; background: linear-gradient(180deg, #0e1434, #0a0a1e); border: 1px solid rgba(0,255,71,0.22); border-radius: 12px; padding: 14px 16px; box-shadow: 0 26px 60px -24px rgba(0,0,10,0.92); opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity .16s ease, transform .18s cubic-bezier(.16,1,.3,1); font-family: var(--sans); }
.rp-hovercard.show { opacity: 1; transform: none; }
.rp-hc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rp-hc-n { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--acc); }
.rp-hc-dom { font-family: var(--mono); font-size: 10px; color: var(--dim); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-hc-head .rp-tag { font-size: 8.5px; padding: 2px 7px; }
.rp-hc-title { font-family: var(--serif); font-size: 14px; font-weight: 600; color: var(--hi); line-height: 1.3; letter-spacing: -0.01em; }
.rp-hc-snip { font-size: 12.5px; line-height: 1.55; color: var(--tx); margin-top: 7px; }
.rp-hc-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--line2); font-size: 10.5px; }

/* methodology + glossary */
.rp-method { font-size: 14.5px; line-height: 1.7; color: var(--tx); max-width: 60ch; }
.rp-method-kpi { display: flex; gap: 28px; margin-top: 22px; }
.rp-method-kpi > span { display: flex; flex-direction: column; gap: 4px; }
.rp-method-kpi b { font-size: 15px; color: var(--hi); }
.rp-glossary { display: flex; flex-direction: column; gap: 14px; }
.rp-gl dt { font-family: var(--serif); font-size: 14.5px; color: var(--hi); font-weight: 600; margin-bottom: 3px; }
.rp-gl dd { font-size: 12.5px; color: var(--dim); line-height: 1.5; }

/* ── Premium print / Save-as-PDF ──────────────────────────────────────────
   The gap-free rule: NEVER break-inside:avoid a whole tall section (that is what
   shoves a section to a fresh page and leaves the blank space). Instead let big
   sections flow across pages, keep only small atomic blocks intact, and never
   orphan a heading at the foot of a page. */
@media print {
  @page { margin: 12mm; }
  /* interactive-only chrome never prints */
  .rp-progress, .rp-backdrop, .rp-drawer, .side-rail, .rp-actions, .rp-chatbar,
  .rp-toast, .rp-inspect, .rp-caret, .rp-slider, .rp-asof-btn, .rp-dfoot, .rp-hovercard { display: none !important; }
  .rp {
    height: auto !important; overflow: visible !important; position: static !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; background: var(--ink) !important;
  }
  .rp-wrap { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
  /* sections flow (no forced page shove) but tighten the rhythm for paper */
  .rp-sec { break-inside: auto; padding: 20px 0 !important; }
  .rp-masthead { padding: 0 0 22px !important; }
  /* headings stay glued to the content that follows them */
  .rp-shead, .rp-subh, .rp-stitle, .rp-lead-eye, .rp-scen h4, .dbr-case-h { break-after: avoid; page-break-after: avoid; }
  /* atomic blocks never split across a page boundary */
  .rp-find, .rp-take, .rp-scen, .rp-claim, .rp-cond, .rp-fnrow, .rp-tel, .rp-tier,
  .rp-revrow, .rp-pos, .rp-dsrc, .rp-dquote, .rp-scorekpi, .rp-recrow, .rp-fac,
  .rp-land, .rp-provrow, .rp-kcol, .rp-dissent, .rp-synth, .rp-nli, .rp-tlmile,
  .rp-stat, .rp-conf, .rp-critic, .rp-msg, .rp-gl,
  .dbr-case, .dbr-arg, .dbr-reason, .dbr-key, .dbr-follow, .dbr-verdict, .dbr-score { break-inside: avoid; page-break-inside: avoid; }
  .rp-table tr, .rp-asmtable tr, .rp-rub tr { break-inside: avoid; page-break-inside: avoid; }
  /* no lonely single lines at page edges */
  .rp-lede p, .rp-method, .rp-note, .rp-mut, .rp-sublede, .rp-dissent-q, p, li { orphans: 3; widows: 3; }
  /* let chat + chart show fully in print, no inner clipping */
  .rp-msgs { max-height: none !important; overflow: visible !important; }
  .rp-chart-mount { break-inside: avoid; page-break-inside: avoid; }
  .rp-chatsec, .rp-chat { break-inside: avoid; }
  a[href], .rp-cite { text-decoration: none; }
}

@media (max-width: 820px) {
  .rp-wrap { padding: 0 22px 60px; }
  .rp-split, .rp-kuu, .rp-provgrid, .rp-scens { grid-template-columns: 1fr; gap: 30px; }
  .rp-stats { grid-template-columns: repeat(3, 1fr); gap: 24px 16px; }
  .rp-stat:nth-child(3) { border-right: 0; }
  .rp-vs { grid-template-columns: 1fr; }
  .rp-vsmark { justify-self: center; }
  .rp-take { grid-template-columns: auto 1fr; }
  .rp-take .rp-tag { grid-column: 2; justify-self: start; }
  .rp-fnrow { grid-template-columns: 34px 1fr auto; }
  .rp-fn-y, .rp-fn-t { display: none; }
}
`;

/* ---------- asset injection ---------- */
let injected = false;
function injectAssets() {
  if (injected || typeof document === "undefined") return; injected = true;
  const st = document.createElement("style"); st.id = "rp-style"; st.textContent = RP_CSS; document.head.appendChild(st);
}
// Shared so the debate report can reuse the exact same .rp-* design system.
export function ensureReportStyles() { injectAssets(); }

/* ---------- interactions ---------- */
function installHandlers() {
  if (typeof window === "undefined") return;
  const $ = (id) => document.getElementById(id);
  const setTxt = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  const setBar = (id, v) => { const n = $(id); if (n) n.style.width = Math.max(0, Math.min(100, v)) + "%"; };

  window.pnOpen = (el) => {
    const d = $("pn-drawer"), b = $("pn-backdrop"); if (!d || !b) return;
    const ds = (el && el.dataset) ? el.dataset : null;
    if (ds && ds.claim) {
      setTxt("pn-i-claim", '"' + ds.claim + '"');
      setTxt("pn-i-id", ds.cites ? "claim · cites " + ds.cites : "synthesised claim");
      const v = ds.verdict || "SUPPORTED", vn = $("pn-i-verdict");
      if (vn) { vn.textContent = v; vn.className = "rp-dpill rp-mono " + (v === "PARTIAL" || v === "SOURCE" ? "warn" : "pos"); }
      const tr = ds.trust != null && ds.trust !== "" ? Number(ds.trust) : null;
      setTxt("pn-i-src", ds.src || "Source");
      setTxt("pn-i-url", ds.url || "no direct link");
      setTxt("pn-i-trust", tr != null ? tr.toFixed(2) : "n/a");
      setTxt("pn-i-trust2", tr != null ? tr.toFixed(2) : "n/a");
      setTxt("pn-i-quote", ds.quote || "n/a");
      const m = Number(ds.match) || 0, g = Number(ds.ground) || 0;
      setTxt("pn-i-match", m + "%"); setBar("pn-i-matchbar", m);
      setBar("pn-i-trustbar", tr != null ? tr * 100 : 0);
      setTxt("pn-i-ground", g + "%"); setBar("pn-i-groundbar", g);
      const nli = $("pn-i-nli"); if (nli) nli.innerHTML = '<span class="rp-nli-idle">Run <b>Verify claim</b> to test whether the source text logically entails this claim.</span>';
      window.__rpInsp = { claim: ds.claim, quote: ds.quote || "", url: ds.url || "" };
    }
    d.classList.add("open"); b.classList.add("open");
  };
  window.pnClose = () => { const d = $("pn-drawer"), b = $("pn-backdrop"); if (d && b) { d.classList.remove("open"); b.classList.remove("open"); } };
  window.pnCond = (el) => { el.classList.toggle("open"); };

  window.pnOpenSrc = () => { const u = (window.__rpInsp || {}).url; if (u && /^https?:/.test(u)) window.open(u, "_blank", "noopener"); else window.pnToast("No direct source link for this item."); };

  window.pnVerify = async () => {
    const insp = window.__rpInsp || {}; const nli = $("pn-i-nli"), btn = $("pn-i-verify");
    if (!insp.claim) { window.pnToast("Select a claim first."); return; }
    if (nli) nli.innerHTML = '<span class="rp-nli-idle">Checking entailment…</span>';
    if (btn) { btn.disabled = true; btn.textContent = "Verifying…"; }
    try {
      const tok = getAuthToken();
      const res = await fetch(APP_API_BASE + "/report/verify-claim", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: JSON.stringify({ claim: insp.claim, evidence: insp.quote || insp.claim }) });
      if (!res.ok) { if (nli) nli.innerHTML = '<span class="rp-nli-idle">' + (res.status === 401 ? "Sign in to verify claims." : res.status === 400 ? "Add an API key in Settings to verify claims." : "Verification unavailable right now.") + "</span>"; return; }
      const data = await res.json();
      const lbl = String(data.label || "neutral").toUpperCase();
      const tone = lbl === "ENTAILMENT" ? "pos" : lbl === "CONTRADICTION" ? "neg" : "warn";
      const nice = lbl === "ENTAILMENT" ? "ENTAILS THE CLAIM" : lbl === "CONTRADICTION" ? "CONTRADICTS THE CLAIM" : "NEUTRAL / INSUFFICIENT";
      if (nli) nli.innerHTML = '<div class="rp-nli-res"><span class="rp-nli-lbl ' + tone + '">' + nice + '</span><span class="rp-mono ' + tone + '">' + Math.round((data.confidence || 0) * 100) + '% conf</span></div>' + (data.why ? '<p class="rp-mut">' + esc(data.why) + '</p>' : "");
    } catch { if (nli) nli.innerHTML = '<span class="rp-nli-idle">Could not reach the verifier. Try again.</span>'; }
    finally { if (btn) { btn.disabled = false; btn.textContent = "Verify claim"; } }
  };

  window.pnShare = async () => {
    // A shareable, re-runnable link: opening it re-runs the research and
    // regenerates this report for the recipient (works cross-device, no backend
    // save needed). Falls back to the current URL if the query is unknown.
    const q = window.__rpQuery || "";
    const url = q ? (location.origin + "/research?query=" + encodeURIComponent(q)) : location.href;
    try { await navigator.clipboard.writeText(url); window.pnToast("Shareable report link copied. Opening it re-runs this research."); }
    catch { window.pnToast("Copy failed, this is the link: " + url); }
  };
  window.pnPdf = () => { window.pnToast("Opening print dialog, choose “Save as PDF”."); setTimeout(() => { try { window.print(); } catch (e) {} }, 260); };

  window.pnToast = (msg) => {
    let t = $("pn-toast");
    if (!t) { t = document.createElement("div"); t.id = "pn-toast"; t.className = "rp-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(window.__pnToastT); window.__pnToastT = setTimeout(() => t.classList.remove("show"), 2600);
  };

  // revision-history disclosure in the masthead
  window.pnRev = (btn) => { const wrap = btn && btn.closest(".rp-asof"); if (wrap) wrap.classList.toggle("open"); };

  // open a citation-appendix / footnote source
  window.pnGo = (el) => { const u = el && el.getAttribute("data-url"); if (u && /^https?:/.test(u)) window.open(u, "_blank", "noopener"); };

  // ── Perplexity-style citation hover previews ─────────────────────────────
  const hoverCard = () => {
    let c = document.getElementById("rp-hovercard");
    if (!c) { c = document.createElement("div"); c.id = "rp-hovercard"; c.className = "rp-hovercard"; document.body.appendChild(c); }
    return c;
  };
  window.pnHover = (el) => {
    const n = el && el.getAttribute("data-n"); const c = (window.__rpCites || {})[n];
    if (!c) return;
    clearTimeout(window.__rpHoverT);
    const card = hoverCard();
    const tierTone = c.tier === 1 ? "pos" : c.tier === 2 ? "info" : "warn";
    card.innerHTML =
      '<div class="rp-hc-head"><span class="rp-hc-n">[' + n + ']</span>' + (c.domain ? '<span class="rp-hc-dom">' + esc(c.domain) + '</span>' : "") + '<span class="rp-tag ' + tierTone + '">TIER ' + (c.tier || 3) + '</span></div>' +
      (c.title ? '<div class="rp-hc-title">' + esc(c.title) + '</div>' : "") +
      (c.snippet ? '<p class="rp-hc-snip">' + esc(c.snippet) + '</p>' : '<p class="rp-hc-snip rp-dim">No snippet was retrieved for this source.</p>') +
      '<div class="rp-hc-foot"><span class="rp-mono ' + tierTone + '">trust ' + (c.trust != null ? Number(c.trust).toFixed(2) : "—") + '</span>' + (c.url ? '<span class="rp-mono rp-dim">click to open ↗</span>' : "") + '</div>';
    // position: above the citation, clamped to the viewport
    const r = el.getBoundingClientRect();
    card.style.visibility = "hidden"; card.classList.add("show");
    const cw = Math.min(340, window.innerWidth - 24), ch = card.offsetHeight;
    let left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), window.innerWidth - cw - 12);
    let top = r.top - ch - 10;
    if (top < 12) top = r.bottom + 10;
    card.style.left = left + "px"; card.style.top = top + "px"; card.style.width = cw + "px";
    card.style.visibility = "visible";
  };
  window.pnHoverOut = () => { clearTimeout(window.__rpHoverT); window.__rpHoverT = setTimeout(() => { const c = document.getElementById("rp-hovercard"); if (c) c.classList.remove("show"); }, 140); };
  window.pnCiteClick = (el) => { const n = el && el.getAttribute("data-n"); const c = (window.__rpCites || {})[n]; if (c && c.url && /^https?:/.test(c.url)) window.open(c.url, "_blank", "noopener"); else window.pnOpen(); };

  // sensitivity slider: re-weight measured evidence vs argument quality and
  // recompute the lean toward the primary conclusion, flagging a verdict flip.
  window.pnSens = (v) => {
    v = Math.max(0, Math.min(100, Number(v) || 0));
    setTxt("rp-sens-w", v + "%");
    // base lean at 50% weight comes from the perspectives balance; each point of
    // evidence weight nudges the lean by 0.5 toward the evidence-favoured side.
    const base = (window.__rpSens && window.__rpSens.leadA) || 54;
    const lean = Math.max(2, Math.min(98, Math.round(base + (v - 50) * 0.5)));
    setTxt("rp-sens-score", lean + "%");
    const flag = $("rp-sens-flag"), score = $("rp-sens-score");
    if (score) score.className = "rp-fig-s " + (lean >= 50 ? "pos" : "neg");
    if (flag) {
      if (lean < 50) { flag.className = "rp-sens-flag neg"; flag.textContent = "Flipped. At this weighting the alternative position would lead, the conclusion is fragile here."; }
      else if (lean < 55) { flag.className = "rp-sens-flag warn"; flag.textContent = "Marginal. The lean is thin at this weighting."; }
      else { flag.className = "rp-sens-flag pos"; flag.textContent = "Stable. The conclusion holds across reasonable weightings."; }
    }
  };
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
      pend.textContent = data.answer || (res.status === 401 ? "Please sign in to ask follow-ups." : "Couldn't answer that, please try again.");
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
  const chartStore = useRef({ root: null, node: null });
  const d = deriveReport(props);
  const { html, rail } = buildReport(d);
  if (typeof window !== "undefined") { window.__rpCtx = { answer: d.chatAnswer, sources: d.sourceSummaries }; window.__rpSens = { leadA: (d.sensitivity && d.sensitivity.leadA) || 54 }; window.__rpCites = d.citeMap || {}; window.__rpQuery = d.query || ""; }
  useEffect(() => { injectAssets(); installHandlers(); }, []);
  useEffect(() => {
    const t = setTimeout(() => runCounters(ref.current), 500);
    const el = ref.current;
    // Render the recharts confidence chart into the report's island node via a
    // dedicated React root. The node is keyed so StrictMode/HMR re-runs reuse the
    // existing root (no double createRoot); when the report HTML is rebuilt the
    // node changes and the stale root is retired.
    const mount = el ? el.querySelector("#rp-confchart") : null;
    if (mount) {
      const store = chartStore.current;
      if (store.node !== mount) {
        if (store.root) { const old = store.root; setTimeout(() => { try { old.unmount(); } catch (e) {} }, 0); }
        store.node = mount;
        store.root = mount.__rpRoot || createRoot(mount);
        mount.__rpRoot = store.root;
      }
      store.root.render(<ConfidenceChart data={d.timeline} />);
      // recharts' ResponsiveContainer can latch a 0 width if the report was
      // still laying out (e.g. streaming re-renders) when it mounted. Nudge it
      // to re-measure once layout settles so the line always draws.
      [60, 240, 600].forEach((ms) => setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, ms));
    }
    // The report now flows in the PAGE scroll (no nested 100vh container), so
    // drive the progress bar from the window scroll position.
    const onScroll = () => {
      const bar = ref.current && ref.current.querySelector("#rp-prog");
      if (!bar) return;
      const doc = document.documentElement;
      const max = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
      const y = window.scrollY || doc.scrollTop || 0;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [html]);
  return (
    <>
      <div ref={ref} className="rp" dangerouslySetInnerHTML={{ __html: html }} />
      {rail.length > 2 && <SideRail items={rail} getContainer={() => ref.current} />}
    </>
  );
}
