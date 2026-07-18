import * as THREE from 'three'
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from '../config';
import DebateEngine from './DebateEngine';

const C = {
  crimson: "#ff2040", green: "#00e64d", purple: "#a855f7", gold: "#ffd700",
  void: "#0a0a1e", surface: "#111125", surfaceContainer: "#1e1e32",
  onSurface: "#e2e0fc", onSurfaceVariant: "#b9ccb0",
  textSecondary: "#8899aa", white10: "rgba(255,255,255,0.1)", white5: "rgba(255,255,255,0.05)",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&family=Material+Symbols+Outlined&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#0a0a1e;color:#e2e0fc;font-family:'Hanken Grotesk',sans-serif;overflow:hidden}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(255,32,64,0.2);border-radius:4px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
  @keyframes fadeRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
  @keyframes cardFlip{0%{opacity:1;transform:translateY(0) scale(1)}35%{opacity:0;transform:translateY(-14px) scale(0.96)}65%{opacity:0;transform:translateY(14px) scale(0.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes pointIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes scoreGrow{from{width:0%}}
  @keyframes orbPulse{0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.4)}50%{box-shadow:0 0 40px rgba(255,215,0,0.8)}}
  @keyframes winnerGlow{0%,100%{text-shadow:0 0 20px currentColor}50%{text-shadow:0 0 48px currentColor}}
  @keyframes dropIn{0%{opacity:0;transform:translateY(-18px) scale(0.96)}70%{transform:translateY(3px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}
  .point-card{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
  .point-card:hover{transform:translateY(-2px)}
  .explore-line{position:relative}
  .explore-line::before,.explore-line::after{content:'';position:absolute;top:50%;width:38%;height:1px;background:#ff2040;opacity:0.22}
  .explore-line::before{left:0}
  .explore-line::after{right:0}
`;

function Icon({ name, style }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block", userSelect: "none", ...(style || {})
    }}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Debates now run through the live /debate-visual SSE pipeline via
// <DebateEngine>. Results arrive as STRUCTURED data (verdict object +
// server-split argument points) — the old blocking /ask call and its
// regex parsing of the answer blob are gone.
// ═══════════════════════════════════════════════════════════════

// ─── Globe ────────────────────────────────────────────────────────────────────

function Globe({ containerRef }) {
  useEffect(() => {
    let animId, renderer;
    function initGlobe(THREE) {
      const container = containerRef.current;
      if (!container) return;
      const W = container.clientWidth, H = container.clientHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
      // Pulled back so the globe + its outer rings sit fully inside the
      // frustum with margin — previously the rings extended past the
      // visible edges and got clipped ("cut sideways").
      camera.position.z = 3.6;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);
      container.insertBefore(renderer.domElement, container.firstChild);
      const RED = new THREE.Color(0xff2040);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x08080f, shininess: 10 })
      );
      core.rotation.y = -Math.PI / 4;
      core.rotation.x = Math.PI / 8;
      scene.add(core);
      const tl = new THREE.TextureLoader();
      tl.crossOrigin = "anonymous";
      tl.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
        (tex) => {
          const mat = new THREE.ShaderMaterial({
            uniforms: { tEarth: { value: tex }, uColor: { value: RED } },
            vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
            fragmentShader: `uniform sampler2D tEarth;uniform vec3 uColor;varying vec2 vUv;void main(){vec4 t=texture2D(tEarth,vUv);float land=1.0-t.r;float dx=sin(vUv.x*900.0);float dy=sin(vUv.y*900.0);float dots=smoothstep(0.38,0.62,(dx*dy)*0.5+0.5);float alpha=land*dots*0.85;if(alpha<0.08)discard;gl_FragColor=vec4(uColor*1.4,alpha);}`,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          });
          core.add(new THREE.Mesh(new THREE.SphereGeometry(1.005, 64, 64), mat));
        }
      );
      core.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.012, 28, 28),
        new THREE.MeshBasicMaterial({ color: RED, wireframe: true, transparent: true, opacity: 0.07 })
      ));
      core.add(new THREE.Points(
        new THREE.SphereGeometry(1.018, 40, 40),
        new THREE.PointsMaterial({ color: RED, size: 0.012, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      ));
      const rimMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `varying vec3 vN;varying vec3 vV;void main(){float r=1.0-clamp(dot(vN,vV),0.0,1.0);r=pow(r,2.8);if(r<0.05)discard;gl_FragColor=vec4(1.0,0.13,0.25,r*0.55);}`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      });
      core.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 64), rimMat));
      const mkRing = (r, rx, ry, op) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r, r + 0.004, 64),
          new THREE.MeshBasicMaterial({ color: RED, side: THREE.DoubleSide, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ring.rotation.x = rx; ring.rotation.y = ry; scene.add(ring); return ring;
      };
      const ring1 = mkRing(1.14, Math.PI / 2.5, 0, 0.09);
      const ring2 = mkRing(1.24, Math.PI / 1.8, Math.PI / 8, 0.045);
      scene.add(new THREE.AmbientLight(0xffffff, 0.15));
      const pl = new THREE.PointLight(RED, 2.5, 8); pl.position.set(4, 4, 4); scene.add(pl);

      // ─── Flights: capitals + animated arcs that take off and land ────────
      const GOLD = new THREE.Color(0xffd700);
      const CAPITALS = [
        [38.9, -77.0], [51.5, -0.12], [48.85, 2.35], [55.75, 37.6],
        [39.9, 116.4], [35.68, 139.69], [28.6, 77.2], [-35.28, 149.13],
        [-15.79, -47.88], [30.04, 31.24], [1.29, 36.82], [19.43, -99.13],
        [37.57, 126.98], [-33.45, -70.66], [64.13, -21.9], [-6.2, 106.85],
      ];
      const latLonToVec3 = (lat, lon, r) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
      };
      const flightsGroup = new THREE.Group();
      core.add(flightsGroup); // rotates with the earth so cities stay put

      const capitalPts = CAPITALS.map(([lat, lon]) => latLonToVec3(lat, lon, 1.008));
      capitalPts.forEach((p) => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 8, 8),
          new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 })
        );
        dot.position.copy(p);
        flightsGroup.add(dot);
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.016, 0.022, 16),
          new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        halo.position.copy(p);
        halo.lookAt(p.clone().multiplyScalar(2));
        flightsGroup.add(halo);
      });

      const activeFlights = [];
      const MAX_FLIGHTS = 5;

      const spawnFlight = () => {
        if (activeFlights.length >= MAX_FLIGHTS) return;
        let ai = Math.floor(Math.random() * capitalPts.length);
        let bi = Math.floor(Math.random() * capitalPts.length);
        while (bi === ai) bi = Math.floor(Math.random() * capitalPts.length);
        const a = capitalPts[ai], b = capitalPts[bi];
        const dist = a.distanceTo(b);
        const bulge = Math.min(1.008 + dist * 0.22, 1.34);
        const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(bulge);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const points = curve.getPoints(48);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
        const line = new THREE.Line(lineGeo, lineMat);
        flightsGroup.add(line);

        const plane = new THREE.Mesh(
          new THREE.ConeGeometry(0.014, 0.05, 6),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
        );
        flightsGroup.add(plane);

        activeFlights.push({
          curve, line, plane, destination: b.clone(),
          t: 0, speed: 0.00045 + Math.random() * 0.00035,
          state: "flying", landTimer: 0,
        });
      };

      const landingRings = [];
      const triggerLanding = (pos) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.01, 0.016, 24),
          new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ring.position.copy(pos);
        ring.lookAt(pos.clone().multiplyScalar(2));
        flightsGroup.add(ring);
        landingRings.push({ mesh: ring, life: 0 });
      };

      for (let i = 0; i < 4; i++) setTimeout(spawnFlight, i * 700);
      const spawnInterval = setInterval(() => {
        if (activeFlights.length < MAX_FLIGHTS) spawnFlight();
      }, 1800);

      const updateFlights = () => {
        for (let i = activeFlights.length - 1; i >= 0; i--) {
          const f = activeFlights[i];
          if (f.state === "flying") {
            f.t += f.speed;
            if (f.t >= 1) {
              f.t = 1;
              f.state = "landed";
              triggerLanding(f.destination);
            }
            const pos = f.curve.getPointAt(f.t);
            f.plane.position.copy(pos);
            const ahead = f.curve.getPointAt(Math.min(f.t + 0.01, 1));
            f.plane.lookAt(ahead.clone().multiplyScalar(1.6));
            f.plane.rotateX(Math.PI / 2);
            f.line.material.opacity = 0.22;
          } else {
            f.landTimer += 1;
            f.plane.material.opacity = Math.max(0, 0.95 - f.landTimer * 0.05);
            f.line.material.opacity = Math.max(0, 0.22 - f.landTimer * 0.012);
            if (f.landTimer > 20) {
              flightsGroup.remove(f.line, f.plane);
              f.line.geometry.dispose(); f.line.material.dispose();
              f.plane.geometry.dispose(); f.plane.material.dispose();
              activeFlights.splice(i, 1);
            }
          }
        }
        for (let i = landingRings.length - 1; i >= 0; i--) {
          const r = landingRings[i];
          r.life += 1;
          const s = 1 + r.life * 0.18;
          r.mesh.scale.set(s, s, s);
          r.mesh.material.opacity = Math.max(0, 0.9 - r.life * 0.045);
          if (r.life > 22) {
            flightsGroup.remove(r.mesh);
            r.mesh.geometry.dispose(); r.mesh.material.dispose();
            landingRings.splice(i, 1);
          }
        }
      };

      const tick = () => {
        animId = requestAnimationFrame(tick);
        core.rotation.y += 0.0008;
        ring1.rotation.z -= 0.0018;
        ring2.rotation.z += 0.0009;
        updateFlights();
        renderer.render(scene, camera);
      };
      tick();
      const onResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener("resize", onResize);
      container._cleanup = () => {
        cancelAnimationFrame(animId);
        clearInterval(spawnInterval);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      };
    }
    if (window.THREE) { initGlobe(window.THREE); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => initGlobe(window.THREE);
    document.head.appendChild(s);
    return () => { const c = containerRef.current; if (c && c._cleanup) { c._cleanup(); delete c._cleanup; } };
  }, [containerRef]);
  return null;
}

// ─── NeuralCanvas ─────────────────────────────────────────────────────────────

function NeuralCanvas({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext("2d");
    let pts = [], id;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    for (let i = 0; i < 100; i++) pts.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * (active ? 0.7 : 0.3),
      vy: (Math.random() - 0.5) * (active ? 0.7 : 0.3),
      r: Math.random() * 1.6 + 0.7, o: Math.random() * 0.3 + 0.06,
    });
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,32,64,${p.o})`; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y);
          if (d < 85) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(255,32,64,${0.06 * (1 - d / 85)})`; ctx.lineWidth = 0.3; ctx.stroke();
          }
        }
      });
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, [active]);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { icon: "travel_explore", label: "Research", path: "/research" },
  { icon: "forum", label: "Debate Chamber", path: "/debate", active: true },
  { icon: "account_tree", label: "Knowledge Graph", path: "/graph" },
  { icon: "search", label: "Semantic Search", path: "/search" },
  { icon: "database", label: "Memory Bank", path: "/memory" },
  { icon: "picture_as_pdf", label: "PDF Lab", path: "/pdf-lab" },
  { icon: "analytics", label: "Analytics", path: "/analytics" },
  { icon: "settings", label: "Settings", path: "/settings" },
];

function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const bye = () => (onLogout ? onLogout() : (localStorage.clear(), (window.location.href = "/")));

  if (collapsed) return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100%", width: 56, background: "rgba(10,10,30,0.65)", backdropFilter: "blur(24px)", borderRight: "1px solid " + C.white10, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", zIndex: 30 }}>
      <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", color: C.crimson, cursor: "pointer", marginBottom: 32 }}>
        <Icon name="chevron_right" style={{ fontSize: 22 }} />
      </button>
      {NAV.map(({ icon, label, path, active }) => (
        <div key={label} onClick={() => go(path)} title={label} style={{ padding: "12px 0", cursor: "pointer", color: active ? C.crimson : C.onSurfaceVariant, width: "100%", display: "flex", justifyContent: "center" }}>
          <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
        </div>
      ))}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div onClick={() => go("/research")} style={{ width: 34, height: 34, borderRadius: "50%", background: C.crimson, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="add" style={{ fontSize: 16, color: C.void }} />
        </div>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surfaceContainer, border: `1px solid ${C.crimson}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="face" style={{ color: C.crimson, fontSize: 14 }} />
        </div>
        <div onClick={bye} style={{ cursor: "pointer", color: C.crimson }}>
          <Icon name="logout" style={{ fontSize: 14 }} />
        </div>
      </div>
    </aside>
  );

  return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100%", width: 320, background: "rgba(10,10,30,0.65)", backdropFilter: "blur(24px)", borderRight: "1px solid " + C.white10, boxShadow: "0 0 20px rgba(255,32,64,0.08)", display: "flex", flexDirection: "column", padding: 24, zIndex: 30, transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: C.crimson, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>POLYNOUS</h1>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.7 }}>Cerebral Vitality Engine</p>
        </div>
        <button onClick={() => setCollapsed(true)} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4, marginLeft: 8 }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}>
          <Icon name="chevron_left" style={{ fontSize: 20 }} />
        </button>
      </div>
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
        {NAV.map(({ icon, label, path, active }) => (
          <div key={label} onClick={() => go(path)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 9999, cursor: "pointer", color: active ? C.crimson : C.onSurfaceVariant, background: active ? `${C.crimson}15` : "transparent", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: active ? 700 : 400, transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden" }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.color = C.crimson; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.color = C.onSurfaceVariant; e.currentTarget.style.background = "transparent"; } }}>
            <Icon name={icon} style={{ fontSize: 20, color: "inherit", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </div>
        ))}
      </nav>
      <div style={{ borderTop: "1px solid " + C.white5, paddingTop: 24, marginTop: 24 }}>
        <button onClick={() => go("/research")} style={{ width: "100%", padding: 12, background: C.crimson, color: C.void, fontWeight: 700, borderRadius: 9999, border: "none", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <Icon name="add" style={{ fontSize: 18, color: C.void }} /> New Research
        </button>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.surfaceContainer, border: `1px solid ${C.crimson}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="face" style={{ color: C.crimson, fontSize: 22 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username || "Guest"}</p>
            <button onClick={bye} style={{ fontSize: 10, color: C.crimson, background: "none", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", padding: 0 }}>Disconnect</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topic data ───────────────────────────────────────────────────────────────

const ALL_TOPICS = [
  { icon: "science", abbr: "NUC", label: "Is nuclear energy the solution to climate change?" },
  { icon: "biotech", abbr: "BIO", label: "Should animal testing be banned entirely?" },
  { icon: "school", abbr: "EDU", label: "Should schools teach cryptocurrency?" },
  { icon: "currency_bitcoin", abbr: "FIN", label: "Are cryptocurrencies the future of finance?" },
  { icon: "stethoscope", abbr: "MED", label: "Is telemedicine as effective as in-person care?" },
  { icon: "home_work", abbr: "WRK", label: "Is remote work better for productivity?" },
  { icon: "smart_toy", abbr: "AI", label: "Should AI development be regulated globally?" },
  { icon: "rocket_launch", abbr: "SPC", label: "Should we colonize Mars?" },
  { icon: "genetics", abbr: "GEN", label: "Should genetic engineering be allowed in humans?" },
  { icon: "payments", abbr: "ECO", label: "Is universal basic income economically viable?" },
  { icon: "devices", abbr: "NET", label: "Should social media be regulated like utilities?" },
  { icon: "how_to_vote", abbr: "GOV", label: "Should voting be mandatory?" },
  { icon: "gavel", abbr: "LAW", label: "Is free speech absolute on the internet?" },
  { icon: "eco", abbr: "ENV", label: "Should we ban fossil fuels by 2030?" },
  { icon: "psychology", abbr: "PHI", label: "Is artificial consciousness possible?" },
  { icon: "account_balance", abbr: "SOC", label: "Should billionaires exist?" },
  { icon: "public", abbr: "POL", label: "Is capitalism sustainable long-term?" },
  { icon: "pets", abbr: "SCI", label: "Should we bring back extinct species?" },
  { icon: "security", abbr: "ETH", label: "Is privacy more important than security?" },
  { icon: "satellite", abbr: "EXP", label: "Is space exploration worth the cost?" },
  { icon: "translate", abbr: "LNG", label: "Will AI translation make learning languages obsolete?" },
  { icon: "handshake", abbr: "DIP", label: "Do international sanctions actually work?" },
  { icon: "groups", abbr: "DEM", label: "Is democracy the best system of government?" },
  { icon: "shield", abbr: "MIL", label: "Should nations abolish standing armies?" },
  { icon: "policy", abbr: "REG", label: "Should Big Tech be broken up?" },
  { icon: "vaccines", abbr: "PUB", label: "Should vaccines be mandatory for school attendance?" },
  { icon: "sports_soccer", abbr: "SPT", label: "Should college athletes be paid salaries?" },
  { icon: "flight", abbr: "AVI", label: "Should short-haul domestic flights be banned?" },
  { icon: "menu_book", abbr: "LIT", label: "Should classic literature be updated for modern sensitivities?" },
  { icon: "child_care", abbr: "FAM", label: "Should parents limit kids' social media until age 16?" },
  { icon: "elderly", abbr: "AGE", label: "Should there be a mandatory retirement age?" },
  { icon: "work", abbr: "LAB", label: "Should the four-day work week be standard?" },
  { icon: "savings", abbr: "TAX", label: "Should wealth be taxed, not just income?" },
  { icon: "real_estate_agent", abbr: "HOU", label: "Should cities cap rent increases by law?" },
  { icon: "local_hospital", abbr: "HLT", label: "Should healthcare be a universal right?" },
  { icon: "water_drop", abbr: "WAT", label: "Should access to fresh water be a human right?" },
  { icon: "solar_power", abbr: "SLR", label: "Can renewables fully replace fossil fuels by 2050?" },
  { icon: "factory", abbr: "IND", label: "Should carbon-heavy industries be taxed more?" },
  { icon: "recycling", abbr: "RCY", label: "Is recycling actually effective at scale?" },
  { icon: "agriculture", abbr: "AGR", label: "Should lab-grown meat replace traditional farming?" },
  { icon: "emoji_events", abbr: "OLY", label: "Should the Olympics drop host-city bidding?" },
  { icon: "sports_esports", abbr: "GAM", label: "Should esports be included in the Olympics?" },
  { icon: "fingerprint", abbr: "BIO2", label: "Should biometric ID be required for online access?" },
  { icon: "podcasts", abbr: "MDA", label: "Are podcasts replacing traditional journalism?" },
  { icon: "museum", abbr: "HIS", label: "Should museums return artifacts to their countries of origin?" },
  { icon: "monitor_heart", abbr: "AGI", label: "Should AI be granted legal personhood?" },
  { icon: "military_tech", abbr: "WAR", label: "Should autonomous weapons be banned outright?" },
  { icon: "volunteer_activism", abbr: "CHR", label: "Is billionaire philanthropy a substitute for taxation?" },
  { icon: "directions_car", abbr: "TRN", label: "Should self-driving cars be legal on all public roads?" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ─── TopicCards ───────────────────────────────────────────────────────────────

function TopicCards({ onSelect }) {
  const [cards, setCards] = useState(() => shuffle(ALL_TOPICS).slice(0, 6));
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFlipping(true);
      setTimeout(() => { setCards(shuffle(ALL_TOPICS).slice(0, 6)); setFlipping(false); }, 420);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
      {cards.map(({ icon, abbr, label }, i) => (
        <button key={label} onClick={() => onSelect(label)} style={{
          background: "rgba(14,14,28,0.7)", border: "1px solid rgba(255,32,64,0.12)", borderRadius: 16,
          padding: "18px 16px", display: "flex", alignItems: "center", textAlign: "left", cursor: "pointer",
          backdropFilter: "blur(8px)", transition: "border-color 0.25s,background 0.25s,transform 0.25s,box-shadow 0.25s",
          animation: flipping ? `cardFlip 0.84s ${i * 40}ms ease both` : `fadeUp 0.5s ${i * 70}ms ease both`,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,32,64,0.4)"; e.currentTarget.style.background = "rgba(255,32,64,0.06)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,32,64,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,32,64,0.12)"; e.currentTarget.style.background = "rgba(14,14,28,0.7)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,32,64,0.08)", border: "1px solid rgba(255,32,64,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0 }}>
            <Icon name={icon} style={{ fontSize: 20, color: C.crimson }} />
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: "#d0d6e8", fontWeight: 500, lineHeight: 1.5, margin: 0, flex: 1, paddingRight: 4 }}>{label}</p>
          <span style={{ color: "rgba(255,32,64,0.3)", fontSize: 14, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>›</span>
        </button>
      ))}
    </div>
  );
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────

function Reveal({ children, animation = "fadeUp", delay = 0, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hidden = {
      fadeUp: "translateY(28px)", fadeLeft: "translateX(-24px)",
      fadeRight: "translateX(24px)", scaleIn: "scale(0.93)",
    };
    el.style.opacity = "0";
    el.style.transform = hidden[animation] || "none";
    el.style.transition = `opacity 600ms ease, transform 600ms ease`;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => { el.style.opacity = "1"; el.style.transform = "none"; }, delay);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} style={style}>{children}</div>;
}

// ─── PointCard (result side) ──────────────────────────────────────────────────

function PointCard({ text, index, side }) {
  const isFor = side === "for";
  const accent = isFor ? C.green : C.crimson;
  const bg = isFor ? "rgba(0,230,77,0.03)" : "rgba(255,32,64,0.03)";
  const border = isFor ? "rgba(0,230,77,0.14)" : "rgba(255,32,64,0.14)";
  const hoverBorder = isFor ? "rgba(0,230,77,0.38)" : "rgba(255,32,64,0.38)";
  const matIcon = isFor
    ? ["check_circle", "lightbulb", "verified", "star", "thumb_up", "trending_up"][index % 6]
    : ["cancel", "warning", "block", "error", "thumb_down", "trending_down"][index % 6];

  return (
    <div className="point-card" style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 14,
      padding: "18px 20px", marginBottom: 14, position: "relative",
      animation: `pointIn 0.45s ${index * 90 + 100}ms ease both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = hoverBorder; e.currentTarget.style.background = isFor ? "rgba(0,230,77,0.06)" : "rgba(255,32,64,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = bg; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "40%", background: `linear-gradient(to bottom, ${accent}, transparent)`, borderRadius: "0 0 2px 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${accent}14`, border: `1.5px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <Icon name={matIcon} style={{ fontSize: 17, color: accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "1.4px", color: accent, fontWeight: 700, background: `${accent}10`, padding: "3px 10px", borderRadius: 20 }}>
              {isFor ? "Supporting" : "Counter"} · {index + 1}
            </span>
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14.5, lineHeight: 1.85, color: "#cdd5e0", margin: 0, fontWeight: 400 }}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, color, fillGradient, delay = 0 }) {
  const pct = Math.round((score / 10) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color, width: 90, textAlign: "right", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 9, borderRadius: 5, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: fillGradient, borderRadius: 5, animation: `scoreGrow 1s ${delay}ms ease both`, animationFillMode: "both" }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color, width: 32, textAlign: "right", flexShrink: 0 }}>{score}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DebateChamber({ user, onNavigate, onLogout }) {
  const [topic, setTopic] = useState("");
  const [answerLength, setAnswerLength] = useState("detailed");
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");
  const globeRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const id = "polynous-global";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id; tag.textContent = GLOBAL_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  const sidebarW = sidebarCollapsed ? 56 : 320;

  // The DebateEngine streams the real pipeline; this just opens the arena.
  const fireDebate = useCallback((q) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError("");
    setActiveTopic(q.trim());
    setAgentStatus("");
  }, [loading]);

  const handleEngineComplete = useCallback((data) => {
    setResult({
      verdict: data?.verdict || {},
      for_points: data?.debate?.for_points || [],
      against_points: data?.debate?.against_points || [],
      for_rebuttal: data?.debate?.for_rebuttal || "",
      against_rebuttal: data?.debate?.against_rebuttal || "",
      citations: data?.citations || [],
    });
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }, []);

  const handleEngineError = useCallback((msg) => {
    setError(msg || "Debate stream failed. Check your API connection.");
    setLoading(false);
  }, []);

  const handleBeginDebate = () => fireDebate(topic);
  const handleTopicSelect = (l) => { setTopic(l); fireDebate(l); };
  const handleKeyDown = (e) => { if (e.key === "Enter") handleBeginDebate(); };
  const handleNewDebate = () => { setResult(null); setError(""); setTopic(""); setActiveTopic(""); setTimeout(() => inputRef.current?.focus(), 100); };

  const verdict = result?.verdict;
  const winColor = verdict?.winner === "FOR" ? C.green : verdict?.winner === "AGAINST" ? C.crimson : C.purple;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: C.void, display: "flex", position: "relative" }}>
      <NeuralCanvas active={loading} />
      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <main style={{
        marginLeft: sidebarW, width: `calc(100% - ${sidebarW}px)`, height: "100vh",
        position: "relative", zIndex: 10,
        transition: "margin-left 0.35s cubic-bezier(0.4,0,0.2,1), width 0.35s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* ✅ GLOBE - FULLY PRESERVED */}
        <div ref={globeRef} style={{
          position: "absolute", right: -10, top: -10, width: 620, height: 620,
          zIndex: 1, pointerEvents: "none",
          WebkitMaskImage: "radial-gradient(ellipse 78% 78% at 50% 50%, black 50%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 78% 78% at 50% 50%, black 50%, transparent 100%)",
        }}>
          <Globe containerRef={globeRef} />
        </div>
        <div style={{ position: "absolute", right: 0, top: 0, width: 620, height: 620, background: "radial-gradient(circle at 70% 30%, rgba(255,32,64,0.06) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

        {/* Scrollable content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 52px 64px", position: "relative", zIndex: 5, scrollbarWidth: "none" }}>
          <div style={{ maxWidth: 920, paddingTop: 52 }}>

            {/* ─── HERO ─────────────────────────────────────────────── */}
            <Reveal animation="fadeUp" delay={0}>
              <div style={{ position: "relative", display: "inline-block", marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(72px,8vw,110px)", fontWeight: 800, color: C.crimson, fontStyle: "italic", transform: "skewX(-10deg)", letterSpacing: "-0.05em", lineHeight: 1, textShadow: "0 0 40px rgba(255,32,64,0.4)", margin: 0 }}>DEBATE</h2>
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(72px,8vw,110px)", fontWeight: 800, color: "#fff", fontStyle: "italic", transform: "skewX(-10deg)", letterSpacing: "-0.05em", lineHeight: 1, marginTop: "clamp(-28px,-3vw,-36px)", textShadow: "rgba(255,32,64,0.55) 0px -5px 20px, rgba(0,0,0,0.5) 0px 4px 14px", position: "relative", zIndex: 2 }}>CHAMBER</h2>
                <div style={{ position: "absolute", left: "-8%", top: "43%", width: "116%", height: 5, background: C.crimson, transform: "rotate(-8deg)", opacity: 0.88, filter: "blur(2px)", boxShadow: "0 0 22px rgba(255,32,64,0.9)", zIndex: 1, pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: "-8%", top: "43%", width: "116%", height: 2, background: "#fff", transform: "rotate(-8deg)", zIndex: 3, pointerEvents: "none" }} />
              </div>
            </Reveal>

            <Reveal animation="fadeLeft" delay={120}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", color: "#e2e2e2", letterSpacing: "0.22em", fontSize: 15, fontWeight: 500, textTransform: "uppercase", margin: "22px 0 18px" }}>
                Evidence-Based Argument Synthesis
              </p>
            </Reveal>

            <Reveal animation="fadeLeft" delay={200}>
              <div style={{ borderLeft: "3px solid " + C.crimson, paddingLeft: 20, paddingTop: 4, paddingBottom: 4, marginBottom: 36 }}>
                <p style={{ color: "#9090a8", fontSize: 19, lineHeight: 1.75, margin: 0 }}>Challenge ideas. Explore evidence.</p>
                <p style={{ color: "#9090a8", fontSize: 19, lineHeight: 1.75, margin: 0 }}>Build better arguments.</p>
              </div>
            </Reveal>

            {/* ─── INPUT ─────────────────────────────────────────────── */}
            {!result && (
              <Reveal animation="fadeUp" delay={280}>
                <div style={{ marginBottom: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.crimson, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Enter Proposition</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[{ key: "concise", label: "Concise" }, { key: "detailed", label: "Detailed" }].map(({ key, label }) => (
                        <button key={key} type="button" disabled={loading} onClick={() => setAnswerLength(key)} style={{ padding: "6px 18px", borderRadius: 20, border: `1px solid ${answerLength === key ? C.crimson : "rgba(255,255,255,0.1)"}`, background: answerLength === key ? "rgba(255,32,64,0.1)" : "transparent", color: answerLength === key ? C.crimson : "#8899aa", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.45 : 1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: answerLength === key ? 700 : 400, transition: "all 0.2s" }}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input ref={inputRef} type="text" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={handleKeyDown} disabled={loading} placeholder="e.g., Should AI be regulated by international treaties?"
                        style={{ width: "100%", padding: "18px 54px 18px 22px", borderRadius: 14, border: "1px solid rgba(255,32,64,0.18)", background: "rgba(12,12,24,0.75)", backdropFilter: "blur(12px)", color: "#fff", fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s,box-shadow 0.2s" }}
                        onFocus={e => { e.target.style.borderColor = "rgba(255,32,64,0.55)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,32,64,0.08)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,32,64,0.18)"; e.target.style.boxShadow = "none"; }}
                      />
                      <button onClick={handleBeginDebate} disabled={loading} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,32,64,0.45)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>↵</button>
                    </div>
                    <button onClick={handleBeginDebate} disabled={loading || !topic.trim()} style={{ padding: "0 30px", borderRadius: 14, border: "none", background: loading ? "rgba(80,80,80,0.4)" : `linear-gradient(135deg, ${C.crimson}, #9a0015)`, color: "#fff", fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, cursor: loading || !topic.trim() ? "not-allowed" : "pointer", opacity: !topic.trim() && !loading ? 0.45 : 1, boxShadow: loading ? "none" : "0 4px 22px rgba(255,32,64,0.35)", transition: "all 0.3s", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", flexShrink: 0 }}
                      onMouseEnter={e => { if (!loading && topic.trim()) e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      {loading ? (
                        <>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                          <span style={{ fontSize: 12 }}>{agentStatus || "Analyzing..."}</span>
                        </>
                      ) : <>BEGIN DEBATE <span style={{ opacity: 0.7 }}>›</span></>}
                    </button>
                  </div>
                  {error && <p style={{ marginTop: 10, color: C.crimson, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{error}</p>}
                </div>
              </Reveal>
            )}

            {/* ─── LIVE DEBATE ENGINE (real pipeline, no fake progress) ── */}
            {loading && (
              <div style={{ margin: "0 -8px", animation: "fadeUp 0.4s ease both" }}>
                <DebateEngine
                  apiUrl={`${API_BASE_URL}/debate-visual`}
                  query={activeTopic}
                  responseStyle={answerLength}
                  onComplete={handleEngineComplete}
                  onError={handleEngineError}
                />
              </div>
            )}

            {/* ─── EXPLORE TOPICS ────────────────────────────────────── */}
            {!result && !loading && (
              <Reveal animation="fadeUp" delay={380}>
                <div style={{ marginBottom: 20 }}>
                  <div className="explore-line" style={{ textAlign: "center", marginBottom: 22 }}>
                    <span style={{ background: C.void, padding: "0 18px", color: C.crimson, fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.18em", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
                      Explore Topics
                    </span>
                  </div>
                  <TopicCards onSelect={handleTopicSelect} />
                </div>
              </Reveal>
            )}

            {/* ─── DEBATE RESULTS ────────────────────────────────────── */}
            {result && verdict && !loading && (() => {
              const forScore = verdict.for_score || 0;
              const againstScore = verdict.against_score || 0;
              const forPts = result.for_points || [];
              const againstPts = result.against_points || [];

              return (
                <div style={{ animation: "fadeUp 0.5s ease both" }}>

                  {/* Topic banner */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 14, marginBottom: 28, animation: "dropIn 0.4s ease both" }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: C.purple, marginBottom: 5 }}>Proposition Under Review</div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 600, color: "#e2e0fc", lineHeight: 1.4 }}>{activeTopic}</div>
                    </div>
                    <button onClick={handleNewDebate} style={{ padding: "8px 18px", borderRadius: 30, border: `1px solid rgba(255,32,64,0.28)`, background: "rgba(255,32,64,0.06)", color: C.crimson, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 16, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,32,64,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,32,64,0.06)"; }}
                    >
                      <Icon name="refresh" style={{ fontSize: 13, verticalAlign: "-2px", marginRight: 5 }} />
                      New Debate
                    </button>
                  </div>

                  {/* Two-column podiums */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 1fr", gap: 18, alignItems: "start", marginBottom: 28 }}>

                    {/* FOR column */}
                    <div style={{ background: "rgba(0,230,77,0.015)", border: "1px solid rgba(0,230,77,0.14)", borderRadius: 18, overflow: "hidden", animation: "fadeLeft 0.5s 0.1s ease both" }}>
                      <div style={{ background: "rgba(0,230,77,0.05)", padding: "14px 20px", borderBottom: "1px solid rgba(0,230,77,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, display: "inline-block" }} />
                          <span style={{ fontFamily: "'Sora',sans-serif", color: C.green, fontWeight: 700, fontSize: 14 }}>Supporting</span>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.green, fontWeight: 700, fontSize: 13, background: "rgba(0,230,77,0.08)", padding: "4px 12px", borderRadius: 14 }}>{forScore}/10</span>
                      </div>
                      <div style={{ padding: "16px 14px", overflowY: "auto", maxHeight: 480, scrollbarWidth: "thin" }}>
                        {forPts.length > 0 ? forPts.map((pt, i) => <PointCard key={i} text={pt} index={i} side="for" />) : <p style={{ color: C.textSecondary, textAlign: "center", padding: 32, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>No arguments found.</p>}
                      </div>
                    </div>

                    {/* VS divider */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: C.purple }}>VS</div>
                      <Icon name="bolt" style={{ fontSize: 20, color: "rgba(168,85,247,0.4)" }} />
                      <Icon name="bolt" style={{ fontSize: 20, color: "rgba(168,85,247,0.28)" }} />
                      <Icon name="bolt" style={{ fontSize: 20, color: "rgba(168,85,247,0.16)" }} />
                    </div>

                    {/* AGAINST column */}
                    <div style={{ background: "rgba(255,32,64,0.015)", border: "1px solid rgba(255,32,64,0.14)", borderRadius: 18, overflow: "hidden", animation: "fadeRight 0.5s 0.1s ease both" }}>
                      <div style={{ background: "rgba(255,32,64,0.05)", padding: "14px 20px", borderBottom: "1px solid rgba(255,32,64,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.crimson, boxShadow: `0 0 8px ${C.crimson}`, display: "inline-block" }} />
                          <span style={{ fontFamily: "'Sora',sans-serif", color: C.crimson, fontWeight: 700, fontSize: 14 }}>Counter</span>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.crimson, fontWeight: 700, fontSize: 13, background: "rgba(255,32,64,0.08)", padding: "4px 12px", borderRadius: 14 }}>{againstScore}/10</span>
                      </div>
                      <div style={{ padding: "16px 14px", overflowY: "auto", maxHeight: 480, scrollbarWidth: "thin" }}>
                        {againstPts.length > 0 ? againstPts.map((pt, i) => <PointCard key={i} text={pt} index={i} side="against" />) : <p style={{ color: C.textSecondary, textAlign: "center", padding: 32, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>No arguments found.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Score comparison */}
                  <div style={{ background: "rgba(10,10,30,0.55)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px 26px", marginBottom: 24, animation: "dropIn 0.4s 0.2s ease both" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: C.textSecondary, marginBottom: 18 }}>Comparative Scores</div>
                    <ScoreBar label="Supporting" score={forScore} color={C.green} fillGradient={`linear-gradient(90deg, rgba(0,230,77,0.5), ${C.green})`} delay={300} />
                    <ScoreBar label="Counter" score={againstScore} color={C.crimson} fillGradient={`linear-gradient(90deg, rgba(255,32,64,0.5), ${C.crimson})`} delay={450} />
                  </div>

                  {/* Verdict panel */}
                  <div style={{ background: "rgba(10,10,30,0.75)", border: `1px solid ${winColor}28`, borderRadius: 20, padding: "32px 36px", marginBottom: 28, textAlign: "center", animation: "dropIn 0.5s 0.3s ease both" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #ffe566, #ffd700)", display: "flex", alignItems: "center", justifyContent: "center", animation: "orbPulse 2.5s infinite" }}>
                        <Icon name="balance" style={{ fontSize: 26, color: "#7a5800" }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: C.textSecondary, marginBottom: 12 }}>Analysis Verdict</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(1.3rem,3vw,1.9rem)", fontWeight: 900, color: verdict.winner === "UNSCORED" ? "#ffd700" : winColor, letterSpacing: "-0.02em", animation: "winnerGlow 2.5s 0.8s 3", marginBottom: 20 }}>
                      {verdict.winner === "FOR" ? "Supporting Arguments Prevail"
                        : verdict.winner === "AGAINST" ? "Counter Arguments Prevail"
                        : verdict.winner === "UNSCORED" ? "Verdict Unscored"
                        : "Both Sides Are Balanced"}
                    </div>
                    {verdict.winner === "UNSCORED" && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#ffd700", background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 10, padding: "10px 16px", margin: "0 auto 20px", maxWidth: 520, lineHeight: 1.6 }}>
                        The judge could not score this debate — the numbers shown are the computed evidence rubric only, not a quality verdict.
                      </div>
                    )}
                    <div style={{ width: 48, height: 2, background: `${winColor}40`, borderRadius: 2, margin: "0 auto 22px" }} />

                    {/* Reasoning sentences */}
                    {verdict.reasoning && (
                      <div style={{ maxWidth: 640, margin: "0 auto 20px", textAlign: "left" }}>
                        {(verdict.reasoning.match(/[^.!?]+[.!?]+/g) || [verdict.reasoning]).map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, padding: "10px 14px", background: "rgba(255,255,255,0.015)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ color: winColor, fontWeight: 700, fontSize: 11, minWidth: 20, opacity: 0.55, flexShrink: 0 }}>{i + 1}.</span>
                            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, lineHeight: 1.8, color: "#9aabb8" }}>{s.trim()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Strongest point */}
                    {verdict.strongest_point && (
                      <div style={{ background: "rgba(255,215,0,0.03)", border: "1px solid rgba(255,215,0,0.14)", borderRadius: 12, padding: "16px 22px", maxWidth: 580, margin: "0 auto" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Icon name="star" style={{ fontSize: 14, color: C.gold }} />
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.gold, fontWeight: 700 }}>Key Insight</span>
                        </div>
                        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: "#e2d98a", lineHeight: 1.8, margin: 0 }}>{verdict.strongest_point}</p>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
                    {[
                      { label: "New Debate", icon: "add_circle", primary: true, onClick: handleNewDebate },
                      { label: "Export JSON", icon: "download", onClick: () => { const b = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "debate.json"; a.click(); } },
                      { label: "Copy", icon: "content_copy", onClick: () => navigator.clipboard.writeText(JSON.stringify(result, null, 2)) },
                    ].map(({ label, icon, primary, onClick }) => (
                      <button key={label} onClick={onClick} style={{ padding: "10px 22px", borderRadius: 28, border: `1px solid ${primary ? "rgba(255,32,64,0.3)" : "rgba(255,255,255,0.08)"}`, background: primary ? "rgba(255,32,64,0.08)" : "rgba(255,255,255,0.02)", color: primary ? C.crimson : "#aaa", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7 }}
                        onMouseEnter={e => { e.currentTarget.style.background = primary ? "rgba(255,32,64,0.14)" : "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = primary ? "rgba(255,32,64,0.08)" : "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "translateY(0)"; }}
                      >
                        <Icon name={icon} style={{ fontSize: 14, color: "inherit" }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </main>
    </div>
  );
}