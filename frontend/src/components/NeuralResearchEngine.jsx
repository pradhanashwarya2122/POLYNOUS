import { useState, useEffect, useRef, useMemo } from "react";
import { deepMerge } from "./shared/deepMerge";
import { useTypewriter } from "./shared/useTypewriter";
import { useLiveStream } from "./shared/useLiveStream";
import * as THREE from 'three';

// ============================================================================
// PATCHES 1-5 APPLIED to NeuralResearchEngine.jsx
// ============================================================================

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* premium text rendering */
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .font-display { font-family:'Sora',sans-serif; letter-spacing:-0.01em; }
  .font-mono    { font-family:'JetBrains Mono',monospace; font-feature-settings:'zero' 1; }

  /* green glow accents */
  .panel-glow:hover{ border-color: rgba(255,255,255,0.14) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.35); }

  /* live clock pulse */
  @keyframes tickPulse { 0%,100%{ opacity:1; } 50%{ opacity:0.55; } }
  .tick-dot { }

  body {
    background-color: #0a0a1e;
    color: #dde1e9;
    font-family: 'Hanken Grotesk', sans-serif;
  }

  .panel {
    position: relative;
    background: linear-gradient(170deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    backdrop-filter: blur(20px) saturate(1.05);
    box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
    transition: border-color 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
  }
  .panel:hover {
    border-color: rgba(255,255,255,0.16);
    transform: translateY(-2px);
    box-shadow: 0 14px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
  }

  /* Apple-grade display heading */
  .hero-title {
    font-family:'Sora',sans-serif; font-size:clamp(30px, 2.8vw, 40px); font-weight:700;
    letter-spacing:-0.02em; line-height:1.1; color:#e8eaf2;
  }
  .hero-title .accent { color:#00ff47; }

  .agent-top-cyan   { border-top: 2px solid rgba(79,209,197,0.55); }
  .agent-top-blue   { border-top: 2px solid rgba(0,255,71,0.55); }
  .agent-top-amber  { border-top: 2px solid rgba(232,168,85,0.55); }
  .agent-top-violet { border-top: 2px solid rgba(168,85,247,0.55); }

  .font-display { font-family: 'Sora', sans-serif; }
  .font-mono    { font-family: 'JetBrains Mono', monospace; }

  .custom-scrollbar::-webkit-scrollbar       { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,255,71,0.25); border-radius: 4px; }

  .thought-stream-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
  .thought-stream-scrollbar::-webkit-scrollbar       { width: 4px; }
  .thought-stream-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .thought-stream-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 10px; }

  @keyframes fadeIn        { from { opacity:0; transform:translateY(4px); }  to { opacity:1; transform:translateY(0); } }
  @keyframes slideUpFade   { from { opacity:0; transform:translateY(6px); }  to { opacity:1; transform:translateY(0); } }
  @keyframes flashHighlight{ 0%   { background:rgba(0,255,71,0.10); }     100%{ background:transparent; } }
  @keyframes pulseCore     { 0%   { transform:scale(0.96); opacity:0.85; }   50% { transform:scale(1.04); opacity:1; } 100%{ transform:scale(0.96); opacity:0.85; } }
  @keyframes coreBurst     { 0%   { transform:scale(0.4);  opacity:0.7; }   100%{ transform:scale(2.2);  opacity:0; } }
  @keyframes blinkCaret    { from,to { border-color:transparent; } 50%{ border-color:#00ff47; } }
  @keyframes spin          { from { transform:rotate(0deg); }   to { transform:rotate(360deg); } }
  @keyframes spinReverse   { from { transform:rotate(360deg); } to { transform:rotate(0deg); } }
  @keyframes softPulse     { 0%,100%{ opacity:1; } 50%{ opacity:0.45; } }
  @keyframes popNumber     { 0%{ transform:scale(1); } 35%{ transform:scale(1.16); } 100%{ transform:scale(1); } }
  @keyframes cursorBlink   { 0%,100%{ opacity:1; } 50%{ opacity:0; } }
  @keyframes dotWave       { 0%,60%,100%{ transform:translateY(0);  opacity:0.5; } 30%{ transform:translateY(-4px); opacity:1; } }
  @keyframes tagPop        { 0%{ opacity:0; transform:translateY(4px); } 14%{ opacity:1; transform:translateY(0); } 84%{ opacity:1; } 100%{ opacity:0; transform:translateY(-10px); } }
  @keyframes errorSlideIn  { from{ opacity:0; transform:translateY(-8px); } to{ opacity:1; transform:translateY(0); } }

  .fade-in      { animation: fadeIn 0.4s ease-out forwards; opacity:0; }
  .log-entry    { animation: slideUpFade 0.18s cubic-bezier(0.22,1,0.36,1) forwards; }
  .log-entry-new{ animation: slideUpFade 0.18s cubic-bezier(0.22,1,0.36,1) forwards, flashHighlight 0.9s ease-out forwards; border-radius:8px; }
  .synthesis-core { }
  .float-tag    { animation: fadeIn 0.25s ease-out both; }
  .error-banner { animation: errorSlideIn 0.3s ease-out forwards; }
  .query-caret {
    display:inline-block; width:2px; height:1em; background:#00ff47;
    vertical-align:text-bottom; margin-left:3px;
    animation: cursorBlink 0.8s step-end infinite;
  }

  /* ── Anchored info popover - small, near the button ── */
  @keyframes popIn { from { opacity:0; transform:translateY(-4px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  .info-pop {
    position:fixed; width:340px; max-height:56vh; overflow-y:auto; z-index:1000;
    background:rgba(18,20,32,0.98); border:1px solid rgba(255,255,255,0.12);
    border-radius:12px; padding:20px 22px;
    box-shadow:0 16px 48px rgba(0,0,0,0.5);
    transform-origin:top center;
    animation:popIn 200ms cubic-bezier(0.2,0,0,1) both;
  }
  .info-term { color:#dde1e9; font-weight:600; }
  .info-btn {
    width:22px; height:22px; border-radius:50%; flex-shrink:0;
    display:inline-flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14);
    color:#8e98a8; cursor:pointer; font-size:11px; font-family:'JetBrains Mono',monospace;
    font-style:italic; font-weight:600; line-height:1;
    transition:color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  }
  .info-btn:hover { color:#dde1e9; border-color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.09); transform:scale(1.08); }

  /* ── Thinking loader (replaces elapsed timer) ── */
  @keyframes shimmerText {
    0% { background-position:200% center; } 100% { background-position:-200% center; }
  }
  .thinking-shimmer { color:#9aa3b5; }
  .thought-dot { width:8px; height:8px; border-radius:50%; background:#00ff47; flex-shrink:0; }

  /* ── Premium finish ── */
  /* Top progress beam - whole-page read on research progress */
  .progress-beam-wrap { position:fixed; top:0; left:0; right:0; height:2px; z-index:500; background:rgba(255,255,255,0.04); }
  .progress-beam {
    height:100%; background:#00ff47;
    transition:width 0.25s cubic-bezier(0.2,0,0,1);
  }
  /* Staggered card entrances */
  @keyframes cardEnter { from { opacity:0; transform:translateY(14px) scale(0.99); } to { opacity:1; transform:translateY(0) scale(1); } }
  .card-enter    { animation:cardEnter 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .card-enter-1  { animation-delay:0.05s; } .card-enter-2 { animation-delay:0.12s; }
  .card-enter-3  { animation-delay:0.19s; } .card-enter-4 { animation-delay:0.26s; }
  .panel-glow { overflow:hidden; }
  .animate-spin       { animation: spin 5s linear infinite; }
  .animate-soft-pulse { animation: softPulse 2.2s ease-in-out infinite; }
  .pop-number { display:inline-block; animation: popNumber 0.35s cubic-bezier(0.34,1.56,0.64,1); }
  .card-press { transition: transform 0.15s ease, border-color 0.15s ease; }
  .card-press:active { transform: scale(0.985) !important; }

  .agent-avatar-wrap { position:relative; width:48px; height:48px; flex-shrink:0; }
  .agent-avatar-ring { transform:rotate(-90deg); transition:stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1); }

  .thinking-dots { display:inline-flex; gap:3px; align-items:flex-end; height:8px; }
  .thinking-dots span { width:3px; height:3px; border-radius:50%; background:currentColor; animation:dotWave 1.2s ease-in-out infinite; }
  .thinking-dots span:nth-child(2){ animation-delay:0.15s; }
  .thinking-dots span:nth-child(3){ animation-delay:0.3s;  }

  .hover-row { transition:background 0.2s ease, border-color 0.2s ease; }
  .hover-row:hover { background:rgba(255,255,255,0.03); }
  .bar-fill  { transition:width 0.8s cubic-bezier(0.16,1,0.3,1); }

  .hairline-top { position:relative; }
  .hairline-top::after {
    content:""; position:absolute; top:0; left:18px; right:18px; height:1px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent);
  }

  .signal-panel { position:relative; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px 16px; }
  .signal-bars  { display:flex; align-items:flex-end; gap:4px; height:40px; }
  .signal-bar   { flex:1; border-radius:3px 3px 1px 1px; min-width:3px; transition:height 0.6s cubic-bezier(0.16,1,0.3,1); }
  .signal-badge { font-family:'JetBrains Mono',monospace; font-size:9.5px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; padding:3px 9px; border-radius:999px; border:1px solid; white-space:nowrap; }
  .check-icon   { flex-shrink:0; }

  .ambient-field {
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background:
      radial-gradient(ellipse 60% 40% at 18% 10%, rgba(0,255,71,0.05),transparent 60%),
      radial-gradient(ellipse 50% 35% at 85% 90%, rgba(168,85,247,0.035),transparent 60%);
  }

  .type-heading  { font-family:'Hanken Grotesk',sans-serif; font-size:15px; font-weight:600; color:#dde1e9; letter-spacing:-0.005em; }
  .type-section  { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#8e98a8; }
  .tabular-nums  { font-variant-numeric:tabular-nums; }
  .task-row      { transition:background 0.2s ease; border-radius:8px; }
  .task-row:hover{ background:rgba(255,255,255,0.03); }
  .empty-note    { font-size:11.5px; color:#525c6e; font-family:'JetBrains Mono',monospace; font-style:italic; }
  button:focus-visible, a:focus-visible, select:focus-visible { outline:2px solid #00ff47; outline-offset:2px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation:none !important; transition:none !important; }
  }
  ::selection    { background:#00ff47; color:#0a0a1e; }
`;

const NLI_VARIANTS = {
  entailment:   { from:"#F4CE7C", to:"#8A5E1E", mid:"#E8A855", badge:"#E8A855", label:"ENTAILMENT" },
  contradiction:{ from:"#F0A5A0", to:"#7A2E28", mid:"#E0685F", badge:"#E0685F", label:"CONTRADICTION" },
  neutral:      { from:"#C6CAD4", to:"#454B5A", mid:"#8A90A2", badge:"#8A90A2", label:"NEUTRAL" },
  cyan:         { from:"#9FEAE0", to:"#0F6E63", mid:"#4FD1C5", badge:"#4FD1C5", label:"HIGH RELEVANCE" },
  blue:         { from:"#B7FFB0", to:"#0A5E1A", mid:"#00ff47", badge:"#00ff47", label:"COMPRESSED" },
  purple:       { from:"#DCC9F7", to:"#5B3D8C", mid:"#a855f7", badge:"#a855f7", label:"COHERENT" },
};

const AGENT_META = {
  Search:   { color:"#4FD1C5", rgb:"79,209,197",   key:"cyan",   icon:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  Summarise:{ color:"#00ff47", rgb:"0,255,71",     key:"blue",   icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  Critic:   { color:"#E8A855", rgb:"232,168,85",   key:"amber",  icon:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  Writer:   { color:"#a855f7", rgb:"168,85,247",   key:"purple", icon:"M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
};
const AGENT_NAMES = Object.keys(AGENT_META);

const AGENT_STYLES = {
  cyan:   { badge:{ background:"rgba(79,209,197,0.12)",  color:"#4FD1C5", border:"1px solid rgba(79,209,197,0.28)"  } },
  blue:   { badge:{ background:"rgba(0,255,71,0.12)",    color:"#00ff47", border:"1px solid rgba(0,255,71,0.28)"    } },
  amber:  { badge:{ background:"rgba(232,168,85,0.12)",  color:"#E8A855", border:"1px solid rgba(232,168,85,0.28)"  } },
  purple: { badge:{ background:"rgba(168,85,247,0.12)",  color:"#a855f7", border:"1px solid rgba(168,85,247,0.28)"  } },
};

const LEVEL_COLOR = { low:"#4FD1C5", med:"#E8A855", high:"#E0685F" };

// ── Explainer content for every card's info button ───────────────────────────
const INFO = {
  Search: {
    accent: "#4FD1C5", eyebrow: "Agent 01 - Retrieval",
    title: "Search Agent",
    what: "The Search Agent is the pipeline's gateway to the live web. It queries the Tavily search engine in advanced mode, deduplicates the results, then visits each page in parallel and extracts the full article text - not just the search snippet.",
    terms: [
      ["Latest sources", "The most recently fetched pages. ARTICLE means the full text was successfully extracted; SNIPPET means only the search-engine preview was available."],
      ["Score", "Tavily's 0-1 relevance rating of how well the page matches your query."],
      ["Content depth graph", "One bar per source. Height shows how much usable text was captured - 100% is roughly a full 4,000-character article. Short bars are thin sources the later agents will weigh less."],
    ],
  },
  Summarise: {
    accent: "#00ff47", eyebrow: "Agent 02 - Distillation",
    title: "Summarise Agent",
    what: "The Summarise Agent reads every fetched document in parallel and extracts what each source actually says - the main claim and its key evidence - with no opinion or synthesis. This gives the later agents clean, comparable inputs.",
    terms: [
      ["Key insights", "The opening of each per-source extraction, tagged with the domain it came from."],
      ["Compression graph", "One bar per document - the size of its summary relative to the original text. Low bars mean heavy compression (a long article boiled down hard); high bars mean the source was already short."],
    ],
  },
  Critic: {
    accent: "#E8A855", eyebrow: "Agent 03 - Verification",
    title: "Critic Agent",
    what: "The Critic Agent cross-examines all the summaries at once. It groups the claims where multiple sources agree, surfaces the points where they conflict, and validates every citation - any claim citing a source that doesn't exist is dropped.",
    terms: [
      ["Agreements / Disagreements", "The number of claim groups where sources concur vs. conflict. Zero disagreements over many sources is itself a finding - the literature is consistent."],
      ["Confidence", "A transparent formula, not an LLM guess: the largest group of agreeing sources divided by total sources (+10 if there are 3+ agreement areas). 8 of 12 sources agreeing ≈ 67%."],
      ["Sources per claim graph", "One bar per claim group - how many of the sources participate in it. Tall bars are well-supported claims."],
      ["Validation checklist", "Live status of the real checks: agreement grouping, conflict detection, and citation validation."],
    ],
  },
  Writer: {
    accent: "#a855f7", eyebrow: "Agent 04 - Synthesis",
    title: "Writer Agent",
    what: "The Writer Agent composes the final research digest from the summaries, the critic's analysis, and the knowledge graph. What you watch being typed here is the genuine draft - the same text that becomes the published report below.",
    terms: [
      ["Current draft", "The full digest, revealed as it's written. The report publishes once the draft finishes."],
      ["Words per paragraph graph", "One bar per paragraph of the draft (100% ≈ 120 words) - a quick read on the digest's structure and depth."],
    ],
  },
  thoughts: {
    accent: "#00ff47", eyebrow: "Telemetry",
    title: "Live Thought Stream",
    what: "A real-time feed of every step the agents take - each web page fetched, each document summarised, each analysis phase. Nothing here is simulated; every line corresponds to an actual operation with its timestamp.",
    terms: [
      ["Timestamp", "Minutes:seconds since the research session started."],
      ["Agent badge", "Which of the four agents performed the step."],
    ],
  },
  synthesis: {
    accent: "#00ff47", eyebrow: "Visualisation",
    title: "Synthesis Merge Visual",
    what: "A live picture of knowledge flowing into the answer. Each coloured particle stream is one agent feeding the central synthesis core - streams light up and accelerate while their agent is working, dim when idle, and settle when done.",
    terms: [
      ["Particle streams", "Speed and brightness track each agent's real progress."],
      ["Convergence ring", "How far the synthesis has progressed, scaled by the critic's measured confidence - it only approaches 100% when the pipeline is done and the sources genuinely agree."],
    ],
  },
  metrics: {
    accent: "#4FD1C5", eyebrow: "Telemetry",
    title: "Key Metrics",
    what: "The four headline numbers of the session, updated live as each agent reports.",
    terms: [
      ["Sources", "Web pages retrieved and read so far."],
      ["Insights", "Documents successfully distilled by the Summarise Agent."],
      ["Claims", "Distinct claim groups (agreements + disagreements) the Critic identified."],
      ["Confidence", "The Critic's consensus score - the share of sources backing the most-supported position."],
    ],
  },
  confidence: {
    accent: "#4FD1C5", eyebrow: "Diagnostic 01",
    title: "Confidence Breakdown",
    what: "Four independently measured factors - computed from the retrieved documents themselves, never invented - that together explain how much to trust this answer.",
    terms: [
      ["Source agreement", "Pairwise text overlap between sources: do independent pages actually say the same things?"],
      ["Domain diversity", "Entropy of the source domains - 12 different sites score high; 12 pages from one site score low."],
      ["Recency", "Publication-date decay - recent sources score higher; undated ones sit at 50%."],
      ["Claim grounding", "The share of sentences in the answer that carry a [n] citation back to a source."],
    ],
  },
  trust: {
    accent: "#E8A855", eyebrow: "Diagnostic 02",
    title: "Source Trust Distribution",
    what: "Every source domain is classified into a trust tier using a curated allowlist: journals, universities, and government sites (nature.com, .edu, .gov, arxiv.org…) rate High; social and user-generated platforms (reddit, quora, medium…) rate Low; everything else is Medium.",
    terms: [
      ["The bar", "The percentage of distinct domains in each tier - more teal means the answer rests on stronger institutions."],
      ["Top domains", "The specific sites this research drew from, best tier first."],
    ],
  },
  faithfulness: {
    accent: "#4FD1C5", eyebrow: "Diagnostic 03",
    title: "Faithfulness Analysis",
    what: "A sentence-level audit of the final answer: a sentence counts as grounded when it carries a [n] citation pointing back to a retrieved source. This catches the answer drifting beyond what the sources support.",
    terms: [
      ["Grounded ratio", "Cited sentences over total sentences. If the writer used no [n] markers at all, the ratio falls back to the measured claim-grounding factor instead of flagging everything."],
      ["Flagged statements", "Factual-looking sentences with no citation - read these with extra care."],
    ],
  },
  contradiction: {
    accent: "#E0685F", eyebrow: "Diagnostic 04",
    title: "Contradiction Analysis",
    what: "When the Critic finds sources making genuinely conflicting claims, the sharpest conflict is shown here - both positions quoted side by side with the source numbers backing each. No contradiction card means the sources were consistent.",
    terms: [
      ["Position A / B", "The two competing claims, exactly as the sources state them."],
      ["Trust", "The trust tier of the domains backing each side - a High-trust position usually outweighs a Low-trust one."],
      ["Nature", "The Critic's classification of the conflict - factual dispute, differing scope, or outdated data."],
    ],
  },
  suggestions: {
    accent: "#00ff47", eyebrow: "Next steps",
    title: "Suggested Next Research",
    what: "Follow-up queries generated from the coverage gaps the Critic found - the aspects of your question the current sources didn't answer. One click starts a new session on that gap.",
    terms: [],
  },
};

function InfoBtn({ k, onOpen, style }) {
  return (
    <button
      type="button" className="info-btn" style={style} aria-label="What is this?"
      onClick={(e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        onOpen((prev) => (prev && prev.k === k ? null : { k, x: r.left + r.width / 2, y: r.bottom }));
      }}
    >i</button>
  );
}

function InfoPopover({ open, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [onClose]);
  const info = open && INFO[open.k];
  if (!info) return null;
  const W = 340;
  const left = Math.min(Math.max(12, open.x - W / 2), (window.innerWidth || 1280) - W - 12);
  const top = Math.min(open.y + 10, (window.innerHeight || 800) * 0.42);
  return (
    <div ref={ref} className="info-pop custom-scrollbar" role="dialog" aria-label={info.title} style={{ left, top }}>
      <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"10px", fontWeight:600, letterSpacing:"0.18em", textTransform:"uppercase", color:info.accent, marginBottom:"8px" }}>{info.eyebrow}</div>
      <h3 style={{ fontFamily:"Sora,sans-serif", fontSize:"16px", fontWeight:700, letterSpacing:"-0.01em", color:"#e8eaf2", marginBottom:"10px" }}>{info.title}</h3>
      <p style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"12.5px", lineHeight:1.7, color:"#9aa3b5" }}>{info.what}</p>
      {info.terms.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:"9px", marginTop:"12px", paddingTop:"12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {info.terms.map(([term, desc]) => (
            <p key={term} style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"12px", lineHeight:1.65, color:"#9aa3b5", margin:0 }}>
              <span className="info-term">{term}.</span> {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_DATA = {
  query: "",
  elapsedSeconds: 0,
  progress: 0,
  convergence: 0,
  agents: {
    Search:   { progress:0, phase:{ label:"Idle", sub:"Waiting for research session to start" }, stats:[], lastSource:null, recentSources:[], signal:null },
    Summarise:{ progress:0, phase:{ label:"Idle", sub:"Waiting for research session to start" }, stats:[], notes:[], insights:[], signal:null },
    Critic:   { progress:0, phase:{ label:"Idle", sub:"Waiting for research session to start" }, stats:[], signal:null, checklist:[] },
    Writer:   { progress:0, phase:{ label:"Idle", sub:"Waiting for research session to start" }, stats:[], draftText:"", wordCount:0, signal:null },
  },
  logs: [],
  lanes: {
    Search:   { sub:"", status:"" },
    Summarise:{ sub:"", status:"" },
    Critic:   { sub:"", status:"" },
    Writer:   { sub:"", status:"" },
  },
  floatingTags: [],
  metrics: { sources:" - ", insights:" - ", claims:" - ", confidence:" - " },
  confidenceBreakdown: [],
  sourceTrust: { high:0, med:0, low:0, domains:[] },
  faithfulness:{ grounded:0, total:0, flagged:[] },
  contradiction: null,
  suggestions: [],
};


// What each real-data graph actually plots, shown under the bars.
const SIGNAL_MEANING = {
  "Content depth per source": "Each bar = one source · height = share of a full article captured",
  "Compression ratio per doc": "Each bar = one document · height = summary size vs the original text",
  "Sources per claim group": "Each bar = one claim · height = share of sources supporting it",
  "Words per paragraph": "Each bar = one draft paragraph · 100% ≈ 120 words",
};

// Per-bar hover tooltips explain WHAT the bar represents, not just its value.
const BAR_TIP = {
  "Content depth per source": (i, h) => `Source ${i + 1} - captured ${h}% of a full article (~4,000 chars)`,
  "Compression ratio per doc": (i, h) => `Document ${i + 1} - summary is ${h}% the size of the original`,
  "Sources per claim group": (i, h) => `Claim group ${i + 1} - backed by ${h}% of all sources`,
  "Words per paragraph": (i, h) => `Paragraph ${i + 1} - about ${h}% of a full 120-word paragraph`,
};

function SignalBars({ eyebrow, variant = "entailment", promptLabel, promptText, levels, barLinks, compact = false }) {
  const v    = NLI_VARIANTS[variant] || NLI_VARIANTS.neutral;
  const bars = levels && levels.length ? levels : [];
  const [hoverIdx, setHoverIdx] = useState(null);
  const linkFor = (i) => (Array.isArray(barLinks) && barLinks[i]) ? barLinks[i] : null;
  const openBar = (i) => { const u = linkFor(i); if (u) window.open(u, "_blank", "noopener,noreferrer"); };

  if (!bars.length) {
    return (
      <div className="signal-panel hairline-top">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"9.5px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.09em", fontWeight:600 }}>{eyebrow}</span>
        </div>
        <div className="empty-note" style={{ marginTop:"10px" }}>No signal data yet</div>
      </div>
    );
  }

  return (
    <div className="signal-panel hairline-top">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: compact ? "9px" : "12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:v.badge }} />
          <span style={{ fontSize:"9.5px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.09em", fontWeight:600 }}>{eyebrow}</span>
        </div>
        <span className="signal-badge" style={{ color:v.badge, borderColor:`${v.badge}45`, background:`${v.badge}12` }}>{v.label}</span>
      </div>

      {promptText && (
        <div style={{ fontSize: compact ? "11.5px" : "12.5px", color:"#C7CBD6", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.5, marginBottom:"12px" }}>
          {promptLabel && <span style={{ color:"#8e98a8" }}>{promptLabel}: </span>}
          <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize: compact ? "10.5px" : "11.5px" }}>{promptText}</span>
        </div>
      )}

      <div className="signal-bars" style={{ height: compact ? "26px" : "40px", position:"relative" }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="signal-bar"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((c) => c === i ? null : c)}
            onClick={() => openBar(i)}
            role={linkFor(i) ? "link" : undefined}
            title={linkFor(i) ? "Open source in a new tab" : undefined}
            style={{
              height:`${Math.max(4, Math.min(100, h))}%`,
              background:`linear-gradient(180deg,${v.from},${v.to})`,
              opacity: hoverIdx === i ? 1 : 0.82,
              cursor: linkFor(i) ? "pointer" : "default",
              transform: hoverIdx === i ? "scaleY(1.04)" : "scaleY(1)",
              transformOrigin:"bottom",
              position:"relative",
              zIndex: hoverIdx === i ? 2 : 1,
              boxShadow: (hoverIdx === i && linkFor(i)) ? `0 0 0 1px ${v.badge}` : "none",
            }}
          >
            {hoverIdx === i && (
              <div style={{ position:"absolute", bottom:"100%", left: i < 3 ? "0" : i > bars.length - 4 ? "auto" : "50%", right: i > bars.length - 4 ? "0" : "auto", transform: i < 3 || i > bars.length - 4 ? "none" : "translateX(-50%)", marginBottom:"6px", background:"#12141C", border:`1px solid ${v.badge}55`, borderRadius:"6px", padding:"4px 9px", fontSize:"10px", fontFamily:"Hanken Grotesk,sans-serif", color:"#e8eaf2", whiteSpace:"nowrap", zIndex:5 }}>
                {(BAR_TIP[eyebrow] || ((idx, val) => `Item ${idx + 1} - ${val}%`))(i, Math.round(h))}
                {linkFor(i) && <span style={{ color:v.badge, marginLeft:6, fontFamily:"JetBrains Mono,monospace" }}>↗ open</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      {SIGNAL_MEANING[eyebrow] && (
        <div style={{ marginTop:"9px", fontSize:"10px", fontFamily:"Hanken Grotesk,sans-serif", color:"#525c6e", lineHeight:1.5 }}>
          {SIGNAL_MEANING[eyebrow]}
        </div>
      )}
    </div>
  );
}

const CheckGlyph = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="check-icon">
    <circle cx="7" cy="7" r="6.25" stroke={color} strokeWidth="1.3" fill={`${color}14`} />
    <path d="M4.3 7.1L6.1 8.9L9.7 5.1" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PendingGlyph = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="check-icon">
    <circle cx="7" cy="7" r="6.25" stroke={color} strokeWidth="1.3" strokeDasharray="3 2.5" opacity="0.6" />
  </svg>
);
const SpinGlyph = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="check-icon animate-spin">
    <circle cx="7" cy="7" r="6.25" stroke={color} strokeWidth="1.3" strokeDasharray="14 24" strokeLinecap="round" />
  </svg>
);
const CheckRow = ({ item }) => {
  const color = item.status === "done" ? "#4FD1C5" : item.status === "active" ? "#E8A855" : "#525c6e";
  const Glyph = item.status === "done" ? CheckGlyph : item.status === "active" ? SpinGlyph : PendingGlyph;
  return (
    <div style={{ display:"flex", gap:"9px", color: item.status === "pending" ? "#525c6e" : "#C7CBD6", alignItems:"center", fontSize:"11.5px", fontFamily:"JetBrains Mono,monospace" }}>
      <Glyph color={color} /> {item.label}
    </div>
  );
};

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

export default function NeuralResearchEngine({ data: dataProp, apiUrl, query, responseStyle, streaming = true, forceFresh = false, onComplete, onError }) {
  const _scrape = Number(localStorage.getItem("polynous_scrape_count")) || 0;
  const { liveData, liveError } = useLiveStream(apiUrl, query, { responseStyle, defaultData: DEFAULT_DATA, extraBody: { force_fresh: !!forceFresh, ...(_scrape ? { max_results: _scrape } : {}) }, deps: [forceFresh] });
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(null);

  useEffect(() => { if (liveError) setErrorDismissed(false); }, [liveError]);
  // Surface stream failures to the parent so it can leave the loading state.
  const errorFiredRef = useRef(false);
  useEffect(() => {
    if (liveError && !errorFiredRef.current) {
      errorFiredRef.current = true;
      if (typeof onError === "function") onError(liveError);
    }
  }, [liveError, onError]);

  const data = useMemo(() => {
    const merged = deepMerge(DEFAULT_DATA, dataProp || liveData || {});
    if (query && !merged.query) merged.query = query;
    return merged;
  }, [dataProp, liveData, query]);

  const isDone = (data.progress || 0) >= 100;

  const activeCount = AGENT_NAMES.filter(
    (n) => (data.agents[n].progress || 0) > 0 && (data.agents[n].progress || 0) < 100
  ).length;
  const completedCount2 = AGENT_NAMES.filter((n) => (data.agents[n].progress || 0) >= 100).length;

  // ── Smooth overall progress: derived from real per-agent progress, so it
  //    climbs continuously (each fetched page / summarised doc moves it)
  //    instead of jumping 25% per agent. Backend milestones act as a floor.
  const agentAvg = Math.round(AGENT_NAMES.reduce((s, n) => s + (data.agents[n].progress || 0), 0) / AGENT_NAMES.length);
  const displayProgress = Math.min(100, Math.max(data.progress || 0, agentAvg));

  // ── "Thoughts being formulated" loader (replaces the raw elapsed timer) ──
  const THINKING_PHRASES = {
    Search: [
      "Casting the net wide…", "Reading the open web…", "Weighing source relevance…",
      "Following citation trails…", "Sifting signal from noise…", "Pulling full articles…",
      "Mapping the knowledge landscape…",
    ],
    Summarise: [
      "Distilling each source…", "Extracting key claims…", "Compressing knowledge…",
      "Isolating the evidence…", "Finding what each source really says…", "Trimming away the noise…",
    ],
    Critic: [
      "Cross-examining sources…", "Hunting for contradictions…", "Weighing the evidence…",
      "Checking who agrees with whom…", "Validating every citation…", "Stress-testing the claims…",
      "Measuring consensus…",
    ],
    Writer: [
      "Formulating thoughts…", "Composing the narrative…", "Connecting the threads…",
      "Choosing the right words…", "Structuring the argument…", "Grounding every claim…",
      "Polishing the digest…",
    ],
    idle: ["Warming up the agents…", "Formulating thoughts…", "Spinning up the pipeline…"],
  };
  const activeAgent = AGENT_NAMES.find((n) => (data.agents[n].progress || 0) > 0 && (data.agents[n].progress || 0) < 100);
  const [phraseTick, setPhraseTick] = useState(0);
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setPhraseTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [isDone]);
  const phrasePool = THINKING_PHRASES[activeAgent] || THINKING_PHRASES.idle;
  const thinkingPhrase = phrasePool[phraseTick % phrasePool.length];

  // ── Writer typewriter: full draft, smooth reveal, auto-scroll ────────────
  // "Streaming / progressive token output" preference: on = typewriter reveal,
  // off = the draft appears instantly (near-infinite chars/sec).
  const { visibleText: draftVisible, typing: draftTyping } = useTypewriter(data.agents.Writer.draftText, streaming ? 110 : 100000);
  // Progress can hit 100% while the Writer draft is still typing out (the
  // report publishes only after it finishes). Show an explicit "finalizing"
  // loader in that window instead of a premature "Complete".
  const finalizing = isDone && draftTyping;
  const draftRef = useRef(null);
  useEffect(() => {
    if (draftRef.current) draftRef.current.scrollTop = draftRef.current.scrollHeight;
  }, [draftVisible]);

  // ── Query typewriter (replaces the broken fixed-width CSS animation) ─────
  const { visibleText: queryVisible, typing: queryTyping } = useTypewriter(data.query, 34);

  // ── onComplete: fires only after the pipeline finishes AND the Writer's
  //    draft has fully typed out - the report publishes after the draft.
  const completeFiredRef = useRef(false);
  useEffect(() => {
    if ((data.progress || 0) >= 100 && !draftTyping && !completeFiredRef.current) {
      completeFiredRef.current = true;
      if (typeof onComplete === "function") onComplete(data);
    }
  }, [data.progress, draftTyping, data, onComplete]);

  // ── Live handle for the THREE.js scene: per-agent progress read every
  //    frame so the synthesis visual tracks the real pipeline state.
  const liveProgressRef = useRef({ overall: 0, agents: {} });
  useEffect(() => {
    liveProgressRef.current = {
      overall: displayProgress,
      agents: Object.fromEntries(AGENT_NAMES.map((n) => [n, data.agents[n].progress || 0])),
    };
  }, [displayProgress, data]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [coreBurst,      setCoreBurst]      = useState(0);
  const [hoveredAgent,   setHoveredAgent]   = useState(null);
  const [pressedCard,    setPressedCard]    = useState(null);
  const [activeLane,     setActiveLane]     = useState(null);
  const [isUserScrolling,setIsUserScrolling]= useState(false);
  const [wordPop,        setWordPop]        = useState(0);

  const streamRef          = useRef(null);
  const canvasContainerRef = useRef(null);
  const threeInitedRef     = useRef(false);
  const laneBoostRef       = useRef({ Search:0, Summarise:0, Critic:0, Writer:0 });
  const activeLaneTimeoutRef = useRef(null);
  const prevLogCountRef    = useRef(0);
  const prevWordCountRef   = useRef(data.agents.Writer.wordCount);

  useEffect(() => {
    if (data.logs.length > prevLogCountRef.current) {
      const newest = data.logs[data.logs.length - 1];
      setCoreBurst((b) => b + 1);
      if (newest?.agentName) {
        laneBoostRef.current[newest.agentName] = 1;
        setActiveLane(newest.agentName);
        clearTimeout(activeLaneTimeoutRef.current);
        activeLaneTimeoutRef.current = setTimeout(() => setActiveLane(null), 850);
      }
    }
    prevLogCountRef.current = data.logs.length;
  }, [data.logs]);

  useEffect(() => {
    if (data.agents.Writer.wordCount !== prevWordCountRef.current) {
      setWordPop((p) => p + 1);
      prevWordCountRef.current = data.agents.Writer.wordCount;
    }
  }, [data.agents.Writer.wordCount]);

  useEffect(() => {
    if (!isUserScrolling && streamRef.current) {
      streamRef.current.scrollTo({ top: streamRef.current.scrollHeight, behavior:"smooth" });
    }
  }, [data.logs, isUserScrolling]);

  // ── PATCH 4: ROBUST THREE.JS INIT ──────────────────────────────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (threeInitedRef.current || !container) return;

    let cleanupFn = null;
    let observer = null;

    const tryInit = () => {
      if (threeInitedRef.current) return;
      if (container.clientWidth < 40 || container.clientHeight < 40) return;
      threeInitedRef.current = true;
      if (observer) observer.disconnect();
      cleanupFn = initThree(container);
    };

    observer = new ResizeObserver(tryInit);
    observer.observe(container);
    tryInit();

    return () => {
      if (observer) observer.disconnect();
      if (cleanupFn) cleanupFn();
    };
  }, []);

  function initThree(container) {
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.z = 400;
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const systemColors = [0x4fd1c5, 0x00ff47, 0xe8a855, 0xa855f7];
    const SIGNATURE    = 0x00ff47;
    const coreGroup    = new THREE.Group();
    coreGroup.position.x = 220;
    scene.add(coreGroup);

    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(20,32,32), new THREE.MeshBasicMaterial({ color:0xffffff }));
    coreGroup.add(coreMesh);

    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(48,24,24),
      new THREE.MeshBasicMaterial({ color:SIGNATURE, transparent:true, opacity:0.07, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    coreGroup.add(glowMesh);

    const layers = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color:SIGNATURE, transparent:true, opacity:0.2-i*0.05, blending:THREE.AdditiveBlending });
      const l   = new THREE.Mesh(new THREE.SphereGeometry(24+i*9,32,32), mat);
      coreGroup.add(l); layers.push(l);
    }

    const rings = [];
    for (let i = 0; i < 3; i++) {
      const mat  = new THREE.MeshBasicMaterial({ color:SIGNATURE, transparent:true, opacity:0.15, blending:THREE.AdditiveBlending });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(44+i*16,0.4,16,100), mat);
      ring.rotation.x = Math.random()*Math.PI;
      ring.rotation.y = Math.random()*Math.PI;
      coreGroup.add(ring); rings.push(ring);
    }

    const haloCount = 120;
    const haloGeom  = new THREE.BufferGeometry();
    const haloPos   = new Float32Array(haloCount*3);
    const haloData  = [];
    for (let i = 0; i < haloCount; i++) {
      const r=30+Math.random()*28, theta=Math.random()*Math.PI*2, phi=Math.random()*Math.PI;
      haloData.push({ r, theta, phi, speed:0.15+Math.random()*0.3, phiSpeed:(Math.random()-0.5)*0.08 });
      haloPos[i*3]=r*Math.sin(phi)*Math.cos(theta); haloPos[i*3+1]=r*Math.sin(phi)*Math.sin(theta); haloPos[i*3+2]=r*Math.cos(phi);
    }
    haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos,3));
    const haloMat    = new THREE.PointsMaterial({ color:0xd7ffd4, size:1.4, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending });
    const haloPoints = new THREE.Points(haloGeom, haloMat);
    coreGroup.add(haloPoints);

    const WAVE_COUNT=3, WAVE_PERIOD=2.6;
    const waveGeo = new THREE.RingGeometry(1,1.35,48);
    const waves   = Array.from({ length:WAVE_COUNT },(_,i)=>{
      const mat  = new THREE.MeshBasicMaterial({ color:SIGNATURE, transparent:true, opacity:0, side:THREE.DoubleSide, blending:THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(waveGeo,mat);
      mesh.rotation.x = Math.PI/2.4;
      coreGroup.add(mesh);
      return { mesh, offset:i*(WAVE_PERIOD/WAVE_COUNT) };
    });

    const particleGroups = [];
    const particlesPerStream = 260;
    const agentX = -320;
    const agentYPositions = [120,40,-40,-120];
    agentYPositions.forEach((yPos,index)=>{
      const geometry  = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesPerStream*3);
      const pData     = [];
      for (let i=0;i<particlesPerStream;i++){
        const progressT=Math.random();
        positions[i*3]=agentX+progressT*(coreGroup.position.x-agentX);
        positions[i*3+1]=yPos+(0-yPos)*progressT*progressT;
        positions[i*3+2]=(Math.random()-0.5)*50;
        pData.push({ progress:progressT, speed:0.003+Math.random()*0.008, zOffset:(Math.random()-0.5)*20 });
      }
      geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
      const material = new THREE.PointsMaterial({ color:systemColors[index], size:1.8, transparent:true, opacity:0.65, blending:THREE.AdditiveBlending });
      const points   = new THREE.Points(geometry,material);
      scene.add(points);
      particleGroups.push({ points, pData, originY:yPos, agentName:AGENT_NAMES[index], material });
    });

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const time=Date.now()*0.001;
      const heartbeatPhase=(time%6.4)/6.4;
      const heartbeat=Math.exp(-Math.pow((heartbeatPhase-0.08)*5.5,2));
      const scale=1+Math.sin(time*4)*0.06+heartbeat*0.3;
      coreMesh.scale.set(scale,scale,scale);
      glowMesh.material.opacity=0.05+heartbeat*0.12;
      glowMesh.scale.setScalar(1+heartbeat*0.45);
      layers.forEach((l,i)=>{ const s=1+Math.sin(time*3+i)*0.12+heartbeat*0.16; l.scale.set(s,s,s); l.material.opacity=(0.2-i*0.05)*(0.85+Math.sin(time*5)*0.15)+heartbeat*0.1; });
      rings.forEach((r,i)=>{ r.rotation.x+=0.008*(i+1); r.rotation.z+=0.004; });
      const hArr=haloPoints.geometry.attributes.position.array;
      haloData.forEach((d,i)=>{ d.theta+=d.speed*0.01; d.phi+=d.phiSpeed*0.01; hArr[i*3]=d.r*Math.sin(d.phi)*Math.cos(d.theta); hArr[i*3+1]=d.r*Math.sin(d.phi)*Math.sin(d.theta); hArr[i*3+2]=d.r*Math.cos(d.phi); });
      haloPoints.geometry.attributes.position.needsUpdate=true;
      haloMat.opacity=0.55+heartbeat*0.35;
      haloPoints.rotation.y+=0.0012;
      waves.forEach((w)=>{ const local=((time+w.offset)%WAVE_PERIOD)/WAVE_PERIOD; const s=0.4+local*3.2; w.mesh.scale.set(s,s,s); w.mesh.material.opacity=Math.max(0,0.28*(1-local)); });
      // Scene intensity follows the REAL pipeline state, not a fixed loop:
      // idle lanes are nearly invisible, the working lane runs bright and
      // fast, finished lanes settle to a calm steady flow.
      const live=liveProgressRef.current;
      const overallT=(live.overall||0)/100;
      glowMesh.material.opacity=0.04+overallT*0.06+heartbeat*0.12;
      haloMat.opacity=0.3+overallT*0.35+heartbeat*0.3;
      particleGroups.forEach((group)=>{
        const pos=group.points.geometry.attributes.position.array;
        const boost=laneBoostRef.current[group.agentName]||0;
        const agentP=(live.agents[group.agentName]||0);
        const laneState=agentP<=0?0.25:(agentP>=100?0.65:1);  // idle | done | working
        group.material.size=1.6+laneState*0.9+boost*2;
        group.material.opacity=(0.22+laneState*0.6)+boost*0.3;
        laneBoostRef.current[group.agentName]=boost*0.94;
        const speedMul=(agentP<=0?0.25:(agentP>=100?0.6:1.2))+boost*1.6;
        group.pData.forEach((d2,i)=>{
          d2.progress+=d2.speed*speedMul; if(d2.progress>=1) d2.progress=0;
          const t=d2.progress;
          pos[i*3]=agentX+t*(coreGroup.position.x-agentX);
          pos[i*3+1]=group.originY+(0-group.originY)*t*t+Math.sin(t*10+time)*5;
          pos[i*3+2]=d2.zOffset+Math.cos(t*10+time)*5;
        });
        group.points.geometry.attributes.position.needsUpdate=true;
      });
      renderer.render(scene,camera);
    };

    const onResize=()=>{ camera.aspect=container.clientWidth/container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth,container.clientHeight); };
    window.addEventListener("resize",onResize);
    animate();
    return ()=>{ cancelAnimationFrame(rafId); window.removeEventListener("resize",onResize); renderer.dispose(); if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
  }

  const AgentIcon = ({ path, size=18, style }) => (
    <svg style={{ width:size, height:size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );

  const AgentAvatar = ({ name }) => {
    const meta   = AGENT_META[name];
    const pct    = data.agents[name].progress || 0;
    const offset = RING_C - (pct/100)*RING_C;
    const isHov  = hoveredAgent === name;
    return (
      <div className="agent-avatar-wrap" onMouseEnter={()=>setHoveredAgent(name)} onMouseLeave={()=>setHoveredAgent(null)} title={`${pct}% complete`}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
          <circle className="agent-avatar-ring" cx="24" cy="24" r={RING_R} fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={offset} />
        </svg>
        <div style={{ position:"absolute", inset:"7px", borderRadius:"50%", background:`rgba(${meta.rgb},0.1)`, border:`1px solid rgba(${meta.rgb},0.3)`, display:"flex", alignItems:"center", justifyContent:"center", color:meta.color, transition:"transform 0.3s ease", transform:isHov?"scale(1.08)":"scale(1)" }}>
          <AgentIcon path={meta.icon} size={15} />
        </div>
        <div style={{ position:"absolute", bottom:"-3px", right:"-3px", fontSize:"8px", fontFamily:"JetBrains Mono,monospace", color:meta.color, background:"#101219", borderRadius:"6px", padding:"1px 4px", border:`1px solid rgba(${meta.rgb},0.35)`, fontWeight:700 }}>{pct}</div>
      </div>
    );
  };

  const AgentHeader = ({ name }) => {
    const meta  = AGENT_META[name];
    const phase = data.agents[name].phase || { label:"Idle", sub:"" };
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid rgba(${meta.rgb},0.18)`, paddingBottom:"11px" }}>
          <div className="font-display" style={{ display:"flex", alignItems:"center", gap:"9px", fontWeight:"600", fontSize:"14.5px", letterSpacing:"0.01em", color:meta.color }}>
            <AgentIcon path={meta.icon} style={{ color:meta.color }} />
            {name} Agent
          </div>
          <InfoBtn k={name} onOpen={setInfoOpen} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <AgentAvatar name={name} />
          <div className="font-mono" style={{ color:"#8e98a8", lineHeight:1.5, fontSize:"11.5px" }}>
            <span key={phase.label} style={{ color:meta.color, fontWeight:700, display:"inline-flex", alignItems:"center", gap:"6px" }}>
              {phase.label}
              {phase.label !== "Idle" && <span className="thinking-dots" style={{ color:meta.color }}><span/><span/><span/></span>}
            </span>
            <br />{phase.sub}
          </div>
        </div>
      </div>
    );
  };

  const StatRows = ({ stats }) => (
    <>
      {stats && stats.length > 0
        ? stats.map(([label,val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#8e98a8" }}>{label}</span>
              <span style={{ color:"#C7CBD6" }}>{val}</span>
            </div>
          ))
        : <div className="empty-note">No stats yet</div>
      }
    </>
  );

  const search   = data.agents.Search;
  const summarise= data.agents.Summarise;
  const critic   = data.agents.Critic;
  const writer   = data.agents.Writer;

  return (
    <>
      <style>{styles}</style>
      <div className="ambient-field" />
      <div className="progress-beam-wrap"><div className="progress-beam" style={{ width:`${displayProgress}%` }} /></div>
      {infoOpen && <InfoPopover open={infoOpen} onClose={() => setInfoOpen(null)} />}

      {liveError && !errorDismissed && (
        <div className="error-banner" style={{
          position:"fixed", top:0, left:0, right:0, zIndex:9999,
          background:"rgba(224,104,95,0.12)", backdropFilter:"blur(12px)",
          borderBottom:"1px solid rgba(224,104,95,0.35)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 32px", gap:16,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="16" height="16" fill="none" stroke="#E0685F" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
            </svg>
            <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"12px", color:"#E0685F", fontWeight:600 }}>
              {liveError}
            </span>
          </div>
          <button
            onClick={() => setErrorDismissed(true)}
            style={{ background:"none", border:"none", color:"#E0685F", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px", opacity:0.7 }}
          >×</button>
        </div>
      )}

      <div style={{
        minHeight:"100vh",
        padding: liveError && !errorDismissed ? "100px 88px 56px" : "56px 88px",
        display:"flex", flexDirection:"column", gap:"44px",
        background:"#0a0a1e", position:"relative", zIndex:1,
        transition:"padding-top 0.3s ease",
      }}>

        {/* ── Header ── */}
        <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"0 4px" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"10px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#00ff47" }} />
              <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"10px", fontWeight:600, color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.18em" }}>
                Multi-agent research session
              </span>
            </div>
            <h1 className="hero-title">
              Neural Research <span className="accent">Engine</span>
            </h1>
            <div style={{ marginTop:"14px", fontSize:"12px", fontFamily:"JetBrains Mono,monospace" }}>
              <span style={{ color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.05em" }}>Research query</span>
              <br />
              {data.query
                ? <span style={{ color:"#C7CBD6", marginTop:"6px", display:"inline-block" }}>{queryVisible}{queryTyping && <span className="query-caret" />}</span>
                : <span className="empty-note" style={{ display:"block", marginTop:"6px" }}>Awaiting query</span>
              }
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"36px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", position:"relative" }}>
              <div className="synthesis-core" style={{ width:"58px", height:"58px", borderRadius:"50%", border:"1px solid rgba(0,255,71,0.28)", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,255,71,0.06)", position:"relative" }}>
                <div className="animate-spin" style={{ position:"absolute", inset:0, border:"1.5px solid rgba(0,255,71,0.4)", borderRadius:"50%" }} />
                <div style={{ position:"absolute", inset:"-4px", border:"1px dashed rgba(0,255,71,0.2)", borderRadius:"50%", animation:"spinReverse 9s linear infinite" }} />
                <div style={{ width:"10px", height:"10px", background:"#00ff47", borderRadius:"50%" }} />
                <div key={coreBurst} style={{ position:"absolute", inset:"18px", borderRadius:"50%", border:"1px solid #00ff47", animation: coreBurst ? "coreBurst 0.9s ease-out forwards" : "none" }} />
              </div>
              <div>
                <div style={{ fontSize:"15px", color:"#dde1e9", fontWeight:700, fontFamily:"Sora,sans-serif", letterSpacing:"-0.02em" }}>
                  {isDone ? "Synthesis complete" : "Synthesizing insights"}
                </div>
                <div style={{ fontSize:"11.5px", color:"#8e98a8", marginTop:"4px", fontFamily:"Hanken Grotesk,sans-serif", display:"flex", alignItems:"center", gap:"6px" }}>
                  {isDone
                    ? `${completedCount2} agents finished · ${data.metrics.sources || 0} sources analysed`
                    : <>
                        <span style={{ display:"inline-flex", width:"5px", height:"5px", borderRadius:"50%", background:"#00ff47", boxShadow:"0 0 6px #00ff47" }} className="animate-soft-pulse" />
                        {activeCount > 0 ? `${activeCount} of 4 agents active` : "Agents collaborating in real time"}
                      </>
                  }
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:"32px", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"10.5px", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"JetBrains Mono,monospace", marginBottom:"6px" }}>Progress</div>
                <div style={{ fontSize:"26px", fontFamily:"Sora,sans-serif", color:"#FFFFFF", fontWeight:"700" }}>
                  <span key={displayProgress} className="pop-number">{displayProgress}</span>
                  <span style={{ fontSize:"14px", color:"#8e98a8" }}>%</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize:"10.5px", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"JetBrains Mono,monospace", marginBottom:"6px" }}>
                  {isDone ? "Agents done" : "Agents active"}
                </div>
                <div style={{ fontSize:"26px", fontFamily:"Sora,sans-serif", color:"#FFFFFF", fontWeight:"700" }}>
                  {isDone ? completedCount2 : activeCount}
                  <span style={{ fontSize:"14px", color:"#8e98a8" }}>/4</span>
                </div>
              </div>
              <div style={{ minWidth:"190px" }}>
                <div style={{ fontSize:"10.5px", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"JetBrains Mono,monospace", marginBottom:"6px" }}>
                  {finalizing ? "Status" : isDone ? "Status" : "Neural activity"}
                </div>
                {finalizing ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <span style={{ display:"inline-flex", gap:"4px" }}>
                      {[0,1,2].map(d => <span key={d} style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#00ff47", animation:`dotWave 1.1s ${d*0.16}s infinite ease-in-out` }} />)}
                    </span>
                    <span style={{ fontSize:"14px", fontFamily:"Sora,sans-serif", color:"#00ff47", fontWeight:700 }}>Finalizing report…</span>
                  </div>
                ) : isDone ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"9px", fontSize:"16px", fontFamily:"Sora,sans-serif", color:"#00ff47", fontWeight:700 }}>
                    <CheckGlyph color="#00ff47" /> Complete
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <span className="thought-dot" aria-hidden="true" />
                    <span key={thinkingPhrase} className="thinking-shimmer phrase-swap" style={{ fontSize:"13.5px", fontFamily:"Hanken Grotesk,sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>
                      {thinkingPhrase}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Agent Grid ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:"36px" }}>
          <main style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"24px" }}>

            {/* Search */}
            <section className="panel panel-glow agent-top-cyan card-enter card-enter-1" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
              <AgentHeader name="Search" />
              <div className="font-mono" style={{ fontSize:"11.5px", marginTop:"-4px", borderLeft:"2px solid rgba(79,209,197,0.25)", paddingLeft:"14px", display:"flex", flexDirection:"column", gap:"7px" }}>
                <StatRows stats={search.stats} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                <div className="type-section" style={{ color:"#4FD1C5" }}>Latest sources</div>
                {(search.recentSources && search.recentSources.length) ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
                    {search.recentSources.map((src, i) => {
                      const Row = src.url ? "a" : "div";
                      return (
                      <Row key={`${src.domain}-${i}`} {...(src.url ? { href: src.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="fade-in hover-row" title={src.url ? "Open source in a new tab" : undefined}
                        style={{ display:"flex", alignItems:"center", gap:"10px", background:"rgba(255,255,255,0.03)", padding:"9px 11px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none", cursor: src.url ? "pointer" : "default" }}>
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`}
                          alt=""
                          width="16" height="16"
                          style={{ borderRadius:"4px", flexShrink:0, background:"rgba(79,209,197,0.1)" }}
                          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                        />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <span style={{ fontSize:"11.5px", fontWeight:600, color:"#dde1e9", fontFamily:"Hanken Grotesk,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src.domain}</span>
                            {src.badge && (
                              <span style={{ fontSize:"8.5px", color:"#4FD1C5", padding:"1px 6px", borderRadius:"999px", border:"1px solid rgba(79,209,197,0.3)", background:"rgba(79,209,197,0.08)", fontFamily:"JetBrains Mono,monospace", fontWeight:700, letterSpacing:"0.04em", flexShrink:0 }}>{src.badge}</span>
                            )}
                          </div>
                          <div style={{ fontSize:"10.5px", color:"#8e98a8", marginTop:"2px", lineHeight:"1.35", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src.title}</div>
                        </div>
                        <span style={{ color:"#4FD1C5", fontSize:"11.5px", fontFamily:"JetBrains Mono,monospace", fontWeight:600, flexShrink:0 }}>{src.score}</span>
                        {src.url && <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#4FD1C5", flexShrink:0, opacity:0.75 }}>open_in_new</span>}
                      </Row>
                      );
                    })}
                  </div>
                ) : search.lastSource ? (
                  (() => {
                    const LS = search.lastSource; const Row = LS.url ? "a" : "div";
                    return (
                      <Row {...(LS.url ? { href: LS.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="fade-in hover-row" title={LS.url ? "Open source in a new tab" : undefined}
                        style={{ display:"flex", alignItems:"flex-start", gap:"11px", background:"rgba(255,255,255,0.03)", padding:"11px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none", cursor: LS.url ? "pointer" : "default" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div style={{ fontSize:"12.5px", fontWeight:"600", fontFamily:"Hanken Grotesk,sans-serif", color:"#dde1e9", display:"flex", alignItems:"center", gap:"6px" }}>{LS.id}{LS.url && <span className="material-symbols-outlined" style={{ fontSize:"14px", color:"#4FD1C5", opacity:0.75 }}>open_in_new</span>}</div>
                            <div style={{ fontSize:"9.5px", color:"#8e98a8", fontFamily:"JetBrains Mono,monospace" }}>{LS.time}</div>
                          </div>
                          <div style={{ fontSize:"11.5px", color:"#8e98a8", marginTop:"4px", lineHeight:"1.4" }}>{LS.title || LS.description}</div>
                        </div>
                        {LS.score && <div style={{ color:"#4FD1C5", fontSize:"13px", fontFamily:"JetBrains Mono,monospace", alignSelf:"center", fontWeight:"600" }}>{LS.score}</div>}
                      </Row>
                    );
                  })()
                ) : <div className="empty-note">No sources yet</div>}
                <SignalBars {...(search.signal || { eyebrow:"Content depth per source", variant:"cyan" })} />
              </div>
            </section>

            {/* Summarise */}
            <section className="panel panel-glow agent-top-blue card-enter card-enter-2" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
              <AgentHeader name="Summarise" />
              <div className="font-mono" style={{ fontSize:"11.5px", marginTop:"-4px", borderLeft:"2px solid rgba(0,255,71,0.25)", paddingLeft:"14px", display:"flex", flexDirection:"column", gap:"7px" }}>
                <StatRows stats={summarise.stats} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                <div>
                  <div className="type-section" style={{ color:"#00ff47", marginBottom:"10px" }}>Working notes</div>
                  {summarise.notes && summarise.notes.length
                    ? <ul style={{ fontSize:"12.5px", color:"#C7CBD6", display:"flex", flexDirection:"column", gap:"9px", fontFamily:"Hanken Grotesk,sans-serif", listStyle:"disc", paddingLeft:"18px", lineHeight:"1.55" }}>{summarise.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>
                    : <div className="empty-note">No notes yet</div>
                  }
                </div>
                <div className="hover-row" style={{ background:"rgba(0,255,71,0.05)", border:"1px solid rgba(0,255,71,0.15)", borderRadius:"10px", padding:"14px" }}>
                  <div className="type-section" style={{ color:"#00ff47", marginBottom:"7px" }}>Key insights extracted</div>
                  {summarise.insights && summarise.insights.length
                    ? <ul style={{ fontSize:"11.5px", color:"#8e98a8", display:"flex", flexDirection:"column", gap:"7px", fontFamily:"JetBrains Mono,monospace", listStyle:"disc", paddingLeft:"15px", margin:0, maxWidth:"100%", boxSizing:"border-box" }}>
                        {summarise.insights.map((ins,i)=>(
                          <li key={i} style={{ overflowWrap:"anywhere", wordBreak:"break-word", lineHeight:1.55, minWidth:0 }}>{ins.text}{ins.tag && <span style={{ display:"inline-block", marginLeft:"4px", padding:"0 4px", background:"rgba(255,255,255,0.08)", borderRadius:"4px", fontSize:"8.5px", whiteSpace:"nowrap" }}>{ins.tag}</span>}</li>
                        ))}
                      </ul>
                    : <div className="empty-note">No insights yet</div>
                  }
                </div>
                <SignalBars {...(summarise.signal || { eyebrow:"Compression ratio per doc", variant:"blue" })} />
              </div>
            </section>

            {/* Critic */}
            <section className="panel panel-glow agent-top-amber card-enter card-enter-3" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
              <AgentHeader name="Critic" />
              <div className="font-mono" style={{ fontSize:"11.5px", marginTop:"-4px", borderLeft:"2px solid rgba(232,168,85,0.25)", paddingLeft:"14px", display:"flex", flexDirection:"column", gap:"7px" }}>
                <StatRows stats={critic.stats} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <SignalBars {...(critic.signal || { eyebrow:"Current check", variant:"entailment" })} />
                <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"13px 15px", display:"flex", flexDirection:"column", gap:"10px" }}>
                  <div className="type-section" style={{ marginBottom:"1px" }}>Validation checklist</div>
                  {critic.checklist && critic.checklist.length
                    ? critic.checklist.map((item,i)=><CheckRow key={i} item={item} />)
                    : <div className="empty-note">No checks yet</div>
                  }
                </div>
                {/* RES-05: the critic's actual read - landscape, sharpest unique
                    finding, and the biggest coverage gap - so the card is
                    substantive, not just a checklist. */}
                {(critic.landscape || critic.topInsight || critic.topGap) && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    {critic.landscape && (
                      <div style={{ background:"rgba(232,168,85,0.05)", border:"1px solid rgba(232,168,85,0.18)", borderRadius:"10px", padding:"12px 14px" }}>
                        <div className="type-section" style={{ color:"#E8A855", marginBottom:"6px" }}>Critic's read</div>
                        <div style={{ fontSize:"12px", color:"#c8d0dc", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.6, overflowWrap:"anywhere" }}>{critic.landscape}</div>
                      </div>
                    )}
                    {critic.topInsight && (
                      <div style={{ display:"flex", gap:"9px", alignItems:"flex-start", padding:"0 2px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#00ff47", flexShrink:0, marginTop:"1px" }}>lightbulb</span>
                        <div style={{ fontSize:"11.5px", color:"#8e98a8", fontFamily:"JetBrains Mono,monospace", lineHeight:1.55, overflowWrap:"anywhere" }}><span style={{ color:"#00ff47" }}>Unique: </span>{critic.topInsight}</div>
                      </div>
                    )}
                    {critic.topGap && (
                      <div style={{ display:"flex", gap:"9px", alignItems:"flex-start", padding:"0 2px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#E8A855", flexShrink:0, marginTop:"1px" }}>search_off</span>
                        <div style={{ fontSize:"11.5px", color:"#8e98a8", fontFamily:"JetBrains Mono,monospace", lineHeight:1.55, overflowWrap:"anywhere" }}><span style={{ color:"#E8A855" }}>Gap: </span>{critic.topGap}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Writer */}
            <section className="panel panel-glow agent-top-violet card-enter card-enter-4" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
              <AgentHeader name="Writer" />
              <div className="font-mono" style={{ fontSize:"11.5px", marginTop:"-4px", borderLeft:"2px solid rgba(168,85,247,0.25)", paddingLeft:"14px", display:"flex", flexDirection:"column", gap:"7px" }}>
                <StatRows stats={writer.stats} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <div className="type-section" style={{ color:"#a855f7" }}>Current draft</div>
                <div ref={draftRef} className="custom-scrollbar" style={{ background:"#0E0F16", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", padding:"16px", fontSize:"12.5px", color:"#C7CBD6", fontFamily:"JetBrains Mono,monospace", lineHeight:"1.65", height:"220px", overflowY:"auto", whiteSpace:"pre-wrap" }}>
                  {writer.draftText
                    ? <><span>{draftVisible}</span>{draftTyping && <span style={{ display:"inline-block", width:"7px", height:"14px", background:"#a855f7", verticalAlign:"middle", marginLeft:"3px", animation:"cursorBlink 0.9s step-end infinite" }} />}</>
                    : <span className="empty-note">Draft will appear here</span>
                  }
                </div>
                <SignalBars {...(writer.signal || { eyebrow:"Narrative coherence", variant:"purple" })} />
              </div>
            </section>
          </main>

          {/* ── Middle Row ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"24px", height:"360px" }}>

            {/* Live Thought Stream */}
            <section className="panel panel-glow" style={{ padding:0, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
              <div style={{ padding:"18px 18px 11px", background:"rgba(10,10,30,0.85)", zIndex:10, borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div className="type-section" style={{ display:"flex", alignItems:"center", gap:"7px", color:"#dde1e9" }}>
                    <svg style={{ width:"14px", height:"14px", color:"#00ff47" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>
                    Live thought stream
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"7px", fontSize:"9.5px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8", background:"rgba(255,255,255,0.04)", padding:"4px 9px", borderRadius:"4px", border:"1px solid rgba(255,255,255,0.08)" }}>
                      <div className="animate-soft-pulse" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#4FD1C5" }} />
                      AUTO-SCROLL
                    </div>
                    <InfoBtn k="thoughts" onOpen={setInfoOpen} />
                  </div>
                </div>
              </div>
              <div
                ref={streamRef}
                className="thought-stream-scrollbar"
                style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:"10px", fontFamily:"JetBrains Mono,monospace", fontSize:"11.5px" }}
                onScroll={()=>{ if(!streamRef.current) return; const {scrollHeight,clientHeight,scrollTop}=streamRef.current; setIsUserScrolling(scrollHeight-clientHeight-scrollTop>10); }}
              >
                {data.logs.length ? data.logs.map((log,i)=>{
                  const meta=AGENT_META[log.agentName]||AGENT_META.Search;
                  const isNew=i===data.logs.length-1;
                  return (
                    <div key={log.id??i} className={isNew?"log-entry-new":"log-entry"} style={{ display:"flex", gap:"14px", alignItems:"flex-start", padding:"7px", borderRadius:"8px" }}>
                      <span style={{ color:"#525c6e", width:"58px", flexShrink:0, fontSize:"10.5px", marginTop:"2px" }}>{log.timeStr}</span>
                      <span style={{ ...AGENT_STYLES[meta.key].badge, padding:"3px 7px", borderRadius:"6px", fontSize:"9px", textTransform:"uppercase", width:"72px", textAlign:"center", flexShrink:0, fontWeight:"700", letterSpacing:"0.04em" }}>{log.agentName}</span>
                      <span style={{ color:"#C7CBD6", flex:1, fontSize:"11.5px", lineHeight:"1.55" }}>{log.msg}</span>
                    </div>
                  );
                }) : <div className="empty-note">No activity yet</div>}
              </div>
            </section>

            {/* Synthesis Merge Visual */}
            <section className="panel panel-glow" style={{ padding:0, gridColumn:"span 2", position:"relative", overflow:"hidden", height:"100%", display:"flex", flexDirection:"column" }}>
              <div className="type-section" style={{ position:"absolute", top:"20px", left:"20px", color:"#dde1e9", zIndex:20, display:"flex", alignItems:"center", gap:"9px" }}>
                Synthesis merge visual
                <InfoBtn k="synthesis" onOpen={setInfoOpen} />
              </div>
              <div style={{ position:"absolute", top:"44px", left:"20px", fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8", zIndex:20 }}>Real-time knowledge convergence</div>
              <div ref={canvasContainerRef} style={{ position:"relative", width:"100%", height:"100%", background:"#0a0a1e", overflow:"hidden", display:"flex", alignItems:"center" }}>
                <div style={{ position:"absolute", left:"28px", top:0, bottom:0, display:"flex", flexDirection:"column", justifyContent:"space-around", padding:"28px 0", zIndex:10, pointerEvents:"none" }}>
                  {AGENT_NAMES.map((name)=>{
                    const meta=AGENT_META[name];
                    const lane=data.lanes[name]||{ sub:"", status:"" };
                    const reacting=activeLane===name;
                    const iconMap={ Search:"search", Summarise:"description", Critic:"verified_user", Writer:"edit_note" };
                    return (
                      <div key={name} style={{ display:"flex", alignItems:"center", gap:"14px", transition:"transform 0.3s ease", transform:reacting?"translateX(3px)":"translateX(0)" }}>
                        <div style={{ width:"36px", height:"36px", borderRadius:"8px", border:`1px solid ${reacting?meta.color:`rgba(${meta.rgb},0.25)`}`, background:`rgba(${meta.rgb},0.08)`, display:"flex", alignItems:"center", justifyContent:"center", color:meta.color, transition:"border-color 0.3s ease,transform 0.3s ease", transform:reacting?"scale(1.08)":"scale(1)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize:"16px" }}>{iconMap[name]}</span>
                        </div>
                        <div>
                          <div style={{ fontSize:"9.5px", fontWeight:"700", color:meta.color, fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.08em", textTransform:"uppercase" }}>{name} Agent</div>
                          <div style={{ fontSize:"8.5px", color:"#8e98a8", fontFamily:"JetBrains Mono,monospace" }}>{lane.sub}{lane.status && <span className="animate-soft-pulse" style={{ marginLeft:"4px", color:meta.color }}>{lane.status}</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:20, overflow:"hidden" }}>
                  {data.floatingTags.map((t,i)=>{
                    const meta=AGENT_META[t.agent]||AGENT_META.Search;
                    return (
                      <div key={i} className="float-tag" style={{ position:"absolute", top:t.top, left:t.left, right:t.right, bottom:t.bottom, background:"rgba(14,15,22,0.85)", border:`1px solid rgba(${meta.rgb},0.3)`, padding:"6px 8px", borderRadius:"6px", fontSize:"9px", fontFamily:"JetBrains Mono,monospace", color:"#dde1e9", animationDelay:t.delay||"0s" }}>
                        <span style={{ color:meta.color, fontWeight:"700", textTransform:"uppercase" }}>{t.label}</span>: {t.value}
                      </div>
                    );
                  })}
                </div>

                <div style={{ position:"absolute", bottom:"20px", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:"9px", zIndex:20, background:"rgba(10,10,30,0.75)", padding:"6px 15px 6px 9px", borderRadius:"9999px", border:"1px solid rgba(0,255,71,0.25)" }}>
                  <svg width="18" height="18" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(0,255,71,0.14)" strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#00ff47" strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={2*Math.PI*8}
                      strokeDashoffset={2*Math.PI*8*(1-(data.convergence||0)/100)}
                      style={{ transform:"rotate(-90deg)", transformOrigin:"center", transition:"stroke-dashoffset 0.6s ease" }}
                    />
                  </svg>
                  <span style={{ fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#C7CBD6", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Convergence <span key={data.convergence} className="pop-number" style={{ display:"inline-block", color:"#00ff47", fontWeight:700 }}>{data.convergence}%</span>
                  </span>
                </div>
              </div>
            </section>

            {/* Key Metrics */}
            <section className="panel panel-glow" style={{ padding:"28px", display:"flex", flexDirection:"column", gap:"18px", height:"100%" }}>
              <div className="type-section" style={{ color:"#dde1e9", marginBottom:"4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                Key metrics
                <InfoBtn k="metrics" onOpen={setInfoOpen} />
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                {[
                  { icon:"description", label:"Sources",    val:data.metrics.sources    },
                  { icon:"lightbulb",   label:"Insights",   val:data.metrics.insights   },
                  { icon:"verified",    label:"Claims",     val:data.metrics.claims     },
                  { icon:"analytics",   label:"Confidence", val:data.metrics.confidence },
                ].map((m,i)=>(
                  <div key={m.label} className="hover-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none", paddingBottom:i<3?"14px":0, paddingTop:i===3?"3px":0, borderRadius:"8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", color:"#8e98a8" }}>
                      <span className="material-symbols-outlined" style={{ fontSize:"18px" }}>{m.icon}</span>
                      <span style={{ fontSize:"11.5px", fontFamily:"JetBrains Mono,monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>{m.label}</span>
                    </div>
                    <span style={{ color:"#dde1e9", fontFamily:"Sora,sans-serif", fontSize:"21px", fontWeight:"700" }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Diagnostics + Suggestions ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:"36px", marginTop:"20px", paddingTop:"36px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"22px" }}>
            <h2 className="font-display" style={{ fontSize:"18px", fontWeight:"700", color:"#dde1e9", padding:"0 4px", borderLeft:"2px solid #00ff47", paddingLeft:"14px" }}>Research diagnostics</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"24px" }}>

              {/* Confidence Breakdown */}
              <section className="panel panel-glow" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
                <div className="type-heading" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:"11px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  Confidence breakdown
                  <InfoBtn k="confidence" onOpen={setInfoOpen} />
                </div>
                <div style={{ fontSize:"12px", color:"#8e98a8", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.55, marginTop:"-8px" }}>
                  Four factors measured from the sources themselves - how much to trust this answer, and why.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"14px", flex:1 }}>
                  {data.confidenceBreakdown.length
                    ? data.confidenceBreakdown.map((bar)=>{
                        const FACTOR_DESC = {
                          "Source Agreement":"do independent sources say the same things?",
                          "Domain Diversity":"how many distinct websites back this up?",
                          "Recency":"how recent are the sources?",
                          "Claim Grounding":"how much of the answer carries citations?",
                        };
                        return (
                        <div key={bar.label}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#8e98a8", textTransform:"uppercase", marginBottom:"4px", fontFamily:"JetBrains Mono,monospace" }}>
                            <span>{bar.label}</span>
                            <span style={{ color:bar.color||"#00ff47", fontWeight:"700" }}>{bar.pct}%</span>
                          </div>
                          {FACTOR_DESC[bar.label] && (
                            <div style={{ fontSize:"10.5px", color:"#525c6e", fontFamily:"Hanken Grotesk,sans-serif", marginBottom:"7px" }}>{FACTOR_DESC[bar.label]}</div>
                          )}
                          <div style={{ height:"6px", background:"rgba(255,255,255,0.05)", borderRadius:"9999px", overflow:"hidden" }}>
                            <div className="bar-fill" style={{ height:"100%", width:`${bar.pct}%`, background:bar.color||"#00ff47" }} />
                          </div>
                        </div>
                        );
                      })
                    : <div className="empty-note">Computed after the draft is written - needs the final answer to measure against.</div>
                  }
                </div>
              </section>

              {/* Source Trust */}
              <section className="panel panel-glow" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
                <div className="type-heading" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:"11px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  Source trust distribution
                  <InfoBtn k="trust" onOpen={setInfoOpen} />
                </div>
                <div style={{ fontSize:"12px", color:"#8e98a8", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.55, marginTop:"-8px" }}>
                  Share of source domains by credibility tier - journals &amp; institutions rate High, social platforms rate Low.
                </div>
                <div>
                  <div style={{ display:"flex", height:"12px", borderRadius:"9999px", overflow:"hidden", marginBottom:"10px" }}>
                    <div style={{ background:"#4FD1C5", width:`${data.sourceTrust.high}%` }} />
                    <div style={{ background:"#E8A855", width:`${data.sourceTrust.med}%`  }} />
                    <div style={{ background:"#E0685F", width:`${data.sourceTrust.low}%`  }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8" }}>
                    <span>High {data.sourceTrust.high}%</span>
                    <span>Med {data.sourceTrust.med}%</span>
                    <span>Low {data.sourceTrust.low}%</span>
                  </div>
                </div>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"10px", marginTop:"6px" }}>
                  <div className="type-section" style={{ marginBottom:"2px" }}>Top trusted domains</div>
                  {data.sourceTrust.domains.length
                    ? data.sourceTrust.domains.map((d)=>(
                        <div key={d.name} className="hover-row" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"12.5px", padding:"11px", background:"rgba(255,255,255,0.03)", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ color:"#C7CBD6", fontWeight:"500", fontFamily:"Hanken Grotesk,sans-serif" }}>{d.name}</span>
                          <span style={{ color:LEVEL_COLOR[d.tier]||"#4FD1C5", fontFamily:"JetBrains Mono,monospace", fontWeight:"700" }}>{d.score}</span>
                        </div>
                      ))
                    : <div className="empty-note">No domains yet</div>
                  }
                </div>
              </section>

              {/* Faithfulness */}
              <section className="panel panel-glow" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px" }}>
                <div className="type-heading" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:"11px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  Faithfulness analysis
                  <InfoBtn k="faithfulness" onOpen={setInfoOpen} />
                </div>
                <div style={{ fontSize:"12px", color:"#8e98a8", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.55, marginTop:"-8px" }}>
                  How many sentences of the answer carry a [n] citation back to a real source.
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                  <div style={{ fontSize:"32px", fontFamily:"Sora,sans-serif", color:"#4FD1C5", fontWeight:"700" }}>{data.faithfulness.grounded}/{data.faithfulness.total}</div>
                  <div style={{ fontSize:"11px", textTransform:"uppercase", color:"#8e98a8", fontFamily:"JetBrains Mono,monospace", letterSpacing:"0.05em" }}>Sentences<br/>grounded</div>
                </div>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden" }}>
                  <div className="type-section" style={{ marginBottom:"1px" }}>Flagged statements</div>
                  {data.faithfulness.flagged.length
                    ? data.faithfulness.flagged.map((f,i)=><SignalBars key={i} eyebrow={f.eyebrow || "Uncited claim"} variant={f.variant || "neutral"} promptText={f.promptText || f.text} compact />)
                    : <div className="empty-note">{
                        data.faithfulness.total > 0
                          ? `All ${data.faithfulness.total} sentence${data.faithfulness.total === 1 ? "" : "s"} trace back to a cited source — no unsupported claims.`
                          : "Awaiting the final answer…"
                      }</div>
                  }
                </div>
              </section>

              {/* Contradiction */}
              <section className="panel panel-glow" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"16px" }}>
                <div className="type-heading" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:"11px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  Contradiction analysis
                  <InfoBtn k="contradiction" onOpen={setInfoOpen} />
                </div>
                <div style={{ fontSize:"12px", color:"#8e98a8", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.55, marginTop:"-6px" }}>
                  The sharpest conflict the Critic found - two sources making opposing claims, shown side by side.
                </div>
                {data.contradiction ? (
                  <>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"14px" }}>
                      <div className="hover-row" style={{ background:"rgba(255,255,255,0.03)", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", padding:"14px" }}>
                        <div style={{ fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#4FD1C5", marginBottom:"7px", fontWeight:"700" }}>{data.contradiction.claimA.label} · trust {data.contradiction.claimA.trust}</div>
                        <div style={{ fontSize:"12.5px", color:"#C7CBD6", lineHeight:"1.55" }}>{data.contradiction.claimA.text}</div>
                        <div style={{ fontSize:"10px", color:"#8e98a8", marginTop:"7px", fontFamily:"JetBrains Mono,monospace" }}>Source: {data.contradiction.claimA.source}</div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"center", position:"relative", zIndex:10, margin:"-10px 0" }}>
                        <div style={{ background:"#0a0a1e", border:"1px solid rgba(255,255,255,0.14)", borderRadius:"9999px", padding:"3px 11px", fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#E8A855", fontWeight:"700" }}>VS</div>
                      </div>
                      <div className="hover-row" style={{ background:"rgba(255,255,255,0.03)", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", padding:"14px" }}>
                        <div style={{ fontSize:"11px", fontFamily:"JetBrains Mono,monospace", color:"#a855f7", marginBottom:"7px", fontWeight:"700" }}>{data.contradiction.claimB.label} · trust {data.contradiction.claimB.trust}</div>
                        <div style={{ fontSize:"12.5px", color:"#C7CBD6", lineHeight:"1.55" }}>{data.contradiction.claimB.text}</div>
                        <div style={{ fontSize:"10px", color:"#8e98a8", marginTop:"7px", fontFamily:"JetBrains Mono,monospace" }}>Source: {data.contradiction.claimB.source}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"center", fontSize:"11.5px", color:"#4FD1C5", fontFamily:"JetBrains Mono,monospace", background:"rgba(79,209,197,0.08)", padding:"11px", borderRadius:"10px", border:"1px solid rgba(79,209,197,0.18)" }}>
                      {data.contradiction.resolution}
                    </div>
                  </>
                ) : (
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"9px", textAlign:"center", padding:"18px 12px" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(79,209,197,0.1)", border:"1px solid rgba(79,209,197,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize:"19px", color:"#4FD1C5" }}>handshake</span>
                    </div>
                    <div style={{ fontSize:"12.5px", color:"#C7CBD6", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.5, maxWidth:260 }}>
                      No direct contradictions surfaced — the sources were broadly consistent on this question.
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Suggested Next Research */}
          <div style={{ display:"flex", flexDirection:"column", gap:"22px", paddingTop:"12px", paddingBottom:"24px" }}>
            <h2 className="font-display" style={{ fontSize:"18px", fontWeight:"700", color:"#dde1e9", padding:"0 4px", borderLeft:"2px solid #00ff47", paddingLeft:"14px", display:"flex", alignItems:"center", gap:"10px" }}>
              Suggested next research
              <InfoBtn k="suggestions" onOpen={setInfoOpen} />
            </h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"24px" }}>
              {data.suggestions.length
                ? data.suggestions.map((card)=>{
                    const meta=AGENT_META[card.agent]||AGENT_META.Summarise;
                    return (
                      <button
                        key={card.title}
                        className="panel panel-glow card-press"
                        onMouseDown={()=>setPressedCard(card.title)}
                        onMouseUp={()=>setPressedCard(null)}
                        onMouseLeave={()=>setPressedCard(null)}
                        style={{ padding:"22px", textAlign:"left", display:"flex", flexDirection:"column", gap:"14px", cursor:"pointer", borderColor: pressedCard===card.title ? meta.color : "rgba(255,255,255,0.08)" }}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ padding:"10px", background:`${meta.color}14`, color:meta.color, borderRadius:"10px" }}>
                            <span className="material-symbols-outlined" style={{ fontSize:"20px" }}>{card.icon}</span>
                          </div>
                          {card.kind && (
                            <div style={{ fontSize:"9.5px", fontFamily:"JetBrains Mono,monospace", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
                                          color: card.kind === "Coverage gap" ? "#E8A855" : "#8e98a8",
                                          background: card.kind === "Coverage gap" ? "rgba(232,168,85,0.08)" : "rgba(255,255,255,0.04)",
                                          padding:"5px 11px", borderRadius:"999px",
                                          border: `1px solid ${card.kind === "Coverage gap" ? "rgba(232,168,85,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                              {card.kind}
                            </div>
                          )}
                        </div>
                        <h3 style={{ fontSize:"15.5px", fontWeight:"600", color:"#dde1e9", fontFamily:"Hanken Grotesk,sans-serif", lineHeight:1.45 }}>{card.title}</h3>
                        <div style={{ display:"flex", alignItems:"center", gap:"7px", marginTop:"auto", paddingTop:"14px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:"10.5px", fontFamily:"JetBrains Mono,monospace", color:"#8e98a8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                          <span className="material-symbols-outlined" style={{ fontSize:"14px", color:meta.color }}>arrow_forward</span>
                          {card.kind === "Coverage gap" ? "Identified by the Critic - tap to research" : "Tap to start a new session"}
                        </div>
                      </button>
                    );
                  })
                : <div className="empty-note">No suggestions yet</div>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}