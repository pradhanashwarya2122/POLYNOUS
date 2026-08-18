import * as THREE from 'three'
import { useState, useEffect, useRef } from "react";
import { C } from "../design/researchColors";
import { Icon } from "./shared/Icon";
import { NeuralSynthesisReport } from "./report/NeuralSynthesisReport";
import PolynousReport from "./PolynousReport";
import { isDevPreview } from "../devPreview";
import ScrapeCountControl from "./ScrapeCountControl";
import { API_BASE_URL } from '../config'
import NeuralResearchEngine from './NeuralResearchEngine'   // ← NEW

// ─── Design tokens ────────────────────────────────────────────────────────────

// ─── Google Fonts + global styles ────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;500;600&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
      *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; }
      body { background: ${C.void}; color: ${C.onSurface}; font-family: 'Inter', sans-serif; overflow-x: hidden; }
      ::selection { background: ${C.green}; color: #000; }

      /* scrollbar */
      .poly-scroll::-webkit-scrollbar { width: 5px; }
      .poly-scroll::-webkit-scrollbar-track { background: transparent; }
      .poly-scroll::-webkit-scrollbar-thumb { background: rgba(0,255,71,0.2); border-radius: 10px; }

      /* nav items */
      .nav-item { transition: all 0.18s ease; }
      .nav-item:hover { color: #fff !important; background: rgba(255,255,255,0.05) !important; }
      .nav-item.active {
        color: ${C.green} !important;
        background: linear-gradient(90deg, rgba(0,255,71,0.1) 0%, transparent 100%) !important;
        border-left: 2px solid ${C.green};
      }

      /* pill buttons */
      .pill-btn { transition: all 0.22s ease; }
      .pill-btn:hover {
        background: rgba(0,255,71,0.1) !important;
        border-color: rgba(0,255,71,0.5) !important;
        color: #fff !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 20px rgba(0,255,71,0.15) !important;
      }

      /* suggestion cards */
      .sugg-card { transition: all 0.2s ease; }
      .sugg-card:hover {
        background: rgba(18,33,49,0.7) !important;
        border-color: rgba(0,255,71,0.3) !important;
        box-shadow: 0 0 15px rgba(0,255,71,0.05) !important;
      }
      .sugg-card:hover .sugg-arrow { opacity: 1 !important; transform: translateX(4px) !important; }
      .sugg-card:hover .sugg-icon { opacity: 1 !important; }

      /* report hover states */
      .finding-card-green:hover { border-color: ${C.green} !important; }
      .finding-card-crimson:hover { border-color: ${C.crimson} !important; }
      .source-pill:hover {
        background: rgba(0,204,255,0.1) !important;
        border-color: #00ccff !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,204,255,0.2);
      }
      .action-btn:hover { background: rgba(255,255,255,0.06) !important; }
      .copy-btn:hover { background: rgba(0,255,71,0.08) !important; border-color: rgba(0,255,71,0.3) !important; color: ${C.green} !important; }
      .history-card:hover { border-color: rgba(0,255,71,0.3) !important; background: rgba(5,20,36,0.8) !important; }

      /* animations */
      @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes sectionIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse-green { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.1); } }
      @keyframes pulseBrain  { 0%,100% { opacity:1; transform:scale(1); filter:drop-shadow(0 0 8px ${C.green}); } 50% { opacity:.7; transform:scale(1.05); filter:drop-shadow(0 0 15px ${C.green}); } }

      /* accessibility + motion preferences */
      button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid ${C.green}; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; }
      }

      /* print: the report becomes a clean paper document */
      @media print {
        body, #root { background: #fff !important; }
        * { background: transparent !important; box-shadow: none !important;
            backdrop-filter: none !important; color: #111 !important;
            border-color: #ccc !important; animation: none !important; }
        canvas, aside, .no-print, button { display: none !important; }
        #research-answer { padding: 0 !important; }
        #research-answer section, #research-answer > div > div { page-break-inside: avoid; }
        a { color: #0a5 !important; text-decoration: underline !important; }
      }
    `}</style>
  );
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const getToken = () => window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';

// ─── Three.js Mountain (full Code-1 implementation, in React) ─────────────────
function ThreeMountain() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dynamically load Three.js if not already present
    let THREE = window.THREE;
    const init = (THREE) => {
      let width  = container.offsetWidth;
      let height = container.offsetHeight;

      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 15, 40);
      camera.lookAt(0, 5, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.domElement.style.width  = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      const neonGreen = new THREE.Color(0x00ff47);

      // - Terrain - 
      const terrainSize     = 120;
      const terrainSegments = 70;
      const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
      const verts = geometry.attributes.position.array;
      for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i], y = verts[i + 1];
        const d1 = Math.sqrt((x-15)**2 + (y-15)**2);
        const d2 = Math.sqrt((x+25)**2 + (y-5)**2);
        const d3 = Math.sqrt((x-5)**2  + (y+25)**2);
        let h = Math.max(0, 28 - d1 * 0.9) * 1.3;
        h += Math.max(0, 18 - d2 * 0.7);
        h += Math.max(0, 12 - d3 * 0.6);
        h += Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2.5;
        verts[i + 2] = h;
      }
      geometry.computeVertexNormals();
      const terrainMat = new THREE.MeshBasicMaterial({
        color: neonGreen, wireframe: true, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const terrain = new THREE.Mesh(geometry, terrainMat);
      terrain.rotation.x = -Math.PI / 2;
      scene.add(terrain);

      // - Discovery Path - 
      const curvePoints = [
        new THREE.Vector3(-35,0,45),new THREE.Vector3(-15,1,35),
        new THREE.Vector3(5,3,25),new THREE.Vector3(0,7,15),
        new THREE.Vector3(12,15,20),new THREE.Vector3(15,26,15),
      ];
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const pathGeo = new THREE.TubeGeometry(curve, 120, 0.15, 8, false);
      const pathMat = new THREE.MeshBasicMaterial({
        color: neonGreen, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
      });
      scene.add(new THREE.Mesh(pathGeo, pathMat));

      // - Peak Beacon - 
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(15, 26, 15);
      scene.add(beaconGroup);
      beaconGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      ));
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: neonGreen, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
      );
      beaconGroup.add(glow);

      // - Particles - 
      const N = 1000;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i*3]   = (Math.random() - 0.5) * 140;
        pos[i*3+1] = Math.random() * 50;
        pos[i*3+2] = (Math.random() - 0.5) * 140;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: neonGreen, size: 0.1, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
      }));
      scene.add(particles);

      // - Grid - 
      const grid = new THREE.GridHelper(240, 50, 0x00ff47, 0x002211);
      grid.position.y = -0.1;
      grid.material.transparent = true;
      grid.material.opacity = 0.08;
      scene.add(grid);

      // - Mouse interaction - 
      let targetRotY = 0, targetRotX = 0.3;
      const onMouse = (e) => {
        const mx = (e.clientX / window.innerWidth)  * 2 - 1;
        const my = -(e.clientY / window.innerHeight) * 2 + 1;
        targetRotY = mx * 0.2;
        targetRotX = 0.3 - my * 0.15;
      };
      window.addEventListener("mousemove", onMouse);

      // - Animation loop - 
      let animId;
      const animate = (t) => {
        animId = requestAnimationFrame(animate);
        scene.rotation.y += (targetRotY - scene.rotation.y) * 0.05;
        scene.rotation.x += (targetRotX - scene.rotation.x) * 0.05;
        terrain.rotation.z += 0.0004;
        const s = 1 + Math.sin(t * 0.003) * 0.4;
        glow.scale.set(s, s, s);
        glow.material.opacity = 0.3 + Math.sin(t * 0.003) * 0.2;
        particles.position.y = Math.sin(t * 0.0006) * 2;
        renderer.render(scene, camera);
      };
      animate(0);

      // - Resize - 
      const onResize = () => {
        width  = container.offsetWidth;
        height = container.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    if (THREE) {
      return init(THREE);
    }
    // Load from CDN if not available
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => { init(window.THREE); };
    document.head.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute", top: 0, right: 0,
        width: "50%", height: "100%",
        zIndex: 0, pointerEvents: "none",
      }}
    />
  );
}

// ─── Floating agent labels (right side, Code 1 style) ────────────────────────
function AgentLabels() {
  const labels = ["SEARCH", "ANALYZE", "SYNTHESIZE", "VERIFY", "ANSWER"];
  const offsets = ["0px", "16px", "8px", "32px", "48px"];
  const lineWidths = ["64px", "96px", "80px", "48px", "32px"];
  return (
    <div style={{
      position: "absolute", right: 32, top: "25%", bottom: "25%",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      zIndex: 5, pointerEvents: "none",
    }}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, transform: `translateX(${offsets[i]})` }}>
          <div style={{ height: 1, width: lineWidths[i], background: "rgba(0,255,71,0.3)" }} />
          <div style={{
            border: "1px solid rgba(0,255,71,0.4)",
            padding: "4px 12px", borderRadius: 4,
            fontSize: 10, color: C.green,
            letterSpacing: "0.25em",
            background: "rgba(5,20,36,0.8)",
            backdropFilter: "blur(8px)",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 500,
          }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Neural canvas (background particles) ────────────────────────────────────
function NeuralCanvas({ isResearching }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [], animId;
    const N = 80;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    for (let i = 0; i < N; i++) particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random()-0.5) * (isResearching ? 0.8 : 0.35),
      vy: (Math.random()-0.5) * (isResearching ? 0.8 : 0.35),
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + (isResearching ? 0.2 : 0.07),
    });
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,255,71,${p.opacity})`; ctx.fill();
        for (let j = i+1; j < particles.length; j++) {
          const d = Math.hypot(p.x-particles[j].x, p.y-particles[j].y);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(particles[j].x,particles[j].y);
            ctx.strokeStyle = `rgba(0,255,71,${0.06*(1-d/90)})`; ctx.lineWidth=0.3; ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",resize); };
  }, [isResearching]);
  return <canvas ref={ref} style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none",opacity:0.6 }} />;
}

// ─── Thinking canvas (agent orbit) ───────────────────────────────────────────
const AGENT_NODES = [
  { color: C.cyan,    icon: "search",        title: "Search",     shadow: C.cyan },
  { color: "#5878d4", icon: "auto_awesome",  title: "Summariser", shadow: "#5878d4" },
  { color: C.amber,   icon: "priority_high", title: "Critic",     shadow: C.amber },
  { color: C.purple,  icon: "edit",          title: "Writer",     shadow: C.purple },
  { color: C.green,   icon: "add_circle",    title: "FOR",        shadow: C.green,   iconColor: "#000" },
  { color: C.crimson, icon: "remove_circle", title: "AGAINST",    shadow: C.crimson, iconColor: "#fff" },
  { color: C.gold,    icon: "gavel",         title: "Judge",      shadow: C.gold },
];

function ThinkingCanvas({ agentStatus, agentProgress }) {
  const nodeRefs = useRef([]);
  const animRef  = useRef(null);

  useEffect(() => {
    let angle = 0;
    const rotate = () => {
      angle += 0.005;
      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const r = 155, offset = (i / AGENT_NODES.length) * Math.PI * 2;
        const x = Math.cos(angle + offset) * r;
        const y = Math.sin(angle + offset) * r;
        node.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      });
      animRef.current = requestAnimationFrame(rotate);
    };
    rotate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const activeAgent    = AGENT_NODES.find(a => agentStatus?.toLowerCase().includes(a.title.toLowerCase()));
  const completedCount = agentProgress.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:"48px 0" }}>
      <div style={{ width:360, height:360, borderRadius:"50%", border:"2px dashed rgba(0,255,71,0.2)", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {/* centre hub */}
        <div style={{ textAlign:"center", zIndex:10, background:"rgba(5,20,36,0.85)", backdropFilter:"blur(20px)", border:"1px solid rgba(0,255,71,0.25)", borderRadius:"50%", width:140, height:140, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px rgba(0,255,71,0.12)" }}>
          <Icon name="hub" style={{ color:C.green, fontSize:30, marginBottom:4, animation:"pulse-green 2s infinite" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.green, textTransform:"uppercase", letterSpacing:"0.1em" }}>SYNTHESIZING</div>
          <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, color:"#fff" }}>{Math.min(Math.round(completedCount*14.2),99)}%</div>
        </div>
        {/* agent nodes */}
        {AGENT_NODES.map((node, i) => {
          const completed = agentProgress.some(p => p.agent?.toLowerCase().includes(node.title.toLowerCase()));
          const isActive  = activeAgent?.title === node.title;
          const angle     = (i / AGENT_NODES.length) * Math.PI * 2;
          const r = 155, x = Math.cos(angle)*r, y = Math.sin(angle)*r;
          return (
            <div key={node.title} ref={el => nodeRefs.current[i] = el} title={node.title}
              style={{ position:"absolute", left:`calc(50% + ${x}px)`, top:`calc(50% + ${y}px)`, transform:"translate(-50%,-50%)",
                width:isActive?44:36, height:isActive?44:36, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                background: completed ? node.color : "rgba(255,255,255,0.08)",
                boxShadow: completed ? `0 0 15px ${node.shadow}` : "none",
                border: isActive ? `2px solid ${node.color}` : "none",
                opacity: completed||isActive ? 1 : 0.3,
                transition:"all 0.5s",
                animation: isActive ? "pulse-green 1.5s infinite" : "none",
              }}>
              <Icon name={node.icon} style={{ color: node.iconColor||(completed?"#000":C.textSecondary), fontSize:isActive?20:16 }} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:20, fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textSecondary, textAlign:"center" }}>
        {agentProgress.map((p,i) => <span key={i} style={{ color:C.green, margin:"0 6px" }}>✓ {p.agent}</span>)}
        {activeAgent && <span style={{ color:C.cyan }}>&nbsp;&nbsp;{activeAgent.title} working…</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COLOR / STYLE CONSTANTS (for Sidebar)
// ═══════════════════════════════════════════════════════════════
const SC = {
  green:              "#00ff47",
  void:               "#0a0a1e",
  surface:            "#111125",
  surfaceContainer:   "#1e1e32",
  onSurface:          "#e2e0fc",
  onSurfaceVariant:   "#b9ccb0",
  textSecondary:      "#8899aa",
  white10:            "rgba(255,255,255,0.1)",
  white5:             "rgba(255,255,255,0.05)",
};

// ─── Navigation items ────────────────────────────────────────────────────────
const NAV = [
  { icon: "travel_explore", label: "Research",        path: "/research", active: true },
  { icon: "forum",          label: "Debate Chamber",  path: "/debate" },
  { icon: "account_tree",   label: "Knowledge Graph", path: "/graph" },
  { icon: "search",         label: "Semantic Search", path: "/search" },
  { icon: "database",       label: "Memory Bank",     path: "/memory" },
  { icon: "picture_as_pdf", label: "PDF Lab",         path: "/pdf-lab" },
  { icon: "analytics",      label: "Analytics",       path: "/analytics" },
  { icon: "settings",       label: "Settings",        path: "/settings" },
  { icon: "help", label: "Help", path: "/info" },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
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
          borderRight: "1px solid " + SC.white10,
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
            color: SC.green,
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
              color: active ? SC.green : SC.onSurfaceVariant,
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
              background: SC.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="add" style={{ fontSize: 16, color: SC.void }} />
          </div>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: SC.surfaceContainer,
              border: `1px solid ${SC.green}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="face" style={{ color: SC.green, fontSize: 14 }} />
          </div>
          <div onClick={bye} style={{ cursor: "pointer", color: SC.green }}>
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
        borderRight: "1px solid " + SC.white10,
        boxShadow: "0 0 20px rgba(0,255,71,0.08)",
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
              color: SC.green,
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
              color: SC.onSurfaceVariant,
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
            color: SC.textSecondary,
            cursor: "pointer",
            padding: 4,
            marginLeft: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = SC.textSecondary)}
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
              color: active ? SC.green : SC.onSurfaceVariant,
              background: active ? `${SC.green}15` : "transparent",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = SC.green;
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = SC.onSurfaceVariant;
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
          borderTop: "1px solid " + SC.white5,
          paddingTop: 24,
          marginTop: 24,
        }}
      >
        <button
          onClick={() => go("/research")}
          style={{
            width: "100%",
            padding: 12,
            background: SC.green,
            color: SC.void,
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
          <Icon name="add" style={{ fontSize: 18, color: SC.void }} /> New Research
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
              background: SC.surfaceContainer,
              border: `1px solid ${SC.green}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="face" style={{ color: SC.green, fontSize: 22 }} />
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
                color: SC.green,
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

// ─── All suggestion questions ─────────────────────────────────────────────────
const ALL_QUESTIONS = [
  "What is artificial intelligence?","How does quantum computing work?","Explain CRISPR gene editing",
  "Is nuclear energy safe?","How does blockchain work?","What causes climate change?",
  "How does the human brain store memories?","What is dark matter and dark energy?",
  "How do mRNA vaccines work?","What is the Fermi Paradox?","How does general relativity work?",
  "What is consciousness from a neuroscience perspective?","What are the risks of artificial general intelligence?",
  "How do black holes form and what happens inside them?","What is the multiverse theory?",
  "How does the gut microbiome affect mental health?","What caused the 2008 financial crisis?",
  "How does photosynthesis work at a molecular level?","What is epigenetics?",
  "How do neural networks learn?","What is the theory of everything in physics?",
  "How does CERN's Large Hadron Collider work?","What are psychedelics doing to the brain?",
  "Molecular mechanism of photosynthesis?","Physics of black hole formation?",
];

function shuffle(arr) {
  const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}

// ─── Shuffling Pills ──────────────────────────────────────────────────────────
function ShufflingPills({ onSelect }) {
  const VISIBLE = 6;
  const [displayed, setDisplayed] = useState(() => shuffle(ALL_QUESTIONS).slice(0, VISIBLE));
  const [fading,    setFading]    = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => { setDisplayed(shuffle(ALL_QUESTIONS).slice(0, VISIBLE)); setFading(false); }, 420);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:24, opacity:fading?0:1, transform:fading?"translateY(6px)":"translateY(0)", transition:"opacity 0.42s ease, transform 0.42s ease" }}>
      {displayed.map((pill, i) => (
        <button key={pill} className="pill-btn" onClick={() => onSelect(pill)} style={{
          padding:"10px 20px", borderRadius:30, background:"rgba(13,28,45,0.75)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(0,255,71,0.18)", color:"rgba(212,228,250,0.85)", cursor:"pointer",
          fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, lineHeight:1.4,
          animation:`fadeSlideUp 0.4s ${i*55}ms ease both`,
        }}>{pill}</button>
      ))}
    </div>
  );
}

// ─── Suggestion Cards - premium auto-shuffling deck ──────────────────────────
// A large pool where every question carries its own topical icon. Six cards are
// shown at a time and auto-shuffle every 5.5s with a staggered crossfade+lift.
const SUGG_CARDS = [
  { icon:"public",         text:"What is the multiverse theory?" },
  { icon:"vaccines",       text:"How do mRNA vaccines work?" },
  { icon:"eco",            text:"Molecular mechanism of photosynthesis?" },
  { icon:"psychology",     text:"Consciousness in neuroscience?" },
  { icon:"medication",     text:"What do psychedelics do to the brain?" },
  { icon:"cyclone",        text:"Physics of black hole formation?" },
  { icon:"memory",         text:"How does the brain store memories?" },
  { icon:"dark_mode",      text:"What is dark matter and dark energy?" },
  { icon:"rocket_launch",  text:"What is the Fermi Paradox?" },
  { icon:"hub",            text:"How do neural networks learn?" },
  { icon:"bolt",           text:"How does general relativity work?" },
  { icon:"smart_toy",      text:"What are the risks of AGI?" },
  { icon:"science",        text:"Is there a theory of everything?" },
  { icon:"coronavirus",    text:"Gut microbiome and mental health?" },
  { icon:"account_balance",text:"What caused the 2008 financial crisis?" },
  { icon:"genetics",       text:"How does CRISPR gene editing work?" },
  { icon:"blur_on",        text:"How does quantum computing work?" },
  { icon:"thermostat",     text:"What actually causes climate change?" },
  { icon:"bubble_chart",   text:"How does the Large Hadron Collider work?" },
  { icon:"water_drop",     text:"What is epigenetics?" },
  { icon:"solar_power",    text:"Is nuclear energy safe?" },
  { icon:"currency_bitcoin",text:"How does blockchain actually work?" },
  { icon:"waves",          text:"What are gravitational waves?" },
  { icon:"travel_explore", text:"What is artificial intelligence?" },
  { icon:"forest",         text:"Can rewilding reverse biodiversity loss?" },
  { icon:"biotech",        text:"How close are we to lab-grown organs?" },
  { icon:"local_fire_department", text:"How do stars forge heavy elements?" },
  { icon:"satellite_alt",  text:"How does GPS correct for relativity?" },
];

const SUGG_VISIBLE = 6;

function SuggestionCards({ onSelect }) {
  const [cards, setCards]   = useState(() => shuffle(SUGG_CARDS).slice(0, SUGG_VISIBLE));
  const [phase, setPhase]   = useState("in"); // in | out

  useEffect(() => {
    const id = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setCards(prev => {
          // Prefer questions not currently on screen for genuine variety.
          const shown = new Set(prev.map(c => c.text));
          const pool  = shuffle(SUGG_CARDS.filter(c => !shown.has(c.text)));
          return (pool.length >= SUGG_VISIBLE ? pool : shuffle(SUGG_CARDS)).slice(0, SUGG_VISIBLE);
        });
        setPhase("in");
      }, 460);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14, width:"100%", maxWidth:760 }}>
      {cards.map(({ icon, text }, i) => (
        <div key={text} className="sugg-card" onClick={() => onSelect(text)}
          style={{
            background:"rgba(18,33,49,0.4)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12,
            padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer",
            opacity: phase==="out" ? 0 : 1,
            transform: phase==="out" ? "translateY(10px) scale(0.98)" : "translateY(0) scale(1)",
            transition: `opacity 0.44s cubic-bezier(0.22,1,0.36,1) ${i*55}ms, transform 0.44s cubic-bezier(0.22,1,0.36,1) ${i*55}ms, border-color 0.2s, background 0.2s`,
          }}>
          <Icon name={icon} style={{ color:C.green, fontSize:22, opacity:0.6, flexShrink:0 }} className="sugg-icon" />
          <span style={{ flex:1, fontSize:12, color:"#c8d8ea", fontFamily:"'Inter',sans-serif", fontWeight:500, lineHeight:1.5 }}>{text}</span>
          <Icon name="arrow_forward" style={{ color:C.green, fontSize:14, opacity:0, transition:"all 0.2s" }} className="sugg-arrow" />
        </div>
      ))}
    </div>
  );
}

// ─── Report helpers ───────────────────────────────────────────────────────────

// Strip markdown artifacts the LLM leaves in prose: **bold**, *italic*,
// leading #/##, stray backticks, orphaned "& UNCERTAINTIES"-style header tails.
// ─── Landing hero (Code 1 layout) ────────────────────────────────────────────
function LandingHero({ query, setQuery, onSearch, loading }) {
  const handlePill = (q) => { setQuery(q); onSearch(q); };

  return (
    <div style={{ position:"relative",flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px 56px",overflow:"hidden",minHeight:"100vh" }}>

      {/* Three.js mountain - right half */}
      <ThreeMountain />

      {/* Floating agent labels */}
      <AgentLabels />

      {/* Grid overlay */}
      <div style={{ position:"absolute",inset:0,zIndex:0,opacity:0.1,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)",backgroundSize:"30px 30px" }} />

      {/* Content */}
      <div style={{ position:"relative",zIndex:2,maxWidth:680 }}>

        {/* Tagline */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
          <div style={{ display:"flex",gap:4 }}>
            {[1,0.5,0.2].map((o,i)=>(<div key={i} style={{ width:6,height:6,background:C.green,transform:"rotate(45deg)",opacity:o,boxShadow:i===0?`0 0 5px ${C.green}`:undefined }} />))}
          </div>
          <p style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:10,fontWeight:600,color:C.onSurfaceVariant,textTransform:"uppercase",letterSpacing:"0.25em" }}>
            7 AGENTS. ONE ANSWER. <span style={{ color:C.green }}>INFINITE</span> KNOWLEDGE.
          </p>
        </div>

        {/* Hero heading */}
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontStyle:"italic",fontWeight:700,fontSize:"clamp(3rem,5.5vw,5rem)",lineHeight:0.92,color:"#fff",textTransform:"uppercase",letterSpacing:"-0.01em" }}>
            Neural<br />
            <span style={{ color:C.green,display:"block",position:"relative",textShadow:`0 0 30px ${C.greenGlow}` }}>Research</span>
            Engine
          </h2>
          <p style={{ marginTop:18,fontFamily:"'IBM Plex Sans',sans-serif",fontSize:11,color:C.onSurfaceVariant,textTransform:"uppercase",letterSpacing:"0.2em",fontWeight:600 }}>
            Multi-agent research. Deeper insights.
          </p>
          <div style={{ marginTop:14,borderLeft:`2px solid ${C.green}`,paddingLeft:14 }}>
            <p style={{ fontSize:13,color:"#c8d8ea",lineHeight:1.7 }}>Intelligence that <span style={{ color:C.green,fontWeight:500 }}>searches</span>.</p>
            <p style={{ fontSize:13,color:"#c8d8ea",lineHeight:1.7 }}>Understanding that <span style={{ color:C.green,fontWeight:500 }}>speaks</span>.</p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position:"relative",marginBottom:40,maxWidth:680 }}>
          <div style={{ position:"absolute",inset:0,background:"rgba(0,255,71,0.04)",borderRadius:9999,filter:"blur(10px)" }} />
          <div style={{ position:"relative",display:"flex",alignItems:"center",background:"rgba(1,15,31,0.85)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,padding:"6px 6px 6px 20px",boxShadow:"0 4px 40px rgba(0,0,0,0.4)",transition:"border-color 0.25s" }}
            onFocus={e=>e.currentTarget.style.borderColor="rgba(0,255,71,0.4)"} onBlur={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.09)"}>
            <Icon name="search" style={{ color:C.onSurfaceVariant,fontSize:18,marginRight:10,flexShrink:0 }} />
            <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask any research question…"
              onKeyDown={e=>e.key==="Enter"&&onSearch()} disabled={loading}
              style={{ flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14,padding:"8px 0" }} />
            <button onClick={()=>onSearch()} disabled={loading||!query.trim()}
              style={{ background:loading?"#333":C.green,color:"#000",padding:"12px 28px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,letterSpacing:"0.12em",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":`0 0 20px ${C.greenGlow}`,transition:"all 0.25s",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              {loading ? "THINKING…" : <>RESEARCH <Icon name="arrow_forward" style={{ fontSize:12,color:"#000" }} /></>}
            </button>
          </div>
        </div>

        {/* Sources-to-scrape control - applies to this run */}
        <div style={{ marginBottom:26 }}>
          <ScrapeCountControl accent={C.green} />
        </div>

        {/* Suggestion section label */}
        <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:18 }}>
          <div style={{ flex:1,height:1,background:`linear-gradient(to right, transparent, ${C.greenGlow})` }} />
          <span style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:9,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.22em",display:"flex",alignItems:"center",gap:6 }}>
            <Icon name="play_circle" style={{ fontSize:10,color:C.green }} /> TRY ONE OF THESE
          </span>
          <div style={{ flex:1,height:1,background:`linear-gradient(to left, transparent, ${C.greenGlow})` }} />
        </div>

        {/* Suggestion cards */}
        <SuggestionCards onSelect={handlePill} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PolynousResearch({ user, onNavigate, onLogout }) {
  const [query,          setQuery]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [answer,         setAnswer]         = useState("");
  const [activeQuery,    setActiveQuery]    = useState("");
  const [sources,        setSources]        = useState([]);
  const [confidence,     setConfidence]     = useState(0);
  const [report,         setReport]         = useState(null);
  const [telemetry,      setTelemetry]      = useState(null);
  const [cacheInfo,      setCacheInfo]      = useState(null);
  const [sourceSummaries, setSourceSummaries] = useState([]);
  const [forceFresh,     setForceFresh]     = useState(false);
  const [runNonce,       setRunNonce]       = useState(0);
  const [agentStatus,    setAgentStatus]    = useState("");
  const [agentProgress,  setAgentProgress]  = useState([]);
  const [history,        setHistory]        = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [userStyle,      setUserStyle]      = useState("academic");
  const [streamingOn,    setStreamingOn]    = useState(true);
  const [confThreshold,  setConfThreshold]  = useState(70);
  const [fontsLoaded,    setFontsLoaded]    = useState(false);
  const [novelty,        setNovelty]        = useState(null);   // Phase F novelty

  // --- NEW: engine collapse state
  const [engineCollapsed, setEngineCollapsed] = useState(false);
  // --- PATCH 6a: engine completion gate
  const [engineDone, setEngineDone] = useState(false);

  // Wait for fonts to load before rendering icons
  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  // Fetch user preferences on mount
  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/settings/preferences`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUserStyle(data.response_style || "academic");
          if (data.streaming_enabled !== undefined) setStreamingOn(!!data.streaming_enabled);
          if (data.confidence_threshold !== undefined) setConfThreshold(Number(data.confidence_threshold) || 70);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchStyle();
  }, []);

  // --- PATCH 6f: scroll to answer only after engine done
  useEffect(() => {
    if (answer && engineDone) {
      setTimeout(() => {
        document.getElementById('research-answer')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [answer, engineDone]);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  // ── SINGLE PIPELINE: the NeuralResearchEngine's /ask-visual stream is the
  // ONE research run. The report is fed from its final patch (final_answer +
  // citations), so what you watch being written IS the published report - 
  // no duplicate /ask-stream run, half the cost and latency.
  const startResearch = (q, opts = {}) => {
    const qText = typeof q === "string" ? q : query;
    if (!qText.trim() || loading) return;

    setLoading(true);
    setAnswer("");
    setSources([]);
    setConfidence(0);
    setReport(null);
    setTelemetry(null);
    setCacheInfo(null);
    setForceFresh(!!opts.forceFresh);
    setRunNonce((n) => n + 1);   // guarantees a fresh engine run even for same query
    setAgentProgress([]);
    setAgentStatus("Neural engine engaged");
    setEngineCollapsed(false);
    setEngineDone(false);
    // Snapshot the query: the engine streams against THIS string, so typing
    // in the search bar afterwards can never re-trigger the pipeline.
    setActiveQuery(qText);
  };

  // Rerun the CURRENT query bypassing the research cache (chip button).
  const rerunFresh = () => startResearch(activeQuery || query, { forceFresh: true });

  // Auto-load a query passed via ?query= (landing hero, example chips, deep
  // links) so results render automatically instead of waiting for the user to
  // re-type and press a button.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("query") || params.get("q") || "").trim();
    if (q) {
      autoRanRef.current = true;
      setQuery(q);
      startResearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a subtle loading state until fonts are ready.
  // NOTE: this early return MUST stay below every hook above - placing it
  // higher skipped the autoRanRef useRef/useEffect on the first (fonts not
  // ready) render, changing hook order once fonts loaded and crashing the
  // whole research page to a blank screen.
  if (!fontsLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#00ff0f', fontSize: '24px' }}>🧠</div>
      </div>
    );
  }

  const handleNew  = () => { setAnswer(""); setQuery(""); setActiveQuery(""); setSources([]); setConfidence(0); setEngineCollapsed(false); setEngineDone(false); };
  const handleCopy = () => { navigator.clipboard.writeText(answer); };
  const confColor  = (v) => v>=80?C.green:v>=60?C.amber:C.crimson;
  const sidebarW   = sidebarCollapsed ? 56 : 320;

  return (
    <div style={{ minHeight:"100vh",background:C.void,position:"relative",overflow:"auto",opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(18px)",transition:"opacity 0.6s ease,transform 0.6s ease" }}>
      <Styles />
      <NeuralCanvas isResearching={loading} />

      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* ── Main pane ── */}
      <div style={{ marginLeft:sidebarW,transition:"margin-left 0.35s cubic-bezier(0.4,0,0.2,1)",position:"relative",zIndex:10,minHeight:"100vh",display:"flex",flexDirection:"column" }}>

        {/* Landing state - full-height Code 1 hero */}
        {!loading && !answer && (
          <LandingHero query={query} setQuery={setQuery} onSearch={startResearch} loading={loading} />
        )}

        {/* --- UPDATED: Engine stays visible during loading AND after answer (collapsible) --- */}
        {(loading || answer) && (
          <div id="engine-panel" style={{
            position: "relative",
            zIndex: 20,
            minHeight: engineCollapsed ? "72px" : "100vh",
            transition: "min-height 0.7s cubic-bezier(0.16,1,0.3,1)",
            overflow: "hidden",
          }}>
            {engineCollapsed && (
              <div
                onClick={() => {
                  setEngineCollapsed(false);
                  setTimeout(() => {
                    document.getElementById("engine-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 80);
                }}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(180deg, rgba(14,16,32,0.96), rgba(10,10,30,0.92))",
                  backdropFilter: "blur(18px) saturate(1.1)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: "1px solid transparent",
                  borderImage: "linear-gradient(90deg, transparent, rgba(0,255,71,0.45), transparent) 1",
                  cursor: "pointer",
                  animation: "sectionIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(18,21,40,0.98), rgba(12,13,34,0.94))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(14,16,32,0.96), rgba(10,10,30,0.92))"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(0,255,71,0.08)", border: "1px solid rgba(0,255,71,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 18px rgba(0,255,71,0.15)",
                  }}>
                    <Icon name="psychology" style={{ color: C.green, fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>
                      Neural Research Engine
                    </div>
                    <div style={{ color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Research complete · 4 agents · tap to reopen the live session
                    </div>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 9999,
                  border: "1px solid rgba(0,255,71,0.3)", background: "rgba(0,255,71,0.06)",
                  color: C.green, fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                  fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  transition: "background 0.25s ease, box-shadow 0.25s ease",
                }}>
                  Expand
                  <Icon name="expand_more" style={{
                    fontSize: 17, color: C.green,
                    transform: "rotate(0deg)", transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </div>
              </div>
            )}
            <div style={{
              display: engineCollapsed ? "none" : "block",
            }}>
              {/* The engine's stream IS the pipeline - its final patch feeds
                  the report below (single run, single source of truth). */}
              <NeuralResearchEngine
                key={runNonce}
                apiUrl={`${API_BASE_URL}/ask-visual`}
                query={activeQuery}
                responseStyle={userStyle}
                streaming={streamingOn}
                forceFresh={forceFresh}
                onComplete={(data) => {
                  const finalAnswer = data?.final_answer || "";
                  // Prefer the structured computed confidence (also present on
                  // cached results); fall back to the live metrics string.
                  const structuredConf = data?.report?.confidence_analysis?.overall;
                  const confMatch = String(data?.metrics?.confidence ?? "").match(/\d+/);
                  const confScore = (typeof structuredConf === "number" && structuredConf)
                    ? Math.min(100, Math.round(structuredConf))
                    : (confMatch ? Math.min(100, parseInt(confMatch[0], 10)) : 0);
                  setAnswer(finalAnswer);
                  setSources(data?.citations || []);
                  setConfidence(confScore);
                  setReport(data?.report || null);
                  setTelemetry(data?.telemetry || null);
                  setSourceSummaries(data?.source_summaries || []);
                  setCacheInfo(data?.cached ? { age: data?.cache_age_label || "" } : null);
                  setNovelty(typeof data?.novelty === "number" ? data.novelty : null);
                  setLoading(false);
                  setAgentStatus("");
                  setEngineDone(true);
                  setHistory((prev) => [{
                    query: activeQuery,
                    confidence: confScore,
                    date: new Date().toLocaleDateString(),
                  }, ...prev].slice(0, 10));
                  // Give the collapse animation a beat, then glide to the report.
                  setTimeout(() => setEngineCollapsed(true), 250);
                  setTimeout(() => {
                    document.getElementById("research-answer")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 700);
                }}
                onError={(msg) => {
                  setLoading(false);
                  setAgentStatus(msg || "Research stream failed");
                }}
              />
            </div>
          </div>
        )}

        {/* --- PATCH 6d: only show report when engine done --- */}
        {answer && engineDone && (
          <div id="research-answer" style={{ padding:"28px 40px",position:"relative", marginTop: loading ? 0 : 32 }}>
            {/* search bar */}
            <div style={{ maxWidth:860,margin:"0 auto 32px" }}>
              <div style={{ display:"flex",alignItems:"center",background:"rgba(1,15,31,0.85)",backdropFilter:"blur(12px)",border:"1px solid rgba(0,255,71,0.3)",borderRadius:9999,padding:"6px 6px 6px 20px" }}>
                <Icon name="search" style={{ color:C.green,fontSize:18,marginRight:10,flexShrink:0 }} />
                <input type="text" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startResearch()}
                  style={{ flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14,padding:"8px 0" }} />
                <button onClick={()=>startResearch()}
                  style={{ background:C.green,color:"#000",padding:"12px 28px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",boxShadow:`0 0 20px ${C.greenGlow}`,flexShrink:0 }}>
                  RESEARCH <Icon name="arrow_forward" style={{ fontSize:12,color:"#000" }} />
                </button>
              </div>
            </div>

            {/* Shuffling pills - always shuffling in results view */}
            <div style={{ maxWidth:860,margin:"0 auto 28px" }}>
              <p style={{ textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.textSecondary,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14,opacity:0.6 }}> -  try one of these - </p>
              <ShufflingPills onSelect={(q)=>{setQuery(q);startResearch(q);}} />
            </div>

            {/* Phase F novelty badge: how much this run expanded your knowledge */}
            {typeof novelty === "number" && (() => {
              const pct = Math.round(novelty * 100);
              const col = pct >= 66 ? "#00ff47" : pct >= 33 ? "#00ccff" : "#8e98a8";
              const label = pct >= 66 ? "New territory" : pct >= 33 ? "Partly familiar" : "Well-trodden";
              return (
                <div style={{ maxWidth:860, margin:"0 auto 14px", display:"flex", justifyContent:"flex-end" }}>
                  <div title="How different this query is from your existing research" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"7px 14px", borderRadius:9999, background:`${col}14`, border:`1px solid ${col}44` }}>
                    <span className="material-symbols-outlined" style={{ fontSize:15, color:col }}>explore</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:col, fontWeight:700 }}>{label} · {pct}% novel</span>
                  </div>
                </div>
              );
            })()}

            {/* Report — admins (dev-preview) see the new PolynousReport wired to
                real data; everyone else keeps the current report. */}
            {isDevPreview() ? (
              <PolynousReport query={query} answer={answer} report={report} sources={sources} confidence={confidence} telemetry={telemetry} sourceSummaries={sourceSummaries} />
            ) : (
              <div style={{ maxWidth:860,margin:"0 auto" }}>
                <NeuralSynthesisReport query={query} answer={answer} report={report} sources={sources} confidence={confidence} confThreshold={confThreshold} telemetry={telemetry} sourceSummaries={sourceSummaries} cacheInfo={cacheInfo} onRerun={rerunFresh} onCopy={handleCopy} onNew={handleNew}
                  onDeepen={(finding) => { const q = String(finding).replace(/\s+/g," ").trim().slice(0,240); setQuery(q); startResearch(q); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </div>
            )}

            {/* History */}
            {history.length>0 && (
              <div style={{ maxWidth:860,margin:"48px auto 0",paddingTop:28,borderTop:"1px solid "+C.white10 }}>
                <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"#fff",marginBottom:14 }}>Research History</h3>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10 }}>
                  {history.map((h,i)=>(
                    <div key={i} className="history-card" onClick={()=>{setQuery(h.query);startResearch(h.query);}}
                      style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid "+C.white10,borderRadius:10,padding:12,cursor:"pointer",transition:"all 0.2s" }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:confColor(h.confidence),marginBottom:4 }}>{h.confidence}% confidence</div>
                      <div style={{ fontFamily:"'Inter',sans-serif",fontSize:13,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{h.query}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.textSecondary,marginTop:4 }}>{h.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}