import * as THREE from 'three';
import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  // Background system — exact navy from reference image
  void:               "#0a0a1e",
  voidDeep:           "#07071a",
  voidMid:            "#0d0d24",
  sidebar:            "#08081c",
  panel:              "#0f0f28",
  card:               "#13132e",
  surface:            "#111130",
  surfaceContainer:   "#1a1a38",

  // Accents — unchanged from team palette
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

  // Text
  onSurface:          "#d4e4fa",
  onSurfaceVariant:   "#6a7f9a",
  textSecondary:      "#8899aa",
  white10:            "rgba(255,255,255,0.1)",
  white5:             "rgba(255,255,255,0.05)",
  white3:             "rgba(255,255,255,0.03)",
};

// ─── Google Fonts + global styles ─────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@400;600;700;800&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; }
      body {
        background: ${C.void};
        color: ${C.onSurface};
        font-family: 'Inter', sans-serif;
        overflow-x: hidden;
      }
      ::selection { background: ${C.green}; color: #000; }

      .poly-scroll::-webkit-scrollbar { width: 4px; }
      .poly-scroll::-webkit-scrollbar-track { background: transparent; }
      .poly-scroll::-webkit-scrollbar-thumb { background: rgba(0,255,71,0.18); border-radius: 10px; }

      .nav-item { transition: all 0.18s ease; }
      .nav-item:hover { color: #fff !important; background: rgba(255,255,255,0.04) !important; }
      .nav-item.active {
        color: ${C.green} !important;
        background: linear-gradient(90deg, rgba(0,255,71,0.08) 0%, transparent 100%) !important;
        border-left: 2px solid ${C.green};
      }

      .pill-btn { transition: all 0.22s ease; cursor: pointer; }
      .pill-btn:hover {
        background: rgba(0,255,71,0.08) !important;
        border-color: rgba(0,255,71,0.45) !important;
        color: #fff !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 20px rgba(0,255,71,0.12) !important;
      }

      .sugg-card { transition: all 0.2s ease; cursor: pointer; }
      .sugg-card:hover {
        background: rgba(19,19,46,0.9) !important;
        border-color: rgba(0,255,71,0.28) !important;
        transform: translateY(-2px) !important;
      }
      .sugg-card:hover .sugg-arrow { opacity: 1 !important; transform: translateX(4px) !important; }

      .history-card:hover { border-color: rgba(0,255,71,0.3) !important; background: rgba(7,7,26,0.9) !important; }
      .action-btn:hover { background: rgba(255,255,255,0.05) !important; }
      .copy-btn:hover { background: rgba(0,255,71,0.07) !important; border-color: rgba(0,255,71,0.28) !important; color: ${C.green} !important; }
      .source-pill:hover { border-color: rgba(0,204,255,0.5) !important; background: rgba(0,204,255,0.07) !important; transform: translateY(-1px); }

      /* Report prose styles */
      .report-prose { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.85; color: ${C.onSurface}; }
      .report-prose p { margin-bottom: 14px; }
      .report-prose p:last-child { margin-bottom: 0; }

      @keyframes fadeSlideUp   { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes sectionIn     { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse-green   { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
      @keyframes pulseBrain    { 0%,100% { opacity:1; transform:scale(1); filter:drop-shadow(0 0 8px ${C.green}); } 50% { opacity:.75; transform:scale(1.04); filter:drop-shadow(0 0 18px ${C.green}); } }
      @keyframes shimmer       { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes orbitSpin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fadeIn        { from { opacity: 0; } to { opacity: 1; } }
    `}</style>
  );
}

function Icon({ name, style: s, className }) {
  return (
    <span className={className} style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block", userSelect: "none", ...(s || {})
    }}>{name}</span>
  );
}

const getToken = () => window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';

// ─── Neural canvas background ──────────────────────────────────────────────────
function NeuralCanvas({ isResearching }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [], animId;
    const N = 70;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    for (let i = 0; i < N; i++) particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random()-0.5) * (isResearching ? 0.7 : 0.28),
      vy: (Math.random()-0.5) * (isResearching ? 0.7 : 0.28),
      size: Math.random() * 1.4 + 0.4,
      opacity: Math.random() * 0.25 + (isResearching ? 0.15 : 0.05),
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
          if (d < 80) {
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(particles[j].x,particles[j].y);
            ctx.strokeStyle = `rgba(0,255,71,${0.05*(1-d/80)})`; ctx.lineWidth=0.3; ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",resize); };
  }, [isResearching]);
  return <canvas ref={ref} style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none",opacity:0.55 }} />;
}

// ─── Three.js Mountain ────────────────────────────────────────────────────────
function ThreeMountain() {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const init = (THREE) => {
      let width = container.offsetWidth, height = container.offsetHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
      camera.position.set(0, 15, 40); camera.lookAt(0, 5, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);
      const neonGreen = new THREE.Color(0x00ff47);
      // Terrain
      const terrainSize = 120, terrainSegments = 70;
      const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
      const verts = geometry.attributes.position.array;
      for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i], y = verts[i+1];
        const d1 = Math.sqrt((x-15)**2+(y-15)**2);
        const d2 = Math.sqrt((x+25)**2+(y-5)**2);
        const d3 = Math.sqrt((x-5)**2+(y+25)**2);
        let h = Math.max(0, 28 - d1*0.9)*1.3;
        h += Math.max(0, 18 - d2*0.7);
        h += Math.max(0, 12 - d3*0.6);
        h += Math.sin(x*0.5)*Math.cos(y*0.5)*2.5;
        verts[i+2] = h;
      }
      geometry.computeVertexNormals();
      const terrain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: neonGreen, wireframe: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      terrain.rotation.x = -Math.PI/2; scene.add(terrain);
      // Path
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-35,0,45), new THREE.Vector3(-15,1,35),
        new THREE.Vector3(5,3,25), new THREE.Vector3(0,7,15),
        new THREE.Vector3(12,15,20), new THREE.Vector3(15,26,15),
      ]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,120,0.15,8,false), new THREE.MeshBasicMaterial({ color: neonGreen, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })));
      // Beacon
      const beaconGroup = new THREE.Group(); beaconGroup.position.set(15,26,15); scene.add(beaconGroup);
      beaconGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.6,16,16), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      const glow = new THREE.Mesh(new THREE.SphereGeometry(3.5,32,32), new THREE.MeshBasicMaterial({ color: neonGreen, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
      beaconGroup.add(glow);
      // Particles
      const N = 800; const pos = new Float32Array(N*3);
      for (let i = 0; i < N; i++) { pos[i*3]=(Math.random()-.5)*140; pos[i*3+1]=Math.random()*50; pos[i*3+2]=(Math.random()-.5)*140; }
      const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pos,3));
      const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: neonGreen, size: 0.08, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }));
      scene.add(particles);
      scene.add(Object.assign(new THREE.GridHelper(240,50,0x00ff47,0x000a1e), { position: { y: -0.1 }, material: Object.assign(new THREE.LineBasicMaterial(), { transparent: true, opacity: 0.06 }) }));
      let targetRotY=0, targetRotX=0.3;
      const onMouse = (e) => { targetRotY=(e.clientX/window.innerWidth*2-1)*0.2; targetRotX=0.3-(-(e.clientY/window.innerHeight*2-1))*0.15; };
      window.addEventListener("mousemove", onMouse);
      let animId;
      const animate = (t) => {
        animId = requestAnimationFrame(animate);
        scene.rotation.y += (targetRotY-scene.rotation.y)*0.05;
        scene.rotation.x += (targetRotX-scene.rotation.x)*0.05;
        terrain.rotation.z += 0.0004;
        const s = 1+Math.sin(t*0.003)*0.4; glow.scale.set(s,s,s); glow.material.opacity=0.28+Math.sin(t*0.003)*0.18;
        particles.position.y = Math.sin(t*0.0006)*2;
        renderer.render(scene, camera);
      };
      animate(0);
      const onResize = () => { width=container.offsetWidth; height=container.offsetHeight; camera.aspect=width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height); };
      window.addEventListener("resize", onResize);
      return () => { cancelAnimationFrame(animId); window.removeEventListener("mousemove",onMouse); window.removeEventListener("resize",onResize); renderer.dispose(); if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
    };
    // Use named import first, then window.THREE, then CDN fallback
    try { if (THREE) return init(THREE); } catch(e) {}
    if (window.THREE) return init(window.THREE);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => init(window.THREE);
    document.head.appendChild(script);
  }, []);
  return <div ref={containerRef} style={{ position:"absolute",top:0,right:0,width:"52%",height:"100%",zIndex:0,pointerEvents:"none" }} />;
}

// ─── Agent labels ─────────────────────────────────────────────────────────────
function AgentLabels() {
  const labels = ["SEARCH","ANALYZE","SYNTHESIZE","VERIFY","ANSWER"];
  const offsets = ["0px","18px","8px","30px","44px"];
  const lineWidths = ["60px","90px","75px","45px","30px"];
  return (
    <div style={{ position:"absolute",right:32,top:"22%",bottom:"22%",display:"flex",flexDirection:"column",justifyContent:"space-between",zIndex:5,pointerEvents:"none" }}>
      {labels.map((label,i) => (
        <div key={label} style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,transform:`translateX(${offsets[i]})` }}>
          <div style={{ height:1,width:lineWidths[i],background:"rgba(0,255,71,0.25)" }} />
          <div style={{ border:"1px solid rgba(0,255,71,0.35)",padding:"4px 11px",borderRadius:4,fontSize:9,color:C.green,letterSpacing:"0.25em",background:"rgba(10,10,30,0.82)",backdropFilter:"blur(8px)",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:500 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Thinking agent orbit ─────────────────────────────────────────────────────
const AGENT_NODES = [
  { color:C.cyan,    icon:"search",        title:"Search",     shadow:C.cyan },
  { color:"#5878d4", icon:"auto_awesome",  title:"Summariser", shadow:"#5878d4" },
  { color:C.amber,   icon:"priority_high", title:"Critic",     shadow:C.amber },
  { color:C.purple,  icon:"edit",          title:"Writer",     shadow:C.purple },
  { color:C.green,   icon:"add_circle",    title:"FOR",        shadow:C.green, iconColor:"#000" },
  { color:C.crimson, icon:"remove_circle", title:"AGAINST",    shadow:C.crimson, iconColor:"#fff" },
  { color:C.gold,    icon:"gavel",         title:"Judge",      shadow:C.gold },
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
        const r=155, offset=(i/AGENT_NODES.length)*Math.PI*2;
        node.style.transform = `translate(calc(-50% + ${Math.cos(angle+offset)*r}px), calc(-50% + ${Math.sin(angle+offset)*r}px))`;
      });
      animRef.current = requestAnimationFrame(rotate);
    };
    rotate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const activeAgent    = AGENT_NODES.find(a => agentStatus?.toLowerCase().includes(a.title.toLowerCase()));
  const completedCount = agentProgress.length;

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",margin:"40px 0" }}>
      <div style={{ width:360,height:360,borderRadius:"50%",border:"2px dashed rgba(0,255,71,0.18)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ textAlign:"center",zIndex:10,background:"rgba(10,10,30,0.88)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.22)",borderRadius:"50%",width:138,height:138,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(0,255,71,0.1)" }}>
          <Icon name="hub" style={{ color:C.green,fontSize:28,marginBottom:4,animation:"pulse-green 2s infinite" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.green,textTransform:"uppercase",letterSpacing:"0.1em" }}>SYNTHESIZING</div>
          <div style={{ fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:700,color:"#fff" }}>{Math.min(Math.round(completedCount*14.2),99)}%</div>
        </div>
        {AGENT_NODES.map((node, i) => {
          const completed = agentProgress.some(p => p.agent?.toLowerCase().includes(node.title.toLowerCase()));
          const isActive  = activeAgent?.title === node.title;
          const angle     = (i/AGENT_NODES.length)*Math.PI*2;
          const r=155;
          return (
            <div key={node.title} ref={el => nodeRefs.current[i]=el} title={node.title}
              style={{ position:"absolute",left:`calc(50% + ${Math.cos(angle)*r}px)`,top:`calc(50% + ${Math.sin(angle)*r}px)`,transform:"translate(-50%,-50%)",
                width:isActive?44:36,height:isActive?44:36,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                background:completed?node.color:"rgba(255,255,255,0.06)",
                boxShadow:completed?`0 0 15px ${node.shadow}`:"none",
                border:isActive?`2px solid ${node.color}`:"none",
                opacity:completed||isActive?1:0.3,transition:"all 0.5s",
                animation:isActive?"pulse-green 1.5s infinite":"none" }}>
              <Icon name={node.icon} style={{ color:node.iconColor||(completed?"#000":C.textSecondary),fontSize:isActive?20:16 }} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:18,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.textSecondary,textAlign:"center" }}>
        {agentProgress.map((p,i) => <span key={i} style={{ color:C.green,margin:"0 5px" }}>✓ {p.agent}</span>)}
        {activeAgent && <span style={{ color:C.cyan }}>&nbsp;&nbsp;{activeAgent.title} working…</span>}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon:"travel_explore", label:"Research",        path:"/research", active:true },
  { icon:"forum",          label:"Debate Chamber",  path:"/debate" },
  { icon:"account_tree",   label:"Knowledge Graph", path:"/graph" },
  { icon:"search",         label:"Semantic Search", path:"/search" },
  { icon:"database",       label:"Memory Bank",     path:"/memory" },
  { icon:"picture_as_pdf", label:"PDF Lab",         path:"/pdf-lab" },
  { icon:"analytics",      label:"Analytics",       path:"/analytics" },
  { icon:"settings",       label:"Settings",        path:"/settings" },
];

function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go     = (p) => onNavigate ? onNavigate(p) : (window.location.href=p);
  const logout = () => onLogout ? onLogout() : (localStorage.clear(), window.location.href="/");

  if (collapsed) return (
    <aside style={{ position:"fixed",left:0,top:0,height:"100%",width:56,background:"rgba(8,8,28,0.94)",backdropFilter:"blur(24px)",borderRight:"1px solid "+C.white10,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0",zIndex:20 }}>
      <button onClick={()=>setCollapsed(false)} style={{ background:"none",border:"none",color:C.green,cursor:"pointer",marginBottom:28 }}>
        <Icon name="chevron_right" style={{ fontSize:22 }} />
      </button>
      {NAV_ITEMS.map(({ icon, label, path, active }) => (
        <div key={label} onClick={()=>go(path)} title={label} style={{ padding:"11px 0",cursor:"pointer",color:active?C.green:C.onSurfaceVariant,width:"100%",display:"flex",justifyContent:"center" }}>
          <Icon name={icon} style={{ fontSize:20,color:"inherit" }} />
        </div>
      ))}
      <div style={{ marginTop:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
        <div onClick={()=>go("/research")} style={{ width:32,height:32,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
          <Icon name="add" style={{ fontSize:16,color:"#000" }} />
        </div>
        <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(19,19,46,0.8)",border:"1px solid rgba(0,255,71,0.3)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon name="face" style={{ color:C.green,fontSize:14 }} />
        </div>
        <div onClick={logout} title="Disconnect" style={{ cursor:"pointer",color:C.crimson }}>
          <Icon name="logout" style={{ fontSize:14 }} />
        </div>
      </div>
    </aside>
  );

  return (
    <aside style={{ position:"fixed",left:0,top:0,height:"100%",width:260,background:"rgba(8,8,28,0.94)",backdropFilter:"blur(24px)",borderRight:"1px solid "+C.white10,boxShadow:"0 0 24px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",padding:"24px 0",zIndex:20,transition:"width 0.32s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden" }}>
      <div style={{ padding:"0 24px 32px",display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:22,fontWeight:700,color:C.green,letterSpacing:"0.05em" }}>POLYNOUS</h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.onSurfaceVariant,textTransform:"uppercase",letterSpacing:"0.22em",marginTop:4 }}>Cerebral Vitality Engine</p>
        </div>
        <button onClick={()=>setCollapsed(true)} style={{ background:"none",border:"none",color:C.onSurfaceVariant,cursor:"pointer",padding:4 }}
          onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color=C.onSurfaceVariant}>
          <Icon name="chevron_left" style={{ fontSize:20 }} />
        </button>
      </div>
      <nav className="poly-scroll" style={{ flex:1,padding:"0 12px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto" }}>
        {NAV_ITEMS.map(({ icon, label, path, active }) => (
          <div key={label} onClick={()=>go(path)} className={`nav-item${active?" active":""}`}
            style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,cursor:"pointer",color:active?C.green:C.onSurfaceVariant,fontFamily:"'IBM Plex Sans',sans-serif",fontSize:13,fontWeight:active?600:400 }}>
            <Icon name={icon} style={{ fontSize:18,color:"inherit",flexShrink:0 }} />
            <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{label}</span>
          </div>
        ))}
      </nav>
      <div style={{ padding:"20px 16px 0",borderTop:"1px solid "+C.white5 }}>
        <button onClick={()=>go("/research")}
          style={{ width:"100%",padding:"12px",background:C.green,color:"#000",fontWeight:700,borderRadius:9999,border:"none",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 0 14px rgba(0,255,71,0.22)",transition:"transform 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          <Icon name="add" style={{ fontSize:16,color:"#000",flexShrink:0 }} /> New Research
        </button>
        <div style={{ marginTop:18,display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:38,height:38,borderRadius:"50%",background:"rgba(19,19,46,0.8)",border:"1px solid rgba(0,255,71,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <Icon name="face" style={{ color:C.green,fontSize:20 }} />
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:13,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{user?.username||"Guest"}</p>
            <button onClick={logout} style={{ fontSize:10,color:C.crimson,background:"none",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",padding:0 }}>Disconnect</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── All suggestion questions — expanded pool ─────────────────────────────────
const ALL_QUESTIONS = [
  // Science & Physics
  "How does quantum entanglement actually work?",
  "What is dark matter and why can't we see it?",
  "How do black holes evaporate via Hawking radiation?",
  "What happens at the center of a black hole?",
  "Physics of black hole formation and Hawking radiation?",
  "How does general relativity curve spacetime?",
  "What is the theory of everything in physics?",
  "How does CERN's Large Hadron Collider work?",
  "What is quantum superposition and measurement problem?",
  "How do gravitational waves propagate through spacetime?",
  // Biology & Medicine
  "How does CRISPR gene editing work at the molecular level?",
  "How do mRNA vaccines train the immune system?",
  "Molecular mechanism of photosynthesis explained?",
  "How does the gut microbiome affect mental health?",
  "What is epigenetics and how does it change gene expression?",
  "How do neurons form and prune synaptic connections?",
  "What causes aging at the cellular level?",
  "How do psychedelics alter brain chemistry?",
  "What is consciousness from a neuroscience perspective?",
  "How does memory consolidation work during sleep?",
  // AI & Technology
  "How do large language models actually learn?",
  "What are the risks of artificial general intelligence?",
  "How does reinforcement learning from human feedback work?",
  "What is quantum computing and when will it matter?",
  "How does blockchain achieve decentralized consensus?",
  "What makes transformer architecture so powerful?",
  "How does DALL-E generate images from text?",
  "What is federated learning and why does privacy matter?",
  // Earth & Space
  "What causes climate change at a molecular level?",
  "How does the Earth's magnetic field protect us?",
  "What is the Fermi Paradox and its best solutions?",
  "How did the Moon form from the early Earth?",
  "What is the multiverse theory and is it testable?",
  "How do solar flares threaten modern civilization?",
  // Society & Economics
  "What caused the 2008 financial crisis?",
  "How does nuclear energy compare to renewables?",
  "What is the science behind addiction and recovery?",
  "How do social media algorithms shape political opinion?",
  "What is the economic impact of automation on labor?",
];

function shuffle(arr) {
  const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}

// ─── Shuffling Pills — improved with categories ───────────────────────────────
function ShufflingPills({ onSelect }) {
  const VISIBLE = 6;
  const [displayed, setDisplayed] = useState(() => shuffle(ALL_QUESTIONS).slice(0, VISIBLE));
  const [fading,    setFading]    = useState(false);
  const [key,       setKey]       = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setDisplayed(shuffle(ALL_QUESTIONS).slice(0, VISIBLE));
        setKey(k => k+1);
        setFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center",marginBottom:24,opacity:fading?0:1,transform:fading?"translateY(8px)":"translateY(0)",transition:"opacity 0.4s ease,transform 0.4s ease" }}>
      {displayed.map((pill, i) => (
        <button key={`${key}-${i}`} className="pill-btn" onClick={() => onSelect(pill)} style={{
          padding:"9px 18px",borderRadius:30,background:"rgba(13,13,36,0.75)",backdropFilter:"blur(20px)",
          border:"1px solid rgba(0,255,71,0.16)",color:"rgba(212,228,250,0.82)",cursor:"pointer",
          fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:500,lineHeight:1.4,
          animation:`fadeSlideUp 0.38s ${i*50}ms ease both`,
        }}>{pill}</button>
      ))}
    </div>
  );
}

// ─── Suggestion cards ─────────────────────────────────────────────────────────
const SUGG_CARDS = [
  { icon:"public",       text:"What is the multiverse theory and is it testable?" },
  { icon:"biotech",      text:"How do mRNA vaccines train the immune system?" },
  { icon:"eco",          text:"Molecular mechanism of photosynthesis explained?" },
  { icon:"psychology",   text:"What is consciousness from a neuroscience perspective?" },
  { icon:"science",      text:"How do psychedelics alter brain chemistry?" },
  { icon:"cyclone",      text:"What happens at the center of a black hole?" },
];

function SuggestionCards({ onSelect }) {
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,width:"100%",maxWidth:760 }}>
      {SUGG_CARDS.map(({ icon, text }) => (
        <div key={text} className="sugg-card" onClick={() => onSelect(text)}
          style={{ background:"rgba(15,15,38,0.5)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px 18px",display:"flex",alignItems:"center",gap:12 }}>
          <Icon name={icon} style={{ color:C.green,fontSize:20,opacity:0.55,flexShrink:0 }} />
          <span style={{ flex:1,fontSize:12,color:"#c0d4ec",fontFamily:"'Inter',sans-serif",fontWeight:500,lineHeight:1.5 }}>{text}</span>
          <Icon name="arrow_forward" style={{ color:C.green,fontSize:13,opacity:0,transition:"all 0.2s" }} className="sugg-arrow" />
        </div>
      ))}
    </div>
  );
}

// ─── IMPROVED Report Parser ───────────────────────────────────────────────────
function parseReportSections(text) {
  if (!text) return { type:"empty" };

  // Try structured emoji sections
  const summaryMatch     = text.match(/📋\s*SUMMARY[:\s]*([\s\S]*?)(?=🔑|⚠️|🎯|\n\n\n|$)/i);
  const findingsMatch    = text.match(/🔑\s*KEY FINDINGS[:\s]*([\s\S]*?)(?=⚠️|🎯|\n\n\n|$)/i);
  const limitationsMatch = text.match(/⚠️\s*(?:LIMITATIONS?|UNCERTAINTIES|CAVEATS)[:\s]*([\s\S]*?)(?=🎯|\n\n\n|$)/i);
  const confMatch        = text.match(/🎯\s*CONFIDENCE[:\s]*(\d+)/i);
  const sourcesMatch     = text.match(/📚\s*SOURCES?[:\s]*([\s\S]*?)$/i);

  const summary     = summaryMatch   ? summaryMatch[1].trim()     : "";
  const findingsRaw = findingsMatch  ? findingsMatch[1].trim()    : "";
  const limitations = limitationsMatch ? limitationsMatch[1].trim() : "";
  const confidence  = confMatch ? parseInt(confMatch[1]) : 0;

  // Parse findings into array
  let findings = [];
  if (findingsRaw) {
    const bullets = findingsRaw.split(/\n/).filter(l => /^[-•\d\*]/.test(l.trim()));
    if (bullets.length > 1) {
      findings = bullets.map(l => l.replace(/^[-•\*\d\.]\s*/,"").trim()).filter(Boolean);
    } else {
      // split by sentences
      findings = findingsRaw.split(/\.\s+(?=[A-Z])/).map(s=>s.trim()).filter(s=>s.length>20).map(s=>s.endsWith(".")?s:s+".");
    }
  }

  // Sources
  let sources = [];
  if (sourcesMatch) {
    sources = sourcesMatch[1].split(/\n/).map(l=>l.trim()).filter(Boolean);
  }

  if (summary || findings.length > 0) {
    return { type:"structured", summary, findings, limitations, confidence, sources };
  }

  // Fallback: treat as prose, split into paragraphs
  const paragraphs = text.split(/\n\n+/).map(p=>p.trim()).filter(p=>p.length>30);
  if (paragraphs.length > 1) {
    return { type:"prose", paragraphs, confidence, sources };
  }

  // Last resort: bullet split by •
  const bulletSplit = text.split(/\s*[•]\s*/).map(s=>s.replace(/^(\[\d+\])+\s*/,"").trim()).filter(s=>s.length>15);
  if (bulletSplit.length > 2) {
    return { type:"bullets", items:bulletSplit, confidence, sources };
  }

  return { type:"raw", text, confidence, sources };
}

function parseLimitationPoints(text) {
  if (!text) return [];
  const lines = text.split(/\n|(?<=\.)\s+(?=[A-Z•\-])/).map(l=>l.replace(/^[-•]\s*/,"").trim()).filter(l=>l.length>10);
  if (lines.length > 1) return lines;
  return text.split(/\.\s+/).map(s=>s.trim()).filter(s=>s.length>10).map(s=>s.endsWith(".")?s:s+".");
}

// ─── Synapse corner dots ──────────────────────────────────────────────────────
function SynapseDots({ color=C.green }) {
  return [{ top:-2,left:-2 },{ top:-2,right:-2 },{ bottom:-2,left:-2 },{ bottom:-2,right:-2 }].map((pos,i) => (
    <span key={i} style={{ position:"absolute",width:4,height:4,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`,...pos }} />
  ));
}

// ─── Section header label ─────────────────────────────────────────────────────
function SectionLabel({ icon, text, color=C.green }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
      <Icon name={icon} style={{ fontSize:14,color }} />
      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color,textTransform:"uppercase",letterSpacing:"0.2em",fontWeight:600 }}>{text}</span>
    </div>
  );
}

// ─── Finding card ─────────────────────────────────────────────────────────────
function FindingCard({ index, text, accent=C.green, delay=0 }) {
  return (
    <div style={{ display:"flex",gap:14,padding:"16px 20px",background:"rgba(10,10,30,0.6)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,position:"relative",animation:`sectionIn 0.4s ${delay}ms ease both`,transition:"border-color 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=`${accent}44`}
      onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
      <span style={{ flexShrink:0,width:24,height:24,borderRadius:"50%",background:`${accent}18`,border:`1px solid ${accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:800,color:accent,marginTop:1 }}>{index}</span>
      <p style={{ fontFamily:"'Inter',sans-serif",fontSize:13.5,lineHeight:1.82,color:C.onSurface,margin:0 }}>{text}</p>
    </div>
  );
}

// ─── MAIN Neural Synthesis Report — drastically improved ─────────────────────
function NeuralSynthesisReport({ query, answer, sources: rawSources, confidence: rawConf, onCopy, onNew }) {
  const parsed = parseReportSections(answer);
  const confValue  = parsed.confidence || rawConf || 0;
  const confColor  = confValue>=80?C.green:confValue>=60?C.amber:C.crimson;
  const confLabel  = confValue>=80?"High Confidence":confValue>=60?"Moderate Confidence":"Low Confidence";
  const filled     = Math.round(confValue/10);

  const allSources = (parsed.sources?.length>0 ? parsed.sources : rawSources || []).map(s=>typeof s==="string"?s:s.title||"Source");
  const limitPoints = parseLimitationPoints(parsed.limitations||"");

  // For structured findings: split into synthesis / counter columns
  const findings = parsed.findings || [];
  const synFindings   = findings.filter((_,i)=>i%2===0);
  const counterFindings = findings.filter((_,i)=>i%2!==0);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20,animation:"fadeSlideUp 0.5s ease" }}>

      {/* ── Report Header ── */}
      <div style={{ background:"rgba(10,10,30,0.75)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:16,padding:"24px 28px",position:"relative",overflow:"hidden",animation:"sectionIn 0.4s ease" }}>
        <SynapseDots color={C.green} />
        {/* Subtle gradient overlay */}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(0,255,71,0.03) 0%,transparent 60%)",pointerEvents:"none" }} />
        <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(0,255,71,0.08)",border:"1px solid rgba(0,255,71,0.25)",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulseBrain 3s ease-in-out infinite",flexShrink:0 }}>
              <Icon name="psychology" style={{ color:C.green,fontSize:28 }} />
            </div>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.green,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:6 }}>Neural Synthesis Report</div>
              <h2 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:"clamp(0.9rem,2vw,1.15rem)",color:C.onSurface,lineHeight:1.3,marginBottom:4 }}>{query}</h2>
              <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.textSecondary }}>
                {new Date().toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"})} · {allSources.length} sources · {AGENT_NODES.length} agents
              </p>
            </div>
          </div>
          {/* Confidence donut */}
          <div style={{ position:"relative",width:90,height:90,flexShrink:0 }}>
            <svg style={{ width:"100%",height:"100%",transform:"rotate(-90deg)" }}>
              <circle cx="45" cy="45" r="36" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle cx="45" cy="45" r="36" fill="transparent" stroke={confColor} strokeWidth="5"
                strokeDasharray={2*Math.PI*36} strokeDashoffset={2*Math.PI*36*(1-confValue/100)}
                style={{ transition:"stroke-dashoffset 1.2s ease",strokeLinecap:"round" }} />
            </svg>
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:18,color:"#fff",lineHeight:1 }}>{confValue}%</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.cyan,textTransform:"uppercase",marginTop:2 }}>Score</span>
            </div>
          </div>
        </div>
        {/* Confidence bar */}
        <div style={{ marginTop:16,display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ flex:1,height:3,background:"rgba(255,255,255,0.06)",borderRadius:9999,overflow:"hidden" }}>
            <div style={{ width:`${confValue}%`,height:"100%",background:`linear-gradient(to right, ${confColor}88, ${confColor})`,borderRadius:9999,transition:"width 1s ease",boxShadow:`0 0 8px ${confColor}88` }} />
          </div>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:confColor,whiteSpace:"nowrap" }}>{confLabel}</span>
        </div>
      </div>

      {/* ── Render by parsed type ── */}

      {/* STRUCTURED: summary + findings + limitations */}
      {parsed.type==="structured" && <>

        {/* Executive Summary */}
        {parsed.summary && (
          <div style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`3px solid ${C.green}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.4s 0.06s ease both" }}>
            <SynapseDots color={C.green} />
            <SectionLabel icon="auto_awesome" text="Executive Summary" />
            <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.88,color:C.onSurface,whiteSpace:"pre-wrap",margin:0 }}>{parsed.summary}</p>
          </div>
        )}

        {/* Key Findings — two columns */}
        {findings.length > 0 && (
          <div style={{ animation:"sectionIn 0.4s 0.12s ease both" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {/* Left: Synthesis findings */}
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"4px 12px",background:"rgba(0,255,71,0.07)",borderRadius:9999,width:"fit-content",marginBottom:4 }}>
                  <Icon name="verified" style={{ color:C.green,fontSize:14 }} />
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em" }}>Synthesis Findings</span>
                </div>
                {(synFindings.length>0?synFindings:findings).map((f,i) => (
                  <FindingCard key={i} index={i+1} text={f} accent={C.green} delay={i*60} />
                ))}
              </div>
              {/* Right: Counter / debate */}
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"4px 12px",background:"rgba(255,32,64,0.07)",borderRadius:9999,width:"fit-content",alignSelf:"flex-end",marginBottom:4 }}>
                  <Icon name="warning" style={{ color:C.crimson,fontSize:14 }} />
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.crimson,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em" }}>Counter Arguments</span>
                </div>
                {counterFindings.length>0 ? counterFindings.map((f,i) => (
                  <FindingCard key={i} index={i+1} text={f} accent={C.crimson} delay={i*60+30} />
                )) : (
                  <div style={{ padding:"16px 20px",background:"rgba(10,10,30,0.5)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10 }}>
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:13,color:C.textSecondary,fontStyle:"italic",margin:0 }}>Debate counter-analysis not yet available for this synthesis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Limitations */}
        {parsed.limitations && (
          <div style={{ background:"rgba(255,170,0,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,170,0,0.14)",borderLeft:`3px solid ${C.amber}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.4s 0.18s ease both" }}>
            <SynapseDots color={C.amber} />
            <SectionLabel icon="warning" text="Caveats & Limitations" color={C.amber} />
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {limitPoints.length>0 ? limitPoints.map((pt,i) => (
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <span style={{ flexShrink:0,width:22,height:22,borderRadius:"50%",background:"rgba(255,170,0,0.1)",border:`1px solid ${C.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:800,color:C.amber,marginTop:2 }}>{i+1}</span>
                  <p style={{ fontFamily:"'Inter',sans-serif",fontSize:13.5,lineHeight:1.8,color:"rgba(255,200,100,0.88)",fontStyle:"italic",margin:0 }}>{pt}</p>
                </div>
              )) : (
                <p style={{ fontFamily:"'Inter',sans-serif",fontSize:13.5,lineHeight:1.8,color:"rgba(255,200,100,0.85)",fontStyle:"italic",margin:0 }}>{parsed.limitations}</p>
              )}
            </div>
          </div>
        )}
      </>}

      {/* PROSE: paragraph-based answer */}
      {parsed.type==="prose" && (
        <div style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.16)",borderLeft:`3px solid ${C.green}`,borderRadius:14,padding:"24px 28px",position:"relative",animation:"sectionIn 0.4s 0.06s ease both" }}>
          <SynapseDots color={C.green} />
          <SectionLabel icon="article" text="Research Synthesis" />
          <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
            {parsed.paragraphs.map((para, i) => (
              <div key={i} style={{ position:"relative",paddingLeft:24,marginBottom:18 }}>
                <div style={{ position:"absolute",left:0,top:8,width:6,height:6,borderRadius:"50%",background:C.green,opacity:0.5 }} />
                <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.88,color:C.onSurface,margin:0 }}>{para}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BULLETS: bullet-point list */}
      {parsed.type==="bullets" && (
        <div style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.16)",borderLeft:`3px solid ${C.green}`,borderRadius:14,padding:"24px 28px",position:"relative",animation:"sectionIn 0.4s 0.06s ease both" }}>
          <SynapseDots color={C.green} />
          <SectionLabel icon="format_list_bulleted" text="Research Synthesis" />
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {parsed.items.map((item,i) => (
              <FindingCard key={i} index={i+1} text={item} accent={C.green} delay={i*50} />
            ))}
          </div>
        </div>
      )}

      {/* RAW: plain text fallback */}
      {parsed.type==="raw" && (
        <div style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.16)",borderLeft:`3px solid ${C.green}`,borderRadius:14,padding:"24px 28px",position:"relative",animation:"sectionIn 0.4s 0.06s ease both" }}>
          <SynapseDots color={C.green} />
          <SectionLabel icon="article" text="Research Synthesis" />
          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.9,color:C.onSurface,whiteSpace:"pre-wrap",margin:0 }}>{parsed.text}</p>
        </div>
      )}

      {/* ── Confidence Matrix ── */}
      <div style={{ background:"rgba(10,10,30,0.65)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px 24px",animation:"sectionIn 0.4s 0.22s ease both" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14 }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.cyan,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:6 }}>Confidence Matrix</div>
            <p style={{ fontFamily:"'Inter',sans-serif",fontSize:12,color:C.textSecondary,margin:0 }}>Aggregate certainty across {AGENT_NODES.length} independent agent simulations</p>
          </div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {Array.from({length:10}).map((_,i) => (
              <div key={i} style={{ width:18,height:18,borderRadius:"50%",background:i<filled?confColor:"rgba(255,255,255,0.06)",boxShadow:i<filled?`0 0 8px ${confColor}`:"none",border:i>=filled?"1px solid rgba(255,255,255,0.1)":"none",transition:"all 0.3s" }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop:10,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:confColor }}>
          {confValue>=80?"✓ High Confidence — Research synthesis is reliable":confValue>=60?"△ Moderate — Results are plausible but verify":"⚠ Low Confidence — Treat with caution"}
        </div>
      </div>

      {/* ── Source Constellation ── */}
      {allSources.length > 0 && (
        <div style={{ animation:"sectionIn 0.4s 0.28s ease both" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.cyan,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:12 }}>Source Constellation</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
            {allSources.map((s,i) => (
              <div key={i} className="source-pill"
                style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(16px)",border:"1px solid rgba(0,204,255,0.18)",borderRadius:9999,padding:"5px 13px",display:"flex",alignItems:"center",gap:6,cursor:"pointer",transition:"all 0.2s" }}
                onClick={()=>navigator.clipboard.writeText(typeof s==="string"?s:s.url||s)}>
                <Icon name="article" style={{ color:C.cyan,fontSize:12 }} />
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.onSurfaceVariant }}>[{i+1}] {typeof s==="string"?s:s.title||"Source"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:20,animation:"sectionIn 0.4s 0.34s ease both" }}>
        <div style={{ display:"flex",gap:8 }}>
          {[
            { icon:"download", label:"Export .txt", action:()=>{const b=new Blob([`POLYNOUS Neural Synthesis Report\nQuery: ${query}\n\n${answer}`],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-report.txt";a.click();} },
            { icon:"data_object", label:"JSON", action:()=>{const b=new Blob([JSON.stringify({query,answer,confidence:confValue,sources:allSources,generated:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-vectors.json";a.click();} },
          ].map(({icon,label,action})=>(
            <button key={label} className="action-btn" onClick={action}
              style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 16px",background:"rgba(10,10,30,0.7)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,transition:"all 0.2s" }}>
              <Icon name={icon} style={{ fontSize:14 }} /> {label}
            </button>
          ))}
          <button className="copy-btn" onClick={onCopy}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 16px",background:"rgba(10,10,30,0.7)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,transition:"all 0.2s" }}>
            <Icon name="content_copy" style={{ fontSize:14 }} /> Copy
          </button>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>{if(navigator.share)navigator.share({title:"POLYNOUS Research",text:answer});else navigator.clipboard.writeText(window.location.href);}}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 22px",background:C.green,color:"#000",fontWeight:700,borderRadius:9999,border:"none",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,boxShadow:"0 0 18px rgba(0,255,71,0.28)",transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,255,71,0.38)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 0 18px rgba(0,255,71,0.28)";}}>
            <Icon name="share" style={{ fontSize:14,color:"#000" }} /> Share
          </button>
          <button onClick={onNew}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9999,color:C.onSurfaceVariant,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,transition:"all 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color=C.onSurfaceVariant}>
            <Icon name="refresh" style={{ fontSize:14 }} /> New Research
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Landing hero ─────────────────────────────────────────────────────────────
function LandingHero({ query, setQuery, onSearch, loading }) {
  const handlePill = (q) => { setQuery(q); onSearch(q); };
  return (
    <div style={{ position:"relative",flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px 56px",overflow:"hidden",minHeight:"100vh" }}>
      <ThreeMountain />
      <AgentLabels />
      {/* Grid overlay */}
      <div style={{ position:"absolute",inset:0,zIndex:0,opacity:0.08,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"32px 32px" }} />

      <div style={{ position:"relative",zIndex:2,maxWidth:680 }}>
        {/* Tagline */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
          <div style={{ display:"flex",gap:4 }}>
            {[1,0.5,0.2].map((o,i) => <div key={i} style={{ width:6,height:6,background:C.green,transform:"rotate(45deg)",opacity:o,boxShadow:i===0?`0 0 5px ${C.green}`:undefined }} />)}
          </div>
          <p style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:10,fontWeight:600,color:C.onSurfaceVariant,textTransform:"uppercase",letterSpacing:"0.25em" }}>
            7 AGENTS. ONE ANSWER. <span style={{ color:C.green }}>INFINITE</span> KNOWLEDGE.
          </p>
        </div>

        {/* Hero heading */}
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontStyle:"italic",fontWeight:700,fontSize:"clamp(3rem,5.5vw,4.8rem)",lineHeight:0.92,color:"#fff",textTransform:"uppercase",letterSpacing:"-0.01em" }}>
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
          <div style={{ position:"absolute",inset:0,background:"rgba(0,255,71,0.03)",borderRadius:9999,filter:"blur(10px)" }} />
          <div style={{ position:"relative",display:"flex",alignItems:"center",background:"rgba(8,8,28,0.88)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,padding:"6px 6px 6px 20px",boxShadow:"0 4px 40px rgba(0,0,0,0.5)",transition:"border-color 0.25s" }}
            onFocusCapture={e=>e.currentTarget.style.borderColor="rgba(0,255,71,0.35)"} onBlurCapture={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.09)"}>
            <Icon name="search" style={{ color:C.onSurfaceVariant,fontSize:18,marginRight:10,flexShrink:0 }} />
            <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask any research question…"
              onKeyDown={e=>e.key==="Enter"&&onSearch()} disabled={loading}
              style={{ flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14,padding:"8px 0" }} />
            <button onClick={()=>onSearch()} disabled={loading||!query.trim()}
              style={{ background:loading?"rgba(255,255,255,0.08)":C.green,color:"#000",padding:"12px 26px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,letterSpacing:"0.1em",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":`0 0 18px ${C.greenGlow}`,transition:"all 0.25s",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              {loading?"THINKING…":<>RESEARCH <Icon name="arrow_forward" style={{ fontSize:12,color:"#000" }} /></>}
            </button>
          </div>
        </div>

        {/* Auto-shuffling pills */}
        <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16 }}>
          <div style={{ flex:1,height:1,background:`linear-gradient(to right, transparent, ${C.greenGlow})` }} />
          <span style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontSize:9,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.22em",display:"flex",alignItems:"center",gap:6 }}>
            <Icon name="play_circle" style={{ fontSize:10,color:C.green }} /> Try one of these
          </span>
          <div style={{ flex:1,height:1,background:`linear-gradient(to left, transparent, ${C.greenGlow})` }} />
        </div>
        <ShufflingPills onSelect={handlePill} />

        {/* Static suggestion cards below pills */}
        <SuggestionCards onSelect={handlePill} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PolynousResearch({ user, onNavigate, onLogout }) {
  const [query,            setQuery]            = useState("");
  const [loading,          setLoading]          = useState(false);
  const [answer,           setAnswer]           = useState("");
  const [sources,          setSources]          = useState([]);
  const [confidence,       setConfidence]       = useState(0);
  const [agentStatus,      setAgentStatus]      = useState("");
  const [agentProgress,    setAgentProgress]    = useState([]);
  const [history,          setHistory]          = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [userStyle,        setUserStyle]        = useState("academic");

  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/settings/preferences`, {
          headers: { 'Authorization': token?`Bearer ${token}`:'', 'Content-Type':'application/json' }
        });
        if (res.ok) { const d=await res.json(); setUserStyle(d.response_style||"academic"); }
      } catch(e) {}
    };
    fetchStyle();
  }, []);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const startResearch = async (q) => {
    const qText = typeof q==="string" ? q : query;
    if (!qText.trim() || loading) return;
    setLoading(true); setAnswer(""); setSources([]); setConfidence(0); setAgentProgress([]); setAgentStatus("Initializing…");
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/ask-stream`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":token?`Bearer ${token}`:'' },
        body:JSON.stringify({ query:qText, debate_mode:false, response_style:userStyle }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const reader=res.body.getReader(), decoder=new TextDecoder();
      let fullAnswer="", srcList=[], confScore=0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data=JSON.parse(line.slice(6));
              if      (data.type==="start")      setAgentStatus("Neural network activated");
              else if (data.type==="progress")   { setAgentStatus(data.message); setAgentProgress(p=>[...p,data]); }
              else if (data.type==="token")      { fullAnswer+=(data.content||""); setAnswer(fullAnswer); }
              else if (data.type==="citations")  srcList=data.citations||[];
              else if (data.type==="confidence") confScore=data.score||0;
              else if (data.type==="end")        {
                setAnswer(fullAnswer); setSources(srcList); setConfidence(confScore); setAgentStatus("");
                setHistory(prev=>[{ query:qText, confidence:confScore, date:new Date().toLocaleDateString() },...prev].slice(0,10));
              }
            } catch(e) {}
          }
        }
      }
    } catch(error) {
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
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at 20% 40%, #0d0d28 0%, ${C.void} 60%, #060615 100%)`,
      position:"relative",overflow:"auto",
      opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(16px)",
      transition:"opacity 0.55s ease,transform 0.55s ease"
    }}>
      <Styles />
      <NeuralCanvas isResearching={loading} />
      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div style={{ marginLeft:sidebarW,transition:"margin-left 0.32s cubic-bezier(0.4,0,0.2,1)",position:"relative",zIndex:10,minHeight:"100vh",display:"flex",flexDirection:"column" }}>

        {/* Landing */}
        {!loading && !answer && (
          <LandingHero query={query} setQuery={setQuery} onSearch={startResearch} loading={loading} />
        )}

        {/* Thinking */}
        {loading && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 40px" }}>
            <div style={{ width:"100%",maxWidth:760,marginBottom:24 }}>
              <div style={{ display:"flex",alignItems:"center",background:"rgba(8,8,28,0.88)",backdropFilter:"blur(12px)",border:`1px solid rgba(0,255,71,0.35)`,borderRadius:9999,padding:"6px 6px 6px 20px",boxShadow:`0 0 14px rgba(0,255,71,0.08)` }}>
                <Icon name="search" style={{ color:C.green,fontSize:18,marginRight:10,flexShrink:0 }} />
                <span style={{ flex:1,fontFamily:"'Inter',sans-serif",fontSize:14,color:"#fff" }}>{query}</span>
                <button disabled style={{ background:"rgba(255,255,255,0.06)",color:"#888",padding:"12px 26px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"not-allowed" }}>THINKING…</button>
              </div>
            </div>
            <ThinkingCanvas agentStatus={agentStatus} agentProgress={agentProgress} />
          </div>
        )}

        {/* Results */}
        {answer && !loading && (
          <div style={{ padding:"28px 40px" }}>
            {/* Search bar */}
            <div style={{ maxWidth:860,margin:"0 auto 28px" }}>
              <div style={{ display:"flex",alignItems:"center",background:"rgba(8,8,28,0.88)",backdropFilter:"blur(12px)",border:"1px solid rgba(0,255,71,0.28)",borderRadius:9999,padding:"6px 6px 6px 20px" }}>
                <Icon name="search" style={{ color:C.green,fontSize:18,marginRight:10,flexShrink:0 }} />
                <input type="text" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startResearch()}
                  style={{ flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14,padding:"8px 0" }} />
                <button onClick={()=>startResearch()}
                  style={{ background:C.green,color:"#000",padding:"12px 26px",borderRadius:9999,border:"none",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",boxShadow:`0 0 18px ${C.greenGlow}`,flexShrink:0 }}>
                  RESEARCH <Icon name="arrow_forward" style={{ fontSize:12,color:"#000" }} />
                </button>
              </div>
            </div>

            {/* Shuffling pills */}
            <div style={{ maxWidth:860,margin:"0 auto 24px" }}>
              <p style={{ textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.textSecondary,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:12,opacity:0.55 }}>— explore more —</p>
              <ShufflingPills onSelect={(q)=>{setQuery(q);startResearch(q);}} />
            </div>

            {/* Report */}
            <div style={{ maxWidth:860,margin:"0 auto" }}>
              <NeuralSynthesisReport query={query} answer={answer} sources={sources} confidence={confidence} onCopy={handleCopy} onNew={handleNew} />
            </div>

            {/* History */}
            {history.length > 0 && (
              <div style={{ maxWidth:860,margin:"44px auto 0",paddingTop:28,borderTop:"1px solid "+C.white10 }}>
                <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:"#fff",marginBottom:14 }}>Research History</h3>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10 }}>
                  {history.map((h,i) => (
                    <div key={i} className="history-card" onClick={()=>{setQuery(h.query);startResearch(h.query);}}
                      style={{ background:"rgba(10,10,30,0.7)",backdropFilter:"blur(20px)",border:"1px solid "+C.white10,borderRadius:10,padding:12,cursor:"pointer",transition:"all 0.2s" }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:confColor(h.confidence),marginBottom:4 }}>{h.confidence}% confidence</div>
                      <div style={{ fontFamily:"'Inter',sans-serif",fontSize:12,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{h.query}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.textSecondary,marginTop:4 }}>{h.date}</div>
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