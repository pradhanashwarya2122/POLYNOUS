import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   RESEARCH CHAMBER v3 - animated pipeline runner.
   ============================================================================ */

const C = {
  green: "#00ff0f", cyan: "#00ccff", crimson: "#ff2040", gold: "#ffd700",
  purple: "#a855f7", indigo: "#5878d4", amber: "#ffaa00", coral: "#ff6b6b",
  teal: "#00e6b8", void: "#060610",
};

const DEMOS = [
  {
    query: "Does intermittent fasting improve insulin sensitivity in adults over 40?",
    sources: [
      { domain: "pubmed.ncbi.nlm.nih.gov", title: "Time-restricted eating and metabolic outcomes", rel: 97 },
      { domain: "nejm.org",                title: "Fasting regimens in type-2 metabolic risk", rel: 91 },
      { domain: "cell.com",                title: "Autophagy pathways under caloric restriction", rel: 84 },
      { domain: "thelancet.com",           title: "IF adherence in older cohorts: 24-month RCT", rel: 78 },
    ],
    contradiction: { a: "Nine controlled trials show improved fasting insulin.", b: "One 2023 Lancet cohort disputes effect size in post-menopausal women." },
    gap: "Coverage gap: long-term (>18 mo) outcomes in adults over 55 not yet retrieved.",
    excerpt: `**Summary**\nIntermittent fasting consistently lowers fasting insulin in adults 40 to 55 across nine RCTs (pooled SMD -0.42, 95% CI -0.58 to -0.26).\n\n**Key Finding**\nEffect size disputes arise primarily in post-menopausal subgroups (Lancet 2023).\n\n**Limitations**\nLong-term data (>18 months) remain scarce for adults over 55.\n\n**Confidence** 82%`,
    confidence: 82, tokens: 4840, calls: 5, cost: "0.031",
  },
  {
    query: "Is remote work linked to lower attrition rates in tech companies?",
    sources: [
      { domain: "hbr.org",          title: "Remote work and voluntary turnover: 3-yr study", rel: 95 },
      { domain: "stanford.edu",     title: "WFH productivity and retention meta-analysis",   rel: 88 },
      { domain: "mckinsey.com",     title: "Hybrid workforce attrition benchmarks 2024",     rel: 80 },
      { domain: "gallup.com",       title: "Employee engagement and remote modality",        rel: 71 },
    ],
    contradiction: { a: "Full-remote firms report 18 to 24% lower attrition (HBR, Stanford).", b: "Effect narrows significantly for teams under 50 (Gallup 2024)." },
    gap: "Coverage gap: startup-stage firms (<50 employees) and senior IC retention not fully covered.",
    excerpt: `**Summary**\nRemote work is associated with 18 to 24% lower voluntary attrition in tech firms with >200 employees across three independent datasets.\n\n**Key Finding**\nEffect is strongest for mid-level ICs; senior leadership shows no significant difference.\n\n**Limitations**\nStudies skew toward VC-backed Series B+ firms; pre-IPO and bootstrapped cohorts underrepresented.\n\n**Confidence** 74%`,
    confidence: 74, tokens: 3920, calls: 4, cost: "0.025",
  },
  {
    query: "Will carbon capture reach cost parity with natural gas by 2030?",
    sources: [
      { domain: "iea.org",          title: "Direct air capture cost trajectories 2024",    rel: 96 },
      { domain: "nature.com",       title: "Learning rates in carbon capture technology",  rel: 89 },
      { domain: "bloomberg.com",    title: "DAC project financing and subsidy landscape",  rel: 76 },
      { domain: "science.org",      title: "Geological storage capacity and permanence",   rel: 68 },
    ],
    contradiction: { a: "IEA optimistic scenario: $100/ton by 2030 with current learning rates.", b: "Nature analysis: independent models place parity closer to 2034 without subsidy uplift." },
    gap: "Coverage gap: offshore geological storage costs and permanence risk not modelled.",
    excerpt: `**Summary**\nPilot-scale DAC costs sit near $400 to 600/ton today; IEA projects $100/ton by 2030 under aggressive deployment.\n\n**Key Finding**\nIndependent modelling (Nature, 2024) suggests 2034 is more realistic absent major subsidy expansion.\n\n**Limitations**\nOffshore storage permanence and monitoring costs are systematically excluded from public projections.\n\n**Confidence** 61%`,
    confidence: 61, tokens: 5610, calls: 6, cost: "0.038",
  },
];

const STAGES = [
  { id: "search",    name: "Search",    icon: "search",    color: C.cyan,   substeps: ["Querying Tavily search API…", "Retrieving top 20 candidate URLs…", "Scraping and deduplicating sources…", "Scoring relevance per source…"] },
  { id: "summarise", name: "Summarise", icon: "summarize", color: C.indigo, substeps: ["Chunking source text into passages…", "Embedding passages via OpenAI…", "Extracting 3 to 5 key insight points…", "Staging summaries for Critic…"] },
  { id: "critic",    name: "Critic",    icon: "balance",   color: C.amber,  substeps: ["Cross-referencing claim sets…", "Running contradiction detection…", "Assigning per-claim confidence…", "Flagging coverage gaps…"] },
  { id: "deepen",    name: "Deepen",    icon: "repeat",    color: C.crimson,substeps: ["Gap detected, launching follow-up search…", "Targeting underrepresented sub-topics…", "Re-ingesting 6 additional sources…", "Re-critiquing with enriched evidence…"] },
  { id: "writer",    name: "Writer",    icon: "edit_note", color: C.green,  substeps: ["Structuring report skeleton…", "Weaving citations into prose…", "Applying confidence annotations…", "Rendering Summary, Findings, Limitations…"] },
];

function easeOutExpo(p) { return p === 1 ? 1 : 1 - Math.pow(2, -10 * p); }
function easeInOutCubic(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

function useReveal(threshold = 0.13) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const was = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting && !was.current) setEpoch(x => x + 1);
      was.current = e.isIntersecting;
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView, epoch };
}

function useAnimatedNumber(target, duration = 700) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    let raf, start = null;
    const startVal = from.current;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setV(startVal + (target - startVal) * easeOutExpo(p));
      if (p < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function confidenceColor(v) {
  if (v >= 75) return C.green;
  if (v >= 55) return C.gold;
  return C.crimson;
}

function TokenStream({ text, active, speed = 18, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [text]);
  useEffect(() => {
    if (!active || n >= text.length) { if (n >= text.length && onDone) onDone(); return; }
    const t = setTimeout(() => setN(v => v + 1), speed);
    return () => clearTimeout(t);
  }, [n, active, text, speed, onDone]);

  const raw = text.slice(0, n);
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
      {n < text.length && <span className="rc-cursor" style={{ color: C.green }} />}
    </span>
  );
}

function SourceCard({ src, delay, visible }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);
  return (
    <div style={{
      padding: "10px 14px", borderRadius: "10px",
      background: show ? "rgba(0,204,255,0.06)" : "transparent",
      border: `1px solid ${show ? C.cyan + "40" : "rgba(255,255,255,0.04)"}`,
      transition: "all 0.45s cubic-bezier(.23,1,.32,1)",
      opacity: show ? 1 : 0,
      transform: show ? "translateX(0)" : "translateX(12px)",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.cyan, boxShadow: `0 0 6px ${C.cyan}`, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.cyan, margin: 0, letterSpacing: "0.04em" }}>{src.domain}</p>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(200,215,230,0.75)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{src.title}</p>
      </div>
      <div style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: C.cyan, fontWeight: 700 }}>{src.rel}<span style={{ opacity: 0.45, fontSize: "9px" }}>%</span></div>
    </div>
  );
}

function SubstepRow({ text, state, delay }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const col = state === "done" ? C.green : state === "running" ? C.amber : "rgba(150,165,180,0.4)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: show ? 1 : 0, transform: show ? "none" : "translateX(-8px)", transition: "all 0.4s cubic-bezier(.23,1,.32,1)", padding: "5px 0" }}>
      <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: `1.5px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: state === "done" ? col : "transparent", transition: "all 0.35s ease" }}>
        {state === "done"
          ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : state === "running"
            ? <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.amber, animation: "rcPulse 0.8s ease-in-out infinite" }} />
            : null
        }
      </div>
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12.5px", color: state === "done" ? "rgba(200,220,235,0.9)" : state === "running" ? C.amber : "rgba(140,155,170,0.5)", transition: "color 0.35s ease" }}>{text}</span>
    </div>
  );
}

function TelemetryVal({ value, suffix = "", color, label, icon }) {
  const n = useAnimatedNumber(value, 800);
  const isFloat = String(value).includes(".");
  const display = isFloat ? n.toFixed(3) : Math.round(n).toLocaleString();
  return (
    <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: `${color}14`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "15px", color }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "15px", fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{suffix}{display}</p>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "rgba(130,148,168,0.55)", margin: "4px 0 0", letterSpacing: "0.08em" }}>{label}</p>
      </div>
    </div>
  );
}

function ConfidenceRing({ value, active }) {
  const col = confidenceColor(value);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    let raf, start = null;
    const dur = 1800;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setV(value * easeInOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, active]);
  const circ = 2 * Math.PI * 38;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: "100px", height: "100px" }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6.5" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={col} strokeWidth="6.5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (v / 100) * circ}
            style={{ filter: `drop-shadow(0 0 7px ${col}90)`, transition: "stroke .5s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "18px", color: "#fff", letterSpacing: "-0.03em" }}>{Math.round(v)}%</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8.5px", color: col, letterSpacing: "0.06em", marginTop: "2px" }}>CONF</span>
        </div>
      </div>
    </div>
  );
}

function StageDetail({ stageIdx, substepIdx, demo, writingActive }) {
  const stage = STAGES[stageIdx];
  if (!stage) return null;

  if (stage.id === "search") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.cyan, letterSpacing: "0.1em", margin: "0 0 8px" }}>SOURCES RETRIEVED</p>
      {demo.sources.map((src, i) => (
        <SourceCard key={src.domain} src={src} delay={i * 350} visible={substepIdx >= i} />
      ))}
    </div>
  );

  if (stage.id === "summarise") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.indigo, letterSpacing: "0.1em", margin: "0 0 4px" }}>SUMMARY PREVIEW</p>
      {demo.sources.slice(0, 3).map((src, i) => (
        <div key={src.domain} style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(88,120,212,0.07)", border: `1px solid ${C.indigo}28`, opacity: substepIdx >= i + 1 ? 1 : 0.2, transition: "opacity 0.5s ease" }}>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: C.indigo, margin: "0 0 5px", letterSpacing: "0.06em" }}>{src.domain}</p>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(180,195,215,0.75)", margin: 0, lineHeight: 1.55 }}>
            {i === 0 ? "Key insight: Time-restricted eating shows robust insulin lowering in controlled settings." : i === 1 ? "Key insight: Effect disputed in post-menopausal cohort; subgroup analysis pending." : "Key insight: Autophagy markers elevated but insulin link indirect."}
          </p>
        </div>
      ))}
    </div>
  );

  if (stage.id === "critic") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.amber, letterSpacing: "0.1em", margin: "0 0 4px" }}>CONTRADICTION DETECTED</p>
      <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(0,255,15,0.05)", border: `1px solid ${C.green}30`, opacity: substepIdx >= 1 ? 1 : 0, transition: "opacity 0.5s ease 0.1s" }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: C.green, margin: "0 0 5px" }}>FOR</p>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(180,200,215,0.8)", margin: 0, lineHeight: 1.55 }}>{demo.contradiction.a}</p>
      </div>
      <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(255,32,64,0.05)", border: `1px solid ${C.crimson}30`, opacity: substepIdx >= 2 ? 1 : 0, transition: "opacity 0.5s ease 0.2s" }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: C.crimson, margin: "0 0 5px" }}>CONFLICTS WITH</p>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(180,200,215,0.8)", margin: 0, lineHeight: 1.55 }}>{demo.contradiction.b}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "9px", background: "rgba(255,170,0,0.06)", border: `1px solid ${C.amber}25`, opacity: substepIdx >= 3 ? 1 : 0, transition: "opacity 0.5s ease 0.3s" }}>
        <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "14px", color: C.amber }}>flag</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.amber, letterSpacing: "0.06em" }}>FLAGGED · CONFIDENCE ADJUSTED</span>
      </div>
    </div>
  );

  if (stage.id === "deepen") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.crimson, letterSpacing: "0.1em", margin: "0 0 4px" }}>GAP DETECTED · RE-SEARCHING</p>
      <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(255,32,64,0.06)", border: `1px solid ${C.crimson}30`, opacity: substepIdx >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(180,200,215,0.8)", margin: 0, lineHeight: 1.55 }}>{demo.gap}</p>
      </div>
      {[2, 3].map((threshold, i) => (
        <div key={i} style={{ padding: "9px 13px", borderRadius: "9px", background: "rgba(255,32,64,0.04)", border: `1px solid rgba(255,32,64,0.14)`, display: "flex", alignItems: "center", gap: "10px", opacity: substepIdx >= threshold ? 1 : 0, transition: `opacity 0.45s ease ${i * 0.12}s` }}>
          <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "13px", color: C.crimson }}>search</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "rgba(180,195,215,0.65)" }}>{i === 0 ? "Fetching 6 additional sources…" : "Re-critiquing with enriched evidence…"}</span>
          {substepIdx >= threshold + 1 && <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "12px", color: C.green, marginLeft: "auto" }}>check_circle</span>}
        </div>
      ))}
    </div>
  );

  if (stage.id === "writer") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.green, letterSpacing: "0.1em", margin: "0 0 4px" }}>REPORT STREAMING</p>
      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(0,255,15,0.04)", border: `1px solid ${C.green}22`, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12.5px", color: "rgba(180,200,220,0.82)", lineHeight: 1.75, minHeight: "140px", whiteSpace: "pre-wrap" }}>
        <TokenStream text={demo.excerpt} active={writingActive} speed={16} />
      </div>
    </div>
  );

  return null;
}

function GlobalStyle() {
  return (
    <style>{`
      @keyframes rcPowerOn {
        0%{opacity:0;transform:translateY(46px) scale(.9);filter:brightness(.25) blur(10px);}
        45%{filter:brightness(1.35) blur(0px);}
        70%{transform:translateY(-4px) scale(1.008);}
        100%{opacity:1;transform:translateY(0) scale(1);filter:brightness(1) blur(0px);}
      }
      @keyframes rcFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes rcPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes rcSpin { to{transform:rotate(360deg)} }
      @keyframes rcSheen { 0%{left:-25%} 55%{left:110%} 100%{left:110%} }
      @keyframes rcTermBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      @keyframes rcStageBarFill { from{width:0%} to{width:100%} }
      .rc-cursor { display:inline-block; width:6px; height:12px; background:currentColor; margin-left:2px; vertical-align:-1px; animation:rcTermBlink .9s step-end infinite; }
      .rc-reveal { opacity:0; transform:translateY(28px) scale(.995); transition:opacity 1.1s cubic-bezier(.16,1,.3,1),transform 1.1s cubic-bezier(.16,1,.3,1); }
      .rc-reveal.visible { opacity:1; transform:translateY(0) scale(1); }
      .rc-card { position:relative; transition:transform .6s cubic-bezier(.16,1,.3,1), box-shadow .6s cubic-bezier(.16,1,.3,1); }
      .rc-card:hover { transform:translateY(-6px) scale(1.004); box-shadow:0 70px 130px rgba(0,0,0,.65),0 0 60px rgba(0,255,15,0.07),0 0 0 1px rgba(255,255,255,.04) !important; }
      .rc-btn { transition:all .28s cubic-bezier(.23,1,.32,1); }
      .rc-btn:hover { transform:translateY(-2px); }
      @media (max-width:900px) { .rc-grid { grid-template-columns:1fr !important; } }
      @media (prefers-reduced-motion:reduce) { .rc-root *{ animation-duration:.001ms !important; transition-duration:.001ms !important; } }
    `}</style>
  );
}

export default function ResearchChamberSection() {
  const ref = useReveal(0.08);
  const { ref: wrapRef, inView, epoch } = useInView(0.12);

  const [demoIdx, setDemoIdx]         = useState(0);
  const [stageIdx, setStageIdx]       = useState(0);
  const [substepIdx, setSubstepIdx]   = useState(0);
  const [running, setRunning]         = useState(false);
  const [done, setDone]               = useState(false);
  const [writingActive, setWritingActive] = useState(false);
  const [sheenKey, setSheenKey]       = useState(0);

  const [telemetry, setTelemetry] = useState({ tokens: 0, calls: 0, cost: 0, sources: 0 });

  const demo = DEMOS[demoIdx];
  const stage = STAGES[stageIdx];

  const runPipeline = useCallback(() => {
    if (running) return;
    setRunning(true); setDone(false);
    setStageIdx(0); setSubstepIdx(0); setWritingActive(false);
    setTelemetry({ tokens: 0, calls: 0, cost: 0, sources: 0 });
    setSheenKey(k => k + 1);

    const d = DEMOS[demoIdx];
    const SUBSTEP_MS = 900;
    const STAGE_GAP  = 300;

    let t = 200;

    STAGES.forEach((st, si) => {
      setTimeout(() => {
        setStageIdx(si);
        setSubstepIdx(0);
        setWritingActive(false);
        setTelemetry(prev => ({
          tokens:  Math.round(prev.tokens  + d.tokens  / STAGES.length),
          calls:   Math.round(prev.calls   + d.calls   / STAGES.length),
          cost:    +(prev.cost + parseFloat(d.cost) / STAGES.length).toFixed(3),
          sources: si === 0 ? d.sources.length : prev.sources,
        }));
      }, t);
      t += STAGE_GAP;

      st.substeps.forEach((_, ssi) => {
        const tSub = t + ssi * SUBSTEP_MS;
        setTimeout(() => setSubstepIdx(ssi + 1), tSub);
        if (si === STAGES.length - 1 && ssi === 1) {
          setTimeout(() => setWritingActive(true), tSub);
        }
      });
      t += st.substeps.length * SUBSTEP_MS + STAGE_GAP;
    });

    setTimeout(() => {
      setTelemetry({ tokens: d.tokens, calls: d.calls, cost: parseFloat(d.cost), sources: d.sources.length });
      setRunning(false);
      setDone(true);
    }, t);
  }, [demoIdx, running]);

  useEffect(() => {
    if (inView && !running && !done) {
      const t = setTimeout(runPipeline, 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, epoch]);

  const reset = (newDemoIdx) => {
    setRunning(false); setDone(false);
    setStageIdx(0); setSubstepIdx(0); setWritingActive(false);
    setTelemetry({ tokens: 0, calls: 0, cost: 0, sources: 0 });
    setDemoIdx(newDemoIdx);
    setSheenKey(k => k + 1);
  };

  const nextQuery = () => {
    const next = (demoIdx + 1) % DEMOS.length;
    reset(next);
    setTimeout(() => runPipeline(), 80);
  };

  const activeColor = stage?.color || C.green;

  return (
    <section className="rc-root" style={{ padding: "80px 0" }}>
      <GlobalStyle />

      <div ref={ref} className="rc-reveal">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.55fr", gap: "48px", alignItems: "end", marginBottom: "40px" }} className="rc-grid">
          <div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: C.green, letterSpacing: "0.2em", marginBottom: "16px", opacity: 0.8 }}>↓ Research Chamber</p>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 900, fontSize: "clamp(2.2rem,4.8vw,3.9rem)", lineHeight: 0.95, letterSpacing: "-0.055em", color: "#fff", margin: 0 }}>
              Ask once.<br />Get a report, not a guess.
            </h2>
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "16px", color: "rgba(130,148,168,0.82)", lineHeight: 1.7, margin: 0, paddingBottom: "4px" }}>
            Five specialized agents stream your answer in real time. Each stage visible, each source traceable, each contradiction flagged.
          </p>
        </div>

        <div key={epoch} ref={wrapRef} className="chamber-card-premium rc-card" style={{
          borderRadius: "28px", padding: "2px",
          animation: "rcPowerOn .9s cubic-bezier(.16,1,.3,1) both",
          background: `linear-gradient(135deg,${activeColor}4d,rgba(0,204,255,0.14),rgba(168,85,247,0.08),${activeColor}10)`,
          boxShadow: `0 52px 100px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.025),0 0 60px ${activeColor}14`,
          transition: "background 1s ease, box-shadow 1s ease",
        }}>
          <div style={{ borderRadius: "27px", overflow: "hidden", background: "rgba(3,3,13,0.98)", backdropFilter: "blur(28px)", position: "relative" }}>

            <div key={sheenKey} style={{ position: "absolute", top: 0, bottom: 0, left: "-25%", width: "25%", background: `linear-gradient(100deg,transparent,${activeColor}14,transparent)`, animation: "rcSheen 1.8s ease-in-out", pointerEvents: "none", zIndex: 5 }} />

            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: `linear-gradient(90deg,${activeColor}0a,rgba(0,204,255,0.02),transparent)`, transition: "background 1s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `linear-gradient(135deg,${activeColor}20,rgba(0,204,255,0.08))`, border: `1px solid ${activeColor}38`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", boxShadow: `0 0 18px ${activeColor}22`, transition: "all .6s ease" }}>
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%,${activeColor}40,transparent 65%)`, pointerEvents: "none" }} />
                  {running
                    ? <div style={{ width: "16px", height: "16px", border: `2px solid ${activeColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "rcSpin .75s linear infinite" }} />
                    : <span key={stage?.id} style={{ fontFamily: "Material Symbols Outlined", fontSize: "20px", color: activeColor, position: "relative", zIndex: 1, animation: "rcFadeUp .3s ease" }}>{stage?.icon || "biotech"}</span>
                  }
                </div>
                <div>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "15px", color: "#fff", margin: 0 }}>Neural Research</p>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: activeColor, margin: "3px 0 0", letterSpacing: "0.08em", transition: "color .6s ease" }}>
                    <span style={{ opacity: 0.5 }}>POST /ask-stream · SSE ·</span> {stage?.name.toUpperCase() || "IDLE"} {running ? "ACTIVE" : done ? "COMPLETE" : "READY"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {done && (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: C.green, letterSpacing: "0.08em", animation: "rcFadeUp .4s ease", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "13px" }}>check_circle</span> REPORT READY
                  </span>
                )}
                <button onClick={nextQuery} className="rc-btn" style={{ padding: "9px 16px", borderRadius: "9999px", border: `1px solid ${C.cyan}45`, background: "rgba(0,204,255,0.07)", color: C.cyan, fontFamily: "'Sora',sans-serif", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(0,204,255,0.18)"; e.currentTarget.style.boxShadow = `0 0 20px rgba(0,204,255,0.18)`; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(0,204,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "14px" }}>refresh</span> New query
                </button>
                <button onClick={() => window.location.href = "/research"} className="rc-btn" style={{ padding: "9px 20px", borderRadius: "9999px", border: `1px solid ${C.green}45`, background: "rgba(0,255,15,0.07)", color: C.green, fontFamily: "'Sora',sans-serif", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(0,255,15,0.18)"; e.currentTarget.style.boxShadow = `0 0 20px rgba(0,255,15,0.18)`; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(0,255,15,0.07)"; e.currentTarget.style.boxShadow = "none"; }}>
                  Launch Research <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "14px" }}>arrow_outward</span>
                </button>
              </div>
            </div>

            <div style={{ padding: "10px 28px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.04)", zIndex: 1, position: "relative" }}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", color: "rgba(180,200,220,0.6)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: activeColor }}>●</span> "{demo.query}"
              </p>
            </div>

            <div style={{ padding: "28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", position: "relative", zIndex: 1 }} className="rc-grid">

              <div>
                <div style={{ display: "flex", gap: "4px", marginBottom: "22px" }}>
                  {STAGES.map((s, i) => {
                    const isPast   = i < stageIdx;
                    const isCurr   = i === stageIdx;
                    return (
                      <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", cursor: "default" }}>
                        <div style={{
                          width: "100%", height: "3px", borderRadius: "3px",
                          background: isPast ? s.color : isCurr ? `linear-gradient(90deg,${s.color},${s.color}55)` : "rgba(255,255,255,0.07)",
                          boxShadow: isCurr ? `0 0 8px ${s.color}80` : "none",
                          transition: "background .5s ease",
                          ...(isCurr ? { animation: "rcStageBarFill 0.9s cubic-bezier(.22,1,.36,1) both" } : {}),
                        }} />
                        <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "13px", color: isPast ? s.color : isCurr ? s.color : "rgba(120,135,155,0.4)", transition: "color .4s ease" }}>{s.icon}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: isPast ? s.color : isCurr ? s.color : "rgba(100,115,135,0.4)", letterSpacing: "0.07em", transition: "color .4s ease" }}>{s.name.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>

                <div key={`${stageIdx}-${demoIdx}`} style={{ padding: "16px", borderRadius: "14px", background: `${activeColor}08`, border: `1px solid ${activeColor}25`, marginBottom: "18px", minHeight: "130px", transition: "all .5s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "15px", color: activeColor }}>{stage?.icon}</span>
                    <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "13px", color: "#fff" }}>{stage?.name}</span>
                    {running && stageIdx < STAGES.length && (
                      <div style={{ marginLeft: "auto", display: "flex", gap: "3px" }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: activeColor, animation: `rcPulse 1.1s ${i * 0.18}s ease-in-out infinite` }} />)}
                      </div>
                    )}
                    {done && <span style={{ marginLeft: "auto", fontFamily: "Material Symbols Outlined", fontSize: "14px", color: C.green }}>check_circle</span>}
                  </div>
                  {stage?.substeps.map((sub, si) => (
                    <SubstepRow
                      key={`${stageIdx}-${si}`}
                      text={sub}
                      state={si < substepIdx - 1 ? "done" : si === substepIdx - 1 ? (running ? "running" : "done") : "pending"}
                      delay={si * 120}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    { icon: "tune",         label: "Style: Academic/ELI5/Casual" },
                    { icon: "filter_9_plus",label: "Sources: Auto or 3 to 20" },
                    { icon: "forum",        label: "Chat with report" },
                    { icon: "cached",       label: "Caching" },
                    { icon: "ios_share",    label: "Share" },
                  ].map(c => (
                    <span key={c.label} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "9999px", border: `1px solid ${C.green}25`, background: "rgba(0,255,15,0.04)", fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: C.green, letterSpacing: "0.04em" }}>
                      <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "10px" }}>{c.icon}</span>{c.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ flex: 1, padding: "16px", borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", minHeight: "200px" }}>
                  <StageDetail
                    key={`${stageIdx}-${demoIdx}`}
                    stageIdx={stageIdx}
                    substepIdx={substepIdx}
                    demo={demo}
                    writingActive={writingActive}
                  />
                  {!running && !done && (
                    <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "rgba(255,255,255,0.15)", margin: 0 }}>Scroll down to start the pipeline…</p>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <TelemetryVal value={telemetry.tokens}  suffix="" color={C.cyan}   label="TOKENS USED"    icon="token" />
                  <TelemetryVal value={telemetry.calls}   suffix="" color={C.purple} label="LLM CALLS"      icon="api" />
                  <TelemetryVal value={telemetry.cost}    suffix="$" color={C.amber}  label="EST. COST"     icon="payments" />
                  <TelemetryVal value={telemetry.sources} suffix="" color={C.teal}   label="SOURCES"        icon="travel_explore" />
                </div>

                {(stageIdx >= 4 || done) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 18px", borderRadius: "14px", background: `${confidenceColor(demo.confidence)}08`, border: `1px solid ${confidenceColor(demo.confidence)}22`, animation: "rcFadeUp .5s ease" }}>
                    <ConfidenceRing value={demo.confidence} active={stageIdx >= 4 || done} />
                    <div>
                      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: confidenceColor(demo.confidence), letterSpacing: "0.1em", margin: "0 0 5px" }}>REPORT CONFIDENCE</p>
                      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(170,185,205,0.7)", margin: 0, lineHeight: 1.55 }}>Calibrated across {demo.sources.length} sources with {demo.confidence >= 75 ? "strong" : demo.confidence >= 55 ? "moderate" : "low"} cross-source agreement.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 0, background: "rgba(2,2,11,0.65)", position: "relative", zIndex: 1 }}>
              {[
                { label: "Agents + deepen loop", val: "4+1",       color: C.green  },
                { label: "Delivery",              val: "streamed",  color: C.cyan   },
                { label: "Report format",         val: "structured",color: C.purple },
                { label: "Current stage",         val: done ? "complete" : stage?.name.toLowerCase() || "idle", color: activeColor },
              ].map((stat, i) => (
                <div key={stat.label} style={{ display: "flex", alignItems: "baseline", gap: "8px", flex: 1, paddingLeft: i === 0 ? 0 : "24px", borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 600, color: stat.color, letterSpacing: "-0.01em", transition: "color .5s ease" }}>{stat.val}</span>
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "11px", color: "rgba(150,165,185,0.55)" }}>{stat.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
