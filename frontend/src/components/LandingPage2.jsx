import { useState, useEffect, useRef, useCallback } from "react";

const PHOTO_SRC = ""

const C = {
  green:"#00ff0f", cyan:"#00ccff", crimson:"#ff2040", gold:"#ffd700",
  purple:"#a855f7", indigo:"#5878d4", amber:"#ffaa00", coral:"#ff6b6b",
  teal:"#00e6b8", void:"#060610", surface:"#0d0d1f", surface2:"#131326", nodeBg:"#06060f",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Hanken+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; font-size: 16px; }
  body { background-color: #060610; color: #ffffff; overflow-x: hidden; font-family: 'Hanken Grotesk', sans-serif; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: #06060f; }
  ::-webkit-scrollbar-thumb { background: rgba(0,255,15,0.2); border-radius: 2px; }

  @keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes rainbowSpin { from{filter:hue-rotate(0deg)} to{filter:hue-rotate(360deg)} }
  @keyframes shimmerGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes heartbeat   { 0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.05);filter:brightness(1.4)} }
  @keyframes heartbeatFast{0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.08);filter:brightness(1.6)} }
  @keyframes dashFlow    { from{stroke-dashoffset:0} to{stroke-dashoffset:-280} }
  @keyframes glowBreathe { 0%,100%{opacity:0.08} 50%{opacity:0.5} }
  @keyframes ripple      { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(3.5);opacity:0} }
  @keyframes shimmerBar  { 0%{width:0%} 100%{width:100%} }
  @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes fadeUp      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scanH       { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
  @keyframes orb         { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes countUp     { from{opacity:0;transform:scale(0.7) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes borderFlow  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes floatY      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes gradShift   { 0%{background-position:0% 0%} 50%{background-position:100% 100%} 100%{background-position:0% 0%} }
  @keyframes lineGrow    { from{width:0;opacity:0} to{width:100%;opacity:1} }
  @keyframes numberReveal{ from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes stepSlideIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
  @keyframes glitch      { 0%,100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)} 20%{clip-path:polygon(0 5%,100% 5%,100% 15%,0 15%)} 40%{clip-path:polygon(0 65%,100% 65%,100% 75%,0 75%)} 60%{clip-path:polygon(0 45%,100% 45%,100% 55%,0 55%)} 80%{clip-path:polygon(0 85%,100% 85%,100% 95%,0 95%)} }

  .reveal { opacity:0; transform:translateY(36px); transition:opacity 0.9s cubic-bezier(0.22,1,0.36,1),transform 0.9s cubic-bezier(0.22,1,0.36,1); will-change:opacity,transform; }
  .reveal.visible { opacity:1; transform:translateY(0); }

  .reveal-stagger > * { opacity:0; transform:translateY(24px); transition:opacity 0.75s cubic-bezier(0.22,1,0.36,1),transform 0.75s cubic-bezier(0.22,1,0.36,1); }
  .reveal-stagger.visible > *:nth-child(1)  { opacity:1;transform:translateY(0);transition-delay:0.04s }
  .reveal-stagger.visible > *:nth-child(2)  { opacity:1;transform:translateY(0);transition-delay:0.11s }
  .reveal-stagger.visible > *:nth-child(3)  { opacity:1;transform:translateY(0);transition-delay:0.18s }
  .reveal-stagger.visible > *:nth-child(4)  { opacity:1;transform:translateY(0);transition-delay:0.25s }
  .reveal-stagger.visible > *:nth-child(5)  { opacity:1;transform:translateY(0);transition-delay:0.32s }
  .reveal-stagger.visible > *:nth-child(6)  { opacity:1;transform:translateY(0);transition-delay:0.39s }
  .reveal-stagger.visible > *:nth-child(n+7){ opacity:1;transform:translateY(0);transition-delay:0.45s }

  .section-rule { width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,255,15,0.35),rgba(0,204,255,0.2),transparent);margin:0 auto 88px;transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }
  .section-rule.visible { width:50%; }

  .glass-card { background:rgba(13,13,31,0.75);backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.06);transition:all 0.5s cubic-bezier(0.23,1,0.32,1); }
  .terminal-bg { background:#05050f;border:1px solid #1c1c34; }
  .animate-pulse-dot { animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }

  .nav-link { font-family:'Hanken Grotesk',sans-serif;font-size:14px;font-weight:500;color:rgba(100,116,145,0.85);text-decoration:none;transition:color .22s;cursor:pointer;letter-spacing:0.018em; }
  .nav-link:hover { color:#00ff0f; }
  .nav-link-active { color:#00ff0f; }

  /* Feature cards - redesigned large format */
  .feat-card { transition:all 0.5s cubic-bezier(0.23,1,0.32,1);position:relative;cursor:pointer;overflow:hidden; }
  .feat-card::before { content:'';position:absolute;inset:0;opacity:0;transition:opacity 0.5s ease;z-index:0;border-radius:inherit; }
  .feat-card:hover { transform:translateY(-6px); }
  .feat-card-green::before  { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,255,15,0.1) 0%,transparent 70%); }
  .feat-card-crimson::before{ background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(255,32,64,0.1) 0%,transparent 70%); }
  .feat-card-cyan::before   { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,204,255,0.1) 0%,transparent 70%); }
  .feat-card-lime::before   { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(119,255,98,0.09) 0%,transparent 70%); }
  .feat-card-purple::before { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(168,85,247,0.1) 0%,transparent 70%); }
  .feat-card-gold::before   { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(255,215,0,0.09) 0%,transparent 70%); }
  .feat-card-amber::before  { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(255,170,0,0.1) 0%,transparent 70%); }
  .feat-card-teal::before   { background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,230,184,0.09) 0%,transparent 70%); }
  .feat-card:hover::before  { opacity:1; }
  .feat-card:hover .feat-top-line { opacity:1 !important; }
  .feat-card:hover .feat-arrow { opacity:1 !important; transform:translate(3px,-3px) !important; }

  /* Tech cards */
  .tech-card { transition:all 0.45s cubic-bezier(0.23,1,0.32,1);position:relative;overflow:hidden;cursor:default; }
  .tech-card:hover { transform:translateY(-4px); }
  .tech-card:hover .tc-glow { opacity:1 !important; }
  .tech-card:hover .tc-bar { opacity:1 !important; }

  /* Step rows */
  .step-row { transition:background 0.4s ease; }
  .step-row:hover { background:rgba(255,255,255,0.015); }
  .step-row:hover .step-accent-line { opacity:1 !important; width:100% !important; }

  .agent-btn { border:none;cursor:pointer;border-radius:14px;font-family:'Sora',sans-serif;font-weight:600;font-size:14px;transition:all 0.3s cubic-bezier(0.23,1,0.32,1);position:relative;overflow:hidden; }
  .agent-btn:hover { transform:translateY(-3px) scale(1.04); }
  .agent-btn:active { transform:scale(0.97); }

  .search-focus:focus-within { border-color:rgba(0,255,15,0.5) !important;box-shadow:0 0 0 3px rgba(0,255,15,0.07),0 4px 28px rgba(0,255,15,0.05) !important; }

  .noise-overlay { position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.022;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

  @media (max-width:1100px) {
    .features-grid { grid-template-columns:1fr 1fr !important; }
  }
  @media (max-width:900px) {
    .nav-center { display:none !important; }
    .features-grid { grid-template-columns:1fr 1fr !important; }
    .tech-3 { grid-template-columns:1fr 1fr !important; }
    .hiw-grid { grid-template-columns:1fr !important; }
    .api-grid { grid-template-columns:1fr !important; }
  }
  @media (max-width:600px) {
    .features-grid,.tech-3,.example-4 { grid-template-columns:1fr !important; }
    .search-bar { flex-direction:column;border-radius:20px !important;padding:12px !important; }
    .hero-title { font-size:clamp(3rem,14vw,5rem) !important; }
  }
`;

const NAV_SECTIONS = [
  {label:"How It Works", id:"how-it-works"},
  {label:"Features",     id:"features"},
  {label:"Pipeline",     id:"pipeline"},
  {label:"Agents",       id:"playground"},
];

const STEPS = [
  {n:"01", title:"Ask anything", body:"POLYNOUS activates its 7-agent neural mesh instantly. No waiting, no setup - just intent, translated into structured inquiry.", accent:C.green,   icon:"search"},
  {n:"02", title:"Search & synthesize", body:"Dedicated agents scan, retrieve, and distill sources with automatic citation tracking. Every fact traced to origin.", accent:C.cyan,    icon:"manage_search"},
  {n:"03", title:"Challenge & critique", body:"A dedicated Critic agent stress-tests every claim. Contradictions get flagged before they reach you - rigorous by default.", accent:C.amber,   icon:"balance"},
  {n:"04", title:"Deliver structured truth", body:"The Writer synthesizes everything into polished, cited, confidence-scored output. Not a response - a document.", accent:C.purple,  icon:"auto_stories"},
];

const FEATURES = [
  {icon:"biotech",       title:"Neural Research",     color:C.green,   cls:"feat-card-green",   dot:C.green,   route:"/research", desc:"7 specialized agents collaborate in a LangGraph pipeline - delivering cited, confidence-scored answers in real time.", tag:"RESEARCH"},
  {icon:"forum",         title:"Debate Chamber",      color:C.crimson, cls:"feat-card-crimson",  dot:C.crimson, route:"/debate",   desc:"FOR vs AGAINST agents argue opposing sides. An AI Judge evaluates evidence and declares a ruling.", tag:"DEBATE"},
  {icon:"hub",           title:"Knowledge Graph",     color:C.cyan,    cls:"feat-card-cyan",     dot:C.cyan,    route:"/graph",    desc:"Every session builds your Neo4j-powered knowledge graph, connecting topics and entities visually.", tag:"GRAPH"},
  {icon:"manage_search", title:"Semantic Search",     color:"#77ff62", cls:"feat-card-lime",     dot:"#77ff62", route:"/search",   desc:"OpenAI embeddings + Pinecone vector search find past research in milliseconds, by meaning.", tag:"SEARCH"},
  {icon:"neurology",     title:"Neural Memory Bank",  color:C.purple,  cls:"feat-card-purple",   dot:C.purple,  route:"/memory",   desc:"Track interests, visualize patterns, and discover connections as an interactive living timeline.", tag:"MEMORY"},
  {icon:"description",   title:"PDF Intelligence",    color:C.gold,    cls:"feat-card-gold",     dot:C.gold,    route:"/pdf-lab",  desc:"Upload documents, embed with AI, and query with natural language for document-grounded answers.", tag:"PDF LAB"},
  {icon:"bolt",          title:"Streaming Pipeline",  color:C.amber,   cls:"feat-card-amber",    dot:C.amber,   route:"/research", desc:"Server-Sent Events deliver real-time token streaming with live agent progress visualization.", tag:"STREAMING"},
  {icon:"verified_user", title:"API Key Vault",       color:C.teal,    cls:"feat-card-teal",     dot:C.teal,    route:"/settings", desc:"Bring your own Anthropic, OpenAI, or Tavily keys. Fernet-encrypted. Zero-knowledge architecture.", tag:"VAULT"},
];

const TECH = [
  {icon:"bolt",          title:"Streaming Architecture", color:C.green,   desc:"Server-Sent Events deliver real-time token streaming with agent progress visualization."},
  {icon:"extension",     title:"Modular Agent Design",   color:C.purple,  desc:"LangGraph state machine orchestrates specialized agents with clear, auditable responsibilities."},
  {icon:"database",      title:"Persistent Memory",      color:C.cyan,    desc:"Neo4j graph database stores sessions while Pinecone enables semantic vector search at scale."},
  {icon:"token",         title:"Production Ready",       color:C.crimson, desc:"Docker containerization, rate limiting, and CORS support. Deploy anywhere with confidence."},
  {icon:"api",           title:"API-First Design",       color:C.amber,   desc:"FastAPI backend with automatic OpenAPI docs. Every single feature is exposed via clean REST endpoints."},
  {icon:"verified_user", title:"Self-Critiquing",        color:C.gold,    desc:"Built-in contradiction detection catches inconsistencies between diverse data sources automatically."},
];

const EXAMPLES = [
  {title:"How does CRISPR work?",            meta:"Research · 92% confidence",   route:"/research?query=CRISPR"},
  {title:"Should we colonize Mars?",         meta:"Debate · FOR wins 7.5/10",    route:"/debate?query=Mars+colonization"},
  {title:"AI regulation global impact",      meta:"Knowledge Graph · 15 nodes",  route:"/graph?query=AI+regulation"},
  {title:"Quantum computing breakthroughs",  meta:"Semantic Search · 8 matches", route:"/search?query=Quantum+computing"},
];

const RESEARCH_NODES = [
  {id:"search",    name:"SEARCH",    emoji:" ",color:C.cyan,  tag:"AG-01"},
  {id:"summarise", name:"SUMMARISE", emoji:"📄",color:C.indigo,tag:"AG-02"},
  {id:"critic",    name:"CRITIC",    emoji:"⚖️",color:C.amber, tag:"AG-03"},
  {id:"writer",    name:"WRITER",    emoji:"✍️",color:C.purple,tag:"AG-04"},
];

const DIALECTIC_NODES = [
  {id:"d-search",name:"SEARCH", emoji:" ",color:C.cyan,   tag:"DX-01",x:75, y:240},
  {id:"for",     name:"FOR",    emoji:"✅",color:C.green,  tag:"DX-02",x:270,y:100},
  {id:"against", name:"AGAINST",emoji:"❌",color:C.crimson,tag:"DX-03",x:270,y:380},
  {id:"judge",   name:"JUDGE",  emoji:"👨‍⚖️",color:C.gold,   tag:"DX-04",x:460,y:240,isJudge:true},
];

const PLAYGROUND_AGENTS = [
  {id:"search",   name:"SEARCH",   emoji:" ",color:"#00ccff",desc:"I scan knowledge bases and the web to pull raw, unfiltered data on any topic."},
  {id:"summarise",name:"SUMMARISE",emoji:"📄",color:"#5878d4",desc:"I distill walls of text into crisp, structured summaries without losing nuance."},
  {id:"for",      name:"FOR",      emoji:"✅",color:"#00ff0f",desc:"My job is to build the strongest possible case in favour of the proposition."},
  {id:"against",  name:"AGAINST",  emoji:"❌",color:"#ff2040",desc:"I stress-test every argument and poke holes in assumptions. Nothing slips past me."},
  {id:"critic",   name:"CRITIC",   emoji:"⚖️",color:"#ffaa00",desc:"I cross-examine both sides and flag logical fallacies or citation gaps."},
  {id:"writer",   name:"WRITER",   emoji:"✍️",color:"#a855f7",desc:"I synthesize everything into polished, publication-ready prose with citations."},
  {id:"judge",    name:"JUDGE",    emoji:"👨‍⚖️",color:"#ffd700",desc:"Final verdict. I weigh all evidence, assign confidence scores, and deliver the ruling."},
];

const AGENT_QUIPS = {
  search:   ["Scanning 14,000 nodes… hit!","Cross-referencing semantic vectors…","Found 847 relevant chunks - filtering top 12.","Knowledge graph query complete."],
  summarise:["Compressing 4,200 tokens → 180…","Key entities extracted: 6.","Distillation confidence: 94%.","Summary locked and staged."],
  for:      ["Building affirmative case…","3 strong premises identified.","Constructing syllogism chain…","Case FOR filed - bulletproof."],
  against:  ["Stress-testing every premise…","Identified 2 logical gaps!","Counter-evidence ratio: 67%.","Opposition case finalized."],
  critic:   ["Running fallacy detection…","Ad hominem: 0. Straw man: 1. Flagged.","Source reliability score: 88/100.","Critical review complete."],
  writer:   ["Stitching narrative threads…","Prose coherence index: 97%.","Applying citation layer…","Draft ready for judgment."],
  judge:    ["Weighing all arguments…","Confidence score: 91%.","Ruling: Affirmative wins by evidence margin.","Session archived to Knowledge Graph."],
};

function useReveal(threshold=0.13) {
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add("visible");obs.unobserve(el);}},{threshold});
    obs.observe(el);
    return()=>obs.disconnect();
  },[threshold]);
  return ref;
}

/* ── NeuralCanvas ─────────────────────────────────────────────────────────── */
function NeuralCanvas() {
  const canvasRef=useRef(null);
  const stateRef=useRef({particles:[],mouse:{x:null,y:null},raf:null});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d"),state=stateRef.current;
    class Particle {
      constructor(){this.reset();this.x=Math.random()*canvas.width;this.y=Math.random()*canvas.height;this.baseX=this.x;this.baseY=this.y;}
      reset(){this.baseX=Math.random()*canvas.width;this.baseY=Math.random()*canvas.height;this.x=this.baseX;this.y=this.baseY;this.size=Math.random()*1.6+0.3;const r=Math.random();this.color=r<0.5?C.green:r<0.8?C.cyan:C.purple;this.vx=0;this.vy=0;}
      draw(){ctx.fillStyle=this.color;ctx.globalAlpha=0.55;ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      update(){const{x:mx,y:my}=state.mouse;if(mx!==null){const dx=mx-this.x,dy=my-this.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<150){const force=(150-dist)/150;this.vx-=(dx/dist)*force*1.4;this.vy-=(dy/dist)*force*1.4;}}this.vx+=(this.baseX-this.x)*0.008;this.vy+=(this.baseY-this.y)*0.008;this.vx*=0.93;this.vy*=0.93;this.x+=this.vx;this.y+=this.vy;}
    }
    function init(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;state.particles=Array.from({length:180},()=>new Particle());}
    function drawConnections(){const ps=state.particles;for(let i=0;i<ps.length;i++){for(let j=i+1;j<ps.length;j++){const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<85){ctx.strokeStyle=ps[i].color;ctx.globalAlpha=(85-d)/85*0.055;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.stroke();ctx.globalAlpha=1;}}}}
    function loop(){ctx.clearRect(0,0,canvas.width,canvas.height);drawConnections();state.particles.forEach(p=>{p.draw();p.update();});state.raf=requestAnimationFrame(loop);}
    const onResize=()=>init();
    const onMouseMove=e=>{state.mouse.x=e.clientX;state.mouse.y=e.clientY;};
    window.addEventListener("resize",onResize);window.addEventListener("mousemove",onMouseMove);
    init();loop();
    return()=>{window.removeEventListener("resize",onResize);window.removeEventListener("mousemove",onMouseMove);cancelAnimationFrame(state.raf);};
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:-1,pointerEvents:"none"}}/>;
}

/* ── Pipeline internals ───────────────────────────────────────────────────── */
function PipelineParticle({path,color,delay,duration=1800}){
  const ref=useRef(null);
  useEffect(()=>{
    let raf,start=null;
    function cubic(t,p0,p1,p2,p3){const u=1-t;return u*u*u*p0+3*u*u*t*p1+3*u*t*t*p2+t*t*t*p3;}
    function animate(ts){if(!start)start=ts-delay;const t=((ts-start)%duration)/duration;if(ref.current){ref.current.setAttribute("cx",cubic(t,path.x0,path.cx1,path.cx2,path.x1));ref.current.setAttribute("cy",cubic(t,path.y0,path.cy1,path.cy2,path.y1));ref.current.setAttribute("r",Math.max(5-t*3,1));ref.current.setAttribute("opacity",1-t);}raf=requestAnimationFrame(animate);}
    raf=requestAnimationFrame(animate);
    return()=>cancelAnimationFrame(raf);
  },[path,delay,duration]);
  return <circle ref={ref} cx={path.x0} cy={path.y0} r={5} fill={color} style={{filter:`drop-shadow(0 0 4px ${color})`}}/>;
}

function Conn({d,color,isActive}){
  return(
    <g style={{opacity:isActive?1:0.12,transition:"opacity 0.6s ease"}}>
      <path d={d} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" style={{opacity:0.08,filter:"blur(8px)",animation:isActive?"glowBreathe 2.5s ease-in-out infinite":"none"}}/>
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" style={{opacity:0.75}}/>
      <path d={d} fill="none" stroke="#fff"  strokeWidth={1.5} strokeLinecap="round" strokeDasharray="9 5" style={{opacity:0.8,animation:isActive?"dashFlow 1.5s linear infinite":"dashFlow 4s linear infinite"}}/>
    </g>
  );
}

function AgentNode({data,isActive,isCompleted}){
  const size=data.isJudge?148:126,color=data.color;
  const[burst,setBurst]=useState(false);
  const prev=useRef(false);
  useEffect(()=>{if(isCompleted&&!prev.current){setBurst(true);const t=setTimeout(()=>setBurst(false),800);prev.current=true;return()=>clearTimeout(t);}if(!isCompleted)prev.current=false;},[isCompleted]);
  return(
    <div style={{width:`${size}px`,height:`${size}px`,minWidth:`${size}px`,borderRadius:"22px",background:C.nodeBg,border:`${data.isJudge?"2.5px":"1.8px"} solid ${color}${isActive?"cc":isCompleted?"88":"38"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.5s cubic-bezier(0.4,0,0.2,1)",opacity:isActive?1:isCompleted?0.85:0.32,boxShadow:isActive?`0 0 14px ${color}44,0 0 36px ${color}55,0 0 80px ${color}1a`:isCompleted?`0 0 10px ${color}2a,0 0 24px ${color}33`:"none",animation:isActive?"heartbeatFast 1.1s ease-in-out infinite":isCompleted?"heartbeat 3s ease-in-out infinite":"none",overflow:"visible"}}>
      <div style={{position:"absolute",inset:0,borderRadius:"22px",background:`radial-gradient(circle at center,${color}14 0%,transparent 68%)`,pointerEvents:"none"}}/>
      {burst&&<div style={{position:"absolute",width:`${size}px`,height:`${size}px`,borderRadius:"22px",border:`2px solid ${color}`,animation:"ripple 0.7s ease-out forwards",pointerEvents:"none",top:0,left:0}}/>}
      <span style={{fontSize:"27px",marginBottom:"6px",zIndex:1}}>{data.emoji}</span>
      <span style={{fontFamily:"Sora,sans-serif",fontWeight:600,fontSize:"11px",color,letterSpacing:"0.07em",zIndex:1,textAlign:"center",padding:"0 6px"}}>{data.name}</span>
      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:"#fff",opacity:0.25,marginTop:"3px",zIndex:1}}>#{data.tag}</span>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"4px",borderRadius:"0 0 20px 20px",background:`${color}18`,overflow:"hidden"}}>
        <div style={{height:"100%",background:color,borderRadius:"0 0 20px 20px",width:isCompleted?"100%":"0%",animation:isActive?"shimmerBar 2.5s linear forwards":"none",transition:"width 0.4s ease"}}/>
      </div>
      {isActive&&!isCompleted&&<div style={{position:"absolute",top:"10px",right:"10px",width:"14px",height:"14px",border:`2px solid ${color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.85s linear infinite",zIndex:2}}/>}
      {isCompleted&&<div style={{position:"absolute",top:"10px",right:"10px",width:"16px",height:"16px",background:color,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
    </div>
  );
}

function NeuralPipeline(){
  const[step,setStep]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setStep(s=>(s+1)%8),2600);return()=>clearInterval(id);},[]);
  const isActive=useCallback((id)=>{const m={search:0,summarise:1,critic:2,writer:3,"d-search":4,for:5,against:5,judge:6};return m[id]===step;},[step]);
  const isDone=useCallback((id)=>{const m={search:0,summarise:1,critic:2,writer:3,"d-search":4,for:5,against:5,judge:6};return m[id]<step;},[step]);
  const rLA=(i)=>step===i||step===i+1;
  const dLA=(min)=>step>=min;
  const NW=126,GAP=50,BX=60;
  const rP=[0,1,2].map(i=>({x0:BX+i*(NW+GAP)+NW,cx1:BX+i*(NW+GAP)+NW+28,cx2:BX+(i+1)*(NW+GAP)-28,x1:BX+(i+1)*(NW+GAP),y0:195,cy1:195,cy2:195,y1:195}));
  const dP=[{x0:75,y0:240,cx1:160,cy1:240,cx2:190,cy2:100,x1:270,y1:100},{x0:75,y0:240,cx1:160,cy1:240,cx2:190,cy2:380,x1:270,y1:380},{x0:270,y0:100,cx1:350,cy1:100,cx2:395,cy2:240,x1:455,y1:240},{x0:270,y0:380,cx1:350,cy1:380,cx2:395,cy2:240,x1:455,y1:240}];
  return(
    <div style={{width:"100%",minHeight:"620px",display:"flex",alignItems:"stretch",position:"relative"}}>
      <div style={{flex:1,padding:"44px 28px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{marginBottom:"32px",textAlign:"center"}}>
          <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.green,letterSpacing:"0.16em",margin:0}}>    RESEARCH PIPELINE</p>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:"#fff",opacity:0.28,margin:"5px 0 0",letterSpacing:"0.1em"}}>SEQUENTIAL SYNTHESIS ARCHITECTURE</p>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",width:"100%"}}>
          <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible"}} viewBox="0 0 700 390" preserveAspectRatio="xMidYMid meet">
            {[0,1,2].map(i=>{const x1=BX+i*(NW+GAP)+NW,x2=BX+(i+1)*(NW+GAP);return <Conn key={i} d={`M ${x1},195 L ${x2},195`} color={RESEARCH_NODES[i].color} isActive={rLA(i)}/>;}) }
            {[0,1,2].map(i=>rLA(i)&&[0,420,840,1260].map((d,j)=><PipelineParticle key={`rp${i}-${j}`} path={rP[i]} color={RESEARCH_NODES[i].color} delay={d} duration={1650}/>))}
          </svg>
          <div style={{display:"flex",gap:`${GAP}px`,alignItems:"center",position:"relative",zIndex:10}}>
            {RESEARCH_NODES.map(n=><AgentNode key={n.id} data={n} isActive={isActive(n.id)} isCompleted={isDone(n.id)}/>)}
          </div>
        </div>
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"#fff",opacity:0.25,marginTop:"24px",textAlign:"center",lineHeight:1.65}}>Linear multi-agent processing for structured<br/>data extraction and contextual summarization.</p>
      </div>
      <div style={{width:"1px",alignSelf:"stretch",background:"linear-gradient(to bottom,transparent,#00ff0f 30%,#ff2040 70%,transparent)",boxShadow:"0 0 20px #00ff0f44,0 0 20px #ff204044",flexShrink:0}}/>
      <div style={{flex:1,padding:"44px 28px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{marginBottom:"32px",textAlign:"center"}}>
          <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.crimson,letterSpacing:"0.16em",margin:0}}>⚖️ DIALECTIC FORK</p>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:"#fff",opacity:0.28,margin:"5px 0 0",letterSpacing:"0.1em"}}>ADVERSARIAL REASONING TOPOLOGY</p>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",width:"100%"}}>
          <svg width="540" height="480" viewBox="0 0 540 480" style={{overflow:"visible"}}>
            <Conn d="M 75,240 C 160,240 190,100 270,100"  color={C.green}   isActive={dLA(4)}/>
            <Conn d="M 75,240 C 160,240 190,380 270,380"  color={C.crimson} isActive={dLA(4)}/>
            <Conn d="M 270,100 C 350,100 395,240 455,240" color={C.green}   isActive={dLA(5)}/>
            <Conn d="M 270,380 C 350,380 395,240 455,240" color={C.crimson} isActive={dLA(5)}/>
            {dLA(4)&&[0,1].map(li=>[0,460,920,1380].map((d,j)=><PipelineParticle key={`dp${li}-${j}`} path={dP[li]} color={li===0?C.green:C.crimson} delay={d} duration={1850}/>))}
            {dLA(5)&&[2,3].map(li=>[0,460,920,1380].map((d,j)=><PipelineParticle key={`dp${li}-${j}`} path={dP[li]} color={li===2?C.green:C.crimson} delay={d} duration={1850}/>))}
            {DIALECTIC_NODES.map(n=>{const s=n.isJudge?148:126;return <foreignObject key={n.id} x={n.x-s/2} y={n.y-s/2} width={s} height={s} style={{overflow:"visible"}}><AgentNode data={n} isActive={isActive(n.id)} isCompleted={isDone(n.id)}/></foreignObject>;})}
          </svg>
        </div>
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"#fff",opacity:0.25,marginTop:"24px",textAlign:"center",lineHeight:1.65}}>Adversarial evaluation where multiple perspectives<br/>are stress-tested for factual consistency.</p>
      </div>
      <div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)",fontFamily:"JetBrains Mono,monospace",fontSize:"8px",color:"#fff",opacity:0.12,letterSpacing:"0.2em",whiteSpace:"nowrap",pointerEvents:"none",zIndex:20}}>POLYNOUS NEURAL ENGINE • AUTONOMOUS MULTI-AGENT MESH</div>
    </div>
  );
}

function SectionDivider(){
  const ref=useReveal(0.3);
  return <div ref={ref} className="section-rule reveal"/>;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
function Header(){
  const[activeIdx,setActiveIdx]=useState(-1);
  const[scrolled,setScrolled]=useState(false);
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>40);window.addEventListener("scroll",fn);return()=>window.removeEventListener("scroll",fn);},[]);
  const go=(id,i)=>{setActiveIdx(i);document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});};
  return(
    <header style={{display:"flex",justifyContent:"center",width:"100%",height:"64px",position:"sticky",top:0,zIndex:50,background:scrolled?"rgba(6,6,16,0.92)":"rgba(6,6,16,0.6)",backdropFilter:"blur(24px)",borderBottom:`1px solid ${scrolled?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.02)"}`,transition:"background 0.4s ease,border-color 0.4s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",width:"100%",maxWidth:"1400px",padding:"0 32px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}} onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>
          <div style={{width:"28px",height:"28px",borderRadius:"8px",background:`linear-gradient(135deg,${C.green}20,${C.cyan}15)`,border:`1px solid ${C.green}40`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:"10px",height:"10px",borderRadius:"3px",background:`linear-gradient(135deg,${C.green},${C.cyan})`,boxShadow:`0 0 8px ${C.green}80`}}/>
          </div>
          <span style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"16px",color:"#fff",letterSpacing:"0.06em"}}>POLYNOUS</span>
        </div>
        <nav className="nav-center" style={{display:"flex",alignItems:"center",gap:"34px"}}>
          {NAV_SECTIONS.map(({label,id},i)=>(
            <span key={label} onClick={()=>go(id,i)} className={`nav-link${activeIdx===i?" nav-link-active":""}`}>{label}</span>
          ))}
        </nav>
        <div style={{justifySelf:"end",display:"flex",alignItems:"center",gap:"10px"}}>
          {/* ✅ FIX 1: Sign In → Auth Page */}
          <button 
            onClick={() => window.location.href = '/auth'}
            style={{padding:"7px 18px",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"9999px",background:"transparent",color:"rgba(255,255,255,0.45)",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",fontWeight:500,cursor:"pointer",transition:"all 0.25s",letterSpacing:"0.01em"}} 
            onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(0,204,255,0.35)";e.currentTarget.style.color=C.cyan;}} 
            onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.45)";}}
          >
            Sign In
          </button>
          {/* ✅ FIX 2: Get Started → Auth Page */}
          <button 
            onClick={() => window.location.href = '/auth'}
            style={{padding:"7px 20px",background:`linear-gradient(135deg,${C.green},#19e81f)`,border:"none",borderRadius:"9999px",color:C.void,fontFamily:"Sora,sans-serif",fontSize:"14px",fontWeight:800,cursor:"pointer",transition:"all 0.25s",boxShadow:`0 0 20px rgba(0,255,15,0.25),0 2px 8px rgba(0,255,15,0.15)`,letterSpacing:"0.02em"}} 
            onMouseOver={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow=`0 0 32px rgba(0,255,15,0.4),0 4px 16px rgba(0,255,15,0.2)`;}} 
            onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 0 20px rgba(0,255,15,0.25),0 2px 8px rgba(0,255,15,0.15)`;}}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
function HeroSection(){
  const[query,setQuery]=useState("");
  const[focused,setFocused]=useState(false);
  const go=(v=query)=>{const q=v.trim();window.location.href=q?`/research?query=${encodeURIComponent(q)}`:"/research";};
  const QEXS=["Quantum computing breakthroughs","CRISPR ethics in medicine","AI regulation global impact","Fusion energy viability"];
  return(
    <section id="hero" style={{minHeight:"calc(100vh - 64px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"64px 24px 80px",position:"relative"}}>
      <div style={{position:"absolute",top:"12%",left:"5%",width:"480px",height:"480px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,15,0.05) 0%,transparent 68%)",animation:"orb 14s ease-in-out infinite",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"18%",right:"4%",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,204,255,0.04) 0%,transparent 68%)",animation:"orb 17s ease-in-out infinite reverse",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"38%",right:"12%",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.035) 0%,transparent 68%)",animation:"orb 11s ease-in-out infinite 2s",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,255,15,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,15,0.018) 1px,transparent 1px)",backgroundSize:"80px 80px",pointerEvents:"none",maskImage:"radial-gradient(ellipse 80% 70% at 50% 50%,black 30%,transparent 100%)"}}/>

      {/* Title - no live badge */}
      <h1 className="reveal hero-title" ref={useReveal(0.05)} style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(4rem,10.5vw,10rem)",lineHeight:0.86,letterSpacing:"-0.065em",marginBottom:"24px"}}>
        <span style={{background:"linear-gradient(165deg,#ffffff 20%,rgba(0,255,15,0.8) 52%,rgba(0,204,255,0.65) 82%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 40px rgba(0,255,15,0.12))"}}>Research</span>
        <br/>
        <span style={{background:"linear-gradient(165deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0.16) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>beyond answers.</span>
      </h1>

      <p className="reveal" ref={useReveal(0.05)} style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"clamp(16px,1.9vw,20px)",color:"rgba(130,148,168,0.88)",maxWidth:"580px",lineHeight:1.75,marginBottom:"48px",fontWeight:400,transitionDelay:"0.14s"}}>
        Seven specialized AI agents that search, analyze, debate, and synthesize - delivering comprehensive research, not just responses.
      </p>

      <div className="reveal search-bar search-focus" ref={useReveal(0.05)} style={{width:"min(760px,100%)",marginBottom:"18px",display:"flex",alignItems:"center",gap:"10px",padding:"7px",borderRadius:"9999px",background:"rgba(10,10,22,0.8)",border:`1px solid ${focused?"rgba(0,255,15,0.35)":"rgba(255,255,255,0.06)"}`,transitionDelay:"0.2s",transition:"border-color 0.25s,box-shadow 0.25s",backdropFilter:"blur(20px)"}}>
        <span style={{fontFamily:"Material Symbols Outlined",fontSize:"19px",color:"rgba(255,255,255,0.18)",padding:"0 4px 0 16px",flexShrink:0}}>search</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="What do you want to research?" style={{flex:1,height:"50px",padding:"0 8px",background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",fontWeight:400}}/>
        <button onClick={()=>go()} style={{height:"50px",padding:"0 26px",borderRadius:"9999px",border:"none",background:`linear-gradient(135deg,${C.green},#19e81f)`,color:C.void,cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"14px",fontWeight:800,flexShrink:0,transition:"all 0.22s",letterSpacing:"0.04em",boxShadow:`0 0 20px rgba(0,255,15,0.3)`}} onMouseOver={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow=`0 0 32px rgba(0,255,15,0.5)`;}} onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 0 20px rgba(0,255,15,0.3)`;}}>Research →</button>
      </div>

      <div className="reveal" ref={useReveal(0.05)} style={{display:"flex",flexWrap:"wrap",justifyContent:"center",marginBottom:"44px",transitionDelay:"0.25s"}}>
        {QEXS.map((ex,i)=>(
          <button key={ex} onClick={()=>go(ex)} style={{background:"transparent",border:"none",color:"rgba(100,118,150,0.65)",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:"11px",padding:"0 2px",transition:"color 0.2s",letterSpacing:"0.01em"}} onMouseOver={e=>e.currentTarget.style.color=C.cyan} onMouseOut={e=>e.currentTarget.style.color="rgba(100,118,150,0.65)"}>
            {ex}{i<QEXS.length-1&&<span style={{color:"rgba(35,45,65,0.9)",padding:"0 10px"}}>·</span>}
          </button>
        ))}
      </div>

      <div className="reveal" ref={useReveal(0.05)} style={{display:"flex",flexWrap:"wrap",gap:"12px",justifyContent:"center",marginBottom:"72px",transitionDelay:"0.3s"}}>
        <div style={{padding:"2px",borderRadius:"9999px",background:"conic-gradient(from 0deg,#ff0000,#ff8800,#ffff00,#00ff0f,#00ccff,#a855f7,#ff0088,#ff0000)",animation:"rainbowSpin 4s linear infinite",boxShadow:"0 0 32px rgba(0,255,15,0.15),0 0 64px rgba(0,204,255,0.08)"}}>
          <button onClick={()=>go()} style={{padding:"13px 32px",background:"rgba(6,6,16,0.95)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"16px",fontWeight:800,color:"#fff",backdropFilter:"blur(20px)",letterSpacing:"-0.01em",transition:"transform 0.25s ease,background 0.25s ease"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.background="rgba(6,6,16,0.85)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background="rgba(6,6,16,0.95)";}}>
            Start Research →
          </button>
        </div>
        <a href="#how-it-works" style={{padding:"12px 28px",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.55)",fontWeight:600,borderRadius:"9999px",background:"transparent",fontFamily:"Sora,sans-serif",fontSize:"16px",textDecoration:"none",transition:"all 0.25s",display:"inline-flex",alignItems:"center"}} onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(0,204,255,0.35)";e.currentTarget.style.color=C.cyan;}} onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}>
          See How It Works ↓
        </a>
      </div>

      <div className="reveal terminal-bg" ref={useReveal(0.1)} style={{padding:"22px 26px",borderRadius:"16px",width:"100%",maxWidth:"420px",textAlign:"left",transitionDelay:"0.38s",position:"relative",overflow:"hidden",boxShadow:`0 24px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04)`}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${C.green}50,transparent)`}}/>
        <div style={{position:"absolute",top:"10%",left:0,right:0,height:"1px",background:"rgba(0,255,15,0.03)",animation:"scanH 5s linear infinite"}}/>
        <div style={{display:"flex",gap:"7px",marginBottom:"14px"}}>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.crimson,opacity:0.7}}/>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.gold,opacity:0.7}}/>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.green,opacity:0.7}}/>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(255,255,255,0.18)",marginLeft:"10px",lineHeight:"10px"}}>polynous - neural-mesh</span>
        </div>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"13px",color:C.green}}><span style={{color:"rgba(100,118,170,0.5)"}}>$ </span>npm run polynous</div>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"12px",color:"rgba(130,148,170,0.5)",marginTop:"10px",lineHeight:2}}>
          &gt; Initializing Neural Mesh...<br/>&gt; Connecting 7 Sub-Agents...<span style={{color:C.green,opacity:0.75}}> ✓</span><br/>&gt; Logic Lab: Online <span style={{color:C.green}}>[Ready]</span><br/>&gt; <span style={{color:C.cyan}}>Synaptic Bridge established.</span>
        </div>
      </div>

      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(255,255,255,0.15)",lineHeight:1.8,marginTop:"26px",letterSpacing:"0.09em"}}>
        7 specialized agents · Real-time web search · Cited & verified · Confidence scored · BYOK
      </p>
    </section>
  );
}

/* ── How It Works ─────────────────────────────────────────────────────────── */
function HowItWorksSection(){
  const headRef=useReveal(0.1);
  return(
    <section id="how-it-works" style={{padding:"112px 0 96px"}}>
      <SectionDivider/>
      <div ref={headRef} className="reveal" style={{marginBottom:"80px"}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"16px",textTransform:"uppercase",opacity:0.8}}>↓ Process</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end"}} className="hiw-grid">
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.6rem,5.5vw,4.8rem)",lineHeight:0.9,letterSpacing:"-0.055em",color:"#fff",margin:0}}>How it<br/>works</h2>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px"}}>A quiet sequence of agents. Ask, gather, challenge, synthesize. Each step leaves a trace.</p>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column"}}>
        {STEPS.map((s,idx)=>{
          const ref=useReveal(0.1);
          return(
            <div key={s.n} ref={ref} className="reveal step-row" style={{transitionDelay:`${idx*0.09}s`,position:"relative",padding:"0"}}>
              <div style={{height:"1px",background:"rgba(255,255,255,0.04)",marginBottom:"0"}}/>
              <div className="step-accent-line" style={{height:"1px",background:`linear-gradient(90deg,${s.accent}70,${s.accent}20,transparent)`,opacity:0,width:"0%",transition:"opacity 0.4s ease, width 0.6s cubic-bezier(0.22,1,0.36,1)",marginTop:"-1px"}}/>
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr",gap:"40px",alignItems:"center",padding:"52px 0"}} className="step-inner">
                <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
                  <div style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(4.5rem,7vw,7.5rem)",lineHeight:0.85,letterSpacing:"-0.06em",background:`linear-gradient(180deg,${s.accent}40 0%,${s.accent}06 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",userSelect:"none",pointerEvents:"none",animation:`numberReveal 0.6s ${idx*0.1}s ease both`}}>{s.n}</div>
                  {idx<STEPS.length-1&&<div style={{position:"absolute",bottom:"-52px",left:"28px",width:"1px",height:"52px",background:`linear-gradient(to bottom,${s.accent}50,transparent)`,pointerEvents:"none"}}/>}
                </div>
                <div style={{paddingLeft:"8px"}}>
                  <div style={{display:"inline-flex",alignItems:"center",gap:"8px",marginBottom:"16px",padding:"4px 10px",borderRadius:"6px",background:`${s.accent}0a`,border:`1px solid ${s.accent}20`}}>
                    <span style={{fontFamily:"Material Symbols Outlined",fontSize:"13px",color:s.accent}}>{s.icon}</span>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:s.accent,letterSpacing:"0.14em",opacity:0.9}}>STEP {s.n}</span>
                  </div>
                  <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"clamp(1.45rem,2.4vw,2rem)",color:"#fff",lineHeight:1.1,letterSpacing:"-0.03em",margin:0}}>{s.title}</h3>
                </div>
                <div style={{position:"relative",paddingLeft:"28px"}}>
                  <div style={{position:"absolute",left:0,top:"4px",bottom:"4px",width:"2px",borderRadius:"2px",background:`linear-gradient(to bottom,${s.accent}60,${s.accent}10)`}}/>
                  <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.78)",lineHeight:1.75,margin:0}}>{s.body}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{height:"1px",background:"rgba(255,255,255,0.04)"}}/>
      </div>
    </section>
  );
}

/* ── BYOK API Section ─────────────────────────────────────────────────────── */
function ApiSection(){
  const ref=useReveal(0.12);
  return(
    <section style={{padding:"64px 0"}}>
      <SectionDivider/>
      <div ref={ref} className="reveal" style={{borderRadius:"28px",padding:"2px",background:"linear-gradient(135deg,rgba(0,255,15,0.18),rgba(0,204,255,0.09),rgba(168,85,247,0.12),rgba(0,255,15,0.04))",position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,0.4)"}}>
        <div style={{borderRadius:"27px",padding:"52px",background:"rgba(8,8,20,0.97)",backdropFilter:"blur(28px)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"56px",alignItems:"center"}} className="api-grid">
            <div>
              <span style={{display:"inline-block",padding:"4px 14px",borderRadius:"9999px",background:`linear-gradient(135deg,${C.green},#19e81f)`,color:C.void,fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"10px",letterSpacing:"0.14em",marginBottom:"22px"}}>BYOK - BRING YOUR OWN INTELLIGENCE</span>
              <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,3.4vw,2.7rem)",marginBottom:"16px",lineHeight:1.08,letterSpacing:"-0.04em",color:"#fff"}}>Total model<br/><span style={{color:C.green}}>sovereignty.</span></h2>
              <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,marginBottom:"28px"}}>Model-agnostic by design. Connect your preferred LLMs or run private local instances with zero lock-in.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"28px"}}>
                {[{label:"OpenAI (GPT-4o)",color:C.green},{label:"Anthropic (Claude)",color:C.cyan},{label:"Ollama (Llama 3)",color:C.crimson}].map(({label,color})=>(
                  <div key={label} style={{padding:"6px 14px",borderRadius:"9999px",display:"flex",alignItems:"center",gap:"8px",background:`${color}08`,border:`1px solid ${color}22`}}>
                    <div className="animate-pulse-dot" style={{width:"5px",height:"5px",borderRadius:"50%",background:color}}/>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"12px",color}}>{label}</span>
                  </div>
                ))}
              </div>
              {/* ✅ FIX 3: Configure API Mesh → Settings Page */}
              <button 
                onClick={() => window.location.href = '/settings'}
                style={{padding:"13px 26px",background:"#fff",color:C.void,fontWeight:800,borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"14px",display:"inline-flex",alignItems:"center",gap:"8px",transition:"all 0.25s",letterSpacing:"0.02em"}} 
                onMouseOver={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.boxShadow="0 0 32px rgba(255,255,255,0.18)";}} 
                onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}
              >
                <span style={{fontFamily:"Material Symbols Outlined",fontSize:"17px"}}>key</span> Configure API Mesh
              </button>
            </div>
            <div className="terminal-bg" style={{padding:"28px",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.05)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${C.cyan}45,transparent)`}}/>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:"12px"}}>
                <span style={{fontFamily:"Material Symbols Outlined",color:C.green,fontSize:"17px"}}>settings_input_component</span>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"13px",color:"rgba(255,255,255,0.5)"}}>mesh_config.yaml</span>
              </div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"12px",lineHeight:2.2}}>
                <p style={{color:C.cyan}}>agents:</p>
                <p style={{paddingLeft:"16px",color:"rgba(255,255,255,0.65)"}}>research_lead: <span style={{color:C.green}}>"anthropic/claude-3-5-sonnet"</span></p>
                <p style={{paddingLeft:"16px",color:"rgba(255,255,255,0.65)"}}>dialectic_judge: <span style={{color:C.green}}>"openai/gpt-4o"</span></p>
                <p style={{paddingLeft:"16px",color:"rgba(255,255,255,0.65)"}}>local_summarizer: <span style={{color:C.green}}>"ollama/llama3"</span></p>
                <p style={{marginTop:"8px",color:"rgba(255,255,255,0.28)"}}>encryption: <span style={{color:C.amber}}>fernet</span></p>
                <p style={{color:"rgba(255,255,255,0.28)"}}>zero_knowledge: <span style={{color:C.green}}>true</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features - redesigned large-format cards ─────────────────────────────── */
function FeaturesSection(){
  const headRef=useReveal(0.1),gridRef=useReveal(0.07);
  return(
    <section id="features" style={{padding:"96px 0"}}>
      <SectionDivider/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end",marginBottom:"60px"}} className="hiw-grid">
        <div ref={headRef} className="reveal">
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"16px",opacity:0.8}}>↓ Capabilities</p>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.4rem,5.5vw,4.6rem)",lineHeight:0.9,letterSpacing:"-0.055em",color:"#fff",margin:0}}>Seven agents.<br/>One surface.</h2>
        </div>
        <p ref={useReveal(0.1)} className="reveal" style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px",transitionDelay:"0.08s"}}>Every feature built for inquiry that needs to be inspected, traced, and revisited.</p>
      </div>

      {/* 4-col grid, large cards */}
      <div ref={gridRef} className="reveal-stagger features-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        {FEATURES.map(f=>(
          <button
            key={f.title}
            className={`feat-card ${f.cls}`}
            onClick={()=>window.location.href=f.route}
            style={{
              minHeight:"260px",
              display:"flex",
              flexDirection:"column",
              alignItems:"flex-start",
              textAlign:"left",
              padding:"28px 26px 24px",
              borderRadius:"20px",
              border:`1px solid rgba(255,255,255,0.055)`,
              background:"rgba(10,10,22,0.85)",
              cursor:"pointer",
              position:"relative",
              backdropFilter:"blur(16px)",
            }}
          >
            {/* Top gradient line */}
            <div className="feat-top-line" style={{position:"absolute",top:0,left:"15%",right:"15%",height:"2px",background:`linear-gradient(90deg,transparent,${f.color}80,transparent)`,borderRadius:"1px",opacity:0,transition:"opacity 0.4s ease"}}/>

            {/* Route tag */}
            <div style={{position:"absolute",top:"18px",right:"18px",padding:"3px 9px",borderRadius:"9999px",background:`${f.color}10`,border:`1px solid ${f.color}25`}}>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:f.color,letterSpacing:"0.12em",opacity:0.85}}>{f.tag}</span>
            </div>

            {/* Arrow */}
            <span className="feat-arrow" style={{position:"absolute",bottom:"22px",right:"22px",fontFamily:"Material Symbols Outlined",fontSize:"18px",color:f.color,opacity:0.3,transition:"opacity 0.3s ease, transform 0.3s ease"}}>arrow_outward</span>

            {/* Icon */}
            <div style={{width:"52px",height:"52px",borderRadius:"14px",background:`${f.color}0c`,border:`1px solid ${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"18px",flexShrink:0,position:"relative",zIndex:1}}>
              <span style={{fontFamily:"Material Symbols Outlined",fontSize:"26px",color:f.color}}>{f.icon}</span>
            </div>

            {/* Title */}
            <span style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"16px",color:"#fff",display:"block",marginBottom:"10px",lineHeight:1.2,position:"relative",zIndex:1,letterSpacing:"-0.01em"}}>{f.title}</span>

            {/* Desc */}
            <span style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13.5px",color:"rgba(145,160,178,0.78)",lineHeight:1.72,position:"relative",zIndex:1,flex:1}}>{f.desc}</span>

            {/* Bottom color line */}
            <div style={{marginTop:"20px",height:"1.5px",width:"100%",borderRadius:"9999px",background:`linear-gradient(90deg,${f.color}45,${f.color}10,transparent)`,position:"relative",zIndex:1}}/>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Pipeline ─────────────────────────────────────────────────────────────── */
function PipelineSection(){
  const hRef=useReveal(0.1),bRef=useReveal(0.07);
  return(
    <section id="pipeline" style={{padding:"96px 0",overflow:"hidden"}}>
      <SectionDivider/>
      <div ref={hRef} className="reveal" style={{textAlign:"center",marginBottom:"52px"}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"14px",opacity:0.8}}>↓ Architecture</p>
        <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.6rem)",letterSpacing:"-0.05em",marginBottom:"12px",color:"#fff"}}>Neural Pipeline</h2>
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.78)",maxWidth:"420px",margin:"0 auto",lineHeight:1.7}}>Real-time multi-agent synthesis, visualized live.</p>
      </div>
      <div ref={bRef} className="reveal" style={{width:"100%",maxWidth:"1440px",margin:"0 auto",borderRadius:"32px",overflow:"hidden",background:"radial-gradient(ellipse 130% 80% at 25% 50%,rgba(0,24,8,0.55) 0%,rgba(3,4,16,0.92) 55%),radial-gradient(ellipse 130% 80% at 75% 50%,rgba(24,0,5,0.4) 0%,rgba(3,4,16,0.92) 55%)",border:"1px solid rgba(255,255,255,0.05)",position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,0.5)"}}>
        <div style={{position:"absolute",inset:0,opacity:0.03,pointerEvents:"none",zIndex:1}}>
          <svg width="100%" height="100%"><defs><pattern id="hex2" width="30" height="52" patternUnits="userSpaceOnUse"><path d="M15 0l15 8.66v17.32L15 34.64 0 25.98V8.66L15 0z" fill="none" stroke="#00ff0f" strokeWidth="1" strokeOpacity="0.15"/></pattern></defs><rect width="100%" height="100%" fill="url(#hex2)"/></svg>
        </div>
        <div style={{position:"relative",zIndex:10}}><NeuralPipeline/></div>
      </div>
    </section>
  );
}

/* ── Tech Highlights ──────────────────────────────────────────────────────── */
function TechHighlights(){
  const hRef=useReveal(0.1),gRef=useReveal(0.07);
  const GLOW_RGB = {
    [C.green]:  "0,255,15",
    [C.purple]: "168,85,247",
    [C.cyan]:   "0,204,255",
    [C.crimson]:"255,32,64",
    [C.amber]:  "255,170,0",
    [C.gold]:   "255,215,0",
  };
  return(
    <section style={{padding:"96px 0"}}>
      <SectionDivider/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end",marginBottom:"56px"}} className="hiw-grid">
        <div ref={hRef} className="reveal">
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"16px",opacity:0.8}}>↓ Engineering</p>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.4rem,5.5vw,4.6rem)",lineHeight:0.9,letterSpacing:"-0.055em",color:"#fff",margin:0}}>Tech<br/>Highlights</h2>
        </div>
        <p ref={useReveal(0.1)} className="reveal" style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px",transitionDelay:"0.08s"}}>Engineered for resilience, speed, and uncompromising precision.</p>
      </div>
      <div ref={gRef} className="reveal-stagger tech-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px"}}>
        {TECH.map((t,i)=>{
          const rgb=GLOW_RGB[t.color]||"0,255,15";
          return(
            <div key={t.title} className="tech-card" style={{borderRadius:"20px",padding:"2px",background:`linear-gradient(135deg,rgba(${rgb},0.12) 0%,rgba(${rgb},0.03) 40%,transparent 100%)`,position:"relative"}}>
              <div className="tc-glow" style={{position:"absolute",inset:"2px",borderRadius:"18px",background:`radial-gradient(ellipse 70% 50% at 50% 100%,rgba(${rgb},0.1) 0%,transparent 70%)`,opacity:0,transition:"opacity 0.45s ease",pointerEvents:"none",zIndex:0}}/>
              <div style={{borderRadius:"18px",padding:"28px",background:"rgba(8,8,20,0.92)",border:`1px solid rgba(${rgb},0.12)`,height:"100%",position:"relative",zIndex:1,backdropFilter:"blur(16px)"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"22px"}}>
                  <div style={{width:"46px",height:"46px",borderRadius:"12px",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"Material Symbols Outlined",fontSize:"22px",color:t.color}}>{t.icon}</span>
                  </div>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(255,255,255,0.12)",letterSpacing:"0.1em",marginTop:"3px"}}>0{i+1}</span>
                </div>
                <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"15.5px",color:"#fff",marginBottom:"10px",letterSpacing:"-0.015em",lineHeight:1.2}}>{t.title}</h3>
                <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",color:"rgba(130,148,168,0.72)",lineHeight:1.72,margin:0}}>{t.desc}</p>
                <div className="tc-bar" style={{marginTop:"22px",height:"1.5px",borderRadius:"9999px",background:`linear-gradient(90deg,${t.color}55,${t.color}10,transparent)`,opacity:0.5,transition:"opacity 0.45s ease"}}/>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Example Research ─────────────────────────────────────────────────────── */
function ExampleSection(){
  const hRef=useReveal(0.1),gRef=useReveal(0.07);
  const METAS_COLOR={Research:C.green,Debate:C.crimson,"Knowledge Graph":C.cyan,"Semantic Search":C.purple};
  return(
    <section style={{padding:"80px 0"}}>
      <SectionDivider/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end",marginBottom:"48px"}} className="hiw-grid">
        <div ref={hRef} className="reveal">
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"16px",opacity:0.8}}>↓ Examples</p>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.4rem,5.5vw,4.6rem)",lineHeight:0.9,letterSpacing:"-0.055em",color:"#fff",margin:0}}>Example research</h2>
        </div>
        <p ref={useReveal(0.1)} className="reveal" style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px",transitionDelay:"0.08s"}}>Four common paths through the platform, from quick synthesis to structured debate.</p>
      </div>
      <div ref={gRef} className="reveal-stagger example-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
        {EXAMPLES.map((ex,i)=>{
          const type=ex.meta.split(" · ")[0];
          const col=METAS_COLOR[type]||C.cyan;
          return(
            <button key={ex.title} onClick={()=>window.location.href=ex.route} style={{minHeight:"160px",display:"flex",flexDirection:"column",justifyContent:"space-between",alignItems:"flex-start",textAlign:"left",padding:"24px",borderRadius:"16px",border:`1px solid rgba(255,255,255,0.05)`,background:"rgba(12,12,26,0.8)",cursor:"pointer",position:"relative",overflow:"hidden",transition:"all 0.35s cubic-bezier(0.23,1,0.32,1)"}} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=`${col}35`;e.currentTarget.style.background="rgba(14,14,30,0.9)";}} onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";e.currentTarget.style.background="rgba(12,12,26,0.8)";}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${col}75,transparent)`}}/>
              <div style={{width:"28px",height:"28px",borderRadius:"7px",background:`${col}10`,border:`1px solid ${col}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"14px",flexShrink:0}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:col,fontWeight:600}}>0{i+1}</span>
              </div>
              <span style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"15px",color:"#fff",lineHeight:1.3,marginBottom:"auto"}}>{ex.title}</span>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:col,lineHeight:1.5,marginTop:"14px",opacity:0.75}}>{ex.meta}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── Agent Playground ─────────────────────────────────────────────────────── */
function AgentPlayground(){
  const ref=useReveal(0.08);
  const[selected,setSelected]=useState(null);
  const[log,setLog]=useState([]);
  const[running,setRunning]=useState(false);
  const[done,setDone]=useState(false);
  const logRef=useRef(null);
  useEffect(()=>{logRef.current?.scrollTo({top:logRef.current.scrollHeight,behavior:"smooth"});},[log]);
  const run=agent=>{
    if(running)return;
    setSelected(agent.id);setDone(false);setLog([]);setRunning(true);
    const quips=AGENT_QUIPS[agent.id]||["Processing…"];
    quips.forEach((q,i)=>setTimeout(()=>{setLog(p=>[...p,{text:q,color:agent.color}]);if(i===quips.length-1){setRunning(false);setDone(true);}},520*(i+1)));
  };
  const reset=()=>{setSelected(null);setLog([]);setRunning(false);setDone(false);};
  const active=PLAYGROUND_AGENTS.find(a=>a.id===selected);
  return(
    <section id="playground" style={{padding:"96px 0"}}>
      <SectionDivider/>
      <div ref={ref} className="reveal">
        <div style={{textAlign:"center",marginBottom:"52px"}}>
          <span style={{display:"inline-block",padding:"4px 16px",borderRadius:"9999px",border:`1px solid ${C.purple}45`,color:C.purple,fontFamily:"JetBrains Mono,monospace",fontSize:"10px",letterSpacing:"0.14em",marginBottom:"14px"}}>✦ AGENT PLAYGROUND</span>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.5rem)",letterSpacing:"-0.05em",marginBottom:"10px",color:"#fff"}}>Pick an <span style={{color:C.green}}>Agent.</span> Watch it <span style={{color:C.cyan}}>Think.</span></h2>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.78)",maxWidth:"460px",margin:"0 auto",lineHeight:1.7}}>Click any agent tile to simulate its inner monologue - no backend required.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px",maxWidth:"940px",margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignContent:"start"}}>
            {PLAYGROUND_AGENTS.map(agent=>{
              const isSel=selected===agent.id;
              return(
                <button key={agent.id} className="agent-btn" onClick={()=>run(agent)} style={{padding:"18px 14px",background:isSel?`${agent.color}10`:"rgba(8,8,20,0.85)",border:`1px solid ${isSel?agent.color:"rgba(255,255,255,0.06)"}`,color:isSel?agent.color:"rgba(130,148,168,0.65)",textAlign:"left",boxShadow:isSel?`0 0 20px ${agent.color}22,0 0 40px ${agent.color}10,inset 0 1px 0 ${agent.color}12`:"none",gridColumn:agent.id==="judge"?"1 / -1":undefined}}>
                  <div style={{fontSize:"22px",marginBottom:"6px"}}>{agent.emoji}</div>
                  <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"11px",letterSpacing:"0.1em"}}>{agent.name}</div>
                  {isSel&&<div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"8px",marginTop:"4px",opacity:0.55,color:agent.color}}>● ACTIVE</div>}
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",flexDirection:"column",borderRadius:"18px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.055)",boxShadow:"0 24px 48px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"20px 22px",background:"rgba(7,7,18,0.96)",borderBottom:"1px solid rgba(255,255,255,0.04)",minHeight:"90px"}}>
              {active?(
                <div style={{animation:"fadeUp 0.3s ease"}} key={active.id}>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:active.color,marginBottom:"7px",letterSpacing:"0.1em"}}>{active.emoji} {active.name} - ROLE BRIEFING</div>
                  <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",color:"rgba(185,200,175,0.75)",lineHeight:1.65,margin:0}}>{active.desc}</p>
                </div>
              ):(
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:"rgba(255,255,255,0.15)",lineHeight:1.7,margin:0}}>← Select an agent to see its role briefing and watch it run.</p>
              )}
            </div>
            <div ref={logRef} style={{flex:1,minHeight:"200px",maxHeight:"200px",overflowY:"auto",background:"#05050f",padding:"16px 20px",fontFamily:"JetBrains Mono,monospace",fontSize:"12px",lineHeight:2,scrollbarWidth:"thin",scrollbarColor:"rgba(0,255,15,0.1) transparent"}}>
              {log.length===0&&<span style={{color:"rgba(255,255,255,0.12)"}}>_</span>}
              {log.map((e,i)=>(
                <div key={i} style={{animation:"fadeUp 0.28s ease",color:e.color,display:"flex",gap:"10px",alignItems:"baseline"}}>
                  <span style={{color:"rgba(255,255,255,0.15)",fontSize:"10px",minWidth:"18px"}}>{i+1}</span>
                  <span>{e.text}</span>
                </div>
              ))}
              {running&&(
                <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"4px"}}>
                  <span style={{color:"rgba(255,255,255,0.15)",fontSize:"10px"}}>{log.length+1}</span>
                  {[0,1,2].map(i=><div key={i} style={{width:"4px",height:"4px",borderRadius:"50%",background:active?.color||C.green,animation:`pulse 1.1s ${i*0.18}s ease-in-out infinite`}}/>)}
                </div>
              )}
            </div>
            <div style={{padding:"12px 18px",background:"rgba(5,5,15,0.96)",borderTop:"1px solid rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",background:running?C.amber:done?C.green:"rgba(255,255,255,0.12)",animation:running?"pulse 0.8s ease-in-out infinite":"none",transition:"background 0.3s"}}/>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(255,255,255,0.28)"}}>
                  {running?`${active?.name} processing…`:done?`${active?.name} complete ✓`:"Awaiting selection"}
                </span>
              </div>
              {(selected||log.length>0)&&<button onClick={reset} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",padding:"4px 12px",color:"rgba(255,255,255,0.28)",fontFamily:"JetBrains Mono,monospace",fontSize:"10px",cursor:"pointer",transition:"all 0.2s"}} onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";e.currentTarget.style.color="#fff";}} onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,0.28)";}}>reset</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────────────────────────── */
function FinalCTA(){
  const ref=useReveal(0.15);
  return(
    <section style={{padding:"128px 32px",textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.04)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"700px",height:"700px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,15,0.035) 0%,transparent 68%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,204,255,0.02) 0%,transparent 68%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,255,15,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,15,0.012) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none",maskImage:"radial-gradient(ellipse 70% 60% at 50% 50%,black 20%,transparent 100%)"}}/>
      <div ref={ref} className="reveal">
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"20px",opacity:0.7}}>START RESEARCHING</p>
        <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.8rem,8vw,7rem)",lineHeight:0.88,letterSpacing:"-0.065em",color:"#fff",marginBottom:"52px"}}>Ready to<br/>research deeper?</h2>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:"20px"}}>
          <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{position:"absolute",inset:"-4px",borderRadius:"9999px",background:"conic-gradient(from 0deg,#ff0000,#ff8800,#ffff00,#00ff0f,#00ccff,#a855f7,#ff0088,#ff0000)",animation:"rainbowSpin 3s linear infinite",filter:"blur(0.5px)",boxShadow:"0 0 40px rgba(0,255,15,0.15),0 0 80px rgba(0,204,255,0.1)"}}/>
            <div style={{position:"relative",padding:"3px",borderRadius:"9999px",background:"#060610"}}>
              <button onClick={()=>window.location.href="/research"} style={{padding:"20px 52px",background:"rgba(8,8,22,0.98)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"19px",fontWeight:900,letterSpacing:"0.04em",color:"#fff",display:"inline-flex",alignItems:"center",gap:"14px",backdropFilter:"blur(24px)",transition:"transform 0.3s cubic-bezier(0.23,1,0.32,1)",position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
                <div style={{position:"absolute",inset:0,borderRadius:"9999px",background:"linear-gradient(135deg,rgba(0,255,15,0.06),rgba(0,204,255,0.04),rgba(168,85,247,0.04))",pointerEvents:"none"}}/>
                <span style={{fontFamily:"Material Symbols Outlined",fontSize:"26px",background:`linear-gradient(135deg,${C.green},${C.cyan},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",position:"relative",zIndex:1}}>rocket_launch</span>
                <span style={{background:`linear-gradient(90deg,${C.green} 0%,${C.cyan} 45%,${C.purple} 80%,${C.gold} 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200% 100%",animation:"shimmerGrad 2.5s linear infinite",position:"relative",zIndex:1}}>LET'S GO</span>
              </button>
            </div>
          </div>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",color:"rgba(130,148,168,0.55)",letterSpacing:"0.01em"}}>Free to start · No credit card required</p>
        </div>
      </div>
    </section>
  );
}

/* ── Developer Card ───────────────────────────────────────────────────────── */
function DeveloperCard(){
  const ref=useReveal(0.15);
  return(
    <section style={{padding:"80px 0"}}>
      <SectionDivider/>
      <div style={{display:"flex",justifyContent:"center"}}>
        <div ref={ref} className="reveal" style={{maxWidth:"480px",width:"100%",padding:"44px 36px",borderRadius:"24px",display:"flex",flexDirection:"column",alignItems:"center",gap:"22px",background:"rgba(8,8,20,0.88)",backdropFilter:"blur(28px)",border:"1px solid rgba(0,255,15,0.08)",textAlign:"center",position:"relative",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.4)"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${C.green}50,transparent)`}}/>
          <div style={{position:"relative"}}>
            <div style={{width:"112px",height:"112px",borderRadius:"50%",overflow:"hidden",border:`2px solid rgba(0,255,15,0.4)`,boxShadow:`0 0 30px rgba(0,255,15,0.15),0 0 60px rgba(0,255,15,0.06)`}}>
              <img alt="Ashwarya Pradhan" src={PHOTO_SRC} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top center"}}/>
            </div>
            <div style={{position:"absolute",bottom:"4px",right:"4px",width:"13px",height:"13px",borderRadius:"50%",background:C.green,border:`2px solid #08081a`,animation:"pulse 2s ease-in-out infinite",boxShadow:`0 0 8px ${C.green}`}}/>
          </div>
          <div>
            <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"20px",marginBottom:"5px",color:"#fff"}}>Ashwarya Pradhan</h3>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.cyan,marginBottom:"12px",letterSpacing:"0.06em"}}>AI/ML Engineer · MUJ · Polynous Architect</p>
            <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",color:"rgba(130,148,168,0.75)",lineHeight:1.7,maxWidth:"300px",margin:"0 auto 20px"}}>Building multi-agent AI systems that reason, debate, and synthesize knowledge at scale.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"12px"}}>
              {[{icon:"alternate_email",href:"mailto:pradhanashwarya2122@gmail.com",color:C.green},{icon:"code",href:"https://github.com/pradhanashwarya2122",color:C.cyan},{icon:"share",href:"https://linkedin.com/in/ashwarya-pradhan",color:C.purple}].map(({icon,href,color})=>(
                <a key={icon} href={href} target="_blank" rel="noreferrer" style={{width:"38px",height:"38px",borderRadius:"50%",border:`1px solid ${color}28`,display:"flex",alignItems:"center",justifyContent:"center",color,textDecoration:"none",fontFamily:"Material Symbols Outlined",fontSize:"16px",transition:"all 0.25s"}} onMouseOver={e=>{e.currentTarget.style.background=`${color}12`;e.currentTarget.style.borderColor=`${color}60`;e.currentTarget.style.boxShadow=`0 0 14px ${color}30`;}} onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=`${color}28`;e.currentTarget.style.boxShadow="none";}}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
function Footer(){
  return(
    <footer style={{padding:"32px 0",borderTop:"1px solid rgba(255,255,255,0.035)"}}>
      <div style={{maxWidth:"1400px",margin:"0 auto",padding:"0 32px",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"18px"}}>
          <span style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"14px",color:C.green,letterSpacing:"0.1em"}}>POLYNOUS</span>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:"rgba(255,255,255,0.15)"}}>7 Agents · Claude + GPT + Tavily</span>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"22px"}}>
          {[{label:"GitHub",href:"https://github.com/pradhanashwarya2122"},{label:"Docs",href:"#"},{label:"Privacy",href:"#"},{label:"Terms",href:"#"}].map(({label,href})=>(
            <a key={label} href={href} target={href.startsWith("http")?"_blank":undefined} rel="noreferrer" style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"rgba(100,118,150,0.6)",textDecoration:"none",transition:"color 0.2s"}} onMouseOver={e=>e.currentTarget.style.color=C.green} onMouseOut={e=>e.currentTarget.style.color="rgba(100,118,150,0.6)"}>{label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App(){
  useEffect(()=>{
    const el=document.createElement("style");
    el.setAttribute("data-polynous","1");
    el.textContent=GLOBAL_STYLES;
    document.head.appendChild(el);
    return()=>{try{document.head.removeChild(el);}catch(_){}};
  },[]);
  useEffect(()=>{
    if(document.querySelector("link[data-ms]"))return;
    const l=document.createElement("link");
    l.href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    l.rel="stylesheet";l.setAttribute("data-ms","1");
    document.head.appendChild(l);
  },[]);
  return(
    <>
      <div className="noise-overlay"/>
      <NeuralCanvas/>
      <main style={{position:"relative",zIndex:10,minHeight:"100vh"}}>
        <Header/>
        <div style={{maxWidth:"1400px",margin:"0 auto",padding:"0 32px"}}>
          <HeroSection/>
          <HowItWorksSection/>
          <ApiSection/>
          <FeaturesSection/>
          <PipelineSection/>
          <TechHighlights/>
          <ExampleSection/>
          <AgentPlayground/>
        </div>
        <FinalCTA/>
        <div style={{maxWidth:"1400px",margin:"0 auto",padding:"0 32px"}}>
          <DeveloperCard/>
        </div>
        <Footer/>
      </main>
    </>
  );
}