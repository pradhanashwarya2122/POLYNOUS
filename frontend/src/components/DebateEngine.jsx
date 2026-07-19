import { useState, useEffect, useRef, useMemo } from "react";

// ============================================================================
// ADVERSARIAL DEBATE ENGINE — crimson-themed live visualization of the
// 6-stage debate pipeline (evidence → openings → rebuttals → verdict).
// Every number shown is real: rubric metrics, source stats, judge scores.
// ============================================================================

const C = {
  crimson: "#ff2040",
  green:   "#00e64d",
  purple:  "#a855f7",
  gold:    "#ffd700",
  void:    "#0a0a1e",
  onSurface: "#e2e0fc",
  variant:   "#b9ccb0",
  secondary: "#8899aa",
  dim:       "#525c6e",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .de-root * { box-sizing:border-box; margin:0; padding:0; -webkit-font-smoothing:antialiased; }

  .de-ambient {
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background:
      radial-gradient(ellipse 55% 40% at 12% 8%, rgba(0,230,77,0.045), transparent 60%),
      radial-gradient(ellipse 55% 40% at 88% 8%, rgba(255,32,64,0.06), transparent 60%),
      radial-gradient(ellipse 45% 30% at 50% 95%, rgba(168,85,247,0.04), transparent 60%);
  }
  .de-beam-wrap { position:fixed; top:0; left:0; right:0; height:2px; z-index:500; background:rgba(255,255,255,0.04); }
  .de-beam {
    height:100%; background:linear-gradient(90deg, #00e64d, #a855f7 50%, #ff2040);
    box-shadow:0 0 12px rgba(255,32,64,0.5);
    transition:width 0.7s cubic-bezier(0.16,1,0.3,1);
  }

  .de-panel {
    position:relative;
    background:linear-gradient(170deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
    border:1px solid rgba(255,255,255,0.08); border-radius:18px;
    backdrop-filter:blur(20px) saturate(1.05);
    box-shadow:0 1px 0 rgba(255,255,255,0.04) inset;
    transition:border-color 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
    overflow:hidden;
  }
  .de-panel:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(0,0,0,0.35); }
  .de-top-green   { border-top:2px solid rgba(0,230,77,0.55); }
  .de-top-crimson { border-top:2px solid rgba(255,32,64,0.55); }
  .de-top-gold    { border-top:2px solid rgba(255,215,0,0.45); }

  .de-hero {
    font-family:'Sora',sans-serif; font-size:clamp(48px, 5.2vw, 72px); font-weight:800; font-style:italic;
    letter-spacing:-0.04em; line-height:1.02; transform:skewX(-4deg);
    background:linear-gradient(180deg, #ffffff 25%, #c9ccd8 100%);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  /* Full-bleed header band: escapes the root padding so it runs edge to
     edge, with a gradient hairline separating it from the arena. */
  .de-header-band {
    margin:-52px -64px 0; padding:56px 64px 40px;
    min-height:34vh; display:flex; align-items:center;
    background:
      radial-gradient(ellipse 70% 90% at 15% 0%, rgba(255,32,64,0.07), transparent 55%),
      linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
    border-bottom:1px solid transparent;
    border-image:linear-gradient(90deg, transparent, rgba(255,32,64,0.4), rgba(168,85,247,0.35), transparent) 1;
    width:calc(100% + 128px);
  }
  .de-hero .accent {
    background:linear-gradient(180deg, #ff7a8c 15%, #ff2040 80%);
    -webkit-background-clip:text; background-clip:text; color:transparent;
    filter:drop-shadow(0 0 26px rgba(255,32,64,0.4));
  }

  @keyframes deSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
  @keyframes deSoftPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes deCursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes deSlideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes deCardIn { from { opacity:0; transform:translateY(14px) scale(0.99); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes dePhrase { 0%{ opacity:0; transform:translateY(6px); filter:blur(3px); } 14%{ opacity:1; transform:translateY(0); filter:blur(0); } 86%{ opacity:1; } 100%{ opacity:0; transform:translateY(-6px); filter:blur(3px); } }
  @keyframes deVsPulse {
    0%,100% { box-shadow:0 0 18px rgba(168,85,247,0.35); transform:scale(1); }
    50%     { box-shadow:0 0 34px rgba(168,85,247,0.65); transform:scale(1.06); }
  }
  @keyframes deShimmer { 0% { background-position:200% center; } 100% { background-position:-200% center; } }

  .de-card-in { animation:deCardIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .de-d1 { animation-delay:0.05s; } .de-d2 { animation-delay:0.12s; } .de-d3 { animation-delay:0.19s; }
  .de-log { animation:deSlideUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .de-spin { animation:deSpin 5s linear infinite; }
  .de-pulse { animation:deSoftPulse 2s ease-in-out infinite; }
  .de-phrase { animation:dePhrase 2.8s ease-in-out infinite; }
  .de-shimmer {
    background:linear-gradient(90deg, #525c6e 20%, #e2e0fc 40%, #ff2040 50%, #e2e0fc 60%, #525c6e 80%);
    background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent;
    animation:deShimmer 2.6s linear infinite;
  }

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

  @keyframes deBackdropIn { from { opacity:0; } to { opacity:1; } }
  @keyframes deModalIn { from { opacity:0; transform:translateY(14px) scale(0.985); } to { opacity:1; transform:translateY(0) scale(1); } }
  .de-backdrop {
    position:fixed; inset:0; z-index:1000; background:rgba(10,6,14,0.74);
    backdrop-filter:blur(18px) saturate(1.1);
    display:flex; align-items:center; justify-content:center; padding:32px;
    animation:deBackdropIn 0.25s ease-out forwards;
  }
  .de-modal {
    position:relative; width:100%; max-width:600px; max-height:82vh; overflow-y:auto;
    background:linear-gradient(165deg, rgba(30,20,28,0.98), rgba(14,10,18,0.98));
    border:1px solid rgba(255,255,255,0.1); border-radius:22px; padding:40px 44px 36px;
    box-shadow:0 32px 80px rgba(0,0,0,0.55);
    animation:deModalIn 0.32s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  .de-modal::before {
    content:""; position:absolute; top:0; left:44px; right:44px; height:1px;
    background:linear-gradient(90deg, transparent, var(--accent, #ff2040), transparent); opacity:0.55;
  }

  .de-clash-track { position:relative; height:14px; border-radius:9999px; overflow:hidden; background:rgba(255,255,255,0.06); }
  .de-clash-for { position:absolute; top:0; bottom:0; left:0; background:linear-gradient(90deg, rgba(0,230,77,0.9), rgba(0,230,77,0.45)); transition:width 0.9s cubic-bezier(0.16,1,0.3,1); }
  .de-clash-against { position:absolute; top:0; bottom:0; right:0; background:linear-gradient(270deg, rgba(255,32,64,0.9), rgba(255,32,64,0.45)); transition:width 0.9s cubic-bezier(0.16,1,0.3,1); }
  .de-clash-marker {
    position:absolute; top:-4px; bottom:-4px; width:3px; border-radius:2px;
    background:#fff; box-shadow:0 0 12px rgba(255,255,255,0.8);
    transition:left 0.9s cubic-bezier(0.16,1,0.3,1);
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

function InfoModal({ k, onClose }) {
  const info = INFO[k];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!info) return null;
  return (
    <div className="de-backdrop" onClick={onClose}>
      <div className="de-modal de-scroll" style={{ "--accent": info.accent }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" style={{ position:"absolute", top:"22px", right:"24px", background:"none", border:"none", color:C.secondary, fontSize:"20px", cursor:"pointer", lineHeight:1 }}>×</button>
        <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:"10px", fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", color:info.accent, marginBottom:"14px" }}>{info.eyebrow}</div>
        <h2 style={{ fontFamily:"Sora,sans-serif", fontSize:"26px", fontWeight:700, letterSpacing:"-0.025em", color:C.onSurface, marginBottom:"18px" }}>{info.title}</h2>
        <p style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"14.5px", lineHeight:1.8, color:"#c3c1dc" }}>{info.what}</p>
        {info.terms.length > 0 && (
          <>
            <div style={{ height:"1px", background:"linear-gradient(90deg, rgba(255,255,255,0.14), transparent)", margin:"26px 0 22px" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:"15px" }}>
              {info.terms.map(([term, desc]) => (
                <div key={term} style={{ display:"flex", gap:"14px", alignItems:"baseline" }}>
                  <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:info.accent, flexShrink:0 }} />
                  <p style={{ fontFamily:"Hanken Grotesk,sans-serif", fontSize:"13.5px", lineHeight:1.7, color:C.secondary, margin:0 }}>
                    <span style={{ color:C.onSurface, fontWeight:600 }}>{term}.</span> {desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const InfoBtn = ({ k, onOpen }) => (
  <button type="button" className="de-info-btn" aria-label="What is this?" onClick={(e) => { e.stopPropagation(); onOpen(k); }}>i</button>
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

function deepMerge(base, override) {
  if (!override) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.keys(override).forEach((k) => {
    if (override[k] !== null && typeof override[k] === "object" && !Array.isArray(override[k])
        && base != null && typeof base[k] === "object" && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], override[k]);
    } else {
      out[k] = override[k];
    }
  });
  return out;
}

function useLiveDebate(apiUrl, query, responseStyle) {
  const [liveData, setLiveData] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const stateRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!apiUrl || !query) return;
    startedRef.current = false;
    stateRef.current = null;
    setLiveData(null);
    setLiveError(null);
    const controller = new AbortController();

    async function connect() {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const token =
          (typeof localStorage !== "undefined" && localStorage.getItem("polynous_token")) ||
          (typeof window !== "undefined" && window.__POLYNOUS_ACCESS_TOKEN__) || "";
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ query, response_style: responseStyle || "" }),
          signal: controller.signal,
        });
        if (!res.ok) { setLiveError(`Server returned ${res.status}`); return; }
        if (!res.body) { setLiveError("No stream body"); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            let event;
            try { event = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
            if (event && typeof event.error === "string") { setLiveError(event.error); continue; }
            const next = deepMerge(stateRef.current || DEFAULT_DATA, event);
            stateRef.current = next;
            setLiveData({ ...next });
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setLiveError(err.message || "Stream connection failed.");
      }
    }
    connect();
    return () => controller.abort();
  }, [apiUrl, query, responseStyle]);

  return { liveData, liveError };
}

function useTypewriter(fullText, cps = 120) {
  const [revealed, setRevealed] = useState(0);
  const revealedRef = useRef(0);
  const textRef = useRef("");
  useEffect(() => {
    const text = fullText || "";
    if (!text.startsWith(textRef.current.slice(0, revealedRef.current))) {
      revealedRef.current = 0;
      setRevealed(0);
    }
    textRef.current = text;
    if (revealedRef.current >= text.length) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const chars = ((now - last) / 1000) * cps;
      if (chars >= 1) {
        last = now;
        revealedRef.current = Math.min(text.length, revealedRef.current + Math.floor(chars));
        setRevealed(revealedRef.current);
      }
      if (revealedRef.current < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fullText, cps]);
  const text = fullText || "";
  return { visibleText: text.slice(0, revealed), typing: revealed < text.length };
}

// ── Small building blocks ────────────────────────────────────────────────────
const Bars = ({ signal, accent, meaning }) => {
  if (!signal || !signal.levels || !signal.levels.length) {
    return <div className="de-empty" style={{ padding:"6px 0" }}>No signal data yet</div>;
  }
  return (
    <div>
      <div className="de-eyebrow" style={{ marginBottom:"8px" }}>{signal.eyebrow}</div>
      <div className="de-bars">
        {signal.levels.map((h, i) => (
          <div key={i} className="de-bar" style={{ height:`${Math.max(4, Math.min(100, h))}%`, background:`linear-gradient(180deg, ${accent}, ${accent}55)` }} />
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
  const { liveData, liveError } = useLiveDebate(apiUrl, query, responseStyle);
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
      {infoOpen && <InfoModal k={infoOpen} onClose={() => setInfoOpen(null)} />}

      {/* ── Header — full-bleed hero band spanning the entire page ── */}
      <header className="de-header-band" style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", gap:"40px", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 480px", minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
              <div className="de-pulse" style={{ width:"7px", height:"7px", borderRadius:"50%", background:C.crimson, boxShadow:`0 0 10px ${C.crimson}` }} />
              <span className="de-eyebrow" style={{ letterSpacing:"0.24em", fontSize:"11px" }}>Adversarial debate session</span>
            </div>
            <h1 className="de-hero">Debate <span className="accent">Engine</span></h1>
            <div style={{ marginTop:"22px", fontFamily:"JetBrains Mono,monospace" }}>
              <span className="de-eyebrow" style={{ fontSize:"11px" }}>Proposition</span><br />
              <span style={{ color:"#e2e0fc", display:"inline-block", marginTop:"8px", fontSize:"16px", fontFamily:"Hanken Grotesk,sans-serif", fontWeight:600, lineHeight:1.5, maxWidth:"620px" }}>{data.query || query}</span>
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
            <div style={{ width:"54px", height:"54px", borderRadius:"50%", border:`1px solid ${C.purple}66`, background:`${C.purple}14`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Sora,sans-serif", fontStyle:"italic", fontWeight:800, fontSize:"17px", color:C.purple, animation:"deVsPulse 2.6s ease-in-out infinite" }}>VS</div>
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
