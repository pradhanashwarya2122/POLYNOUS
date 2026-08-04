import { useEffect, useRef, useState, useCallback } from "react";

const C = {
  green: "#00ff0f", cyan: "#00ccff", crimson: "#ff2040", purple: "#a855f7",
  gold: "#ffd700", void: "#0a0a1e", surface: "#111125",
  onSurface: "#e2e0fc", onSurfaceVariant: "#b9ccb0",
  textSecondary: "#8899aa", white10: "rgba(255,255,255,0.1)",
};

const NODE_COLORS = {
  claim: { fill: C.green, glow: C.green },
  evidence: { fill: C.cyan, glow: C.cyan },
  argument: { fill: C.crimson, glow: C.crimson },
  topic: { fill: "#e06c45", glow: "#e06c45" },
  concept: { fill: "#7c6fdd", glow: "#7c6fdd" },
  entity: { fill: "#1dab82", glow: "#1dab82" },
  core: { fill: C.purple, glow: C.purple },
  default: { fill: "#5878d4", glow: "#5878d4" },
};

// ─── SAMPLE DATA ──────────────────────────────────────────────
const SAMPLE_NODES = [
  { id:"n1", label:"AI Regulation", type:"claim", size:28, confidence:85, x:300, y:200 },
  { id:"n2", label:"EU AI Act 2024", type:"evidence", size:20, x:480, y:160 },
  { id:"n3", label:"Over-regulation risk", type:"argument", size:24, score:7, side:"AGAINST", x:420, y:320 },
  { id:"n4", label:"Machine Learning", type:"topic", size:32, x:140, y:280 },
  { id:"n5", label:"Neural Networks", type:"concept", size:26, x:180, y:420 },
  { id:"n6", label:"Data Privacy", type:"debate_topic", size:22, x:580, y:400 },
  { id:"n7", label:"OpenAI", type:"entity", size:18, x:600, y:260 },
  { id:"n8", label:"Core Logic", type:"core", size:35, x:350, y:320 },
];

const SAMPLE_EDGES = [
  { source:"n8", target:"n1", type:"SUPPORTED_BY", weight:3 },
  { source:"n1", target:"n2", type:"SUPPORTED_BY", weight:2 },
  { source:"n1", target:"n3", type:"COUNTERED_BY", weight:3 },
  { source:"n8", target:"n4", type:"RELATED_TO", weight:4 },
  { source:"n4", target:"n5", type:"CO_OCCURS", weight:2 },
  { source:"n8", target:"n6", type:"RELATED_TO", weight:1 },
  { source:"n6", target:"n7", type:"CO_OCCURS", weight:1 },
  { source:"n3", target:"n6", type:"RELATED_TO", weight:2 },
];

// ─── ANIMATION MODES ──────────────────────────────────────────
const ANIMATION_MODES = [
  { key:"orbit", label:"🪐 Orbiting Ring", desc:"Glowing particle orbits each node like an electron" },
  { key:"ripple", label:"💧 Ripple Waves", desc:"Expanding ripples emanate from nodes periodically" },
  { key:"glowPulse", label:"    Glow Pulse", desc:"Nodes glow intensity pulses softly" },
  { key:"breathing", label:"🫁 Breathing", desc:"Nodes gently grow and shrink (original)" },
  { key:"sparkle", label:"⭐ Sparkle Burst", desc:"Random sparkles appear around nodes" },
  { key:"energyBeam", label:"    Energy Beams", desc:"Energy beams connect related nodes" },
  { key:"none", label:"🔘 Static", desc:"No animation - clean minimal look" },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

export default function GraphFeatureShowcase() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [animationMode, setAnimationMode] = useState("orbit");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const frameRef = useRef(0);

  // ─── RENDER LOOP ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener("resize", resize);

    const nodes = SAMPLE_NODES.map(n => ({...n, vx:0, vy:0}));

    const animate = () => {
      frameRef.current++;
      const t = Date.now();
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // ── EDGES ──
      SAMPLE_EDGES.forEach(edge => {
        const src = nodes.find(n => n.id === edge.source);
        const tgt = nodes.find(n => n.id === edge.target);
        if (!src || !tgt) return;
        const isHovEdge = hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id);
        
        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
        const edgeColor = edge.type === "COUNTERED_BY" ? C.crimson : 
                          edge.type === "SUPPORTED_BY" ? C.green :
                          edge.type === "CO_OCCURS" ? "rgba(168,85,247,0.5)" : "rgba(0,204,255,0.5)";
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = isHovEdge ? 2.5 : 1;
        ctx.globalAlpha = isHovEdge ? 1 : 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Energy beams between connected nodes
        if (animationMode === "energyBeam" && isHovEdge) {
          const mx = (src.x + tgt.x) / 2, my = (src.y + tgt.y) / 2;
          const beamAngle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
          const beamLength = Math.hypot(tgt.x - src.x, tgt.y - src.y);
          
          for (let i = 0; i < 3; i++) {
            const pos = (t * 0.002 + i * 0.33) % 1;
            const bx = src.x + Math.cos(beamAngle) * beamLength * pos;
            const by = src.y + Math.sin(beamAngle) * beamLength * pos;
            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
            grad.addColorStop(0, "rgba(168,85,247,0.9)");
            grad.addColorStop(1, "rgba(168,85,247,0)");
            ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI*2);
            ctx.fillStyle = grad; ctx.fill();
          }
        }
      });

      // ── NODES ──
      nodes.forEach(n => {
        const isHov = hoveredNode?.id === n.id;
        const col = NODE_COLORS[n.type] || NODE_COLORS.default;
        const [gr, gg, gb] = hexToRgb(col.glow);
        
        let r = n.size;
        if (isHov) r *= 1.2;

        // === ANIMATION: Glow Pulse ===
        let glowMultiplier = 1;
        if (animationMode === "glowPulse") {
          glowMultiplier = 0.6 + Math.sin(t * 0.002 + n.id.charCodeAt(0) * 0.7) * 0.4;
        }
        if (animationMode === "breathing") {
          r = n.size + Math.sin(t * 0.002 + n.id.charCodeAt(0) * 0.7) * 2;
          if (isHov) r *= 1.2;
        }

        // Aura
        const auraR = r + (isHov ? 28 : 14);
        const aura = ctx.createRadialGradient(n.x, n.y, r * 0.3, n.x, n.y, auraR);
        aura.addColorStop(0, `rgba(${gr},${gg},${gb},${(isHov ? 0.35 : 0.08) * glowMultiplier})`);
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, auraR, 0, Math.PI * 2);
        ctx.fillStyle = aura; ctx.fill();

        // === ANIMATION: Ripple Waves ===
        if (animationMode === "ripple") {
          const ripplePhase = (t * 0.001 + n.id.charCodeAt(0) * 0.5) % 1;
          for (let i = 0; i < 2; i++) {
            const rippleT = (ripplePhase + i * 0.5) % 1;
            const rippleR = r + rippleT * 30;
            const rippleAlpha = (1 - rippleT) * 0.5;
            ctx.beginPath(); ctx.arc(n.x, n.y, rippleR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${gr},${gg},${gb},${rippleAlpha})`;
            ctx.lineWidth = 1.2; ctx.stroke();
          }
        }

        // === ANIMATION: Sparkle Burst ===
        if (animationMode === "sparkle") {
          const sparkleSeed = n.id.charCodeAt(0) * 1000;
          for (let i = 0; i < 5; i++) {
            const sparkleAngle = (t * 0.001 + i * 1.256 + sparkleSeed) % (Math.PI * 2);
            const sparkleDist = r + 12 + Math.sin(t * 0.004 + i + sparkleSeed) * 8;
            const sx = n.x + Math.cos(sparkleAngle) * sparkleDist;
            const sy = n.y + Math.sin(sparkleAngle) * sparkleDist;
            const sparkleAlpha = Math.abs(Math.sin(t * 0.005 + i + sparkleSeed)) * 0.8;
            ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${sparkleAlpha})`;
            ctx.shadowColor = col.glow; ctx.shadowBlur = 6;
            ctx.fill(); ctx.shadowBlur = 0;
          }
        }

        // === ANIMATION: Orbiting Ring ===
        if (animationMode === "orbit") {
          const orbitAngle = t * 0.003 + n.id.charCodeAt(0);
          const orbitR = r + 10;
          const ox = n.x + Math.cos(orbitAngle) * orbitR;
          const oy = n.y + Math.sin(orbitAngle) * orbitR;
          
          // Trail
          for (let i = 1; i <= 4; i++) {
            const trailAngle = orbitAngle - i * 0.15;
            const trailX = n.x + Math.cos(trailAngle) * orbitR;
            const trailY = n.y + Math.sin(trailAngle) * orbitR;
            ctx.beginPath(); ctx.arc(trailX, trailY, 2 - i * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${gr},${gg},${gb},${0.7 - i * 0.15})`;
            ctx.fill();
          }
          // Main orbiting dot
          ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2);
          ctx.fillStyle = col.glow; ctx.shadowColor = col.glow; ctx.shadowBlur = 12;
          ctx.fill(); ctx.shadowBlur = 0;
        }

        // Node body
        const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.35, 0, n.x, n.y, r);
        const [fr, fg, fb] = hexToRgb(col.fill);
        const boost = isHov ? 80 : 0;
        grad.addColorStop(0, `rgba(${Math.min(255, fr + boost + 60)},${Math.min(255, fg + boost + 60)},${Math.min(255, fb + boost + 60)},1)`);
        grad.addColorStop(0.6, `rgba(${Math.min(255, fr + boost)},${Math.min(255, fg + boost)},${Math.min(255, fb + boost)},0.95)`);
        grad.addColorStop(1, `rgba(${fr},${fg},${fb},0.85)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();

        // Border
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isHov ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = isHov ? 2 : 0.8; ctx.stroke();

        // Label
        const label = (n.label?.length > 16 ? n.label.slice(0, 15) + "…" : n.label) || "";
        ctx.font = `${isHov ? 600 : 400} ${isHov ? 11 : 10}px 'JetBrains Mono',monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = isHov ? "#fff" : col.glow;
        ctx.fillText(label, n.x, n.y + r + 14);
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [animationMode, hoveredNode]);

  // ─── Mouse handlers ──────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const found = SAMPLE_NODES.find(n => Math.hypot(n.x - mx, n.y - my) < n.size + 14);
    setHoveredNode(found || null);
    canvasRef.current.style.cursor = found ? "pointer" : "default";
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: C.void, display: "flex",
      fontFamily: "'Inter','Segoe UI',sans-serif", color: "#e2e0fc", position: "relative", overflow: "hidden"
    }}>
      
      {/* ── SIDEBAR CONTROLS ── */}
      <div style={{
        width: 340, minWidth: 340, height: "100vh",
        background: "rgba(10,10,30,0.7)", backdropFilter: "blur(24px)",
        borderRight: `1px solid ${C.white10}`, padding: 24,
        display: "flex", flexDirection: "column", gap: 16,
        overflowY: "auto", zIndex: 10
      }}>
        {/* Title */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: C.purple, margin: "0 0 4px" }}>
            🎨 Animation Lab
          </h2>
          <p style={{ fontSize: 11, color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace" }}>
            Test different node animation effects
          </p>
        </div>

        {/* Legend toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary }}>
          <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} style={{ accentColor: C.purple }} />
          Show legend
        </label>

        <div style={{ borderTop: `1px solid ${C.white10}`, paddingTop: 16 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Animation Mode
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ANIMATION_MODES.map(mode => (
              <button
                key={mode.key}
                onClick={() => setAnimationMode(mode.key)}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 12,
                  border: `1.5px solid ${animationMode === mode.key ? C.purple + "66" : "rgba(255,255,255,0.06)"}`,
                  background: animationMode === mode.key ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.02)",
                  color: animationMode === mode.key ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                }}
                onMouseEnter={e => { if (animationMode !== mode.key) e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                onMouseLeave={e => { if (animationMode !== mode.key) e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{mode.label}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CANVAS AREA ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }}
          onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredNode(null)}
        />

        {/* Legend overlay */}
        {showLegend && (
          <div style={{
            position: "absolute", bottom: 16, right: 16,
            background: "rgba(10,8,20,0.88)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(12px)",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Sample Nodes
            </div>
            {["claim", "evidence", "argument", "topic", "concept", "entity", "core"].map(type => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: (NODE_COLORS[type] || NODE_COLORS.default).fill, boxShadow: `0 0 6px ${(NODE_COLORS[type] || NODE_COLORS.default).glow}`, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase" }}>{type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active mode badge */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(10,8,20,0.9)", border: `1px solid ${C.purple}44`,
          borderRadius: 20, padding: "8px 16px", backdropFilter: "blur(12px)",
          fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.purple,
          display: "flex", alignItems: "center", gap: 8, pointerEvents: "none"
        }}>
          <span>🎨</span>
          {ANIMATION_MODES.find(m => m.key === animationMode)?.label || "Static"}
        </div>

        {/* Hover indicator */}
        {hoveredNode && (
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,8,20,0.9)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10, padding: "8px 16px", backdropFilter: "blur(12px)",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#fff",
            display: "flex", gap: 10, alignItems: "center", pointerEvents: "none"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: (NODE_COLORS[hoveredNode.type] || NODE_COLORS.default).fill }} />
            {hoveredNode.label}
            <span style={{ color: C.textSecondary, fontSize: 9, textTransform: "uppercase" }}>
              {hoveredNode.type}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Material+Symbols+Outlined&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}