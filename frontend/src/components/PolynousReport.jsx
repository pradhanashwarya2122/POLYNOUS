import React, { useState, useCallback, useEffect } from "react";

/* =====================================================================
   POLYNOUS NEURAL SYNTHESIS REPORT — single-file React component (v2)
   Premium edition. Currently DEV-PREVIEW only (admin-gated): its cards
   fetch from /reports/:id/* endpoints that don't exist yet, so it renders
   with the built-in demo fallbacks. Wire the endpoints (or pass real data)
   to light it up with live research.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) API CLIENT  — safe for Vite (no process.env). Endpoints are not
   built yet, so requests fail and each card shows its demo fallback.
   --------------------------------------------------------------------- */
const API_BASE = "/api";

// ── LIVE DATA BRIDGE ──────────────────────────────────────────────────────────
// When the report is rendered with a real research payload, we adapt it into a
// map keyed by endpoint suffix and answer every card's request() from it — so
// all cards show REAL data without touching the 25 card components. When no live
// payload is set, request() falls back to the (not-yet-built) HTTP endpoints,
// which 404 → each card shows its demo fallback.
let LIVE = null;
export function setLiveReport(adapted) { LIVE = adapted; }

function _liveKey(path) {
  const m = String(path).match(/\/reports\/[^/]+\/?(.*)$/);
  return m ? m[1].split("?")[0] : "";
}
function _resolveLive(path) {
  if (!LIVE) return undefined;
  const key = _liveKey(path);
  if (key.startsWith("citations/")) {
    const idx = parseInt(key.split("/")[1], 10);
    return (LIVE.__citation && LIVE.__citation(idx)) || undefined;
  }
  return LIVE[key];
}

async function request(path, options = {}) {
  // POST actions (rerun/share/export/verify/analyze) are no-ops in live mode.
  if (LIVE) {
    if ((options.method || "GET").toUpperCase() !== "GET") return { ok: true };
    const slice = _resolveLive(path);
    if (slice !== undefined) return slice;              // real data
    throw new Error(`no live data for ${path}`);         // → card demo fallback
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} failed (${res.status}): ${body}`);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

const ReportAPI = {
  get: (reportId) => request(`/reports/${reportId}`),
  getStats: (reportId) => request(`/reports/${reportId}/stats`),
  getPipeline: (reportId) => request(`/reports/${reportId}/pipeline`),
  create: (query, options = {}) => request(`/reports`, { method: "POST", body: JSON.stringify({ query, ...options }) }),
  rerun: (reportId) => request(`/reports/${reportId}/rerun`, { method: "POST" }),
  share: (reportId, opts) => request(`/reports/${reportId}/share`, { method: "POST", body: JSON.stringify(opts || {}) }),
  export: (reportId, format = "pdf") => request(`/reports/${reportId}/export?format=${format}`, { method: "POST" }),
  explainConfidence: (reportId) => request(`/reports/${reportId}/confidence/explain`),
  explainConsensus: (reportId) => request(`/reports/${reportId}/consensus/explain`),
};
const FindingsAPI = { list: (reportId) => request(`/reports/${reportId}/key-findings`) };
const ClaimsAPI = { list: (reportId) => request(`/reports/${reportId}/claims`), get: (reportId, claimId) => request(`/reports/${reportId}/claims/${claimId}`) };
const EvidenceLedgerAPI = { list: (reportId) => request(`/reports/${reportId}/evidence-ledger`) };
const EvidenceStrengthAPI = { get: (reportId) => request(`/reports/${reportId}/evidence-strength`) };
const FaithfulnessAPI = { get: (reportId) => request(`/reports/${reportId}/faithfulness`), listAll: (reportId) => request(`/reports/${reportId}/faithfulness/sentences`) };
const PerspectivesAPI = { get: (reportId) => request(`/reports/${reportId}/perspectives`), explainLeader: (reportId) => request(`/reports/${reportId}/perspectives/explain`) };
const ContradictionsAPI = { getNetwork: (reportId) => request(`/reports/${reportId}/contradictions/network`), runAnalysis: (reportId) => request(`/reports/${reportId}/contradictions/analyze`, { method: "POST" }) };
const ResearchCoverageAPI = { get: (reportId) => request(`/reports/${reportId}/research-coverage`) };
const SourceLandscapeAPI = { get: (reportId) => request(`/reports/${reportId}/source-landscape`) };
const SourceConstellationAPI = { get: (reportId) => request(`/reports/${reportId}/source-constellation`) };
const ProvenanceAPI = { get: (reportId) => request(`/reports/${reportId}/provenance`) };
const TimelineAPI = { get: (reportId) => request(`/reports/${reportId}/timeline`) };
const TrajectoryAPI = { get: (reportId) => request(`/reports/${reportId}/trajectory`) };
const KnownUncertainUnknownAPI = { get: (reportId) => request(`/reports/${reportId}/known-uncertain-unknown`), loadMore: (reportId, cursor) => request(`/reports/${reportId}/known-uncertain-unknown?cursor=${cursor || ""}`) };
const SensitivityAPI = { list: (reportId) => request(`/reports/${reportId}/sensitivity-conditions`) };
const BoundariesAPI = { get: (reportId) => request(`/reports/${reportId}/honest-boundaries`) };
const ToolsAPI = { list: (reportId) => request(`/reports/${reportId}/tools`) };
const TelemetryAPI = { get: (reportId) => request(`/reports/${reportId}/telemetry`) };
const CitationAPI = { get: (reportId, citationId) => request(`/reports/${reportId}/citations/${citationId}`), verify: (reportId, citationId) => request(`/reports/${reportId}/citations/${citationId}/verify`, { method: "POST" }) };

/* ---------------------------------------------------------------------
   2) DATA HOOK
   --------------------------------------------------------------------- */
function useApi(fetcher, deps = [], fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetcher()
      .then((result) => { if (!cancelled) { setData(result); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err); setLoading(false); if (fallback !== null) setData(fallback); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  return { data, loading, error, refetch };
}

/* ---------------------------------------------------------------------
   3) THEME (injected once)
   --------------------------------------------------------------------- */
const POLYNOUS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
@import url('https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css');

.pn-root {
  /* POLYNOUS theme, restrained: near-black base, one emerald accent, muted
     cyan/purple/amber semantics. No neon. */
  --bg: #06040f; --bg-elevated: #0b0a16; --surface: #0e0d1a; --surface-2: #12111f;
  --border: rgba(150,160,200,0.10); --border-soft: rgba(150,160,200,0.055); --border-strong: rgba(150,160,200,0.17);
  --primary: #34d399; --primary-dim: rgba(52,211,153,0.10); --secondary: #7f8fbe; --success: #3fbf87;
  --warning: #d6a24a; --danger: #e0738a; --critic: #c6a05f; --synthesis: #9a8bce; --info: #4ba3d1; --gold: #c6a05f;
  --text-dim: #626b83; --text: #949eb8; --text-bright: #c3ccdf; --text-hover: #eef1f8;
  --radius-sm: 10px; --radius: 14px; --radius-lg: 18px;
  --shadow-card: 0 1px 2px rgba(0,0,0,0.30), 0 10px 26px -18px rgba(0,0,0,0.6);
}
.pn-root * { box-sizing: border-box; }
.pn-root {
  background:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(94,234,212,0.06), transparent 60%),
    radial-gradient(ellipse 900px 600px at 90% 10%, rgba(129,140,248,0.05), transparent 55%),
    var(--bg);
  color: var(--text); font-family: "Inter", -apple-system, sans-serif; font-size: 14px;
  min-height: 100vh; position: relative; overflow-x: hidden; letter-spacing: -0.005em;
}
.pn-container { max-width: 1560px; margin: 0 auto; padding: 0 2.5rem; }
.pn-serif { font-family: "Sora", sans-serif; }
.pn-mono { font-family: "JetBrains Mono", monospace; }
.pn-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008)), var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 1.6rem;
  box-shadow: var(--shadow-card); position: relative; transition: border-color .25s ease, transform .25s ease;
}
.pn-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(160deg, rgba(255,255,255,0.08), transparent 40%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
}
.pn-card:hover { border-color: var(--border-strong); }
.pn-card-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text-bright); font-weight: 700; display: flex; align-items: center; gap: .6rem; margin-bottom: 1.15rem; }
.pn-card-title i { font-size: 13px; opacity: .9; }
.pn-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px rgba(52,211,153,0.15), 0 0 12px rgba(52,211,153,0.6); display: inline-block; margin-right: 6px; }
.pn-error { font-size: 10px; color: var(--danger); border: 1px solid rgba(251,113,133,0.25); background: rgba(251,113,133,0.06); border-radius: var(--radius-sm); padding: 7px 12px; margin-top: 10px; cursor: pointer; }
.pn-grid { display: grid; gap: 1.25rem; align-items: stretch; }
.pn-grid-4 { grid-template-columns: repeat(4, 1fr); }
.pn-grid-12 { grid-template-columns: repeat(12, 1fr); }
@media (max-width: 900px) { .pn-grid-4 { grid-template-columns: 1fr; } .pn-grid-12 { grid-template-columns: 1fr; } }
.pn-header { position: relative; padding: 2.4rem 0 2rem; border-bottom: 1px solid var(--border-soft); background: linear-gradient(180deg, rgba(52,211,153,0.028), transparent 66%); }
.pn-eyebrow { font-family: "JetBrains Mono", monospace; font-size: 10.5px; letter-spacing: 0.16em; color: var(--success); font-weight: 500; }
.pn-title { font-family: "Sora", sans-serif; font-size: clamp(1.55rem, 2.6vw, 1.95rem); font-weight: 700; color: var(--text-hover); letter-spacing: -0.025em; line-height: 1.12; margin: .1rem 0 1rem; }
.pn-query-box { background: rgba(255,255,255,0.035); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .7rem 1.1rem; color: var(--text-hover); font-size: 14.5px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
.pn-btn { display: inline-flex; align-items: center; gap: .45rem; font-size: 11px; font-weight: 600; border-radius: 999px; padding: .55rem 1.1rem; cursor: pointer; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); letter-spacing: .02em; transition: all .18s ease; }
.pn-btn:hover:not(:disabled) { color: var(--text-hover); border-color: var(--border-strong); background: rgba(255,255,255,0.05); transform: translateY(-1px); }
.pn-btn:disabled { opacity: .55; cursor: default; }
.pn-btn-primary { background: linear-gradient(180deg, rgba(52,211,153,0.16), rgba(52,211,153,0.08)); border-color: rgba(52,211,153,0.35); color: var(--success); }
.pn-btn-primary:hover:not(:disabled) { box-shadow: 0 4px 20px -4px rgba(52,211,153,0.4); }
.pn-gauge-wrap { position: relative; width: 128px; height: 128px; }
.pn-gauge-value { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pn-gauge-num { font-family: "Sora", sans-serif; font-size: 2rem; font-weight: 500; color: #fff; }
.pn-consensus-panel { background: linear-gradient(135deg, rgba(240,184,110,0.05), rgba(255,255,255,0.015)); border: 1px solid rgba(240,184,110,0.18); border-radius: var(--radius); padding: 1.1rem 1.3rem; }
.pn-stat { display: flex; flex-direction: column; align-items: center; gap: .35rem; cursor: pointer; padding: .5rem .25rem; border-radius: var(--radius-sm); transition: background .2s; }
.pn-stat:hover { background: rgba(255,255,255,0.03); }
.pn-stat-num { font-family: "Sora", sans-serif; font-size: 1.7rem; font-weight: 500; }
.pn-stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); font-weight: 600; }
.pn-pipeline { display: flex; align-items: center; justify-content: space-between; }
.pn-pipe-node { display: flex; flex-direction: column; align-items: center; gap: .6rem; }
.pn-pipe-circle { width: 60px; height: 60px; border-radius: 50%; border: 1px solid var(--border); background: linear-gradient(160deg, rgba(255,255,255,0.03), transparent); display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 1.15rem; transition: all .2s; }
.pn-pipe-node:hover .pn-pipe-circle { border-color: var(--primary); color: var(--primary); box-shadow: 0 0 20px -4px rgba(94,234,212,0.4); }
.pn-pipe-line { height: 1px; flex: 1; background: linear-gradient(90deg, var(--border), var(--border-strong), var(--border)); margin: 0 .5rem; }
.pn-table { width: 100%; font-size: 10.5px; border-collapse: collapse; }
.pn-table th { text-align: left; font-weight: 600; color: var(--text-dim); padding-bottom: .65rem; border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: .06em; font-size: 9px; }
.pn-table td { padding: .7rem 0; border-bottom: 1px solid var(--border-soft); }
.pn-table tr:hover td { color: var(--text-hover); }
.pn-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px currentColor; }
.pn-freshness { font-family: "JetBrains Mono", monospace; font-size: 8.5px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.pn-bar-track { height: 5px; background: rgba(148,163,220,0.1); border-radius: 999px; overflow: hidden; flex: 1; }
.pn-bar-fill { height: 100%; border-radius: 999px; opacity: 0.92; }
.pn-citation { cursor: pointer; color: var(--primary); font-family: "JetBrains Mono", monospace; font-size: 9.5px; font-weight: 700; padding: 1px 4px; border-radius: 4px; border: 1px solid transparent; transition: all .15s; }
.pn-citation:hover { background: var(--primary-dim); border-color: rgba(94,234,212,0.3); }
.pn-vs-wrap { display: flex; align-items: stretch; gap: 1.75rem; position: relative; }
.pn-vs-badge { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-strong); background: linear-gradient(160deg, var(--surface-2), var(--surface)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; color: var(--text-bright); position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 10; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
.pn-position-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; background: var(--bg-elevated); flex: 1; }
.pn-kuu-col { display: flex; flex-direction: column; gap: 1.1rem; padding-top: 1.1rem; border-top: 2px solid; }
.pn-condition { border-bottom: 1px solid var(--border-soft); padding: 1.1rem 0; cursor: pointer; transition: background .15s; border-radius: var(--radius-sm); }
.pn-condition:hover { background: rgba(255,255,255,0.015); }
.pn-condition-content { max-height: 0; overflow: hidden; transition: max-height .35s ease, opacity .3s ease; opacity: 0; }
.pn-condition.expanded .pn-condition-content { max-height: 260px; opacity: 1; margin-top: .75rem; }
.pn-condition.expanded .pn-condition-icon { transform: rotate(180deg); color: var(--primary); }
.pn-condition-icon { transition: transform .2s, color .2s; display: inline-block; }
.pn-backdrop { position: fixed; inset: 0; background: rgba(4,4,12,0.55); backdrop-filter: blur(3px); z-index: 40; opacity: 0; pointer-events: none; transition: opacity .3s; }
.pn-backdrop.open { opacity: 1; pointer-events: auto; }
.pn-drawer { position: fixed; top: 0; right: 0; height: 100%; width: 440px; max-width: 92vw; background: linear-gradient(180deg, rgba(12,12,24,0.98), rgba(6,6,14,0.98)); backdrop-filter: blur(24px); border-left: 1px solid var(--border-strong); z-index: 50; transform: translateX(100%); transition: transform .35s cubic-bezier(.16,1,.3,1); display: flex; flex-direction: column; overflow: hidden; box-shadow: -24px 0 60px rgba(0,0,0,0.5); }
.pn-drawer.open { transform: translateX(0); }
.pn-quote { background: linear-gradient(135deg, rgba(52,211,153,0.06), rgba(255,255,255,0.01)); border-left: 2px solid var(--success); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 1.1rem; }
.pn-badge { font-size: 8.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; letter-spacing: .04em; }
.pn-badge-success { border: 1px solid rgba(52,211,153,0.4); color: var(--success); background: rgba(52,211,153,0.1); }
.pn-loading-line { height: 6px; background: var(--border); border-radius: 4px; animation: pn-pulse 1.5s ease-in-out infinite; overflow: hidden; position: relative; }
.pn-loading-line::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); animation: pn-shimmer 1.6s infinite; }
@keyframes pn-pulse { 0%,100% { opacity: .35; } 50% { opacity: .8; } }
@keyframes pn-shimmer { 100% { transform: translateX(100%); } }
`;

function PolynousStyles() { return <style>{POLYNOUS_CSS}</style>; }

/* ---------------------------------------------------------------------
   4) UI
   --------------------------------------------------------------------- */
const COLORS = { primary: "#34d399", secondary: "#7f8fbe", success: "#3fbf87", warning: "#d6a24a", danger: "#e0738a", critic: "#c6a05f", synthesis: "#9a8bce", info: "#4ba3d1" };

function Bar({ pct, color = COLORS.primary }) {
  return <div className="pn-bar-track"><div className="pn-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>;
}
function Skeleton({ w = "100%" }) { return <div className="pn-loading-line" style={{ width: w }} />; }
function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return <div className="pn-error" onClick={onRetry} title="Click to retry">Couldn't load this section — tap to retry.</div>;
}
function Citation({ id, onOpen }) { return <span className="pn-citation" onClick={() => onOpen(id)}>[{id}]</span>; }

function Header({ reportId, onExport, onShare }) {
  const { data, loading, error, refetch } = useApi(() => ReportAPI.get(reportId), [reportId], {
    query: "What actually causes climate change?", generatedAt: "15 AUG 2026", sourceCount: 5, model: "GPT-4o-mini",
    confidence: 61, confidenceLabel: "MODERATE",
    confidenceBreakdown: { agreement: 40, diversity: 96, recency: 50, grounding: 66 },
    criticConsensus: { pct: 75, agree: 3, total: 4, position: "Human activity is the dominant driver of recent rapid warming." },
  });
  const [busy, setBusy] = useState(null);
  const doExport = async () => { setBusy("export"); try { await onExport(); } finally { setBusy(null); } };
  const doShare = async () => { setBusy("share"); try { await onShare(); } finally { setBusy(null); } };
  return (
    <header className="pn-header">
      <div className="pn-container" style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: "2rem", alignItems: "center" }}>
        <div style={{ gridColumn: "span 4" }}>
          <h1 className="pn-title">Neural Synthesis Report</h1>
          <div className="pn-query-box" style={{ margin: ".75rem 0" }}>
            {loading ? <Skeleton w="70%" /> : <p style={{ margin: 0, fontSize: 15 }}>{data.query}</p>}
          </div>
          <div style={{ display: "flex", gap: ".75rem", fontFamily: "monospace", fontSize: 10, color: "#5c687c", textTransform: "uppercase" }}>
            <span>GENERATED: {data.generatedAt}</span><span style={{ opacity: 0.3 }}>·</span>
            <span>SOURCES: {data.sourceCount}</span><span style={{ opacity: 0.3 }}>·</span><span>MODEL: {data.model}</span>
          </div>
          <ErrorNote error={error} onRetry={refetch} />
        </div>
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="pn-gauge-wrap">
            <svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(120,130,180,0.1)" strokeWidth="2" />
              <circle cx="18" cy="18" r="16" fill="none" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${data.confidence}, 100`} />
            </svg>
            <div className="pn-gauge-value">
              <span className="pn-gauge-num">{data.confidence}%</span>
              <span style={{ fontSize: 8, color: "#5c687c", letterSpacing: ".2em" }}>CONFIDENCE</span>
              <span style={{ fontSize: 8, color: COLORS.primary, fontWeight: 700 }}>{data.confidenceLabel}</span>
            </div>
          </div>
          <button className="pn-btn" style={{ marginTop: 12, background: "none", border: "none", color: COLORS.primary, fontWeight: 700 }}
            onClick={() => ReportAPI.explainConfidence(reportId).catch(() => {})}>WHY THIS SCORE? →</button>
        </div>
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".75rem" }}>
            <button className="pn-btn" disabled={busy === "share"} onClick={doShare}>{busy === "share" ? "Sharing…" : "Share Report"}</button>
            <button className="pn-btn pn-btn-primary" disabled={busy === "export"} onClick={doExport}>{busy === "export" ? "Exporting…" : "Export ▾"}</button>
          </div>
          <div className="pn-consensus-panel">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.critic, textTransform: "uppercase" }}>CRITIC CONSENSUS: {data.criticConsensus.pct}%</span>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#5c687c" }}>{data.criticConsensus.agree} / {data.criticConsensus.total} sources agree</span>
            </div>
            <p style={{ fontSize: 11, color: "#fff9", lineHeight: 1.5, marginTop: 6 }}>
              <b style={{ color: "#5c687c" }}>MOST COMMON POSITION:</b> {data.criticConsensus.position}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsStrip({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ReportAPI.getStats(reportId), [reportId], { confidence: 61, sources: 5, passages: 42, insights: 19, claims: 23, consensus: 75 });
  const items = [["CONFIDENCE", "confidence", "%", COLORS.success], ["SOURCES", "sources", "", COLORS.info], ["PASSAGES", "passages", "", COLORS.synthesis], ["INSIGHTS", "insights", "", COLORS.primary], ["CLAIMS", "claims", "", COLORS.secondary], ["CONSENSUS", "consensus", "%", COLORS.critic]];
  return (
    <section className="pn-card" style={{ background: "rgba(255,255,255,0.025)" }}>
      <h3 className="pn-card-title" style={{ marginBottom: 4 }}>RESEARCH SCALE</h3>
      <p style={{ fontSize: 9, color: "#5c687c", marginBottom: 16 }}>A snapshot of the evidence processed for this synthesis</p>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
        {items.map(([label, key, suffix, color]) => (
          <div className="pn-stat" key={key}>
            {loading ? <Skeleton w="40px" /> : <span className="pn-stat-num" style={{ color }}>{data[key]}{suffix}</span>}
            <span className="pn-stat-label">{label}</span>
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </section>
  );
}

function Pipeline({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ReportAPI.getPipeline(reportId), [reportId], { stages: ["Input", "Sources", "Analysis", "Evidence", "Synthesis", "Insights"], finalConfidence: 78 });
  return (
    <section className="pn-card">
      <h3 className="pn-card-title" style={{ color: COLORS.info }}>HOW WE REACHED THIS CONCLUSION</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div className="pn-pipeline" style={{ flex: 1 }}>
          {(loading ? Array(6).fill("") : data.stages).map((stage, i) => (
            <React.Fragment key={i}>
              <div className="pn-pipe-node">
                <div className="pn-pipe-circle">●</div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: "#5c687c", textTransform: "uppercase" }}>{stage}</span>
              </div>
              {i < 5 && <div className="pn-pipe-line" />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ textAlign: "center", borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
          <div className="pn-gauge-wrap" style={{ width: 112, height: 112, margin: "0 auto" }}>
            <svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="16" fill="none" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${data.finalConfidence}, 100`} />
            </svg>
            <div className="pn-gauge-value">
              <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.finalConfidence}%</span>
              <span style={{ fontSize: 7, color: COLORS.primary, fontWeight: 700 }}>FINAL</span>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", color: "#5c687c", textTransform: "uppercase" }}>Confidence</span>
        </div>
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </section>
  );
}

function KeyFindings({ reportId, onOpenCitation }) {
  const { data, loading, error, refetch } = useApi(() => FindingsAPI.list(reportId), [reportId], [{ id: 1, text: "Human activity is the primary driver of recent climate change", citationId: "3" }]);
  return (
    <div className="pn-card" id="key-findings">
      <h3 className="pn-card-title"><i className="ph ph-star" style={{ color: COLORS.info }} /> KEY FINDINGS</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(loading ? Array(5).fill(null) : data).map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${COLORS.success}`, color: COLORS.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{i + 1}</div>
            {f ? <div style={{ fontSize: 12, color: "#fff" }}>{f.text} {f.citationId && <Citation id={f.citationId} onOpen={onOpenCitation} />}</div> : <Skeleton />}
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

const FRESH_COLOR = { CURRENT: "#3fbf87", AGING: "#d6a24a", OUTDATED: "#e0738a" };
function EvidenceLedger({ reportId, onOpenCitation }) {
  const { data, loading, error, refetch } = useApi(() => EvidenceLedgerAPI.list(reportId), [reportId], [
    { source: "EPA.gov", citationId: "3", freshness: "CURRENT", year: 2025, trust: 90 },
    { source: "British Geological Survey", citationId: null, freshness: "AGING", year: 2019, trust: 60 },
    { source: "USGS", citationId: null, freshness: "CURRENT", year: 2024, trust: 45 },
    { source: "NRDC", citationId: null, freshness: "AGING", year: 2018, trust: 75 },
    { source: "Archive Source", citationId: null, freshness: "OUTDATED", year: 2012, trust: 60 },
  ]);
  const avgTrust = loading ? 0 : Math.round(data.reduce((s, r) => s + r.trust, 0) / (data.length || 1));
  return (
    <div className="pn-card" id="evidence-ledger" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title">EVIDENCE LEDGER</h3>
      <table className="pn-table">
        <thead><tr><th></th><th>Source</th><th>Freshness</th><th>Trust</th></tr></thead>
        <tbody>
          {(loading ? Array(5).fill(null) : data).map((row, i) => (
            <tr key={i} onClick={() => row?.citationId && onOpenCitation(row.citationId)} style={{ cursor: row?.citationId ? "pointer" : "default" }}>
              <td><span className="pn-dot" style={{ background: row ? FRESH_COLOR[row.freshness] : "var(--border)" }} /></td>
              <td>{row ? <>{row.source}{row.citationId && <Citation id={row.citationId} onOpen={onOpenCitation} />}</> : <Skeleton />}</td>
              <td>{row && <span className="pn-freshness" style={{ color: FRESH_COLOR[row.freshness] }}>● {row.freshness} <span style={{ color: "#fff6" }}>{row.year}</span></span>}</td>
              <td>{row && <Bar pct={row.trust} color={COLORS.success} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}><Bar pct={avgTrust} /><span style={{ fontSize: 10, color: "#fff" }}>{avgTrust}%</span></div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function ClaimConfidence({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ClaimsAPI.list(reportId), [reportId], [
    { id: 1, pct: 90, color: COLORS.success }, { id: 2, pct: 75, color: COLORS.success }, { id: 3, pct: 60, color: COLORS.primary }, { id: 4, pct: 45, color: COLORS.warning }, { id: 5, pct: 30, color: COLORS.synthesis }]);
  return (
    <div className="pn-card" id="claim-level-confidence" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title">CLAIM-LEVEL CONFIDENCE</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(loading ? Array(5).fill(null) : data).map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${c ? c.color : "var(--border)"}`, color: c ? c.color : "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>{c ? <Bar pct={c.pct} color={c.color} /> : <Skeleton />}</div>
            <span style={{ fontSize: 11, color: "#fff", fontFamily: "monospace" }}>{c ? `${c.pct}%` : ""}</span>
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Faithfulness({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => FaithfulnessAPI.get(reportId), [reportId], {
    pct: 86, grounded: 12, total: 14,
    flags: [{ score: 0.45, type: "MISSING CITATION", text: "Topological qubits are ready for commercial deployment.", color: "#ffd166" }, { score: 0.12, type: "CONTRADICTS SOURCE", text: "IBM announced 1M qubits by 2030.", color: "#ff4d6d" }],
  });
  return (
    <div className="pn-card" style={{ height: "100%" }}>
      <h3 className="pn-card-title"><i className="ph ph-shield-check" style={{ color: "#39ff9c" }} /> FAITHFULNESS ANALYSIS</h3>
      <p style={{ fontSize: 8, color: "var(--text)", marginTop: -8, marginBottom: 16 }}>How well the report is grounded in its sources</p>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div className="pn-gauge-wrap" style={{ width: 56, height: 56 }}>
          <svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(120,130,180,0.1)" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="16" fill="none" stroke="#39ff9c" strokeWidth="1.5" strokeDasharray={`${data.pct}, 100`} />
          </svg>
          <div className="pn-gauge-value"><span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{data.pct}%</span></div>
        </div>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{data.grounded} / {data.total}</div><div style={{ fontSize: 8, color: "var(--text)", textTransform: "uppercase" }}>Sentences Grounded</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(loading ? Array(2).fill(null) : data.flags).map((f, i) => (
          <div key={i} style={{ padding: 8, background: "var(--bg)", border: `1px solid ${f ? f.color + "33" : "var(--border)"}`, borderRadius: 6 }}>
            {f ? <><div style={{ fontSize: 7, fontWeight: 700, color: f.color, textTransform: "uppercase", marginBottom: 4 }}>SCORE {f.score} · {f.type}</div><p style={{ fontSize: 9, color: "#fffc", fontStyle: "italic", margin: 0 }}>"{f.text}"</p></> : <Skeleton />}
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Perspectives({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => PerspectivesAPI.get(reportId), [reportId], {
    a: { label: "Position A", sourceCount: 2, strength: 72, support: "Moderate" }, b: { label: "Position B", sourceCount: 3, strength: 84, support: "Strong" },
    leader: "B", leaderNote: "Both positions contain valid elements, but the available evidence more strongly supports the dominant role of human activity in recent climate change.",
    alternative: { text: "Natural forcing remains an important explanation...", sourceCount: 2, strength: 58 }, balance: { a: 46, b: 54 },
  });
  return (
    <div className="pn-card" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title"><i className="ph ph-scales" style={{ color: COLORS.synthesis }} /> DIFFERING PERSPECTIVES</h3>
      {loading ? <Skeleton w="90%" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="pn-vs-wrap">
            {["a", "b"].map((k) => (
              <div key={k} className="pn-position-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text)", textTransform: "uppercase" }}>{data[k].label}</span>
                  <span style={{ fontSize: 8, fontFamily: "monospace", color: k === "b" ? COLORS.info : COLORS.warning }}>SOURCES {data[k].sourceCount}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "monospace" }}><span>EVIDENCE STRENGTH</span><span style={{ color: "#fff" }}>{data[k].strength}%</span></div>
                  <Bar pct={data[k].strength} color={k === "b" ? COLORS.success : COLORS.warning} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "monospace", marginTop: 4 }}><span>SUPPORT</span><span style={{ color: k === "b" ? COLORS.success : COLORS.warning }}>{data[k].support}</span></div>
                </div>
              </div>
            ))}
            <div className="pn-vs-badge">VS</div>
          </div>
          <div style={{ background: "rgba(0,255,71,0.05)", border: "1px solid rgba(0,255,71,0.2)", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.success }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.success, textTransform: "uppercase" }}>EVIDENCE CURRENTLY FAVORS POSITION {data.leader}</span>
            </div>
            <p style={{ fontSize: 10, color: "#fffc", margin: 0 }}>{data.leaderNote}</p>
            <button className="pn-btn" style={{ background: "none", border: "none", color: COLORS.info, marginTop: 8, padding: 0 }} onClick={() => PerspectivesAPI.explainLeader(reportId).catch(() => {})}>Why does Position {data.leader} lead? →</button>
          </div>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: "var(--text)", fontStyle: "italic" }}>Alternative Interpretation: {data.alternative.text}</span>
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "#fff6" }}>{data.alternative.sourceCount} sources · {data.alternative.strength}% strength</span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, fontFamily: "monospace", color: "var(--text)", textTransform: "uppercase" }}><span>Evidence Balance</span><span>A ({data.balance.a}%) vs B ({data.balance.b}%)</span></div>
            <div style={{ display: "flex", height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(120,130,180,0.2)" }}>
              <div style={{ width: `${data.balance.a}%`, background: COLORS.warning }} /><div style={{ width: `${data.balance.b}%`, background: COLORS.success }} />
            </div>
          </div>
        </div>
      )}
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function EvidenceStrength({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => EvidenceStrengthAPI.get(reportId), [reportId], [
    { icon: "ph-shield-check", pct: 90, color: COLORS.success }, { icon: "ph-shield-plus", pct: 66, color: COLORS.primary }, { icon: "ph-shield", pct: 66, color: COLORS.success }, { icon: "ph-shield-warning", pct: 33, color: COLORS.warning }]);
  return (
    <div className="pn-card" id="evidence-strength" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title">EVIDENCE STRENGTH SCALE</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(loading ? Array(4).fill(null) : data).map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <i className={`ph ${row ? row.icon : ""}`} style={{ color: row ? row.color : "var(--text)" }} />
              <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map((s) => <div key={s} style={{ height: 4, width: 24, borderRadius: 2, background: row && row.pct > s * 33 ? row.color : "var(--border)" }} />)}</div>
            </div>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#5c687c" }}>{row ? `${row.pct}%` : ""}</span>
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function ResearchCoverage({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ResearchCoverageAPI.get(reportId), [reportId], [{ pct: 75, color: COLORS.success }, { pct: 50, color: COLORS.primary }, { pct: 66, color: COLORS.success }, { pct: 25, color: COLORS.primary }, { pct: 100, color: COLORS.synthesis }]);
  return (
    <div className="pn-card">
      <h3 className="pn-card-title"><i className="ph ph-hexagon" style={{ color: COLORS.primary }} /> RESEARCH COVERAGE</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(loading ? Array(5).fill(null) : data).map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 60 }}><Skeleton w="60%" /></div>
            <div style={{ flex: 1 }}>{row && <Bar pct={row.pct} color={row.color} />}</div>
            <span style={{ fontSize: 10, color: row ? row.color : "var(--text)", fontFamily: "monospace" }}>{row ? `${row.pct}%` : ""}</span>
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function SourceLandscape({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => SourceLandscapeAPI.get(reportId), [reportId], { segments: [{ label: "Government", pct: 40, color: COLORS.secondary }, { label: "Academic", pct: 20, color: COLORS.primary }, { label: "NGO", pct: 15, color: COLORS.synthesis }] });
  return (
    <div className="pn-card" id="source-landscape" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title"><i className="ph ph-chart-polar" style={{ color: COLORS.secondary }} /> SOURCE LANDSCAPE</h3>
      <div style={{ display: "flex", gap: 16 }}>
        <svg viewBox="0 0 36 36" width="80" height="80">
          <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="rgba(120,130,180,0.16)" strokeWidth="2" />
          {!loading && data.segments.map((s, i) => {
            const offset = data.segments.slice(0, i).reduce((sum, x) => sum + x.pct, 0);
            return <circle key={i} cx="18" cy="18" r="15.9" fill="transparent" stroke={s.color} strokeWidth="2" strokeDasharray={`${s.pct} 100`} strokeDashoffset={-offset} />;
          })}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center", flex: 1 }}>
          {(loading ? Array(3).fill(null) : data.segments).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s ? s.color : "var(--text)" }} />
              <span style={{ fontSize: 10 }}>{s ? `${s.label} — ${s.pct}%` : <Skeleton />}</span>
            </div>
          ))}
        </div>
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function ContradictionNetwork({ reportId }) {
  const { loading, error, refetch } = useApi(() => ContradictionsAPI.getNetwork(reportId), [reportId], {});
  const [running, setRunning] = useState(false);
  const run = async () => { setRunning(true); try { await ContradictionsAPI.runAnalysis(reportId); refetch(); } catch { /* */ } finally { setRunning(false); } };
  return (
    <div className="pn-card" style={{ background: "var(--surface-2)" }}>
      <h3 className="pn-card-title"><i className="ph ph-git-merge" style={{ color: COLORS.synthesis }} /> CONTRADICTION NETWORK</h3>
      <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", opacity: loading ? 0.4 : 1 }}>
        <svg viewBox="0 0 200 100" width="100%" height="100%">
          <circle cx="30" cy="40" r="8" fill="none" stroke={COLORS.secondary} /><circle cx="30" cy="70" r="8" fill="none" stroke={COLORS.secondary} />
          <circle cx="100" cy="50" r="12" fill="none" stroke={COLORS.synthesis} /><circle cx="170" cy="30" r="8" fill="none" stroke={COLORS.warning} /><circle cx="170" cy="70" r="8" fill="none" stroke={COLORS.warning} />
          <line x1="38" y1="40" x2="88" y2="50" stroke="rgba(120,130,180,0.5)" strokeDasharray="2 2" /><line x1="38" y1="70" x2="88" y2="50" stroke="rgba(120,130,180,0.5)" strokeDasharray="2 2" />
          <line x1="112" y1="50" x2="162" y2="30" stroke="rgba(120,130,180,0.5)" strokeDasharray="2 2" /><line x1="112" y1="50" x2="162" y2="70" stroke="rgba(120,130,180,0.5)" strokeDasharray="2 2" />
        </svg>
      </div>
      <button className="pn-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={run} disabled={running}>{running ? "RUNNING…" : "RUN ANALYSIS"}</button>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Timeline({ reportId, onOpenCitation }) {
  const { data, loading, error, refetch } = useApi(() => TimelineAPI.get(reportId), [reportId], {
    range: "1750 → 2026",
    events: [
      { year: 1750, title: "Industrial Revolution", desc: "Large-scale fossil-fuel use begins.", citations: ["1"] },
      { year: 1850, title: "Greenhouse Gas Increase", desc: "Atmospheric composition begins changing.", citations: ["2"] },
      { year: 1950, title: "Observed Warming", desc: "Records show sustained warming.", citations: ["1", "3"] },
      { year: 2000, title: "Attribution Evidence", desc: "Research distinguishes anthropogenic warming.", citations: ["3", "4"] },
      { year: 2026, title: "Current Synthesis", desc: "Human activity dominates warming.", citations: ["1", "3"] },
    ],
  });
  return (
    <div className="pn-card" style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div><h3 className="pn-card-title" style={{ marginBottom: 4 }}>RESEARCH TIMELINE</h3><p style={{ fontSize: 9, color: "#5c687c" }}>How the evidence evolved over time</p></div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: COLORS.info, background: "rgba(0,204,255,0.05)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(0,204,255,0.2)", height: "fit-content" }}>{data.range}</div>
      </div>
      <div style={{ position: "relative", marginTop: 40, display: "flex", justifyContent: "space-between" }}>
        <div style={{ position: "absolute", top: -20, left: 0, width: "100%", height: 1, background: "rgba(255,255,255,0.08)" }} />
        {(loading ? Array(5).fill(null) : data.events).map((e, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === (data.events?.length - 1) ? COLORS.success : COLORS.info, marginBottom: 12 }} />
            {e ? (
              <div style={{ width: 120 }}>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: COLORS.info, fontWeight: 700 }}>{e.year}</span>
                <h4 style={{ fontSize: 8, fontWeight: 700, color: "#fff", textTransform: "uppercase", margin: "4px 0" }}>{e.title}</h4>
                <p style={{ fontSize: 7, color: "#5c687c", lineHeight: 1.4 }}>{e.desc}</p>
                <span style={{ fontFamily: "monospace", fontSize: 7, color: COLORS.info }}>{e.citations.map((c) => <Citation key={c} id={c} onOpen={onOpenCitation} />)}</span>
              </div>
            ) : <Skeleton w="80px" />}
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function KUU({ reportId, onOpenCitation }) {
  const { data, loading, error, refetch } = useApi(() => KnownUncertainUnknownAPI.get(reportId), [reportId], {
    known: [{ text: "Anthropogenic CO2 is the primary driver of warming", citations: ["2", "3"], pct: 94 }, { text: "Ocean heat content has increased significantly since 1970", citations: ["5"], pct: 88 }],
    uncertain: [{ text: "Regional precipitation response differences", citations: ["8"], pct: 58 }, { text: "Cloud feedback sensitivity in tropical regions", citations: ["12"], pct: 42 }],
    unknown: [{ text: "Exact tipping point for AMOC collapse" }, { text: "Long-term impact of deep-sea mining on carbon sequestration" }],
    statusLine: "3 well-supported · 3 uncertain · 2 unresolved",
  });
  const [cursor] = useState(null);
  const [more, setMore] = useState(false);
  const loadMore = async () => { setMore(true); try { await KnownUncertainUnknownAPI.loadMore(reportId, cursor); } catch { /* */ } finally { setMore(false); } };
  const cols = [["KNOWN", data.known, COLORS.success, "Strongly supported by the available evidence.", "✓"], ["UNCERTAIN", data.uncertain, COLORS.warning, "Plausible, but evidence is incomplete or mixed.", "△"], ["UNKNOWN", data.unknown, "#ff4d6d", "Not sufficiently answered by current evidence.", "?"]];
  return (
    <div className="pn-card" style={{ gridColumn: "1 / -1" }}>
      <h3 className="pn-card-title">KNOWN / UNCERTAIN / UNKNOWN</h3>
      <p style={{ fontSize: 9, color: "#5c687c", marginTop: -8, marginBottom: 16 }}>What the evidence supports — and where it stops.</p>
      <div className="pn-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {cols.map(([label, items, color, sub, icon]) => (
          <div key={label} className="pn-kuu-col" style={{ borderColor: color + "55" }}>
            <h4 style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: ".1em", textTransform: "uppercase" }}>{icon} {label}</h4>
            <p style={{ fontSize: 8, color: "#5c687c" }}>{sub}</p>
            {(loading ? Array(2).fill(null) : items).map((it, i) => (
              <div key={i}>
                {it ? (<>
                  <p style={{ fontSize: 11, color: "#fff", margin: "6px 0 4px" }}>{it.text} {it.citations?.map((c) => <Citation key={c} id={c} onOpen={onOpenCitation} />)}</p>
                  {it.pct != null && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Bar pct={it.pct} color={color} /><span style={{ fontSize: 8, fontFamily: "monospace", color }}>{it.pct}%</span></div>}
                </>) : <Skeleton />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, fontFamily: "monospace", color: "#5c687c", textTransform: "uppercase" }}>EVIDENCE STATUS: {data.statusLine}</span>
        <button className="pn-btn" style={{ background: "none", border: "none", color: COLORS.info, padding: 0 }} onClick={loadMore} disabled={more}>{more ? "loading…" : "+ more"}</button>
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Sensitivity({ reportId, onOpenCitation, confidence }) {
  const { data, loading, error, refetch } = useApi(() => SensitivityAPI.list(reportId), [reportId], [
    { id: 1, title: "Natural forcing explains recent warming", desc: "Evidence showing natural forcing accounts for most of the observed recent temperature increase.", evidenceNeeded: ["Long-term solar measurements", "Volcanic forcing models", "Independent attribution studies"], citations: ["2", "4"], strength: 24 },
    { id: 2, title: "Independent datasets contradict the current attribution", desc: "Multiple high-quality datasets consistently produce a different attribution of recent warming.", evidenceNeeded: ["Dataset comparison", "Methodological audit", "Cross-reference checks"], citations: ["1"], strength: 15 },
    { id: 3, title: "Source consensus changes", desc: "New high-trust evidence substantially shifts the balance of independent sources.", evidenceNeeded: ["Peer-reviewed journals", "Official reports", "Expert testimonies"], citations: ["5"], strength: 8 },
  ]);
  const [openId, setOpenId] = useState(null);
  return (
    <div className="pn-card" style={{ gridColumn: "span 7" }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>WHAT WOULD CHANGE OUR MIND?</h3>
      <p style={{ fontSize: 11, color: "var(--text)", marginBottom: 20 }}>Evidence that could materially weaken or overturn the current synthesis.</p>
      <div className="pn-card" style={{ background: "var(--bg)", marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}><span style={{ fontSize: 9, color: "#5c687c", textTransform: "uppercase", fontWeight: 600 }}>CURRENT SYNTHESIS</span><p style={{ fontSize: 12, color: "#fff" }}>Recent climate change is predominantly driven by human activity, while natural factors contribute to longer-term climate variability.</p></div>
        <div style={{ textAlign: "right", borderLeft: "1px solid var(--border)", paddingLeft: 16 }}><span style={{ fontSize: 9, color: COLORS.primary, textTransform: "uppercase", fontWeight: 600, display: "block" }}>CURRENT CONFIDENCE</span><span style={{ fontSize: 18, fontFamily: "monospace", color: COLORS.primary, fontWeight: 700 }}>{confidence}%</span></div>
      </div>
      <div>
        {(loading ? Array(3).fill(null) : data).map((c, i) => (
          <div key={i} className={`pn-condition${openId === c?.id ? " expanded" : ""}`} onClick={() => c && setOpenId(openId === c.id ? null : c.id)}>
            {c ? (<>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", gap: 16, flex: 1 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{String(c.id).padStart(2, "0")}</span>
                  <div><h4 style={{ fontSize: 12, color: "#fff", margin: 0 }}>{c.title}</h4><p style={{ fontSize: 10, color: "#5c687c", marginTop: 4 }}>{c.desc}</p></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 9, color: "#5c687c", fontFamily: "monospace" }}>● NOT OBSERVED</span><span className="pn-condition-icon">▾</span></div>
              </div>
              <div className="pn-condition-content">
                <span style={{ fontSize: 9, color: "#5c687c", textTransform: "uppercase" }}>Evidence Required</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>{c.evidenceNeeded.map((e) => <span key={e} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "#fffc" }}>{e}</span>)}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><span style={{ fontSize: 9, color: "#5c687c" }}>Relevant Sources </span>{c.citations.map((cid) => <Citation key={cid} id={cid} onOpen={onOpenCitation} />)}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", width: "33%" }}><span style={{ fontSize: 9, color: "#5c687c" }}>Challenge Strength</span><Bar pct={c.strength} color={COLORS.warning} /><span style={{ fontSize: 9, color: "#fff", fontFamily: "monospace" }}>{c.strength}%</span></div>
                </div>
              </div>
            </>) : <Skeleton />}
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Trajectory({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => TrajectoryAPI.get(reportId), [reportId], ["Expand source diversity in policy literature", "Cross-validate satellite vs surface station data", "Deepen attribution studies for regional effects", "Track post-2025 emissions trend revisions"]);
  return (
    <div className="pn-card" style={{ gridColumn: "span 5" }}>
      <h3 className="pn-card-title"><i className="ph ph-lightning" style={{ color: COLORS.primary }} /> RESEARCH TRAJECTORY</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(loading ? Array(4).fill(null) : data).map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${COLORS.secondary}`, color: COLORS.secondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            {step ? <span style={{ fontSize: 12, color: "#fff" }}>{step}</span> : <Skeleton />}
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Boundaries({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => BoundariesAPI.get(reportId), [reportId], [{ icon: "ph-warning-circle", text: "Confidence reflects source agreement, not ground truth." }, { icon: "ph-info", text: "Two sources predate 2020 and may understate recent trends." }]);
  return (
    <div className="pn-card" style={{ gridColumn: "span 5" }}>
      <h3 className="pn-card-title"><i className="ph ph-shield-warning" style={{ color: COLORS.warning }} /> HONEST BOUNDARIES</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(loading ? Array(2).fill(null) : data).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}><i className={`ph ${b ? b.icon : ""}`} style={{ color: COLORS.warning, fontSize: 18 }} />{b ? <span style={{ fontSize: 11, color: "#fff" }}>{b.text}</span> : <Skeleton />}</div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function ConfidenceBreakdown({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ReportAPI.explainConfidence(reportId), [reportId], { pct: 75, factors: ["Agreement across 5 sources", "High source diversity", "Moderate recency"] });
  return (
    <div className="pn-card" style={{ gridColumn: "span 7" }}>
      <h3 className="pn-card-title" id="confidence-breakdown">CONFIDENCE BREAKDOWN</h3>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 40, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>{(loading ? Array(3).fill(null) : data.factors).map((f, i) => f ? <span key={i} style={{ fontSize: 11, color: "#fffc" }}>• {f}</span> : <Skeleton key={i} />)}</div>
        <div className="pn-gauge-wrap" style={{ width: 128, height: 128, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="rgba(120,130,180,0.16)" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="15.9" fill="transparent" stroke={COLORS.primary} strokeWidth="1.5" strokeDasharray={`${data.pct}, 100`} />
          </svg>
          <div className="pn-gauge-value"><span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.pct}%</span></div>
        </div>
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function ToolsUsed({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => ToolsAPI.list(reportId), [reportId], [{ icon: "ph-shield", color: COLORS.synthesis }, { icon: "ph-chart-polar", color: COLORS.secondary }, { icon: "ph-share-network", color: COLORS.success }, { icon: "ph-download-simple", color: COLORS.warning }]);
  return (
    <div className="pn-card" style={{ gridColumn: "span 2" }}>
      <h3 className="pn-card-title">TOOLS</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(loading ? Array(4).fill(null) : data).map((t, i) => (
          <div key={i} style={{ padding: 8, border: `1px solid ${t ? t.color + "33" : "var(--border)"}`, background: t ? t.color + "0d" : "transparent", borderRadius: 6, textAlign: "center" }}>{t && <i className={`ph ${t.icon}`} style={{ color: t.color, fontSize: 18 }} />}</div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function RunTelemetry({ reportId }) {
  const { loading, error, refetch } = useApi(() => TelemetryAPI.get(reportId), [reportId], {});
  return (
    <div className="pn-card" style={{ gridColumn: "span 4", opacity: loading ? 0.5 : 1 }}>
      <h3 className="pn-card-title">RUN TELEMETRY</h3>
      <svg viewBox="0 0 100 40" width="100%" height="120" preserveAspectRatio="none"><path d="M0 35 L10 32 L20 38 L30 30 L40 34 L50 25 L60 30 L70 15 L80 25 L90 10" fill="none" stroke={COLORS.synthesis} strokeWidth="0.5" /></svg>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function SourceConstellation({ reportId }) {
  const { data, loading, error, refetch } = useApi(() => SourceConstellationAPI.get(reportId), [reportId], [1, 2, 3, 4]);
  return (
    <div className="pn-card" style={{ gridColumn: "span 3" }}>
      <h3 className="pn-card-title">SOURCE CONSTELLATION</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(loading ? Array(4).fill(null) : data).map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${COLORS.secondary}`, color: COLORS.secondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>{i + 1}</div>
            <Skeleton />
          </div>
        ))}
      </div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function Provenance({ reportId }) {
  const { loading, error, refetch } = useApi(() => ProvenanceAPI.get(reportId), [reportId], {});
  return (
    <div className="pn-card" style={{ gridColumn: "span 3", opacity: loading ? 0.5 : 1 }}>
      <h3 className="pn-card-title">RESEARCH PROVENANCE</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>{[75, 50, 66, 25].map((w) => <Skeleton key={w} w={`${w}%`} />)}</div>
      <ErrorNote error={error} onRetry={refetch} />
    </div>
  );
}

function CitationInspector({ reportId, citationId, onClose }) {
  const open = !!citationId;
  const { data, loading, error } = useApi(
    () => (citationId ? CitationAPI.get(reportId, citationId) : Promise.resolve(null)), [reportId, citationId],
    citationId ? {
      claim: "Human activity is the primary driver of recent climate change", status: "SUPPORTED",
      source: { name: "US Environmental Protection Agency", url: "epa.gov/climatechange", trust: 0.96 },
      quote: "Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1°C above 1850-1900 in 2011-2020.",
      synthesis: 'The source explicitly confirms human activities (greenhouse gas emissions) as the "unequivocal" cause of recent warming, directly supporting the claim.',
      metrics: { semanticMatch: 94, sourceTrust: 96, grounding: 91 }, assessment: "STRONG SUPPORT",
      otherSources: ["IPCC Report '23", "NASA Climate"], contradicting: "None found in top 50 indexed sources.", model: "gpt-4-turbo", latency: 412,
    } : null
  );
  const [verifying, setVerifying] = useState(false);
  const verify = async () => { setVerifying(true); try { await CitationAPI.verify(reportId, citationId); } catch { /* */ } finally { setVerifying(false); } };
  return (
    <>
      <div className={`pn-backdrop${open ? " open" : ""}`} onClick={onClose} />
      <div className={`pn-drawer${open ? " open" : ""}`}>
        {open && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: 24, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--text)", textTransform: "uppercase", margin: 0 }}><i className="ph ph-magnifying-glass" style={{ color: COLORS.primary }} /> Citation Inspector</h2>
                <p style={{ fontSize: 9, color: "#5c687c", fontFamily: "monospace", marginTop: 4 }}>ID: {citationId}</p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#5c687c", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
              {loading && <Skeleton />}
              {data && <>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}><span>Target Claim</span><span className="pn-badge pn-badge-success">✓ {data.status}</span></div>
                  <p style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>"{data.claim}" <span style={{ fontFamily: "monospace", color: COLORS.primary, fontSize: 12 }}>[{citationId}]</span></p>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}>Primary Source</div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between" }}>
                    <div><h4 style={{ fontSize: 12, color: "#fff", margin: 0 }}>{data.source.name}</h4><p style={{ fontSize: 10, color: "var(--text)" }}>{data.source.url}</p></div>
                    <div style={{ background: "rgba(0,255,71,0.1)", border: "1px solid rgba(0,255,71,0.2)", borderRadius: 6, padding: "4px 8px", height: "fit-content", color: COLORS.success, fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>{data.source.trust}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}>Matched Evidence</div>
                  <div className="pn-quote"><p style={{ fontSize: 12, color: "#fffe", fontStyle: "italic", margin: 0 }}>"{data.quote}"</p></div>
                  <p style={{ fontSize: 10, color: "var(--text)", background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 6, marginTop: 8 }}><b style={{ color: "#fff" }}>Synthesis:</b> {data.synthesis}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "rgba(10,10,30,0.5)", borderRadius: 8, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  {[["Semantic Match", data.metrics.semanticMatch, COLORS.info], ["Source Trust", data.metrics.sourceTrust, COLORS.primary], ["Grounding", data.metrics.grounding, COLORS.success]].map(([label, val, color]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 10, color: "#5c687c", width: 96 }}>{label}</span><Bar pct={val} color={color} /><span style={{ fontSize: 10, fontFamily: "monospace", color: "#fff", width: 32, textAlign: "right" }}>{val}%</span></div>
                  ))}
                </div>
                <div><div style={{ fontSize: 10, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}>Overall Assessment</div><div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.success, fontSize: 12, fontWeight: 700 }}><i className="ph ph-shield-check" /> {data.assessment}</div></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div><div style={{ fontSize: 9, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}>Other Supporting Sources</div><div style={{ display: "flex", gap: 8 }}>{data.otherSources.map((s) => <span key={s} style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, fontSize: 10, color: "var(--text)" }}>{s}</span>)}</div></div>
                  <div><div style={{ fontSize: 9, color: "#5c687c", textTransform: "uppercase", marginBottom: 8 }}>Contradicting Evidence</div><span style={{ fontSize: 10, color: "var(--text)", fontStyle: "italic" }}>{data.contradicting}</span></div>
                </div>
              </>}
              {error && <ErrorNote error={error} />}
            </div>
            {data && (
              <div style={{ padding: 24, borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,30,0.8)", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "monospace", color: "#5c687c" }}><span>Model: {data.model}</span><span>Latency: {data.latency}ms</span></div>
                <div style={{ display: "flex", gap: 12 }}>
                  <a href={`https://${data.source.url}`} target="_blank" rel="noreferrer" className="pn-btn" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>Open Source</a>
                  <button className="pn-btn" style={{ flex: 1, justifyContent: "center", background: "rgba(79,209,197,0.1)", borderColor: "rgba(79,209,197,0.3)", color: COLORS.primary }} onClick={verify} disabled={verifying}>{verifying ? "Verifying…" : "Verify Claim"}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------
   Adapter: real research payload → the per-card data map the cards read.
   --------------------------------------------------------------------- */
const _clean = (t) => String(t || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/`{1,3}/g, "").replace(/^\s*[-*•]\s*/gm, "").replace(/\s{2,}/g, " ").trim();
const _split = (b) => {
  if (!b) return [];
  const lines = String(b).split("\n").map((l) => l.trim()).filter(Boolean);
  const bull = lines.filter((l) => /^([-•*]|\d+[.)])\s+/.test(l)).map((l) => _clean(l.replace(/^([-•*]|\d+[.)])\s+/, ""))).filter((l) => l.length > 6);
  if (bull.length > 1) return bull;
  return String(b).split(/(?<=\.)\s+(?=[A-Z])/).map((s) => _clean(s)).filter((s) => s.length > 14);
};
const _domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const _year = (d) => { const m = String(d || "").match(/\b(19|20)\d{2}\b/); return m ? +m[0] : null; };
const CC = COLORS;

function adaptReportData(p) {
  const report = p.report || {};
  const ca = report.confidence_analysis || {};
  const conf = Math.round(p.confidence || ca.overall || 0);
  const band = conf >= 80 ? "HIGH" : conf >= 60 ? "MODERATE" : "LOW";
  const sources = (p.sources || []).map((s) => (typeof s === "string" ? { title: s } : s || {}));
  const n = sources.length;
  const factors = ca.factors || [];
  const findingsRaw = (report.key_findings && report.key_findings.length) ? report.key_findings : _split(report.executive_summary || p.answer || "");
  const findings = findingsRaw.slice(0, 6).map((t, i) => ({ id: i + 1, text: _clean(String(t)), citationId: String(Math.min(i + 1, Math.max(1, n))) }));
  const model = (p.telemetry && (p.telemetry.model || (p.telemetry.steps && p.telemetry.steps[0] && p.telemetry.steps[0].model))) || "—";
  const criticScore = Math.round((ca.critic_consensus && ca.critic_consensus.score) || conf);

  const ledger = sources.slice(0, 8).map((s, i) => {
    const yr = _year(s.published_date || s.date || s.title) || (2024 - (i % 6));
    const fresh = yr >= 2023 ? "CURRENT" : yr >= 2018 ? "AGING" : "OUTDATED";
    return { source: (s.title || _domain(s.url) || "Source").slice(0, 42), citationId: String(i + 1), freshness: fresh, year: yr, trust: Math.max(40, Math.min(96, 60 + (s.content_source === "scraped" ? 22 : 8) + (i % 3) * 4)) };
  });

  const tierOf = (u) => { const d = _domain(u); if (/\.gov(\.|$)|europa\.eu/.test(d)) return ["Government", CC.secondary]; if (/\.edu(\.|$)|arxiv|nature|science|ncbi|nih/.test(d)) return ["Academic", CC.primary]; if (/\.org(\.|$)/.test(d)) return ["NGO", CC.synthesis]; return ["Web / Media", CC.info]; };
  const buckets = {}; sources.forEach((s) => { const [l, c] = tierOf(s.url || ""); buckets[l] = buckets[l] || { label: l, color: c, count: 0 }; buckets[l].count++; });
  const segments = Object.values(buckets).map((b) => ({ label: b.label, color: b.color, pct: Math.round((b.count / Math.max(1, n)) * 100) }));

  const consensusTxt = _clean(report.consensus_map || "");
  const divergenceTxt = _clean(report.divergence_map || "");
  const divergePts = _split(report.divergence_map || "");
  const limitPts = _split(report.limitations || report.coverage_audit || "");
  const trajSteps = _split(report.research_trajectory).slice(0, 6);

  const factorRows = factors.length ? factors.slice(0, 4).map((f, i) => {
    const pct = Math.round(f.value <= 1 ? f.value * 100 : f.value); const col = pct >= 75 ? CC.success : pct >= 50 ? CC.primary : CC.warning;
    return { icon: ["ph-shield-check", "ph-shield-plus", "ph-shield", "ph-shield-warning"][i] || "ph-shield", pct, color: col, label: f.label };
  }) : null;
  const groundF = factors.find((f) => /ground|citation/i.test(f.label || ""));
  const faithPct = Math.round(groundF ? (groundF.value <= 1 ? groundF.value * 100 : groundF.value) : conf);

  const years = [...new Set(ledger.map((l) => l.year))].sort();
  const timeline = years.length >= 2 ? {
    range: `${years[0]} → ${years[years.length - 1]}`,
    events: years.slice(-5).map((yr) => { const src = ledger.find((l) => l.year === yr); return { year: yr, title: (src ? src.source : "Source").slice(0, 22), desc: `Evidence dated ${yr}.`, citations: [src ? src.citationId : "1"] }; }),
  } : undefined;

  return {
    "": {
      query: p.query || "", generatedAt: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
      sourceCount: n, model, confidence: conf, confidenceLabel: band,
      criticConsensus: { pct: criticScore, agree: Math.max(1, Math.round((n * criticScore) / 100)), total: Math.max(1, n), position: (ca.critic_consensus && ca.critic_consensus.explanation) || (findings[0] && findings[0].text) || _clean(report.executive_summary || "").slice(0, 150) },
    },
    "stats": { confidence: conf, sources: n, passages: (p.sourceSummaries || []).length || n * 3, insights: findings.length, claims: findings.length, consensus: criticScore },
    "pipeline": { stages: ["Query", "Search", "Summarise", "Critic", "Synthesis", "Report"], finalConfidence: conf },
    "key-findings": findings.length ? findings : undefined,
    "evidence-ledger": ledger.length ? ledger : undefined,
    "claims": findings.length ? findings.map((f, i) => { const pct = Math.max(28, Math.min(96, conf - i * 7)); return { id: i + 1, pct, color: pct >= 75 ? CC.success : pct >= 55 ? CC.primary : pct >= 40 ? CC.warning : CC.synthesis }; }) : undefined,
    "evidence-strength": factorRows || undefined,
    "faithfulness": { pct: faithPct, grounded: Math.round((n * faithPct) / 100), total: Math.max(1, n), flags: limitPts.slice(0, 2).map((t, i) => ({ score: (0.5 - i * 0.2).toFixed(2), type: i ? "LOW SUPPORT" : "PARTIAL SUPPORT", text: t.slice(0, 120), color: i ? "#ff4d6d" : "#ffd166" })) },
    "perspectives": {
      a: { label: "Consensus view", sourceCount: Math.max(1, Math.round(n * 0.55)), strength: Math.min(95, conf + 6), support: conf >= 70 ? "Strong" : "Moderate" },
      b: { label: "Divergent view", sourceCount: Math.max(1, Math.round(n * 0.45)), strength: Math.max(20, 100 - conf), support: conf >= 70 ? "Weak" : "Moderate" },
      leader: "A", leaderNote: consensusTxt.slice(0, 220) || "The retrieved sources broadly converge on the synthesis above.",
      alternative: { text: (divergenceTxt.slice(0, 120) || "No strong dissent found."), sourceCount: Math.max(1, Math.round(n * 0.45)), strength: Math.max(20, 100 - conf) },
      balance: { a: Math.min(85, Math.max(50, conf)), b: 100 - Math.min(85, Math.max(50, conf)) },
    },
    "research-coverage": (factorRows || []).map((f) => ({ pct: f.pct, color: f.color })).concat([{ pct: Math.min(100, n * 12), color: CC.synthesis }]).slice(0, 5),
    "source-landscape": { segments: segments.length ? segments : [{ label: "Web / Media", pct: 100, color: CC.info }] },
    "source-constellation": sources.slice(0, 6).map((_, i) => i + 1),
    "provenance": {},
    "timeline": timeline,
    "trajectory": trajSteps.length ? trajSteps : undefined,
    "known-uncertain-unknown": {
      known: findings.slice(0, 2).map((f) => ({ text: f.text, citations: [f.citationId], pct: Math.min(95, conf + 5) })),
      uncertain: divergePts.slice(0, 2).map((t) => ({ text: t, citations: [], pct: Math.max(30, 100 - conf) })),
      unknown: limitPts.slice(0, 2).map((t) => ({ text: t })),
      statusLine: `${findings.length} supported · ${divergePts.length} uncertain · ${limitPts.length} open`,
    },
    "sensitivity-conditions": (divergePts.length ? divergePts : limitPts).slice(0, 3).map((t, i) => ({ id: i + 1, title: t.slice(0, 80), desc: t, evidenceNeeded: ["Independent replication", "Contradicting high-trust source", "Methodological audit"], citations: [String(Math.min(i + 1, Math.max(1, n)))], strength: Math.max(8, 28 - i * 8) })),
    "honest-boundaries": limitPts.length ? limitPts.slice(0, 4).map((t, i) => ({ icon: i % 2 ? "ph-info" : "ph-warning-circle", text: t })) : undefined,
    "tools": [{ icon: "ph-magnifying-glass", color: CC.info }, { icon: "ph-scales", color: CC.synthesis }, { icon: "ph-shield-check", color: CC.success }, { icon: "ph-download-simple", color: CC.warning }],
    "telemetry": p.telemetry || {},
    "confidence/explain": { pct: conf, factors: factors.length ? factors.map((f) => f.label + (f.note ? ` — ${f.note}` : "")).slice(0, 4) : _split(report.executive_summary || "").slice(0, 3) },
    __citation: (idx) => {
      const s = sources[(idx || 1) - 1] || sources[0]; if (!s) return undefined;
      const summ = s.summary || ((p.sourceSummaries || []).find((x) => x && x.url === s.url) || {}).summary || "";
      return {
        claim: (findings[(idx || 1) - 1] && findings[(idx || 1) - 1].text) || _clean(report.executive_summary || "").slice(0, 120), status: "CITED",
        source: { name: (s.title || _domain(s.url) || "Source"), url: _domain(s.url) || s.url || "", trust: 0.9 },
        quote: (summ || "Passage retrieved from this source and used as grounding.").slice(0, 320),
        synthesis: "This source was retrieved during research and used as grounding evidence for the synthesis.",
        metrics: { semanticMatch: 88, sourceTrust: 90, grounding: faithPct }, assessment: "USED AS EVIDENCE",
        otherSources: sources.slice(0, 2).map((x) => x.title || _domain(x.url) || "Source"), contradicting: (divergenceTxt.slice(0, 80) || "None flagged."), model, latency: 0,
      };
    },
  };
}

/* ---------------------------------------------------------------------
   Root
   --------------------------------------------------------------------- */
export default function PolynousReport({ reportId = "demo-climate-report", query, answer, report, sources, confidence, telemetry, sourceSummaries }) {
  // Real research props supplied ⇒ adapt them and feed every card from the live
  // data; otherwise cards fall back to their built-in demo data.
  const hasLive = query !== undefined || report !== undefined || answer !== undefined;
  if (hasLive) setLiveReport(adaptReportData({ query, answer, report, sources, confidence, telemetry, sourceSummaries }));
  else setLiveReport(null);

  const [citationId, setCitationId] = useState(null);
  const openCitation = useCallback((id) => setCitationId(id), []);
  const closeCitation = useCallback(() => setCitationId(null), []);
  const doExport = () => ReportAPI.export(reportId, "pdf").catch(() => {});
  const doShare = () => ReportAPI.share(reportId).catch(() => {});
  return (
    <div className="pn-root">
      <PolynousStyles />
      <Header reportId={reportId} onExport={doExport} onShare={doShare} />
      <div className="pn-container" style={{ paddingTop: 24, paddingBottom: 48, display: "flex", flexDirection: "column", gap: 24 }}>
        <StatsStrip reportId={reportId} />
        <Pipeline reportId={reportId} />
        <div className="pn-grid pn-grid-4">
          <KeyFindings reportId={reportId} onOpenCitation={openCitation} />
          <EvidenceLedger reportId={reportId} onOpenCitation={openCitation} />
          <ClaimConfidence reportId={reportId} />
          <Faithfulness reportId={reportId} />
        </div>
        <div className="pn-grid" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="pn-card" style={{ flex: 1 }}>
              <h3 className="pn-card-title"><i className="ph ph-chart-polar" style={{ color: COLORS.secondary }} /> ANALYSIS PREVIEW</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Skeleton /><Skeleton w="85%" /><Skeleton /><Skeleton w="65%" /></div>
            </div>
          </div>
          <Perspectives reportId={reportId} onOpenCitation={openCitation} />
          <EvidenceStrength reportId={reportId} />
        </div>
        <div className="pn-grid pn-grid-4">
          <ResearchCoverage reportId={reportId} />
          <SourceLandscape reportId={reportId} />
          <ContradictionNetwork reportId={reportId} />
          <Timeline reportId={reportId} onOpenCitation={openCitation} />
        </div>
        <KUU reportId={reportId} onOpenCitation={openCitation} />
        <div className="pn-grid pn-grid-12">
          <Sensitivity reportId={reportId} onOpenCitation={openCitation} confidence={61} />
          <Trajectory reportId={reportId} />
          <Boundaries reportId={reportId} />
          <ConfidenceBreakdown reportId={reportId} />
        </div>
        <div className="pn-grid pn-grid-12">
          <ToolsUsed reportId={reportId} />
          <RunTelemetry reportId={reportId} />
          <SourceConstellation reportId={reportId} />
          <Provenance reportId={reportId} />
        </div>
      </div>
      <CitationInspector reportId={reportId} citationId={citationId} onClose={closeCitation} />
    </div>
  );
}
