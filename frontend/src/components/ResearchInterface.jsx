import * as THREE from 'three'
import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../config'
// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green:              "#00ff47",
  greenDim:           "rgba(0,255,71,0.15)",
  greenGlow:          "rgba(0,255,71,0.3)",
  greenGlow10:        "rgba(0,255,71,0.1)",
  greenGlow08:        "rgba(0,255,71,0.08)",
  cyan:               "#00ccff",
  crimson:            "#ff2040",
  amber:              "#ffaa00",
  gold:               "#ffd700",
  purple:             "#a855f7",
  void:               "#051424",
  sidebar:            "#010f1f",
  panel:              "#0d1c2d",
  card:               "#122131",
  surface:            "#111125",
  surfaceContainer:   "#1e1e32",
  onSurface:          "#d4e4fa",
  onSurfaceVariant:   "#84967f",
  textSecondary:      "#8899aa",
  white10:            "rgba(255,255,255,0.1)",
  white5:             "rgba(255,255,255,0.05)",
};

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
    `}</style>
  );
}

// ─── Material Symbol icon ────────────────────────────────────────────────────
function Icon({ name, style: s }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block", ...(s || {})
    }}>{name}</span>
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

      // — Terrain —
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

      // — Discovery Path —
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

      // — Peak Beacon —
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

      // — Particles —
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

      // — Grid —
      const grid = new THREE.GridHelper(240, 50, 0x00ff47, 0x002211);
      grid.position.y = -0.1;
      grid.material.transparent = true;
      grid.material.opacity = 0.08;
      scene.add(grid);

      // — Mouse interaction —
      let targetRotY = 0, targetRotX = 0.3;
      const onMouse = (e) => {
        const mx = (e.clientX / window.innerWidth)  * 2 - 1;
        const my = -(e.clientY / window.innerHeight) * 2 + 1;
        targetRotY = mx * 0.2;
        targetRotX = 0.3 - my * 0.15;
      };
      window.addEventListener("mousemove", onMouse);

      // — Animation loop —
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

      // — Resize —
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon:"travel_explore", label:"Research",       path:"/research",  active:true },
  { icon:"forum",          label:"Debate Chamber", path:"/debate" },
  { icon:"account_tree",   label:"Knowledge Graph",path:"/graph" },
  { icon:"search",         label:"Semantic Search",path:"/search" },
  { icon:"database",       label:"Memory Bank",    path:"/memory" },
  { icon:"picture_as_pdf", label:"PDF Lab",        path:"/pdf-lab" },
  { icon:"analytics",      label:"Analytics",      path:"/analytics" },
  { icon:"settings",       label:"Settings",       path:"/settings" },
];

function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go      = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const logout  = () => (onLogout   ? onLogout()     : (localStorage.clear(), window.location.href = "/"));

  const iconSize = { fontSize:20, color:"inherit" };

  if (collapsed) return (
    <aside style={{ position:"fixed", left:0, top:0, height:"100%", width:56, background:"rgba(1,15,31,0.92)", backdropFilter:"blur(24px)", borderRight:"1px solid "+C.white10, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 0", zIndex:20 }}>
      <button onClick={() => setCollapsed(false)} style={{ background:"none", border:"none", color:C.green, cursor:"pointer", marginBottom:28 }}>
        <Icon name="chevron_right" style={{ fontSize:22 }} />
      </button>
      {NAV_ITEMS.map(({ icon, label, path, active }) => (
        <div key={label} onClick={() => go(path)} title={label}
          style={{ padding:"11px 0", cursor:"pointer", color: active ? C.green : C.onSurfaceVariant, width:"100%", display:"flex", justifyContent:"center" }}>
          <Icon name={icon} style={iconSize} />
        </div>
      ))}
      <div style={{ marginTop:"auto", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div onClick={() => go("/research")} style={{ width:32, height:32, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Icon name="add" style={{ fontSize:16, color:"#000" }} />
        </div>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(18,33,49,0.8)", border:"1px solid rgba(0,255,71,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name="face" style={{ color:C.green, fontSize:14 }} />
        </div>
        <div onClick={logout} title="Disconnect" style={{ cursor:"pointer", color:C.crimson }}>
          <Icon name="logout" style={{ fontSize:14 }} />
        </div>
      </div>
    </aside>
  );

  return (
    <aside style={{ position:"fixed", left:0, top:0, height:"100%", width:260, background:"rgba(1,15,31,0.92)", backdropFilter:"blur(24px)", borderRight:"1px solid "+C.white10, boxShadow:"0 0 20px rgba(0,255,71,0.08)", display:"flex", flexDirection:"column", padding:"24px 0 24px", zIndex:20, transition:"width 0.32s cubic-bezier(0.4,0,0.2,1)", overflow:"hidden" }}>

      {/* Logo */}
      <div style={{ padding:"0 24px 32px", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontSize:22, fontWeight:700, color:C.green, letterSpacing:"0.05em" }}>POLYNOUS</h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.onSurfaceVariant, textTransform:"uppercase", letterSpacing:"0.22em", marginTop:4 }}>Cerebral Vitality Engine</p>
        </div>
        <button onClick={() => setCollapsed(true)} style={{ background:"none", border:"none", color:C.onSurfaceVariant, cursor:"pointer", padding:4, marginLeft:8, marginTop:2 }}
          onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color=C.onSurfaceVariant}>
          <Icon name="chevron_left" style={{ fontSize:20 }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="poly-scroll" style={{ flex:1, padding:"0 12px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
        {NAV_ITEMS.map(({ icon, label, path, active }) => (
          <div key={label} onClick={() => go(path)} className={`nav-item${active?" active":""}`}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, cursor:"pointer",
              color: active ? C.green : C.onSurfaceVariant,
              fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13, fontWeight: active ? 600 : 400 }}>
            <Icon name={icon} style={{ fontSize:18, color:"inherit", flexShrink:0 }} />
            <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding:"20px 16px 0", borderTop:"1px solid "+C.white5 }}>
        <button onClick={() => go("/research")}
          style={{ width:"100%", padding:"12px", background:C.green, color:"#000", fontWeight:700, borderRadius:9999, border:"none", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 0 12px rgba(0,255,71,0.25)", transition:"transform 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          <Icon name="add" style={{ fontSize:16, color:"#000", flexShrink:0 }} /> New Research
        </button>
        <div style={{ marginTop:18, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(18,33,49,0.8)", border:"1px solid rgba(0,255,71,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Icon name="face" style={{ color:C.green, fontSize:20 }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:"'IBM Plex Sans',monospace", fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.username || "Guest"}</p>
            <button onClick={logout} style={{ fontSize:10, color:C.crimson, background:"none", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", padding:0 }}>Disconnect</button>
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

// ─── Suggestion Cards (Code 1 style) ─────────────────────────────────────────
const SUGG_CARDS = [
  { icon:"public",       text:"What is the multiverse theory?" },
  { icon:"biotech",      text:"How do mRNA vaccines work?" },
  { icon:"eco",          text:"Molecular mechanism of photosynthesis?" },
  { icon:"psychology",   text:"Consciousness in neuroscience?" },
  { icon:"coronavirus",  text:"Psychedelics and brain effects?" },
  { icon:"cyclone",      text:"Physics of black hole formation?" },
];

function SuggestionCards({ onSelect }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14, width:"100%", maxWidth:760 }}>
      {SUGG_CARDS.map(({ icon, text }) => (
        <div key={text} className="sugg-card" onClick={() => onSelect(text)}
          style={{ background:"rgba(18,33,49,0.4)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}>
          <Icon name={icon} style={{ color:C.green, fontSize:22, opacity:0.6, flexShrink:0 }} className="sugg-icon" />
          <span style={{ flex:1, fontSize:12, color:"#c8d8ea", fontFamily:"'Inter',sans-serif", fontWeight:500, lineHeight:1.5 }}>{text}</span>
          <Icon name="arrow_forward" style={{ color:C.green, fontSize:14, opacity:0, transition:"all 0.2s" }} className="sugg-arrow" />
        </div>
      ))}
    </div>
  );
}

// ─── Report helpers ───────────────────────────────────────────────────────────
function parseAnswer(text) {
  const summary = (() => { const m=text.match(/📋\s*SUMMARY[:\s]+([\s\S]*?)(?=🔑|⚠️|🎯|  |$)/i); return m?m[1].trim():""; })();
  const findings = (() => {
    const m = text.match(/🔑\s*KEY FINDINGS[:\s]+([\s\S]*?)(?=⚠️|🎯|  |$)/i);
    if (!m) return [];
    const raw = m[1].trim();
    const byNewline = raw.split("\n").filter(l=>/^[-•]/.test(l.trim())).map(l=>l.replace(/^[-•]\s*/,"").trim()).filter(Boolean);
    if (byNewline.length>1) return byNewline;
    const byDot = raw.split(/\s*[•]\s*/).map(s=>s.replace(/^(\[\d+\])+\s*/,"").trim()).filter(s=>s.length>15);
    if (byDot.length>1) return byDot;
    const byCit = raw.split(/(?<=\[\d+\])\s+(?=[A-Z])/).map(s=>s.trim()).filter(s=>s.length>15);
    if (byCit.length>1) return byCit;
    return raw.split(/\.\s+(?=[A-Z])/).map(s=>s.trim()).filter(s=>s.length>20).map(s=>s.endsWith(".")?s:s+".");
  })();
  const limitations = (() => { const m=text.match(/⚠️\s*(?:LIMITATIONS|UNCERTAINTIES|CAVEATS)[:\s]+([\s\S]*?)(?=   |  |$)/i); return m?m[1].trim():""; })();
  const parsedConf   = (() => { const m=text.match(/🎯\s*CONFIDENCE[:\s]+(\d+)/i); return m?parseInt(m[1]):0; })();
  const parsedSources= (() => { const m=text.match(/  \s*SOURCES[:\s]+([\s\S]*?)$/i); if(!m)return[]; return m[1].split("\n").map(l=>l.trim()).filter(Boolean); })();
  return { summary: summary||(findings.length===0&&!limitations?text:""), findings, limitations, parsedConf, parsedSources };
}

function parseLimitationPoints(text) {
  if (!text) return [];
  const lines = text.split(/\n|(?<=\.)\s+(?=[A-Z•\-])/).map(l=>l.replace(/^[-•]\s*/,"").trim()).filter(l=>l.length>10);
  if (lines.length<=1) return text.split(/\.\s+/).map(s=>s.trim()).filter(s=>s.length>10).map(s=>s.endsWith(".")?s:s+".");
  return lines;
}

function SynapseDots({ color = C.green }) {
  return [{ top:-2,left:-2},{top:-2,right:-2},{bottom:-2,left:-2},{bottom:-2,right:-2}].map((pos,i)=>(
    <span key={i} style={{ position:"absolute",width:4,height:4,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`,...pos }} />
  ));
}

// ─── Neural Synthesis Report ──────────────────────────────────────────────────
function NeuralSynthesisReport({ query, answer, sources, confidence, onCopy, onNew }) {
  const { summary, findings, limitations, parsedConf, parsedSources } = parseAnswer(answer);
  const confValue  = parsedConf || confidence;
  const confColor  = confValue>=80 ? C.green : confValue>=60 ? C.amber : C.crimson;
  const forFindings     = findings.filter((_,i)=>i%2===0);
  const againstFindings = findings.filter((_,i)=>i%2!==0);
  const allSources = parsedSources.length>0 ? parsedSources : sources.map(s=>typeof s==="string"?s:s.title||"Source");
  const filled = Math.round(confValue/10);
  const limitationPoints = parseLimitationPoints(limitations);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24,animation:"fadeSlideUp 0.5s ease" }}>

      {/* Header */}
      <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:28,display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden",animation:"sectionIn 0.4s ease" }}>
        <SynapseDots color={C.green} />
        <div style={{ display:"flex",alignItems:"center",gap:18 }}>
          <div style={{ width:54,height:54,borderRadius:"50%",background:"rgba(0,255,71,0.1)",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulseBrain 3s ease-in-out infinite" }}>
            <Icon name="psychology" style={{ color:C.green,fontSize:30 }} />
          </div>
          <div>
            <h2 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:"clamp(1rem,2.5vw,1.3rem)",textTransform:"uppercase",letterSpacing:"0.1em",color:C.onSurface,marginBottom:6 }}>Neural Synthesis Report</h2>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:C.green,marginBottom:3 }}>QUERY: {query}</p>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.textSecondary }}>Generated: {new Date().toLocaleDateString()} · Sources: {allSources.length} found</p>
          </div>
        </div>
        {/* Donut */}
        <div style={{ position:"relative",width:100,height:100,flexShrink:0 }}>
          <svg style={{ width:"100%",height:"100%",transform:"rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke={confColor} strokeWidth="6"
              strokeDasharray={2*Math.PI*40} strokeDashoffset={2*Math.PI*40*(1-confValue/100)}
              style={{ transition:"stroke-dashoffset 1s ease" }} />
          </svg>
          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:20,color:"#fff",lineHeight:1 }}>{confValue}%</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.cyan,textTransform:"uppercase",marginTop:2,letterSpacing:"0.05em" }}>Score</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${C.green}`,borderRadius:14,padding:28,position:"relative",animation:"sectionIn 0.5s 0.08s ease both" }}>
          <SynapseDots color={C.green} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
            <Icon name="auto_awesome" style={{ fontSize:15,color:C.green }} /> Executive Summary
          </div>
          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.85,color:C.onSurface,whiteSpace:"pre-wrap" }}>{summary}</p>
        </div>
      )}

      {/* Findings grid */}
      {findings.length>0 && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,animation:"sectionIn 0.5s 0.16s ease both" }}>
          {/* FOR */}
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 14px",background:"rgba(0,255,71,0.08)",borderRadius:9999,width:"fit-content" }}>
              <Icon name="verified" style={{ color:C.green,fontSize:15 }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em" }}>Synthesis Findings</span>
            </div>
            {(forFindings.length>0?forFindings:findings).map((f,i)=>(
              <div key={i} className="finding-card-green" style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"18px 20px",position:"relative",transition:"border-color 0.2s" }}>
                <span style={{ position:"absolute",top:-2,left:-2,width:4,height:4,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}` }} />
                <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(0,255,71,0.1)",border:`1px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.green,marginTop:2 }}>{i+1}</span>
                  <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:C.onSurface }}>{f}</p>
                </div>
              </div>
            ))}
          </div>
          {/* AGAINST */}
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 14px",background:"rgba(255,32,64,0.08)",borderRadius:9999,width:"fit-content",alignSelf:"flex-end" }}>
              <Icon name="warning" style={{ color:C.crimson,fontSize:15 }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.crimson,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em" }}>Debate Counter-Args</span>
            </div>
            {againstFindings.length>0 ? againstFindings.map((f,i)=>(
              <div key={i} className="finding-card-crimson" style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"18px 20px",position:"relative",transition:"border-color 0.2s" }}>
                <span style={{ position:"absolute",top:-2,right:-2,width:4,height:4,borderRadius:"50%",background:C.crimson,boxShadow:`0 0 8px ${C.crimson}` }} />
                <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(255,32,64,0.1)",border:`1px solid ${C.crimson}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.crimson,marginTop:2 }}>{i+1}</span>
                  <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:C.onSurface }}>{f}</p>
                </div>
              </div>
            )) : (
              <div className="finding-card-crimson" style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"18px 20px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(255,32,64,0.1)",border:`1px solid ${C.crimson}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.crimson,marginTop:2 }}>1</span>
                  <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:C.onSurface }}>Further debate analysis not yet available for this synthesis.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw answer fallback */}
      {findings.length===0 && !summary && (
        <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.2)",borderLeft:`4px solid ${C.green}`,borderRadius:14,padding:28,animation:"sectionIn 0.5s 0.08s ease both" }}>
          <SynapseDots color={C.green} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:18 }}>📋 Research Synthesis</div>
          {(() => {
            const pts = answer.split(/\s*[•]\s*/).map(s=>s.replace(/^(\[\d+\])+\s*/,"").trim()).filter(s=>s.length>15);
            if (pts.length>1) return (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {pts.map((pt,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                    <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(0,255,71,0.1)",border:`1px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.green,marginTop:2 }}>{i+1}</span>
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,color:C.onSurface,lineHeight:1.85 }}>{pt}</p>
                  </div>
                ))}
              </div>
            );
            return <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,color:"#c8d6e5",lineHeight:1.9,whiteSpace:"pre-wrap" }}>{answer}</p>;
          })()}
        </div>
      )}

      {/* Confidence Matrix */}
      <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"18px 26px",animation:"sectionIn 0.5s 0.24s ease both" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14 }}>
          <div style={{ maxWidth:300 }}>
            <h3 style={{ fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.1rem",color:C.cyan,marginBottom:6 }}>Confidence Matrix</h3>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.textSecondary }}>Aggregate certainty across {AGENT_NODES.length} independent agent simulations.</p>
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {Array.from({length:10}).map((_,i)=>(
              <div key={i} style={{ width:20,height:20,borderRadius:"50%",background:i<filled?C.green:"rgba(255,255,255,0.07)",boxShadow:i<filled?`0 0 10px ${C.green}`:"none",border:i>=filled?"1px solid rgba(255,255,255,0.13)":"none",animation:i<filled&&i%3===0?"pulse-green 2s infinite":"none",transition:"all 0.3s" }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop:12,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:confColor }}>
          {confValue>=80?"✓ High Confidence — Research synthesis is reliable":confValue>=60?"△ Moderate — Results are plausible but verify":"⚠ Low Confidence — Treat with caution"}
        </div>
      </div>

      {/* Limitations */}
      {limitations && (
        <div style={{ background:"rgba(255,170,0,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,170,0,0.15)",borderLeft:`4px solid ${C.amber}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.5s 0.32s ease both" }}>
          <SynapseDots color={C.amber} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
            <Icon name="warning" style={{ fontSize:15,color:C.amber }} /> ⚠️ Caveats &amp; Limitations
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {limitationPoints.length>0 ? limitationPoints.map((pt,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(255,170,0,0.1)",border:`1px solid ${C.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.amber,marginTop:2 }}>{i+1}</span>
                <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:"rgba(255,200,100,0.9)",fontStyle:"italic" }}>{pt}</p>
              </div>
            )) : <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:"rgba(255,200,100,0.85)",fontStyle:"italic" }}>{limitations}</p>}
          </div>
        </div>
      )}

      {/* Sources */}
      {allSources.length>0 && (
        <div style={{ animation:"sectionIn 0.5s 0.40s ease both" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.cyan,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:12 }}>Source Constellation (Bibliography)</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
            {allSources.map((s,i)=>(
              <div key={i} className="source-pill" style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,204,255,0.2)",borderRadius:9999,padding:"6px 14px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",transition:"all 0.2s" }}
                onClick={()=>navigator.clipboard.writeText(typeof s==="string"?s:s.url||s)}>
                <Icon name="article" style={{ color:C.cyan,fontSize:13 }} />
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.onSurfaceVariant }}>[{i+1}] {typeof s==="string"?s:s.title||"Source"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:22,animation:"sectionIn 0.5s 0.48s ease both" }}>
        <div style={{ display:"flex",gap:10 }}>
          {[
            { icon:"download", label:"Export", action:()=>{const b=new Blob([`POLYNOUS Neural Synthesis Report\nQuery: ${query}\n\n${answer}`],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-report.txt";a.click();} },
            { icon:"data_object", label:"JSON", action:()=>{const b=new Blob([JSON.stringify({query,answer,confidence,sources:allSources,generated:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-vectors.json";a.click();} },
          ].map(({icon,label,action})=>(
            <button key={label} className="action-btn" onClick={action} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(5,20,36,0.7)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
              <Icon name={icon} style={{ fontSize:15 }} /> {label}
            </button>
          ))}
          <button className="copy-btn" onClick={onCopy} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(5,20,36,0.7)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
            <Icon name="content_copy" style={{ fontSize:15 }} /> Copy
          </button>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={()=>{if(navigator.share)navigator.share({title:"POLYNOUS Research",text:answer});else navigator.clipboard.writeText(window.location.href);}}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 24px",background:C.green,color:"#000",fontWeight:700,borderRadius:9999,border:"none",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,boxShadow:"0 0 20px rgba(0,255,71,0.3)",transition:"all 0.2s" }}>
            <Icon name="share" style={{ fontSize:15,color:"#000" }} /> Share Research
          </button>
          <button onClick={onNew} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurfaceVariant,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
            <Icon name="refresh" style={{ fontSize:15 }} /> New Research
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Landing hero (Code 1 layout) ────────────────────────────────────────────
function LandingHero({ query, setQuery, onSearch, loading }) {
  const handlePill = (q) => { setQuery(q); onSearch(q); };

  return (
    <div style={{ position:"relative",flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px 56px",overflow:"hidden",minHeight:"100vh" }}>

      {/* Three.js mountain — right half */}
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
  const [sources,        setSources]        = useState([]);
  const [confidence,     setConfidence]     = useState(0);
  const [agentStatus,    setAgentStatus]    = useState("");
  const [agentProgress,  setAgentProgress]  = useState([]);
  const [history,        setHistory]        = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [userStyle,      setUserStyle]      = useState("academic");

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
        }
      } catch (e) {
        // ignore
      }
    };
    fetchStyle();
  }, []);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const startResearch = async (q) => {
    const qText = typeof q === "string" ? q : query;
    if (!qText.trim() || loading) return;

    setLoading(true);
    setAnswer("");
    setSources([]);
    setConfidence(0);
    setAgentProgress([]);
    setAgentStatus("Initializing…");

    // ✅ Get JWT token
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE_URL}/ask-stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                query: qText,
                debate_mode: false,
                response_style: userStyle,   // ← ADDED user style
            }),
        });

        if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "", srcList = [], confScore = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            for (const line of chunk.split("\n")) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === "start") {
                            setAgentStatus("Neural network activated");
                        } else if (data.type === "progress") {
                            setAgentStatus(data.message);
                            setAgentProgress(prev => [...prev, data]);
                        } else if (data.type === "token") {
                            fullAnswer += (data.content || "");
                            setAnswer(fullAnswer);
                        } else if (data.type === "citations") {
                            srcList = data.citations || [];
                        } else if (data.type === "confidence") {
                            confScore = data.score || 0;
                        } else if (data.type === "end") {
                            setAnswer(fullAnswer);
                            setSources(srcList);
                            setConfidence(confScore);
                            setAgentStatus("");
                            setHistory(prev => [{
                                query: qText,
                                confidence: confScore,
                                date: new Date().toLocaleDateString()
                            }, ...prev].slice(0, 10));
                        }
                    } catch (e) {
                        // ignore malformed JSON
                    }
                }
            }
        }
    } catch (error) {
        setAgentStatus("Connection error — is the backend running?");
        console.error("Research error:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleNew  = () => { setAnswer(""); setQuery(""); setSources([]); setConfidence(0); };
  const handleCopy = () => { navigator.clipboard.writeText(answer); };
  const confColor  = (v) => v>=80?C.green:v>=60?C.amber:C.crimson;
  const sidebarW   = sidebarCollapsed ? 56 : 260;

  return (
    <div style={{ minHeight:"100vh",background:`radial-gradient(ellipse at 30% 50%, ${C.panel}, ${C.void})`,position:"relative",overflow:"auto",opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(18px)",transition:"opacity 0.6s ease,transform 0.6s ease" }}>
      <Styles />
      <NeuralCanvas isResearching={loading} />

      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* ── Main pane ── */}
      <div style={{ marginLeft:sidebarW,transition:"margin-left 0.32s cubic-bezier(0.4,0,0.2,1)",position:"relative",zIndex:10,minHeight:"100vh",display:"flex",flexDirection:"column" }}>

        {/* Landing state — full-height Code 1 hero */}
        {!loading && !answer && (
          <LandingHero query={query} setQuery={setQuery} onSearch={startResearch} loading={loading} />
        )}

        {/* Thinking state */}
        {loading && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 40px",position:"relative" }}>
            {/* search bar stays visible */}
            <div style={{ width:"100%",maxWidth:760,marginBottom:24 }}>
              <div style={{ display:"flex",alignItems:"center",background:"rgba(1,15,31,0.85)",backdropFilter:"blur(12px)",border:`1px solid rgba(0,255,71,0.4)`,borderRadius:9999,padding:"6px 6px 6px 20px",boxShadow:`0 0 15px rgba(0,255,71,0.1)` }}>
                <Icon name="search" style={{ color:C.green,fontSize:18,marginRight:10,flexShrink:0 }} />
                <span style={{ flex:1,fontFamily:"'Inter',sans-serif",fontSize:14,color:"#fff" }}>{query}</span>
                <button disabled style={{ background:"#333",color:"#888",padding:"12px 28px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"not-allowed" }}>THINKING…</button>
              </div>
            </div>
            <ThinkingCanvas agentStatus={agentStatus} agentProgress={agentProgress} />
          </div>
        )}

        {/* Results state */}
        {answer && !loading && (
          <div style={{ padding:"28px 40px",position:"relative" }}>
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

            {/* Shuffling pills — always shuffling in results view */}
            <div style={{ maxWidth:860,margin:"0 auto 28px" }}>
              <p style={{ textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.textSecondary,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14,opacity:0.6 }}>— try one of these —</p>
              <ShufflingPills onSelect={(q)=>{setQuery(q);startResearch(q);}} />
            </div>

            {/* Report */}
            <div style={{ maxWidth:860,margin:"0 auto" }}>
              <NeuralSynthesisReport query={query} answer={answer} sources={sources} confidence={confidence} onCopy={handleCopy} onNew={handleNew} />
            </div>

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