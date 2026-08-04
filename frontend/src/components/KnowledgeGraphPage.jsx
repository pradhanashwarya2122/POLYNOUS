import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from '../config';

// ─── TOKEN HELPER ──────────────────────────────────────────
function getToken() {
  if (typeof window !== 'undefined') {
    if (window.__POLYNOUS_ACCESS_TOKEN__) return window.__POLYNOUS_ACCESS_TOKEN__;
    return localStorage.getItem('polynous_token') || '';
  }
  return '';
}

// ─── COLOR TOKENS ────────────────────────────────────────────
const C = {
  green: "#00FF9F",
  cyan: "#00BFFF",
  crimson: "#FF2D78",
  purple: "#A855F7",
  gold: "#FFB547",
  orange: "#FF8A3D",
  void: "#080818",
  surface: "rgba(12,12,30,0.72)",
  surfaceContainer: "rgba(18,18,42,0.82)",
  onSurface: "#F3F0FF",
  onSurfaceVariant: "#B6B0D2",
  textSecondary: "#8078A3",
  white10: "rgba(255,255,255,0.08)",
  white5: "rgba(255,255,255,0.04)",
  fontHead: "'Space Grotesk', sans-serif",
};

const NODE_COLORS = {
  claim:       { fill: "#00FF9F", glow: "#00FF9F", ring: "#80FFD0", text: "#CCFFE8" },
  evidence:    { fill: "#4499FF", glow: "#4499FF", ring: "#99CCFF", text: "#CCE5FF" },
  argument:    { fill: "#FF2D78", glow: "#FF2D78", ring: "#FF80B0", text: "#FFCCE0" },
  topic:       { fill: "#FF8800", glow: "#FF8800", ring: "#FFAA60", text: "#FFDDC0" },
  debate_topic:{ fill: "#FF2D78", glow: "#FF2D78", ring: "#FF80B0", text: "#FFCCE0" },
  concept:     { fill: "#CC44FF", glow: "#CC44FF", ring: "#E099FF", text: "#F2CCFF" },
  entity:      { fill: "#00FFCC", glow: "#00FFCC", ring: "#80FFE8", text: "#CCFFF5" },
  major:       { fill: "#00FF9F", glow: "#00FF9F", ring: "#80FFD0", text: "#CCFFE8" },
  debate:      { fill: "#FF2D78", glow: "#FF2D78", ring: "#FF80B0", text: "#FFCCE0" },
  core:        { fill: "#CC00FF", glow: "#CC00FF", ring: "#E080FF", text: "#F5CCFF" },
  default:     { fill: "#4488FF", glow: "#4488FF", ring: "#99BBFF", text: "#CCE0FF" },
};

const EDGE_LABELS = {
  SUPPORTED_BY: "supports", COUNTERED_BY: "counters", RELATED_TO: "related",
  CO_OCCURS: "co-occurs", ABOUT: "about", CITES: "cites",
};

const EDGE_TYPE_COLORS = {
  SUPPORTED_BY: "#00FF9F",
  COUNTERED_BY: "#FF2D78",
  RELATED_TO:   "#CC44FF",
  CO_OCCURS:    "#00BFFF",
  ABOUT:        "#FFB000",
  CITES:        "#DD88FF",
};

function hexToRgb(hex) {
  if (!hex || hex[0] !== "#") return [88, 120, 212];
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ─── BIG BANG INTRO ──────────────────────────────────────────
function BigBangIntro({ onComplete, offsetLeft = 0 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [buttonPulse, setButtonPulse] = useState(0);

  useEffect(() => {
    if (phase !== "idle") return;
    let f = 0;
    const tick = () => {
      f++;
      setButtonPulse(Math.sin(f * 0.045) * 0.5 + 0.5);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  const handleStart = () => {
    setPhase("charging");
    cancelAnimationFrame(animRef.current);
    setTimeout(() => {
      setPhase("bang");
      startTimeRef.current = performance.now();
      runBang();
    }, 400);
  };

  const runBang = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    const PARTICLE_COUNT = 280;
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 120 + Math.random() * 380;
      const size = Math.random() * 3.5 + 0.6;
      const colors = ["#A855F7","#C084FC","#7C3AED","#E879F9","#6366F1","#818CF8","#00FF9F","#4499FF","#FF2D78","#FFFFFF"];
      return {
        angle, speed, size, delay: Math.random() * 0.18,
        color: colors[Math.floor(Math.random() * colors.length)],
        drift: (Math.random() - 0.5) * 0.8,
        fadeStart: 0.45 + Math.random() * 0.35,
        trail: [],
      };
    });

    const rings = [
      { delay: 0, color: "#A855F7", maxR: Math.max(W, H) * 0.8 },
      { delay: 0.08, color: "#7C3AED", maxR: Math.max(W, H) * 0.65 },
      { delay: 0.18, color: "#C084FC", maxR: Math.max(W, H) * 0.5 },
    ];

    const TOTAL_MS = 2200;

    const loop = (now) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / TOTAL_MS);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080818";
      ctx.fillRect(0, 0, W, H);

      if (t < 0.12) {
        const charge = t / 0.12;
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 * charge);
        gr.addColorStop(0, `rgba(255,255,255,${charge})`);
        gr.addColorStop(0.3, `rgba(168,85,247,${charge * 0.8})`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      }

      if (t < 0.07) {
        const flash = 1 - t / 0.07;
        ctx.fillStyle = `rgba(255,255,255,${flash * 0.92})`;
        ctx.fillRect(0, 0, W, H);
      }

      rings.forEach(ring => {
        const rt = Math.max(0, (t - ring.delay) / (1 - ring.delay));
        if (rt <= 0) return;
        const ease = easeOut(rt);
        const r = ring.maxR * ease;
        const alpha = (1 - ease) * 0.75;
        const lineWidth = (1 - ease) * 3.5 + 0.5;
        const [rr, rg, rb] = hexToRgb(ring.color);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        if (alpha > 0.1) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
          ctx.lineWidth = lineWidth * 0.4;
          ctx.stroke();
        }
      });

      particles.forEach(p => {
        const pt = Math.max(0, (t - p.delay) / (1 - p.delay));
        if (pt <= 0) return;
        const ease = easeOut(Math.min(1, pt * 1.4));
        const dist = p.speed * ease;
        const driftAngle = p.angle + p.drift * ease;
        const x = cx + Math.cos(driftAngle) * dist;
        const y = cy + Math.sin(driftAngle) * dist;
        const fadeT = Math.max(0, (pt - p.fadeStart) / (1 - p.fadeStart));
        const alpha = Math.max(0, 1 - fadeT * 1.2);
        const trailLen = 6;
        for (let ti = 0; ti < trailLen; ti++) {
          const trailFrac = 1 - ti / trailLen;
          const trailDist = dist * (1 - 0.04 * (ti + 1));
          const tx = cx + Math.cos(driftAngle) * trailDist;
          const ty = cy + Math.sin(driftAngle) * trailDist;
          const [rr, rg, rb] = hexToRgb(p.color);
          ctx.beginPath();
          ctx.arc(tx, ty, p.size * trailFrac * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rr},${rg},${rb},${alpha * trailFrac * 0.4})`;
          ctx.fill();
        }
        const [rr, rg, rb] = hexToRgb(p.color);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rr},${rg},${rb},${alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, p.size * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
        ctx.fill();
      });

      if (t > 0.35) {
        const starT = (t - 0.35) / 0.65;
        const STARS = 160;
        for (let i = 0; i < STARS; i++) {
          const sx = ((i * 137.508) % W);
          const sy = ((i * 211.37) % H);
          const sr = 0.4 + (i % 5) * 0.18;
          const alpha = Math.min(1, starT * 1.8) * (0.1 + (i % 3) * 0.12);
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
        }
      }

      if (t > 0.78) {
        const fadeOut = (t - 0.78) / 0.22;
        ctx.fillStyle = `rgba(8,8,24,${easeInOut(fadeOut)})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        onComplete();
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const pulseScale = 1 + buttonPulse * 0.04;
  const pulseGlow = `0 0 ${24 + buttonPulse * 24}px rgba(168,85,247,${0.45 + buttonPulse * 0.35}),
                     0 0 ${60 + buttonPulse * 40}px rgba(124,58,237,${0.18 + buttonPulse * 0.14}),
                     0 0 ${120 + buttonPulse * 60}px rgba(124,58,237,${0.06})`;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, left: offsetLeft, zIndex: 9999,
      background: "#080818",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        display: phase === "bang" ? "block" : "none",
      }} />
      {phase !== "bang" && <IdleStars charging={phase === "charging"} />}

      {(phase === "idle" || phase === "charging") && (
        <div style={{
          position: "relative", zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
          userSelect: "none",
        }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11, fontWeight: 500,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(168,85,247,0.55)",
            marginBottom: 22,
          }}>
            POLYNOUS · Neural Intelligence
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(64px, 10vw, 120px)",
            fontWeight: 400,
            letterSpacing: "0.06em",
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1,
            textShadow: "0 0 60px rgba(168,85,247,0.35), 0 0 120px rgba(124,58,237,0.15)",
            textAlign: "center",
          }}>
            KNOWLEDGE GRAPH
          </h1>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: "rgba(255,255,255,0.28)",
            letterSpacing: "0.05em",
            marginTop: 16,
            marginBottom: 56,
          }}>
            Explore the neural topology of your research
          </div>
          <button
            onClick={handleStart}
            disabled={phase === "charging"}
            style={{
              position: "relative",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26,
              letterSpacing: "0.22em",
              color: phase === "charging" ? "rgba(255,255,255,0.5)" : "#FFFFFF",
              background: phase === "charging"
                ? "rgba(124,58,237,0.35)"
                : "rgba(124,58,237,0.18)",
              border: `1px solid rgba(168,85,247,${phase === "charging" ? 0.8 : 0.45})`,
              borderRadius: 3,
              padding: "16px 64px",
              cursor: phase === "charging" ? "default" : "pointer",
              outline: "none",
              transform: phase === "charging" ? "scale(0.96)" : `scale(${pulseScale})`,
              transition: "transform 0.1s ease, background 0.2s ease, border-color 0.2s ease",
              boxShadow: phase === "charging"
                ? `0 0 40px rgba(168,85,247,0.9), 0 0 80px rgba(124,58,237,0.5), 0 0 160px rgba(124,58,237,0.25)`
                : pulseGlow,
            }}
          >
            <div style={{
              position: "absolute",
              bottom: 0, left: "15%", right: "15%",
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(168,85,247,${0.5 + buttonPulse * 0.5}), transparent)`,
            }} />
            {phase === "charging" ? "INITIALISING…" : "START"}
          </button>
          {phase === "idle" && (
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.14)",
              marginTop: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}>
              Click to expand the universe
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IdleStars({ charging }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const STARS = Array.from({ length: 200 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      opacity: Math.random() * 0.4 + 0.05,
      twinkle: Math.random() * Math.PI * 2,
    }));
    const PARTICLES = Array.from({ length: 22 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.4,
      opacity: Math.random() * 0.12 + 0.04,
    }));

    let frame = 0;
    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080818";
      ctx.fillRect(0, 0, W, H);

      const NEBULAS = [
        { cx: 0.15, cy: 0.2, r: 380, color: "90,40,200" },
        { cx: 0.82, cy: 0.18, r: 320, color: "25,110,210" },
        { cx: 0.88, cy: 0.82, r: 350, color: "100,30,185" },
        { cx: 0.3, cy: 0.85, r: 280, color: "170,35,130" },
      ];
      NEBULAS.forEach(n => {
        const nx = n.cx * W, ny = n.cy * H;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
        const intensity = charging ? 0.12 : 0.05;
        g.addColorStop(0, `rgba(${n.color},${intensity})`);
        g.addColorStop(1, `rgba(${n.color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      STARS.forEach(s => {
        const twink = 0.5 + 0.5 * Math.sin(s.twinkle + frame * 0.009);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.opacity * twink})`;
        ctx.fill();
      });

      PARTICLES.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,75,227,${p.opacity})`; ctx.fill();
        for (let j = i + 1; j < PARTICLES.length; j++) {
          const d = Math.hypot(p.x - PARTICLES[j].x, p.y - PARTICLES[j].y);
          if (d < 80) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(PARTICLES[j].x, PARTICLES[j].y);
            ctx.strokeStyle = `rgba(148,75,227,${0.012 * (1 - d/80)})`;
            ctx.lineWidth = 0.15; ctx.stroke();
          }
        }
      });

      const sg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, charging ? 180 : 80);
      const sIntensity = charging ? 0.55 : 0.12;
      sg.addColorStop(0, `rgba(168,85,247,${sIntensity})`);
      sg.addColorStop(0.4, `rgba(124,58,237,${sIntensity * 0.4})`);
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [charging]);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

// ─── SVG ICON SYSTEM ─────────────────────────────────────────
function Ico({ name, size = 14, color = "currentColor", style: extStyle }) {
  const icons = {
    research:    <path d="M11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6.293.293 1.414 1.414-1.414-1.414zM16 17l3 3" strokeWidth="2" strokeLinecap="round"/>,
    debate:      <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    graph:       <><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h10M17 6l-10 5M17 18 7 13"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></>,
    database:    <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/></>,
    pdf:         <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h3"/></>,
    analytics:   <><path d="M3 3v18h18"/><path d="m7 16 4-4 4 4 4-8"/></>,
    settings:    <><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></>,
    add:         <path d="M12 5v14M5 12h14" strokeLinecap="round"/>,
    face:        <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
    logout:      <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    chevron_l:   <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>,
    chevron_r:   <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>,
    chevron_d:   <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>,
    chevron_u:   <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>,
    close:       <><path d="M18 6 6 18" strokeLinecap="round"/><path d="M6 6l12 12" strokeLinecap="round"/></>,
    play:        <polygon points="5 3 19 12 5 21 5 3"/>,
    pause:       <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    reset:       <path d="M1 4v6h6M3.51 15a9 9 0 1 0 .49-4.5" strokeLinecap="round"/>,
    download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    video:       <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
    path_finder: <><circle cx="12" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><path d="M12 7v3l-5 7M12 7v3l5 7"/></>,
    orphan:      <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
    centrality:  <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" fill="none"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></>,
    cmd:         <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></>,
    view2d:      <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    view3d:      <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></>,
    rich:        <><circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20M2 12h20"/></>,
    basic:       <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    link:        <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    focus:       <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></>,
    node_claim:  <><circle cx="12" cy="12" r="5"/><path d="M9 12l2 2 4-4"/></>,
    node_ev:     <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    node_arg:    <><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/></>,
    export_hint: <><polyline points="20 6 9 17 4 12"/></>,
    minimap:     <><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="5" height="5" opacity="0.5"/><rect x="13" y="13" width="4" height="4" opacity="0.5"/></>,
    center:      <><circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"
      style={{ display: "inline-block", flexShrink: 0, ...(extStyle || {}) }}>
      {icons[name] || <circle cx="12" cy="12" r="8"/>}
    </svg>
  );
}

// ─── BFS PATHFINDING ─────────────────────────────────────────
function bfsPath(nodes, edges, fromLabel, toLabel) {
  const fromNode = nodes.find(n => n.label?.toLowerCase() === fromLabel.toLowerCase() || n.id === fromLabel);
  const toNode   = nodes.find(n => n.label?.toLowerCase() === toLabel.toLowerCase()   || n.id === toLabel);
  if (!fromNode || !toNode) return null;
  if (fromNode.id === toNode.id) return { nodeIds: [fromNode.id], edgeIds: [], steps: [{ node: fromNode.label, edge: null }] };
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach((e, idx) => {
    if (adj[e.source]) adj[e.source].push({ neighbor: e.target, edgeIdx: idx });
    if (adj[e.target]) adj[e.target].push({ neighbor: e.source, edgeIdx: idx });
  });
  const visited = new Set([fromNode.id]);
  const queue = [{ id: fromNode.id, path: [fromNode.id], edgePath: [] }];
  while (queue.length) {
    const { id, path, edgePath } = queue.shift();
    for (const { neighbor, edgeIdx } of (adj[id] || [])) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      const newPath = [...path, neighbor];
      const newEdgePath = [...edgePath, edgeIdx];
      if (neighbor === toNode.id) {
        const steps = newPath.map((nid, i) => {
          const n = nodes.find(x => x.id === nid);
          const e = i > 0 ? edges[newEdgePath[i - 1]] : null;
          return { node: n?.label || nid, edge: e ? (EDGE_LABELS[e.type] || e.type || "→") : null };
        });
        return { nodeIds: new Set(newPath), edgeIds: new Set(newEdgePath), steps };
      }
      queue.push({ id: neighbor, path: newPath, edgePath: newEdgePath });
    }
  }
  return null;
}

// ─── FORCE SIMULATION ────────────────────────────────────────
function runForceSimulation(nodes, edges, width, height, iterations = 100, savedPositions = null) {
  const saved = savedPositions || {};
  const simNodes = nodes.map(n => {
    const sv = saved[n.id];
    return {
      ...n,
      x: sv ? sv.x : width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: sv ? sv.y : height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0, vy: 0,
      size: Math.min(28, Math.max(10, n.size || 16)),
      fixed: sv?.fixed || false
    };
  });
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < simNodes.length; i++) {
      if (simNodes[i].fixed) continue;
      for (let j = i + 1; j < simNodes.length; j++) {
        if (simNodes[j].fixed) continue;
        const dx = simNodes[i].x - simNodes[j].x, dy = simNodes[i].y - simNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1500 / (dist * dist);
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        simNodes[i].vx += fx; simNodes[i].vy += fy;
        simNodes[j].vx -= fx; simNodes[j].vy -= fy;
      }
    }
    edges.forEach(edge => {
      const src = simNodes.find(n => n.id === edge.source);
      const tgt = simNodes.find(n => n.id === edge.target);
      if (!src || !tgt) return;
      const dx = tgt.x - src.x, dy = tgt.y - src.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * 0.003 * (edge.weight || 1);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      if (!src.fixed) { src.vx += fx; src.vy += fy; }
      if (!tgt.fixed) { tgt.vx -= fx; tgt.vy -= fy; }
    });
    simNodes.forEach(n => {
      if (n.fixed) return;
      n.vx += (width / 2 - n.x) * 0.001; n.vy += (height / 2 - n.y) * 0.001;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.size, Math.min(width - n.size, n.x));
      n.y = Math.max(n.size, Math.min(height - n.size, n.y));
    });
  }
  return simNodes;
}

function computeCentrality(nodes, edges) {
  const deg = {};
  nodes.forEach(n => { deg[n.id] = 0; });
  edges.forEach(e => {
    if (deg[e.source] !== undefined) deg[e.source]++;
    if (deg[e.target] !== undefined) deg[e.target]++;
  });
  return deg;
}

// ─── LIVELY PURPLE NEURAL BACKGROUND ─────────────────────────
// Replaces the old bland NeuralCanvas with aurora waves + plasma orbs + constellations
function NeuralCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const W = () => canvas.width;
    const H = () => canvas.height;

    // Stars
    const STARS = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      opacity: Math.random() * 0.6 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.004 + Math.random() * 0.008,
    }));

    // Plasma orbs - big drifting color blobs
    const ORBS = Array.from({ length: 7 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 200 + Math.random() * 300,
      speed: 0.00008 + Math.random() * 0.00012,
      phase: (i / 7) * Math.PI * 2,
      orbitR: 0.12 + Math.random() * 0.18,
      orbitCx: 0.3 + Math.random() * 0.4,
      orbitCy: 0.3 + Math.random() * 0.4,
      color: [
        "120,40,255",   // deep violet
        "168,85,247",   // purple
        "90,20,200",    // indigo-purple
        "200,60,255",   // magenta-purple
        "80,0,180",     // dark violet
        "140,100,255",  // lavender
        "220,80,255",   // bright magenta
      ][i % 7],
      intensity: 0.06 + Math.random() * 0.09,
    }));

    // Aurora wave bands
    const AURORA_BANDS = Array.from({ length: 4 }, (_, i) => ({
      yBase: 0.15 + i * 0.22,
      amplitude: 0.04 + Math.random() * 0.06,
      frequency: 0.8 + Math.random() * 1.2,
      speed: 0.0006 + Math.random() * 0.0008,
      phase: Math.random() * Math.PI * 2,
      color: ["120,40,255","168,85,247","100,0,220","190,70,255"][i],
      opacity: 0.04 + Math.random() * 0.06,
      thickness: 60 + Math.random() * 100,
    }));

    // Constellation particles
    const CONSTELLATIONS = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      size: Math.random() * 1.8 + 0.5,
      opacity: Math.random() * 0.18 + 0.06,
      hue: 260 + Math.random() * 60, // purple hue range
    }));

    // Spinning hex rings
    const HEX_RINGS = Array.from({ length: 3 }, (_, i) => ({
      cx: 0.5,
      cy: 0.5,
      r: 80 + i * 120,
      speed: (0.0003 + i * 0.0001) * (i % 2 === 0 ? 1 : -1),
      phase: (i / 3) * Math.PI * 2,
      opacity: 0.03 - i * 0.007,
      sides: 6 + i * 2,
    }));

    let frame = 0;

    const drawPolygon = (ctx, cx, cy, r, sides, rotation) => {
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotation;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const loop = (timestamp) => {
      frame++;
      const w = W(), h = H();

      // Deep purple void base
      ctx.fillStyle = "#06040f";
      ctx.fillRect(0, 0, w, h);

      // - PLASMA ORBS (big soft blobs that drift) - 
      ORBS.forEach(orb => {
        orb.phase += orb.speed;
        const ox = (orb.orbitCx + Math.cos(orb.phase) * orb.orbitR) * w;
        const oy = (orb.orbitCy + Math.sin(orb.phase * 0.7) * orb.orbitR) * h;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
        g.addColorStop(0, `rgba(${orb.color},${orb.intensity})`);
        g.addColorStop(0.4, `rgba(${orb.color},${orb.intensity * 0.5})`);
        g.addColorStop(1, `rgba(${orb.color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });

      // - AURORA BANDS (horizontal sine wave curtains) - 
      AURORA_BANDS.forEach(band => {
        band.phase += band.speed;
        const segCount = Math.ceil(w / 8);
        for (let s = 0; s < segCount; s++) {
          const x = (s / segCount) * w;
          const yWave = (band.yBase + Math.sin(x / w * band.frequency * Math.PI * 2 + band.phase) * band.amplitude) * h;
          const g = ctx.createLinearGradient(x, yWave - band.thickness / 2, x, yWave + band.thickness / 2);
          g.addColorStop(0, `rgba(${band.color},0)`);
          g.addColorStop(0.5, `rgba(${band.color},${band.opacity})`);
          g.addColorStop(1, `rgba(${band.color},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x, yWave - band.thickness / 2, w / segCount + 1, band.thickness);
        }
      });

      // - GEOMETRIC SPINNING RINGS (subtle sacred geometry feel) - 
      HEX_RINGS.forEach(ring => {
        ring.phase += ring.speed;
        const cx = ring.cx * w, cy = ring.cy * h;
        drawPolygon(ctx, cx, cy, ring.r, ring.sides, ring.phase);
        ctx.strokeStyle = `rgba(168,85,247,${ring.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Inner ring slightly offset
        drawPolygon(ctx, cx, cy, ring.r * 0.88, ring.sides, ring.phase + Math.PI / ring.sides);
        ctx.strokeStyle = `rgba(200,100,255,${ring.opacity * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // - STARS (twinkling) - 
      STARS.forEach(s => {
        const twink = 0.45 + 0.55 * Math.sin(s.twinkle + frame * s.twinkleSpeed);
        const alpha = s.opacity * twink;
        // Cross sparkle for brighter stars
        if (s.opacity > 0.5) {
          ctx.beginPath();
          ctx.moveTo(s.x * w - s.r * 3, s.y * h);
          ctx.lineTo(s.x * w + s.r * 3, s.y * h);
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.x * w, s.y * h - s.r * 3);
          ctx.lineTo(s.x * w, s.y * h + s.r * 3);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      // - CONSTELLATION PARTICLES + LINKS - 
      CONSTELLATIONS.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glow.addColorStop(0, `hsla(${p.hue},80%,70%,${p.opacity})`);
        glow.addColorStop(1, `hsla(${p.hue},80%,70%,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,80%,${p.opacity * 2})`;
        ctx.fill();

        // Connect nearby
        for (let j = i + 1; j < CONSTELLATIONS.length; j++) {
          const d = Math.hypot(p.x - CONSTELLATIONS[j].x, p.y - CONSTELLATIONS[j].y);
          if (d < 150) {
            const alpha = (1 - d / 150) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(CONSTELLATIONS[j].x, CONSTELLATIONS[j].y);
            ctx.strokeStyle = `rgba(168,85,247,${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      });

      // - CENTRAL RADIANT PULSE (purple heartbeat from centre) - 
      const pulseT = (Math.sin(frame * 0.012) * 0.5 + 0.5);
      const pulseR = 80 + pulseT * 60;
      const pulseAlpha = 0.06 + pulseT * 0.08;
      const pulse = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, pulseR);
      pulse.addColorStop(0, `rgba(168,85,247,${pulseAlpha})`);
      pulse.addColorStop(0.5, `rgba(124,58,237,${pulseAlpha * 0.4})`);
      pulse.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pulse;
      ctx.fillRect(0, 0, w, h);

      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 60 + pulseT * 40, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(168,85,247,${pulseAlpha * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // - TOP VIGNETTE (keep UI readable) - 
      const vigTop = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      vigTop.addColorStop(0, "rgba(6,4,15,0.55)");
      vigTop.addColorStop(1, "rgba(6,4,15,0)");
      ctx.fillStyle = vigTop;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed", top: 0, left: 0,
        width: "100%", height: "100%",
        zIndex: 0, pointerEvents: "none",
      }}
    />
  );
}

function MetricRow({ label, value, color = C.purple }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 10, color: C.textSecondary, fontFamily: "'Space Grotesk',sans-serif" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Space Grotesk',monospace" }}>{value}</span>
    </div>
  );
}

// ─── GRAPH HEADER ─────────────────────────────────────────────
function GraphHeader({ nodeCount, edgeCount }) {
  return (
    <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 15, pointerEvents: "none" }}>
      <div style={{ background: "linear-gradient(180deg, rgba(8,8,28,0.75), rgba(8,8,24,0.60))", backdropFilter: "blur(20px)", border: "1px solid rgba(168,85,247,0.10)", borderRadius: 16, padding: "18px 52px 16px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, fontWeight: 700, fontStyle: "italic", letterSpacing: "0.03em", textTransform: "uppercase", color: "#FFFFFF", margin: 0, lineHeight: 0.9, textShadow: "0 0 8px rgba(168,85,247,0.35), 0 0 20px rgba(168,85,247,0.12)" }}>KNOWLEDGE GRAPH</h1>
        <div style={{ marginTop: 8, display: "flex", gap: 14, alignItems: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)" }}>
          <span>{nodeCount} Nodes</span>
          <span style={{ color: "rgba(168,85,247,0.35)" }}>•</span>
          <span>{edgeCount} Edges</span>
        </div>
      </div>
    </div>
  );
}

// ─── COMMAND PALETTE ─────────────────────────────────────────
function CommandPalette({ nodes, onClose, onSelectNode, onAction, filter, setFilter, useRichGraph, setUseRichGraph, loadGraph, setShowPathfinder, setCentralityMode }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const ACTIONS = [
    { label: "Toggle Rich Graph",       icon: "rich",       action: () => { setUseRichGraph(r => { const next = !r; loadGraph(next); return next; }); onClose(); } },
    { label: "Open Pathfinder",         icon: "path_finder",action: () => { setShowPathfinder(true); onClose(); } },
    { label: "Toggle Centrality View",  icon: "centrality", action: () => { setCentralityMode(m => !m); onClose(); } },
    { label: "Filter: All",             icon: "search",     action: () => { setFilter("all"); onClose(); } },
    { label: "Filter: Claims",          icon: "node_claim", action: () => { setFilter("claim"); onClose(); } },
    { label: "Filter: Evidence",        icon: "node_ev",    action: () => { setFilter("evidence"); onClose(); } },
    { label: "Filter: Arguments",       icon: "node_arg",   action: () => { setFilter("argument"); onClose(); } },
    { label: "Filter: Topics",          icon: "node_claim", action: () => { setFilter("topic"); onClose(); } },
    { label: "Filter: Concepts",        icon: "node_claim", action: () => { setFilter("concept"); onClose(); } },
    { label: "Filter: Entities",        icon: "node_claim", action: () => { setFilter("entity"); onClose(); } },
    { label: "Reset Layout",            icon: "reset",      action: () => { onAction("resetLayout"); onClose(); } },
    { label: "Export PNG",              icon: "download",   action: () => { onAction("exportPNG"); onClose(); } },
    { label: "Export Timeline (WebM)",  icon: "video",      action: () => { onAction("exportGIF"); onClose(); } },
    { label: "Clear Saved Positions",   icon: "close",      action: () => { onAction("clearPositions"); onClose(); } },
  ];
  const q = query.toLowerCase();
  const matchedActions = ACTIONS.filter(a => !q || a.label.toLowerCase().includes(q));
  const matchedNodes = q ? nodes.filter(n => n.label?.toLowerCase().includes(q)).slice(0, 8) : [];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ width: 560, background: "rgba(8,6,20,0.98)", border: "1px solid rgba(168,85,247,0.22)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Ico name="cmd" size={16} color={C.purple} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search nodes or actions…"
            onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && matchedNodes[0]) { onSelectNode(matchedNodes[0]); onClose(); } }}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "'Space Grotesk',sans-serif" }} />
          <kbd style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 6px" }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {matchedNodes.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 16px 6px" }}>Nodes</div>
              {matchedNodes.map((n, i) => {
                const col = NODE_COLORS[n.type] || NODE_COLORS.default;
                return (
                  <div key={i} onClick={() => { onSelectNode(n); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.fill, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>{n.label}</span>
                    <span style={{ fontSize: 9, color: col.text, textTransform: "uppercase" }}>{n.type?.replace("_", " ")}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ padding: "8px 0", borderTop: matchedNodes.length ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 16px 6px" }}>Actions</div>
            {matchedActions.map((a, i) => (
              <div key={i} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Ico name={a.icon} size={13} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontFamily: "'Space Grotesk',sans-serif" }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PATHFINDER (WITH AUTHENTICATED API CALL) ──────────────────
function Pathfinder({ positions, graphData, onClose, onPathFound }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const find = async () => {
    setSearching(true);
    setResult(null);
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const params = new URLSearchParams({ entity1: from, entity2: to });
      const res = await fetch(`${API_BASE_URL}/knowledge/connections?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const apiPath = data?.paths?.[0];
        if (apiPath?.length) {
          const nodeIds = new Set(apiPath);
          const steps = apiPath.map((id, i) => {
            const node = positions.find(n => n.id === id);
            return { node: node?.label || id, edge: i > 0 ? '→' : null };
          });
          const pathResult = { nodeIds, steps };
          setResult(pathResult);
          if (onPathFound) onPathFound(pathResult);
          setSearching(false);
          return;
        }
      }
    } catch (e) { /* fallback to BFS */ }

    // Local BFS as fallback
    const localPath = bfsPath(graphData.nodes, graphData.edges || [], from, to);
    setResult(localPath);
    if (onPathFound) onPathFound(localPath);
    setSearching(false);
  };

  const clearPath = () => { setResult(null); onPathFound(null); };

  return (
    <div style={{ position: "absolute", top: 200, left: 14, zIndex: 30, width: 280 }}>
      <div style={{ background: "rgba(8,6,20,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(70,179,255,0.18)", borderRadius: 12, padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Ico name="path_finder" size={13} color={C.cyan} />
            <span style={{ fontSize: 11, color: C.cyan, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Path Finder</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4 }}>
            <Ico name="close" size={13} color="#fff" />
          </button>
        </div>
        {[["From", from, setFrom], ["To", to, setTo]].map(([label, val, setter]) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk',sans-serif", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
            <input value={val} onChange={e => setter(e.target.value)} placeholder="Node name or ID…" onKeyDown={e => e.key === "Enter" && find()}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(70,179,255,0.14)", borderRadius: 7, padding: "7px 10px", color: "#fff", fontSize: 11, fontFamily: "'Space Grotesk',sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={find} style={{ flex: 1, padding: "8px", borderRadius: 7, background: `${C.cyan}16`, color: C.cyan, fontWeight: 600, cursor: "pointer", fontSize: 11, fontFamily: "'Space Grotesk',sans-serif", border: `1px solid ${C.cyan}30` }}>
            {searching ? "Searching…" : "Find Path"}
          </button>
          {result && <button onClick={clearPath} style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, border: "1px solid rgba(255,255,255,0.06)" }}><Ico name="close" size={11} color="rgba(255,255,255,0.4)" /></button>}
        </div>
        {result?.steps && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", marginBottom: 8 }}>Path - {result.steps.length} hops</div>
            {result.steps.map((step, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 6, background: "rgba(70,179,255,0.05)", border: "1px solid rgba(70,179,255,0.1)", marginBottom: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.cyan }} />
                  <span style={{ fontSize: 10, color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>{step.node}</span>
                </div>
                {step.edge && <div style={{ fontSize: 9, color: C.cyan, fontFamily: "'Space Grotesk',sans-serif", fontStyle: "italic", paddingLeft: 18, marginBottom: 2 }}> -  {step.edge} - </div>}
              </div>
            ))}
          </div>
        )}
        {result && !result.steps && <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,100,100,0.7)", fontFamily: "'Space Grotesk',sans-serif" }}>No path found.</div>}
      </div>
    </div>
  );
}

// ─── HOVER POPUP ─────────────────────────────────────────────
function HoverPopup({ node, position, connections }) {
  const col = NODE_COLORS[node.type] || NODE_COLORS.default;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "absolute", left: position.x + 16, top: position.y - 20, zIndex: 100, pointerEvents: "none", transform: visible ? "scale(1)" : "scale(0.9)", opacity: visible ? 1 : 0, transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", transformOrigin: "top left" }}>
      <div style={{ width: 220, background: "rgba(8,6,20,0.95)", backdropFilter: "blur(20px)", border: `1px solid ${col.glow}28`, borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.fill }} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>{node.label}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, background: `${col.fill}18`, color: col.text, border: `1px solid ${col.fill}30`, borderRadius: 20, padding: "2px 8px", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase" }}>{node.type?.replace("_", " ")}</span>
          <span style={{ fontSize: 10, color: C.textSecondary }}>{connections} links</span>
        </div>
        {node.confidence > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: C.textSecondary }}>CONFIDENCE</span>
              <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>{node.confidence}%</span>
            </div>
            <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${node.confidence}%`, background: C.green }} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6, marginTop: 4 }}>Click for full details</div>
      </div>
    </div>
  );
}

// ─── NODE DETAIL PANEL ───────────────────────────────────────
function NodeDetailPanel({ node, details, research, onClose, onResearch, onFindPath, positions }) {
  const col = NODE_COLORS[node.type] || NODE_COLORS.default;
  const [slideIn, setSlideIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlideIn(true), 10); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", right: 20, top: "50%", transform: slideIn ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(110%)", transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)", zIndex: 200, width: 290 }}>
      <div style={{ background: "rgba(8,6,20,0.97)", backdropFilter: "blur(28px)", border: `1px solid ${col.glow}30`, borderRadius: 14, padding: "18px", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: `${col.fill}18`, border: `1px solid ${col.fill}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico name="graph" size={16} color={col.fill} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{details?.name || node.label}</div>
            <span style={{ fontSize: 10, background: `${col.fill}18`, color: col.text, border: `1px solid ${col.fill}35`, borderRadius: 20, padding: "2px 8px", textTransform: "uppercase" }}>{node.type?.replace("_", " ")}</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico name="close" size={12} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
        {details?.description && (
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "9px 11px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 9, color: C.textSecondary, marginBottom: 4, textTransform: "uppercase" }}>Description</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>{details.description}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => onResearch?.(node.label)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${C.purple}, #7c3aed)`, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>Research</button>
          <button onClick={() => onFindPath?.(node.label)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${C.cyan}35`, background: `${C.cyan}0c`, color: C.cyan, fontWeight: 700, cursor: "pointer", fontSize: 11 }}>Find Path</button>
        </div>
      </div>
    </div>
  );
}

// ─── MINI MAP ────────────────────────────────────────────────
function MiniMap({ positions, pan, zoom, canvasSize, onJump }) {
  const mmSize = 140;
  const allX = positions.map(n => n.x), allY = positions.map(n => n.y);
  const minX = Math.min(...allX, 0), maxX = Math.max(...allX, 1000);
  const minY = Math.min(...allY, 0), maxY = Math.max(...allY, 700);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const scale = Math.min(mmSize / rangeX, mmSize / rangeY) * 0.85;
  const toMM = (x, y) => ({ x: (x - minX) * scale + (mmSize - rangeX * scale) / 2, y: (y - minY) * scale + (mmSize - rangeY * scale) / 2 });
  const vpX = (-pan.x / zoom - minX) * scale + (mmSize - rangeX * scale) / 2;
  const vpY = (-pan.y / zoom - minY) * scale + (mmSize - rangeY * scale) / 2;
  const vpW = (canvasSize.w / zoom) * scale, vpH = (canvasSize.h / zoom) * scale;
  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    onJump({ x: -(mx / scale + minX) * zoom + canvasSize.w / 2, y: -(my / scale + minY) * zoom + canvasSize.h / 2 });
  }, [scale, minX, minY, zoom, canvasSize, onJump]);
  return (
    <div style={{ background: "rgba(8,6,20,0.9)", backdropFilter: "blur(12px)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.22)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 4 }}>
        <Ico name="minimap" size={9} color="rgba(255,255,255,0.3)" /> Overview
      </div>
      <svg width={mmSize} height={mmSize} onClick={handleClick} style={{ display: "block", cursor: "crosshair" }}>
        {positions.map(n => { const mm = toMM(n.x, n.y); const col = NODE_COLORS[n.type] || NODE_COLORS.default; return <circle key={n.id} cx={mm.x} cy={mm.y} r={2} fill={col.fill} opacity={0.65} />; })}
        <rect x={vpX} y={vpY} width={Math.max(10, vpW)} height={Math.max(10, vpH)} fill="rgba(168,85,247,0.06)" stroke={C.purple} strokeWidth={0.8} rx={2} />
      </svg>
    </div>
  );
}

// ─── CONTEXT MENU ────────────────────────────────────────────
function ContextMenu({ node, position, onClose, onResearch, onHighlight, onPathfind }) {
  const items = [
    { icon: "research", label: "Research This", action: () => { onResearch?.(node.label); onClose(); } },
    { icon: "path_finder", label: "Find Connections", action: () => { onPathfind?.(node); onClose(); } },
    { icon: "focus", label: "Focus Mode", action: () => { onHighlight?.(node); onClose(); } },
    { icon: "copy", label: "Copy Node Name", action: () => { navigator.clipboard?.writeText(node.label); onClose(); } },
  ];
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "absolute", left: position.x, top: position.y, zIndex: 300, pointerEvents: "all" }} onClick={e => e.stopPropagation()}>
      <div style={{ background: "rgba(8,6,20,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", transform: visible ? "scale(1)" : "scale(0.93)", opacity: visible ? 1 : 0, transition: "all 0.16s cubic-bezier(0.34,1.56,0.64,1)", minWidth: 172 }}>
        <div style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>{node.label?.slice(0, 22)}</div>
        {items.map((item, i) => (
          <div key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Ico name={item.icon} size={13} color="rgba(255,255,255,0.5)" /><span style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TIMELINE SLIDER (FIXED - no hardcoded 2025, no buggy playback) ──
// Now serves as a Graph Exploration bar: Growth animation + zoom level control
function TimelineSlider({ onExportGIF, exporting, growthStep, maxGrowthStep, growthPlaying, onGrowthPlay, onGrowthReset, growthSpeed, onSpeedChange, zoom, onZoomChange, onCenterGraph }) {
  const growthPct = maxGrowthStep > 0 ? (growthStep / maxGrowthStep) * 100 : 0;
  const progressLabel = maxGrowthStep > 0
    ? `${growthStep} / ${maxGrowthStep} nodes revealed`
    : "No data";

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
      background: "linear-gradient(180deg, rgba(6,4,18,0) 0%, rgba(6,4,18,0.95) 30%)",
      backdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(168,85,247,0.10)",
      display: "flex", alignItems: "center", gap: 0,
      height: 58, padding: "0 20px",
    }}>
      {/* - GRAPH GROWTH REVEAL - */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 20 }}>
        <span style={{ fontSize: 9, color: "rgba(168,85,247,0.6)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", letterSpacing: "0.10em", marginRight: 2 }}>Reveal</span>
        <button onClick={onGrowthPlay} style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Ico name={growthPlaying ? "pause" : "play"} size={11} color="#a855f7" />
        </button>
        <button onClick={onGrowthReset} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Ico name="reset" size={10} color="rgba(255,255,255,0.4)" />
        </button>
        {/* Progress track */}
        <div style={{ width: 110, position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", cursor: "pointer" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 2, width: `${growthPct}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7,#c084fc)" }} />
        </div>
        <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 9, color: "#a855f7", fontWeight: 700, minWidth: 60 }}>{growthStep}/{maxGrowthStep}</span>
        {/* Speed buttons */}
        {[0.5, 1, 2, 4].map(s => (
          <button key={s} onClick={() => onSpeedChange(s)} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 8, cursor: "pointer", background: growthSpeed === s ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${growthSpeed === s ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.06)"}`, color: growthSpeed === s ? "#c084fc" : "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk',sans-serif" }}>
            {s}x
          </button>
        ))}
      </div>

      {/* - ZOOM CONTROL - */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 20 }}>
        <span style={{ fontSize: 9, color: "rgba(168,85,247,0.6)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", letterSpacing: "0.10em" }}>Zoom</span>
        <button onClick={() => onZoomChange(Math.max(0.3, zoom - 0.1))} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1 }}>−</button>
        <div style={{ width: 80, position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 2, width: `${((zoom - 0.3) / 3.7) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
          <input
            type="range" min={0.3} max={4} step={0.05} value={zoom}
            onChange={e => onZoomChange(parseFloat(e.target.value))}
            style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", margin: 0, height: "100%" }}
          />
        </div>
        <button onClick={() => onZoomChange(Math.min(4, zoom + 0.1))} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1 }}>+</button>
        <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 9, color: "#a855f7", fontWeight: 700, minWidth: 34 }}>{Math.round(zoom * 100)}%</span>
      </div>

      {/* - CENTER GRAPH BUTTON - */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 20 }}>
        <button onClick={onCenterGraph} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.28)", color: "#c084fc", fontSize: 10, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", fontWeight: 600 }}>
          <Ico name="center" size={11} color="#c084fc" /> Center Graph
        </button>
      </div>

      {/* - EXPORT - */}
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        <button onClick={onExportGIF} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, background: exporting ? "rgba(255,200,0,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${exporting ? "rgba(255,200,0,0.35)" : "rgba(255,255,255,0.07)"}`, color: exporting ? "#e6c44a" : "rgba(255,255,255,0.35)", fontSize: 9, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer" }}>
          <Ico name="video" size={11} color={exporting ? "#e6c44a" : "rgba(255,255,255,0.3)"} />
          {exporting ? "Recording…" : "Record WebM"}
        </button>
      </div>
    </div>
  );
}

// ─── EDGE TYPE FILTER BAR ────────────────────────────────────
function EdgeTypeFilter({ activeEdgeTypes, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 340 }}>
      {Object.keys(EDGE_LABELS).map(type => {
        const active = activeEdgeTypes.has(type);
        const color = EDGE_TYPE_COLORS[type] || C.purple;
        return (
          <button key={type} onClick={() => onToggle(type)} style={{ background: active ? `${color}14` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? color + "38" : "rgba(255,255,255,0.06)"}`, borderRadius: 20, padding: "3px 10px", fontSize: 9, color: active ? color : "rgba(255,255,255,0.25)", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", textTransform: "capitalize", fontWeight: active ? 700 : 400 }}>
            {EDGE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function KnowledgeGraphPage({ user, onStartResearch, onNavigate, onLogout }) {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const edgeParticlesRef = useRef([]);
  const hoverTimerRef = useRef(null);
  const cameraTargetRef = useRef(null);

  // ── INTRO STATE ──────────────────────────────────────────
  const [introComplete, setIntroComplete] = useState(false);
  const [nodeAnimProgress, setNodeAnimProgress] = useState(0);
  const nodeAnimRef = useRef(null);
  const nodeAnimStartRef = useRef(null);
  const NODE_ANIM_DURATION = 1600;

  const [graphData, setGraphData]       = useState({ nodes: [], edges: [] });
  const [positions, setPositions]       = useState([]);
  const [finalPositions, setFinalPositions] = useState([]);
  const [hovered, setHovered]           = useState(null);
  const [hoveredLong, setHoveredLong]   = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDetails, setNodeDetails]   = useState(null);
  const [nodeResearch, setNodeResearch] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [useRichGraph, setUseRichGraph] = useState(true);
  const [dragging, setDragging]         = useState(null);
  const [dragOffset, setDragOffset]     = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(1);
  const [pan, setPan]                   = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning]       = useState(false);
  const [panStart, setPanStart]         = useState({ x: 0, y: 0 });
  const [showPathfinder, setShowPathfinder] = useState(false);
  const [contextMenu, setContextMenu]   = useState(null);
  const [highlightNode, setHighlightNode] = useState(null);
  const [growthStep, setGrowthStep]     = useState(0);
  const [growthPlaying, setGrowthPlaying] = useState(false);
  const [growthSpeed, setGrowthSpeed]   = useState(1);
  const growthAccumRef  = useRef(0);
  const shockwavesRef   = useRef([]);
  const nodeBornAtRef   = useRef({});
  const [hoverPopupPos, setHoverPopupPos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize]     = useState({ w: 1000, h: 700 });
  const [showExportHint, setShowExportHint] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pathResult, setPathResult]     = useState(null);
  const [activeEdgeTypes, setActiveEdgeTypes] = useState(new Set(Object.keys(EDGE_LABELS)));
  const [centrality, setCentrality]     = useState({});
  const [centralityMode, setCentralityMode] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [gifExporting, setGifExporting] = useState(false);
  const [focusMode, setFocusMode]       = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const panRef  = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── CENTER GRAPH on the centroid of all nodes ─────────────
  const centerGraph = useCallback((positionsToCenter = null, targetZoom = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pts = positionsToCenter || positions;
    if (!pts.length) return;
    const avgX = pts.reduce((s, n) => s + n.x, 0) / pts.length;
    const avgY = pts.reduce((s, n) => s + n.y, 0) / pts.length;
    const z = targetZoom || zoomRef.current;
    cameraTargetRef.current = {
      panX: -avgX * z + canvas.offsetWidth / 2,
      panY: -avgY * z + canvas.offsetHeight / 2,
      zoom: z,
      progress: 0,
    };
  }, [positions]);

  const loadGraph = useCallback(async (richMode = true) => {
    setLoading(true);
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const endpoint = richMode ? `${API_BASE_URL}/knowledge/rich-graph` : `${API_BASE_URL}/knowledge/graph`;
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes?.length > 0) { setGraphData(data); }
        else if (richMode) {
          await fetch(`${API_BASE_URL}/knowledge/seed-rich-demo`, {  
            method: "POST",
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
          const r2 = await fetch(endpoint, { headers });
          if (r2.ok) setGraphData(await r2.json());
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGraph(true); }, []);

  useEffect(() => {
    if (graphData.nodes?.length) setCentrality(computeCentrality(graphData.nodes, graphData.edges || []));
  }, [graphData]);

  useEffect(() => {
    if (!graphData.nodes?.length) return;
    let saved = {};
    try { const raw = localStorage.getItem("polynous_graph_positions"); if (raw) saved = JSON.parse(raw); } catch (e) {}
    const W = (canvasRef.current?.offsetWidth || 1000) * 1.5;
    const H = (canvasRef.current?.offsetHeight || 700) * 1.5;
    const simmed = runForceSimulation(graphData.nodes, graphData.edges || [], W, H, 100, saved);
    setFinalPositions(simmed);
    if (introComplete) {
      setPositions(simmed);
    }
    edgeParticlesRef.current = [];
  }, [graphData, introComplete]);

  // ── NODE BURST ANIMATION after intro ────────────────────
  useEffect(() => {
    if (!introComplete || !finalPositions.length) return;
    const canvas = canvasRef.current;
    const W = canvas?.offsetWidth || 1000;
    const H = canvas?.offsetHeight || 700;
    const cx = W / 2, cy = H / 2;

    setPositions(finalPositions.map(n => ({ ...n, x: cx, y: cy })));
    nodeAnimStartRef.current = performance.now();

    const animateNodes = (now) => {
      const elapsed = now - nodeAnimStartRef.current;
      const rawT = Math.min(1, elapsed / NODE_ANIM_DURATION);
      setNodeAnimProgress(rawT);

      setPositions(finalPositions.map((n, idx) => {
        const delay = (idx / finalPositions.length) * 0.35;
        const localT = Math.max(0, Math.min(1, (rawT - delay) / (1 - delay)));
        const eased = easeOutBack(Math.min(1, localT * 1.05));
        return { ...n, x: lerp(cx, n.x, eased), y: lerp(cy, n.y, eased) };
      }));

      if (rawT < 1) {
        nodeAnimRef.current = requestAnimationFrame(animateNodes);
      } else {
        setPositions(finalPositions);
        setNodeAnimProgress(1);
        // Auto-center on graph centroid after burst
        setTimeout(() => centerGraph(finalPositions, 1), 200);
      }
    };

    nodeAnimRef.current = requestAnimationFrame(animateNodes);
    return () => cancelAnimationFrame(nodeAnimRef.current);
  }, [introComplete, finalPositions]);

  useEffect(() => {
    if (!positions.length || dragging || nodeAnimProgress < 1) return;
    const toSave = {};
    positions.forEach(n => { toSave[n.id] = { x: n.x, y: n.y, fixed: n.fixed }; });
    try { localStorage.setItem("polynous_graph_positions", JSON.stringify(toSave)); } catch (e) {}
  }, [positions, dragging, nodeAnimProgress]);

  const growthOrderIds = (graphData.nodes || []).map(n => n.id);
  const maxGrowthStep  = growthOrderIds.length;
  const revealedNodeIds = growthPlaying || growthStep > 0
    ? new Set(growthOrderIds.slice(0, growthStep))
    : new Set(growthOrderIds);

  useEffect(() => {
    if (!growthPlaying) return;
    if (growthStep >= maxGrowthStep) { setGrowthPlaying(false); return; }
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = now - last; last = now;
      growthAccumRef.current += dt * growthSpeed;
      if (growthAccumRef.current >= 650) {
        growthAccumRef.current -= 650;
        setGrowthStep(s => Math.min(maxGrowthStep, s + 1));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [growthPlaying, growthSpeed, growthStep, maxGrowthStep]);

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowCommandPalette(p => !p); }
      if (e.key === "Escape") { setShowCommandPalette(false); setContextMenu(null); }
    });
  }, []);

  const fetchNodeDetails = useCallback(async (node) => {
    setSelectedNode(node); setFocusMode(true);
    const canvas = canvasRef.current;
    if (canvas && node) {
      const targetZoom = Math.min(2.2, Math.max(1.2, zoomRef.current));
      cameraTargetRef.current = { panX: -node.x * targetZoom + canvas.offsetWidth / 2, panY: -node.y * targetZoom + canvas.offsetHeight / 2, zoom: targetZoom, progress: 0 };
    }
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const cleanId = node.id?.replace(/^(claim_|evidence_|arg_|topic_|debate_)/, "") || node.label;
      const [detailRes] = await Promise.all([
        fetch(`${API_BASE_URL}/knowledge/node/${encodeURIComponent(cleanId)}`, { headers }),
      ]);
      if (detailRes.ok) setNodeDetails(await detailRes.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    clearTimeout(hoverTimerRef.current);
    if (hovered && !dragging) { hoverTimerRef.current = setTimeout(() => setHoveredLong(hovered), 500); }
    else { setHoveredLong(null); }
    return () => clearTimeout(hoverTimerRef.current);
  }, [hovered, dragging]);

  const navigateToNode = useCallback((node) => {
    const canvas = canvasRef.current;
    if (!canvas || !node) return;
    const pos = positions.find(p => p.id === node.id);
    if (!pos) return;
    const targetZoom = Math.min(2.2, Math.max(1.4, zoomRef.current));
    cameraTargetRef.current = { panX: -pos.x * targetZoom + canvas.offsetWidth / 2, panY: -pos.y * targetZoom + canvas.offsetHeight / 2, zoom: targetZoom, progress: 0 };
    fetchNodeDetails(pos);
  }, [positions, fetchNodeDetails]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter" && searchQuery) {
      const match = positions.find(n => n.label?.toLowerCase().includes(searchQuery.toLowerCase()));
      if (match) navigateToNode(match);
    }
  }, [searchQuery, positions, navigateToNode]);

  const getWorldPos = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const findNodeAt = useCallback((wx, wy) => {
    return positions.find(n => Math.hypot(n.x - wx, n.y - wy) < n.size + 12);
  }, [positions]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return;
    const { x: wx, y: wy } = getWorldPos(e);
    const found = findNodeAt(wx, wy);
    if (found) { setDragging(found.id); setDragOffset({ x: found.x - wx, y: found.y - wy }); canvasRef.current.style.cursor = "grabbing"; }
    else { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); canvasRef.current.style.cursor = "move"; }
    setContextMenu(null);
  }, [getWorldPos, findNodeAt, pan]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = getWorldPos(e);
    if (dragging) {
      setPositions(prev => prev.map(n => n.id === dragging ? { ...n, x: wx + dragOffset.x, y: wy + dragOffset.y, fixed: true } : n));
      cameraTargetRef.current = null;
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      cameraTargetRef.current = null;
    } else {
      const found = findNodeAt(wx, wy);
      setHovered(found || null);
      setHoverPopupPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      canvasRef.current.style.cursor = found ? "pointer" : "default";
    }
  }, [dragging, dragOffset, isPanning, panStart, getWorldPos, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    setDragging(null); setIsPanning(false);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  const handleClick = useCallback((e) => {
    if (dragging || isPanning) return;
    if (hovered) { fetchNodeDetails(hovered); setContextMenu(null); }
    else { setSelectedNode(null); setNodeDetails(null); setNodeResearch([]); setHighlightNode(null); setFocusMode(false); setPathResult(null); }
  }, [hovered, dragging, isPanning, fetchNodeDetails]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const { x: wx, y: wy } = getWorldPos(e);
    const found = findNodeAt(wx, wy);
    if (found) {
      const rect = canvasRef.current?.getBoundingClientRect();
      setContextMenu({ node: found, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
    }
  }, [getWorldPos, findNodeAt]);

  const handleWheel = useCallback((e) => {
    e.preventDefault(); cameraTargetRef.current = null;
    const newZoom = Math.max(0.3, Math.min(4, zoomRef.current - e.deltaY * 0.001));
    setZoom(newZoom);
  }, []);

  const toggleEdgeType = useCallback((type) => {
    setActiveEdgeTypes(prev => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  }, []);

  const clearPositions = useCallback(() => {
    try { localStorage.removeItem("polynous_graph_positions"); } catch (e) {}
    const W = (canvasRef.current?.offsetWidth || 1000) * 1.5;
    const H = (canvasRef.current?.offsetHeight || 700) * 1.5;
    const newPositions = runForceSimulation(graphData.nodes, graphData.edges || [], W, H, 100, null);
    setPositions(newPositions);
    setTimeout(() => centerGraph(newPositions, 1), 100);
  }, [graphData, centerGraph]);

  const filteredPositions = positions.filter(n => filter === "all" || n.type === filter);
  const filteredEdges = (graphData.edges || []).filter(e => {
    const sv = filter === "all" || positions.find(n => n.id === e.source)?.type === filter;
    const tv = filter === "all" || positions.find(n => n.id === e.target)?.type === filter;
    return (sv || tv) && (!e.type || activeEdgeTypes.has(e.type));
  });

  const hoveredConnections = hovered
    ? new Set(filteredEdges.filter(e => e.source === hovered.id || e.target === hovered.id).flatMap(e => [e.source, e.target]))
    : new Set();
  const hoveredConnCount = hoveredConnections.size > 0 ? hoveredConnections.size - 1 : 0;
  const focusNeighbors = focusMode && selectedNode
    ? new Set(filteredEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).flatMap(e => [e.source, e.target]))
    : null;

  const maxDeg = Math.max(1, ...Object.values(centrality));
  const activeFilterCount = filter === "all" ? positions.length : positions.filter(n => n.type === filter).length;

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !positions.length) return;
    const allX = positions.map(n => n.x), allY = positions.map(n => n.y);
    const minX = Math.min(...allX) - 80, minY = Math.min(...allY) - 80;
    const W = Math.max(...allX) + 80 - minX, H = Math.max(...allY) + 80 - minY;
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const octx = off.getContext("2d");
    octx.fillStyle = "#080818"; octx.fillRect(0, 0, W, H);
    octx.save(); octx.translate(-minX, -minY);
    filteredEdges.forEach(edge => {
      const src = positions.find(n => n.id === edge.source), tgt = positions.find(n => n.id === edge.target);
      if (!src || !tgt) return;
      octx.beginPath(); octx.moveTo(src.x, src.y); octx.lineTo(tgt.x, tgt.y);
      octx.strokeStyle = EDGE_TYPE_COLORS[edge.type] || "rgba(120,100,200,0.4)"; octx.lineWidth = 1; octx.globalAlpha = 0.4; octx.stroke(); octx.globalAlpha = 1;
    });
    positions.forEach(n => {
      const col = NODE_COLORS[n.type] || NODE_COLORS.default; const r = n.size || 16;
      const [fr, fg, fb] = hexToRgb(col.fill);
      const grad = octx.createRadialGradient(n.x - r*0.3, n.y - r*0.35, 0, n.x, n.y, r);
      grad.addColorStop(0, `rgba(${Math.min(255,fr+80)},${Math.min(255,fg+80)},${Math.min(255,fb+80)},1)`);
      grad.addColorStop(1, `rgba(${fr},${fg},${fb},0.85)`);
      octx.beginPath(); octx.arc(n.x, n.y, r, 0, Math.PI*2); octx.fillStyle = grad; octx.fill();
      octx.font = `500 10px 'Space Grotesk',sans-serif`; octx.textAlign = "center"; octx.fillStyle = "rgba(255,255,255,0.82)";
      octx.fillText(n.label?.length > 18 ? n.label.slice(0,17)+"…" : n.label || "", n.x, n.y + r + 14);
    });
    octx.restore();
    const link = document.createElement("a"); link.download = "polynous-graph.png"; link.href = off.toDataURL("image/png"); link.click();
    setShowExportHint(true); setTimeout(() => setShowExportHint(false), 2000);
  }, [positions, filteredEdges]);

  const exportGIF = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gifExporting) return;
    setGifExporting(true);
    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.download = "polynous-graph.webm"; link.href = url; link.click(); URL.revokeObjectURL(url);
      setGifExporting(false);
    };
    recorder.start();
    setTimeout(() => { recorder.stop(); }, 5000);
  }, [gifExporting]);

  const handlePaletteAction = useCallback((action) => {
    if (action === "exportPNG") exportPNG();
    if (action === "exportGIF") exportGIF();
    if (action === "resetLayout") clearPositions();
    if (action === "clearPositions") clearPositions();
  }, [exportPNG, exportGIF, clearPositions]);

  // ─── RENDER LOOP ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      setCanvasSize({ w: canvas.offsetWidth, h: canvas.offsetHeight });
    };
    resize(); window.addEventListener("resize", resize);

    if (filteredEdges.length && edgeParticlesRef.current.length === 0) {
      edgeParticlesRef.current = filteredEdges.flatMap(e => [
        { edge: e, t: Math.random(), speed: 0.0004 + Math.random() * 0.0006 * (e.weight || 1), size: 2 + Math.random() * 2 },
        { edge: e, t: (Math.random() + 0.5) % 1, speed: 0.0003 + Math.random() * 0.0005 * (e.weight || 1), size: 1.5 + Math.random() * 1.5 },
      ]);
    }

    const animate = () => {
      if (!positions.length) { animRef.current = requestAnimationFrame(animate); return; }

      const camTarget = cameraTargetRef.current;
      if (camTarget) {
        camTarget.progress = Math.min(1, camTarget.progress + 0.045);
        const t = easeOut(camTarget.progress);
        setPan({ x: lerp(panRef.current.x, camTarget.panX, t), y: lerp(panRef.current.y, camTarget.panY, t) });
        setZoom(lerp(zoomRef.current, camTarget.zoom, t));
        if (camTarget.progress >= 1) cameraTargetRef.current = null;
      }

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);
      const now = Date.now();

      // ─── EDGES ───────────────────────────────────────────
      filteredEdges.forEach((edge, edgeIdx) => {
        const src = positions.find(n => n.id === edge.source);
        const tgt = positions.find(n => n.id === edge.target);
        if (!src || !tgt) return;

        const isHovEdge  = hovered && (hovered.id === src.id || hovered.id === tgt.id);
        const isSelEdge  = selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);
        const isPathEdge = pathResult?.edgeIds?.has(edgeIdx);
        const edgeColor  = isPathEdge ? C.gold : (edge.color || (EDGE_TYPE_COLORS[edge.type] || "#6655AA"));
        const isFocusDimmed = focusNeighbors && !focusNeighbors.has(src.id) && !focusNeighbors.has(tgt.id);
        const [er, eg, eb] = hexToRgb(edgeColor);

        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
        if (isPathEdge) {
          ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.90;
        } else if (isHovEdge || isSelEdge) {
          ctx.strokeStyle = edgeColor; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.90;
        } else if (searchQuery || highlightNode || isFocusDimmed) {
          ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.06;
        } else {
          ctx.strokeStyle = edgeColor; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.42;
        }
        ctx.stroke(); ctx.globalAlpha = 1;

        if (isHovEdge || isSelEdge || isPathEdge) {
          for (let b = 0; b < 4; b++) {
            const phase = b / 4, speed = 0.0008 + (edge.weight || 1) * 0.000002;
            const progress = (now * speed + phase) % 1;
            const bx = src.x + (tgt.x - src.x) * progress, by = src.y + (tgt.y - src.y) * progress;
            const trailProg = Math.max(0, progress - 0.05);
            const tx2 = src.x + (tgt.x - src.x) * trailProg, ty2 = src.y + (tgt.y - src.y) * trailProg;
            const trailGrad = ctx.createLinearGradient(bx, by, tx2, ty2);
            trailGrad.addColorStop(0, `rgba(${er},${eg},${eb},0.9)`);
            trailGrad.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx2, ty2); ctx.strokeStyle = trailGrad; ctx.lineWidth = 2; ctx.stroke();
            const coreGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 4);
            coreGrad.addColorStop(0, "rgba(255,255,255,0.95)");
            coreGrad.addColorStop(0.3, `rgba(${er},${eg},${eb},0.85)`);
            coreGrad.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
            ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fillStyle = coreGrad; ctx.fill();
          }
          if (edge.type && zoomRef.current > 0.7) {
            const mx = (src.x + tgt.x) / 2, my = (src.y + tgt.y) / 2;
            const label = EDGE_LABELS[edge.type] || edge.type;
            ctx.save(); ctx.font = `500 ${Math.round(9 / zoomRef.current)}px 'Space Grotesk',sans-serif`; ctx.textAlign = "center";
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(8,6,20,0.85)"; ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(mx - tw/2 - 4, my - 8, tw + 8, 14, 3); else ctx.rect(mx - tw/2 - 4, my - 8, tw + 8, 14);
            ctx.fill(); ctx.fillStyle = edgeColor; ctx.fillText(label, mx, my + 3); ctx.restore();
          }
        }
      });

      // Ambient edge particles
      edgeParticlesRef.current.forEach(p => {
        const src = positions.find(n => n.id === p.edge.source);
        const tgt = positions.find(n => n.id === p.edge.target);
        if (!src || !tgt) return;
        p.t += p.speed; if (p.t > 1) p.t = 0;
        const x = src.x + (tgt.x - src.x) * p.t, y = src.y + (tgt.y - src.y) * p.t;
        const [r, g, b] = hexToRgb(p.edge.color || C.purple);
        ctx.beginPath(); ctx.arc(x, y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.65)`; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, p.size * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
      });

      // Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(s => Date.now() - s.born < 900);
      shockwavesRef.current.forEach(s => {
        const age = Date.now() - s.born, progress = age / 900;
        const r = 6 + progress * 60, alpha = (1 - progress) * 0.5;
        const [sr, sg, sb] = hexToRgb(s.color);
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sr},${sg},${sb},${alpha})`; ctx.lineWidth = 2 * (1 - progress); ctx.stroke();
      });

      // ─── NODES ───────────────────────────────────────────
      positions.forEach(n => {
        const visible = filter === "all" || n.type === filter;
        const matchSearch = !searchQuery || n.label?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!visible) {
          ctx.globalAlpha = 0.05;
          ctx.beginPath(); ctx.arc(n.x, n.y, (n.size || 16) * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill();
          ctx.globalAlpha = 1; return;
        }

        if ((growthPlaying || growthStep > 0) && !revealedNodeIds.has(n.id)) return;

        const isHov = hovered?.id === n.id, isSel = selectedNode?.id === n.id;
        const isConnected = hoveredConnections.has(n.id);
        const isPathNode = pathResult?.nodeIds?.has(n.id);
        const isFocusDimmed = focusNeighbors && !focusNeighbors.has(n.id) && !isSel;
        const isDimmed = (searchQuery && !matchSearch) || (highlightNode && !isConnected && n.id !== highlightNode?.id) || isFocusDimmed;
        const pulse = Math.sin(now * 0.002 + (n.id?.charCodeAt(0) || 0) * 0.7) * 0.8;

        let baseSize = n.size || 16;
        if (centralityMode && centrality[n.id] !== undefined) baseSize = 10 + (centrality[n.id] / maxDeg) * 28;
        let r = (baseSize + pulse);
        if (isHov) r *= 1.18; if (isSel) r = baseSize + pulse + 4;

        const col = NODE_COLORS[n.type] || NODE_COLORS.default;
        const nodeCol = isPathNode && !isSel ? { ...col, fill: C.gold, glow: C.gold } : col;

        ctx.globalAlpha = isDimmed ? 0.04 : isConnected && !isHov && !isSel ? 0.55 : 1;

        if (!isDimmed && (isHov || isSel || isPathNode)) {
          const auraR = r + (isSel ? 14 : 10);
          const aura = ctx.createRadialGradient(n.x, n.y, r * 0.4, n.x, n.y, auraR);
          const [gr, gg, gb] = hexToRgb(nodeCol.glow);
          aura.addColorStop(0, `rgba(${gr},${gg},${gb},${isSel ? 0.35 : 0.25})`);
          aura.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(n.x, n.y, auraR, 0, Math.PI * 2); ctx.fillStyle = aura; ctx.fill();
        }

        if (isSel) {
          const [gr, gg, gb] = hexToRgb(nodeCol.glow);
          const ringR = r + 12 + Math.sin(now * 0.004) * 4;
          ctx.beginPath(); ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${gr},${gg},${gb},${0.30 + Math.sin(now * 0.004) * 0.12})`; ctx.lineWidth = 1.2; ctx.stroke();
        }

        const grad = ctx.createRadialGradient(n.x - r * 0.28, n.y - r * 0.32, 0, n.x, n.y, r);
        const [fr, fg, fb] = hexToRgb(nodeCol.fill);
        const boost = isHov ? 80 : isSel ? 65 : 30;
        grad.addColorStop(0, `rgba(${Math.min(255, fr + boost + 100)},${Math.min(255, fg + boost + 100)},${Math.min(255, fb + boost + 100)},1)`);
        grad.addColorStop(0.45, `rgba(${Math.min(255, fr + boost)},${Math.min(255, fg + boost)},${Math.min(255, fb + boost)},1)`);
        grad.addColorStop(1, `rgba(${Math.max(0, fr - 20)},${Math.max(0, fg - 20)},${Math.max(0, fb - 20)},0.95)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();

        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? "rgba(255,255,255,0.92)" : isHov ? "rgba(255,255,255,0.75)" : isConnected ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = isSel ? 2 : isHov ? 1.6 : 0.8; ctx.stroke();
        ctx.globalAlpha = 1;

        const labelText = (n.label?.length > 20 ? n.label.slice(0, 19) + "…" : n.label) || "";
        const fontSize = zoomRef.current < 0.6 ? 9 : 11;
        ctx.font = `${isHov || isSel ? 600 : 500} ${fontSize}px 'Space Grotesk',sans-serif`;
        ctx.textAlign = "center";
        ctx.globalAlpha = isDimmed ? 0 : 0.45;
        ctx.fillStyle = "rgba(0,0,0,0.95)"; ctx.fillText(labelText, n.x + 0.5, n.y + r + 7.5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = isDimmed ? "rgba(255,255,255,0.10)" : (isHov || isSel) ? "#ffffff" : "rgba(255,255,255,0.82)";
        ctx.fillText(labelText, n.x, n.y + r + 7);
      });

      if (focusMode && selectedNode && focusNeighbors) {
        const focusNode = positions.find(p => p.id === selectedNode.id);
        if (focusNode) {
          const sx = focusNode.x * zoomRef.current + panRef.current.x;
          const sy = focusNode.y * zoomRef.current + panRef.current.y;
          ctx.restore(); ctx.save();
          const vig = ctx.createRadialGradient(sx, sy, Math.max(W, H) * 0.25, sx, sy, Math.max(W, H) * 0.55);
          vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(8,8,24,0.85)");
          ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
          ctx.restore(); animRef.current = requestAnimationFrame(animate); return;
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [positions, hovered, selectedNode, filter, filteredEdges, searchQuery, pan, zoom, hoveredConnections, highlightNode, pathResult, focusMode, focusNeighbors, centralityMode, centrality, maxDeg, growthStep, growthPlaying, revealedNodeIds]);

  // Re-measure graph canvas after the sidebar collapse/expand transition finishes,
  // since offsetWidth changes without a window resize event.
  useEffect(() => {
    const id = setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
    return () => clearTimeout(id);
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 56 : 320;

  if (!introComplete) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
          * { box-sizing: border-box; }
        `}</style>
        <Sidebar
          onNavigate={path => onNavigate ? onNavigate(path) : (window.location.href = path)}
          user={user || { username: "Ashwarya" }}
          onLogout={() => onLogout ? onLogout() : (localStorage.clear(), window.location.href = "/")}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <BigBangIntro onComplete={() => setIntroComplete(true)} offsetLeft={sidebarWidth} />
      </>
    );
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#06040f", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <NeuralCanvas />
      <div style={{ textAlign: "center", zIndex: 10, position: "relative" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid rgba(168,85,247,0.1)`, borderTop: `2px solid ${C.purple}`, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.purple, fontWeight: 600, fontSize: 14 }}>Loading Neural Topology</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#06040f", position: "relative", overflow: "hidden", display: "flex" }}
      onClick={() => setContextMenu(null)}>
      <NeuralCanvas />

      <Sidebar
        onNavigate={path => onNavigate ? onNavigate(path) : (window.location.href = path)}
        user={user || { username: "Ashwarya" }}
        onLogout={() => onLogout ? onLogout() : (localStorage.clear(), window.location.href = "/")}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {showCommandPalette && (
        <CommandPalette nodes={positions} onClose={() => setShowCommandPalette(false)} onSelectNode={n => navigateToNode(n)}
          onAction={handlePaletteAction} filter={filter} setFilter={setFilter}
          useRichGraph={useRichGraph} setUseRichGraph={setUseRichGraph} loadGraph={loadGraph}
          setShowPathfinder={setShowPathfinder} setCentralityMode={setCentralityMode} />
      )}

      <main style={{
        marginLeft: sidebarWidth,
        flex: 1,
        position: "relative",
        zIndex: 10,
        height: "100vh",
        transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }} onWheel={handleWheel}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Graph canvas - transparent so NeuralCanvas shows through */}
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} onClick={handleClick} onContextMenu={handleContextMenu}
          />

          <GraphHeader nodeCount={graphData.nodes?.length || 0} edgeCount={graphData.edges?.length || 0} />

          {/* ── TOP-LEFT: CONTROLS DROPDOWN ── */}
          <div style={{ position:"absolute", top:10, left:14, zIndex:20, width:285 }} onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
            <div onClick={e => { e.stopPropagation(); setControlsOpen(p => !p); }}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer", background:"rgba(8,6,22,0.92)", backdropFilter:"blur(16px)", border:`1px solid rgba(255,255,255,${controlsOpen ? 0.10 : 0.06})`, borderRadius: controlsOpen ? "10px 10px 0 0" : 10, color:"rgba(255,255,255,0.65)", fontSize:12, fontFamily:"'Space Grotesk',sans-serif", fontWeight:500, userSelect:"none" }}>
              <Ico name="settings" size={13} color="rgba(255,255,255,0.4)" />
              Graph Controls
              {(filter !== "all" || searchQuery) && (
                <span style={{ fontSize:9, color:"rgba(168,85,247,0.7)", marginLeft:2 }}>
                  {filter !== "all" ? `· ${filter.replace("_"," ")}` : ""}{searchQuery ? ` · "${searchQuery}"` : ""}
                </span>
              )}
              <span style={{ marginLeft:"auto", opacity:0.35, display:"inline-block", transition:"transform 0.2s", transform: controlsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <Ico name="chevron_d" size={12} color="rgba(255,255,255,0.5)" />
              </span>
            </div>

            {controlsOpen && (
              <div style={{ background:"rgba(8,6,22,0.97)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.06)", borderTop:"none", borderRadius:"0 0 12px 12px" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"'Space Grotesk',sans-serif", marginBottom:6 }}>Search Nodes</div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, padding:"5px 9px" }}>
                    <Ico name="search" size={12} color="rgba(255,255,255,0.28)" />
                    <input type="text" value={searchQuery}
                      onChange={e => { e.stopPropagation(); setSearchQuery(e.target.value); }}
                      onKeyDown={e => { e.stopPropagation(); handleSearchKeyDown(e); }}
                      placeholder="Search nodes… (Enter to go)"
                      style={{ background:"none", border:"none", outline:"none", color:"#fff", fontSize:11, fontFamily:"'Space Grotesk',sans-serif", width:"100%" }} />
                    {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background:"none", border:"none", cursor:"pointer", opacity:0.4 }}><Ico name="close" size={11} color="#fff" /></button>}
                  </div>
                </div>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"'Space Grotesk',sans-serif", marginBottom:6 }}>Filter by Type</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {["all","claim","evidence","argument","topic","debate_topic","concept","entity"].map(t => {
                      const col = NODE_COLORS[t] || NODE_COLORS.default;
                      const active = filter === t;
                      return (
                        <button key={t} onClick={e => { e.stopPropagation(); setFilter(t); }} style={{ padding:"3px 9px", borderRadius:20, fontSize:9, fontFamily:"'Space Grotesk',sans-serif", fontWeight: active ? 600 : 400, background: active ? `${col.fill}18` : "rgba(255,255,255,0.03)", border:`1px solid ${active ? col.fill+"40" : "rgba(255,255,255,0.06)"}`, color: active ? col.text : "rgba(255,255,255,0.38)", cursor:"pointer", textTransform:"capitalize" }}>
                          {t.replace("_"," ")}
                          {active && <span style={{ marginLeft:4, opacity:0.45, fontSize:8 }}>({activeFilterCount})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"'Space Grotesk',sans-serif", marginBottom:6 }}>Edge Types</div>
                  <EdgeTypeFilter activeEdgeTypes={activeEdgeTypes} onToggle={toggleEdgeType} />
                </div>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"'Space Grotesk',sans-serif", marginBottom:6 }}>Graph Mode</div>
                  <div style={{ display:"flex", gap:5 }}>
                    {[{ label:"Rich", rich:true }, { label:"Basic", rich:false }].map(({ label, rich }) => (
                      <button key={label} onClick={e => { e.stopPropagation(); setUseRichGraph(rich); loadGraph(rich); }} style={{ flex:1, padding:"6px 0", borderRadius:6, cursor:"pointer", fontSize:10, fontFamily:"'Space Grotesk',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:5, border:`1px solid ${useRichGraph === rich ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.06)"}`, background: useRichGraph === rich ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.02)", color: useRichGraph === rich ? "#c084fc" : "rgba(255,255,255,0.32)" }}>
                        <Ico name={rich ? "rich" : "basic"} size={11} color={useRichGraph === rich ? "#c084fc" : "rgba(255,255,255,0.3)"} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"'Space Grotesk',sans-serif", marginBottom:6 }}>Actions</div>
                  <div style={{ display:"flex", gap:5 }}>
                    <button onClick={e => { e.stopPropagation(); exportPNG(); }} style={{ flex:1, padding:"7px 0", borderRadius:6, fontSize:10, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", border:"1px solid rgba(230,196,74,0.2)", background:"rgba(230,196,74,0.06)", color:"rgba(230,196,74,0.8)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Ico name="download" size={11} color="rgba(230,196,74,0.75)" /> PNG {showExportHint ? "✓" : ""}
                    </button>
                    <button onClick={e => { e.stopPropagation(); clearPositions(); }} style={{ flex:1, padding:"7px 0", borderRadius:6, fontSize:10, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.32)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Ico name="reset" size={11} color="rgba(255,255,255,0.3)" /> Reset
                    </button>
                    <button onClick={e => { e.stopPropagation(); centerGraph(); }} style={{ flex:1, padding:"7px 0", borderRadius:6, fontSize:10, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", border:"1px solid rgba(168,85,247,0.2)", background:"rgba(168,85,247,0.06)", color:"rgba(168,85,247,0.8)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Ico name="center" size={11} color="rgba(168,85,247,0.75)" /> Center
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mini Map */}
          {positions.length > 0 && (
            <div style={{ position: "absolute", bottom: 72, left: 14, zIndex: 30 }}>
              <MiniMap positions={positions} pan={pan} zoom={zoom} canvasSize={canvasSize} onJump={setPan} />
            </div>
          )}

          {/* 3D switch */}
          <div style={{ position:"absolute", bottom: positions.length > 0 ? 234 : 72, left:14, zIndex:30 }}>
            <button onClick={() => onNavigate ? onNavigate("/graph3d") : (window.location.href = "/graph3d")} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px", background:"rgba(8,6,20,0.9)", backdropFilter:"blur(12px)", border:"1px solid rgba(168,85,247,0.18)", borderRadius:8, color:"rgba(168,85,247,0.75)", fontSize:11, fontFamily:"'Space Grotesk',sans-serif", fontWeight:500, cursor:"pointer" }}>
              <Ico name="view3d" size={13} color="rgba(168,85,247,0.75)" /> Switch to 3D
            </button>
          </div>

          {showPathfinder && (
            <Pathfinder positions={positions} graphData={graphData} onClose={() => setShowPathfinder(false)}
              onPathFound={result => { setPathResult(result); if (result?.nodeIds?.size > 0) { const first = positions.find(p => p.id === [...result.nodeIds][0]); if (first) navigateToNode(first); } }} />
          )}

          {/* Legend + Metrics */}
          <div style={{ position: "absolute", top: 56, right: 14, zIndex: 20, width: 210 }}>
            {!selectedNode && (
              <div style={{ background: "rgba(8,6,20,0.88)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", backdropFilter: "blur(16px)", marginBottom: 8 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
                  <Ico name="analytics" size={13} color="rgba(168,85,247,0.7)" /> Topology
                </div>
                <MetricRow label="Nodes" value={graphData.nodes?.length || 0} color={C.purple} />
                <MetricRow label="Edges" value={graphData.edges?.length || 0} color={C.cyan} />
                <MetricRow label="Visible" value={activeFilterCount} color={C.cyan} />
                <MetricRow label="Zoom" value={`${Math.round(zoom * 100)}%`} color={C.gold} />
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 9, color: "rgba(255,255,255,0.16)", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.7 }}>
                  Drag · Scroll zoom · Click · ⌘K
                </div>
              </div>
            )}
            <div style={{ background: "rgba(8,6,20,0.86)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, padding: "10px 12px", backdropFilter: "blur(12px)" }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 8, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Node Types</div>
              {["claim", "evidence", "argument", "topic", "debate_topic", "concept", "entity"].map(type => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 7, opacity: filter === "all" || filter === type ? 1 : 0.2, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: NODE_COLORS[type]?.fill }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.42)", fontFamily: "'Space Grotesk',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>{type.replace("_", " ")}</span>
                </div>
              ))}
              {pathResult && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />
                  <span style={{ fontSize: 9, color: C.gold, fontFamily: "'Space Grotesk',sans-serif" }}>Path</span>
                  <button onClick={() => setPathResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", opacity: 0.4 }}>
                    <Ico name="close" size={10} color="#fff" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {selectedNode && (
            <NodeDetailPanel node={selectedNode} details={nodeDetails} research={nodeResearch} positions={positions}
              onClose={() => { setSelectedNode(null); setNodeDetails(null); setNodeResearch([]); setFocusMode(false); setPathResult(null); }}
              onResearch={onStartResearch} onFindPath={() => setShowPathfinder(true)} />
          )}

          {hoveredLong && !selectedNode && !dragging && !contextMenu && (
            <HoverPopup key={hoveredLong.id} node={hoveredLong} position={hoverPopupPos} connections={hoveredConnCount} />
          )}

          {contextMenu && (
            <ContextMenu node={contextMenu.node} position={{ x: contextMenu.x, y: contextMenu.y }}
              onClose={() => setContextMenu(null)} onResearch={onStartResearch}
              onHighlight={n => { setHighlightNode(n); setSelectedNode(n); setFocusMode(true); }}
              onPathfind={() => setShowPathfinder(true)} />
          )}

          {hovered && !hoveredLong && !selectedNode && !dragging && (
            <div style={{ position: "absolute", left: hoverPopupPos.x + 12, top: hoverPopupPos.y - 32, zIndex: 50, pointerEvents: "none", background: "rgba(8,6,20,0.93)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "5px 10px", backdropFilter: "blur(12px)", display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: (NODE_COLORS[hovered.type] || NODE_COLORS.default).fill }} />
              <span style={{ color: "#fff", fontSize: 11, fontFamily: "'Space Grotesk',sans-serif" }}>{hovered.label}</span>
              <span style={{ color: (NODE_COLORS[hovered.type] || NODE_COLORS.default).text, fontSize: 8, textTransform: "uppercase", opacity: 0.55 }}>{hovered.type?.replace("_", " ")}</span>
            </div>
          )}

          {focusMode && selectedNode && (
            <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", zIndex: 25, background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.22)", borderRadius: 20, padding: "4px 12px", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 8 }}>
              <Ico name="focus" size={11} color={C.purple} />
              <span style={{ fontSize: 10, color: C.purple, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Focus: {selectedNode.label?.slice(0, 28)}</span>
              <button onClick={() => { setFocusMode(false); setSelectedNode(null); setNodeDetails(null); setNodeResearch([]); }} style={{ background: "none", border: "none", color: "rgba(168,85,247,0.5)", cursor: "pointer", fontSize: 10 }}>Exit</button>
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR (FIXED Timeline) ── */}
        <TimelineSlider
          onExportGIF={exportGIF}
          exporting={gifExporting}
          growthStep={growthStep}
          maxGrowthStep={maxGrowthStep}
          growthPlaying={growthPlaying}
          onGrowthPlay={() => {
            if (growthStep >= maxGrowthStep) { setGrowthStep(0); nodeBornAtRef.current = {}; shockwavesRef.current = []; }
            setGrowthPlaying(p => !p);
          }}
          onGrowthReset={() => { setGrowthStep(0); setGrowthPlaying(false); nodeBornAtRef.current = {}; shockwavesRef.current = []; }}
          growthSpeed={growthSpeed}
          onSpeedChange={setGrowthSpeed}
          zoom={zoom}
          onZoomChange={z => { cameraTargetRef.current = null; setZoom(z); }}
          onCenterGraph={centerGraph}
        />
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 2px; }
        input[type=range] { appearance: none; height: 3px; border-radius: 2px; background: rgba(168,85,247,0.22); }
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 9px; height: 9px; border-radius: 50%; background: #a855f7; cursor: pointer; }
      `}</style>
    </div>
  );
}