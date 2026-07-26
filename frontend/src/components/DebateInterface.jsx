import * as THREE from 'three'
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL, apiFetch } from '../config';
import ScrapeCountControl from './ScrapeCountControl';
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
  /* Flipping from the report back up to the live engine — glides in from below */
  @keyframes debateViewEnter{0%{opacity:0;transform:translateY(40px) scale(0.985)}100%{opacity:1;transform:translateY(0) scale(1)}}
  .debate-view-enter{animation:debateViewEnter 0.55s cubic-bezier(0.16,1,0.3,1) both}
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

      // ═══════════════════════════════════════════════════════════════════
      // FLIGHTS — dense, continuous, premium-motion air-traffic layer
      // ═══════════════════════════════════════════════════════════════════
      const GOLD = new THREE.Color(0xffd700);
      const clock = new THREE.Clock();

      // 28 real capitals spread across every inhabited continent.
      const CAPITALS = [
        [38.90, -77.00],  // Washington DC
        [45.42, -75.70],  // Ottawa
        [19.43, -99.13],  // Mexico City
        [51.50, -0.12],   // London
        [48.85, 2.35],    // Paris
        [52.52, 13.40],   // Berlin
        [40.42, -3.70],   // Madrid
        [41.90, 12.50],   // Rome
        [59.91, 10.75],   // Oslo
        [64.13, -21.90],  // Reykjavik
        [55.75, 37.60],   // Moscow
        [39.93, 32.85],   // Ankara
        [39.90, 116.40],  // Beijing
        [35.68, 139.69],  // Tokyo
        [28.60, 77.20],   // New Delhi
        [37.57, 126.98],  // Seoul
        [-6.20, 106.85],  // Jakarta
        [13.75, 100.50],  // Bangkok
        [24.70, 46.70],   // Riyadh
        [-35.28, 149.13], // Canberra
        [-41.29, 174.78], // Wellington
        [30.04, 31.24],   // Cairo
        [-1.29, 36.82],   // Nairobi
        [-25.75, 28.19],  // Pretoria
        [9.08, 7.40],     // Abuja
        [-15.79, -47.88], // Brasília
        [-34.60, -58.38], // Buenos Aires
        [-33.45, -70.66], // Santiago
        [4.71, -74.07],   // Bogotá
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

      // ─── Capital markers: pulsing dot + halo ring, idle-animated ───────
      const capitalPts = CAPITALS.map(([lat, lon]) => latLonToVec3(lat, lon, 1.008));
      const capDotGeo = new THREE.SphereGeometry(0.011, 8, 8);
      const haloGeo = new THREE.RingGeometry(0.015, 0.020, 16);
      const capitalMarkers = capitalPts.map((p) => {
        const dot = new THREE.Mesh(capDotGeo, new THREE.MeshBasicMaterial({
          color: GOLD, transparent: true, opacity: 0.8,
        }));
        dot.position.copy(p);
        flightsGroup.add(dot);
        const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
          color: GOLD, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        halo.position.copy(p);
        halo.lookAt(p.clone().multiplyScalar(2));
        flightsGroup.add(halo);
        return { dot, halo, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.5 };
      });

      // ─── Shared geometry/material templates (built once, reused) ───────
      // Airplane silhouette (nose forward, tail back), matching the classic
      // "flight" icon: pointed nose, swept main wings, small tail wings.
      // Built once as a flat shape and reused (geometry) across every pooled
      // plane — only each plane's material (for per-instance opacity) differs.
      // Simple, convex dart/paper-airplane silhouette: nose, two wingtips, tail.
      // Convex shape triangulates cleanly (the earlier notched outline was
      // producing a mangled, "X"-like mesh at small scale).
      const PLANE_GEO = (() => {
        const s = new THREE.Shape();
        s.moveTo(0, 0.030);       // nose
        s.lineTo(0.016, -0.008);  // right wingtip
        s.lineTo(0, -0.030);      // tail
        s.lineTo(-0.016, -0.008); // left wingtip
        s.lineTo(0, 0.030);       // close back to nose
        return new THREE.ShapeGeometry(s);
      })();
      PLANE_GEO.rotateX(-Math.PI / 2); // lay flat; local +Y (nose) becomes world -Z (forward)

      const GLOW_GEO = new THREE.ConeGeometry(0.02, 0.06, 6);
      const RING_GEO = new THREE.RingGeometry(0.008, 0.013, 24);

      // Single shared shader material for ALL trail lines. Per-flight fade
      // and gradient are baked into each line's own vertex-alpha buffer, so
      // one GPU program serves every trail — no per-frame material churn.
      const trailMaterial = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: GOLD } },
        vertexShader: `
          attribute float aAlpha;
          varying float vAlpha;
          void main(){
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main(){
            gl_FragColor = vec4(uColor, vAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      // ─── Frustum-safe arc height ─────────────────────────────────────
      // Vertical half-extent visible at the globe's center, given camera
      // fov/distance, with a safety margin baked into MAX_BULGE.
      const MAX_BULGE = 1.40;

      // ─── Flight slot pool ────────────────────────────────────────────
      const POOL_SIZE = 14;         // fewer planes — cleaner, more premium sky
      const TRAIL_POINTS = 26;      // long, smooth contrails
      const RING_POOL_SIZE = 14;

      const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

      const makeSlot = () => {
        const planeMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
        });
        const plane = new THREE.Mesh(PLANE_GEO, planeMaterial);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: GOLD, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const glow = new THREE.Mesh(GLOW_GEO, glowMaterial);
        flightsGroup.add(plane, glow);

        const positions = new Float32Array(TRAIL_POINTS * 3);
        const alphas = new Float32Array(TRAIL_POINTS);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        trailGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
        const trail = new THREE.Line(trailGeo, trailMaterial);
        flightsGroup.add(trail);

        return {
          plane, glow, trail, positions, alphas,
          curve: null, duration: 0, elapsed: 0,
          trailSpan: 0.1, fade: 1,
          state: "idle",     // idle -> flying -> landing -> idle
          waitTimer: 0, waitFor: 0,
          destVec: new THREE.Vector3(),
        };
      };
      const slots = Array.from({ length: POOL_SIZE }, makeSlot);

      // ─── Pulse ring pool (departures + arrivals share the pool) ────────
      const ringPool = Array.from({ length: RING_POOL_SIZE }, () => {
        const mat = new THREE.MeshBasicMaterial({
          color: GOLD, transparent: true, opacity: 0, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(RING_GEO, mat);
        mesh.visible = false;
        flightsGroup.add(mesh);
        return { mesh, life: 0, dur: 0.5, active: false };
      });
      const firePulse = (pos, durationSec) => {
        const r = ringPool.find((r) => !r.active) || ringPool[0];
        r.mesh.position.copy(pos);
        r.mesh.lookAt(pos.clone().multiplyScalar(2));
        r.mesh.scale.set(1, 1, 1);
        r.mesh.material.opacity = 0.85;
        r.mesh.visible = true;
        r.life = 0;
        r.dur = durationSec;
        r.active = true;
      };

      // ─── Spawn a new route into a slot ───────────────────────────────
      const spawnRoute = (slot) => {
        let ai = Math.floor(Math.random() * capitalPts.length);
        let bi = Math.floor(Math.random() * capitalPts.length);
        while (bi === ai) bi = Math.floor(Math.random() * capitalPts.length);
        const a = capitalPts[ai], b = capitalPts[bi];
        const dist = a.distanceTo(b); // 0 (adjacent) .. ~2 (antipodal)

        const bulge = Math.min(1.012 + 0.22 * Math.pow(dist, 0.6), MAX_BULGE);
        const p1 = a.clone().lerp(b, 0.25).normalize().multiplyScalar(bulge * 0.92);
        const p2 = a.clone().lerp(b, 0.75).normalize().multiplyScalar(bulge);
        slot.curve = new THREE.CubicBezierCurve3(a.clone(), p1, p2, b.clone());
        slot.destVec.copy(b);

        const distNorm = Math.min(dist / 2, 1);
        slot.duration = THREE.MathUtils.lerp(9, 14, distNorm) + Math.random() * 4; // 9-18s — unhurried, premium pace
        slot.elapsed = -Math.random() * 0.6; // slight randomized easing/start offset
        slot.trailSpan = 0.16 + Math.random() * 0.14; // 16-30% of arc — long, visible contrails
        slot.state = "flying";
        slot.fade = 1;

        slot.plane.material.opacity = 0;
        slot.glow.material.opacity = 0;
        firePulse(a, 0.5);
      };

      // give every slot a staggered, asynchronous first departure
      slots.forEach((slot, i) => {
        slot.waitFor = i * (14 / POOL_SIZE) + Math.random() * 1.2;
        slot.state = "idle";
      });

      // ─── Per-frame update ─────────────────────────────────────────────
      const tmpAhead = new THREE.Vector3();
      const tmpPos = new THREE.Vector3();
      const tmpAhead2 = new THREE.Vector3();
      const tmpTrail = new THREE.Vector3();
      const tmpV1 = new THREE.Vector3();
      const tmpV2 = new THREE.Vector3();

      const updateFlights = (dt) => {
        // idle capital pulse (independent of flight activity)
        const now = clock.getElapsedTime();
        capitalMarkers.forEach((m) => {
          const s = 1 + 0.18 * (0.5 + 0.5 * Math.sin(now * m.speed + m.phase));
          m.halo.scale.set(s, s, s);
          m.halo.material.opacity = 0.16 + 0.14 * (0.5 + 0.5 * Math.sin(now * m.speed + m.phase));
        });

        for (const slot of slots) {
          if (slot.state === "idle") {
            slot.waitTimer += dt;
            if (slot.waitTimer >= slot.waitFor) {
              slot.waitTimer = 0;
              spawnRoute(slot);
            }
            continue;
          }

          if (slot.state === "flying") {
            slot.elapsed += dt;
            const rawT = THREE.MathUtils.clamp(slot.elapsed / slot.duration, 0, 1);
            const u = smootherstep(rawT);

            const pos = slot.curve.getPointAt(u, tmpPos);
            slot.plane.position.copy(pos);
            slot.glow.position.copy(pos);

            // orientation: forward tangent + radial "up", plus a bank roll
            const uAhead = Math.min(u + 0.012, 1);
            const ahead = slot.curve.getPointAt(uAhead, tmpAhead);
            slot.plane.up.copy(pos).normalize();
            slot.plane.lookAt(ahead);

            const uAhead2 = Math.min(u + 0.03, 1);
            const ahead2 = slot.curve.getPointAt(uAhead2, tmpAhead2);
            const legA = tmpV1.copy(ahead).sub(pos).normalize();
            const legB = tmpV2.copy(ahead2).sub(ahead).normalize();
            const turnDelta = legA.angleTo(legB);
            const bankSign = Math.sign((ahead.x - pos.x) - (ahead2.x - ahead.x)) || 1;
            slot.plane.rotateZ(THREE.MathUtils.clamp(turnDelta * 6 * bankSign, -0.5, 0.5));

            slot.glow.quaternion.copy(slot.plane.quaternion);

            // ramp opacity in on spawn, matching the departure pulse timing
            const inOpacity = THREE.MathUtils.clamp(slot.elapsed >= 0 ? Math.min(slot.elapsed / 0.4, 1) : 0, 0, 1);
            slot.plane.material.opacity = 0.95 * inOpacity;
            slot.glow.material.opacity = 0.28 * inOpacity;

            // rolling trail buffer — update in place, no reallocation
            for (let i = 0; i < TRAIL_POINTS; i++) {
              const f = i / (TRAIL_POINTS - 1);
              const su = Math.max(0, u - slot.trailSpan * (1 - f));
              const sp = slot.curve.getPointAt(Math.min(su, 1), tmpTrail);
              slot.positions[i * 3] = sp.x;
              slot.positions[i * 3 + 1] = sp.y;
              slot.positions[i * 3 + 2] = sp.z;
              slot.alphas[i] = Math.pow(f, 1.3) * 0.55 * inOpacity;
            }
            slot.trail.geometry.attributes.position.needsUpdate = true;
            slot.trail.geometry.attributes.aAlpha.needsUpdate = true;

            if (slot.elapsed >= slot.duration) {
              slot.state = "landing";
              slot.elapsed = 0;
              firePulse(slot.destVec, 0.7);
            }
          } else if (slot.state === "landing") {
            slot.elapsed += dt;
            const fadeT = THREE.MathUtils.clamp(slot.elapsed / 0.7, 0, 1); // 600-800ms
            const op = 1 - fadeT;
            slot.plane.material.opacity = 0.95 * op;
            slot.glow.material.opacity = 0.28 * op;
            for (let i = 0; i < TRAIL_POINTS; i++) slot.alphas[i] *= (1 - dt * 3);
            slot.trail.geometry.attributes.aAlpha.needsUpdate = true;

            if (fadeT >= 1) {
              slot.state = "idle";
              slot.waitTimer = 0;
              slot.waitFor = 0.3 + Math.random() * 0.7; // 300-1000ms — relaxed turnaround
            }
          }
        }

        // pulse rings (departures + arrivals)
        for (const r of ringPool) {
          if (!r.active) continue;
          r.life += dt;
          const t = THREE.MathUtils.clamp(r.life / r.dur, 0, 1);
          const s = 1 + t * 5.5;
          r.mesh.scale.set(s, s, s);
          r.mesh.material.opacity = 0.85 * (1 - t);
          if (t >= 1) { r.active = false; r.mesh.visible = false; }
        }
      };

      // ─── Main render loop ───────────────────────────────────────────
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05); // clamp so tab-switches don't jump flights
        core.rotation.y += 0.0013;
        ring1.rotation.z -= 0.0026;
        ring2.rotation.z += 0.0013;
        updateFlights(dt);
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
        window.removeEventListener("resize", onResize);

        // dispose pooled flight geometry/materials
        PLANE_GEO.dispose(); GLOW_GEO.dispose(); RING_GEO.dispose();
        capDotGeo.dispose(); haloGeo.dispose();
        trailMaterial.dispose();
        slots.forEach((s) => {
          s.plane.material.dispose();
          s.glow.material.dispose();
          s.trail.geometry.dispose();
        });
        ringPool.forEach((r) => r.mesh.material.dispose());
        capitalMarkers.forEach((m) => { m.dot.material.dispose(); m.halo.material.dispose(); });

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
  { icon: "help", label: "Help", path: "/info" },
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

const TOPIC_VISIBLE = 6;

function TopicCards({ onSelect }) {
  const [cards, setCards] = useState(() => shuffle(ALL_TOPICS).slice(0, TOPIC_VISIBLE));
  const [phase, setPhase] = useState("in"); // in | out — drives the staggered crossfade

  const reshuffle = useCallback(() => {
    setPhase("out");
    setTimeout(() => {
      setCards(prev => {
        const shown = new Set(prev.map(c => c.label));
        const pool  = shuffle(ALL_TOPICS.filter(c => !shown.has(c.label)));
        return (pool.length >= TOPIC_VISIBLE ? pool : shuffle(ALL_TOPICS)).slice(0, TOPIC_VISIBLE);
      });
      setPhase("in");
    }, 480);
  }, []);

  // Auto-shuffle the deck so the six visible debates keep rotating through the pool.
  useEffect(() => {
    const id = setInterval(reshuffle, 6000);
    return () => clearInterval(id);
  }, [reshuffle]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
      {cards.map(({ icon, abbr, label }, i) => (
        <button key={label} onClick={() => onSelect(label)} style={{
          background: "rgba(14,14,28,0.7)", border: "1px solid rgba(255,32,64,0.12)", borderRadius: 16,
          padding: "18px 16px", display: "flex", alignItems: "center", textAlign: "left", cursor: "pointer",
          backdropFilter: "blur(8px)",
          opacity: phase === "out" ? 0 : 1,
          transform: phase === "out" ? "translateY(12px) scale(0.97)" : "translateY(0) scale(1)",
          transition: `opacity 0.46s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms, transform 0.46s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms, border-color 0.25s, background 0.25s, box-shadow 0.25s`,
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
// TRIBUNAL REPORT SECTIONS — Steelman · Framing · Analytics ·
// Sources · Minority Report · Track Record · Vote · Case File
// Every number is computed or judge-assessed-and-labelled.
// ═══════════════════════════════════════════════════════════════

const FRESHNESS_DOT = { fresh: "#10e0a0", aging: "#ffb020", stale: "#c23b4d", unknown: "#556" };
const TRUST_COLOR = (t) => (t >= 80 ? "#10e0a0" : t >= 60 ? C.onSurfaceVariant : "#ffb020");

function TribunalCard({ icon, iconColor, title, right, children, delay = 0, accent }) {
  return (
    <div style={{
      background: "rgba(14,14,28,0.72)", backdropFilter: "blur(14px)",
      border: `1px solid ${accent || "rgba(255,255,255,0.09)"}`,
      borderRadius: 16, padding: "20px 24px", marginBottom: 18,
      animation: `fadeUp 0.5s ${delay}s ease both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: iconColor }}>
          <Icon name={icon} style={{ fontSize: 15, color: iconColor }} /> {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// Shown between the topic banner and the podiums
function PreVerdictStrips({ verdict, debate }) {
  const [framingOpen, setFramingOpen] = useState(true);
  const framing = verdict?.framing_check;
  const steel = debate?.steelman;
  const hasSteel = steel && (steel.for_restates_against || steel.against_restates_for);
  if (!framing && !hasSteel) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      {framing && framingOpen && (
        <TribunalCard icon="explore" iconColor={C.purple} title="Framing Check" accent="rgba(168,85,247,0.22)"
          right={<button onClick={() => setFramingOpen(false)} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>dismiss ▾</button>}>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, lineHeight: 1.7, color: C.onSurface }}>
            This debate assumes a <span style={{ color: C.purple, fontWeight: 700 }}>{framing.assumed_frame}</span> frame.
            {(framing.alternatives || []).length > 0 && <> Alternative framings: <span style={{ color: C.onSurfaceVariant }}>{framing.alternatives.join(" · ")}</span>.</>}
          </p>
        </TribunalCard>
      )}
      {hasSteel && (
        <TribunalCard icon="handshake" iconColor="#10e0a0" title="Steelman Check" accent="rgba(16,224,160,0.2)">
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
            Before arguing, each side was required to restate the opponent's strongest point fairly.
          </p>
          {(
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              {[["FOR restates AGAINST", steel.for_restates_against, C.green],
                ["AGAINST restates FOR", steel.against_restates_for, C.crimson]].map(([label, text, col]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${col}30`, borderRadius: 11, padding: "13px 15px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: col, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
                  <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, lineHeight: 1.65, color: C.onSurface, fontStyle: "italic" }}>{text ? `"${text}"` : "Not delivered this round."}</p>
                </div>
              ))}
            </div>
          )}
        </TribunalCard>
      )}
    </div>
  );
}

// Run telemetry (Phase 6) — REAL token counts + estimated cost + per-stage
// latency for a debate run. "—" wherever the SDK didn't report usage.
const PROVIDER_LABEL = { openai: "OpenAI", anthropic: "Anthropic", google: "Google", groq: "Groq", mistral: "Mistral", cohere: "Cohere", together: "Together" };

function DebateTelemetryCard({ telemetry }) {
  if (!telemetry) return null;
  const t = telemetry;
  const cost = t.estimated_cost || {};
  const accent = C.crimson;
  const fmtTok = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
  const fmtCost = (usd) => (typeof usd === "number" ? `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}` : "—");
  const stages = Object.entries(t.by_stage || {});
  const STAGE_LABEL = { search: "Search", for_opening: "FOR opening", against_opening: "AGAINST opening",
    for_rebuttal: "FOR rebuttal", against_rebuttal: "AGAINST rebuttal", judge: "Judge" };
  const tiles = [
    { label: "LLM calls", value: t.calls ?? "—" },
    { label: "Total tokens", value: fmtTok(t.total_tokens) },
    { label: "Est. cost", value: fmtCost(cost.usd), sub: "estimate" },
    { label: "Scrape cache", value: t.scrape_cache_hits ? `${t.scrape_cache_hits} hit${t.scrape_cache_hits !== 1 ? "s" : ""}` : "0" },
  ];
  return (
    <div style={{ background: "rgba(20,8,12,0.6)", border: `1px solid ${C.white10}`, borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: accent, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>Real usage · your key</span>
        {(t.providers || []).map((p) => (
          <span key={`${p.provider}-${p.model}`} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#e6c9cf", background: "rgba(255,32,64,0.08)", border: `1px solid ${C.white10}`, borderRadius: 20, padding: "3px 10px", textTransform: "none" }}>
            {PROVIDER_LABEL[p.provider] || p.provider}{p.model ? ` · ${p.model}` : ""}
          </span>
        ))}
      </div>
      <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 14px" }}>Run Telemetry</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: stages.length ? 16 : 0 }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ background: C.white5, border: `1px solid ${C.white10}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary, marginBottom: 5 }}>{tile.label}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: "#fff" }}>{tile.value}</div>
            {tile.sub && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: C.textSecondary, marginTop: 2 }}>{tile.sub}</div>}
          </div>
        ))}
      </div>
      {stages.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
            <thead>
              <tr style={{ color: C.textSecondary, textAlign: "left" }}>
                <th style={{ padding: "6px 8px", fontWeight: 600 }}>Stage</th>
                <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Calls</th>
                <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Tokens (in/out)</th>
                <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Latency</th>
                <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {stages.map(([stage, s]) => (
                <tr key={stage} style={{ borderTop: `1px solid ${C.white10}`, color: "#e6c9cf" }}>
                  <td style={{ padding: "6px 8px", color: "#fff" }}>{STAGE_LABEL[stage] || stage}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{s.calls ?? "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{(s.input_tokens || s.output_tokens) ? `${fmtTok(s.input_tokens)} / ${fmtTok(s.output_tokens)}` : "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{typeof s.latency_s === "number" ? `${s.latency_s.toFixed(1)}s` : "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: accent }}>{fmtCost((cost.by_stage || {})[stage])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary, lineHeight: 1.6 }}>
        Costs are estimates from public list prices{cost.priced_all === false ? " (partial — some models have no price entry)" : ""}.
        {t.missing_usage ? " Some calls' providers did not report token usage (shown as —)." : ""}
      </div>
    </div>
  );
}

// ── Interactive follow-ups: Judge's Lens (#5) + Join the Debate (#6) ──────────
const JUDGE_LENSES = [
  { key: "impartial",  label: "Impartial",  icon: "balance",       blurb: "Neutral judge — logic and evidence only" },
  { key: "economist",  label: "Economist",  icon: "trending_up",   blurb: "Cost-benefit, incentives, efficiency, tradeoffs" },
  { key: "ethicist",   label: "Ethicist",   icon: "diversity_3",   blurb: "Rights, duties, fairness, harm to the vulnerable" },
  { key: "pragmatist", label: "Pragmatist", icon: "construction",  blurb: "Feasibility, implementation, what works in practice" },
];

function DebateFollowups({ query, result, onVerdict }) {
  const d = result?.debate || {};
  const args = {
    query,
    for_opening: d.for_opening || "",
    against_opening: d.against_opening || "",
    for_rebuttal: result?.for_rebuttal || d.for_rebuttal || "",
    against_rebuttal: result?.against_rebuttal || d.against_rebuttal || "",
    total_sources: (result?.citations || []).length || 0,
  };
  const ready = args.for_opening && args.against_opening;

  const [lens, setLens] = useState(result?.verdict?.persona || "impartial");
  const [lensBusy, setLensBusy] = useState("");
  const [lensErr, setLensErr] = useState("");

  const [side, setSide] = useState("for");
  const [arg, setArg] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [exchange, setExchange] = useState(null); // {argument, side, opponent_response, opponent_side}

  // #7 cross-examination
  const [crossEx, setCrossEx] = useState(null);   // {for_asks:{question,answer}, against_asks:{...}}
  const [crossBusy, setCrossBusy] = useState(false);
  const [crossErr, setCrossErr] = useState("");

  // #8 "what flips this" — pure client-side recompute from the verdict's own
  // evidence-rubric vs judge-quality components.
  const v = result?.verdict || {};
  const forRub = v?.rubric_for?.computed_score, againstRub = v?.rubric_against?.computed_score;
  const forQ = v?.for_quality, againstQ = v?.against_quality;
  const canFlip = [forRub, againstRub, forQ, againstQ].every((x) => typeof x === "number");
  const [wEv, setWEv] = useState(0.5); // weight on evidence (0.5 = the real verdict)

  const authHeaders = () => {
    const t = localStorage.getItem("polynous_token") || "";
    return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  };

  const pickLens = async (key) => {
    if (key === lens || lensBusy) return;
    setLensErr(""); setLensBusy(key);
    try {
      const res = await apiFetch(`/debate/rejudge`, { method: "POST", body: JSON.stringify({ ...args, persona: key }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Re-judge failed");
      setLens(key);
      onVerdict?.(data.verdict, { keepExchange: true });
    } catch (e) { setLensErr(String(e.message || e)); }
    finally { setLensBusy(""); }
  };

  const submitArg = async () => {
    const text = arg.trim();
    if (!text || joinBusy || !ready) return;
    setJoinErr(""); setJoinBusy(true);
    try {
      const res = await apiFetch(`/debate/respond`, { method: "POST", body: JSON.stringify({ ...args, side, persona: lens, user_argument: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Response failed");
      setExchange({ argument: text, side, opponent_response: data.opponent_response, opponent_side: data.opponent_side });
      setArg("");
      onVerdict?.(data.verdict, { keepExchange: true });
    } catch (e) { setJoinErr(String(e.message || e)); }
    finally { setJoinBusy(false); }
  };

  const runCrossExam = async () => {
    if (crossBusy) return;
    setCrossErr(""); setCrossBusy(true);
    try {
      const res = await apiFetch(`/debate/cross-exam`, { method: "POST", body: JSON.stringify(args) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Cross-examination failed");
      setCrossEx({ for_asks: data.for_asks, against_asks: data.against_asks });
    } catch (e) { setCrossErr(String(e.message || e)); }
    finally { setCrossBusy(false); }
  };

  if (!ready) return null;
  const sideColor = (s) => (s === "for" ? C.green : C.crimson);

  // #8 live recompute
  const flipFor = canFlip ? (wEv * forRub + (1 - wEv) * forQ) : 0;
  const flipAgainst = canFlip ? (wEv * againstRub + (1 - wEv) * againstQ) : 0;
  const flipGap = flipFor - flipAgainst;
  const flipWinner = Math.abs(flipGap) < 0.5 ? "TIE" : (flipGap > 0 ? "FOR" : "AGAINST");
  const flipWinColor = flipWinner === "FOR" ? C.green : flipWinner === "AGAINST" ? C.crimson : C.purple;
  const realWinner = v?.winner;
  const flipped = canFlip && flipWinner !== realWinner && Math.abs(wEv - 0.5) > 0.001;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Judge's Lens */}
      <div style={{ background: "rgba(14,14,28,0.6)", border: `1px solid ${C.white10}`, borderLeft: `4px solid ${C.gold}`, borderRadius: 16, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Icon name="gavel" style={{ fontSize: 19, color: C.gold }} />
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>Judge's Lens</h3>
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
          Same debate, same evidence — re-scored through a different value frame. Watch who wins change.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {JUDGE_LENSES.map((L) => {
            const active = lens === L.key;
            return (
              <button key={L.key} onClick={() => pickLens(L.key)} disabled={!!lensBusy}
                style={{ textAlign: "left", cursor: lensBusy ? "wait" : "pointer", borderRadius: 12, padding: "13px 14px",
                  background: active ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? C.gold : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <Icon name={L.icon} style={{ fontSize: 17, color: active ? C.gold : C.textSecondary }} />
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: active ? "#fff" : "#c9cfe0" }}>{L.label}</span>
                  {lensBusy === L.key && <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.gold }}>re-judging…</span>}
                </div>
                <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: C.textSecondary, lineHeight: 1.45 }}>{L.blurb}</span>
              </button>
            );
          })}
        </div>
        {lensErr && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, margin: "10px 0 0" }}>{lensErr}</p>}
      </div>

      {/* #8 What flips this — interactive verdict sensitivity */}
      {canFlip && (
        <div style={{ background: "rgba(14,14,28,0.6)", border: `1px solid ${C.white10}`, borderLeft: `4px solid ${flipWinColor}`, borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Icon name="tune" style={{ fontSize: 19, color: flipWinColor }} />
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>What flips this?</h3>
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 18px", lineHeight: 1.6 }}>
            The verdict is 50% measured evidence + 50% judged argument quality. Drag to re-weight and watch the scores move — the verdict is reasoned, not decreed.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: C.green }}>{flipFor.toFixed(1)}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary }}> FOR</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: flipWinColor }}>{flipWinner === "TIE" ? "TIE" : `${flipWinner} leads`}</div>
              {flipped && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.gold, marginTop: 3, letterSpacing: "0.05em" }}>⚠ FLIPPED from {realWinner}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary }}>AGAINST </span>
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: C.crimson }}>{flipAgainst.toFixed(1)}</span>
            </div>
          </div>
          <input type="range" min={0} max={100} value={Math.round(wEv * 100)} onChange={(e) => setWEv(Number(e.target.value) / 100)}
            style={{ width: "100%", accentColor: flipWinColor, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, marginTop: 6 }}>
            <span>← all argument quality</span>
            <button onClick={() => setWEv(0.5)} style={{ background: "none", border: "none", color: Math.abs(wEv - 0.5) < 0.001 ? C.textSecondary : C.gold, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
              evidence weight {Math.round(wEv * 100)}%{Math.abs(wEv - 0.5) < 0.001 ? " (actual)" : " · reset"}
            </button>
            <span>all evidence →</span>
          </div>
        </div>
      )}

      {/* #7 Cross-examination round */}
      <div style={{ background: "rgba(14,14,28,0.6)", border: `1px solid ${C.white10}`, borderLeft: `4px solid ${C.crimson}`, borderRadius: 16, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Icon name="contactless" style={{ fontSize: 19, color: C.crimson }} />
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>Cross-examination</h3>
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
          Each side puts its sharpest question to the other — and must answer. This is where weak arguments break.
        </p>
        {!crossEx && (
          <button onClick={runCrossExam} disabled={crossBusy}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: crossBusy ? "rgba(255,32,64,0.1)" : "rgba(255,32,64,0.12)", border: `1px solid ${C.crimson}`, borderRadius: 9999, color: crossBusy ? C.textSecondary : "#fff", cursor: crossBusy ? "wait" : "pointer", fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
            <Icon name={crossBusy ? "hourglass_empty" : "swords"} style={{ fontSize: 15 }} /> {crossBusy ? "Cross-examining…" : "Run cross-examination"}
          </button>
        )}
        {crossErr && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, margin: "10px 0 0" }}>{crossErr}</p>}
        {crossEx && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[["for", "against", crossEx.for_asks], ["against", "for", crossEx.against_asks]].map(([asker, answerer, qa], idx) => qa && (qa.question || qa.answer) && (
              <div key={idx} style={{ border: `1px solid ${sideColor(asker)}30`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: `${sideColor(asker)}12`, padding: "11px 15px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: sideColor(asker), marginBottom: 5 }}>{asker === "for" ? "Supporting" : "Counter"} asks</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, fontWeight: 600, color: "#fff", lineHeight: 1.55 }}>{qa.question}</div>
                </div>
                <div style={{ padding: "11px 15px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: sideColor(answerer), marginBottom: 5 }}>{answerer === "for" ? "Supporting" : "Counter"} answers</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: "#d7dced", lineHeight: 1.65 }}>{qa.answer}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join the debate */}
      <div style={{ background: "rgba(14,14,28,0.6)", border: `1px solid ${C.white10}`, borderLeft: `4px solid ${C.purple}`, borderRadius: 16, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Icon name="record_voice_over" style={{ fontSize: 19, color: C.purple }} />
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>Join the debate</h3>
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
          Add your own argument. The opposing advocate will respond, and the judge re-scores with your point in play.
        </p>

        {exchange && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ alignSelf: "flex-end", maxWidth: "88%", background: `${sideColor(exchange.side)}14`, border: `1px solid ${sideColor(exchange.side)}44`, borderRadius: 14, padding: "11px 15px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: sideColor(exchange.side), marginBottom: 5 }}>You · {exchange.side === "for" ? "Supporting" : "Counter"}</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: "#e4e9f5", lineHeight: 1.6 }}>{exchange.argument}</div>
            </div>
            <div style={{ alignSelf: "flex-start", maxWidth: "88%", background: `${sideColor(exchange.opponent_side)}10`, border: `1px solid ${sideColor(exchange.opponent_side)}40`, borderRadius: 14, padding: "11px 15px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: sideColor(exchange.opponent_side), marginBottom: 5 }}>{exchange.opponent_side === "for" ? "Supporting" : "Counter"} advocate responds</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: "#e4e9f5", lineHeight: 1.65 }}>{exchange.opponent_response}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["for", "Argue Supporting"], ["against", "Argue Counter"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setSide(k)} disabled={joinBusy}
              style={{ flex: 1, cursor: "pointer", borderRadius: 10, padding: "9px 12px", fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700,
                background: side === k ? `${sideColor(k)}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${side === k ? sideColor(k) : "rgba(255,255,255,0.08)"}`, color: side === k ? "#fff" : "#aeb6c9" }}>
              {lbl}
            </button>
          ))}
        </div>
        <textarea value={arg} onChange={(e) => setArg(e.target.value)} disabled={joinBusy}
          placeholder={`Make your case ${side === "for" ? "for" : "against"} — the ${side === "for" ? "counter" : "supporting"} advocate will reply…`}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(6,6,16,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, resize: "vertical", outline: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
          {joinErr && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, marginRight: "auto" }}>{joinErr}</span>}
          <button onClick={submitArg} disabled={joinBusy || !arg.trim()}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: C.purple, color: "#fff", fontWeight: 700, borderRadius: 9999, border: "none",
              cursor: joinBusy || !arg.trim() ? "default" : "pointer", opacity: joinBusy || !arg.trim() ? 0.55 : 1, fontFamily: "'Sora',sans-serif", fontSize: 12.5 }}>
            <Icon name={joinBusy ? "hourglass_empty" : "send"} style={{ fontSize: 15 }} /> {joinBusy ? "Advocate responding…" : "Submit argument"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Shown after the verdict panel
function DebateExtras({ result, activeTopic, onNewDebate }) {
  const verdict = result?.verdict || {};
  const analytics = result?.debate?.analytics;
  const sources = result?.debate?.sources || [];
  const trackRecord = result?.trackRecord;
  const followUps = verdict?.follow_up_questions || [];
  const minority = verdict?.minority_report;
  const [voted, setVoted] = useState(null);
  const [voteStats, setVoteStats] = useState(null);

  const castVote = async (agree) => {
    setVoted(agree ? "agree" : "disagree");
    try {
      const token = window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
      const res = await fetch(`${API_BASE_URL}/debate-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ topic: activeTopic, judge_winner: verdict.winner, agree }),
      });
      if (res.ok) setVoteStats(await res.json());
    } catch { /* vote is best-effort */ }
  };

  const exportCaseFile = () => {
    const docket = `PLYN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.abs([...activeTopic].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16).slice(0, 6).toUpperCase()}`;
    const rows = (label, obj) => Object.entries(obj || {}).map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`).join("\n");
    const body = `═══════════════════════════════════════════════════════
  POLYNOUS DEBATE TRIBUNAL — CASE FILE
  Docket No. ${docket}
  Filed: ${new Date().toUTCString()}
═══════════════════════════════════════════════════════

PROPOSITION UNDER REVIEW
  ${activeTopic}

VERDICT
  Winner: ${verdict.winner || "—"} · Margin: ${verdict.margin || "—"} · Judge certainty: ${verdict.judge_certainty ?? "—"}%
  Scoring: ${verdict.scoring || "—"}
  FOR ${verdict.for_score ?? "—"}/10 · AGAINST ${verdict.against_score ?? "—"}/10

JUDGE'S REASONING
  ${verdict.reasoning || "—"}

MINORITY REPORT
  ${minority ? `${minority.could_flip ? "Verdict could flip" : "Verdict holds"} — ${minority.condition || ""}. ${minority.note || ""}` : "None recorded."}

FOR — OPENING
${result?.debate?.for_opening || "—"}

FOR — REBUTTAL
${result?.debate?.for_rebuttal || "—"}

AGAINST — OPENING
${result?.debate?.against_opening || "—"}

AGAINST — REBUTTAL
${result?.debate?.against_rebuttal || "—"}

COMPUTED ANALYTICS
  FOR:\n${rows("FOR", analytics?.computed?.FOR)}
  AGAINST:\n${rows("AGAINST", analytics?.computed?.AGAINST)}

SOURCES CITED
${sources.map(s => `  [${s.id}] ${s.title} — ${s.domain} · trust ${s.trust_score} · ${s.freshness} · cited ${s.cited_count}×\n      ${s.url}`).join("\n")}

═══════════════════════════════════════════════════════
  Signed: FOR Advocate · AGAINST Advocate · The Judge
  Generated by POLYNOUS — computed metrics, honest verdicts.
═══════════════════════════════════════════════════════
`;
    const blob = new Blob([body], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `polynous-case-${docket}.txt`;
    a.click();
  };

  const unscored = verdict.winner === "UNSCORED";
  const comp = analytics?.computed;
  const judged = analytics?.judge_assessed;

  return (
    <div style={{ marginTop: 22 }}>
      {/* Run telemetry (Phase 6) — real tokens/cost for the debate run */}
      <DebateTelemetryCard telemetry={result?.telemetry} />
      {/* Minority report */}
      {minority && !unscored && (
        <TribunalCard icon="balance" iconColor="#e0a458" title="Minority Report" accent="rgba(224,164,88,0.25)" delay={0.05}>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, lineHeight: 1.7, color: "#e0c9a0" }}>
            {minority.could_flip ? "⚠ This verdict is sensitive: " : "This verdict is robust: "}
            {minority.condition}{minority.note ? ` — ${minority.note}` : ""}
          </p>
        </TribunalCard>
      )}

      {/* Judge track record + vote — REAL telemetry, honest empty state */}
      <TribunalCard icon="monitoring" iconColor={C.gold} title="Judge Track Record" delay={0.1}
        right={voteStats && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gold }}>vote recorded ✓</span>}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: C.onSurfaceVariant }}>
            {(() => {
              const tr = voteStats || trackRecord;
              if (!tr || !tr.sample_size) return "No verdict votes recorded yet — yours would be the first.";
              if (tr.sample_size < 5) return `${tr.sample_size} vote${tr.sample_size > 1 ? "s" : ""} recorded — not enough yet for a reliable agreement rate.`;
              return `Historically agrees with user votes ${Math.round(tr.agreement_rate_with_users * 100)}% of the time (${tr.sample_size} debates).`;
            })()}
          </p>
          {!unscored && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Do you agree?</span>
              {["agree", "disagree"].map(v => (
                <button key={v} disabled={!!voted} onClick={() => castVote(v === "agree")} style={{
                  padding: "6px 15px", borderRadius: 9999, cursor: voted ? "default" : "pointer",
                  border: `1px solid ${voted === v ? C.gold : "rgba(255,255,255,0.14)"}`,
                  background: voted === v ? "rgba(255,215,0,0.1)" : "transparent",
                  color: voted === v ? C.gold : C.onSurfaceVariant,
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  opacity: voted && voted !== v ? 0.35 : 1, transition: "all 0.2s",
                }}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </TribunalCard>

      {/* Analytics */}
      {comp && (
        <TribunalCard icon="analytics" iconColor={C.cyan} title="Debate Analytics" delay={0.15}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "9px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
            <span style={{ color: C.textSecondary, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Computed metric</span>
            <span style={{ color: C.green, fontWeight: 700, textAlign: "right" }}>FOR</span>
            <span style={{ color: C.crimson, fontWeight: 700, textAlign: "right" }}>AGAINST</span>
            {[["Evidence quality", "evidence_quality", v => `${v}%`],
              ["Source diversity", "source_diversity", v => `${v} sources`],
              ["Source trust (avg)", "source_trust_avg", v => v ? `${v}` : "—"],
              ["Argument density", "argument_density", v => v],
              ["Hallucinated citations", "hallucinated_citations", v => v],
            ].map(([label, key, fmt]) => (
              [<span key={label} style={{ color: C.onSurfaceVariant }}>{label}</span>,
               <span key={label + "f"} style={{ color: C.onSurface, textAlign: "right" }}>{fmt(comp.FOR?.[key])}</span>,
               <span key={label + "a"} style={{ color: C.onSurface, textAlign: "right" }}>{fmt(comp.AGAINST?.[key])}</span>]
            ))}
          </div>
          {judged && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.onSurfaceVariant }}>
              Judge-assessed quality: <span style={{ color: C.green, fontWeight: 700 }}>FOR {judged.argument_quality?.FOR}/10</span> · <span style={{ color: C.crimson, fontWeight: 700 }}>AGAINST {judged.argument_quality?.AGAINST}/10</span> · best rebuttal: <span style={{ color: C.gold }}>{judged.best_rebuttal}</span>
              <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 4 }}>({judged.note})</div>
            </div>
          )}
        </TribunalCard>
      )}

      {/* Sources cited */}
      {sources.length > 0 && (
        <TribunalCard icon="menu_book" iconColor="#00ccff" title="Sources Cited" delay={0.2}
          right={<span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary }}>🟢 &lt;6mo · 🟡 6–18mo · 🔴 stale</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {sources.map(s => (
              <a key={s.id} href={s.url || undefined} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(0,204,255,0.12)", borderRadius: 11, padding: "10px 14px", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,204,255,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,204,255,0.12)"}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#00ccff", flexShrink: 0 }}>[{s.id}]</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: FRESHNESS_DOT[s.freshness] || FRESHNESS_DOT.unknown, flexShrink: 0 }} title={`freshness: ${s.freshness}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, marginTop: 2 }}>{s.domain} · {s.content_kind}</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, color: TRUST_COLOR(s.trust_score), flexShrink: 0 }}>Trust {s.trust_score}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: s.cited_count ? C.onSurfaceVariant : C.textSecondary, flexShrink: 0 }}>{s.cited_count ? `Cited ${s.cited_count}×` : "Uncited"}</span>
              </a>
            ))}
          </div>
        </TribunalCard>
      )}

      {/* Follow-ups + case file */}
      {(followUps.length > 0 || true) && (
        <TribunalCard icon="quiz" iconColor={C.green} title="Follow-up Questions" delay={0.25}
          right={<button onClick={exportCaseFile} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 9999, border: "1px solid rgba(255,215,0,0.3)", background: "rgba(255,215,0,0.06)", color: C.gold, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Icon name="folder_zip" style={{ fontSize: 14 }} /> Export Case File
          </button>}>
          {followUps.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {followUps.map((q, i) => (
                <button key={i} onClick={() => onNewDebate?.(q)} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,230,77,0.03)", border: "1px solid rgba(0,230,77,0.14)", borderRadius: 11, padding: "11px 15px", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,230,77,0.4)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,230,77,0.14)"}>
                  <Icon name="arrow_forward" style={{ fontSize: 14, color: C.green, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: C.onSurface }}>{q}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary, textTransform: "uppercase", flexShrink: 0 }}>debate this →</span>
                </button>
              ))}
            </div>
          ) : <p className="de-empty" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.textSecondary, fontStyle: "italic" }}>No follow-up questions generated this round.</p>}
        </TribunalCard>
      )}
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
  // After a debate completes both the live Engine and the Report stay
  // available; `view` toggles which one is shown. The DebateEngine is kept
  // mounted (never re-keyed) so switching back never re-runs the pipeline.
  const [view, setView] = useState("report");
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
    setView("report");
    setActiveTopic(q.trim());
    setAgentStatus("");
  }, [loading]);

  // Toggle between the finished live Engine and the Report, with a smooth
  // scroll to the top so the transition reads as "sliding up to the engine".
  const showEngineView = useCallback(() => {
    setView("engine");
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 40);
  }, []);
  const showReportView = useCallback(() => {
    setView("report");
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 40);
  }, []);

  const handleEngineComplete = useCallback((data) => {
    setResult({
      verdict: data?.verdict || {},
      for_points: data?.debate?.for_points || [],
      against_points: data?.debate?.against_points || [],
      for_rebuttal: data?.debate?.for_rebuttal || "",
      against_rebuttal: data?.debate?.against_rebuttal || "",
      citations: data?.citations || [],
      debate: data?.debate || {},               // steelman, analytics, sources
      trackRecord: data?.judge_track_record || null,
      telemetry: data?.telemetry || null,        // Phase 6 run telemetry
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
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(72px,8vw,110px)", fontWeight: 800, color: C.crimson, fontStyle: "italic", transform: "skewX(-10deg)", letterSpacing: "-0.05em", lineHeight: 1, textShadow: "none", margin: 0 }}>DEBATE</h2>
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
                  <div style={{ marginTop: 16 }}>
                    <ScrapeCountControl accent={C.crimson} />
                  </div>
                  {error && <p style={{ marginTop: 10, color: C.crimson, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{error}</p>}
                </div>
              </Reveal>
            )}

            {/* ─── LIVE DEBATE ENGINE (real pipeline, no fake progress) ──
                Kept mounted after completion so the user can flip back to it
                from the report WITHOUT re-running the pipeline. Hidden (not
                unmounted) in report view. */}
            {(loading || result) && (
              // Full-bleed: escape the scroll container's 52px side padding so
              // the engine (and its hero band) runs edge to edge.
              <div
                className={(!loading && view === "engine") ? "debate-view-enter" : undefined}
                style={{
                  margin: "0 -52px",
                  display: (loading || view === "engine") ? "block" : "none",
                  animation: loading ? "fadeUp 0.4s ease both" : undefined,
                }}
              >
                {/* When revisiting the finished engine, offer a way back. */}
                {!loading && result && view === "engine" && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "0 52px 18px" }}>
                    <button onClick={showReportView} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", borderRadius: 30, border: "1px solid rgba(168,85,247,0.32)", background: "rgba(168,85,247,0.08)", color: C.purple, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", backdropFilter: "blur(8px)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(168,85,247,0.16)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(168,85,247,0.08)"; }}>
                      <Icon name="description" style={{ fontSize: 15 }} /> Back to Report
                    </button>
                  </div>
                )}
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
            {result && verdict && !loading && view === "report" && (() => {
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
                    <div style={{ display: "flex", gap: 10, marginLeft: 16, flexShrink: 0 }}>
                      {/* Flip up to the finished live engine (no re-run) */}
                      <button onClick={showEngineView} style={{ padding: "8px 18px", borderRadius: 30, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.07)", color: C.purple, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(168,85,247,0.14)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(168,85,247,0.07)"; }}
                      >
                        <Icon name="expand_less" style={{ fontSize: 15 }} />
                        View Live Engine
                      </button>
                      <button onClick={handleNewDebate} style={{ padding: "8px 18px", borderRadius: 30, border: `1px solid rgba(255,32,64,0.28)`, background: "rgba(255,32,64,0.06)", color: C.crimson, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,32,64,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,32,64,0.06)"; }}
                      >
                        <Icon name="refresh" style={{ fontSize: 13 }} />
                        New Debate
                      </button>
                    </div>
                  </div>

                  {/* Framing + Steelman checks (tribunal integrity strip) */}
                  <PreVerdictStrips verdict={verdict} debate={result.debate} />

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
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #ffe566, #ffd700)", display: "flex", alignItems: "center", justifyContent: "center", animation: "none" }}>
                        <Icon name="balance" style={{ fontSize: 26, color: "#7a5800" }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: C.textSecondary, marginBottom: 12 }}>Analysis Verdict</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(1.3rem,3vw,1.9rem)", fontWeight: 900, color: verdict.winner === "UNSCORED" ? "#ffd700" : winColor, letterSpacing: "-0.02em", animation: "none", marginBottom: 20 }}>
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
                    {verdict.winner !== "UNSCORED" && (verdict.margin || verdict.judge_certainty != null) && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.onSurfaceVariant, marginBottom: 18, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        {verdict.margin && <>Margin: <span style={{ color: winColor, fontWeight: 700 }}>{verdict.margin}</span></>}
                        {verdict.margin && verdict.judge_certainty != null && " · "}
                        {verdict.judge_certainty != null && <>Judge certainty: <span style={{ color: winColor, fontWeight: 700 }}>{verdict.judge_certainty}%</span></>}
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

                  {/* Tribunal report sections: minority report, track record +
                      vote, analytics, sources cited, follow-ups, case file */}
                  <DebateFollowups query={activeTopic} result={result}
                    onVerdict={(v) => setResult((r) => ({ ...r, verdict: { ...(r?.verdict || {}), ...v } }))} />
                  <DebateExtras result={result} activeTopic={activeTopic} onNewDebate={(q) => { setTopic(q); fireDebate(q); }} />

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