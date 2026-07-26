import { useState, useEffect, useRef, useMemo } from "react";
import { deepMerge } from "./shared/deepMerge";
import { useTypewriter } from "./shared/useTypewriter";
import { useLiveStream } from "./shared/useLiveStream";
import { DEBATE_C } from "../design/tokens";

// ============================================================================
// ADVERSARIAL DEBATE ENGINE — crimson-themed live visualization of the
// 6-stage debate pipeline (evidence → openings → rebuttals → verdict).
// Every number shown is real: rubric metrics, source stats, judge scores.
// ============================================================================

// Palette sourced from the shared design tokens (identical values).
const C = DEBATE_C;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .de-root * { box-sizing:border-box; margin:0; padding:0; -webkit-font-smoothing:antialiased; }

  .de-ambient {
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background:radial-gradient(ellipse 60% 40% at 85% 0%, rgba(255,32,64,0.04), transparent 60%);
  }
  .de-beam-wrap { position:fixed; top:0; left:0; right:0; height:2px; z-index:500; background:rgba(255,255,255,0.04); }
  .de-beam {
    height:100%; background:#ff2040;
    transition:width 0.25s cubic-bezier(0.2,0,0,1);
  }

  .de-panel {
    position:relative;
    background:linear-gradient(170deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
    border:1px solid rgba(255,255,255,0.08); border-radius:12px;
    backdrop-filter:blur(20px) saturate(1.05);
    box-shadow:0 1px 0 rgba(255,255,255,0.04) inset;
    transition:border-color 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
    overflow:hidden;
  }
  .de-panel:hover { border-color:rgba(255,255,255,0.14); box-shadow:0 8px 24px rgba(0,0,0,0.35); }
  .de-root button:focus-visible, .de-root a:focus-visible { outline:2px solid #ff2040; outline-offset:2px; border-radius:6px; }
  @media (prefers-reduced-motion: reduce) {
    .de-root *, .de-root *::before, .de-root *::after { animation:none !important; transition:none !important; }
  }
  .de-top-green   { border-top:2px solid rgba(0,230,77,0.55); }
  .de-top-crimson { border-top:2px solid rgba(255,32,64,0.55); }
  .de-top-gold    { border-top:2px solid rgba(255,215,0,0.45); }

  .de-hero {
    font-family:'Sora',sans-serif; font-size:clamp(32px, 3vw, 42px); font-weight:700;
    letter-spacing:-0.02em; line-height:1.1; color:#e8eaf2;
  }
  /* Full-bleed header band: escapes the root padding so it runs edge to
     edge, with a gradient hairline separating it from the arena. */
  .de-header-band {
    margin:-52px -64px 0; padding:56px 64px 40px;
    min-height:34vh; display:flex; align-items:center;
    background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
    border-bottom:1px solid rgba(255,255,255,0.08);
    width:calc(100% + 128px);
  }
  .de-hero .accent { color:#ff2040; }

  @keyframes deSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
  @keyframes deSoftPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes deCursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes deSlideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes deCardIn { from { opacity:0; transform:translateY(14px) scale(0.99); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes dePhrase { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }



  .de-card-in { animation:deCardIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .de-d1 { animation-delay:0.05s; } .de-d2 { animation-delay:0.12s; } .de-d3 { animation-delay:0.19s; }
  .de-log { animation:deSlideUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .de-spin { animation:deSpin 5s linear infinite; }
  .de-pulse { }
  .de-phrase { animation:dePhrase 250ms cubic-bezier(0.2,0,0,1) both; }
  .de-shimmer { color:#9aa3b5; }

  .de-scroll::-webkit-scrollbar { width:4px; }
  .de-scroll::-webkit-scrollbar-track { background:transparent; }
  .de-scroll::-webkit-scrollbar-thumb { background:rgba(255,32,64,0.25); border-radius:4px; }

  .de-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#8899aa; }
  .de-empty { font-size:11.5px; color:#525c6e; font-family:'JetBrains Mono',monospace; font-style:italic; }

  .de-bars { display:flex; align-items:flex-end; gap:4px; height:34px; }
  .de-bar  { flex:1; border-radius:3px 3px 1px 1px; min-width:3px; transition:height 0.6s cubic-bezier(0.16,1,0.3,1); }

  .de-info-btn {
    width:22px; height:22px; border-radius:50%; flex-shrink:0;
    display:inline-flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14);
    color:#8899aa; cursor:pointer; font-size:11px; font-family:'JetBrains Mono',monospace;
    font-style:italic; font-weight:600; line-height:1;
    transition:all 0.2s ease;
  }
  .de-info-btn:hover { color:#e2e0fc; border-color:rgba(255,255,255,0.35); transform:scale(1.08); }

  /* Anchored info popover — small, near the button, never full-screen */
  @keyframes dePopIn { from { opacity:0; transform:translateY(-4px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  .de-pop {
    position:fixed; width:340px; max-height:56vh; overflow-y:auto; z-index:1000;
    background:rgba(19,17,28,0.98); border:1px solid rgba(255,255,255,0.12);
    border-radius:12px; padding:20px 22px;
    box-shadow:0 16px 48px rgba(0,0,0,0.5);
    transform-origin:top center;
    animation:dePopIn 200ms cubic-bezier(0.2,0,0,1) both;
  }

  .de-clash-track { position:relative; height:14px; border-radius:9999px; overflow:hidden; background:rgba(255,255,255,0.06); }
  .de-clash-for { position:absolute; top:0; bottom:0; left:0; background:linear-gradient(90deg, rgba(0,230,77,0.9), rgba(0,230,77,0.45)); transition:width 0.25s cubic-bezier(0.2,0,0,1); }
  .de-clash-against { position:absolute; top:0; bottom:0; right:0; background:linear-gradient(270deg, rgba(255,32,64,0.9), rgba(255,32,64,0.45)); transition:width 0.25s cubic-bezier(0.2,0,0,1); }
  .de-clash-marker {
    position:absolute; top:-3px; bottom:-3px; width:2px; border-radius:2px;
    background:#e8eaf2;
    transition:left 0.25s cubic-bezier(0.2,0,0,1);
  }
  ::selection { background:#ff2040; color:#0a0a1e; }
`;

// ── Explainers ───────────────────────────────────────────────────────────────
const INFO = {
  FOR: {
    accent: C.green, eyebrow: "Advocate — Supporting",
    title: "FOR Advocate",
    what: "Argues in favour of the proposition using only the shared evidence pool. It delivers an opening argument, then a rebuttal that must directly counter at least two of the opponent's specific points — restating its opening scores poorly.",
    terms: [
      ["Rubric stats", "Computed, not opinions: distinct real sources cited, sentences grounded by valid citations, and hallucinated citations (which score zero)."],
      ["Citations graph", "One bar per paragraph — how many [n] citations each paragraph carries."],
    ],
  },
  AGAINST: {
    accent: C.crimson, eyebrow: "Advocate — Opposing",
    title: "AGAINST Advocate",
    what: "Argues against the proposition from the same evidence pool as FOR — neither side gets private sources. Its rebuttal reads FOR's opening and must engage its specific claims.",
    terms: [
      ["Rubric stats", "Same computed metrics as FOR — the two sides are measured identically."],
      ["Citations graph", "One bar per paragraph — citation density of the argument."],
    ],
  },
  evidence: {
    accent: C.purple, eyebrow: "Shared ground",
    title: "Evidence Pool",
    what: "The web sources both advocates argue from, gathered live by the search agent and scraped in full where possible. Every citation [n] in either argument must point at one of these — invented citations earn nothing.",
    terms: [
      ["Content depth graph", "One bar per source — how much full text was captured."],
    ],
  },
  clash: {
    accent: C.purple, eyebrow: "Live scoring",
    title: "Clash Meter",
    what: "A real tug-of-war computed from each side's evidence rubric: distinct sources cited plus the share of claims grounded by valid citations. It stays neutral until both sides have opened, then shifts with every delivered turn, and snaps to the judge's final scores at verdict.",
    terms: [
      ["Final scores", "50% computed evidence rubric + 50% the judge's quality assessment of logic and rebuttal engagement."],
    ],
  },
  judge: {
    accent: C.gold, eyebrow: "Adjudication",
    title: "Judge",
    what: "Scores both sides after all four turns. The evidence dimension is pre-measured by the rubric (the judge cannot be fooled by invented citations); the judge adds a quality score for logic and how directly each rebuttal engaged the opponent. If the judge's evaluation fails, the verdict is explicitly UNSCORED — never a fabricated tie.",
    terms: [
      ["Checklist", "The real pipeline stages — each item flips when that turn is genuinely delivered."],
      ["UNSCORED", "The judge LLM failed; only the computed rubric scores are shown, clearly labelled."],
    ],
  },
  thoughts: {
    accent: C.crimson, eyebrow: "Telemetry",
    title: "Live Thought Stream",
    what: "Every real step of the debate as it happens — each page fetched, each argument drafted with its measured citation stats, the verdict. Nothing simulated.",
    terms: [],
  },
};

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
    <div ref={ref} className="de-pop de-scroll" role="dialog" aria-label={info.title} style={{ left, top }}>
      <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"10px", fontWeight:600, letterSpacing:"0.18em", textTransform:"uppercase", color:info.accent, marginBottom:"8px" }}>{info.eyebrow}</div>
      <h3 style={{ fontFamily:"Sora,sans-serif", fontSize:"16px", fontWeight:700, letterSpacing:"-0.01em", color:"#e8eaf2", marginBottom:"10px" }}>{info.title}</h3>
      <p style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"12.5px", lineHeight:1.7, color:"#9aa3b5" }}>{info.what}</p>
      {info.terms.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:"9px", marginTop:"12px", paddingTop:"12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {info.terms.map(([term, desc]) => (
            <p key={term} style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"12px", lineHeight:1.65, color:"#9aa3b5", margin:0 }}>
              <span style={{ color:"#e8eaf2", fontWeight:600 }}>{term}.</span> {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const InfoBtn = ({ k, onOpen }) => (
  <button type="button" className="de-info-btn" aria-label="What is this?"
    onClick={(e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      onOpen((prev) => (prev && prev.k === k ? null : { k, x: r.left + r.width / 2, y: r.bottom }));
    }}>i</button>
);

// ── Data plumbing (same conventions as NeuralResearchEngine) ────────────────
const DEFAULT_DATA = {
  query: "", mode: "debate", progress: 0, elapsedSeconds: 0,
  stage: { label: "Idle", sub: "" },
  panels: {
    Evidence: { progress:0, phase:{ label:"Idle", sub:"No sources yet" }, stats:[], recentSources:[], signal:null },
    FOR:      { progress:0, phase:{ label:"Idle", sub:"Awaiting evidence" }, openingText:"", rebuttalText:"", rubric:null, rebuttalRubric:null, stats:[], signal:null, error:null },
    AGAINST:  { progress:0, phase:{ label:"Idle", sub:"Awaiting evidence" }, openingText:"", rebuttalText:"", rubric:null, rebuttalRubric:null, stats:[], signal:null, error:null },
    Judge:    { progress:0, phase:{ label:"Idle", sub:"Awaiting arguments" }, checklist:[], stats:[] },
  },
  clash: { forShare: 50, forScore: null, againstScore: null, live: false },
  logs: [],
  metrics: { sources: 0, forScore: "—", againstScore: "—", winner: "—" },
  floatingTags: [],
  verdict: null,
};


// ── Small building blocks ────────────────────────────────────────────────────
// Per-bar hover tooltips explain WHAT each bar is, not just its value.
const BAR_TOOLTIPS = {
  "Citations per paragraph": (i, h) => `Paragraph ${i + 1} — ${h}% of this argument's densest paragraph`,
  "Content depth per source": (i, h) => `Source ${i + 1} — captured ${h}% of a full article`,
};

const Bars = ({ signal, accent, meaning }) => {
  if (!signal || !signal.levels || !signal.levels.length) {
    return <div className="de-empty" style={{ padding:"6px 0" }}>No signal data yet</div>;
  }
  const tip = BAR_TOOLTIPS[signal.eyebrow] || ((i, h) => `Item ${i + 1} — ${h}%`);
  return (
    <div>
      <div className="de-eyebrow" style={{ marginBottom:"8px" }}>{signal.eyebrow}</div>
      <div className="de-bars">
        {signal.levels.map((h, i) => (
          <div key={i} className="de-bar" title={tip(i, Math.round(h))}
            style={{ height:`${Math.max(4, Math.min(100, h))}%`, background:`linear-gradient(180deg, ${accent}, ${accent}55)`, cursor:"default" }} />
        ))}
      </div>
      {meaning && <div style={{ marginTop:"8px", fontSize:"10px", fontFamily:"Hanken Grotesk,sans-serif", color:C.dim, lineHeight:1.5 }}>{meaning}</div>}
    </div>
  );
};

const StatRows = ({ stats }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"7px", fontFamily:"JetBrains Mono,monospace", fontSize:"11.5px" }}>
    {stats && stats.length
      ? stats.map(([label, val]) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:C.secondary }}>{label}</span>
            <span style={{ color:C.onSurface }}>{val}</span>
          </div>
        ))
      : <div className="de-empty">No metrics yet</div>}
  </div>
);

function TypedBlock({ text, accent, placeholder }) {
  const { visibleText, typing } = useTypewriter(text, 130);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [visibleText]);
  return (
    <div ref={ref} className="de-scroll" style={{ background:"#0d0b16", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"14px", fontSize:"12px", color:"#c3c1dc", fontFamily:"JetBrains Mono,monospace", lineHeight:1.65, height:"170px", overflowY:"auto", whiteSpace:"pre-wrap" }}>
      {text
        ? <><span>{visibleText}</span>{typing && <span style={{ display:"inline-block", width:"7px", height:"13px", background:accent, verticalAlign:"middle", marginLeft:"3px", animation:"deCursor 0.9s step-end infinite" }} />}</>
        : <span className="de-empty">{placeholder}</span>}
    </div>
  );
}

function AdvocatePanel({ side, panel, accent, topClass, delayClass, onInfo, registerTyping }) {
  const openingTyping = panel.openingText && panel.openingText.length > 0;
  useEffect(() => { registerTyping(side, false); }, []); // eslint-disable-line
  return (
    <section className={`de-panel ${topClass} de-card-in ${delayClass}`} style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${accent}30`, paddingBottom:"11px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"9px", fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:"14.5px", color:accent }}>
          <span className="material-symbols-outlined" style={{ fontSize:"18px" }}>{side === "FOR" ? "thumb_up" : "gavel"}</span>
          {side} Advocate
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
          <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"9.5px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color: panel.error ? C.crimson : accent, border:`1px solid ${panel.error ? C.crimson : accent}45`, background:`${panel.error ? C.crimson : accent}12`, padding:"3px 10px", borderRadius:"999px" }}>
            {panel.phase?.label || "Idle"}
          </span>
          <InfoBtn k={side} onOpen={onInfo} />
        </div>
      </div>
      <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"11px", color:C.secondary }}>{panel.phase?.sub}</div>
      {panel.error && (
        <div style={{ fontSize:"11.5px", fontFamily:"JetBrains Mono,monospace", color:C.crimson, background:"rgba(255,32,64,0.07)", border:"1px solid rgba(255,32,64,0.25)", borderRadius:"9px", padding:"10px 12px" }}>
          Degraded — {panel.error}
        </div>
      )}
      <StatRows stats={panel.stats} />
      <div>
        <div className="de-eyebrow" style={{ color:accent, marginBottom:"8px" }}>Opening argument</div>
        <TypedBlock text={panel.openingText} accent={accent} placeholder="Opening will appear here" />
      </div>
      {panel.rebuttalText ? (
        <div>
          <div className="de-eyebrow" style={{ color:accent, marginBottom:"8px" }}>Rebuttal</div>
          <TypedBlock text={panel.rebuttalText} accent={accent} placeholder="" />
        </div>
      ) : (
        openingTyping && <div className="de-empty">Rebuttal round pending…</div>
      )}
      <Bars signal={panel.signal} accent={accent} meaning="Each bar = one paragraph · height = [n] citations it carries" />
    </section>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DebateEngine({ apiUrl, query, responseStyle, onComplete, onError }) {
  const _scrape = Number(localStorage.getItem("polynous_scrape_count")) || 0;
  const { liveData, liveError } = useLiveStream(apiUrl, query, { responseStyle, defaultData: DEFAULT_DATA, extraBody: (_scrape ? { max_results: _scrape } : {}) });
  const [infoOpen, setInfoOpen] = useState(null);

  const data = useMemo(() => deepMerge(DEFAULT_DATA, liveData || {}), [liveData]);
  const isDone = (data.progress || 0) >= 100;

  // typewriter completion tracking for onComplete gating
  const typingRef = useRef({});
  const registerTyping = (key, val) => { typingRef.current[key] = val; };

  const errorFiredRef = useRef(false);
  useEffect(() => {
    if (liveError && !errorFiredRef.current) {
      errorFiredRef.current = true;
      if (typeof onError === "function") onError(liveError);
    }
  }, [liveError, onError]);

  // Complete when the stream finishes; small delay lets typewriters land.
  const completeFiredRef = useRef(false);
  useEffect(() => {
    if (isDone && data.verdict !== null && !completeFiredRef.current) {
      completeFiredRef.current = true;
      const t = setTimeout(() => { if (typeof onComplete === "function") onComplete(data); }, 1600);
      return () => clearTimeout(t);
    }
  }, [isDone, data, onComplete]);

  // thinking phrases per stage
  const PHRASES = {
    "Gathering evidence": ["Scouring the open web…", "Building the shared evidence pool…", "Reading both sides of the story…"],
    "FOR opening": ["Marshalling the supporting case…", "Grounding every claim in evidence…"],
    "AGAINST opening": ["Constructing the counter case…", "Hunting for opposing evidence…"],
    "FOR rebuttal": ["Reading the opposition's argument…", "Drafting the counter-strike…"],
    "AGAINST rebuttal": ["Dissecting the supporting case…", "Preparing the final rebuttal…"],
    "Judging": ["Weighing both sides…", "Scoring evidence and logic…", "Rendering the verdict…"],
    idle: ["Preparing the arena…", "Summoning the advocates…"],
  };
  const [phraseTick, setPhraseTick] = useState(0);
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setPhraseTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [isDone]);
  const pool = PHRASES[data.stage?.label] || PHRASES.idle;
  const phrase = pool[phraseTick % pool.length];

  const clashPct = Math.max(4, Math.min(96, data.clash?.forShare ?? 50));
  const clashLive = !!data.clash?.live;
  const streamRef = useRef(null);
  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTo({ top: streamRef.current.scrollHeight, behavior:"smooth" });
  }, [data.logs]);

  const verdictUnscored = data.verdict && (data.verdict.parse_failed || data.verdict.winner === "UNSCORED");

  return (
    <div className="de-root" style={{ position:"relative", minHeight:"100vh", background:C.void, padding:"52px 64px", display:"flex", flexDirection:"column", gap:"32px", zIndex:1 }}>
      <style>{styles}</style>
      <div className="de-ambient" />
      <div className="de-beam-wrap"><div className="de-beam" style={{ width:`${data.progress}%` }} /></div>
      {infoOpen && <InfoPopover open={infoOpen} onClose={() => setInfoOpen(null)} />}

      {/* ── Header — full-bleed hero band spanning the entire page ── */}
      <header className="de-header-band" style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", gap:"40px", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 480px", minWidth:0 }}>
            <h1 className="de-hero">Debate <span className="accent">Engine</span></h1>
            <div style={{ marginTop:"26px" }}>
              <span className="de-eyebrow" style={{ fontSize:"10.5px", letterSpacing:"0.26em" }}>Proposition under review</span>
              {/* Formal serif for the case being tried — editorial register,
                  distinct from the punchy Sora hero above it. */}
              <div style={{ color:"#efeefc", marginTop:"10px", fontSize:"clamp(21px, 2vw, 27px)", fontFamily:"'Cormorant Garamond',serif", fontStyle:"italic", fontWeight:600, lineHeight:1.4, maxWidth:"640px", letterSpacing:"0.005em" }}>
                “{data.query || query}”
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"44px", alignItems:"center", flexWrap:"wrap" }}>
            <div>
              <div className="de-eyebrow" style={{ marginBottom:"9px", fontSize:"11px" }}>Stage</div>
              <div style={{ fontFamily:"Sora,sans-serif", fontSize:"22px", fontWeight:700, color:C.onSurface, letterSpacing:"-0.02em" }}>{data.stage?.label || "Idle"}</div>
              <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"11.5px", color:C.secondary, marginTop:"5px" }}>{data.stage?.sub}</div>
            </div>
            <div>
              <div className="de-eyebrow" style={{ marginBottom:"9px", fontSize:"11px" }}>Progress</div>
              <div style={{ fontSize:"38px", fontFamily:"Sora,sans-serif", color:"#fff", fontWeight:800, lineHeight:1 }}>{data.progress}<span style={{ fontSize:"17px", color:C.secondary }}>%</span></div>
            </div>
            <div style={{ minWidth:"210px" }}>
              <div className="de-eyebrow" style={{ marginBottom:"9px", fontSize:"11px" }}>{isDone ? "Status" : "Arena activity"}</div>
              {isDone
                ? <div style={{ fontFamily:"Sora,sans-serif", fontSize:"19px", fontWeight:700, color: verdictUnscored ? C.gold : C.crimson }}>
                    {verdictUnscored ? "Verdict unscored" : `Verdict: ${data.metrics?.winner || "—"}`}
                  </div>
                : <span key={phrase} className="de-shimmer de-phrase" style={{ fontSize:"15.5px", fontFamily:"Hanken Grotesk,sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>{phrase}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* ── Arena ── */}
      <main style={{ display:"grid", gridTemplateColumns:"1fr 0.85fr 1fr", gap:"22px", position:"relative", zIndex:2 }}>
        <AdvocatePanel side="FOR" panel={data.panels.FOR} accent={C.green} topClass="de-top-green" delayClass="de-d1" onInfo={setInfoOpen} registerTyping={registerTyping} />

        {/* center column */}
        <div className="de-card-in de-d2" style={{ display:"flex", flexDirection:"column", gap:"22px" }}>
          {/* VS + clash */}
          <section className="de-panel" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"18px", alignItems:"center" }}>
            <div style={{ width:"54px", height:"54px", borderRadius:"50%", border:`1px solid ${C.purple}66`, background:`${C.purple}14`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Sora,sans-serif", fontStyle:"italic", fontWeight:800, fontSize:"17px", color:C.purple }}>VS</div>
            <div style={{ width:"100%" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"9px" }}>
                <span className="de-eyebrow" style={{ color:C.green }}>FOR {clashLive ? `${data.clash.forShare}%` : ""}</span>
                <span className="de-eyebrow" style={{ display:"flex", alignItems:"center", gap:"7px" }}>Clash meter <InfoBtn k="clash" onOpen={setInfoOpen} /></span>
                <span className="de-eyebrow" style={{ color:C.crimson }}>{clashLive ? `${100 - data.clash.forShare}%` : ""} AGAINST</span>
              </div>
              <div className="de-clash-track">
                {clashLive ? (
                  <>
                    <div className="de-clash-for" style={{ width:`${clashPct}%` }} />
                    <div className="de-clash-against" style={{ width:`${100 - clashPct}%` }} />
                    <div className="de-clash-marker" style={{ left:`calc(${clashPct}% - 1.5px)` }} />
                  </>
                ) : (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontFamily:"JetBrains Mono,monospace", color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>Awaiting both openings</div>
                )}
              </div>
              {data.clash?.forScore != null && data.clash?.againstScore != null && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px", fontFamily:"JetBrains Mono,monospace", fontSize:"11px" }}>
                  <span style={{ color:C.green, fontWeight:700 }}>{data.clash.forScore}/10</span>
                  <span style={{ color:C.crimson, fontWeight:700 }}>{data.clash.againstScore}/10</span>
                </div>
              )}
            </div>
          </section>

          {/* Evidence pool */}
          <section className="de-panel" style={{ padding:"22px", display:"flex", flexDirection:"column", gap:"14px", flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:"10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:"13.5px", color:C.onSurface }}>
                <span className="material-symbols-outlined" style={{ fontSize:"17px", color:C.purple }}>hub</span>
                Evidence pool
              </div>
              <InfoBtn k="evidence" onOpen={setInfoOpen} />
            </div>
            <StatRows stats={data.panels.Evidence.stats} />
            {(data.panels.Evidence.recentSources || []).length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                {data.panels.Evidence.recentSources.map((src, i) => (
                  <div key={`${src.domain}-${i}`} style={{ display:"flex", alignItems:"center", gap:"9px", background:"rgba(255,255,255,0.03)", padding:"8px 10px", borderRadius:"9px", border:"1px solid rgba(255,255,255,0.05)" }}>
                    <img src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`} alt="" width="14" height="14" style={{ borderRadius:"3px" }} onError={(e)=>{e.currentTarget.style.visibility="hidden";}} />
                    <span style={{ flex:1, minWidth:0, fontSize:"10.5px", fontFamily:"JetBrains Mono,monospace", color:C.variant, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src.domain}</span>
                    <span style={{ fontSize:"8.5px", fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:C.purple, border:`1px solid ${C.purple}45`, background:`${C.purple}10`, borderRadius:"999px", padding:"1px 6px" }}>{src.badge}</span>
                  </div>
                ))}
              </div>
            )}
            <Bars signal={data.panels.Evidence.signal} accent={C.purple} meaning="Each bar = one source · height = share of a full article captured" />
          </section>
        </div>

        <AdvocatePanel side="AGAINST" panel={data.panels.AGAINST} accent={C.crimson} topClass="de-top-crimson" delayClass="de-d3" onInfo={setInfoOpen} registerTyping={registerTyping} />
      </main>

      {/* ── Bottom row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 0.7fr", gap:"22px", height:"300px", position:"relative", zIndex:2 }}>
        {/* Live thought stream */}
        <section className="de-panel" style={{ padding:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"16px 18px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div className="de-eyebrow" style={{ color:C.onSurface, display:"flex", alignItems:"center", gap:"7px" }}>
              <span className="material-symbols-outlined" style={{ fontSize:"15px", color:C.crimson }}>monitoring</span>
              Live thought stream
            </div>
            <InfoBtn k="thoughts" onOpen={setInfoOpen} />
          </div>
          <div ref={streamRef} className="de-scroll" style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:"9px", fontFamily:"JetBrains Mono,monospace", fontSize:"11px" }}>
            {data.logs.length ? data.logs.map((log, i) => {
              const color = log.agentName === "FOR" ? C.green : log.agentName === "AGAINST" ? C.crimson : log.agentName === "Judge" ? C.gold : C.purple;
              return (
                <div key={log.id ?? i} className="de-log" style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
                  <span style={{ color:C.dim, width:"44px", flexShrink:0, fontSize:"10px", marginTop:"2px" }}>{log.timeStr}</span>
                  <span style={{ color, fontWeight:700, width:"66px", flexShrink:0, fontSize:"9px", textTransform:"uppercase", letterSpacing:"0.04em", marginTop:"2px" }}>{log.agentName}</span>
                  <span style={{ color:C.variant, flex:1, lineHeight:1.5 }}>{log.msg}</span>
                </div>
              );
            }) : <div className="de-empty">No activity yet</div>}
          </div>
        </section>

        {/* Judge */}
        <section className="de-panel de-top-gold" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"13px", overflow:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,215,0,0.18)", paddingBottom:"10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:"13.5px", color:C.gold }}>
              <span className="material-symbols-outlined" style={{ fontSize:"17px" }}>balance</span>
              Judge
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"9.5px", fontWeight:700, textTransform:"uppercase", color: data.panels.Judge.phase?.label === "Degraded" ? C.gold : C.secondary }}>
                {data.panels.Judge.phase?.label}
              </span>
              <InfoBtn k="judge" onOpen={setInfoOpen} />
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {(data.panels.Judge.checklist || []).map((item) => (
              <div key={item.label} style={{ display:"flex", gap:"9px", alignItems:"center", fontSize:"10.5px", fontFamily:"JetBrains Mono,monospace", color: item.status === "done" ? C.variant : C.dim }}>
                <span className="material-symbols-outlined" style={{ fontSize:"14px", color: item.status === "done" ? C.green : C.dim }}>
                  {item.status === "done" ? "check_circle" : "radio_button_unchecked"}
                </span>
                {item.label}
              </div>
            ))}
          </div>
          {(data.panels.Judge.stats || []).length > 0 && (
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:"11px" }}>
              <StatRows stats={data.panels.Judge.stats} />
            </div>
          )}
        </section>

        {/* Metrics */}
        <section className="de-panel" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"12px", justifyContent:"space-between" }}>
          {[
            { icon:"library_books", label:"Sources", val:data.metrics.sources, color:C.purple },
            { icon:"thumb_up",      label:"FOR",     val:data.metrics.forScore, color:C.green },
            { icon:"gavel",         label:"AGAINST", val:data.metrics.againstScore, color:C.crimson },
            { icon:"emoji_events",  label:"Winner",  val:data.metrics.winner, color:C.gold },
          ].map((m, i) => (
            <div key={m.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: i < 3 ? "11px" : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"9px", color:C.secondary }}>
                <span className="material-symbols-outlined" style={{ fontSize:"16px", color:m.color }}>{m.icon}</span>
                <span style={{ fontSize:"10.5px", fontFamily:"JetBrains Mono,monospace", textTransform:"uppercase", letterSpacing:"0.05em" }}>{m.label}</span>
              </div>
              <span style={{ color:C.onSurface, fontFamily:"Sora,sans-serif", fontSize:"17px", fontWeight:700 }}>{m.val}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
