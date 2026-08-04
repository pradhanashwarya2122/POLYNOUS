import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   DEBATE CHAMBER - matches the POLYNOUS design system exactly.
   ============================================================================ */

const C = {
  green: "#00ff0f", cyan: "#00ccff", crimson: "#ff2040", gold: "#ffd700",
  purple: "#a855f7", indigo: "#5878d4", amber: "#ffaa00",
};

const MOTIONS = [
  { title: "This house would mandate a four-day work week", for: "Trials across 61 firms show output held flat while attrition fell sharply.", against: "Trial firms self-selected, which likely inflates the productivity gain." },
  { title: "This house believes AI code needs mandatory human sign-off", for: "Unreviewed generated code has shipped verifiable flaws in three audits.", against: "Mandatory review does not scale to the volume teams already ship today." },
  { title: "This house would tax carbon at extraction, not consumption", for: "Upstream taxation closes leakage loopholes consumption taxes miss.", against: "Extraction taxes pass through to consumers with less transparency." },
];

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

function useInView(threshold = 0.15) {
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

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function ScrambleText({ text, style, duration = 550 }) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    let cancelled = false;
    const chars = text.split("");
    const frames = Math.max(8, Math.round(duration / 40));
    const lockAt = chars.map((_, i) => Math.floor((i / Math.max(chars.length, 1)) * frames * 0.65) + Math.floor(Math.random() * frames * 0.35));
    let frame = 0;
    const iv = setInterval(() => {
      if (cancelled) return;
      frame++;
      setDisplay(chars.map((ch, i) => (/[\s.,:/%\-"]/.test(ch) ? ch : frame >= lockAt[i] ? ch : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)])).join(""));
      if (frame >= frames + 3) { clearInterval(iv); setDisplay(text); }
    }, 40);
    return () => { cancelled = true; clearInterval(iv); };
  }, [text, duration]);
  return <span style={style}>{display}</span>;
}

function useFonts() {
  useEffect(() => {
    if (document.getElementById("polynous-fonts")) return;
    const l1 = document.createElement("link");
    l1.id = "polynous-fonts"; l1.rel = "stylesheet";
    l1.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l1);
    const l2 = document.createElement("link");
    l2.rel = "stylesheet";
    l2.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    document.head.appendChild(l2);
  }, []);
}

function GlobalStyle() {
  return (
    <style>{`
      @keyframes dcFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes dcPowerOn {
        0%{opacity:0; transform:translateY(46px) scale(.9); filter:brightness(.25) blur(10px);}
        45%{filter:brightness(1.35) blur(0px);}
        70%{transform:translateY(-4px) scale(1.008);}
        100%{opacity:1; transform:translateY(0) scale(1); filter:brightness(1) blur(0px);}
      }
      @keyframes dcSlideL { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
      @keyframes dcSlideR { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
      @keyframes dcRowIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes dcPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes dcSheen { 0%{left:-25%} 55%{left:110%} 100%{left:110%} }
      @keyframes dcGavel { 0%,100%{opacity:1} 50%{opacity:.55} }
      @keyframes dcChaseL { 0%{opacity:0; transform:translateX(10px)} 30%{opacity:1} 100%{opacity:0; transform:translateX(-14px)} }
      @keyframes dcChaseR { 0%{opacity:0; transform:translateX(-10px)} 30%{opacity:1} 100%{opacity:0; transform:translateX(14px)} }
      @keyframes dcKnotStrain { 0%,100%{transform:translateY(-50%) scale(1)} 50%{transform:translateY(-50%) scale(1.14)} }
      @keyframes dcRopeShimmer { 0%{background-position:0 0} 100%{background-position:40px 0} }
      .dc-reveal { opacity:0; transform:translateY(28px) scale(.995); transition:opacity 1.1s cubic-bezier(.16,1,.3,1),transform 1.1s cubic-bezier(.16,1,.3,1); will-change:opacity,transform; }
      .dc-reveal.visible { opacity:1; transform:translateY(0) scale(1); }
      .dc-card { position:relative; transition:transform .6s cubic-bezier(.16,1,.3,1), box-shadow .6s cubic-bezier(.16,1,.3,1); }
      .dc-card:hover { transform:translateY(-6px) scale(1.004); box-shadow:0 70px 130px rgba(0,0,0,.65), 0 0 60px rgba(255,32,64,0.07), 0 0 0 1px rgba(255,255,255,.04) !important; }
      .dc-btn { transition:all .28s cubic-bezier(.23,1,.32,1); }
      .dc-btn:hover { transform:translateY(-2px); }
      @media (max-width:900px) { .dc-grid { grid-template-columns:1fr !important; } }
      @media (prefers-reduced-motion: reduce) { .dc-root *{ animation-duration:.001ms !important; transition-duration:.001ms !important; } }
    `}</style>
  );
}

function TugOfWar({ forScore, againstScore, setForScore, setAgainstScore, flash, round, onManualShift, isDragging, setIsDragging }) {
  const trackRef = useRef(null);
  const [dragPct, setDragPct] = useState(null);

  const diff = forScore - againstScore;
  const computedPct = Math.max(10, Math.min(90, 50 + diff / 2.4));
  const knotPct = isDragging && dragPct !== null ? dragPct : computedPct;
  const leading = knotPct >= 50 ? "for" : "against";
  const leadColor = leading === "for" ? C.green : C.crimson;
  const margin = isDragging ? Math.abs(knotPct - 50) / 10 : Math.abs(diff / 10);

  const pctFromClientX = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const usableLeft = rect.left + rect.width * 0.08;
    const usableWidth = rect.width * 0.84;
    const raw = ((clientX - usableLeft) / usableWidth) * 100;
    return Math.max(6, Math.min(94, raw));
  }, []);

  const commitDrag = useCallback((finalPct) => {
    const sum = forScore + againstScore;
    const newDiff = (finalPct - 50) * 2.4;
    const nf = Math.max(30, Math.min(96, (sum + newDiff) / 2));
    const na = Math.max(30, Math.min(96, (sum - newDiff) / 2));
    setForScore(nf);
    setAgainstScore(na);
    onManualShift(nf >= na ? "for" : "against");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forScore, againstScore, setForScore, setAgainstScore, onManualShift]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragPct(pctFromClientX(e.clientX));
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => setDragPct(pctFromClientX(e.clientX));
    const handleUp = (e) => {
      const finalPct = pctFromClientX(e.clientX);
      setIsDragging(false);
      setDragPct(null);
      commitDrag(finalPct);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, pctFromClientX, commitDrag]);

  return (
    <div style={{ marginBottom: "26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: C.green, letterSpacing: "0.1em" }}>◀ FOR PULLING</span>
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "11.5px", color: "rgba(150,165,180,0.55)" }}>
          {isDragging ? <span style={{ color: C.gold }}>drag to shift the debate…</span> : <>margin <strong style={{ color: leadColor, fontFamily: "'JetBrains Mono',monospace" }}>{margin.toFixed(1)}</strong></>}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: C.crimson, letterSpacing: "0.1em" }}>AGAINST PULLING ▶</span>
      </div>

      <div ref={trackRef} style={{ position: "relative", height: "54px", borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isDragging ? C.gold + "55" : "rgba(255,255,255,0.06)"}`, overflow: "hidden", transition: "border-color .3s ease" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: `${Math.abs(knotPct - 50)}%`, transform: leading === "for" ? "translateX(-100%)" : "none", background: `linear-gradient(${leading === "for" ? "270deg" : "90deg"},${leadColor}22,transparent)`, transition: isDragging ? "none" : "width .9s cubic-bezier(.34,1.56,.64,1)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "1px", background: "rgba(255,255,255,0.18)" }} />
        <div style={{
          position: "absolute", top: "50%", left: "8%", right: "8%", height: "4px", transform: "translateY(-50%)",
          borderRadius: "3px",
          background: `repeating-linear-gradient(90deg, ${leadColor}55 0 6px, rgba(255,255,255,0.12) 6px 8px)`,
          backgroundSize: "40px 100%",
          animation: "dcRopeShimmer 1.1s linear infinite",
          boxShadow: `0 0 10px ${leadColor}30`,
        }} />
        {leading === "for" ? (
          <>
            <span style={{ position: "absolute", top: "50%", left: "34%", transform: "translateY(-50%)", color: C.green, fontFamily: "Material Symbols Outlined", fontSize: "14px", animation: "dcChaseL 1.1s ease-in-out infinite" }}>chevron_left</span>
            <span style={{ position: "absolute", top: "50%", left: "44%", transform: "translateY(-50%)", color: C.green, fontFamily: "Material Symbols Outlined", fontSize: "14px", animation: "dcChaseL 1.1s ease-in-out .2s infinite" }}>chevron_left</span>
          </>
        ) : (
          <>
            <span style={{ position: "absolute", top: "50%", right: "34%", transform: "translateY(-50%)", color: C.crimson, fontFamily: "Material Symbols Outlined", fontSize: "14px", animation: "dcChaseR 1.1s ease-in-out infinite" }}>chevron_right</span>
            <span style={{ position: "absolute", top: "50%", right: "44%", transform: "translateY(-50%)", color: C.crimson, fontFamily: "Material Symbols Outlined", fontSize: "14px", animation: "dcChaseR 1.1s ease-in-out .2s infinite" }}>chevron_right</span>
          </>
        )}
        <div style={{ position: "absolute", top: "50%", left: "8%", transform: "translate(-50%,-50%)", width: "30px", height: "30px", borderRadius: "9px", background: "rgba(0,255,15,0.1)", border: `1px solid ${C.green}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "16px", color: C.green }}>flag</span>
        </div>
        <div style={{ position: "absolute", top: "50%", right: "8%", transform: "translate(50%,-50%)", width: "30px", height: "30px", borderRadius: "9px", background: "rgba(255,32,64,0.1)", border: `1px solid ${C.crimson}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "16px", color: C.crimson }}>flag</span>
        </div>
        <div
          key={isDragging ? "dragging" : round}
          onPointerDown={handlePointerDown}
          style={{
            position: "absolute", top: "50%", left: `${knotPct}%`, transform: "translate(-50%,-50%)",
            width: isDragging ? "32px" : "26px", height: isDragging ? "32px" : "26px", borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${leadColor}ee, ${leadColor}99)`,
            border: `2px solid ${leadColor}`,
            boxShadow: isDragging ? `0 0 26px ${leadColor}b0, 0 0 0 7px ${leadColor}22` : `0 0 18px ${leadColor}80, 0 0 0 4px ${leadColor}18`,
            transition: isDragging ? "width .15s ease, height .15s ease, box-shadow .15s ease" : "left .9s cubic-bezier(.34,1.56,.64,1), width .2s ease, height .2s ease",
            animation: flash && !isDragging ? "dcKnotStrain .35s ease-in-out" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isDragging ? "grabbing" : "grab", touchAction: "none", zIndex: 3,
          }}>
          <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "13px", color: "#000" }}>{isDragging ? "drag_indicator" : "bolt"}</span>
          {isDragging && (
            <span style={{ position: "absolute", bottom: "130%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "3px 8px", borderRadius: "9999px", background: "rgba(3,3,13,0.95)", border: `1px solid ${leadColor}70`, fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: leadColor, fontWeight: 700 }}>
              {Math.round(knotPct)}% {leading === "for" ? "FOR" : "AGAINST"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DebateChamberSection() {
  useFonts();
  const ref = useReveal(0.08);
  const { ref: wrapRef, inView, epoch } = useInView(0.15);
  const [motionIdx, setMotionIdx] = useState(0);
  const [forScore, setForScore] = useState(75);
  const [againstScore, setAgainstScore] = useState(55);
  const [round, setRound] = useState(0);
  const [flash, setFlash] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const motion = MOTIONS[motionIdx];

  const advance = useCallback(() => {
    const side = Math.random() > 0.5 ? "for" : "against";
    setFlash(side);
    setTimeout(() => setFlash(null), 900);
    setTranscript(t => [...t.slice(-2), { side, line: side === "for" ? motion.for : motion.against, id: Date.now() + Math.random() }]);
    if (side === "for") setForScore(s => Math.max(40, Math.min(95, s + (Math.random() * 16 - 6))));
    else setAgainstScore(s => Math.max(30, Math.min(90, s + (Math.random() * 16 - 6))));
    setRound(r => r + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

  useEffect(() => {
    const iv = setInterval(() => { if (inView && !isDragging) advance(); }, 2600);
    return () => clearInterval(iv);
  }, [inView, isDragging, advance]);

  const onManualShift = useCallback((side) => {
    setFlash(side);
    setTimeout(() => setFlash(null), 900);
    setTranscript(t => [...t.slice(-2), { side, line: side === "for" ? "You pulled the rope toward FOR, and the panel recalculates from here." : "You pulled the rope toward AGAINST, and the panel recalculates from here.", id: Date.now() + Math.random() }]);
    setRound(r => r + 1);
  }, []);

  const newMotion = () => {
    setMotionIdx(i => (i + 1) % MOTIONS.length);
    setForScore(75); setAgainstScore(55); setRound(0); setTranscript([]);
  };

  const leading = forScore >= againstScore ? "FOR" : "AGAINST";
  const leadColor = leading === "FOR" ? C.green : C.crimson;

  return (
    <section className="dc-root" style={{ padding: "80px 0" }}>
      <GlobalStyle />
      <div ref={ref} className="dc-reveal">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.55fr", gap: "48px", alignItems: "end", marginBottom: "40px" }} className="dc-grid">
          <div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: C.crimson, letterSpacing: "0.2em", marginBottom: "16px", opacity: 0.8 }}>↓ Debate Chamber</p>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 900, fontSize: "clamp(2.2rem,4.8vw,3.9rem)", lineHeight: 0.95, letterSpacing: "-0.055em", color: "#fff", margin: 0 }}>
              Two sides.<br />One rubric-scored verdict.
            </h2>
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "16px", color: "rgba(130,148,168,0.82)", lineHeight: 1.7, margin: 0, paddingBottom: "4px" }}>
            FOR and AGAINST build evidence-backed cases; a Judge scores each 1 to 10 and delivers a ruling with reasoning.
          </p>
        </div>

        <div key={epoch} ref={wrapRef} className="chamber-card-premium dc-card" style={{
          borderRadius: "28px", padding: "2px", animation: "dcPowerOn .9s cubic-bezier(.16,1,.3,1) both",
          background: "linear-gradient(135deg,rgba(255,32,64,0.3),rgba(0,255,15,0.14),rgba(255,215,0,0.1),rgba(255,32,64,0.06))",
          boxShadow: "0 52px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.025)",
        }}>
          <div style={{ borderRadius: "27px", overflow: "hidden", background: "rgba(3,3,13,0.98)", backdropFilter: "blur(28px)", position: "relative" }}>
            <div key={round} style={{ position: "absolute", top: 0, bottom: 0, left: "-25%", width: "25%", background: "linear-gradient(100deg,transparent,rgba(255,32,64,0.06),transparent)", animation: "dcSheen 2.6s ease-in-out", pointerEvents: "none", zIndex: 5 }} />

            <div style={{ padding: "22px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", background: "linear-gradient(90deg,rgba(255,32,64,0.04),rgba(255,215,0,0.02),transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg,rgba(255,32,64,0.12),rgba(255,215,0,0.08))", border: "1px solid rgba(255,32,64,0.22)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", boxShadow: "0 0 20px rgba(255,32,64,0.1)" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 120%,rgba(255,32,64,0.25),transparent 65%)", pointerEvents: "none" }} />
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "22px", color: C.crimson, position: "relative", zIndex: 1 }}>forum</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "15px", color: "#fff", margin: 0 }}>Debate Chamber</p>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: "rgba(130,148,168,0.55)", margin: "4px 0 0", letterSpacing: "0.08em" }}>
                    POST /debate-visual · SSE · ROUND {String(round).padStart(2, "0")}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={advance} className="dc-btn" style={{ padding: "10px 18px", borderRadius: "9999px", border: `1px solid ${C.gold}45`, background: "rgba(255,215,0,0.07)", color: C.gold, fontFamily: "'Sora',sans-serif", fontSize: "12.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", letterSpacing: "0.02em" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(255,215,0,0.18)"; e.currentTarget.style.boxShadow = `0 0 24px rgba(255,215,0,0.18)`; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(255,215,0,0.07)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "15px" }}>skip_next</span> Next round
                </button>
                <button onClick={() => window.location.href = "/debate"} className="dc-btn" style={{ padding: "10px 22px", borderRadius: "9999px", border: `1px solid ${C.crimson}45`, background: "rgba(255,32,64,0.07)", color: C.crimson, fontFamily: "'Sora',sans-serif", fontSize: "12.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", letterSpacing: "0.02em" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(255,32,64,0.18)"; e.currentTarget.style.boxShadow = `0 0 24px rgba(255,32,64,0.18)`; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(255,32,64,0.07)"; e.currentTarget.style.boxShadow = "none"; }}>
                  Launch Debate <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "15px" }}>arrow_outward</span>
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 32px", background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", color: "rgba(180,200,220,0.65)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: C.gold }}>●</span> “{motion.title}”
              </p>
              <button onClick={newMotion} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", cursor: "pointer", flexShrink: 0, letterSpacing: "0.04em", transition: "color .2s" }}
                onMouseOver={e => e.currentTarget.style.color = C.gold} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
                ↻ new motion
              </button>
            </div>

            <div style={{ padding: "32px", position: "relative", zIndex: 1 }}>
              <TugOfWar
                forScore={forScore}
                againstScore={againstScore}
                setForScore={setForScore}
                setAgainstScore={setAgainstScore}
                flash={flash}
                round={round}
                onManualShift={onManualShift}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "22px" }} className="dc-grid">
                <div style={{ borderRadius: "16px", padding: "18px 20px", background: flash === "for" ? "rgba(0,255,15,0.09)" : "rgba(0,255,15,0.04)", border: `1px solid ${C.green}${flash === "for" ? "70" : "28"}`, boxShadow: flash === "for" ? `0 0 30px ${C.green}30` : "none", transition: "all .5s cubic-bezier(.23,1,.32,1)", animation: "dcRowIn .5s cubic-bezier(.23,1,.32,1) .05s both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: C.green, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}>FOR {flash === "for" && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: "dcPulse .5s ease-in-out infinite" }} />}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: C.green, fontWeight: 600 }}>{(forScore / 10).toFixed(1)} / 10</span>
                  </div>
                  <div style={{ height: "7px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ width: `${forScore}%`, height: "100%", borderRadius: "4px", background: `linear-gradient(90deg,${C.green}aa,${C.green})`, boxShadow: `0 0 8px ${C.green}55`, transition: "width 1.1s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                  <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(150,165,180,0.6)", margin: "10px 0 0", lineHeight: 1.5 }}>Constructs supporting arguments with cited evidence.</p>
                </div>
                <div style={{ borderRadius: "16px", padding: "18px 20px", background: flash === "against" ? "rgba(255,32,64,0.09)" : "rgba(255,32,64,0.04)", border: `1px solid ${C.crimson}${flash === "against" ? "70" : "28"}`, boxShadow: flash === "against" ? `0 0 30px ${C.crimson}30` : "none", transition: "all .5s cubic-bezier(.23,1,.32,1)", animation: "dcRowIn .5s cubic-bezier(.23,1,.32,1) .12s both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: C.crimson, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px" }}>AGAINST {flash === "against" && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.crimson, boxShadow: `0 0 6px ${C.crimson}`, animation: "dcPulse .5s ease-in-out infinite" }} />}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: C.crimson, fontWeight: 600 }}>{(againstScore / 10).toFixed(1)} / 10</span>
                  </div>
                  <div style={{ height: "7px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ width: `${againstScore}%`, height: "100%", borderRadius: "4px", background: `linear-gradient(90deg,${C.crimson}aa,${C.crimson})`, boxShadow: `0 0 8px ${C.crimson}55`, transition: "width 1.1s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                  <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(150,165,180,0.6)", margin: "10px 0 0", lineHeight: 1.5 }}>Constructs opposing arguments with counter-evidence.</p>
                </div>
              </div>

              <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "14px 18px", marginBottom: "22px", minHeight: "88px" }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: "rgba(150,165,180,0.5)", letterSpacing: "0.1em", margin: "0 0 10px" }}>LIVE TRANSCRIPT</p>
                {transcript.length === 0 && <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12.5px", color: "rgba(150,165,180,0.4)", margin: 0 }}>Waiting for opening arguments…</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {transcript.map(t => (
                    <p key={t.id} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12.5px", color: "rgba(210,220,235,0.8)", margin: 0, lineHeight: 1.5, animation: t.side === "for" ? "dcSlideL .4s ease both" : "dcSlideR .4s ease both" }}>
                      <strong style={{ color: t.side === "for" ? C.green : C.crimson, fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", marginRight: "6px" }}>{t.side.toUpperCase()}</strong>
                      {t.line}
                    </p>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderRadius: "14px", background: "rgba(255,215,0,0.04)", border: `1px solid ${C.gold}28`, marginBottom: "22px" }}>
                <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "20px", color: C.gold, animation: "dcGavel 2.4s ease-in-out infinite" }}>gavel</span>
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12.5px", color: "rgba(210,220,235,0.75)", margin: 0, lineHeight: 1.55 }}>
                  The Judge scores each side on a structured rubric. Currently leaning <strong style={{ color: leadColor }}>{leading}</strong> by {Math.abs((forScore - againstScore) / 10).toFixed(1)} points.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {[{ icon: "speed", label: "Depth: Concise/Detailed" }, { icon: "gavel", label: "Judge's Lens" }, { icon: "forum", label: "Cross-Examine" }, { icon: "data_object", label: "Full JSON Export" }].map(c => (
                  <span key={c.label} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px", borderRadius: "9999px", border: `1px solid ${C.crimson}28`, background: "rgba(255,32,64,0.05)", fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: C.crimson, letterSpacing: "0.04em" }}>
                    <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "11px" }}>{c.icon}</span>{c.label}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: "18px 32px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 0, background: "rgba(2,2,11,0.65)", position: "relative", zIndex: 1 }}>
              {[{ label: "Agents in pipeline", val: "3", color: C.crimson }, { label: "Judge rubric", val: "1-10", color: C.gold }, { label: "Currently leading", val: leading, color: leadColor }].map((stat, i) => (
                <div key={stat.label} style={{ display: "flex", alignItems: "baseline", gap: "10px", flex: 1, paddingLeft: i === 0 ? 0 : "32px", borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.045)" }}>
                  <ScrambleText text={stat.val} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "16px", fontWeight: 600, color: stat.color, letterSpacing: "-0.01em" }} />
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", color: "rgba(170,185,205,0.62)" }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
