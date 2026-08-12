import * as THREE from 'three'
import { API_BASE_URL } from '../config';
import { useState, useEffect, useRef, useCallback } from "react";
import ConstellationExplorer from "./react-bits/ConstellationExplorer";
import { makeTile } from "./react-bits/constellationTiles";
import DuplicatesPanel from "./react-bits/DuplicatesPanel";
import ResurfaceStrip from "./react-bits/ResurfaceStrip";

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (HTML file palette)
───────────────────────────────────────────── */
const C = {
  orange:        "#FF8C00",
  orangeDark:    "#B36200",
  orangeLight:   "#FFA94D",
  orangeGlow:    "rgba(255,140,0,0.18)",
  crimson:       "#ff2040",
  gold:          "#ffd700",
  void:          "#0A0A1E",
  panel:         "#12122b",
  border:        "#33334d",
  surface:       "rgba(10,10,30,0.65)",
  surfaceHigh:   "rgba(40,40,61,0.65)",
  text:          "#E0E0E0",
  textMuted:     "#8888a0",
  white10:       "rgba(255,255,255,0.10)",
  white5:        "rgba(255,255,255,0.05)",
  fontDisplay:   "'Teko',sans-serif",
  fontMono:      "'JetBrains Mono',monospace",
  fontBody:      "'Inter',sans-serif",
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES + FONTS
───────────────────────────────────────────── */
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { background: #0A0A1E; color: #E0E0E0; font-family: 'JetBrains Mono', monospace; overflow-x: hidden; }

      /* Scrollbar */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #0A0A1E; }
      ::-webkit-scrollbar-thumb { background: #33334d; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #FF8C00; }

      /* Keyframes */
      @keyframes spin       { to { transform: rotate(360deg); } }
      @keyframes pulseGlow  { 0%,100%{box-shadow:0 0 6px rgba(255,140,0,0.4)}50%{box-shadow:0 0 22px rgba(255,140,0,0.9)} }
      @keyframes fadeUp     { from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn     { from{opacity:0}to{opacity:1} }
      @keyframes ping       { 0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0} }
      @keyframes pulseText  { 0%,100%{opacity:0.55}50%{opacity:1} }
      @keyframes slideRight { from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)} }
      @keyframes strandPulse{ 0%,100%{opacity:0.15}50%{opacity:0.55} }
      button:focus-visible, [role="button"]:focus-visible, a:focus-visible { outline:2px solid #FF8C00; outline-offset:2px; }
      @media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important;} }

      /* Scroll-triggered reveals */
      .reveal {
        opacity: 0;
        transform: translateY(32px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      .reveal.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .reveal-left {
        opacity: 0;
        transform: translateX(-24px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      .reveal-left.visible {
        opacity: 1;
        transform: translateX(0);
      }

      /* Clip path card */
      .card-clip {
        clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
      }

      /* Particle dot bg */
      .particle-dots {
        background-image: radial-gradient(rgba(255,140,0,0.28) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0.28;
      }

      /* Text glow */
      .text-glow {
        text-shadow: 0 0 30px rgba(255,140,0,0.65);
      }

      /* Border glow utility */
      .border-glow {
        border: 1px solid rgba(255,140,0,0.28);
        box-shadow: inset 0 0 12px rgba(255,140,0,0.08), 0 0 12px rgba(255,140,0,0.08);
      }

      /* Hover lift */
      .lift:hover { transform: translateY(-3px); transition: transform 0.25s ease; }

      /* Nav active left bar */
      .nav-active::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 3px;
        background: #FF8C00;
        border-radius: 0 2px 2px 0;
      }
    `}</style>
  );
}

/* ─────────────────────────────────────────────
   MATERIAL SYMBOL ICON
───────────────────────────────────────────── */
function Icon({ name, style: s }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block",
      ...(s || {})
    }}>{name}</span>
  );
}

/* ─────────────────────────────────────────────
   THREE.JS NEURAL STRAND CANVAS  (from HTML)
───────────────────────────────────────────── */
function NeuralStrandCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    let THREE;
    let animId;
    let renderer;

    const load = async () => {
      try {
        THREE = (await import("three")).default || (await import("three"));
      } catch (_) {
        return;
      }

      const container = mountRef.current;
      if (!container) return;
      const width  = container.clientWidth  || window.innerWidth;
      const height = 480;

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 100;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const primaryColor = 0xff8c00;
      const strandCount  = 25;
      const pointsPer    = 100;
      const strands      = [];

      for (let i = 0; i < strandCount; i++) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(pointsPer * 3);
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        
        const mat = new THREE.LineBasicMaterial({
          color: primaryColor,
          transparent: true,
          opacity: 0.35 + Math.random() * 0.55,
          blending: THREE.AdditiveBlending,
        });
        
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        strands.push({
          line,
          offset:    Math.random() * Math.PI * 2,
          speed:     0.0003 + Math.random() * 0.0006,
          amplitude: 10 + Math.random() * 20,
          frequency: 0.01 + Math.random() * 0.015,
          yOffset:   (Math.random() - 0.5) * 60,
          zOffset:   (Math.random() - 0.5) * 50,
        });
      }

      const glowStrands = [];
      for (let i = 0; i < Math.floor(strandCount / 2); i++) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(pointsPer * 3);
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        
        const mat = new THREE.LineBasicMaterial({
          color: primaryColor,
          transparent: true,
          opacity: 0.08 + Math.random() * 0.12,
          blending: THREE.AdditiveBlending,
        });
        
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        glowStrands.push({
          line,
          offset:    Math.random() * Math.PI * 2,
          speed:     0.0003 + Math.random() * 0.0006,
          amplitude: 12 + Math.random() * 22,
          frequency: 0.01 + Math.random() * 0.015,
          yOffset:   (Math.random() - 0.5) * 60,
          zOffset:   (Math.random() - 0.5) * 50,
        });
      }

      const pCount = 400;
      const pGeo   = new THREE.BufferGeometry();
      const pPos   = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i*3]   = (Math.random()-0.5)*500;
        pPos[i*3+1] = (Math.random()-0.5)*300;
        pPos[i*3+2] = (Math.random()-0.5)*200;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      
      const pMat  = new THREE.PointsMaterial({ 
        color: primaryColor, 
        size: 0.8,
        transparent: true, 
        opacity: 0.25,
        blending: THREE.AdditiveBlending 
      });
      const dust  = new THREE.Points(pGeo, pMat);
      scene.add(dust);

      const animate = () => {
        const time = Date.now() * 0.001;
        
        strands.forEach(s => {
          const pos = s.line.geometry.attributes.position.array;
          for (let j = 0; j < pointsPer; j++) {
            const x = (j - pointsPer/2) * 5;
            pos[j*3]   = x;
            pos[j*3+1] = Math.sin(x*s.frequency + time + s.offset) * s.amplitude + s.yOffset;
            pos[j*3+2] = Math.cos(x*s.frequency*0.5 + time + s.offset) * (s.amplitude*0.5) + s.zOffset;
          }
          s.line.geometry.attributes.position.needsUpdate = true;
          s.line.rotation.y += s.speed;
        });
        
        glowStrands.forEach(s => {
          const pos = s.line.geometry.attributes.position.array;
          for (let j = 0; j < pointsPer; j++) {
            const x = (j - pointsPer/2) * 5;
            pos[j*3]   = x + 0.5;
            pos[j*3+1] = Math.sin(x*s.frequency + time + s.offset) * s.amplitude + s.yOffset + 0.3;
            pos[j*3+2] = Math.cos(x*s.frequency*0.5 + time + s.offset) * (s.amplitude*0.5) + s.zOffset;
          }
          s.line.geometry.attributes.position.needsUpdate = true;
          s.line.rotation.y += s.speed;
        });
        
        dust.rotation.y += 0.00008;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };

      const onResize = () => {
        const w = container.clientWidth || window.innerWidth;
        camera.aspect = w / 480;
        camera.updateProjectionMatrix();
        renderer.setSize(w, 480);
      };
      window.addEventListener("resize", onResize);
      animate();
    };

    load();

    return () => {
      cancelAnimationFrame(animId);
      if (renderer && mountRef.current) {
        try { mountRef.current.removeChild(renderer.domElement); } catch(_){}
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 480, zIndex: 0, pointerEvents: "none",
        maskImage: "linear-gradient(to bottom,black 55%,transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom,black 55%,transparent 100%)",
        overflow: "hidden",
      }}
    >
      <div className="particle-dots" style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION ITEMS
═══════════════════════════════════════════════════════════════ */
const NAV = [
  { icon: "travel_explore",  label: "Research",        path: "/research" },
  { icon: "forum",           label: "Debate Chamber",  path: "/debate"   },
  { icon: "account_tree",    label: "Knowledge Graph", path: "/graph"    },
  { icon: "search",          label: "Semantic Search", path: "/search"   },
  { icon: "database",        label: "Memory Bank",     path: "/memory",  active: true  },
  { icon: "picture_as_pdf",  label: "PDF Lab",         path: "/pdf-lab"  },
  { icon: "monitoring",      label: "Analytics",       path: "/analytics"},
  { icon: "settings",        label: "Settings",        path: "/settings" },
  { icon: "help", label: "Help", path: "/info" },
];

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR  (exact structure from doc 1, orange-themed)
═══════════════════════════════════════════════════════════════ */
function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go  = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
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
            color: C.orange,
            cursor: "pointer",
            marginBottom: 32,
          }}
        >
          <Icon name="chevron_right" style={{ fontSize: 22 }} />
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
              color: active ? C.orange : C.textMuted,
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
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
              background: C.orange,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="add" style={{ fontSize: 16, color: C.void }} />
          </div>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#1e1e32",
              border: "1px solid rgba(255,140,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="face" style={{ color: C.orange, fontSize: 14 }} />
          </div>
          <div onClick={bye} style={{ cursor: "pointer", color: C.crimson }}>
            <Icon name="logout" style={{ fontSize: 14 }} />
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
        boxShadow: "0 0 20px rgba(255,140,0,0.08)",
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
              color: C.orange,
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
              color: C.textMuted,
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
            color: C.textMuted,
            cursor: "pointer",
            padding: 4,
            marginLeft: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
        >
          <Icon name="chevron_left" style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="pn-stagger"
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
              color: active ? C.orange : C.textMuted,
              background: active ? "rgba(255,140,0,0.15)" : "transparent",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.orange;
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.textMuted;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Icon
              name={icon}
              style={{ fontSize: 20, color: "inherit", flexShrink: 0 }}
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
            background: C.orange,
            color: C.void,
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
          <Icon name="add" style={{ fontSize: 18, color: C.void }} /> New Research
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
              background: "#1e1e32",
              border: "1px solid rgba(255,140,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="face" style={{ color: C.orange, fontSize: 22 }} />
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
                color: C.crimson,
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

/* ─────────────────────────────────────────────
   METRIC CARD  (HTML design, clip-path style)
───────────────────────────────────────────── */
function MetricCard({ value, label, sub, icon, delay = 0 }) {
  return (
    <div className="reveal border-glow card-clip lift"
      style={{
        background:"linear-gradient(180deg,rgba(255,140,0,0.06) 0%,rgba(10,10,30,0.85) 100%)",
        padding:"28px 20px", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", minHeight:140,
        position:"relative", animationDelay:`${delay}ms`, cursor:"default",
        transition:"box-shadow 0.25s",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.35)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow=""}
    >
      {icon && (
        <Icon name={icon} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                                    fontSize:11, color: C.orange, opacity:0.45 }} />
      )}
      <div style={{ fontFamily: C.fontDisplay, fontSize:52, fontWeight:700, color:"#fff", lineHeight:1 }}>
        {value}
      </div>
      <div style={{ fontFamily: C.fontMono, fontSize:10, color: C.textMuted,
                    textTransform:"uppercase", letterSpacing:"0.15em", marginTop:6 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: C.fontMono, fontSize:10, color: C.orange, marginTop:6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUGGESTION DATA  (from JSX file, verbatim)
───────────────────────────────────────────── */
const RESEARCH_PATHS    = ["Deep Learning Neural Architectures","Quantum Machine Learning","CRISPR Gene Editing","Blockchain Consensus","Fusion Energy Breakthroughs","Autonomous Vehicle Safety","Synthetic Biology Ethics","Neuromorphic Computing"];
const NEW_DOMAINS       = ["Space Colonization Ethics","Ocean Floor Mining","Quantum Biology Frontiers","Atmospheric Carbon Capture","Brain-Computer Interfaces","Lab-Grown Meat Production","Asteroid Mining Economics","Digital Consciousness"];
const DEBATE_CHALLENGES = ["Should AI be regulated globally?","Is nuclear energy the solution?","Should we colonize Mars?","Are cryptocurrencies the future?","Should genetic engineering be allowed?","Is UBI economically viable?"];

const shuffle = arr => { const s=[...arr]; for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} return s; };

const getRandomSuggestions = () => {
  const r = shuffle(RESEARCH_PATHS);
  const d = shuffle(NEW_DOMAINS);
  const db= shuffle(DEBATE_CHALLENGES);
  return [
    { type:"Research Path",   topic:r[0],  color: C.orange,  mode:"research", desc:"Based on your neural interest profile." },
    { type:"New Domain",      topic:d[0],  color: C.gold,    mode:"research", desc:"Your cognitive patterns suggest high affinity." },
    { type:"Debate Challenge",topic:db[0], color: C.crimson, mode:"debate",   desc:"High-entropy topic awaiting your perspective." },
  ];
};

/* ─────────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left");
    const io  = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function MemoryBank({ user, onNavigate, onLogout }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState(null);
  const [stats,       setStats]       = useState(null);
  const [interests,   setInterests]   = useState([]);
  const [history,     setHistory]     = useState([]);
  const [debates,     setDebates]     = useState([]);
  const [galaxyOpen,  setGalaxyOpen]  = useState(false);   // Research Galaxy (idea #3)
  const [dupOpen,     setDupOpen]     = useState(false);   // Phase F: dedup
  const [suggestions, setSuggestions] = useState(getRandomSuggestions());
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("All Activity");

  useScrollReveal();

  /* rotate suggestions every 5 s */
  useEffect(() => {
    const t = setInterval(() => setSuggestions(getRandomSuggestions()), 5000);
    return () => clearInterval(t);
  }, []);

  const handleTopicClick = (topic, mode) => {
    const dest = mode === "debate"
      ? `/debate?topic=${encodeURIComponent(topic)}`
      : `/research?query=${encodeURIComponent(topic)}`;
    onNavigate ? onNavigate(dest) : (window.location.href = dest);
  };

  /* ── API calls ── */
  const fetchAllData = useCallback(async () => {
  setLoading(true);
  try {
    // Get token from localStorage (most reliable source)
    const accessToken = localStorage.getItem('polynous_token');
    
    // If no token, try cookies or other sources
    if (!accessToken) {
      console.warn('⚠️ No auth token found - memory data will be empty');
      setStats({ total_research: 0, total_debates: 0, avg_confidence: 0, unique_topics: 0 });
      setInterests([]);
      setHistory([]);
      setDebates([]);
      setLoading(false);
      return;
    }

    console.log('🔑 Token found, fetching memory data...');
    
    const base = API_BASE_URL || 'http://localhost:8000';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const [statsRes, interestsRes, historyRes, debatesRes] = await Promise.all([
      fetch(`${base}/memory/stats`, { headers }),
      fetch(`${base}/memory/interests`, { headers }),
      fetch(`${base}/memory/history`, { headers }),
      fetch(`${base}/memory/debates`, { headers })
    ]);

    // Parse responses safely
    let statsData = { total_research: 0, total_debates: 0, avg_confidence: 0, unique_topics: 0 };
    let interestsData = { interests: [] };
    let historyData = { history: [] };
    let debatesData = { debates: [] };

    if (statsRes.ok) {
      try { statsData = await statsRes.json(); } catch(e) { console.error('Stats parse error:', e); }
    } else {
      console.warn('Stats endpoint returned:', statsRes.status);
    }

    if (interestsRes.ok) {
      try { interestsData = await interestsRes.json(); } catch(e) { console.error('Interests parse error:', e); }
    }

    if (historyRes.ok) {
      try { historyData = await historyRes.json(); } catch(e) { console.error('History parse error:', e); }
    }

    if (debatesRes.ok) {
      try { debatesData = await debatesRes.json(); } catch(e) { console.error('Debates parse error:', e); }
    }

    console.log('📊 Loaded stats:', statsData);
    console.log('📜 Loaded history:', historyData.history?.length, 'entries');
    console.log('🗣️ Loaded debates:', debatesData.debates?.length, 'entries');

    setStats(statsData);
    setInterests(interestsData.interests || []);
    setHistory(historyData.history || []);
    setDebates(debatesData.debates || []);
  } catch(e) {
    console.error('Memory load error:', e);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await fetchAllData();
      setSyncMsg("Neural map synced successfully.");
    } catch(_) {
      setSyncMsg("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  /* ── Grouped timeline ── */
  const groupedHistory = useCallback(() => {
    const g = {};
    history.forEach(h => {
      const d = h.timestamp
        ? new Date(h.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : "Unknown";
      if (!g[d]) g[d] = [];
      g[d].push({ ...h, kind:"research", query:h.query||"Untitled", mode:h.mode||"research", confidence:h.confidence||0 });
    });
    debates.forEach(d => {
      const date = d.timestamp
        ? new Date(d.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : "Unknown";
      if (!g[date]) g[date] = [];
      g[date].push({ query:d.topic||"Untitled Debate", mode:"debate",
                     confidence:Math.max(d.for_score||0, d.against_score||0)*10,
                     kind:"debate", debateData:d });
    });
    return g;
  }, [history, debates]);

  const getConfColor = v => v >= 80 ? C.orange : v >= 60 ? C.gold : C.crimson;

  const sidebarW = collapsed ? 56 : 320;
  const grouped  = groupedHistory();
  const TABS     = ["All Activity","Research","Debates"];

  const filteredGrouped = () => {
    if (activeTab === "All Activity") return grouped;
    if (activeTab === "Research") {
      const g = {};
      Object.entries(grouped).forEach(([d, items]) => {
        const f = items.filter(i => i.kind === "research");
        if (f.length) g[d] = f;
      });
      return g;
    }
    return {};
  };

  return (
    <div style={{ minHeight:"100vh", background: C.void, color: C.text, fontFamily: C.fontMono, overflowX:"hidden" }}>
      <Styles />

      <Sidebar
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Research Galaxy (idea #3): past sessions as an InfiniteMenu sphere. */}
      {history.length > 1 && (
        <button onClick={() => setGalaxyOpen(true)}
          style={{ position:"fixed", right:24, bottom:88, zIndex:60, display:"flex", alignItems:"center", gap:9, padding:"10px 16px", borderRadius:9999, cursor:"pointer",
            background:"rgba(10,10,26,0.75)", border:"1px solid rgba(0,230,184,0.3)", color:"#dff7f1", backdropFilter:"blur(18px)",
            fontFamily:C.fontMono, fontSize:11.5, fontWeight:700, letterSpacing:"0.04em", boxShadow:"0 0 20px -6px rgba(0,230,184,0.4)" }}>
          <span className="material-symbols-outlined" style={{ fontSize:17, color:"#00e6b8" }}>hub</span>
          Research Galaxy
        </button>
      )}
      {history.length > 1 && (
        <button onClick={() => setDupOpen(true)}
          style={{ position: "fixed", right: 24, bottom: 148, zIndex: 60, display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 9999, cursor: "pointer",
            background: "rgba(10,10,26,0.75)", border: "1px solid rgba(0,204,255,0.3)", color: "#dcf3ff", backdropFilter: "blur(18px)",
            fontFamily: C.fontMono, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", boxShadow: "0 0 20px -6px rgba(0,204,255,0.4)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#00ccff" }}>content_copy</span>
          Find duplicates
        </button>
      )}
      <DuplicatesPanel open={dupOpen} onClose={() => setDupOpen(false)} />

      <ConstellationExplorer
        open={galaxyOpen}
        onClose={() => setGalaxyOpen(false)}
        accent="#00e6b8"
        heading="Your research galaxy"
        subheading="Spin through past sessions. Tap the arrow to revisit one."
        items={history.slice(0, 42).map((h) => {
          const isDebate = (h.mode || h.kind) === "debate";
          const accent = isDebate ? "#ff2040" : "#00e6b8";
          const q = h.query || "Untitled";
          return {
            image: makeTile({ title: q, tag: isDebate ? "Debate" : "Research", accent }),
            title: q.length > 60 ? q.slice(0, 60) + "…" : q,
            description: `${isDebate ? "Debate" : "Research"} · ${Math.round(h.confidence || 0)}% confidence`,
            query: q, mode: h.mode || "research",
          };
        })}
        onSelect={(it) => { setGalaxyOpen(false); handleTopicClick(it.query, it.mode); }}
      />

      <main style={{
        marginLeft: sidebarW,
        transition:"margin-left 0.35s cubic-bezier(0.4,0,0.2,1)",
        position:"relative", zIndex:10,
      }}>

        {/* ══ HERO SECTION ══ */}
        <section style={{ position:"relative", overflow:"hidden", minHeight:420,
                          display:"flex", alignItems:"flex-end", paddingBottom:48 }}>
          <NeuralStrandCanvas />

          <div style={{ position:"absolute", inset:0, zIndex:1,
                        background:"linear-gradient(180deg,rgba(10,10,30,0.1) 0%,rgba(10,10,30,0.85) 100%)" }} />

          <div style={{ position:"relative", zIndex:2, padding:"0 40px", width:"100%",
                        display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ animation:"fadeUp 0.7s ease both" }}>
              <div style={{ fontFamily: C.fontDisplay, fontSize:"clamp(3.5rem,7vw,5rem)",
                            fontWeight:700, color: C.text, letterSpacing:"0.04em",
                            lineHeight:0.95, textTransform:"uppercase", marginBottom:-6 }}>
                NEURAL
              </div>
              <div className="text-glow"
                style={{ fontFamily: C.fontDisplay, fontSize:"clamp(5rem,10vw,8rem)",
                         fontWeight:700, color: C.orange, letterSpacing:"0.03em",
                         lineHeight:0.9, textTransform:"uppercase" }}>
                MEMORY BANK
              </div>
              <p style={{ fontFamily: C.fontMono, fontSize:13, color: C.textMuted,
                          textTransform:"uppercase", letterSpacing:"0.22em", marginTop:18,
                          maxWidth:460, lineHeight:1.8 }}>
                Your research history.,<br/>Stored, connected, never forgotten.
              </p>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display:"flex", alignItems:"center", gap:8,
                background:"rgba(40,40,61,0.6)", backdropFilter:"blur(12px)",
                border:`1px solid rgba(255,140,0,0.35)`,
                padding:"10px 26px", borderRadius:4,
                color: C.orange, fontFamily: C.fontMono, fontSize:12,
                cursor: syncing ? "not-allowed" : "pointer",
                opacity: syncing ? 0.75 : 1,
                animation: "none",
                transition:"all 0.3s",
                clipPath:"polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)",
                flexShrink:0, marginBottom:4,
              }}
              onMouseEnter={e => { if(!syncing){ e.currentTarget.style.background = C.orange; e.currentTarget.style.color = C.void; }}}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(40,40,61,0.6)"; e.currentTarget.style.color = C.orange; }}
            >
              <Icon name="sync" style={{ fontSize:18, animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Syncing..." : "Sync Nodes"}
            </button>
          </div>
        </section>

        {/* ══ PAGE BODY ══ */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 40px 80px" }}>

          {/* Phase F — spaced-repetition revisit strip */}
          <ResurfaceStrip onOpen={handleTopicClick} />

          {loading && !stats && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
                          minHeight:320, flexDirection:"column", gap:18 }}>
              <div style={{ width:48, height:48, border:`3px solid rgba(255,140,0,0.2)`,
                            borderTop:`3px solid ${C.orange}`, borderRadius:"50%",
                            animation:"spin 1s linear infinite" }} />
              <p style={{ color: C.textMuted, fontFamily: C.fontMono, fontSize:13 }}>
                Loading neural pathways...
              </p>
            </div>
          )}

          {/* ── METRIC CARDS ── */}
          {stats && (
            <section style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, marginBottom:44 }}>
              {(() => {
                // Real week-over-week trends computed from the timestamped
                // history/debates arrays — no longer hardcoded placeholders.
                const now = Date.now(), DAY = 864e5;
                const between = (arr, a, b) => (arr || []).filter(x => {
                  const t = x?.timestamp && new Date(x.timestamp).getTime();
                  return t && t >= a && t < b;
                }).length;
                const wow = (arr, total = 0) => {
                  const thisW = between(arr, now - 7 * DAY, now + DAY);
                  const lastW = between(arr, now - 14 * DAY, now - 7 * DAY);
                  // No timestamped items but a non-zero total means the timeline
                  // just isn't loaded — don't claim "no activity" when there is.
                  if (!thisW && !lastW) return total > 0 ? `${total} total` : "no activity yet";
                  if (!lastW) return `+${thisW} this week`;
                  const pct = Math.round(((thisW - lastW) / lastW) * 100);
                  return `${pct >= 0 ? "+" : ""}${pct}% this week`;
                };
                const topicsWeek = new Set(
                  (history || [])
                    .filter(h => h?.timestamp && new Date(h.timestamp).getTime() >= now - 7 * DAY)
                    .map(h => (h.query || h.topic || "").toLowerCase().trim())
                    .filter(Boolean)
                ).size;
                return (<>
                  <MetricCard value={stats.total_research || 0} label="Total Sessions"  sub={wow(history, stats.total_research)} icon="hexagon" delay={0}   />
                  <MetricCard value={stats.total_debates   || 0} label="Total Debates"  sub={wow(debates, stats.total_debates)} icon="hexagon" delay={80}  />
                  <MetricCard value={stats.unique_topics   || 0} label="Unique Topics"  sub={topicsWeek ? `+${topicsWeek} this week` : "no new topics"} icon="hexagon" delay={160} />
                  <MetricCard value={`${stats.avg_confidence || 0}%`} label="Avg Confidence" sub={stats.total_research ? `across ${stats.total_research} sessions` : "no data yet"} icon="show_chart" delay={240} />
                </>);
              })()}
            </section>
          )}

          {/* ── ACTIVE CLUSTERS ── */}
          {interests.length > 0 && (
            <section className="reveal" style={{ marginBottom:44 }}>
              <h3 style={{ fontFamily: C.fontMono, fontSize:11, color: C.textMuted,
                           textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:16 }}>
                Active Clusters
              </h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {interests.slice(0,12).map((int, i) => (
                  <button
                    key={i}
                    onClick={() => handleTopicClick(int.topic, "research")}
                    style={{
                      padding:"8px 18px", borderRadius:9999,
                      border:`1px solid ${C.orange}`,
                      background:"transparent",
                      color: C.text, fontFamily: C.fontMono, fontSize:11,
                      cursor:"pointer", transition:"all 0.2s",
                      display:"flex", alignItems:"center", gap:8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.orangeGlow; e.currentTarget.style.color = C.orange; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text; }}
                  >
                    {int.topic}
                    <span style={{ color: C.orange, fontWeight:700 }}>+{int.strength}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── TABS ── */}
          <div className="reveal card-clip"
            style={{ display:"inline-flex", border:`1px solid #222244`,
                     borderRadius:6, overflow:"hidden", marginBottom:28, padding:2 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding:"8px 28px", border:"none", cursor:"pointer",
                  fontFamily: C.fontMono, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em",
                  background: activeTab === tab ? C.orangeDark : "transparent",
                  color:      activeTab === tab ? "#fff"       : C.textMuted,
                  boxShadow:  activeTab === tab ? "inset 0 0 10px rgba(255,140,0,0.15)" : "none",
                  borderLeft: tab !== TABS[0] ? `1px solid #222244` : "none",
                  transition:"all 0.2s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── ACTIVITY FEED / TIMELINE ── */}
          {(activeTab === "All Activity" || activeTab === "Research") && (
            <section style={{ marginBottom:44 }}>
              <div style={{ border:`1px solid #222244`, borderRadius:8,
                            background: C.void, overflow:"hidden" }}>
                {Object.entries(filteredGrouped()).length > 0 ? (
                  Object.entries(filteredGrouped()).map(([date, items], gi) => (
                    <div key={date}>
                      <div style={{ display:"flex", alignItems:"center", gap:14,
                                    padding:"12px 20px", borderBottom:`1px solid #222244`,
                                    background:"rgba(18,18,43,0.6)" }}>
                        <div style={{ flex:1, borderTop:`1px solid #222244` }} />
                        <span style={{ fontFamily: C.fontMono, fontSize:10,
                                       color: C.textMuted, whiteSpace:"nowrap" }}>
                          {date}
                        </span>
                        <div style={{ flex:1, borderTop:`1px solid #222244` }} />
                      </div>
                      {items.map((item, i) => {
                        const isDebate    = item.kind === "debate";
                        const dotColor    = isDebate ? C.crimson : getConfColor(item.confidence);
                        const badgeText   = isDebate
                          ? (item.debateData ? `${item.debateData.for_score}/${item.debateData.against_score}` : "DEBATE")
                          : `${item.confidence}%`;
                        const isLast = i === items.length - 1;
                        return (
                          <div
                            key={i}
                            className="reveal"
                            onClick={() => handleTopicClick(item.query, item.mode || "research")}
                            style={{
                              padding:"20px 24px",
                              borderBottom: isLast ? "none" : `1px solid #222244`,
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              cursor:"pointer", transition:"background 0.2s",
                              animationDelay:`${i * 60}ms`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#12122b"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                              <div style={{ marginTop:4, width:12, height:12, borderRadius:"50%",
                                            background: dotColor, flexShrink:0,
                                            }} />
                              <div>
                                <h4 style={{ fontFamily: C.fontBody, fontSize:14, fontWeight:600,
                                             color:"#fff", marginBottom:10 }}>
                                  {item.query}
                                </h4>
                                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                  <span style={{ padding:"3px 10px", background:"#12122b",
                                                 color: C.textMuted, fontSize:10,
                                                 borderRadius:3, textTransform:"uppercase" }}>
                                    {item.mode || "research"}
                                  </span>
                                  {item.topics?.filter(t=>t).slice(0,3).map((t,j)=>(
                                    <span key={j}
                                      onClick={e=>{e.stopPropagation(); handleTopicClick(t,"research");}}
                                      style={{ padding:"3px 10px", background:"#12122b",
                                               color: C.textMuted, fontSize:10,
                                               borderRadius:3, textTransform:"uppercase", cursor:"pointer" }}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:24, flexShrink:0 }}>
                              <span style={{ fontFamily: C.fontMono, fontSize:14,
                                             fontWeight:700, color: C.orange }}>
                                {badgeText}
                              </span>
                              {item.timestamp && (
                                <span style={{ fontFamily: C.fontMono, fontSize:10, color: C.textMuted }}>
                                  {new Date(item.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  !loading && (
                    <div style={{ textAlign:"center", padding:"48px 20px", color: C.textMuted,
                                  fontFamily: C.fontMono, fontSize:13 }}>
                      No research yet - start asking questions.
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* ── DEBATES TAB ── */}
          {(activeTab === "All Activity" || activeTab === "Debates") && debates.length > 0 && (
            <section style={{ marginBottom:44 }}>
              {activeTab === "Debates" && (
                <h3 style={{ fontFamily: C.fontMono, fontSize:11, color: C.textMuted,
                             textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:20 }}>
                  Debate History
                </h3>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {debates.map((d, i) => (
                  <div key={i} className="reveal"
                    onClick={() => handleTopicClick(d.topic, "debate")}
                    style={{
                      background: C.surface, backdropFilter:"blur(20px)",
                      border:"1px solid rgba(255,32,64,0.28)", borderRadius:8, padding:20,
                      cursor:"pointer", transition:"background 0.2s",
                      boxShadow:"0 0 14px rgba(255,32,64,0.1)",
                      animationDelay:`${i*70}ms`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceHigh}
                    onMouseLeave={e => e.currentTarget.style.background = C.surface}
                  >
                    <h4 style={{ fontFamily: C.fontBody, fontSize:15, fontWeight:600,
                                 color:"#fff", marginBottom:14 }}>
                      {d.topic}
                    </h4>
                    <div style={{ display:"flex", gap:16, marginBottom:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                      fontFamily: C.fontMono, fontSize:10, marginBottom:5 }}>
                          <span style={{ color: C.orange }}>FOR</span>
                          <span style={{ color: C.orange }}>{d.for_score}/10</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.06)" }}>
                          <div style={{ width:`${(d.for_score||0)*10}%`, height:"100%",
                                        borderRadius:2, background: C.orange, transition:"width 1s ease" }} />
                        </div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                      fontFamily: C.fontMono, fontSize:10, marginBottom:5 }}>
                          <span style={{ color: C.crimson }}>AGAINST</span>
                          <span style={{ color: C.crimson }}>{d.against_score}/10</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.06)" }}>
                          <div style={{ width:`${(d.against_score||0)*10}%`, height:"100%",
                                        borderRadius:2, background: C.crimson, transition:"width 1s ease" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontFamily: C.fontMono, fontSize:11, fontWeight:700,
                                  color: d.winner==="FOR" ? C.orange : d.winner==="AGAINST" ? C.crimson : C.gold }}>
                      🏆 Winner: {d.winner}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Debates empty state */}
          {(activeTab === "All Activity" || activeTab === "Debates") && debates.length === 0 && !loading && (
            <div style={{ textAlign:"center", padding:"40px 20px", color: C.textMuted,
                          fontFamily: C.fontMono, fontSize:12, marginBottom:44 }}>
              No debates yet - start a debate to see your history.
            </div>
          )}

          {/* ── SUGGESTED SYNAPTIC PATHS ── */}
          <section className="reveal" style={{ paddingBottom:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <h3 style={{ fontFamily: C.fontDisplay, fontSize:26, fontWeight:600,
                           color:"#fff", textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>
                Suggested Synaptic Paths
              </h3>
              <Icon name="auto_awesome" style={{ color: C.gold, fontSize:20 }} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {suggestions.map((s, i) => (
                <div
                  key={`${s.topic}-${i}`}
                  onClick={() => handleTopicClick(s.topic, s.mode)}
                  className="reveal-left"
                  style={{
                    background: C.surface, backdropFilter:"blur(20px)",
                    border:`1px solid ${C.white10}`,
                    borderLeft:`4px solid ${s.color}`,
                    borderRadius:8, padding:"18px 22px", cursor:"pointer",
                    transition:"transform 0.2s ease, background 0.2s ease",
                    animationDelay:`${i * 120}ms`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateX(8px)"; e.currentTarget.style.background = C.surfaceHigh; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateX(0)";   e.currentTarget.style.background = C.surface; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontFamily: C.fontMono, fontSize:9, color: s.color,
                                   textTransform:"uppercase", letterSpacing:"0.15em" }}>
                      {s.type}
                    </span>
                  </div>
                  <h4 style={{ fontFamily: C.fontBody, fontSize:14, fontWeight:600,
                               color:"#fff", margin:"0 0 4px" }}>
                    {s.topic}
                  </h4>
                  <p style={{ fontFamily: C.fontBody, fontSize:12, color: C.textMuted, margin:0 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>{/* end body */}
      </main>

      {/* ── SYNC TOAST ── */}
      {syncMsg && (
        <div style={{
          position:"fixed", bottom:32, right:32, zIndex:100,
          background: syncMsg.includes("failed") ? "rgba(255,32,64,0.12)" : "rgba(255,140,0,0.12)",
          backdropFilter:"blur(20px)",
          border:`1px solid ${syncMsg.includes("failed") ? "rgba(255,32,64,0.4)" : "rgba(255,140,0,0.4)"}`,
          borderRadius:8, padding:"14px 24px",
          fontFamily: C.fontMono, fontSize:12,
          color: syncMsg.includes("failed") ? C.crimson : C.orange,
          animation:"fadeUp 0.4s ease",
          clipPath:"polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)",
        }}>
          {syncMsg.includes("failed") ? "⚠ " : "✓ "}{syncMsg}
        </div>
      )}
    </div>
  );
}