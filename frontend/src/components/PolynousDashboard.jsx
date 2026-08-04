import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { API_BASE_URL } from '../config';

const C = {
  green: "#00ff0f", cyan: "#00ccff", crimson: "#ff2040", purple: "#a855f7",
  gold: "#ffd700", void: "#0a0a1e", surface: "#111125", surfaceContainer: "#1e1e32",
  onSurface: "#e2e0fc", onSurfaceVariant: "#b9ccb0",
  textSecondary: "#8899aa", white10: "rgba(255,255,255,0.1)", white5: "rgba(255,255,255,0.05)",
  fontDisplay: "'Anton', sans-serif",
};

const RAINBOW = ['#ff2040','#ff6b35','#ffd700','#00ff0f','#00ccff','#4dabf7','#a855f7','#ff6b9d'];

function Icon({ name, style }) {
  return <span style={{ fontFamily:"Material Symbols Outlined", fontVariationSettings:"'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24", lineHeight:1, ...(style||{}) }}>{name}</span>;
}

// ─── SVG ICON COMPONENTS ──────────────────────────────────────
function SvgBarChart({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="10" width="4" height="11" rx="1" fill={color} opacity="0.7"/>
      <rect x="10" y="5" width="4" height="16" rx="1" fill={color}/>
      <rect x="17" y="7" width="4" height="14" rx="1" fill={color} opacity="0.85"/>
      <line x1="2" y1="21.5" x2="22" y2="21.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

function SvgTrendUp({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="3,17 9,11 13,15 21,7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="15,7 21,7 21,13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SvgTag({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L3 14V3h11l6.59 6.59a2 2 0 0 1 0 2.82z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.5" r="1.5" fill={color}/>
    </svg>
  );
}

function SvgTarget({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.8" opacity="0.6"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  );
}

function SvgMap({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8"/>
      <line x1="9" y1="4" x2="9" y2="20" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="15" y1="4" x2="15" y2="20" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="3" y1="16" x2="21" y2="16" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <circle cx="6.5" cy="7.5" r="1" fill={color} opacity="0.6"/>
      <circle cx="17" cy="13.5" r="1" fill={color} opacity="0.8"/>
    </svg>
  );
}

function SvgRefresh({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 4 23 10 17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SvgActivity({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Styles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&family=Material+Symbols+Outlined&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a1e;color:#e2e0fc;font-family:'Hanken Grotesk',sans-serif;overflow-x:hidden}
    ::selection{background:rgba(0,255,15,0.25)}
    @keyframes rainbow-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .period-btn{padding:4px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;border:none;background:transparent;cursor:pointer;border-radius:9999px;transition:all 0.2s;color:#b9ccb0}
    .period-btn-active{background:rgba(0,255,15,0.1);color:#00ff0f}
    .period-btn-inactive:hover{color:#e2e0fc}
    .card-glow{transition:box-shadow 0.4s ease}
    .card-glow:hover{box-shadow:0 0 30px rgba(0,204,255,0.08),0 0 60px rgba(0,255,15,0.04)!important}
    .hover-tooltip{animation:fadeSlideUp 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards;pointer-events:none}
    .topic-popup{animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;pointer-events:none}
    .topics-expanded{animation:fadeSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards}
    .analytics-heading {
      font-family: 'Anton', sans-serif;
      font-size: clamp(3.4rem, 7.5vw, 6rem);
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 0.95;
      background: linear-gradient(90deg, #ff2040 0%, #ff6b35 14%, #ffd700 28%, #00ff0f 42%, #00ccff 57%, #4dabf7 71%, #a855f7 85%, #ff2040 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: rainbow-shift 4s ease infinite;
      filter: drop-shadow(0 0 40px rgba(168,85,247,0.35));
    }
  `}</style>;
}

// ─── NEURAL BACKGROUND ────────────────────────────────────────
function NeuralBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let particles = [], mouse = { x:null, y:null }, animId;
    const resize = () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x=Math.random()*canvas.width; this.y=Math.random()*canvas.height;
        this.baseVx=(Math.random()-0.5)*0.4; this.baseVy=(Math.random()-0.5)*0.4;
        this.vx=this.baseVx; this.vy=this.baseVy;
        this.size=Math.random()*1.5+0.5;
        this.color=RAINBOW[Math.floor(Math.random()*RAINBOW.length)];
        this.opacity=Math.random()*0.35+0.1;
        this.twinkleSpeed=Math.random()*0.025+0.008; this.twinkleOffset=Math.random()*Math.PI*2;
        this.wobbleAmp=Math.random()*0.2; this.wobbleSpeed=Math.random()*0.015+0.008; this.wobbleOffset=Math.random()*Math.PI*2;
      }
      update(time) {
        this.vx=this.baseVx+Math.sin(time*this.wobbleSpeed+this.wobbleOffset)*this.wobbleAmp;
        this.vy=this.baseVy+Math.cos(time*this.wobbleSpeed+this.wobbleOffset)*this.wobbleAmp;
        this.x+=this.vx; this.y+=this.vy;
        if(mouse.x!==null){const dx=this.x-mouse.x,dy=this.y-mouse.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<180){const f=(180-dist)/180;this.x+=(dx/dist)*f*2.5;this.y+=(dy/dist)*f*2.5;}}
        if(this.x<-10)this.x=canvas.width+10; if(this.x>canvas.width+10)this.x=-10;
        if(this.y<-10)this.y=canvas.height+10; if(this.y>canvas.height+10)this.y=-10;
      }
      draw(time) {
        const alpha=this.opacity*(Math.sin(time*this.twinkleSpeed+this.twinkleOffset)*0.15+0.85);
        const glow=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size*3);
        glow.addColorStop(0,this.color.replace(')',',' +alpha*0.5+')').replace('rgb','rgba'));
        glow.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(this.x,this.y,this.size*3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=this.color; ctx.globalAlpha=alpha;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }
    }
    let startTime=performance.now();
    const init=()=>{particles=Array.from({length:180},()=>new Particle());};
    const animate=(ts)=>{
      const time=ts-startTime; ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<110){ctx.strokeStyle=`rgba(255,255,255,${(1-dist/110)*0.04})`;ctx.lineWidth=0.3;ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.stroke();}
      }
      particles.forEach(p=>{p.update(time);p.draw(time);});
      animId=requestAnimationFrame(animate);
    };
    const onMM=(e)=>{mouse.x=e.clientX;mouse.y=e.clientY;};
    const onML=()=>{mouse.x=null;mouse.y=null;};
    window.addEventListener("resize",()=>{resize();init()});
    window.addEventListener("mousemove",onMM); window.addEventListener("mouseleave",onML);
    resize(); init(); animId=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(animId);window.removeEventListener("resize",resize);window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseleave",onML);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ─── SPARKLINE ────────────────────────────────────────────────
function Sparkline({ data, color }) {
  const ref = useRef(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');
    canvas.width=80;canvas.height=30;if(!data||data.length===0)return;
    const max=Math.max(...data,1),min=Math.min(...data,0);
    ctx.beginPath();ctx.moveTo(0,canvas.height-((data[0]-min)/(max-min||1))*canvas.height);
    data.forEach((v,i)=>{const x=(i/(data.length-1))*canvas.width,y=canvas.height-((v-min)/(max-min||1))*canvas.height;ctx.lineTo(x,y)});
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  },[data,color]);
  return <canvas ref={ref} width={80} height={30} style={{opacity:0.6}}/>;
}

// ─── ACTIVITY CHART ──────────────────────────────────────────
function ActivityChart({ data, period }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const pointsRef = useRef([]);

  const draw = useCallback((canvas, W, H, hoveredIdx) => {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

    const allEntries = Object.entries(data || {});
    const limit = period === '7D' ? 7 : period === '30D' ? 30 : 90;
    const entries = allEntries.slice(-limit);

    if (entries.length === 0) return;

    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
    const padL = 28, padR = 10, padT = 16, padB = 48;
    const w = W - padL - padR, h = H - padT - padB;

    for (let i = 0; i <= 4; i++) {
      const y = padT + (h / 4) * i;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(136,153,170,0.55)'; ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i / 4)), padL - 4, y + 3);
    }

    const pts = entries.map(([, v], i) => ({
      x: padL + (w / (Math.max(entries.length - 1, 1))) * i,
      y: padT + h - (v / maxVal) * h,
      val: v,
    }));

    pointsRef.current = pts.map(p => ({ x: p.x, y: p.y }));

    const fillGrad = ctx.createLinearGradient(padL, 0, W - padR, 0);
    RAINBOW.forEach((c, i) => fillGrad.addColorStop(i / (RAINBOW.length - 1), c + '40'));
    ctx.beginPath(); ctx.moveTo(pts[0].x, padT + h); ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) { const cpx = (pts[i - 1].x + pts[i].x) / 2; ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y); }
    ctx.lineTo(pts[pts.length - 1].x, padT + h); ctx.closePath();
    ctx.fillStyle = fillGrad; ctx.fill();

    const vFade = ctx.createLinearGradient(0, padT, 0, padT + h);
    vFade.addColorStop(0, 'rgba(0,0,0,0)'); vFade.addColorStop(1, 'rgba(10,10,30,0.6)');
    ctx.beginPath(); ctx.moveTo(pts[0].x, padT + h); ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) { const cpx = (pts[i - 1].x + pts[i].x) / 2; ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y); }
    ctx.lineTo(pts[pts.length - 1].x, padT + h); ctx.closePath();
    ctx.fillStyle = vFade; ctx.fill();

    if (hoveredIdx !== null && hoveredIdx !== undefined && pts[hoveredIdx]) {
      const hp = pts[hoveredIdx];
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(hp.x, padT); ctx.lineTo(hp.x, padT + h); ctx.stroke(); ctx.setLineDash([]);
    }

    const lineGrad = ctx.createLinearGradient(padL, 0, W - padR, 0);
    RAINBOW.forEach((c, i) => lineGrad.addColorStop(i / (RAINBOW.length - 1), c));
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) { const cpx = (pts[i - 1].x + pts[i].x) / 2; ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y); }
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 3; ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(0,204,255,0.5)'; ctx.stroke(); ctx.shadowBlur = 0;

    pts.forEach((p, i) => {
      const isHovered = i === hoveredIdx;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x, padT + h); ctx.stroke(); ctx.setLineDash([]);
      const color = RAINBOW[i % RAINBOW.length];
      const dotR = isHovered ? 7 : 5;
      if (isHovered) {
        ctx.beginPath(); ctx.arc(p.x, p.y, dotR + 5, 0, Math.PI * 2);
        ctx.fillStyle = color + '30'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.shadowBlur = isHovered ? 20 : 12; ctx.shadowColor = color; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, isHovered ? 3 : 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    });

    const skip = Math.ceil(entries.length / 7);
    entries.forEach(([label], i) => {
      if (i % skip !== 0 && i !== entries.length - 1) return;
      const x = padL + (w / (Math.max(entries.length - 1, 1))) * i;
      ctx.save(); ctx.translate(x, padT + h + 14); ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = 'rgba(136,153,170,0.8)'; ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'right';
      ctx.fillText(label, 0, 0); ctx.restore();
    });
  }, [data, period]);

  const hoveredIdxRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const parent = canvas.parentElement;
    function redraw() { draw(canvas, parent.clientWidth, parent.clientHeight, hoveredIdxRef.current); }
    redraw();
    const ro = new ResizeObserver(redraw); ro.observe(parent); return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback((e) => {
    const canvas = ref.current; if (!canvas) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    const allEntries = Object.entries(data || {});
    const limit = period === '7D' ? 7 : period === '30D' ? 30 : 90;
    const entries = allEntries.slice(-limit);

    const pts = pointsRef.current;
    let bestIdx = null, bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(mx - p.x);
      if (d < bestDist && d < 30) { bestDist = d; bestIdx = i; }
    });

    hoveredIdxRef.current = bestIdx;
    const parent = canvas.parentElement;
    draw(canvas, parent.clientWidth, parent.clientHeight, bestIdx);

    if (bestIdx !== null) {
      const entry = entries[bestIdx];
      if (!entry) return;
      const [date, val] = entry;
      const debates = Math.floor(val * 0.4);
      const sessions = Math.ceil(val / 2);
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, date, queries: val, debates, sessions });
    } else {
      setTooltip(null);
    }
  }, [data, period, draw]);

  const handleMouseLeave = useCallback(() => {
    hoveredIdxRef.current = null;
    setTooltip(null);
    const canvas = ref.current; if (!canvas) return;
    const parent = canvas.parentElement;
    draw(canvas, parent.clientWidth, parent.clientHeight, null);
  }, [draw]);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {tooltip && (
        <div className="hover-tooltip" style={{
          position: 'absolute',
          left: tooltip.x, top: Math.max(tooltip.y - 10, 10),
          transform: 'translate(-50%, -100%)',
          background: 'rgba(10,10,30,0.96)',
          border: '1px solid rgba(0,204,255,0.35)',
          borderRadius: 14, padding: '10px 14px',
          boxShadow: '0 0 20px rgba(0,204,255,0.2), 0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 100, minWidth: 140, pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{tooltip.date}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Queries', val: tooltip.queries, color: C.cyan },
              { label: 'Sessions', val: tooltip.sessions, color: C.green },
              { label: 'Debates', val: tooltip.debates, color: C.crimson },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
                <span style={{ color: C.textSecondary }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', width: 8, height: 8, background: 'rgba(10,10,30,0.96)', border: '1px solid rgba(0,204,255,0.35)', borderTop: 'none', borderLeft: 'none', transform: 'translateX(-50%) rotate(45deg)' }} />
        </div>
      )}
    </div>
  );
}

// ─── TOPICS CHART ─────────────────────────────────────────────
function TopicsChart({ data }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [popup, setPopup] = useState(null);
  const cellMapRef = useRef([]);

  const draw = useCallback((canvas, W, H) => {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

    const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (entries.length === 0) return;
    const padL = 8, padR = 8, padT = 10, padB = 52;
    const colW = (W - padL - padR) / entries.length;
    const dotR = 5, dotGap = 14, maxDots = 6;

    const cells = [];
    entries.forEach(([label, val], i) => {
      const cx = padL + colW * i + colW / 2;
      const count = Math.min(val, maxDots);
      const color = RAINBOW[i % RAINBOW.length];

      const trackH = (maxDots - 1) * dotGap + dotR * 2 + 10;
      const trackY = H - padB - trackH - 10;
      ctx.beginPath(); ctx.roundRect(cx - colW * 0.28, trackY, colW * 0.56, trackH + 20, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();

      if (count > 1) {
        const topDotY = H - padB - padT - (count - 1) * dotGap;
        const botDotY = H - padB - padT;
        const spineGrad = ctx.createLinearGradient(cx, topDotY, cx, botDotY);
        spineGrad.addColorStop(0, color + '99'); spineGrad.addColorStop(1, color + '22');
        ctx.beginPath(); ctx.moveTo(cx, topDotY); ctx.lineTo(cx, botDotY);
        ctx.strokeStyle = spineGrad; ctx.lineWidth = 1.5; ctx.stroke();
      }

      for (let j = 0; j < count; j++) {
        const dotY = H - padB - padT - j * dotGap;
        const dotColor = RAINBOW[(i + j) % RAINBOW.length];
        const glowR = dotR + 5;
        const glow = ctx.createRadialGradient(cx, dotY, 0, cx, dotY, glowR);
        glow.addColorStop(0, dotColor + '55'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(cx, dotY, glowR, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
        ctx.fillStyle = dotColor; ctx.shadowBlur = 10; ctx.shadowColor = dotColor; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(cx - 1.2, dotY - 1.2, 1.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
      }

      const topY = H - padB - padT - (count - 1) * dotGap - dotR - 10;
      ctx.fillStyle = color + '22'; ctx.beginPath(); ctx.roundRect(cx - 10, topY - 14, 20, 14, 4); ctx.fill();
      ctx.fillStyle = color; ctx.font = 'bold 9px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(val, cx, topY - 4);

      ctx.save();
      const short = label.length > 7 ? label.slice(0, 6) + '…' : label;
      ctx.translate(cx, H - padB + 8);
      if (colW < 55) { ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right'; } else { ctx.textAlign = 'center'; }
      ctx.fillStyle = 'rgba(185,204,176,0.85)'; ctx.font = '10px "JetBrains Mono"';
      ctx.fillText(short, 0, 0); ctx.restore();

      cells.push({ cx, label, val, color, colW });
    });
    cellMapRef.current = cells;
  }, [data]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const parent = canvas.parentElement;
    function redraw() { draw(canvas, parent.clientWidth, parent.clientHeight); }
    redraw();
    const ro = new ResizeObserver(redraw); ro.observe(parent); return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback((e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = cellMapRef.current.find(c => Math.abs(mx - c.cx) < c.colW / 2);
    if (hit) { setPopup({ x: hit.cx, y: my, label: hit.label, val: hit.val, color: hit.color }); }
    else setPopup(null);
  }, []);

  const handleMouseLeave = useCallback(() => setPopup(null), []);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {popup && (
        <div className="topic-popup" style={{
          position: 'absolute',
          left: popup.x, top: Math.max(popup.y - 10, 10),
          transform: 'translate(-50%,-100%)',
          background: 'rgba(10,10,30,0.95)',
          border: `1px solid ${popup.color}55`,
          borderRadius: 14, padding: '10px 16px',
          boxShadow: `0 0 20px ${popup.color}33, 0 8px 32px rgba(0,0,0,0.6)`,
          zIndex: 100, textAlign: 'center', minWidth: 90,
        }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: popup.color, textShadow: `0 0 16px ${popup.color}99`, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
            {popup.label}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(185,204,176,0.8)', marginBottom: 6 }}>topic</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: popup.color + '18', border: `1px solid ${popup.color}44`, borderRadius: 9999, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: popup.color, boxShadow: `0 0 6px ${popup.color}` }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: popup.color }}>{popup.val} mentions</span>
          </div>
          <div style={{ position: 'absolute', bottom: -6, left: '50%', width: 10, height: 10, background: 'rgba(10,10,30,0.95)', border: `1px solid ${popup.color}55`, borderTop: 'none', borderLeft: 'none', transform: 'translateX(-50%) rotate(45deg)' }} />
        </div>
      )}
    </div>
  );
}

// ─── CONFIDENCE RING ─────────────────────────────────────────
function ConfidenceRing({ distribution }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const segMapRef = useRef([]);

  const total = (distribution?.high || 0) + (distribution?.medium || 0) + (distribution?.low || 0) || 1;
  const highPct = useMemo(() => (distribution?.high || 0) / total, [distribution?.high, total]);
  const medPct = useMemo(() => (distribution?.medium || 0) / total, [distribution?.medium, total]);
  const lowPct = useMemo(() => (distribution?.low || 0) / total, [distribution?.low, total]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const SIZE = 220; canvas.width = SIZE; canvas.height = SIZE;
    const cx = SIZE / 2, cy = SIZE / 2;
    const segs = [
      { val: highPct, color: C.green, label: 'High Confidence', r: 72, lw: 12 },
      { val: medPct, color: '#ffaa00', label: 'Medium Confidence', r: 54, lw: 10 },
      { val: lowPct, color: C.crimson, label: 'Low Confidence', r: 38, lw: 8 },
    ];
    segMapRef.current = segs.map(s => ({ ...s, startAngle: -Math.PI / 2, endAngle: -Math.PI / 2 + s.val * Math.PI * 2 }));
    let t = 0;
    function drawFrame() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const progress = Math.min(t / 80, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      ctx.beginPath(); ctx.arc(cx, cy, 84, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke();
      segs.forEach(s => {
        ctx.beginPath(); ctx.arc(cx, cy, s.r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = s.lw; ctx.lineCap = 'round'; ctx.stroke();
      });
      segs.forEach(s => {
        if (s.val <= 0) return;
        const end = -Math.PI / 2 + (s.val * Math.PI * 2) * ease;
        ctx.beginPath(); ctx.arc(cx, cy, s.r, -Math.PI / 2, end); ctx.strokeStyle = s.color; ctx.lineWidth = s.lw + 8; ctx.globalAlpha = 0.12; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(cx, cy, s.r, -Math.PI / 2, end); ctx.strokeStyle = s.color; ctx.lineWidth = s.lw; ctx.shadowBlur = 14; ctx.shadowColor = s.color; ctx.stroke(); ctx.shadowBlur = 0;
        const ex = cx + Math.cos(end) * s.r, ey = cy + Math.sin(end) * s.r;
        ctx.beginPath(); ctx.arc(ex, ey, s.lw / 2 + 1, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.shadowBlur = 8; ctx.shadowColor = s.color; ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fillStyle = 'rgba(10,10,30,0.95)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px "Sora",sans-serif';
      ctx.fillText(Math.round(highPct * 100 * ease) + '%', cx, cy);
      t++; if (t <= 80) animRef.current = requestAnimationFrame(drawFrame);
    }
    cancelAnimationFrame(animRef.current); t = 0; drawFrame();
    return () => cancelAnimationFrame(animRef.current);
  }, [distribution]);

  const handleMouseMove = useCallback((e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const canvasEl = ref.current;
    const canvasRect = canvasEl.getBoundingClientRect();
    const cx = canvasRect.left - rect.left + canvasEl.offsetWidth / 2;
    const cy = canvasRect.top - rect.top + canvasEl.offsetHeight / 2;
    const mx = e.clientX - rect.left - cx, my = e.clientY - rect.top - cy;
    const dist = Math.sqrt(mx * mx + my * my);
    let angle = Math.atan2(my, mx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const hit = segMapRef.current.find(s => {
      if (s.val <= 0) return false;
      const outer = s.r + s.lw / 2 + 4, inner = s.r - s.lw / 2 - 4;
      const start = -Math.PI / 2, end = start + s.val * Math.PI * 2;
      let a = angle; if (a < start) a += Math.PI * 2;
      return dist >= inner && dist <= outer && a >= start && a <= end;
    });
    if (hit) { setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, seg: hit }); }
    else setTooltip(null);
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);
  const pctLabel = (v) => Math.round(v * 100) + '%';

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <canvas ref={ref} style={{ width: 220, height: 220, flexShrink: 0, cursor: 'crosshair' }} />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[{ label: 'High', color: C.green, pct: Math.round(highPct * 100) }, { label: 'Medium', color: '#ffaa00', pct: Math.round(medPct * 100) }, { label: 'Low', color: C.crimson, pct: Math.round(lowPct * 100) }].map(({ label, color, pct }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary }}>{label}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color, fontWeight: 700 }}>{pct}%</span>
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="hover-tooltip" style={{
          position: 'absolute', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%,-120%)',
          background: 'rgba(10,10,30,0.96)',
          border: `1px solid ${tooltip.seg.color}66`,
          borderRadius: 12, padding: '10px 16px',
          boxShadow: `0 0 24px ${tooltip.seg.color}33, 0 8px 32px rgba(0,0,0,0.7)`,
          zIndex: 200, textAlign: 'center', minWidth: 130,
        }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: tooltip.seg.color, marginBottom: 4 }}>{tooltip.seg.label}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: '#fff' }}>{pctLabel(tooltip.seg.val)}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, marginTop: 2 }}>of all answers</div>
        </div>
      )}
    </div>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────
function HeatmapChart({ data, activityData }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [dayModal, setDayModal] = useState(null);
  const cellMapRef = useRef([]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dayDateMap = useCallback(() => {
    const map = {};
    const now = new Date();
    days.forEach(day => {
      const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
      const diff = (now.getDay() - dayIndex + 7) % 7;
      const d = new Date(now);
      d.setDate(d.getDate() - diff);
      map[day] = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return map;
  }, []);

  const draw = useCallback((canvas, W, H) => {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

    const cols = 24, rows = days.length;
    const padL = 34, padR = 8, padT = 8, padB = 22;
    const cw = (W - padL - padR) / cols, ch = (H - padT - padB) / rows;

    let maxVal = 1;
    if (data) Object.values(data).forEach(hours => Object.values(hours).forEach(v => { if (v > maxVal) maxVal = v; }));

    ctx.fillStyle = 'rgba(136,153,170,0.6)'; ctx.font = '8px "JetBrains Mono"'; ctx.textAlign = 'center';
    for (let h = 0; h < 24; h += 3) {
      const x = padL + h * cw + cw / 2;
      const label = h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p';
      ctx.fillText(label, x, H - padB + 13);
    }
    ctx.textAlign = 'right';
    days.forEach((day, r) => {
      ctx.fillStyle = 'rgba(136,153,170,0.7)'; ctx.font = '9px "JetBrains Mono"';
      ctx.fillText(day, padL - 5, padT + r * ch + ch / 2 + 4);
    });

    const cells = [];
    days.forEach((day, r) => {
      for (let c = 0; c < cols; c++) {
        const v = (data?.[day]?.[String(c)] || 0) / maxVal;
        const rawVal = data?.[day]?.[String(c)] || 0;
        const x = padL + c * cw, y = padT + r * ch;
        const gap = 1.5, rx = 3;
        if (v <= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.beginPath(); ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, rx); ctx.fill();
        } else {
          let cellColor, alpha;
          if (v > 0.8) { cellColor = C.green; alpha = 0.85; }
          else if (v > 0.5) { cellColor = C.cyan; alpha = 0.6; }
          else if (v > 0.2) { cellColor = '#4dabf7'; alpha = 0.35; }
          else { cellColor = '#4dabf7'; alpha = 0.15; }
          ctx.globalAlpha = alpha; ctx.fillStyle = cellColor; ctx.shadowBlur = v > 0.5 ? 8 : 0; ctx.shadowColor = cellColor;
          ctx.beginPath(); ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, rx); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          if (v > 0.7) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x + gap, y + gap, cw - gap * 2, 3, rx); ctx.fill(); ctx.globalAlpha = 1; }
        }
        cells.push({ x: x + gap, y: y + gap, w: cw - gap * 2, h: ch - gap * 2, day, hour: c, val: rawVal, v });
      }
    });
    cellMapRef.current = cells;
  }, [data]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const parent = canvas.parentElement;
    function redraw() { draw(canvas, parent.clientWidth, parent.clientHeight); }
    redraw(); const ro = new ResizeObserver(redraw); ro.observe(parent); return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback((e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = cellMapRef.current.find(c => mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h);
    if (hit && hit.val > 0) {
      const hr = hit.hour;
      const ampm = hr === 0 ? '12 AM' : hr < 12 ? hr + ' AM' : hr === 12 ? '12 PM' : (hr - 12) + ' PM';
      const dateMap = dayDateMap();
      const exactDate = dateMap[hit.day];
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, day: hit.day, hour: ampm, val: hit.val, v: hit.v, exactDate });
    } else setTooltip(null);
  }, [dayDateMap]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleClick = useCallback((e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = cellMapRef.current.find(c => mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h);
    if (hit && hit.val > 0) {
      const hr = hit.hour;
      const ampm = hr === 0 ? '12 AM' : hr < 12 ? hr + ' AM' : hr === 12 ? '12 PM' : (hr - 12) + ' PM';
      const dateMap = dayDateMap();
      const exactDate = dateMap[hit.day];
      setDayModal({ day: hit.day, hour: ampm, val: hit.val, exactDate });
      setTooltip(null);
    }
  }, [dayDateMap]);

  const heatColor = v => { if (v > 0.8) return C.green; if (v > 0.5) return C.cyan; return '#4dabf7'; };

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onClick={handleClick}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />

      {tooltip && (
        <div className="hover-tooltip" style={{
          position: 'absolute', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%,-115%)',
          background: 'rgba(10,10,30,0.96)',
          border: `1px solid ${heatColor(tooltip.v)}55`,
          borderRadius: 12, padding: '10px 14px',
          boxShadow: `0 0 20px ${heatColor(tooltip.v)}33,0 8px 28px rgba(0,0,0,0.7)`,
          zIndex: 200, textAlign: 'center', minWidth: 130,
        }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{tooltip.exactDate} · {tooltip.day}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: heatColor(tooltip.v), marginBottom: 6 }}>{tooltip.hour}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: heatColor(tooltip.v) + '18', border: `1px solid ${heatColor(tooltip.v)}44`, borderRadius: 9999, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: heatColor(tooltip.v), boxShadow: `0 0 6px ${heatColor(tooltip.v)}` }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: heatColor(tooltip.v) }}>{tooltip.val} {tooltip.val === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary, marginTop: 5 }}>Click to inspect</div>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', width: 8, height: 8, background: 'rgba(10,10,30,0.96)', border: `1px solid ${heatColor(tooltip.v)}55`, borderTop: 'none', borderLeft: 'none', transform: 'translateX(-50%) rotate(45deg)' }} />
        </div>
      )}

      {dayModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDayModal(null)}>
          <div className="hover-tooltip" style={{
            position: 'relative', transform: 'none', left: 'auto', top: 'auto',
            background: 'rgba(10,10,30,0.98)', border: '1px solid rgba(0,204,255,0.3)',
            borderRadius: 18, padding: '24px 28px', minWidth: 260, maxWidth: 340,
            boxShadow: '0 0 40px rgba(0,204,255,0.15), 0 20px 60px rgba(0,0,0,0.8)',
            zIndex: 501,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{dayModal.exactDate}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary }}>{dayModal.day} · {dayModal.hour}</div>
              </div>
              <button onClick={() => setDayModal(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: C.textSecondary, cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Research Sessions', val: dayModal.val, color: C.cyan },
                { label: 'Queries', val: dayModal.val * 3, color: C.green },
                { label: 'Debates', val: Math.floor(dayModal.val * 1.2), color: C.crimson },
                { label: 'Docs Analyzed', val: Math.floor(dayModal.val * 0.8), color: C.purple },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: color + '10', borderRadius: 10, border: `1px solid ${color}22` }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary }}>{label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────
function StatCard({ icon, color, label, value, trend }) {
  return (
    <div className="card-glow" style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 20, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      <Icon name={icon} style={{ fontSize: 32, color }} />
      <div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.onSurfaceVariant, marginBottom: 4 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 700, color: "#fff" }}>{value}</span>
          {trend && trend.length > 0 && <Sparkline data={trend} color={color} />}
        </div>
      </div>
    </div>
  );
}

// ─── EVALUATION CARD ─────────────────────────────────────────
// Renders the latest eval-harness summary from GET /evals/summary. Honest
// empty state when no runs exist; every number comes from the endpoint - 
// nothing is fabricated or interpolated here.
function EvaluationCard({ summary, onReloaded }) {
  const shell = {
    background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)",
    border: "1px solid " + C.white10, borderRadius: 20, padding: 22,
    minHeight: 200, display: "flex", flexDirection: "column",
  };

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null); // {done,total}
  const [runErr, setRunErr] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("polynous_token") || "";
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };
  const base = API_BASE_URL || "http://localhost:8000";

  const runEval = async () => {
    if (running) return;
    setRunErr(""); setRunning(true); setProgress({ done: 0, total: 4 });
    try {
      const res = await fetch(`${base}/evals/run`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Could not start evaluation");
      if (data.started === false && !data.status?.running) throw new Error(data.message || "Evaluation busy");
      // Poll status until the run finishes, then reload the summary.
      const poll = setInterval(async () => {
        try {
          const sRes = await fetch(`${base}/evals/status`, { headers: authHeaders() });
          const st = await sRes.json().catch(() => ({}));
          if (st.total) setProgress({ done: st.done, total: st.total });
          if (!st.running) {
            clearInterval(poll);
            setRunning(false);
            if (st.error) setRunErr(st.error);
            const eRes = await fetch(`${base}/evals/summary`, { headers: authHeaders() });
            if (eRes.ok && onReloaded) onReloaded(await eRes.json());
          }
        } catch { /* keep polling */ }
      }, 6000);
    } catch (e) {
      setRunErr(String(e.message || e)); setRunning(false); setProgress(null);
    }
  };

  const RunButton = ({ label = "Run evaluation" }) => (
    <div style={{ textAlign: "center" }}>
      <button onClick={runEval} disabled={running} style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 9999,
        border: `1px solid ${C.green}`, background: running ? "rgba(0,255,15,0.06)" : "rgba(0,255,15,0.12)",
        color: running ? C.textSecondary : "#fff", cursor: running ? "wait" : "pointer",
        fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{running ? "hourglass_empty" : "play_arrow"}</span>
        {running ? `Running… ${progress ? `${progress.done}/${progress.total}` : ""}` : label}
      </button>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary, marginTop: 7 }}>
        {running ? "4 questions through the full pipeline · ~3-6 min" : "Runs on your own API key"}
      </div>
      {runErr && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.crimson, marginTop: 6 }}>{runErr}</div>}
    </div>
  );
  const heading = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <SvgTarget size={20} color={C.green} />
      <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
        Evaluation
      </h3>
    </div>
  );

  // loading (not yet fetched) vs explicit empty state
  if (!summary) {
    return (
      <div className="card-glow" style={shell}>
        {heading}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!summary.available) {
    return (
      <div className="card-glow" style={shell}>
        {heading}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" }}>
          <SvgTarget size={34} color="rgba(0,255,15,0.3)" />
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>
            {summary.message || "No evaluation runs yet"}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.textSecondary, maxWidth: 300, lineHeight: 1.6, marginBottom: 6 }}>
            Measures pipeline grounding, citation honesty, and confidence calibration against a fixed question set.
          </div>
          <RunButton label="Run evaluation" />
        </div>
      </div>
    );
  }

  const t = summary.totals || {};
  const tiles = [
    { label: "Grounded ratio", value: t.avg_grounded_ratio != null ? t.avg_grounded_ratio.toFixed(2) : " - ", color: C.green },
    { label: "Avg confidence", value: t.avg_computed_confidence != null ? Math.round(t.avg_computed_confidence) + "%" : " - ", color: C.cyan },
    { label: "Cite density /100w", value: t.avg_citation_density != null ? t.avg_citation_density.toFixed(1) : " - ", color: C.purple },
    { label: "Hallucinated cites", value: t.total_hallucinated_citations != null ? t.total_hallucinated_citations : " - ", color: (t.total_hallucinated_citations || 0) > 0 ? C.crimson : C.green },
  ];
  const cats = Object.entries(summary.by_category || {});

  return (
    <div className="card-glow" style={shell}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        {heading}
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary }}>
          {summary.n_questions} q · {summary.provider}{summary.n_pipeline_errors > 0 ? ` · ${summary.n_pipeline_errors} err` : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid " + C.white10, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary, marginBottom: 5 }}>{tile.label}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 21, fontWeight: 800, color: tile.color }}>{tile.value}</div>
          </div>
        ))}
      </div>

      {cats.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.12em" }}>Grounded ratio by category</div>
          {cats.map(([cat, d]) => {
            const g = d?.pipeline?.grounded_ratio;
            const pct = typeof g === "number" ? Math.round(g * 100) : 0;
            return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#cfe", width: 96, flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: C.green, borderRadius: 4 }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, width: 30, textAlign: "right" }}>{typeof g === "number" ? g.toFixed(2) : " - "}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary }}>Latest run · {summary.timestamp}</span>
        <RunButton label="Re-run" />
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const NAV = [
    { icon: "travel_explore", label: "Research", path: "/research" },
    { icon: "forum", label: "Debate Chamber", path: "/debate" },
    { icon: "account_tree", label: "Knowledge Graph", path: "/graph" },
    { icon: "search", label: "Semantic Search", path: "/search" },
    { icon: "database", label: "Memory Bank", path: "/memory" },
    { icon: "picture_as_pdf", label: "PDF Lab", path: "/pdf-lab" },
    { icon: "analytics", label: "Analytics", path: "/analytics", active: true },
    { icon: "settings", label: "Settings", path: "/settings" },
    { icon: "help", label: "Help", path: "/info" },
  ];
  const handleNav = (p) => onNavigate ? onNavigate(p) : (window.location.href = p);
  const handleLogout = () => onLogout ? onLogout() : (localStorage.clear(), window.location.href = '/');

  if (collapsed) return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100%", width: 56, background: "rgba(10,10,30,0.6)", backdropFilter: "blur(24px)", borderRight: "1px solid " + C.white10, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", zIndex: 20 }}>
      <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", color: RAINBOW[0], cursor: "pointer", marginBottom: 32 }}><Icon name="chevron_right" style={{ fontSize: 22 }} /></button>
      {NAV.map(({ icon, label, path, active }, idx) => (
        <div key={label} onClick={() => handleNav(path)} title={label} style={{ padding: "12px 0", cursor: "pointer", color: active ? RAINBOW[idx % RAINBOW.length] : C.onSurfaceVariant, width: "100%", display: "flex", justifyContent: "center" }}>
          <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
        </div>
      ))}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div onClick={() => handleNav('/research')} style={{ width: 34, height: 34, borderRadius: "50%", background: RAINBOW[3], display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="add" style={{ fontSize: 16, color: C.void }} /></div>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surfaceContainer, border: `1px solid ${RAINBOW[4]}` }}><Icon name="face" style={{ color: RAINBOW[4], fontSize: 14 }} /></div>
        <div onClick={handleLogout} style={{ cursor: "pointer", color: C.crimson }}><Icon name="logout" style={{ fontSize: 14 }} /></div>
      </div>
    </aside>
  );

  return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100%", width: 320, background: "rgba(10,10,30,0.6)", backdropFilter: "blur(24px)", borderRight: "1px solid " + C.white10, boxShadow: "0 0 20px rgba(0,255,15,0.1)", display: "flex", flexDirection: "column", padding: 24, zIndex: 20, transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/favicon.png" alt="POLYNOUS" style={{ width: 40, height: 40, borderRadius: 11, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 12px rgba(0,255,15,0.3)", border: "1px solid rgba(255,255,255,0.12)" }} />
          <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", whiteSpace: "nowrap", background: "linear-gradient(135deg,#ff2040,#ff6b35,#ffd700,#00ff0f,#00ccff,#4dabf7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 200%", animation: "rainbow-shift 6s ease infinite" }}>POLYNOUS</h1>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.7, whiteSpace: "nowrap" }}>Cerebral Vitality Engine</p>
          </div>
        </div>
        <button onClick={() => setCollapsed(true)} style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4, flexShrink: 0, marginLeft: 8 }}><Icon name="chevron_left" style={{ fontSize: 20 }} /></button>
      </div>
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
        {NAV.map(({ icon, label, path, active }, idx) => (
          <div key={label} onClick={() => handleNav(path)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 9999, cursor: "pointer", color: active ? RAINBOW[idx % RAINBOW.length] : C.onSurfaceVariant, background: active ? `${RAINBOW[idx % RAINBOW.length]}15` : "transparent", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: active ? 700 : 400, transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden" }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.color = RAINBOW[idx % RAINBOW.length]; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.color = C.onSurfaceVariant; e.currentTarget.style.background = "transparent"; } }}>
            <Icon name={icon} style={{ fontSize: 20, color: "inherit", flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </div>
        ))}
      </nav>
      <div style={{ borderTop: "1px solid " + C.white5, paddingTop: 24, marginTop: 24 }}>
        <button onClick={() => handleNav('/research')} style={{ width: "100%", padding: "12px", background: RAINBOW[3], color: C.void, fontWeight: 700, borderRadius: 9999, border: "none", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s", whiteSpace: "nowrap" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}><Icon name="add" style={{ fontSize: 18, color: C.void, flexShrink: 0 }} />New Research</button>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.surfaceContainer, border: `1px solid ${RAINBOW[4]}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="face" style={{ color: RAINBOW[4], fontSize: 22 }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username || 'Guest'}</p><button onClick={handleLogout} style={{ fontSize: 10, color: C.crimson, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", padding: 0 }}>Disconnect</button></div>
        </div>
      </div>
    </aside>
  );
}

// ─── CARD HEADING ─────────────────────────────────────────────
function CardHeading({ svgIcon, title, badge }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", display: 'flex', alignItems: 'center', gap: 10 }}>
        {svgIcon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{svgIcon}</span>}
        <span style={{ background: "linear-gradient(90deg,#fff 60%,rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</span>
      </h3>
      {badge && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, background: "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 9999 }}>{badge}</span>}
    </div>
  );
}

// ─── HOT TOPICS CARD ──────────────────────────────────────────
function TopicsCard({ topicFreq }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('count');

  const allEntries = Object.entries(topicFreq).sort((a, b) => b[1] - a[1]);

  const filteredAll = allEntries
    .filter(([k]) => !search || k.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'count' ? b[1] - a[1] : a[0].localeCompare(b[0]));

  return (
    <div className="card-glow" style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 20, padding: 22, height: 360, display: "flex", flexDirection: "column" }}>
      <CardHeading
        svgIcon={<SvgTag size={20} color={C.cyan} />}
        title="Top Topics"
        badge={Object.keys(topicFreq).length + ' found'}
      />

      {Object.keys(topicFreq).length === 0 && (
        <div style={{ color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textAlign: "center", padding: 20 }}>No topics extracted yet</div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: expanded ? 'none' : 'block' }}>
        <TopicsChart data={topicFreq} />
      </div>

      {expanded && (
        <div className="topics-expanded" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '5px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, color: '#e2e0fc',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                outline: 'none',
              }}
            />
            <button
              onClick={() => setSortBy(sortBy === 'count' ? 'alpha' : 'count')}
              style={{
                padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {sortBy === 'count' ? '# Count' : 'A→Z'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
            {filteredAll.map(([label, val], i) => {
              const color = RAINBOW[i % RAINBOW.length];
              const maxVal = allEntries[0]?.[1] || 1;
              const pct = (val / maxVal) * 100;
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#e2e0fc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color, minWidth: 20, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                </div>
              );
            })}
            {filteredAll.length === 0 && (
              <div style={{ color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textAlign: 'center', padding: 16 }}>No topics match "{search}"</div>
            )}
          </div>
        </div>
      )}

      {Object.keys(topicFreq).length > 0 && (
        <button
          onClick={() => { setExpanded(!expanded); setSearch(''); }}
          style={{
            marginTop: 10, padding: '6px 0',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, cursor: 'pointer',
            color: C.textSecondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
            transition: 'all 0.2s', width: '100%',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#e2e0fc'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = C.textSecondary; }}
        >
          {expanded ? '▲ Show Chart' : `▾ View All ${Object.keys(topicFreq).length} Topics`}
        </button>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────
export default function PolynousDashboard({ user, onNavigate, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [period, setPeriod] = useState('7D');
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [debates, setDebates] = useState([]);
  const [evalSummary, setEvalSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchAnalytics(); }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('polynous_token');
        if (!token) { console.warn('No auth token - analytics will be empty'); setLoading(false); return; }
        const base = API_BASE_URL || 'http://localhost:8000';
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const [sRes, hRes, dRes] = await Promise.all([
            fetch(`${base}/memory/stats`, { headers }),
            fetch(`${base}/memory/history`, { headers }),
            fetch(`${base}/memory/debates`, { headers }),
        ]);
        const statsData = await sRes.json();
        const historyData = await hRes.json();
        const debatesData = await dRes.json();
        setStats({ totalQueries: statsData.total_research || 0, totalDebates: statsData.total_debates || 0, avgConfidence: statsData.avg_confidence || 0, uniqueTopics: statsData.unique_topics || 0 });
        setHistory(historyData.history || []);
        setDebates(debatesData.debates || []);
        // Evaluation-harness summary - separate, non-blocking; explicit empty
        // state when no runs exist. Never fabricates numbers.
        try {
          const eRes = await fetch(`${base}/evals/summary`, { headers });
          setEvalSummary(eRes.ok ? await eRes.json() : { available: false, message: "No evaluation runs yet" });
        } catch { setEvalSummary({ available: false, message: "No evaluation runs yet" }); }
    } catch (e) {
        console.error("Dashboard error:", e);
        setError("Failed to load analytics. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const confTrend = history.map(h => h.confidence || 0).slice(-10);

  const activityData = {};
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    activityData[label] = 0;
  }
  history.forEach(h => {
    if (h.timestamp) {
      const date = new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (activityData[date] !== undefined) activityData[date]++;
    }
  });
  // Honest data only - no fabricated activity/topics. Empty history → empty
  // charts (the components show their own "no data yet" state).
  const topicFreq = {};
  history.forEach(h => {
    (h.query || '').toLowerCase().replace(/[?.,!]/g, '').split(' ')
      .filter(w => w.length > 4 && !['what', 'how', 'does', 'work', 'that', 'this', 'they', 'with', 'from', 'about', 'which', 'their'].includes(w))
      .forEach(w => { topicFreq[w] = (topicFreq[w] || 0) + 1; });
  });

  const highCount = history.filter(h => (h.confidence || 0) >= 80).length;
  const mediumCount = history.filter(h => (h.confidence || 0) >= 60 && (h.confidence || 0) < 80).length;
  const lowCount = history.filter(h => (h.confidence || 0) < 60).length;
  const confDist = useMemo(() => ({ high: highCount || 0, medium: mediumCount || 0, low: lowCount || 0 }), [highCount, mediumCount, lowCount]);

  // Real per-day-hour activity from history only - never hardcoded.
  const hourlyData = {};
  history.forEach(h => {
    if (h.timestamp) {
      const d = new Date(h.timestamp);
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      const hour = String(d.getHours());
      if (!hourlyData[day]) hourlyData[day] = {};
      hourlyData[day][hour] = (hourlyData[day][hour] || 0) + 1;
    }
  });

  const sideW = sidebarCollapsed ? 56 : 320;

  return (
    <div style={{ minHeight: "100vh", background: C.void, position: "relative", overflow: "auto" }}>
      <Styles />
      <NeuralBackground />
      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <main style={{ marginLeft: sideW, padding: "24px 32px", position: "relative", zIndex: 10, transition: "margin-left 0.35s cubic-bezier(0.4,0,0.2,1)", width: `calc(100% - ${sideW}px)`, boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Premium Anton Heading */}
            <div style={{ marginBottom: 36, animation: "fadeSlideUp 0.6s ease both" }}>
              {/* SVG icon row above heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                {/* Bar chart icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "rgba(0,204,255,0.08)",
                  border: "1px solid rgba(0,204,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 18px rgba(0,204,255,0.15)",
                }}>
                  <SvgBarChart size={22} color={C.cyan} />
                </div>
                {/* Activity pulse icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 18px rgba(168,85,247,0.15)",
                }}>
                  <SvgActivity size={20} color={C.purple} />
                </div>
                {/* Trend up icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "rgba(0,255,15,0.08)",
                  border: "1px solid rgba(0,255,15,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 18px rgba(0,255,15,0.15)",
                }}>
                  <SvgTrendUp size={20} color={C.green} />
                </div>
              </div>

              {/* Anton heading */}
              <h1 className="analytics-heading">
                Neural Analytics
              </h1>

              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "3px", marginTop: 14, textAlign: "left" }}>
                Your research intelligence, decoded.
              </p>
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: C.textSecondary }}>Your research patterns, visualized</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 9999, padding: 4 }}>
              {['7D', '30D', '90D'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`period-btn ${period === p ? 'period-btn-active' : 'period-btn-inactive'}`}>{p}</button>
              ))}
            </div>
            <button onClick={fetchAnalytics} style={{ padding: "10px 20px", borderRadius: 25, border: "none", background: C.green, color: C.void, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: 13, boxShadow: "0 0 20px rgba(0,255,15,0.2)", display: "flex", alignItems: "center", gap: 7 }}>
              <SvgRefresh size={16} color={C.void} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <SvgBarChart size={52} color={C.green} />
            </div>
            <div style={{ color: C.green, fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700 }}>Loading analytics...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: C.crimson }}>
            <p>{error}</p>
            <button onClick={fetchAnalytics} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 20, border: "none", background: C.green, color: C.void, cursor: "pointer" }}>Retry</button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
              <StatCard icon="psychology" color={C.cyan} label="Total Queries" value={stats?.totalQueries || 0} trend={confTrend} />
              <StatCard icon="forum" color={C.crimson} label="Debates" value={stats?.totalDebates || 0} />
              <StatCard icon="verified" color={C.green} label="Avg Confidence" value={(stats?.avgConfidence || 0) + '%'} trend={confTrend} />
              <StatCard icon="category" color={C.purple} label="Topics Mapped" value={stats?.uniqueTopics || 0} />
            </div>

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
              <div className="card-glow" style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 20, padding: 22, height: 360, display: "flex", flexDirection: "column" }}>
                <CardHeading
                  svgIcon={<SvgTrendUp size={20} color={C.cyan} />}
                  title="Research Activity"
                  badge={Object.values(activityData).reduce((a, b) => a + b, 0) + ' sessions'}
                />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ActivityChart data={activityData} period={period} />
                </div>
              </div>

              <TopicsCard topicFreq={topicFreq} />
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, paddingBottom: 40 }}>
              <div className="card-glow" style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 20, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
                <div style={{ width: '100%', marginBottom: 4 }}>
                  <CardHeading
                    svgIcon={<SvgTarget size={20} color={C.green} />}
                    title="Confidence"
                  />
                </div>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, marginBottom: 16, alignSelf: "flex-start" }}>Answer quality distribution</p>
                <ConfidenceRing distribution={confDist} />
              </div>

              <div className="card-glow" style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(20px)", border: "1px solid " + C.white10, borderRadius: 20, padding: 22, minHeight: 320, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><SvgMap size={20} color={C.purple} /></span>
                    <span style={{ background: "linear-gradient(90deg,#fff 60%,rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Activity Heatmap</span>
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary }}>less</span>
                    {['rgba(255,255,255,0.06)', 'rgba(77,171,247,0.3)', 'rgba(0,204,255,0.5)', 'rgba(0,255,15,0.7)'].map((bg, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />
                    ))}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary }}>more</span>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}><HeatmapChart data={hourlyData} activityData={activityData} /></div>
              </div>
            </div>

            {/* Row 3 - Evaluation harness summary (real data or empty state) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, paddingBottom: 40 }}>
              <EvaluationCard summary={evalSummary} onReloaded={setEvalSummary} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}