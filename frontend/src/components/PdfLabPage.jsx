// PDF Neural Lab — fully enhanced with security validation
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from '../config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  gold:       "#FFD60A",
  goldDim:    "rgba(255,214,10,0.15)",
  goldBorder: "rgba(255,214,10,0.22)",
  green:      "#00ff6a",
  cyan:       "#00d4ff",
  crimson:    "#ff3355",
  purple:     "#a855f7",
  void:       "#0A0A1E",
  surface:    "rgba(14,14,36,0.75)",
  surfaceHi:  "rgba(20,20,48,0.88)",
  border:     "rgba(255,255,255,0.07)",
  borderGold: "rgba(255,214,10,0.18)",
  text:       "#e2eaf4",
  textMid:    "#9fb3c8",
  textDim:    "#4a5f72",
  mono:       "'JetBrains Mono', monospace",
  display:    "'Sora', sans-serif",
  body:       "'Inter', sans-serif",
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Material+Symbols+Outlined&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#0A0A1E;color:#e2eaf4;font-family:'Inter',sans-serif;overflow-x:hidden}
::selection{background:rgba(255,214,10,0.2);color:#fff}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,214,10,0.18);border-radius:3px}
input,textarea{font-family:'Inter',sans-serif}
input:focus,textarea:focus{outline:none}
button{cursor:pointer;font-family:'Inter',sans-serif}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes dotPulse{0%,80%,100%{transform:scale(0);opacity:0.3}40%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes borderGlow{0%,100%{border-color:rgba(255,214,10,0.18)}50%{border-color:rgba(255,214,10,0.45)}}
@keyframes floatUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 6px rgba(255,214,10,0.15)}50%{box-shadow:0 0 22px rgba(255,214,10,0.4)}}
@keyframes slideRight{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes barFill{from{width:0}to{width:var(--w,100%)}}
@keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-6px)}}
@keyframes lightStreak{0%{opacity:0;transform:translateX(-100%) rotate(-7deg)}40%{opacity:0.55}100%{opacity:0;transform:translateX(200%) rotate(-7deg)}}
@keyframes smGlow{0%,100%{text-shadow:0 0 30px rgba(255,214,10,0.45),0 0 80px rgba(255,214,10,0.18)}50%{text-shadow:0 0 50px rgba(255,214,10,0.7),0 0 120px rgba(255,214,10,0.3)}}

.fade-up{animation:fadeUp 0.45s ease both}
.shimmer-line{background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,214,10,0.07) 50%,rgba(255,255,255,0.03) 75%);background-size:600px 100%;animation:shimmer 1.8s infinite linear;border-radius:6px}
.spin{animation:spin 0.9s linear infinite}
.nav-item{transition:color 0.18s,background 0.18s}
.nav-item:hover{color:${T.gold}!important;background:rgba(255,214,10,0.06)!important}
.doc-card{transition:border-color 0.2s,background 0.2s,transform 0.2s}
.doc-card:hover{transform:translateY(-2px)}
.btn-primary{transition:filter 0.18s,transform 0.18s,box-shadow 0.18s}
.btn-primary:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 8px 28px rgba(255,214,10,0.28)}
.btn-ghost{transition:color 0.18s,background 0.18s,border-color 0.18s,transform 0.18s}
.btn-ghost:hover{background:rgba(255,214,10,0.07)!important;border-color:rgba(255,214,10,0.3)!important;color:${T.gold}!important;transform:translateY(-1px)}
.suggest-chip:hover{background:rgba(255,214,10,0.08)!important;border-color:rgba(255,214,10,0.3)!important;color:${T.gold}!important}
.rag-step:hover{transform:translateY(-3px)}
.rag-step{transition:transform 0.2s,border-color 0.2s,background 0.2s,box-shadow 0.2s}
.cta-primary{transition:filter 0.2s,transform 0.2s,box-shadow 0.2s}
.cta-primary:hover{filter:brightness(1.12);transform:translateY(-3px);box-shadow:0 10px 36px rgba(255,214,10,0.38)!important}
.cta-secondary{transition:background 0.2s,border-color 0.2s,transform 0.2s,color 0.2s}
.cta-secondary:hover{background:rgba(255,214,10,0.09)!important;border-color:rgba(255,214,10,0.4)!important;color:${T.gold}!important;transform:translateY(-3px)}
`;

// ─── Security constants (from PdfUpload) ──────────────────────────────────────
const ALLOWED_TYPES = ['application/pdf'];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── File validation (merged from PdfUpload) ──────────────────────────────────
const validateFile = (file) => {
  const errors = [];
  
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    errors.push('Only PDF files are allowed');
  }

  // Check file size
  if (file.size === 0) {
    errors.push('File is empty');
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`File too large (${sizeMB}MB). Maximum is 50MB`);
  }

  // Check filename for path traversal
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Invalid filename');
  }

  return errors;
};

// ─── Icon helper ──────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color, style: s }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
      fontSize: size, lineHeight: 1, color: color || "inherit",
      userSelect: "none", flexShrink: 0, ...(s || {}),
    }}>{name}</span>
  );
}

// ─── Neural background canvas ─────────────────────────────────────────────────
function NeuralBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    // 15-20% more particles
    const pts = Array.from({ length: 108 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.4,
      c: [T.gold, T.cyan, T.purple][Math.floor(Math.random() * 3)],
      op: Math.random() * 0.4 + 0.1,
    }));
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c; ctx.globalAlpha = p.op; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y);
          if (d < 100) {
            ctx.globalAlpha = 0.03 * (1 - d / 100);
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = "#aab8ff"; ctx.lineWidth = 0.4; ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── 3D Document Canvas Visual — enhanced ────────────────────────────────────
function DocCanvas3D({ uploading }) {
  const ref = useRef(null);
  const mouse = useRef({ x: 240, y: 240 });
  const targetMouse = useRef({ x: 240, y: 240 });
  const frame = useRef(0);
  const anim = useRef(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 480, H = 480;
    canvas.width = W; canvas.height = H;

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.3, op: Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
      col: [T.gold, T.cyan, T.purple][Math.floor(Math.random() * 3)],
    }));

    const rings = [
      { rx: 148, ry: 40, tilt: -20, spd: 0.005, dots: 9,  col: T.gold },
      { rx: 105, ry: 27, tilt: -12, spd: 0.0085, dots: 6, col: T.cyan },
      { rx: 170, ry: 46, tilt: -28, spd: 0.0038, dots: 13, col: T.purple },
    ];

    function drawDoc(cx, cy, rotY, sc, alpha, glow) {
      ctx.save(); ctx.globalAlpha = alpha;
      const w = 76 * sc, h = 100 * sc;
      const sk = Math.sin(rotY) * 16 * sc;

      ctx.save();
      ctx.shadowColor = `rgba(255,214,10,${glow * 0.5})`; ctx.shadowBlur = 28;
      const path = new Path2D();
      path.moveTo(cx - w/2 + sk, cy - h/2);
      path.lineTo(cx + w/2 + sk, cy - h/2);
      path.lineTo(cx + w/2 - sk, cy + h/2);
      path.lineTo(cx - w/2 - sk, cy + h/2);
      path.closePath();
      const g = ctx.createLinearGradient(cx - w/2, cy - h/2, cx + w/2, cy + h/2);
      g.addColorStop(0, `rgba(255,214,10,${0.16 * glow})`);
      g.addColorStop(0.55, `rgba(255,190,8,${0.24 * glow})`);
      g.addColorStop(1, `rgba(180,130,0,${0.1 * glow})`);
      ctx.fillStyle = g; ctx.fill(path); ctx.restore();

      ctx.beginPath();
      ctx.moveTo(cx - w/2 + sk, cy - h/2);
      ctx.lineTo(cx + w/2 + sk, cy - h/2);
      ctx.lineTo(cx + w/2 - sk, cy + h/2);
      ctx.lineTo(cx - w/2 - sk, cy + h/2);
      ctx.closePath();
      ctx.strokeStyle = `rgba(255,214,10,${0.65 * glow})`;
      ctx.lineWidth = 1.4; ctx.stroke();

      const d = 13 * sc;
      ctx.beginPath();
      ctx.moveTo(cx + w/2 + sk - d, cy - h/2);
      ctx.lineTo(cx + w/2 + sk, cy - h/2 + d);
      ctx.lineTo(cx + w/2 + sk - d, cy - h/2 + d);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,200,20,${0.45 * glow})`; ctx.fill();
      ctx.strokeStyle = `rgba(255,214,10,${0.35 * glow})`; ctx.stroke();

      [0.62, 0.85, 0.73, 0.52, 0.78, 0.67].forEach((lw, i) => {
        const ly = cy - h/2 + 26*sc + i*10.5*sc;
        const lx = cx - w/2 + sk + 9*sc;
        ctx.beginPath(); ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (w - 18*sc) * lw, ly);
        ctx.strokeStyle = `rgba(255,214,10,${0.36 * glow})`;
        ctx.lineWidth = 1.8; ctx.stroke();
      });
      ctx.restore();
    }

    const tick = () => {
      frame.current++;
      const t = frame.current;
      // Smooth mouse interpolation
      mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.06;
      mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.06;

      ctx.clearRect(0, 0, W, H);
      const mx = (mouse.current.x - W/2) / W;
      const my = (mouse.current.y - H/2) / H;

      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 210);
      bg.addColorStop(0, "rgba(255,214,10,0.065)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Extra ambient glow on hover proximity
      const dist = Math.hypot(mouse.current.x - W/2, mouse.current.y - H/2);
      const hoverAmt = Math.max(0, 1 - dist / 200);
      if (hoverAmt > 0) {
        const hg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 160);
        hg.addColorStop(0, `rgba(255,214,10,${0.06 * hoverAmt})`);
        hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
      }

      // Particles (multi-color)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.phase += 0.025;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const op = p.op * (0.55 + 0.45 * Math.sin(p.phase));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.col; ctx.globalAlpha = op; ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Autonomous float offset (4-6px oscillation)
      const floatY = Math.sin(t * 0.012) * 5;
      const floatX = Math.cos(t * 0.009) * 2;
      const cx = W/2 + mx * 18 + floatX;
      const cy = H/2 + my * 18 + 28 + floatY;

      // Rings
      rings.forEach((ring, ri) => {
        ctx.save(); ctx.translate(cx, cy);
        ctx.rotate(ring.tilt * Math.PI / 180);
        ctx.scale(1, ring.ry / ring.rx);
        ctx.beginPath(); ctx.ellipse(0, 0, ring.rx, ring.rx, 0, 0, Math.PI * 2);
        ctx.setLineDash([3, 7]);
        ctx.globalAlpha = 0.13 + ri * 0.06;
        ctx.strokeStyle = ring.col; ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        for (let d = 0; d < ring.dots; d++) {
          const angle = (d / ring.dots) * Math.PI * 2 + t * ring.spd;
          const px = Math.cos(angle) * ring.rx;
          const py = Math.sin(angle) * ring.ry;
          const cosT = Math.cos(ring.tilt * Math.PI / 180);
          const fx = cx + px, fy = cy + py * cosT;
          const fz = py * Math.sin(ring.tilt * Math.PI / 180);
          const sz = Math.max(0.5, 1.4 + fz / 90);
          const op2 = 0.25 + 0.65 * ((fz + ring.rx) / (ring.rx * 2));
          ctx.beginPath(); ctx.arc(fx, fy, sz, 0, Math.PI * 2);
          ctx.globalAlpha = op2;
          if (d === 0) { ctx.shadowColor = ring.col; ctx.shadowBlur = 7; }
          ctx.fillStyle = ring.col; ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
      });

      // Each satellite card gets independent gentle movement
      const docs = [
        { ox: 0,   oy: 0,  rotY: Math.sin(t*0.011)*0.5 - mx*0.3,  sc: 1,    alpha: 1 },
        { ox: -105+Math.sin(t*0.009)*7+Math.sin(t*0.013)*3, oy: 28+Math.cos(t*0.011)*5, rotY: -0.38 - mx*0.15, sc: 0.68, alpha: 0.55+0.18*Math.sin(t*0.04+1) },
        { ox:  112+Math.cos(t*0.008)*7+Math.cos(t*0.017)*3, oy: 24+Math.sin(t*0.013)*5, rotY:  0.42 - mx*0.15, sc: 0.68, alpha: 0.55+0.18*Math.sin(t*0.04+2) },
        { ox: -52+Math.sin(t*0.007)*6+Math.sin(t*0.019)*4,  oy:-82+Math.cos(t*0.009)*5, rotY:  0.18 - mx*0.1, sc: 0.48, alpha: 0.42+0.18*Math.sin(t*0.04+3) },
        { ox:  58+Math.cos(t*0.01)*6+Math.cos(t*0.021)*4,   oy:-78+Math.sin(t*0.008)*5, rotY: -0.28 - mx*0.1, sc: 0.48, alpha: 0.42+0.18*Math.sin(t*0.04+4) },
      ];

      // Connection lines + packets
      docs.forEach((doc, i) => {
        if (i === 0) return;
        const ax = cx + doc.ox, ay = cy + doc.oy;
        const pulse = (Math.sin(t * 0.06 + i * 1.4) + 1) / 2;
        ctx.globalAlpha = 0.04 + pulse * 0.09;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay);
        ctx.strokeStyle = T.gold; ctx.lineWidth = 0.8; ctx.stroke();

        const progress = ((t * 0.01 + i * 0.22) % 1);
        const px2 = cx + (ax - cx) * progress;
        const py2 = cy + (ay - cy) * progress;
        ctx.globalAlpha = 0.35 + pulse * 0.45;
        ctx.beginPath(); ctx.arc(px2, py2, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = T.gold; ctx.fill();
        ctx.globalAlpha = 1;
      });

      [...docs].reverse().forEach((doc, ri) => {
        const i = docs.length - 1 - ri;
        const glow = i === 0 ? 1 + hoverAmt * 0.4 : 0.48 + 0.22 * Math.sin(t * 0.035 + i);
        drawDoc(cx + doc.ox, cy + doc.oy, doc.rotY, doc.sc, doc.alpha, glow);
      });

      if (uploading) {
        const pr = 58 + Math.sin(t * 0.14) * 18;
        ctx.globalAlpha = 0.28 + 0.28 * Math.sin(t * 0.14);
        ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
      }

      anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(anim.current);
  }, [uploading]);

  const onMouseMove = useCallback(e => {
    const rect = ref.current?.getBoundingClientRect(); if (!rect) return;
    targetMouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onMouseLeave = useCallback(() => {
    targetMouse.current = { x: 240, y: 240 };
  }, []);

  return (
    <canvas ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      style={{ maxWidth: "100%", height: "auto", cursor: "crosshair", display: "block", marginTop: -50 }} />
  );
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function useTypewriter(text, speed = 9) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut(""); if (!text) return;
    let i = 0;
    const id = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

// ─── How It Works — interactive pipeline (FIXED) ──────────────────────────────
const PIPELINE = [
  {
    id: 0, col: T.purple, colBg: "rgba(168,85,247,0.07)", colBorder: "rgba(168,85,247,0.22)",
    icon: "upload_file", label: "Upload & Chunk",
    tagline: "PDF → index cards",
    detail: "Your PDF is parsed page by page, then split into overlapping ~500-word chunks. Overlap keeps ideas whole — no concept gets cut mid-sentence.",
    tech: "PyMuPDF · Recursive text splitter · 500-token chunks, 50-token overlap",
    visual: "chunks",
  },
  {
    id: 1, col: T.cyan, colBg: "rgba(0,212,255,0.06)", colBorder: "rgba(0,212,255,0.22)",
    icon: "hub", label: "Vector Embedding",
    tagline: "Meaning → numbers",
    detail: "A transformer model converts each chunk into a 384-dimensional vector — a fingerprint of meaning. Similar ideas cluster nearby in this mathematical space.",
    tech: "sentence-transformers · all-MiniLM-L6 · 384-dim vectors",
    visual: "vectors",
  },
  {
    id: 2, col: T.gold, colBg: "rgba(255,214,10,0.06)", colBorder: "rgba(255,214,10,0.22)",
    icon: "travel_explore", label: "Semantic Retrieval",
    tagline: "Query finds its cousins",
    detail: "Your question is embedded the same way, then we find the top-K chunks closest in meaning — not just keywords. 'heart stopped' matches 'cardiac arrest'.",
    tech: "FAISS index · top-5 retrieval · cosine similarity · cross-encoder rerank",
    visual: "retrieval",
  },
  {
    id: 3, col: T.green, colBg: "rgba(0,255,106,0.05)", colBorder: "rgba(0,255,106,0.18)",
    icon: "auto_awesome", label: "LLM Synthesis",
    tagline: "Grounded, cited answer",
    detail: "Retrieved chunks are passed to the LLM as the only context. It answers strictly from your document — no web, no hallucination, with chunk citations.",
    tech: "Claude API · system-prompt grounding · source citation · confidence score",
    visual: "synthesis",
  },
];

function ChunksViz() {
  const rows = ["The mitochondria is the powerhouse…","ATP synthesis occurs via oxidative…","Electron transport chain accepts…","NADH donates electrons to Complex I…","Proton gradient drives ATP synthase…"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          background: "rgba(168,85,247,0.1)",
          border: "1px solid rgba(168,85,247,0.28)",
          borderRadius: 8, padding: "7px 11px", display:"flex", gap:10, alignItems:"center",
          animation: `floatUp 0.35s ${i*0.07}s both ease`,
        }}>
          <span style={{ fontFamily:T.mono, fontSize:10, color:T.purple, background:"rgba(168,85,247,0.14)", padding:"1px 7px", borderRadius:4, flexShrink:0 }}>#{i+1}</span>
          <span style={{ fontFamily:T.mono, fontSize:11, color:T.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r}</span>
        </div>
      ))}
    </div>
  );
}

function VectorsViz() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  const vecs = [
    { label:"Chunk #1", vals:[0.82,0.34,0.61], col:T.purple },
    { label:"Chunk #2", vals:[0.71,0.55,0.43], col:T.cyan },
    { label:"Chunk #3", vals:[0.23,0.88,0.51], col:T.gold },
    { label:"Chunk #4", vals:[0.65,0.41,0.77], col:T.green },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
      {vecs.map((v, i) => (
        <div key={i} style={{ animation: `floatUp 0.35s ${i*0.09}s both` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontFamily:T.mono, fontSize:10, color:v.col, minWidth:58 }}>{v.label}</span>
            <div style={{ display:"flex", gap:3 }}>
              {v.vals.map((val, j) => (
                <div key={j} style={{
                  height:14,
                  width: mounted ? `${val*52}px` : "6px",
                  background: v.col, borderRadius:3, opacity:0.75,
                  transition: `width 0.7s cubic-bezier(0.34,1.56,0.64,1) ${j*0.08+i*0.04}s`,
                }} />
              ))}
            </div>
            <span style={{ fontFamily:T.mono, fontSize:10, color:T.textDim }}>
              [{v.vals.map(x=>x.toFixed(2)).join(", ")}, …]
            </span>
          </div>
        </div>
      ))}
      <div style={{ fontFamily:T.mono, fontSize:10, color:T.textDim, textAlign:"center", marginTop:2 }}>
        ↑ 384-dim vectors (shown as 3-dim)
      </div>
    </div>
  );
}

function RetrievalViz() {
  const items = [
    { label:"Your query", text:"How does ATP synthesis work?", score:null, q:true },
    { label:"Chunk #5",   text:"ATP synthesis via oxidative phosphorylation…", score:94, hit:true },
    { label:"Chunk #3",   text:"Electron transport chain accepts NADH…",       score:87, hit:true },
    { label:"Chunk #1",   text:"Mitochondria is the powerhouse…",               score:72, hit:true },
    { label:"Chunk #7",   text:"Cell membrane consists of lipid bilayer…",      score:19, hit:false },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: item.q ? "rgba(255,214,10,0.07)" : item.hit ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
          border: `1px solid ${item.q ? "rgba(255,214,10,0.35)" : item.hit ? T.borderGold : T.border}`,
          borderRadius:8, padding:"7px 11px", display:"flex", alignItems:"center", gap:9,
          animation: `floatUp 0.3s ${i*0.07}s both`,
        }}>
          <span style={{ fontFamily:T.mono, fontSize:10, color: item.q ? T.gold : item.hit ? T.textMid : T.textDim, minWidth:56, flexShrink:0 }}>{item.label}</span>
          <span style={{ fontFamily:T.mono, fontSize:11, color: item.hit ? "#bcd" : T.textDim, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.text}</span>
          {item.score != null && (
            <span style={{ fontFamily:T.mono, fontSize:11, fontWeight:600, color: item.score>70 ? T.green : T.textDim, background: item.score>70 ? "rgba(0,255,106,0.08)" : "transparent", padding:"1px 7px", borderRadius:5 }}>{item.score}%</span>
          )}
          {item.hit !== undefined && <span style={{ fontSize:13 }}>{item.hit ? "✓" : "✗"}</span>}
        </div>
      ))}
    </div>
  );
}

function SynthesisViz() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 300);
    return () => clearInterval(id);
  }, []);
  const words = "Based on the retrieved chunks, ATP synthesis occurs through the electron transport chain, which creates a proton gradient across the inner mitochondrial membrane, driving ATP synthase…".split(" ");
  const shown = Math.min(tick * 2, words.length);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{
        background:"rgba(0,255,106,0.03)", border:"1px solid rgba(0,255,106,0.1)",
        borderRadius:10, padding:"12px 14px", minHeight:76,
        display:"flex", flexWrap:"wrap", gap:"0 5px", alignContent:"flex-start",
      }}>
        {words.slice(0, shown).map((w, i) => (
          <span key={i} style={{ fontFamily:T.body, fontSize:12, color:"#b8e0c0", lineHeight:1.7, animation:"floatUp 0.15s ease both" }}>{w}</span>
        ))}
        {shown < words.length && (
          <span style={{ display:"inline-block", width:2, height:14, background:T.green, animation:"pulse 0.7s infinite", marginLeft:1, verticalAlign:"middle" }} />
        )}
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {["chunk #5","chunk #3","chunk #1"].map((s, i) => (
          <span key={i} style={{
            fontFamily:T.mono, fontSize:10, color:T.gold,
            background:"rgba(255,214,10,0.07)", border:"1px solid rgba(255,214,10,0.15)",
            padding:"2px 10px", borderRadius:10,
            animation: `floatUp 0.4s ${i*0.14}s both`,
          }}>cited: {s}</span>
        ))}
      </div>
    </div>
  );
}

// Map step visual to component — each mounts fresh when active changes
const VIZ_MAP = { chunks: ChunksViz, vectors: VectorsViz, retrieval: RetrievalViz, synthesis: SynthesisViz };

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [vizKey, setVizKey] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setActive(s => (s + 1) % PIPELINE.length);
      setVizKey(k => k + 1);
    }, 3400);
    return () => clearInterval(id);
  }, [playing]);

  const handleStepClick = (i) => {
    setActive(i);
    setVizKey(k => k + 1);
    setPlaying(false);
  };

  const step = PIPELINE[active];
  const Viz = VIZ_MAP[step.visual];

  return (
    <div style={{
      background: T.surface, backdropFilter:"blur(20px)",
      border: `1px solid ${T.borderGold}`, borderRadius:20,
      padding:28, marginBottom:28,
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, gap:16 }}>
        <div>
          <h3 style={{ fontFamily:T.display, fontWeight:800, fontSize:20, color:"#fff", marginBottom:5 }}>How PDF RAG works</h3>
          <p style={{ fontFamily:T.mono, fontSize:12, color:T.textDim }}>Click each step — or hit Play to watch the pipeline run</p>
        </div>
        <button onClick={() => setPlaying(p => !p)} style={{
          padding:"8px 18px", borderRadius:20,
          background: playing ? T.gold : "rgba(255,214,10,0.08)",
          border: `1px solid ${playing ? T.gold : T.borderGold}`,
          color: playing ? "#04090f" : T.gold,
          fontFamily:T.mono, fontSize:12, fontWeight:700,
          cursor:"pointer", transition:"all 0.2s", flexShrink:0,
        }}>{playing ? "⏸ Pause" : "▶ Play"}</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:22 }}>
        {PIPELINE.map((s, i) => (
          <div key={s.id} className="rag-step" onClick={() => handleStepClick(i)} style={{
            background: active===i ? s.colBg : "rgba(255,255,255,0.02)",
            border: `2px solid ${active===i ? s.colBorder : T.border}`,
            borderRadius:13, padding:"14px 12px", textAlign:"center", cursor:"pointer",
            boxShadow: active===i ? `0 0 18px ${s.col}1a` : "none",
          }}>
            <Icon name={s.icon} size={22} color={active===i ? s.col : T.textDim} style={{ marginBottom:7, display:"block" }} />
            <div style={{ fontFamily:T.mono, fontSize:9, color:T.textDim, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>Step {i+1}</div>
            <div style={{ fontFamily:T.display, fontWeight:700, fontSize:12, color: active===i ? s.col : T.textMid, lineHeight:1.3 }}>{s.label}</div>
            {active===i && playing && (
              <div style={{ marginTop:8, height:2, borderRadius:1, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                <div style={{ height:"100%", background:s.col, animation:"barFill 3.4s linear forwards" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div key={`${active}-${vizKey}`} style={{
        display:"grid", gridTemplateColumns:"1fr 1fr", gap:20,
        background: step.colBg, border:`1px solid ${step.colBorder}`,
        borderRadius:16, padding:"22px 24px",
        animation:"slideRight 0.3s ease",
        minHeight:240,
      }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ fontFamily:T.display, fontWeight:800, fontSize:17, color:step.col, marginBottom:4 }}>{step.label}</div>
            <div style={{ fontFamily:T.mono, fontSize:11, color:step.col, opacity:0.65, marginBottom:12 }}>{step.tagline}</div>
            <p style={{ fontFamily:T.body, fontSize:14, color:"#c2d4e4", lineHeight:1.8 }}>{step.detail}</p>
          </div>
          <div style={{ background:"rgba(0,0,0,0.22)", borderRadius:9, border:"1px solid rgba(255,255,255,0.05)", padding:"9px 13px" }}>
            <div style={{ fontFamily:T.mono, fontSize:9, color:T.textDim, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Tech</div>
            <div style={{ fontFamily:T.mono, fontSize:11, color:step.col, opacity:0.8, lineHeight:1.6 }}>{step.tech}</div>
          </div>
        </div>
        <div style={{ background:"rgba(0,0,0,0.18)", borderRadius:11, border:"1px solid rgba(255,255,255,0.05)", padding:"14px 16px", overflow:"hidden" }}>
          <div style={{ fontFamily:T.mono, fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:11 }}>Live preview</div>
          <Viz key={vizKey} />
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:18 }}>
        {PIPELINE.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:9, height:9, borderRadius:"50%",
              background: i<=active ? s.col : "rgba(255,255,255,0.1)",
              boxShadow: i===active ? `0 0 8px ${s.col}` : "none",
              transition:"background 0.3s",
            }} />
            {i < PIPELINE.length-1 && (
              <div style={{ width:36, height:2, borderRadius:1, background: i<active ? `linear-gradient(90deg,${s.col},${PIPELINE[i+1].col})` : "rgba(255,255,255,0.06)", transition:"background 0.3s" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", fontFamily:T.mono, fontSize:11, color:T.textDim, marginTop:14 }}>
        A very fast intern that read all your documents and never forgets.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Navigation items
// ═══════════════════════════════════════════════════════════════
const NAV = [
  { icon: "travel_explore", label: "Research", path: "/research" },
  { icon: "forum", label: "Debate Chamber", path: "/debate" },
  { icon: "account_tree", label: "Knowledge Graph", path: "/graph" },
  { icon: "search", label: "Semantic Search", path: "/search" },
  { icon: "database", label: "Memory Bank", path: "/memory" },
  { icon: "picture_as_pdf", label: "PDF Lab", path: "/pdf-lab", active: true },
  { icon: "analytics", label: "Analytics", path: "/analytics" },
  { icon: "settings", label: "Settings", path: "/settings" },
];

// ═══════════════════════════════════════════════════════════════
// Sidebar component
// ═══════════════════════════════════════════════════════════════
function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const bye = () =>
    onLogout
      ? onLogout()
      : (localStorage.clear(), (window.location.href = "/"));

  // ── Collapsed state ─────────────────────────────────────────
  if (collapsed)
    return (
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100%",
          width: 56,
          background: "rgba(10,10,30,0.65)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          zIndex: 30,
        }}
      >
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: "none",
            border: "none",
            color: T.gold,
            cursor: "pointer",
            marginBottom: 32,
          }}
        >
          <Icon name="chevron_right" size={22} />
        </button>

        {/* Nav icons */}
        {NAV.map(({ icon, label, path, active }) => (
          <div
            key={label}
            onClick={() => go(path)}
            title={label}
            style={{
              padding: "12px 0",
              cursor: "pointer",
              color: active ? T.gold : T.textMid,
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} size={20} color={active ? T.gold : T.textMid} />
          </div>
        ))}

        {/* Bottom actions */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            onClick={() => go("/research")}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="add" size={16} color="#0A0A1E" />
          </div>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: T.surfaceHi,
              border: `1px solid ${T.gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="face" size={14} color={T.gold} />
          </div>
          <div onClick={bye} style={{ cursor: "pointer", color: T.crimson }}>
            <Icon name="logout" size={14} color={T.crimson} />
          </div>
        </div>
      </aside>
    );

  // ── Expanded state ──────────────────────────────────────────
  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100%",
        width: 320,
        background: "rgba(10,10,30,0.65)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 0 20px rgba(255,214,10,0.08)",
        display: "flex",
        flexDirection: "column",
        padding: 24,
        zIndex: 30,
        transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: T.gold,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
            }}
          >
            POLYNOUS
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10,
              color: T.textMid,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.7,
            }}
          >
            Cerebral Vitality Engine
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: T.textDim,
            cursor: "pointer",
            padding: 4,
            marginLeft: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.textDim)}
        >
          <Icon name="chevron_left" size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "hidden",
        }}
      >
        {NAV.map(({ icon, label, path, active }) => (
          <div
            key={label}
            onClick={() => go(path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 9999,
              cursor: "pointer",
              color: active ? T.gold : T.textMid,
              background: active ? `rgba(255,214,10,0.15)` : "transparent",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = T.gold;
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = T.textMid;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Icon
              name={icon}
              size={20}
              color="inherit"
              style={{ flexShrink: 0 }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
          </div>
        ))}
      </nav>

      {/* Bottom actions (user, logout, new research) */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 24,
          marginTop: 24,
        }}
      >
        <button
          onClick={() => go("/research")}
          style={{
            width: "100%",
            padding: 12,
            background: T.gold,
            color: "#0A0A1E",
            fontWeight: 700,
            borderRadius: 9999,
            border: "none",
            cursor: "pointer",
            fontFamily: "'Sora',sans-serif",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Icon name="add" size={18} color="#0A0A1E" /> New Research
        </button>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: T.surfaceHi,
              border: `1px solid ${T.gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="face" size={22} color={T.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.username || "Guest"}
            </p>
            <button
              onClick={bye}
              style={{
                fontSize: 10,
                color: T.crimson,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono',monospace",
                padding: 0,
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── API layer ────────────────────────────────────────────────────────────────
const BASE = API_BASE_URL;
const apiFetch = async (path, opts = {}) => {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};
const apiUpload = file => { const f = new FormData(); f.append("file", file); return apiFetch("/pdfs/upload", { method:"POST", body:f }); };
const apiProgress = name => apiFetch(`/pdfs/progress?filename=${encodeURIComponent(name)}`);
const apiList = () => apiFetch("/pdfs/list");
const apiAsk = (query, pdf) => apiFetch(`/pdfs/ask?query=${encodeURIComponent(query)}${pdf?`&pdf_name=${encodeURIComponent(pdf)}`:""}`, { method:"POST" });
const apiSearch = (query, pdf) => apiFetch(`/pdfs/search?query=${encodeURIComponent(query)}&top_k=5${pdf?`&pdf_name=${encodeURIComponent(pdf)}`:""}`);

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingDots({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:10, background:"rgba(255,214,10,0.04)", border:`1px solid ${T.borderGold}`, marginTop:14 }}>
      <div style={{ display:"flex", gap:4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:T.gold, animation:`dotPulse 1.2s ${i*0.2}s infinite` }} />)}
      </div>
      <span style={{ fontFamily:T.mono, fontSize:12, color:T.gold }}>{label}</span>
    </div>
  );
}

function SkeletonLines({ n = 4 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9, marginTop:14 }}>
      {Array.from({ length:n }, (_, i) => (
        <div key={i} className="shimmer-line" style={{ height:15, width:`${[88,72,80,65][i%4]}%` }} />
      ))}
    </div>
  );
}

// ─── RAG answer ───────────────────────────────────────────────────────────────
function RagAnswer({ text, confidence, sources, onCopy }) {
  const displayed = useTypewriter(text, 7);
  const confCol = confidence >= 80 ? T.green : confidence >= 55 ? T.gold : T.crimson;

  return (
    <div style={{ animation:"fadeUp 0.35s ease", marginTop:20 }}>
      <div style={{ background:"rgba(255,214,10,0.04)", border:`1px solid ${T.borderGold}`, borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:13 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:T.gold, boxShadow:`0 0 8px ${T.gold}`, animation:"pulse 2s infinite" }} />
          <span style={{ fontFamily:T.mono, fontSize:10, color:T.gold, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" }}>AI Response</span>
        </div>
        <p style={{ fontFamily:T.body, fontSize:15, color:"#d4e0ec", lineHeight:1.82, whiteSpace:"pre-wrap" }}>{displayed}</p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontFamily:T.mono, fontSize:11, color:T.textDim }}>Relevance</span>
        <div style={{ width:100, height:5, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
          <div style={{ width:`${confidence}%`, height:"100%", background:confCol, borderRadius:3, transition:"width 0.6s ease" }} />
        </div>
        <span style={{ fontFamily:T.mono, fontSize:11, color:confCol, fontWeight:700 }}>{Math.round(confidence)}%</span>
        <button onClick={onCopy} className="btn-ghost" style={{
          marginLeft:"auto", padding:"5px 14px", borderRadius:20, border:`1px solid ${T.border}`,
          background:"transparent", color:T.textMid, fontFamily:T.mono, fontSize:11,
        }}>📋 Copy</button>
      </div>

      {sources?.length > 0 && (
        <div style={{ background:"rgba(0,0,0,0.18)", borderRadius:12, border:`1px solid ${T.border}`, padding:"13px 15px" }}>
          <div style={{ fontFamily:T.mono, fontSize:10, color:T.gold, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:9 }}>
            Source chunks · {sources.length}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {sources.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 11px", borderRadius:8, background:"rgba(255,255,255,0.025)" }}>
                <span style={{ fontFamily:T.mono, fontSize:10, color:T.gold, background:"rgba(255,214,10,0.1)", padding:"1px 9px", borderRadius:5, flexShrink:0 }}>
                  #{s.chunk_id !== undefined ? s.chunk_id : s.chunk_index ?? i+1}
                </span>
                <span style={{ fontFamily:T.body, fontSize:12, color:T.textMid, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.pdf_name}</span>
                <span style={{ fontFamily:T.mono, fontSize:11, fontWeight:700, color: s.relevance >= 70 ? T.green : T.textDim }}>{s.relevance}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode banner ──────────────────────────────────────────────────────────────
function ModeBanner({ mode }) {
  const cfg = {
    ask:   { col:T.gold, bg:"rgba(255,214,10,0.05)", border:T.borderGold, icon:"auto_awesome", title:"Retrieval-Augmented Generation", desc:"Finds the most relevant passages in your PDFs, then passes them to an LLM for a grounded, cited answer. Nothing from the web." },
    search:{ col:T.cyan, bg:"rgba(0,212,255,0.05)", border:"rgba(0,212,255,0.2)", icon:"travel_explore", title:"Semantic Vector Search", desc:"Converts your query to a vector and finds the closest matching chunks by meaning — not just keywords. Fast, no LLM overhead." },
  }[mode];
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:13, padding:"14px 18px", marginBottom:18, display:"flex", gap:13, alignItems:"flex-start" }}>
      <Icon name={cfg.icon} size={20} color={cfg.col} style={{ marginTop:2, flexShrink:0 }} />
      <div>
        <div style={{ fontFamily:T.display, fontWeight:700, fontSize:14, color:cfg.col, marginBottom:5 }}>{cfg.title}</div>
        <div style={{ fontFamily:T.body, fontSize:13, color:T.textMid, lineHeight:1.7 }}>{cfg.desc}</div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const id = setTimeout(onClose, 3600); return () => clearTimeout(id); } }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, right:28, zIndex:100,
      background:T.surfaceHi, border:`1px solid ${T.borderGold}`, borderRadius:10,
      padding:"11px 20px", color:T.gold, fontFamily:T.mono, fontSize:13, fontWeight:600,
      backdropFilter:"blur(14px)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
      animation:"fadeUp 0.3s ease",
    }}>{msg}</div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PDFNeuralLab({ user, onNavigate, onLogout }) {
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [tab, setTab] = useState("ask");
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarnings, setUploadWarnings] = useState([]);

  const [askQuery, setAskQuery] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askAnswer, setAskAnswer] = useState(null);
  const [conversation, setConversation] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [toast, setToast] = useState("");

  const fileRef = useRef(null);
  const notify = msg => setToast(msg);

  useEffect(() => { fetchPdfs(); }, []);

  const fetchPdfs = async () => {
    try { const d = await apiList(); setPdfs(d.pdfs || []); } catch {}
  };

  const triggerUpload = async file => {
    // Reset states
    setUploadError("");
    setUploadWarnings([]);
    
    // ─── VALIDATE FILE (merged from PdfUpload) ─────────────────
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setUploadError(validationErrors[0]);
      notify(`❌ ${validationErrors[0]}`);
      return;
    }

    setUploading(true); setUploadPct(0); setUploadMsg("Uploading…");
    let poll;
    try {
      const up = apiUpload(file);
      poll = setInterval(async () => {
        try {
          const d = await apiProgress(file.name);
          const pct = Math.max(d.extraction||0, d.embedding||0, d.storing||0);
          setUploadPct(pct);
          if      (d.status === "extracting") setUploadMsg("Extracting text…");
          else if (d.status === "chunking")   setUploadMsg("Chunking document…");
          else if (d.status === "embedding")  setUploadMsg("Building embeddings…");
          else if (d.status === "complete")   { setUploadPct(100); setUploadMsg("Done!"); clearInterval(poll); }
          else if (d.status === "error")      { setUploadMsg("Processing failed."); clearInterval(poll); }
        } catch {}
      }, 500);
      const data = await up;
      clearInterval(poll);
      setUploadPct(100);
      setUploadMsg(data.message || `✓ Indexed ${data.total_chunks ?? "?"} chunks`);
      
      // Handle warnings from server
      if (data.warnings?.length > 0) {
        setUploadWarnings(data.warnings);
      }
      
      notify(`✓ "${file.name}" is ready`);
      await fetchPdfs();
    } catch (err) {
      if (poll) clearInterval(poll);
      setUploadMsg("Upload failed — is the server running?");
      setUploadError("Connection error. Is backend running?");
      notify("✗ Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFileChange = e => { if (e.target.files[0]) triggerUpload(e.target.files[0]); };
  const onDrop = e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) triggerUpload(e.dataTransfer.files[0]); };

  const askPdf = async () => {
    const q = askQuery.trim(); if (!q || askLoading) return;
    setAskLoading(true); setAskAnswer(null); setAskQuery("");
    setConversation(prev => [...prev, { role:"user", content:q }]);
    try {
      const data = await apiAsk(q, selectedPdf);
      const res = { text: data.answer || "No answer found.", sources: data.sources || [], confidence: data.confidence || 0 };
      setAskAnswer(res);
      setConversation(prev => [...prev, { role:"assistant", ...res }]);
    } catch {
      const res = { text:"Failed to get answer — is the server running?", sources:[], confidence:0 };
      setAskAnswer(res);
    } finally { setAskLoading(false); }
  };

  const doSearch = async () => {
    const q = searchQuery.trim(); if (!q || searchLoading) return;
    setSearchLoading(true); setSearchResults([]); setSearchError("");
    try {
      const data = await apiSearch(q, selectedPdf);
      const chunks = data.results || data.chunks || [];
      setSearchResults(chunks);
      if (!chunks.length) setSearchError("No results found for that query.");
    } catch { setSearchError("Search failed — is the server running?"); }
    finally { setSearchLoading(false); }
  };

  const sidebarW = sbCollapsed ? 56 : 320;
  const suggestions = ["Summarise this document","What are the key findings?","List main topics covered","Extract important dates and numbers"];

  return (
    <div style={{ minHeight:"100vh", background:T.void, position:"relative" }}>
      <style>{GLOBAL_CSS}</style>
      <NeuralBg />
      <Sidebar user={user} onNavigate={onNavigate} onLogout={onLogout} collapsed={sbCollapsed} setCollapsed={setSbCollapsed} />

      <main style={{
        marginLeft:sidebarW, padding:"28px 36px 80px",
        position:"relative", zIndex:10,
        transition:"margin-left 0.35s cubic-bezier(0.4,0,0.2,1)",
        minHeight:"100vh",
      }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>

          {/* ── HERO ─────────────────────────────────────────── */}
          <section style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:32, flexWrap:"wrap", marginBottom:52, paddingTop:8,
            animation:"fadeUp 0.5s ease",
          }}>
            {/* Left copy */}
            <div style={{ flex:"1 1 360px", position:"relative" }}>

              {/* Animated light streak behind headline */}
              <div style={{
                position:"absolute", top:"38%", left:"-8%", width:"116%", height:3,
                background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.55) 45%,rgba(255,214,10,0.35) 55%,transparent 100%)",
                transform:"rotate(-7deg)",
                pointerEvents:"none",
                animation:"lightStreak 4s ease-in-out infinite",
                animationDelay:"1.2s",
              }} />
              {/* Static decorative underline */}
              <div style={{
                position:"absolute", top:"44%", left:"-6%", width:"112%", height:1.5,
                background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                transform:"rotate(-7deg)",
                pointerEvents:"none",
              }} />

              <h1 style={{
                fontFamily:T.display, fontWeight:800,
                fontSize:"clamp(46px,6.9vw,96px)",
                lineHeight:0.93, letterSpacing:"-0.03em",
                transform:"skewX(-7deg)", position:"relative", zIndex:1,
                display:"flex", flexDirection:"column", gap:4,
              }}>
                <span style={{ color:"#fff" }}>YOUR PDF.</span>
                <span style={{
                  color:T.gold,
                  animation:"smGlow 3s ease-in-out infinite",
                }}>SMARTER</span>
                <span style={{ color:"#fff" }}>INSIGHTS.</span>
              </h1>

              {/* Subtitle */}
              <p style={{
                fontFamily:T.body, fontSize:15, color:"#c8d8e8",
                lineHeight:1.78, maxWidth:390, marginTop:24,
                borderLeft:`2px solid ${T.borderGold}`, paddingLeft:16,
                opacity:0.92,
              }}>
                Upload your documents and let AI turn them into knowledge you can query, explore, and trust.
              </p>

              {/* CTA buttons */}
              <div style={{ display:"flex", gap:12, marginTop:28, flexWrap:"wrap" }}>
                <button
                  className="cta-primary"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"12px 26px", borderRadius:9999, border:"none",
                    background:T.gold, color:"#04090f",
                    fontFamily:T.display, fontWeight:700, fontSize:14,
                    cursor:"pointer",
                    boxShadow:"0 4px 20px rgba(255,214,10,0.22)",
                  }}
                >
                  <Icon name="upload_file" size={16} color="#04090f" />
                  Upload PDF
                </button>
                <button
                  className="cta-secondary"
                  onClick={() => document.querySelector(".how-it-works-anchor")?.scrollIntoView({ behavior:"smooth" })}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"12px 26px", borderRadius:9999,
                    border:"1px solid rgba(255,255,255,0.14)",
                    background:"rgba(255,255,255,0.04)",
                    backdropFilter:"blur(10px)",
                    color:T.textMid,
                    fontFamily:T.display, fontWeight:600, fontSize:14,
                    cursor:"pointer",
                  }}
                >
                  <Icon name="play_circle" size={16} color={T.textMid} />
                  View Demo
                </button>
              </div>
            </div>

            {/* Right canvas */}
            <div style={{ flex:"1 1 340px", display:"flex", justifyContent:"center", position:"relative", marginTop:-50 }}>
              <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at center,rgba(255,214,10,0.09) 0%,transparent 65%)", pointerEvents:"none" }} />
              <DocCanvas3D uploading={uploading} />
            </div>
          </section>

          {/* hidden anchor for "View Demo" scroll target */}
          <div className="how-it-works-anchor" style={{ height:0 }} />

          {/* ── HOW IT WORKS ─────────────────────────────────── */}
          <HowItWorks />

          {/* ── UPLOAD ZONE ──────────────────────────────────── */}
          <section
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border:`2px dashed ${drag ? T.gold : uploadError ? T.crimson : T.borderGold}`,
              borderRadius:20, padding:"52px 28px",
              background: drag ? "rgba(255,214,10,0.04)" : uploadError ? "rgba(255,32,64,0.03)" : T.surface,
              backdropFilter:"blur(14px)", textAlign:"center",
              cursor: uploading ? "default" : "pointer",
              transform: drag ? "scale(1.012)" : "scale(1)",
              transition:"all 0.22s", marginBottom:26,
              animation: uploadError ? "none" : "borderGlow 3s infinite ease-in-out",
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={onFileChange} />
            <div style={{ width:76, height:76, borderRadius:"50%", background:"rgba(255,214,10,0.12)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
              <Icon name={uploading ? "hourglass_top" : "upload_file"} size={38} color={uploadError ? T.crimson : T.gold} />
            </div>
            <h2 style={{ fontFamily:T.display, fontWeight:800, fontSize:18, color:"#fff", marginBottom:8, letterSpacing:"0.01em" }}>
              {uploading ? "Processing document…" : "Drop your PDF here or click to browse"}
            </h2>
            <p style={{ fontFamily:T.body, fontSize:14, color:T.textMid, marginBottom:24 }}>
              Upload research papers, reports, or any PDF document
            </p>

            {uploadError && (
              <div style={{
                padding:"12px 16px", borderRadius:12,
                background:"rgba(255,32,64,0.1)", border:"1px solid rgba(255,32,64,0.3)",
                color:"#ff2040", fontSize:13, marginBottom:12, maxWidth:420, margin:"0 auto 12px",
              }}>
                ❌ {uploadError}
              </div>
            )}

            {uploadWarnings.length > 0 && (
              <div style={{
                padding:"12px 16px", borderRadius:12,
                background:"rgba(255,170,0,0.1)", border:"1px solid rgba(255,170,0,0.3)",
                color:"#ffaa00", fontSize:12, marginBottom:12, maxWidth:420, margin:"0 auto 12px",
              }}>
                <div style={{ fontWeight:600, marginBottom:6 }}>⚠️ Warnings:</div>
                {uploadWarnings.map((w, i) => (
                  <div key={i} style={{ marginTop:4 }}>• {w}</div>
                ))}
              </div>
            )}

            {uploading ? (
              <div style={{ maxWidth:420, margin:"0 auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, fontFamily:T.mono, fontSize:12, color:T.textMid }}>
                  <span>{uploadMsg}</span><span>{Math.round(uploadPct)}%</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                  <div style={{ width:`${uploadPct}%`, height:"100%", background:`linear-gradient(90deg,${T.gold},${T.green})`, borderRadius:3, transition:"width 0.4s ease" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontFamily:T.mono, fontSize:11 }}>
                  {[["extracting","Extract"],["chunking","Chunk"],["embedding","Embed"],["complete","Done"]].map(([stage, label]) => (
                    <span key={stage} style={{ color: uploadPct >= {extracting:20,chunking:50,embedding:80,complete:100}[stage] ? T.green : T.textDim, transition:"color 0.3s" }}>{label}</span>
                  ))}
                </div>
              </div>
            ) : uploadMsg ? (
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 20px", borderRadius:20, background:"rgba(255,214,10,0.07)", border:`1px solid ${T.borderGold}`, color:T.gold, fontFamily:T.mono, fontSize:13 }}>
                {uploadMsg}
              </div>
            ) : (
              <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
                {[["lock","Secure & private"],["description","Any PDF"],["bolt","Fast processing"]].map(([icon, label]) => (
                  <div key={icon} style={{ display:"flex", alignItems:"center", gap:7, color:T.textDim, fontFamily:T.mono, fontSize:12 }}>
                    <Icon name={icon} size={14} color={T.textDim} /> {label}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              padding:"10px 14px", borderRadius:8,
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
              fontSize:10, color:"#555", maxWidth:480, margin:"16px auto 0",
            }}>
              🔒 Files are scanned for malware, validated for PDF authenticity, and checked for embedded scripts
            </div>
          </section>

          {/* ── LIBRARY ──────────────────────────────────────── */}
          {pdfs.length > 0 && (
            <section style={{ marginBottom:26 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h3 style={{ fontFamily:T.display, fontWeight:700, fontSize:16, color:"#fff" }}>Knowledge Library</h3>
                <span style={{ fontFamily:T.mono, fontSize:12, color:T.textDim }}>{pdfs.length} doc{pdfs.length!==1?"s":""}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {pdfs.map((pdf, i) => {
                  const sel = selectedPdf === pdf.pdf_name;
                  return (
                    <div key={i} className="doc-card" onClick={() => setSelectedPdf(sel ? null : pdf.pdf_name)} style={{
                      background: sel ? "rgba(255,214,10,0.06)" : T.surface,
                      backdropFilter:"blur(14px)",
                      border: `1px solid ${sel ? "rgba(255,214,10,0.35)" : T.border}`,
                      borderRadius:13, padding:"16px", cursor:"pointer",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
                        <Icon name="picture_as_pdf" size={24} color={T.gold} />
                        <span style={{ fontFamily:T.mono, fontSize:10, color:T.green, background:"rgba(0,255,106,0.1)", padding:"2px 9px", borderRadius:9 }}>Ready</span>
                      </div>
                      <div style={{ fontFamily:T.body, fontSize:13, color:"#d0dce8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{pdf.pdf_name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:11, color:T.textDim }}>{pdf.total_chunks ?? "?"} chunks</div>
                    </div>
                  );
                })}
              </div>
              {selectedPdf && (
                <p style={{ fontFamily:T.mono, fontSize:12, color:T.gold, marginTop:10 }}>Scoped to: {selectedPdf}</p>
              )}
            </section>
          )}

          {/* ── QUERY TABS ────────────────────────────────────── */}
          <div style={{ display:"flex", gap:6, marginBottom:18 }}>
            {[["ask","auto_awesome","Ask (RAG)"],["search","travel_explore","Semantic Search"]].map(([t, icon, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                display:"flex", alignItems:"center", gap:7, padding:"9px 20px",
                borderRadius:9999, border:`1px solid ${tab===t ? T.gold : T.border}`,
                background: tab===t ? T.gold : "rgba(255,255,255,0.03)",
                color: tab===t ? "#04090f" : T.textMid,
                fontFamily:T.mono, fontSize:13, fontWeight: tab===t ? 700 : 400,
                cursor:"pointer", transition:"all 0.2s",
              }}>
                <Icon name={icon} size={15} color={tab===t ? "#04090f" : T.textMid} />
                {label}
              </button>
            ))}
          </div>

          {/* ── ASK TAB ───────────────────────────────────────── */}
          {tab === "ask" && (
            <div style={{ display:"flex", flexDirection:"column", gap:22, paddingBottom:60 }}>
              <ModeBanner mode="ask" />
              <div style={{ background:T.surface, backdropFilter:"blur(16px)", border:`1px solid ${T.borderGold}`, borderRadius:16, padding:24 }}>
                <div style={{ display:"flex", gap:10 }}>
                  <input
                    value={askQuery} onChange={e => setAskQuery(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && !e.shiftKey && askPdf()}
                    placeholder="Ask anything about your documents…"
                    style={{
                      flex:1, padding:"14px 20px", borderRadius:30,
                      border:`1px solid ${askLoading ? T.borderGold : T.border}`,
                      background:"rgba(10,10,30,0.8)", color:"#fff",
                      fontSize:15, transition:"border-color 0.2s",
                    }}
                  />
                  <button onClick={askPdf} disabled={askLoading || !askQuery.trim()} className="btn-primary" style={{
                    padding:"14px 26px", borderRadius:30, border:"none",
                    background: askLoading || !askQuery.trim() ? "rgba(255,214,10,0.25)" : T.gold,
                    color:"#04090f", fontWeight:700, fontFamily:T.display, fontSize:14,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6, minWidth:90,
                  }}>
                    {askLoading
                      ? <div className="spin" style={{ width:16,height:16,border:"2px solid #04090f",borderTopColor:"transparent",borderRadius:"50%" }} />
                      : <><Icon name="send" size={15} color="#04090f" />Ask</>
                    }
                  </button>
                </div>

                <div style={{ marginTop:16 }}>
                  <span style={{ fontFamily:T.mono, fontSize:10, color:T.textDim, letterSpacing:"0.1em", textTransform:"uppercase" }}>Try asking:</span>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:9 }}>
                    {suggestions.map(s => (
                      <button key={s} className="suggest-chip" onClick={() => setAskQuery(s)} style={{
                        fontFamily:T.mono, fontSize:12, color:T.textMid,
                        border:`1px solid ${T.border}`, borderRadius:20,
                        padding:"6px 15px", background:"transparent", transition:"all 0.18s",
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                {askLoading && <><LoadingDots label="Retrieving and synthesising…" /><SkeletonLines n={5} /></>}
                {!askLoading && askAnswer && (
                  <RagAnswer text={askAnswer.text} confidence={askAnswer.confidence} sources={askAnswer.sources} onCopy={() => { navigator.clipboard.writeText(askAnswer.text); notify("Copied to clipboard"); }} />
                )}
              </div>

              {conversation.length > 0 && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <h3 style={{ fontFamily:T.display, fontWeight:700, fontSize:16, color:"#fff" }}>Conversation</h3>
                    <button onClick={() => setConversation([])} className="btn-ghost" style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${T.border}`, background:"transparent", color:T.textMid, fontFamily:T.mono, fontSize:11 }}>Clear</button>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {conversation.map((msg, i) => (
                      <div key={i} style={{
                        background: msg.role==="user" ? "rgba(0,255,106,0.04)" : "rgba(255,214,10,0.04)",
                        border: `1px solid ${msg.role==="user" ? "rgba(0,255,106,0.14)" : T.borderGold}`,
                        borderRadius:13, padding:"16px 20px", animation:"fadeUp 0.3s ease",
                      }}>
                        <div style={{ fontFamily:T.mono, fontSize:11, color: msg.role==="user" ? T.green : T.gold, marginBottom:9, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>
                          {msg.role==="user" ? "You" : "Polynous"}
                        </div>
                        <p style={{ fontFamily:T.body, fontSize:14, color:"#c8d8e8", lineHeight:1.78 }}>
                          {msg.content.slice(0,500)}{msg.content.length>500?"…":""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SEARCH TAB ───────────────────────────────────── */}
          {tab === "search" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:60 }}>
              <ModeBanner mode="search" />
              <div style={{ background:T.surface, backdropFilter:"blur(16px)", border:`1px solid ${T.borderGold}`, borderRadius:16, padding:24 }}>
                <div style={{ display:"flex", gap:10 }}>
                  <input
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && doSearch()}
                    placeholder="Search by meaning, not keywords…"
                    style={{ flex:1, padding:"14px 20px", borderRadius:30, border:`1px solid ${T.border}`, background:"rgba(10,10,30,0.8)", color:"#fff", fontSize:15 }}
                  />
                  <button onClick={doSearch} disabled={searchLoading || !searchQuery.trim()} className="btn-primary" style={{
                    padding:"14px 26px", borderRadius:30, border:"none",
                    background: searchLoading || !searchQuery.trim() ? "rgba(255,214,10,0.25)" : T.gold,
                    color:"#04090f", fontWeight:700, fontFamily:T.display, fontSize:14,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6, minWidth:100,
                  }}>
                    {searchLoading
                      ? <div className="spin" style={{ width:16,height:16,border:"2px solid #04090f",borderTopColor:"transparent",borderRadius:"50%" }} />
                      : <><Icon name="search" size={15} color="#04090f" />Search</>
                    }
                  </button>
                </div>
              </div>

              {searchLoading && <><LoadingDots label="Scanning embedding space…" /><SkeletonLines n={6} /></>}
              {!searchLoading && searchError && (
                <p style={{ fontFamily:T.body, fontSize:14, color:T.textMid, textAlign:"center", padding:28 }}>{searchError}</p>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {searchResults.map((chunk, i) => (
                    <div key={i} style={{ background:T.surface, backdropFilter:"blur(14px)", border:`1px solid ${T.border}`, borderRadius:13, padding:"20px", animation:"fadeUp 0.3s ease" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <span style={{ fontFamily:T.mono, fontSize:10, color:T.gold, background:"rgba(255,214,10,0.08)", padding:"2px 10px", borderRadius:9 }}>
                            Chunk #{chunk.chunk_id ?? i+1}
                          </span>
                          {chunk.pdf_name && <span style={{ fontFamily:T.body, fontSize:12, color:T.textDim }}>{chunk.pdf_name}</span>}
                        </div>
                        {chunk.relevance != null && (
                          <span style={{ fontFamily:T.mono, fontSize:12, fontWeight:700, color: chunk.relevance>=70 ? T.green : chunk.relevance>=45 ? T.gold : T.crimson }}>{Math.round(chunk.relevance)}% match</span>
                        )}
                      </div>
                      <p style={{ fontFamily:T.body, fontSize:14, color:"#b8cad8", lineHeight:1.78 }}>
                        {(chunk.text || chunk.content || "").slice(0, 420)}{(chunk.text||chunk.content||"").length>420?"…":""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Toast msg={toast} onClose={() => setToast("")} />
    </div>
  );
}