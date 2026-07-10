import { useState, useEffect, useRef, useMemo } from "react";

/*
  ============================================================================
  HOW TO FEED THIS COMPONENT REAL DATA
  ============================================================================
  Everything the UI shows now comes from ONE `data` prop (shape documented
  below) plus an optional `apiUrl` prop for live SSE streaming from your
  backend (/ask-stream style, matching what you already run on POLYNOUS).

  Usage patterns:

  1) Static / one-shot render (you already have the payload):
       <NeuralResearchEngine data={myResearchPayload} />

  2) Live streaming from your backend:
       <NeuralResearchEngine
         apiUrl="https://your-backend.up.railway.app/ask-stream"
         query="Will quantum computing achieve practical advantage by 2035?"
       />
     This opens a streaming POST to apiUrl and expects JSON events shaped
     like the objects described in useLiveResearch() below. Adjust the
     event parsing there to match your actual backend event names — it's
     intentionally left as a thin, obvious adapter layer so you can wire it
     to /ask-stream or /ask-visual in one place.

  3) No data prop and no apiUrl: falls back to DEFAULT_DATA (placeholder)
     purely so the component doesn't crash if you forget to pass anything —
     replace DEFAULT_DATA or just always pass `data`.

  ============================================================================
  FULL DATA SHAPE (all fields optional — missing fields fall back safely)
  ============================================================================
  {
    query: string,
    elapsedSeconds: number,
    progress: number,                 // 0-100 overall run progress
    convergence: number,               // 0-100 convergence %

    agents: {
      Search: {
        progress: number,              // 0-100 ring
        phase: { label: string, sub: string },
        stats: [[label, value], ...],  // key/value rows under the header
        lastSource: {
          id: string, badge: string, title: string,
          description: string, time: string, score: string
        },
        signal: {                      // "SignalBars" component
          eyebrow: string, variant: 'cyan'|'blue'|'purple'|'entailment'|'contradiction'|'neutral',
          promptLabel: string, promptText: string,
          levels: number[]             // bar heights 0-100, length = bar count
        }
      },
      Summarise: {
        progress, phase, stats,
        notes: string[],                       // "Working Notes" bullets
        insights: [{ text: string, tag: string }],  // "Key Insights Extracted"
        signal: { ...same shape as above }
      },
      Critic: {
        progress, phase, stats,
        signal: { ...same shape as above },    // "Current Check"
        checklist: [{ label: string, status: 'done'|'active'|'pending' }]
      },
      Writer: {
        progress, phase, stats,
        draftText: string,              // current live paragraph
        wordCount: number,
        signal: { ...same shape as above }
      }
    },

    logs: [{ id, agentName: 'Search'|'Summarise'|'Critic'|'Writer', msg: string, timeStr: string }],

    lanes: {                            // Synthesis Merge Visual left-side lane readouts
      Search:    { sub: string, status: string },
      Summarise: { sub: string, status: string },
      Critic:    { sub: string, status: string },
      Writer:    { sub: string, status: string },
    },
    floatingTags: [{ agent: 'Search'|'Summarise'|'Critic'|'Writer', label: string, value: string, delay: string, top, left, right, bottom }],

    metrics: { sources: string|number, insights: string|number, claims: string|number, confidence: string|number },

    confidenceBreakdown: [{ label: string, pct: number, color?: string }],

    sourceTrust: {
      high: number, med: number, low: number,   // percentages, should sum to 100
      domains: [{ name: string, score: string, tier: 'high'|'med'|'low' }]
    },

    faithfulness: {
      grounded: number, total: number,
      flagged: [{ eyebrow: string, variant: string, text: string }]
    },

    contradiction: {
      claimA: { label: string, trust: string, text: string, source: string },
      claimB: { label: string, trust: string, text: string, source: string },
      resolution: string
    },

    suggestions: [{ icon: string, agent: 'Search'|'Summarise'|'Critic'|'Writer', title: string, est: string,
                     diff: string, diffLevel: 'low'|'med'|'high', avail: string, availLevel: 'low'|'med'|'high' }]
  }
*/

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background-color: #0a0a1e;
    color: #ECEEF2;
    font-family: 'Inter', sans-serif;
  }

  .panel {
    position: relative;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    transition: border-color 0.3s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
  }
  .panel:hover {
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-1px);
  }

  .agent-top-cyan { border-top: 2px solid rgba(79,209,197,0.55); }
  .agent-top-blue { border-top: 2px solid rgba(108,140,255,0.55); }
  .agent-top-amber { border-top: 2px solid rgba(232,168,85,0.55); }
  .agent-top-violet { border-top: 2px solid rgba(180,142,240,0.55); }

  .font-display { font-family: 'Sora', sans-serif; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }

  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(108,140,255,0.25); border-radius: 4px; }

  .thought-stream-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
  .thought-stream-scrollbar::-webkit-scrollbar { width: 4px; }
  .thought-stream-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .thought-stream-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 10px; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUpFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes flashHighlight { 0% { background: rgba(108,140,255,0.08); } 100% { background: transparent; } }
  @keyframes pulseCore {
    0% { transform: scale(0.96); opacity: 0.85; }
    50% { transform: scale(1.04); opacity: 1; }
    100% { transform: scale(0.96); opacity: 0.85; }
  }
  @keyframes coreBurst { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
  @keyframes typing { from { width: 0; } to { width: 88ch; } }
  @keyframes blinkCaret { from, to { border-color: transparent; } 50% { border-color: #6C8CFF; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
  @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes popNumber { 0% { transform: scale(1); } 35% { transform: scale(1.16); } 100% { transform: scale(1); } }
  @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes dotWave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes tagPop {
    0% { opacity: 0; transform: translateY(4px); }
    14% { opacity: 1; transform: translateY(0); }
    84% { opacity: 1; }
    100% { opacity: 0; transform: translateY(-10px); }
  }
  @keyframes heartbeatGlow { 0% { opacity: 0.45; transform: scale(1); } 30% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.45; transform: scale(1); } }

  .fade-in { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }
  .log-entry { animation: slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
  .log-entry-new { animation: slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1) forwards, flashHighlight 1.2s ease-out forwards; border-radius: 8px; }
  .synthesis-core { animation: pulseCore 2.4s ease-in-out infinite; }
  .float-tag { animation: tagPop 5s ease-in-out infinite; }
  .typewriter-text {
    display: inline-block; overflow: hidden; white-space: nowrap;
    border-right: 0.12em solid #6C8CFF; width: 88ch; max-width: 100%;
    animation: typing 3s steps(88, end), blinkCaret 0.8s step-end infinite;
    vertical-align: bottom;
  }
  .animate-spin { animation: spin 5s linear infinite; }
  .animate-soft-pulse { animation: softPulse 2.2s ease-in-out infinite; }
  .pop-number { display: inline-block; animation: popNumber 0.35s cubic-bezier(0.34,1.56,0.64,1); }
  .card-press { transition: transform 0.15s ease, border-color 0.15s ease; }
  .card-press:active { transform: scale(0.985) !important; }

  .agent-avatar-wrap { position: relative; width: 48px; height: 48px; flex-shrink: 0; }
  .agent-avatar-ring { transform: rotate(-90deg); transition: stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1); }

  .thinking-dots { display: inline-flex; gap: 3px; align-items: flex-end; height: 8px; }
  .thinking-dots span { width: 3px; height: 3px; border-radius: 50%; background: currentColor; animation: dotWave 1.2s ease-in-out infinite; }
  .thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0.3s; }

  .hover-row { transition: background 0.2s ease, border-color 0.2s ease; }
  .hover-row:hover { background: rgba(255,255,255,0.03); }

  .bar-fill { transition: width 0.8s cubic-bezier(0.16,1,0.3,1); }

  .hairline-top { position: relative; }
  .hairline-top::after {
    content: ""; position: absolute; top: 0; left: 18px; right: 18px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
  }

  .signal-panel {
    position: relative;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .signal-bars { display: flex; align-items: flex-end; gap: 4px; height: 40px; }
  .signal-bar { flex: 1; border-radius: 3px 3px 1px 1px; min-width: 3px; transition: height 0.6s cubic-bezier(0.16,1,0.3,1); }
  .signal-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
    border: 1px solid; white-space: nowrap;
  }
  .check-icon { flex-shrink: 0; }

  .ambient-field {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 40% at 18% 10%, rgba(108,140,255,0.05), transparent 60%),
      radial-gradient(ellipse 50% 35% at 85% 90%, rgba(180,142,240,0.035), transparent 60%);
  }

  .type-heading { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; color: #ECEEF2; letter-spacing: -0.005em; }
  .type-section { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #7C8494; }
  .tabular-nums { font-variant-numeric: tabular-nums; }

  .task-row { transition: background 0.2s ease; border-radius: 8px; }
  .task-row:hover { background: rgba(255,255,255,0.03); }

  .empty-note { font-size: 11.5px; color: #565C6D; font-family: 'JetBrains Mono', monospace; font-style: italic; }

  ::selection { background: #6C8CFF; color: #0a0a1e; }
`;

const NLI_VARIANTS = {
  entailment: { from: "#F4CE7C", to: "#8A5E1E", mid: "#E8A855", badge: "#E8A855", label: "ENTAILMENT" },
  contradiction: { from: "#F0A5A0", to: "#7A2E28", mid: "#E0685F", badge: "#E0685F", label: "CONTRADICTION" },
  neutral: { from: "#C6CAD4", to: "#454B5A", mid: "#8A90A2", badge: "#8A90A2", label: "NEUTRAL" },
  cyan: { from: "#9FEAE0", to: "#0F6E63", mid: "#4FD1C5", badge: "#4FD1C5", label: "HIGH RELEVANCE" },
  blue: { from: "#B7C4FF", to: "#2C3E9E", mid: "#6C8CFF", badge: "#6C8CFF", label: "COMPRESSED" },
  purple: { from: "#DCC9F7", to: "#5B3D8C", mid: "#B48EF0", badge: "#B48EF0", label: "COHERENT" },
};

const AGENT_META = {
  Search: { color: "#4FD1C5", rgb: "79,209,197", key: "cyan", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  Summarise: { color: "#6C8CFF", rgb: "108,140,255", key: "blue", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  Critic: { color: "#E8A855", rgb: "232,168,85", key: "amber", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  Writer: { color: "#B48EF0", rgb: "180,142,240", key: "purple", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
};
const AGENT_NAMES = Object.keys(AGENT_META);

const AGENT_STYLES = {
  cyan: { badge: { background: "rgba(79,209,197,0.12)", color: "#4FD1C5", border: "1px solid rgba(79,209,197,0.28)" } },
  blue: { badge: { background: "rgba(108,140,255,0.12)", color: "#6C8CFF", border: "1px solid rgba(108,140,255,0.28)" } },
  amber: { badge: { background: "rgba(232,168,85,0.12)", color: "#E8A855", border: "1px solid rgba(232,168,85,0.28)" } },
  purple: { badge: { background: "rgba(180,142,240,0.12)", color: "#B48EF0", border: "1px solid rgba(180,142,240,0.28)" } },
};

const LEVEL_COLOR = { low: "#4FD1C5", med: "#E8A855", high: "#E0685F" };

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — only used if you render <NeuralResearchEngine /> with no
// `data` and no `apiUrl` prop. Replace this object, or better, just always
// pass your own `data` prop from the parent and ignore this entirely.
// ---------------------------------------------------------------------------
const DEFAULT_DATA = {
  query: "",
  elapsedSeconds: 0,
  progress: 0,
  convergence: 0,
  agents: {
    Search: { progress: 0, phase: { label: "Idle", sub: "Waiting for research session to start" }, stats: [], lastSource: null, signal: null },
    Summarise: { progress: 0, phase: { label: "Idle", sub: "Waiting for research session to start" }, stats: [], notes: [], insights: [], signal: null },
    Critic: { progress: 0, phase: { label: "Idle", sub: "Waiting for research session to start" }, stats: [], signal: null, checklist: [] },
    Writer: { progress: 0, phase: { label: "Idle", sub: "Waiting for research session to start" }, stats: [], draftText: "", wordCount: 0, signal: null },
  },
  logs: [],
  lanes: {
    Search: { sub: "", status: "" },
    Summarise: { sub: "", status: "" },
    Critic: { sub: "", status: "" },
    Writer: { sub: "", status: "" },
  },
  floatingTags: [],
  metrics: { sources: "—", insights: "—", claims: "—", confidence: "—" },
  confidenceBreakdown: [],
  sourceTrust: { high: 0, med: 0, low: 0, domains: [] },
  faithfulness: { grounded: 0, total: 0, flagged: [] },
  contradiction: null,
  suggestions: [],
};

function deepMerge(base, override) {
  if (!override) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.keys(override).forEach((k) => {
    if (override[k] && typeof override[k] === "object" && !Array.isArray(override[k]) && base && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], override[k]);
    } else {
      out[k] = override[k];
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// OPTIONAL: live streaming adapter. Point `apiUrl` at your backend's SSE
// endpoint (e.g. https://your-app.up.railway.app/ask-stream, matching the
// localhost-vs-Railway auto-detect pattern you already use elsewhere).
// Adjust the parsing below to match your actual event schema — this is
// intentionally a thin, single place to edit.
// ---------------------------------------------------------------------------
function useLiveResearch(apiUrl, query) {
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    if (!apiUrl) return;
    let cancelled = false;

    async function connect() {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          parts.forEach((chunk) => {
            const line = chunk.replace(/^data:\s*/, "").trim();
            if (!line) return;
            try {
              const event = JSON.parse(line);
              // ---- EDIT HERE to match your backend's event shape ----
              // Expected: each event is either a full `data` object, or a
              // partial patch. This does a shallow deep-merge patch onto
              // whatever we've received so far.
              setLiveData((prev) => deepMerge(prev || DEFAULT_DATA, event));
            } catch (e) {
              // non-JSON keepalive line, ignore
            }
          });
        }
      } catch (err) {
        console.error("Live research stream error:", err);
      }
    }

    connect();
    return () => { cancelled = true; };
  }, [apiUrl, query]);

  return { liveData };
}

function SignalBars({ eyebrow, variant = "entailment", promptLabel, promptText, levels, compact = false }) {
  const v = NLI_VARIANTS[variant] || NLI_VARIANTS.neutral;
  const [hoverIdx, setHoverIdx] = useState(null);
  const bars = levels && levels.length ? levels : [];

  if (!bars.length) {
    return (
      <div className="signal-panel hairline-top">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "9.5px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600 }}>{eyebrow}</span>
        </div>
        <div className="empty-note" style={{ marginTop: "10px" }}>No signal data yet</div>
      </div>
    );
  }

  return (
    <div className="signal-panel hairline-top">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compact ? "9px" : "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: v.badge }} />
          <span style={{ fontSize: "9.5px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600 }}>{eyebrow}</span>
        </div>
        <span className="signal-badge" style={{ color: v.badge, borderColor: `${v.badge}45`, background: `${v.badge}12` }}>{v.label}</span>
      </div>

      {promptText && (
        <div style={{ fontSize: compact ? "11.5px" : "12.5px", color: "#C7CBD6", fontFamily: "Inter, sans-serif", lineHeight: 1.5, marginBottom: "12px" }}>
          {promptLabel && <span style={{ color: "#7C8494" }}>{promptLabel}: </span>}
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: compact ? "10.5px" : "11.5px" }}>{promptText}</span>
        </div>
      )}

      <div className="signal-bars" style={{ height: compact ? "26px" : "40px", position: "relative" }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="signal-bar"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            style={{
              height: `${Math.max(4, Math.min(100, h))}%`,
              background: `linear-gradient(180deg, ${v.from}, ${v.to})`,
              opacity: hoverIdx === i ? 1 : 0.82,
              cursor: "pointer",
              transform: hoverIdx === i ? "scaleY(1.04)" : "scaleY(1)",
              transformOrigin: "bottom",
              position: "relative",
              zIndex: hoverIdx === i ? 2 : 1,
            }}
          >
            {hoverIdx === i && (
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "6px", background: "#12141C", border: `1px solid ${v.badge}55`, borderRadius: "5px", padding: "2px 6px", fontSize: "9.5px", fontFamily: "JetBrains Mono, monospace", color: v.badge, whiteSpace: "nowrap" }}>
                {Math.round(h)}%
              </div>
            )}
          </div>
        ))}
      </div>
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
  const color = item.status === "done" ? "#4FD1C5" : item.status === "active" ? "#E8A855" : "#565C6D";
  const Glyph = item.status === "done" ? CheckGlyph : item.status === "active" ? SpinGlyph : PendingGlyph;
  return (
    <div style={{ display: "flex", gap: "9px", color: item.status === "pending" ? "#565C6D" : "#C7CBD6", alignItems: "center", fontSize: "11.5px", fontFamily: "JetBrains Mono, monospace" }}>
      <Glyph color={color} /> {item.label}
    </div>
  );
};

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

/*
  Props:
    data     — full data object (see shape at top of file). Missing fields
               fall back to DEFAULT_DATA safely.
    apiUrl   — optional. If set, opens a streaming POST to this endpoint and
               merges incoming events into the live data automatically.
    query    — the research question, sent to apiUrl and shown in the header
               if data.query isn't set.
*/
export default function NeuralResearchEngine({ data: dataProp, apiUrl, query }) {
  const { liveData } = useLiveResearch(apiUrl, query);
  const data = useMemo(() => {
    const merged = deepMerge(DEFAULT_DATA, dataProp || liveData || {});
    if (query && !merged.query) merged.query = query;
    return merged;
  }, [dataProp, liveData, query]);

  const [coreBurst, setCoreBurst] = useState(0);
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [pressedCard, setPressedCard] = useState(null);
  const [activeLane, setActiveLane] = useState(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [wordPop, setWordPop] = useState(0);

  const streamRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const threeInitedRef = useRef(false);
  const laneBoostRef = useRef({ Search: 0, Summarise: 0, Critic: 0, Writer: 0 });
  const activeLaneTimeoutRef = useRef(null);
  const prevLogCountRef = useRef(0);
  const prevWordCountRef = useRef(data.agents.Writer.wordCount);

  // React to new log entries arriving from real data: burst the core, boost
  // that agent's particle lane, and auto-scroll the thought stream.
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
      streamRef.current.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [data.logs, isUserScrolling]);

  // Three.js synthesis visual — geometry/animation is cosmetic, but the lane
  // "boost" (which stream brightens/speeds up) is driven by real log events
  // via laneBoostRef, updated above whenever a new backend log arrives.
  useEffect(() => {
    if (threeInitedRef.current || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    if (typeof THREE === "undefined") return;
    threeInitedRef.current = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.z = 400;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const systemColors = [0x4fd1c5, 0x6c8cff, 0xe8a855, 0xb48ef0];
    const SIGNATURE = 0x6c8cff;
    const coreGroup = new THREE.Group();
    coreGroup.position.x = 220;
    scene.add(coreGroup);

    const coreGeom = new THREE.SphereGeometry(20, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreGroup.add(coreMesh);

    const glowGeom = new THREE.SphereGeometry(48, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({ color: SIGNATURE, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    coreGroup.add(glowMesh);

    const layers = [];
    for (let i = 0; i < 3; i++) {
      const geom = new THREE.SphereGeometry(24 + i * 9, 32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: SIGNATURE, transparent: true, opacity: 0.2 - i * 0.05, blending: THREE.AdditiveBlending });
      const layer = new THREE.Mesh(geom, mat);
      coreGroup.add(layer);
      layers.push(layer);
    }

    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(44 + i * 16, 0.4, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color: SIGNATURE, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      coreGroup.add(ring);
      rings.push(ring);
    }

    const haloCount = 120;
    const haloGeom = new THREE.BufferGeometry();
    const haloPos = new Float32Array(haloCount * 3);
    const haloData = [];
    for (let i = 0; i < haloCount; i++) {
      const r = 30 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      haloData.push({ r, theta, phi, speed: 0.15 + Math.random() * 0.3, phiSpeed: (Math.random() - 0.5) * 0.08 });
      haloPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      haloPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      haloPos[i * 3 + 2] = r * Math.cos(phi);
    }
    haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
    const haloMat = new THREE.PointsMaterial({ color: 0xd7deff, size: 1.4, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
    const haloPoints = new THREE.Points(haloGeom, haloMat);
    coreGroup.add(haloPoints);

    const WAVE_COUNT = 3;
    const WAVE_PERIOD = 2.6;
    const waveGeo = new THREE.RingGeometry(1, 1.35, 48);
    const waves = Array.from({ length: WAVE_COUNT }, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: SIGNATURE, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(waveGeo, mat);
      mesh.rotation.x = Math.PI / 2.4;
      coreGroup.add(mesh);
      return { mesh, offset: i * (WAVE_PERIOD / WAVE_COUNT) };
    });

    const particleGroups = [];
    const particlesPerStream = 260;
    const agentX = -320;
    const agentYPositions = [120, 40, -40, -120];

    agentYPositions.forEach((yPos, index) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesPerStream * 3);
      const pData = [];
      for (let i = 0; i < particlesPerStream; i++) {
        const progressT = Math.random();
        const x = agentX + progressT * (coreGroup.position.x - agentX);
        const y = yPos + (coreGroup.position.y - yPos) * progressT * progressT;
        const z = (Math.random() - 0.5) * 50;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        pData.push({ progress: progressT, speed: 0.003 + Math.random() * 0.008, zOffset: (Math.random() - 0.5) * 20 });
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color: systemColors[index], size: 1.8, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      particleGroups.push({ points, pData, originY: yPos, agentName: AGENT_NAMES[index], material });
    });

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      const heartbeatPhase = (time % 6.4) / 6.4;
      const heartbeat = Math.exp(-Math.pow((heartbeatPhase - 0.08) * 5.5, 2));

      const scale = 1 + Math.sin(time * 4) * 0.06 + heartbeat * 0.3;
      coreMesh.scale.set(scale, scale, scale);
      glowMesh.material.opacity = 0.05 + heartbeat * 0.12;
      glowMesh.scale.setScalar(1 + heartbeat * 0.45);

      layers.forEach((l, i) => {
        const lScale = 1 + Math.sin(time * 3 + i) * 0.12 + heartbeat * 0.16;
        l.scale.set(lScale, lScale, lScale);
        l.material.opacity = (0.2 - i * 0.05) * (0.85 + Math.sin(time * 5) * 0.15) + heartbeat * 0.1;
      });
      rings.forEach((r, i) => { r.rotation.x += 0.008 * (i + 1); r.rotation.z += 0.004; });

      const haloArr = haloPoints.geometry.attributes.position.array;
      haloData.forEach((d, i) => {
        d.theta += d.speed * 0.01;
        d.phi += d.phiSpeed * 0.01;
        haloArr[i * 3] = d.r * Math.sin(d.phi) * Math.cos(d.theta);
        haloArr[i * 3 + 1] = d.r * Math.sin(d.phi) * Math.sin(d.theta);
        haloArr[i * 3 + 2] = d.r * Math.cos(d.phi);
      });
      haloPoints.geometry.attributes.position.needsUpdate = true;
      haloMat.opacity = 0.55 + heartbeat * 0.35;
      haloPoints.rotation.y += 0.0012;

      waves.forEach((w) => {
        const local = ((time + w.offset) % WAVE_PERIOD) / WAVE_PERIOD;
        const s = 0.4 + local * 3.2;
        w.mesh.scale.set(s, s, s);
        w.mesh.material.opacity = Math.max(0, 0.28 * (1 - local));
      });

      particleGroups.forEach((group) => {
        const pos = group.points.geometry.attributes.position.array;
        const boost = laneBoostRef.current[group.agentName] || 0;
        group.material.size = 1.8 + boost * 2;
        group.material.opacity = 0.65 + boost * 0.3;
        laneBoostRef.current[group.agentName] = boost * 0.94;
        const speedMul = 1 + boost * 1.6;

        group.pData.forEach((data2, i) => {
          data2.progress += data2.speed * speedMul;
          if (data2.progress >= 1) data2.progress = 0;
          const t = data2.progress;
          pos[i * 3] = agentX + t * (coreGroup.position.x - agentX);
          pos[i * 3 + 1] = group.originY + (coreGroup.position.y - group.originY) * t * t + Math.sin(t * 10 + time) * 5;
          pos[i * 3 + 2] = data2.zOffset + Math.cos(t * 10 + time) * 5;
        });
        group.points.geometry.attributes.position.needsUpdate = true;
      });
      renderer.render(scene, camera);
    };

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const AgentIcon = ({ path, size = 18, style }) => (
    <svg style={{ width: size, height: size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );

  const AgentAvatar = ({ name }) => {
    const meta = AGENT_META[name];
    const pct = data.agents[name].progress || 0;
    const offset = RING_C - (pct / 100) * RING_C;
    const isHovered = hoveredAgent === name;
    return (
      <div className="agent-avatar-wrap" onMouseEnter={() => setHoveredAgent(name)} onMouseLeave={() => setHoveredAgent(null)} title={`${pct}% complete`}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
          <circle className="agent-avatar-ring" cx="24" cy="24" r={RING_R} fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={offset} />
        </svg>
        <div style={{ position: "absolute", inset: "7px", borderRadius: "50%", background: `rgba(${meta.rgb},0.1)`, border: `1px solid rgba(${meta.rgb},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color, transition: "transform 0.3s ease", transform: isHovered ? "scale(1.08)" : "scale(1)" }}>
          <AgentIcon path={meta.icon} size={15} />
        </div>
        <div style={{ position: "absolute", bottom: "-3px", right: "-3px", fontSize: "8px", fontFamily: "JetBrains Mono, monospace", color: meta.color, background: "#101219", borderRadius: "6px", padding: "1px 4px", border: `1px solid rgba(${meta.rgb},0.35)`, fontWeight: 700 }}>{pct}</div>
      </div>
    );
  };

  const AgentHeader = ({ name }) => {
    const meta = AGENT_META[name];
    const phase = data.agents[name].phase || { label: "Idle", sub: "" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(${meta.rgb},0.18)`, paddingBottom: "11px" }}>
          <div className="font-display" style={{ display: "flex", alignItems: "center", gap: "9px", fontWeight: "600", fontSize: "14.5px", letterSpacing: "0.01em", color: meta.color }}>
            <AgentIcon path={meta.icon} style={{ color: meta.color }} />
            {name} Agent
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AgentAvatar name={name} />
          <div className="font-mono" style={{ color: "#7C8494", lineHeight: 1.5, fontSize: "11.5px" }}>
            <span key={phase.label} style={{ color: meta.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {phase.label}
              {phase.label !== "Idle" && (
                <span className="thinking-dots" style={{ color: meta.color }}><span /><span /><span /></span>
              )}
            </span>
            <br />
            {phase.sub}
          </div>
        </div>
      </div>
    );
  };

  const StatRows = ({ stats }) => (
    <>
      {stats && stats.length > 0 ? stats.map(([label, val]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#7C8494" }}>{label}</span>
          <span style={{ color: "#C7CBD6" }}>{val}</span>
        </div>
      )) : <div className="empty-note">No stats yet</div>}
    </>
  );

  const search = data.agents.Search;
  const summarise = data.agents.Summarise;
  const critic = data.agents.Critic;
  const writer = data.agents.Writer;

  return (
    <>
      <style>{styles}</style>
      <div className="ambient-field" />
      <div style={{ minHeight: "100vh", padding: "56px 88px", display: "flex", flexDirection: "column", gap: "44px", background: "#0a0a1e", position: "relative", zIndex: 1 }}>

        {/* Header — query: data.query, progress: data.progress, elapsedSeconds: data.elapsedSeconds */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6C8CFF" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 600, color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Multi-agent research session
              </span>
            </div>
            <h1 className="font-display" style={{ fontSize: "30px", fontWeight: "700", letterSpacing: "-0.015em", color: "#FFFFFF" }}>
              Neural Research <span style={{ color: "#6C8CFF" }}>Engine</span>
            </h1>
            <div style={{ marginTop: "14px", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
              <span style={{ color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.05em" }}>Research query</span>
              <br />
              {data.query ? (
                <span className="typewriter-text" style={{ color: "#C7CBD6", marginTop: "6px" }}>{data.query}</span>
              ) : (
                <span className="empty-note" style={{ display: "block", marginTop: "6px" }}>Awaiting query</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
              <div className="synthesis-core" style={{ width: "58px", height: "58px", borderRadius: "50%", border: "1px solid rgba(108,140,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(108,140,255,0.06)", position: "relative" }}>
                <div className="animate-spin" style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(108,140,255,0.4)", borderRadius: "50%" }}></div>
                <div style={{ position: "absolute", inset: "-4px", border: "1px dashed rgba(108,140,255,0.2)", borderRadius: "50%", animation: "spinReverse 9s linear infinite" }}></div>
                <div style={{ width: "10px", height: "10px", background: "#6C8CFF", borderRadius: "50%" }}></div>
                <div key={coreBurst} style={{ position: "absolute", inset: "18px", borderRadius: "50%", border: "1px solid #6C8CFF", animation: coreBurst ? "coreBurst 0.9s ease-out forwards" : "none" }} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#ECEEF2", fontWeight: "600", fontFamily: "Inter, sans-serif" }}>Synthesizing insights</div>
                <div style={{ fontSize: "11.5px", color: "#7C8494", marginTop: "3px" }}>Agents collaborating in real time</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "10.5px", color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace", marginBottom: "6px" }}>Progress</div>
                <div style={{ fontSize: "26px", fontFamily: "Sora, sans-serif", color: "#FFFFFF", fontWeight: "700" }}>
                  <span key={data.progress} className="pop-number">{data.progress}</span><span style={{ fontSize: "14px", color: "#7C8494" }}>%</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace", marginBottom: "6px" }}>Agents active</div>
                <div style={{ fontSize: "26px", fontFamily: "Sora, sans-serif", color: "#FFFFFF", fontWeight: "700" }}>
                  {AGENT_NAMES.filter((n) => (data.agents[n].progress || 0) > 0 && (data.agents[n].progress || 0) < 100).length}
                  <span style={{ fontSize: "14px", color: "#7C8494" }}>/4</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "#7C8494", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace", marginBottom: "6px" }}>Elapsed</div>
                <div className="tabular-nums" style={{ fontSize: "26px", fontFamily: "Sora, sans-serif", color: "#FFFFFF", fontWeight: "700" }}>{formatTime(data.elapsedSeconds)}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Agent Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          <main style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>

            {/* Search Agent — data.agents.Search.{stats, lastSource, signal} */}
            <section className="panel agent-top-cyan" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <AgentHeader name="Search" />
              <div className="font-mono" style={{ fontSize: "11.5px", marginTop: "-4px", borderLeft: "2px solid rgba(79,209,197,0.25)", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "7px" }}>
                <StatRows stats={search.stats} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="type-section" style={{ color: "#4FD1C5" }}>Last source added</div>
                {search.lastSource ? (
                  <div className="fade-in hover-row" style={{ display: "flex", alignItems: "flex-start", gap: "11px", background: "rgba(255,255,255,0.03)", padding: "11px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ padding: "7px", background: "rgba(79,209,197,0.1)", borderRadius: "8px", color: "#4FD1C5" }}>
                      <svg style={{ width: "15px", height: "15px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", gap: "7px", fontFamily: "Inter, sans-serif", color: "#ECEEF2" }}>
                          {search.lastSource.id}
                          {search.lastSource.badge && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "9px", color: "#4FD1C5", padding: "2px 7px", borderRadius: "999px", border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.08)", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.04em" }}>{search.lastSource.badge}</span>
                          )}
                        </div>
                        <div style={{ fontSize: "9.5px", color: "#7C8494", fontFamily: "JetBrains Mono, monospace" }}>{search.lastSource.time}</div>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#7C8494", marginTop: "4px", lineHeight: "1.4" }}>{search.lastSource.title || search.lastSource.description}</div>
                    </div>
                    {search.lastSource.score && <div style={{ color: "#4FD1C5", fontSize: "13px", fontFamily: "JetBrains Mono, monospace", alignSelf: "center", fontWeight: "600" }}>{search.lastSource.score}</div>}
                  </div>
                ) : <div className="empty-note">No sources yet</div>}
                <SignalBars {...(search.signal || { eyebrow: "Retrieval spread", variant: "cyan" })} />
              </div>
            </section>

            {/* Summarise Agent — data.agents.Summarise.{stats, notes, insights, signal} */}
            <section className="panel agent-top-blue" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <AgentHeader name="Summarise" />
              <div className="font-mono" style={{ fontSize: "11.5px", marginTop: "-4px", borderLeft: "2px solid rgba(108,140,255,0.25)", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "7px" }}>
                <StatRows stats={summarise.stats} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div className="type-section" style={{ color: "#6C8CFF", marginBottom: "10px" }}>Working notes</div>
                  {summarise.notes && summarise.notes.length ? (
                    <ul style={{ fontSize: "12.5px", color: "#C7CBD6", display: "flex", flexDirection: "column", gap: "9px", fontFamily: "Inter, sans-serif", listStyle: "disc", paddingLeft: "18px", lineHeight: "1.55" }}>
                      {summarise.notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  ) : <div className="empty-note">No notes yet</div>}
                </div>
                <div className="hover-row" style={{ background: "rgba(108,140,255,0.05)", border: "1px solid rgba(108,140,255,0.15)", borderRadius: "10px", padding: "14px" }}>
                  <div className="type-section" style={{ color: "#6C8CFF", marginBottom: "7px" }}>Key insights extracted</div>
                  {summarise.insights && summarise.insights.length ? (
                    <ul style={{ fontSize: "11.5px", color: "#7C8494", display: "flex", flexDirection: "column", gap: "7px", fontFamily: "JetBrains Mono, monospace", listStyle: "disc", paddingLeft: "15px" }}>
                      {summarise.insights.map((ins, i) => (
                        <li key={i}>{ins.text} {ins.tag && <span style={{ display: "inline-block", marginLeft: "4px", padding: "0 4px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", fontSize: "8.5px" }}>{ins.tag}</span>}</li>
                      ))}
                    </ul>
                  ) : <div className="empty-note">No insights yet</div>}
                </div>
                <SignalBars {...(summarise.signal || { eyebrow: "Compression fidelity", variant: "blue" })} />
              </div>
            </section>

            {/* Critic Agent — data.agents.Critic.{stats, signal, checklist} */}
            <section className="panel agent-top-amber" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <AgentHeader name="Critic" />
              <div className="font-mono" style={{ fontSize: "11.5px", marginTop: "-4px", borderLeft: "2px solid rgba(232,168,85,0.25)", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "7px" }}>
                <StatRows stats={critic.stats} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <SignalBars {...(critic.signal || { eyebrow: "Current check", variant: "entailment" })} />
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "13px 15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="type-section" style={{ marginBottom: "1px" }}>Validation checklist</div>
                  {critic.checklist && critic.checklist.length ? critic.checklist.map((item, i) => <CheckRow key={i} item={item} />) : <div className="empty-note">No checks yet</div>}
                </div>
              </div>
            </section>

            {/* Writer Agent — data.agents.Writer.{stats, draftText, wordCount, signal} */}
            <section className="panel agent-top-violet" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <AgentHeader name="Writer" />
              <div className="font-mono" style={{ fontSize: "11.5px", marginTop: "-4px", borderLeft: "2px solid rgba(180,142,240,0.25)", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "7px" }}>
                <StatRows stats={writer.stats} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="type-section" style={{ color: "#B48EF0" }}>Current paragraph draft</div>
                <div className="custom-scrollbar" style={{ background: "#0E0F16", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px", fontSize: "12.5px", color: "#7C8494", fontFamily: "JetBrains Mono, monospace", lineHeight: "1.6", height: "140px", overflowY: "auto" }}>
                  {writer.draftText ? (
                    <>
                      <span>{writer.draftText}</span>
                      <span style={{ display: "inline-block", width: "7px", height: "14px", background: "#B48EF0", verticalAlign: "middle", marginLeft: "3px", animation: "cursorBlink 0.9s step-end infinite" }} />
                    </>
                  ) : <span className="empty-note">Draft will appear here</span>}
                </div>
                <SignalBars {...(writer.signal || { eyebrow: "Narrative coherence", variant: "purple" })} />
              </div>
            </section>
          </main>

          {/* Middle Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", height: "360px" }}>

            {/* Live Thought Stream — data.logs[] */}
            <section className="panel" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div style={{ padding: "18px 18px 11px", background: "rgba(10,10,30,0.85)", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="type-section" style={{ display: "flex", alignItems: "center", gap: "7px", color: "#ECEEF2" }}>
                    <svg style={{ width: "14px", height: "14px", color: "#6C8CFF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
                    Live thought stream
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "9.5px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494", background: "rgba(255,255,255,0.04)", padding: "4px 9px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="animate-soft-pulse" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4FD1C5" }} />
                    AUTO-SCROLL
                  </div>
                </div>
              </div>
              <div ref={streamRef} className="thought-stream-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", fontFamily: "JetBrains Mono, monospace", fontSize: "11.5px" }}
                onScroll={() => {
                  if (!streamRef.current) return;
                  const { scrollHeight, clientHeight, scrollTop } = streamRef.current;
                  setIsUserScrolling(scrollHeight - clientHeight - scrollTop > 10);
                }}
              >
                {data.logs.length ? data.logs.map((log, i) => {
                  const meta = AGENT_META[log.agentName] || AGENT_META.Search;
                  const isNew = i === data.logs.length - 1;
                  return (
                    <div key={log.id ?? i} className={isNew ? "log-entry-new" : "log-entry"} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "7px", borderRadius: "8px" }}>
                      <span style={{ color: "#565C6D", width: "58px", flexShrink: 0, fontSize: "10.5px", marginTop: "2px" }}>{log.timeStr}</span>
                      <span style={{ ...AGENT_STYLES[meta.key].badge, padding: "3px 7px", borderRadius: "6px", fontSize: "9px", textTransform: "uppercase", width: "72px", textAlign: "center", flexShrink: 0, fontWeight: "700", letterSpacing: "0.04em" }}>{log.agentName}</span>
                      <span style={{ color: "#C7CBD6", flex: 1, fontSize: "11.5px", lineHeight: "1.55" }}>{log.msg}</span>
                    </div>
                  );
                }) : <div className="empty-note">No activity yet</div>}
              </div>
            </section>

            {/* Synthesis Merge Visual — data.lanes, data.floatingTags, data.convergence */}
            <section className="panel" style={{ padding: 0, gridColumn: "span 2", position: "relative", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="type-section" style={{ position: "absolute", top: "20px", left: "20px", color: "#ECEEF2", zIndex: 20 }}>Synthesis merge visual</div>
              <div style={{ position: "absolute", top: "38px", left: "20px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494", zIndex: 20 }}>Real-time knowledge convergence</div>
              <div ref={canvasContainerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#0a0a1e", overflow: "hidden", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: "28px", top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "28px 0", zIndex: 10, pointerEvents: "none" }}>
                  {AGENT_NAMES.map((name) => {
                    const meta = AGENT_META[name];
                    const lane = data.lanes[name] || { sub: "", status: "" };
                    const reacting = activeLane === name;
                    const iconMap = { Search: "search", Summarise: "description", Critic: "verified_user", Writer: "edit_note" };
                    return (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "14px", transition: "transform 0.3s ease", transform: reacting ? "translateX(3px)" : "translateX(0)" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", border: `1px solid ${reacting ? meta.color : `rgba(${meta.rgb},0.25)`}`, background: `rgba(${meta.rgb},0.08)`, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color, transition: "border-color 0.3s ease, transform 0.3s ease", transform: reacting ? "scale(1.08)" : "scale(1)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{iconMap[name]}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "9.5px", fontWeight: "700", color: meta.color, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{name} Agent</div>
                          <div style={{ fontSize: "8.5px", color: "#7C8494", fontFamily: "JetBrains Mono, monospace" }}>{lane.sub} {lane.status && <span className="animate-soft-pulse" style={{ marginLeft: "4px", color: meta.color }}>{lane.status}</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, overflow: "hidden" }}>
                  {data.floatingTags.map((t, i) => {
                    const meta = AGENT_META[t.agent] || AGENT_META.Search;
                    return (
                      <div key={i} className="float-tag" style={{ position: "absolute", top: t.top, left: t.left, right: t.right, bottom: t.bottom, background: "rgba(14,15,22,0.85)", border: `1px solid rgba(${meta.rgb},0.3)`, padding: "6px 8px", borderRadius: "6px", fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#ECEEF2", animationDelay: t.delay || "0s" }}>
                        <span style={{ color: meta.color, fontWeight: "700", textTransform: "uppercase" }}>{t.label}</span>: {t.value}
                      </div>
                    );
                  })}
                </div>

                <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "9px", zIndex: 20, background: "rgba(10,10,30,0.75)", padding: "6px 15px 6px 9px", borderRadius: "9999px", border: "1px solid rgba(108,140,255,0.25)" }}>
                  <svg width="18" height="18" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(108,140,255,0.14)" strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#6C8CFF" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 8} strokeDashoffset={2 * Math.PI * 8 * (1 - (data.convergence || 0) / 100)} style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.6s ease" }} />
                  </svg>
                  <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#C7CBD6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Convergence <span key={data.convergence} className="pop-number" style={{ display: "inline-block", color: "#6C8CFF", fontWeight: 700 }}>{data.convergence}%</span>
                  </span>
                </div>
              </div>
            </section>

            {/* Key Metrics — data.metrics */}
            <section className="panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "18px", height: "100%" }}>
              <div className="type-section" style={{ color: "#ECEEF2", marginBottom: "4px" }}>Key metrics</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                {[
                  { icon: "description", label: "Sources", val: data.metrics.sources },
                  { icon: "lightbulb", label: "Insights", val: data.metrics.insights },
                  { icon: "verified", label: "Claims", val: data.metrics.claims },
                  { icon: "analytics", label: "Confidence", val: data.metrics.confidence },
                ].map((m, i) => (
                  <div key={m.label} className="hover-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: i < 3 ? "14px" : 0, paddingTop: i === 3 ? "3px" : 0, borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#7C8494" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{m.icon}</span>
                      <span style={{ fontSize: "11.5px", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
                    </div>
                    <span style={{ color: "#ECEEF2", fontFamily: "Sora, sans-serif", fontSize: "21px", fontWeight: "700" }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Diagnostics + Suggestions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "36px", marginTop: "20px", paddingTop: "36px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", fontWeight: "700", color: "#ECEEF2", padding: "0 4px", borderLeft: "2px solid #6C8CFF", paddingLeft: "14px" }}>Research diagnostics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>

              {/* Confidence Breakdown — data.confidenceBreakdown[] */}
              <section className="panel" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="type-heading" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "11px" }}>Confidence breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                  {data.confidenceBreakdown.length ? data.confidenceBreakdown.map((bar) => (
                    <div key={bar.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#7C8494", textTransform: "uppercase", marginBottom: "7px", fontFamily: "JetBrains Mono, monospace" }}>
                        <span>{bar.label}</span>
                        <span style={{ color: bar.color || "#6C8CFF", fontWeight: "700" }}>{bar.pct}%</span>
                      </div>
                      <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "9999px", overflow: "hidden" }}>
                        <div className="bar-fill" style={{ height: "100%", width: `${bar.pct}%`, background: bar.color || "#6C8CFF" }} />
                      </div>
                    </div>
                  )) : <div className="empty-note">No breakdown yet</div>}
                </div>
              </section>

              {/* Source Trust — data.sourceTrust */}
              <section className="panel" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="type-heading" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "11px" }}>Source trust distribution</div>
                <div>
                  <div style={{ display: "flex", height: "12px", borderRadius: "9999px", overflow: "hidden", marginBottom: "10px" }}>
                    <div style={{ background: "#4FD1C5", width: `${data.sourceTrust.high}%` }} />
                    <div style={{ background: "#E8A855", width: `${data.sourceTrust.med}%` }} />
                    <div style={{ background: "#E0685F", width: `${data.sourceTrust.low}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494" }}>
                    <span>High {data.sourceTrust.high}%</span><span>Med {data.sourceTrust.med}%</span><span>Low {data.sourceTrust.low}%</span>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
                  <div className="type-section" style={{ marginBottom: "2px" }}>Top trusted domains</div>
                  {data.sourceTrust.domains.length ? data.sourceTrust.domains.map((d) => (
                    <div key={d.name} className="hover-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", padding: "11px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#C7CBD6", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>{d.name}</span>
                      <span style={{ color: LEVEL_COLOR[d.tier] || "#4FD1C5", fontFamily: "JetBrains Mono, monospace", fontWeight: "700" }}>{d.score}</span>
                    </div>
                  )) : <div className="empty-note">No domains yet</div>}
                </div>
              </section>

              {/* Faithfulness — data.faithfulness */}
              <section className="panel" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="type-heading" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "11px" }}>Faithfulness analysis</div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ fontSize: "32px", fontFamily: "Sora, sans-serif", color: "#4FD1C5", fontWeight: "700" }}>{data.faithfulness.grounded}/{data.faithfulness.total}</div>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#7C8494", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}>Sentences<br />grounded</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
                  <div className="type-section" style={{ marginBottom: "1px" }}>Flagged statements</div>
                  {data.faithfulness.flagged.length ? data.faithfulness.flagged.map((f, i) => (
                    <SignalBars key={i} eyebrow={f.eyebrow} variant={f.variant} promptText={f.text} compact />
                  )) : <div className="empty-note">No flags yet</div>}
                </div>
              </section>

              {/* Contradiction Analysis — data.contradiction */}
              <section className="panel" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="type-heading" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "11px" }}>Contradiction analysis</div>
                {data.contradiction ? (
                  <>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div className="hover-row" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", padding: "14px" }}>
                        <div style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#4FD1C5", marginBottom: "7px", fontWeight: "700" }}>{data.contradiction.claimA.label} · trust {data.contradiction.claimA.trust}</div>
                        <div style={{ fontSize: "12.5px", color: "#C7CBD6", lineHeight: "1.55" }}>{data.contradiction.claimA.text}</div>
                        <div style={{ fontSize: "10px", color: "#7C8494", marginTop: "7px", fontFamily: "JetBrains Mono, monospace" }}>Source: {data.contradiction.claimA.source}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 10, margin: "-10px 0" }}>
                        <div style={{ background: "#0a0a1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "9999px", padding: "3px 11px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#E8A855", fontWeight: "700" }}>VS</div>
                      </div>
                      <div className="hover-row" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", padding: "14px" }}>
                        <div style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#B48EF0", marginBottom: "7px", fontWeight: "700" }}>{data.contradiction.claimB.label} · trust {data.contradiction.claimB.trust}</div>
                        <div style={{ fontSize: "12.5px", color: "#C7CBD6", lineHeight: "1.55" }}>{data.contradiction.claimB.text}</div>
                        <div style={{ fontSize: "10px", color: "#7C8494", marginTop: "7px", fontFamily: "JetBrains Mono, monospace" }}>Source: {data.contradiction.claimB.source}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "11.5px", color: "#4FD1C5", fontFamily: "JetBrains Mono, monospace", background: "rgba(79,209,197,0.08)", padding: "11px", borderRadius: "10px", border: "1px solid rgba(79,209,197,0.18)" }}>
                      {data.contradiction.resolution}
                    </div>
                  </>
                ) : <div className="empty-note">No contradictions detected yet</div>}
              </section>
            </div>
          </div>

          {/* Suggested Next Research — data.suggestions[] */}
          <div style={{ display: "flex", flexDirection: "column", gap: "22px", paddingTop: "12px", paddingBottom: "24px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", fontWeight: "700", color: "#ECEEF2", padding: "0 4px", borderLeft: "2px solid #6C8CFF", paddingLeft: "14px" }}>Suggested next research</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              {data.suggestions.length ? data.suggestions.map((card) => {
                const meta = AGENT_META[card.agent] || AGENT_META.Summarise;
                return (
                  <button
                    key={card.title}
                    className="panel card-press"
                    onMouseDown={() => setPressedCard(card.title)}
                    onMouseUp={() => setPressedCard(null)}
                    onMouseLeave={() => setPressedCard(null)}
                    style={{ padding: "22px", textAlign: "left", display: "flex", flexDirection: "column", gap: "14px", cursor: "pointer", borderColor: pressedCard === card.title ? meta.color : "rgba(255,255,255,0.08)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ padding: "10px", background: `${meta.color}14`, color: meta.color, borderRadius: "10px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{card.icon}</span>
                      </div>
                      <div style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#7C8494", background: "rgba(255,255,255,0.04)", padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.08)" }}>Est {card.est}</div>
                    </div>
                    <h3 style={{ fontSize: "15.5px", fontWeight: "600", color: "#ECEEF2", fontFamily: "Inter, sans-serif" }}>{card.title}</h3>
                    <div style={{ display: "flex", gap: "18px", marginTop: "auto", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", fontFamily: "JetBrains Mono, monospace", color: LEVEL_COLOR[card.diffLevel] || "#E8A855", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>signal_cellular_alt</span> {card.diff}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", fontFamily: "JetBrains Mono, monospace", color: LEVEL_COLOR[card.availLevel] || "#4FD1C5", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>library_books</span> {card.avail}
                      </div>
                    </div>
                  </button>
                );
              }) : <div className="empty-note">No suggestions yet</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}