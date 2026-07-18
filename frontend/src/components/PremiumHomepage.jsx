import { useState, useEffect, useRef, useCallback } from "react";

// Served from /frontend/public — anything dropped there is available at the site root.
const PHOTO_SRC = "/profilepic.jpg";

const C = {
  green:"#00ff0f", cyan:"#00ccff", crimson:"#ff2040", gold:"#ffd700",
  purple:"#a855f7", indigo:"#5878d4", amber:"#ffaa00", coral:"#ff6b6b",
  teal:"#00e6b8", void:"#060610", surface:"#0d0d1f", surface2:"#131326", nodeBg:"#06060f",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=Hanken+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; font-size: 16px; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
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
  @keyframes nodeFloat   { 0%,100%{transform:translate(0,0)} 33%{transform:translate(3px,-4px)} 66%{transform:translate(-3px,2px)} }
  @keyframes edgeGlow    { 0%,100%{opacity:0.25} 50%{opacity:0.7} }
  @keyframes progressRing{ from{stroke-dashoffset:220} to{stroke-dashoffset:42} }
  @keyframes shimmerLive { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
  @keyframes pdfPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(0,204,255,0.3)} 50%{box-shadow:0 0 0 8px rgba(0,204,255,0)} }
  @keyframes tooltipFade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes timelinePulse{ 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.4);opacity:1} }
  @keyframes sparkle     { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
  @keyframes crimsonPulse{ 0%,100%{box-shadow:0 0 18px rgba(255,32,64,0.4),0 0 40px rgba(255,32,64,0.18),inset 0 1px 0 rgba(255,100,120,0.15)} 50%{box-shadow:0 0 28px rgba(255,32,64,0.65),0 0 64px rgba(255,32,64,0.3),inset 0 1px 0 rgba(255,100,120,0.2)} }
  @keyframes graphRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes barRise     { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
  @keyframes drawLine    { from{stroke-dashoffset:240} to{stroke-dashoffset:0} }
  @keyframes ringSweep   { from{transform:rotate(-90deg)} to{transform:rotate(270deg)} }
  @keyframes scanSweep   { from{left:-30%} to{left:110%} }
  @keyframes nodePop     { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.18)} 75%{transform:scale(0.94)} 90%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes edgeFadeIn  { from{opacity:0;stroke-dashoffset:80} to{opacity:1;stroke-dashoffset:0} }
  @keyframes haloBreath  { 0%,100%{opacity:0.28;r:22} 50%{opacity:0.55;r:28} }
  @keyframes particleMove{ 0%{offset-distance:0%;opacity:0} 8%{opacity:0.9} 92%{opacity:0.9} 100%{offset-distance:100%;opacity:0} }
  /* Memory bank premium animations */
  @keyframes memorySlideIn{ from{opacity:0;transform:translateX(24px) scale(0.96)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes memoryGlow   { 0%,100%{box-shadow:0 0 0 0 var(--mc,#a855f7)} 50%{box-shadow:0 0 18px 2px var(--mc,#a855f7)} }
  @keyframes memoryPulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
  @keyframes memoryRipple { 0%{transform:scale(0.6);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
  @keyframes timelineFlow { 0%{background-position:0% 0%} 100%{background-position:200% 0%} }
  @keyframes memCardFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes memSparkle   { 0%,100%{opacity:0;transform:scale(0.4) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} }
  @keyframes memOrbit     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  @keyframes termBlink   { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pipelineSheen { 0%{left:-40%} 55%{left:110%} 100%{left:110%} }
  .term-cursor { display:inline-block; width:7px; height:13px; background:currentColor; margin-left:2px; vertical-align:-2px; animation:termBlink 0.9s step-end infinite; }

  .reveal { opacity:0; transform:translateY(28px) scale(0.995); transition:opacity 1.1s cubic-bezier(0.16,1,0.3,1),transform 1.1s cubic-bezier(0.16,1,0.3,1); will-change:opacity,transform; }
  .reveal.visible { opacity:1; transform:translateY(0) scale(1); }
  .reveal-stagger > * { opacity:0; transform:translateY(18px); transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1); }
  .reveal-stagger.visible > *:nth-child(1)  { opacity:1;transform:translateY(0);transition-delay:0.03s }
  .reveal-stagger.visible > *:nth-child(2)  { opacity:1;transform:translateY(0);transition-delay:0.08s }
  .reveal-stagger.visible > *:nth-child(3)  { opacity:1;transform:translateY(0);transition-delay:0.13s }
  .reveal-stagger.visible > *:nth-child(4)  { opacity:1;transform:translateY(0);transition-delay:0.18s }
  .reveal-stagger.visible > *:nth-child(5)  { opacity:1;transform:translateY(0);transition-delay:0.23s }
  .reveal-stagger.visible > *:nth-child(6)  { opacity:1;transform:translateY(0);transition-delay:0.28s }
  .reveal-stagger.visible > *:nth-child(n+7){ opacity:1;transform:translateY(0);transition-delay:0.32s }
  /* Premium corner-bracket accent — subtle, POLYNOUS palette only */
  .corner-brackets { position:relative; }
  .corner-brackets::before, .corner-brackets::after { content:''; position:absolute; width:16px; height:16px; opacity:0; transition:opacity 0.4s ease; pointer-events:none; }
  .corner-brackets::before { top:10px; left:10px; border-left:1.5px solid currentColor; border-top:1.5px solid currentColor; }
  .corner-brackets::after  { bottom:10px; right:10px; border-right:1.5px solid currentColor; border-bottom:1.5px solid currentColor; }
  .corner-brackets:hover::before, .corner-brackets:hover::after { opacity:0.55; }
  .section-rule { width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,255,15,0.35),rgba(0,204,255,0.2),transparent);margin:0 auto 88px;transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }
  .section-rule.visible { width:50%; }
  .section-rule-tight.visible { margin:0 auto 32px; }
  .glass-card { background:rgba(13,13,31,0.75);backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.06);transition:all 0.5s cubic-bezier(0.23,1,0.32,1); }
  .terminal-bg { background:#05050f;border:1px solid #1c1c34; }
  .animate-pulse-dot { animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
  .nav-link { font-family:'Hanken Grotesk',sans-serif;font-size:14px;font-weight:500;color:rgba(100,116,145,0.85);text-decoration:none;transition:color .22s;cursor:pointer;letter-spacing:0.018em; }
  .nav-link:hover { color:#00ff0f; }
  .nav-link-active { color:#00ff0f; }
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
  .tech-card { transition:all 0.45s cubic-bezier(0.23,1,0.32,1);position:relative;overflow:hidden;cursor:default; }
  .tech-card:hover { transform:translateY(-4px); }
  .tech-card:hover .tc-glow { opacity:1 !important; }
  .tech-card:hover .tc-bar { opacity:1 !important; }
  .step-row { transition:background 0.4s ease; }
  .step-row:hover { background:rgba(255,255,255,0.015); }
  .step-row:hover .step-accent-line { opacity:1 !important; width:100% !important; }
  .agent-btn { border:none;cursor:pointer;border-radius:14px;font-family:'Sora',sans-serif;font-weight:600;font-size:14px;transition:all 0.3s cubic-bezier(0.23,1,0.32,1);position:relative;overflow:hidden; }
  .agent-btn:hover { transform:translateY(-3px) scale(1.04); }
  .agent-btn:active { transform:scale(0.97); }
  .search-focus:focus-within { border-color:rgba(0,255,15,0.5) !important;box-shadow:0 0 0 3px rgba(0,255,15,0.07),0 4px 28px rgba(0,255,15,0.05) !important; }
  .noise-overlay { position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.022;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .no-scrollbar::-webkit-scrollbar { display:none; height:0; }
  .byok-tooltip { display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:rgba(8,8,22,0.97);border:1px solid rgba(0,204,255,0.3);border-radius:10px;padding:8px 12px;white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(0,204,255,0.9);pointer-events:none;z-index:100;animation:tooltipFade 0.2s ease; }
  .byok-wrap:hover .byok-tooltip { display:block; }
  .user-dropdown { display:none;position:absolute;top:calc(100% + 8px);right:0;background:rgba(8,8,22,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:6px;min-width:180px;z-index:200; }
  .user-wrap:hover .user-dropdown { display:block; }
  .user-dropdown-item { display:block;width:100%;padding:9px 14px;background:transparent;border:none;color:rgba(200,210,220,0.75);font-family:'Hanken Grotesk',sans-serif;font-size:13px;text-align:left;cursor:pointer;border-radius:8px;transition:background 0.2s,color 0.2s; }
  .user-dropdown-item:hover { background:rgba(255,255,255,0.04);color:#fff; }

  /* Premium KG node entrance */
  .kg-node-new { animation: nodePop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  /* Memory card hover */
  .mem-card { transition: all 0.4s cubic-bezier(0.23,1,0.32,1); }
  .mem-card:hover { animation: memCardFloat 2s ease-in-out infinite; }

  @media (max-width:1100px) { .features-grid { grid-template-columns:1fr 1fr !important; } }
  @media (max-width:900px) { .nav-center { display:none !important; } .features-grid { grid-template-columns:1fr 1fr !important; } .tech-3 { grid-template-columns:1fr 1fr !important; } .hiw-grid { grid-template-columns:1fr !important; } .api-grid { grid-template-columns:1fr !important; } }
  @media (max-width:600px) { .features-grid,.tech-3,.example-4 { grid-template-columns:1fr !important; } .search-bar { flex-direction:column;border-radius:20px !important;padding:12px !important; } .hero-title { font-size:clamp(3rem,14vw,5rem) !important; } }
`;

const NAV_SECTIONS = [
  {label:"How It Works", id:"how-it-works"},
  {label:"Features",     id:"features"},
  {label:"Pipeline",     id:"pipeline"},
  {label:"Agents",       id:"playground"},
];

const STEPS = [
  {n:"01", title:"Ask anything", body:"POLYNOUS activates its 7-agent neural mesh instantly. No waiting, no setup — just intent, translated into structured inquiry.", accent:C.green,   icon:"search"},
  {n:"02", title:"Search & synthesize", body:"Dedicated agents scan, retrieve, and distill sources with automatic citation tracking. Every fact traced to origin.", accent:C.cyan,    icon:"manage_search"},
  {n:"03", title:"Challenge & critique", body:"A dedicated Critic agent stress-tests every claim. Contradictions get flagged before they reach you — rigorous by default.", accent:C.amber,   icon:"balance"},
  {n:"04", title:"Deliver structured truth", body:"The Writer synthesizes everything into polished, cited, confidence-scored output. Not a response — a document.", accent:C.purple,  icon:"auto_stories"},
];

const FEATURES = [
  {icon:"biotech",       title:"Neural Research",     color:C.green,   cls:"feat-card-green",   dot:C.green,   route:"/research", desc:"7 specialized agents collaborate in a LangGraph pipeline — delivering cited, confidence-scored answers in real time.", tag:"RESEARCH"},
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
  {id:"search",    name:"SEARCH",    icon:"search",       color:C.cyan,  tag:"AG-01"},
  {id:"summarise", name:"SUMMARISE", icon:"summarize",    color:C.indigo,tag:"AG-02"},
  {id:"critic",    name:"CRITIC",    icon:"balance",      color:C.amber, tag:"AG-03"},
  {id:"writer",    name:"WRITER",    icon:"edit_note",    color:C.purple,tag:"AG-04"},
];

const DIALECTIC_NODES = [
  {id:"d-search",name:"SEARCH", icon:"search",        color:C.cyan,   tag:"DX-01",x:75, y:240},
  {id:"for",     name:"FOR",    icon:"check_circle",  color:C.green,  tag:"DX-02",x:270,y:100},
  {id:"against", name:"AGAINST",icon:"cancel",        color:C.crimson,tag:"DX-03",x:270,y:380},
  {id:"judge",   name:"JUDGE",  icon:"gavel",         color:C.gold,   tag:"DX-04",x:460,y:240,isJudge:true},
];

const PLAYGROUND_AGENTS = [
  {id:"search",   name:"SEARCH",   icon:"search",       color:"#00ccff",desc:"I scan knowledge bases and the web to pull raw, unfiltered data on any topic."},
  {id:"summarise",name:"SUMMARISE",icon:"summarize",    color:"#5878d4",desc:"I distill walls of text into crisp, structured summaries without losing nuance."},
  {id:"for",      name:"FOR",      icon:"check_circle", color:"#00ff0f",desc:"My job is to build the strongest possible case in favour of the proposition."},
  {id:"against",  name:"AGAINST",  icon:"cancel",       color:"#ff2040",desc:"I stress-test every argument and poke holes in assumptions. Nothing slips past me."},
  {id:"critic",   name:"CRITIC",   icon:"balance",      color:"#ffaa00",desc:"I cross-examine both sides and flag logical fallacies or citation gaps."},
  {id:"writer",   name:"WRITER",   icon:"edit_note",    color:"#a855f7",desc:"I synthesize everything into polished, publication-ready prose with citations."},
  {id:"judge",    name:"JUDGE",    icon:"gavel",        color:"#ffd700",desc:"Final verdict. I weigh all evidence, assign confidence scores, and deliver the ruling."},
];

const HERO_BOOT_SEQUENCES = [
  [
    {text:"> Checking critical dependencies...", color:"rgba(130,148,170,0.6)"},
    {text:"> Database initialized ✓", color:"rgba(130,148,170,0.6)"},
    {text:"> Neo4j verified on startup ✓", color:"rgba(130,148,170,0.6)"},
    {text:"> Uvicorn running on :8000", color:C.green},
  ],
  [
    {text:"$ npm run dev", color:"rgba(100,118,170,0.55)"},
    {text:"> VITE ready", color:"rgba(130,148,170,0.6)"},
    {text:"> Local: http://localhost:5173", color:"rgba(130,148,170,0.6)"},
    {text:"> Frontend ⇄ Backend linked.", color:C.cyan},
  ],
  [
    {text:"> 10 routers mounted: /ask /ask-stream", color:"rgba(130,148,170,0.6)"},
    {text:"> /ask-visual /memory /knowledge /pdfs...", color:"rgba(130,148,170,0.6)"},
    {text:"> \"Many Minds, One Answer\"", color:C.purple},
    {text:"> System nominal. Awaiting query.", color:C.cyan},
  ],
];

const AGENT_QUIPS = {
  search:   ["Scanning 14,000 nodes… hit!","Cross-referencing semantic vectors…","Found 847 relevant chunks — filtering top 12.","Knowledge graph query complete."],
  summarise:["Compressing 4,200 tokens → 180…","Key entities extracted: 6.","Distillation confidence: 94%.","Summary locked and staged."],
  for:      ["Building affirmative case…","3 strong premises identified.","Constructing syllogism chain…","Case FOR filed — bulletproof."],
  against:  ["Stress-testing every premise…","Identified 2 logical gaps!","Counter-evidence ratio: 67%.","Opposition case finalized."],
  critic:   ["Running fallacy detection…","Ad hominem: 0. Straw man: 1. Flagged.","Source reliability score: 88/100.","Critical review complete."],
  writer:   ["Stitching narrative threads…","Prose coherence index: 97%.","Applying citation layer…","Draft ready for judgment."],
  judge:    ["Weighing all arguments…","Confidence score: 91%.","Ruling: Affirmative wins by evidence margin.","Session archived to Knowledge Graph."],
};

const MEMORY_DOTS = [
  {id:1, query:"Quantum entanglement basics",    date:"Jun 18, 2025", tag:"Physics",    icon:"science"},
  {id:2, query:"CRISPR gene editing ethics",     date:"Jun 15, 2025", tag:"Biology",    icon:"biotech"},
  {id:3, query:"Mars colonization feasibility",  date:"Jun 12, 2025", tag:"Space",      icon:"rocket_launch"},
  {id:4, query:"AI regulation global impact",    date:"Jun 9, 2025",  tag:"Policy",     icon:"policy"},
  {id:5, query:"Fusion energy milestones",       date:"Jun 5, 2025",  tag:"Energy",     icon:"bolt"},
  {id:6, query:"Neuroplasticity research",       date:"Jun 1, 2025",  tag:"Neuroscience",icon:"neurology"},
  {id:7, query:"Blockchain & decentralization",  date:"May 28, 2025", tag:"Tech",       icon:"hub"},
  {id:8, query:"Climate tipping points",         date:"May 24, 2025", tag:"Climate",    icon:"eco"},
];

const MEMORY_COLORS = [C.purple, C.cyan, C.crimson, C.green, C.amber, C.teal, C.indigo, C.gold];

const SPARKLINE_RESEARCH = [3,5,4,7,6,9,8,12,10,14];
const SPARKLINE_CONF = [80,82,85,83,88,87,91,90,92,94];
const TOP_TOPICS = [
  {label:"AI/ML", val:87, color:C.green},
  {label:"Biology", val:64, color:C.cyan},
  {label:"Space", val:55, color:C.purple},
  {label:"Energy", val:43, color:C.amber},
];

const GRAPH_NODES_DATA = [
  {id:0, label:"AI Ethics",   x:200, y:130, color:C.green,  r:20},
  {id:1, label:"CRISPR",      x:100, y:200, color:C.cyan,   r:16},
  {id:2, label:"Quantum",     x:290, y:210, color:C.purple, r:17},
  {id:3, label:"Mars",        x:150, y:295, color:C.crimson,r:15},
  {id:4, label:"Fusion",      x:260, y:295, color:C.amber,  r:14},
  {id:5, label:"Memory",      x:80,  y:315, color:C.teal,   r:13},
  {id:6, label:"Regulation",  x:330, y:140, color:C.gold,   r:15},
];
const GRAPH_EDGES = [[0,1],[0,2],[0,6],[1,3],[2,4],[3,5],[4,5],[2,6],[0,3]];

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

/* ── Typing + deleting terminal loop ─────────────────────────────────────────
   Types a sequence of lines char-by-char, holds, deletes bottom-up, then
   advances to the next sequence and repeats. Used anywhere the copy is
   framed as "live system output" so the effect reads as status, not decoration. */
function useTypewriterLoop(sequences, {typeSpeed=20, lineGap=260, holdTime=2400, deleteSpeed=9, seqGap=450, active=true}={}) {
  const [seqIdx,setSeqIdx]=useState(0);
  const [lines,setLines]=useState([]);
  const [typing,setTyping]=useState(true);
  useEffect(()=>{
    if(!active) return;
    let cancelled=false;
    const timers=[];
    const wait=ms=>new Promise(res=>{const t=setTimeout(res,ms);timers.push(t);});
    const seq=sequences[seqIdx];
    (async()=>{
      setTyping(true);
      setLines([]);
      for(let li=0;li<seq.length;li++){
        const full=seq[li].text;
        for(let ci=1;ci<=full.length;ci++){
          if(cancelled)return;
          await wait(typeSpeed);
          setLines(prev=>{const c=prev.slice(0,li);c[li]={text:full.slice(0,ci),color:seq[li].color};return c;});
        }
        await wait(lineGap);
      }
      if(cancelled)return;
      setTyping(false);
      await wait(holdTime);
      if(cancelled)return;
      setTyping(true);
      for(let li=seq.length-1;li>=0;li--){
        const full=seq[li].text;
        for(let ci=full.length;ci>=0;ci--){
          if(cancelled)return;
          await wait(deleteSpeed);
          setLines(prev=>{const c=prev.slice(0,li+1);c[li]={text:full.slice(0,ci),color:seq[li].color};if(ci===0)c.length=li;return c;});
        }
      }
      await wait(seqGap);
      if(!cancelled)setSeqIdx(i=>(i+1)%sequences.length);
    })();
    return()=>{cancelled=true;timers.forEach(clearTimeout);};
  },[seqIdx,active]);
  return {lines};
}

function TerminalTypewriter({sequences,minLines=4,fontSize="12px"}){
  const ref=useReveal(0.2);
  const [inView,setInView]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el)return;
    const obs=new IntersectionObserver(([e])=>setInView(e.isIntersecting),{threshold:0.2});
    obs.observe(el);
    return()=>obs.disconnect();
  },[]);
  const {lines}=useTypewriterLoop(sequences,{active:inView});
  return (
    <div ref={ref} style={{fontFamily:"JetBrains Mono,monospace",fontSize,lineHeight:2,minHeight:`${minLines*2}em`}}>
      {lines.length===0 && <div style={{color:"rgba(130,148,170,0.5)"}}><span className="term-cursor"/></div>}
      {lines.map((l,i)=>(
        <div key={i} style={{color:l.color}}>
          {l.text}{i===lines.length-1 && <span className="term-cursor"/>}
        </div>
      ))}
    </div>
  );
}

function TypedLine({text,speed=20}){
  const [n,setN]=useState(0);
  useEffect(()=>{
    if(n>=text.length)return;
    const t=setTimeout(()=>setN(v=>v+1),speed);
    return()=>clearTimeout(t);
  },[n,text,speed]);
  return <>{text.slice(0,n)}{n<text.length&&<span className="term-cursor"/>}</>;
}


const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function ScrambleText({text,style,duration=650,loop=false,loopMin=5000,loopMax=10000}){
  const ref=useRef(null);
  const [display,setDisplay]=useState(text);
  const [started,setStarted]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el)return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting&&!started){setStarted(true);obs.disconnect();}},{threshold:0.5});
    obs.observe(el);
    return()=>obs.disconnect();
  },[started]);
  useEffect(()=>{
    if(!started)return;
    let cancelled=false, ivTimer=null, loopTimer=null;
    function runOnce(onDone){
      const chars=text.split("");
      const frames=Math.max(10,Math.round(duration/40));
      const lockAt=chars.map((_,i)=>Math.floor((i/Math.max(chars.length,1))*frames*0.65)+Math.floor(Math.random()*frames*0.35));
      let frame=0;
      ivTimer=setInterval(()=>{
        frame++;
        setDisplay(chars.map((ch,i)=>{
          if(/[\s.,:/%\-"_]/.test(ch))return ch;
          if(frame>=lockAt[i])return ch;
          return SCRAMBLE_CHARS[Math.floor(Math.random()*SCRAMBLE_CHARS.length)];
        }).join(""));
        if(frame>=frames+4){clearInterval(ivTimer);setDisplay(text);onDone&&onDone();}
      },40);
    }
    function scheduleNext(){
      const wait=loopMin+Math.random()*(loopMax-loopMin);
      loopTimer=setTimeout(()=>{if(!cancelled)runOnce(loop?scheduleNext:undefined);},wait);
    }
    runOnce(loop?scheduleNext:undefined);
    return()=>{cancelled=true;clearInterval(ivTimer);clearTimeout(loopTimer);};
  },[started]);
  return <span ref={ref} style={style}>{display}</span>;
}

/* ── NeuralCanvas ─────────────────────────────────────────────────────────── */
function NeuralCanvas() {
  const canvasRef=useRef(null);
  const stateRef=useRef({particles:[],mouse:{x:null,y:null},raf:null,lastW:0,lastH:0,paused:false});
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext("2d"),state=stateRef.current;
    const isSmall=window.innerWidth<768;
    const COUNT=isSmall?60:180;
    const LINK_DIST=isSmall?65:85;
    class Particle {
      constructor(){this.reset();this.x=Math.random()*canvas.width;this.y=Math.random()*canvas.height;this.baseX=this.x;this.baseY=this.y;}
      reset(){this.baseX=Math.random()*canvas.width;this.baseY=Math.random()*canvas.height;this.x=this.baseX;this.y=this.baseY;this.size=Math.random()*1.6+0.3;const r=Math.random();this.color=r<0.5?C.green:r<0.8?C.cyan:C.purple;this.vx=0;this.vy=0;}
      draw(){ctx.fillStyle=this.color;ctx.globalAlpha=0.55;ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      update(){const{x:mx,y:my}=state.mouse;if(mx!==null){const dx=mx-this.x,dy=my-this.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<150){const force=(150-dist)/150;this.vx-=(dx/dist)*force*1.4;this.vy-=(dy/dist)*force*1.4;}}this.vx+=(this.baseX-this.x)*0.008;this.vy+=(this.baseY-this.y)*0.008;this.vx*=0.93;this.vy*=0.93;this.x+=this.vx;this.y+=this.vy;}
    }
    // Only reinit on a genuine width change or a large height change — mobile
    // browsers fire `resize` on URL-bar show/hide during scroll, and re-seeding
    // 180 particles mid-scroll every time was the source of the scroll jank/crash.
    function init(w,h){canvas.width=w;canvas.height=h;state.particles=Array.from({length:COUNT},()=>new Particle());state.lastW=w;state.lastH=h;}
    function drawConnections(){const ps=state.particles;for(let i=0;i<ps.length;i++){for(let j=i+1;j<ps.length;j++){const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<LINK_DIST){ctx.strokeStyle=ps[i].color;ctx.globalAlpha=(LINK_DIST-d)/LINK_DIST*0.055;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.stroke();ctx.globalAlpha=1;}}}}
    function loop(){if(state.paused){state.raf=requestAnimationFrame(loop);return;}ctx.clearRect(0,0,canvas.width,canvas.height);drawConnections();state.particles.forEach(p=>{p.draw();p.update();});state.raf=requestAnimationFrame(loop);}
    let resizeTimer=null;
    const onResize=()=>{
      const w=window.innerWidth,h=window.innerHeight;
      if(Math.abs(w-state.lastW)<2&&Math.abs(h-state.lastH)<120)return; // ignore URL-bar jitter
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>init(w,h),160);
    };
    const onMouseMove=e=>{state.mouse.x=e.clientX;state.mouse.y=e.clientY;};
    const onVisibility=()=>{state.paused=document.hidden;};
    window.addEventListener("resize",onResize,{passive:true});
    window.addEventListener("mousemove",onMouseMove,{passive:true});
    document.addEventListener("visibilitychange",onVisibility);
    init(window.innerWidth,window.innerHeight);
    loop();
    return()=>{
      clearTimeout(resizeTimer);
      window.removeEventListener("resize",onResize);
      window.removeEventListener("mousemove",onMouseMove);
      document.removeEventListener("visibilitychange",onVisibility);
      cancelAnimationFrame(state.raf);
    };
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
      <span style={{fontFamily:"Material Symbols Outlined",fontSize:"26px",marginBottom:"6px",zIndex:1,color,filter:`drop-shadow(0 0 6px ${color}80)`}}>{data.icon}</span>
      <span style={{fontFamily:"Sora,sans-serif",fontWeight:600,fontSize:"11px",color,letterSpacing:"0.07em",zIndex:1,textAlign:"center",padding:"0 6px"}}>{data.name}</span>
      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9.5px",color:"rgba(220,228,240,0.4)",marginTop:"3px",zIndex:1}}>#{data.tag}</span>
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
  const STEP_LABEL = ["Search agent gathering sources…","Summarise agent condensing findings…","Critic agent validating claims…","Writer agent drafting synthesis…","Forking into dialectic debate…","FOR & AGAINST arguing concurrently…","Judge rendering final verdict…","Cycle complete — resetting…"];
  const STEP_COLOR = [C.green,C.green,C.amber,C.cyan,C.purple,C.crimson,C.gold,"rgba(180,195,210,0.5)"];
  return(
    <div style={{width:"100%",minHeight:"620px",display:"flex",flexDirection:"column",position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"9px",padding:"18px 0 0",fontFamily:"JetBrains Mono,monospace",fontSize:"11px",letterSpacing:"0.06em"}}>
        <span style={{width:"6px",height:"6px",borderRadius:"50%",background:STEP_COLOR[step],boxShadow:`0 0 8px ${STEP_COLOR[step]}`,animation:"termBlink 1.4s step-end infinite"}}/>
        <span style={{color:STEP_COLOR[step]}}>{STEP_LABEL[step]}</span>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"stretch",position:"relative"}}>
      <div style={{flex:1,padding:"44px 28px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{marginBottom:"32px",textAlign:"center"}}>
          <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.green,letterSpacing:"0.16em",margin:0}}>RESEARCH PIPELINE</p>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(210,220,235,0.55)",margin:"5px 0 0",letterSpacing:"0.1em"}}>SEQUENTIAL SYNTHESIS ARCHITECTURE</p>
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
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"rgba(210,220,235,0.55)",marginTop:"24px",textAlign:"center",lineHeight:1.65}}>Linear multi-agent processing for structured<br/>data extraction and contextual summarization.</p>
      </div>
      <div style={{width:"1px",alignSelf:"stretch",background:"linear-gradient(to bottom,transparent,#00ff0f 30%,#ff2040 70%,transparent)",boxShadow:"0 0 20px #00ff0f44,0 0 20px #ff204044",flexShrink:0}}/>
      <div style={{flex:1,padding:"44px 28px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{marginBottom:"32px",textAlign:"center"}}>
          <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.crimson,letterSpacing:"0.16em",margin:0,display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}><span style={{fontFamily:"Material Symbols Outlined",fontSize:"14px"}}>balance</span>DIALECTIC FORK</p>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(210,220,235,0.55)",margin:"5px 0 0",letterSpacing:"0.1em"}}>ADVERSARIAL REASONING TOPOLOGY</p>
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
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"rgba(210,220,235,0.55)",marginTop:"24px",textAlign:"center",lineHeight:1.65}}>Adversarial evaluation where multiple perspectives<br/>are stress-tested for factual consistency.</p>
      </div>
      </div>
      <div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)",fontFamily:"JetBrains Mono,monospace",fontSize:"8px",color:"#fff",opacity:0.12,letterSpacing:"0.2em",whiteSpace:"nowrap",pointerEvents:"none",zIndex:20}}>POLYNOUS NEURAL ENGINE • AUTONOMOUS MULTI-AGENT MESH</div>
    </div>
  );
}

function SectionDivider({tight=false}){
  const ref=useReveal(0.3);
  return <div ref={ref} className={`section-rule reveal${tight?" section-rule-tight":""}`}/>;
}

function BYOKBadge() {
  return (
    <div className="byok-wrap" style={{display:"inline-flex",alignItems:"center",position:"relative",cursor:"default"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:"7px",padding:"5px 13px",borderRadius:"9999px",border:"1px solid rgba(192,192,220,0.22)",background:"rgba(12,12,28,0.7)",backdropFilter:"blur(12px)",fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:"rgba(192,210,220,0.75)",letterSpacing:"0.06em",transition:"border-color 0.25s",boxShadow:"0 1px 8px rgba(0,0,0,0.3)"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(192,210,220,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2L11 12m0 0l2 4m-2-4l4 2"/>
        </svg>
        Bring Your Own Key – Anthropic · OpenAI
      </div>
      <div className="byok-tooltip"><span style={{fontFamily:"Material Symbols Outlined",fontSize:"12px",verticalAlign:"-2px",marginRight:"6px"}}>lock</span>Keys encrypted with Fernet · Never stored in plaintext</div>
    </div>
  );
}

function PDFDropZone() {
  const [hovering, setHovering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || null;
    if(!file) return;
    setUploading(true); setProgress(0);
    let p = 0;
    const iv = setInterval(()=>{
      p += Math.random()*18+5;
      if(p>=100){ clearInterval(iv); setProgress(100); setTimeout(()=>window.location.href="/pdf-lab",400); }
      else setProgress(Math.min(p,99));
    },120);
  };

  return (
    <div
      onDragOver={e=>{e.preventDefault();setHovering(true);}}
      onDragLeave={()=>setHovering(false)}
      onDrop={handleDrop}
      style={{borderRadius:"16px",border:`1.5px dashed ${hovering||uploading?C.cyan:"rgba(180,200,220,0.18)"}`,background:hovering?"rgba(0,204,255,0.04)":"rgba(8,8,20,0.6)",backdropFilter:"blur(12px)",padding:"28px 24px",textAlign:"center",transition:"all 0.3s ease",cursor:"pointer",boxShadow:hovering?`0 0 0 3px rgba(0,204,255,0.08),0 0 24px rgba(0,204,255,0.12)`:"none",animation:hovering?"pdfPulse 1.5s ease-in-out infinite":"none",marginTop:"20px",width:"min(500px,100%)",marginLeft:"auto",marginRight:"auto"}}
      onClick={()=>{
        setUploading(true);setProgress(0);
        let p=0;
        const iv=setInterval(()=>{p+=Math.random()*18+5;if(p>=100){clearInterval(iv);setProgress(100);setTimeout(()=>window.location.href="/pdf-lab",400);}else setProgress(Math.min(p,99));},120);
      }}
    >
      <div style={{marginBottom:"12px"}}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{margin:"0 auto",display:"block"}}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={hovering?C.cyan:"rgba(180,200,220,0.4)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" stroke={hovering?C.cyan:"rgba(180,200,220,0.3)"} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <p style={{fontFamily:"Sora,sans-serif",fontWeight:600,fontSize:"14px",color:hovering?C.cyan:"rgba(180,200,220,0.65)",marginBottom:"4px",transition:"color 0.25s"}}>
        {uploading ? "Analysing PDF…" : "Drop a PDF to analyse it"}
      </p>
      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(130,148,168,0.45)",letterSpacing:"0.06em"}}>
        {uploading ? "Embedding & indexing…" : "or click to demo the PDF Lab"}
      </p>
      {uploading && (
        <div style={{marginTop:"14px",height:"3px",borderRadius:"9999px",background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.green},${C.cyan})`,borderRadius:"9999px",transition:"width 0.12s linear",boxShadow:`0 0 8px ${C.cyan}80`}}/>
        </div>
      )}
    </div>
  );
}

function UserProfileWidget() {
  const [user] = useState(()=>{
    try{ const t=localStorage.getItem("token"); if(t) return JSON.parse(atob(t.split(".")[1]||"")).name||"User"; } catch(_){}
    return localStorage.getItem("polynous_user") || null;
  });

  if(!user) return null;

  const initials = user.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const items = [
    {label:"My Research", icon:"biotech",    route:"/research"},
    {label:"Memory Bank", icon:"neurology",  route:"/memory"},
    {label:"Settings",    icon:"settings",   route:"/settings"},
    {label:"Logout",      icon:"logout",     action:()=>{localStorage.removeItem("polynous_user");window.location.reload();}},
  ];
  return (
    <div className="user-wrap" style={{position:"relative",display:"inline-block"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"4px 10px 4px 4px",borderRadius:"9999px",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(8,8,20,0.7)",transition:"border-color 0.2s"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:`linear-gradient(135deg,${C.green}30,${C.cyan}20)`,border:`1px solid ${C.green}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"11px",color:C.green}}>
          {initials}
        </div>
        <span style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",color:"rgba(200,215,225,0.75)",fontWeight:500}}>{user}</span>
        <span style={{fontFamily:"Material Symbols Outlined",fontSize:"14px",color:"rgba(255,255,255,0.25)"}}>expand_more</span>
      </div>
      <div className="user-dropdown">
        {items.map(item=>(
          <button key={item.label} className="user-dropdown-item" onClick={()=>item.action?item.action():window.location.href=item.route}>
            <span style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontFamily:"Material Symbols Outlined",fontSize:"15px",color:"rgba(150,165,180,0.6)"}}>{item.icon}</span>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfidenceRing() {
  const circumference = 2 * Math.PI * 35;
  const dashOffset = circumference - (92/100)*circumference;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
      <div style={{position:"relative",width:"90px",height:"90px"}}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{transform:"rotate(-90deg)"}}>
          <defs>
            <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={C.green}/>
              <stop offset="100%" stopColor={C.cyan}/>
            </linearGradient>
            <filter id="confGlow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="45" cy="45" r="35" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
          <circle cx="45" cy="45" r="35" fill="none" stroke="url(#confGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} filter="url(#confGlow)" style={{animation:"progressRing 1.8s cubic-bezier(0.22,1,0.36,1) forwards",strokeDashoffset:circumference}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <ScrambleText text="92%" style={{fontFamily:"JetBrains Mono,monospace",fontWeight:600,fontSize:"16px",color:"#fff",letterSpacing:"-0.03em"}}/>
        </div>
      </div>
      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(130,148,168,0.6)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Avg Confidence</span>
    </div>
  );
}

function QuickActionsRow() {
  const actions = [
    {label:"Export Data",    icon:"download", action:()=>{if(window.confirm("Export all research data?")) fetch("/api/export",{method:"POST"}).catch(()=>alert("Export initiated (demo)"));}},
    {label:"Clear History",  icon:"delete",   action:()=>{if(window.confirm("Clear all research history? This cannot be undone.")) fetch("/api/history",{method:"DELETE"}).catch(()=>alert("History cleared (demo)"));}},
    {label:"Reset Account",  icon:"restart_alt", action:()=>{if(window.confirm("Reset your entire account? All data will be deleted permanently.")) fetch("/api/account/reset",{method:"POST"}).catch(()=>alert("Account reset (demo)"));}},
  ];
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"6px 24px",justifyContent:"center",alignItems:"center",padding:"20px 0 0"}}>
      {actions.map((a,i)=>(
        <span key={a.label}>
          <button onClick={a.action} style={{background:"transparent",border:"none",color:"rgba(150,165,180,0.5)",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13px",cursor:"pointer",padding:"0",letterSpacing:"0.01em",display:"inline-flex",alignItems:"center",gap:"5px",transition:"color 0.2s",textDecoration:"none",position:"relative"}} onMouseOver={e=>{e.currentTarget.style.color="rgba(200,215,230,0.9)";e.currentTarget.style.textDecoration="underline";}} onMouseOut={e=>{e.currentTarget.style.color="rgba(150,165,180,0.5)";e.currentTarget.style.textDecoration="none";}}>
            <span style={{fontFamily:"Material Symbols Outlined",fontSize:"13px"}}>{a.icon}</span>
            {a.label}
          </button>
          {i < actions.length-1 && <span style={{color:"rgba(60,70,90,0.8)",marginLeft:"6px",fontSize:"13px"}}>·</span>}
        </span>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PREMIUM MEMORY BANK — enlarged, polished, animated with sparkle bursts
══════════════════════════════════════════════════════════════════ */
function MemoryTimeline() {
  const [activeId, setActiveId] = useState(MEMORY_DOTS[0].id);
  const [animating, setAnimating] = useState(null);
  const [sparkleAt, setSparkleAt] = useState(null);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);
  const inViewRef = useRef(true);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { inViewRef.current = entry.isIntersecting; }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!inViewRef.current) return; // don't animate/scroll a carousel the user isn't looking at
      setActiveId(prev => {
        const idx = MEMORY_DOTS.findIndex(d => d.id === prev);
        const next = MEMORY_DOTS[(idx + 1) % MEMORY_DOTS.length];
        setAnimating(next.id);
        setSparkleAt(next.id);
        setTimeout(() => setAnimating(null), 600);
        setTimeout(() => setSparkleAt(null), 750);
        if (scrollRef.current) {
          // Scroll only this strip's own horizontal axis — never call
          // scrollIntoView here, since it also nudges the page's vertical
          // scroll position on every ancestor, fighting the user's own scroll.
          const strip = scrollRef.current;
          const nextIdx = (idx + 1) % MEMORY_DOTS.length;
          const card = strip.querySelectorAll("[data-mem-card]")[nextIdx];
          if (card) {
            const target = card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2;
            strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
          }
        }
        return next.id;
      });
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleHover = (id) => {
    clearInterval(timerRef.current);
    setActiveId(id);
    setAnimating(id);
    setSparkleAt(id);
    setTimeout(() => setAnimating(null), 600);
    setTimeout(() => setSparkleAt(null), 750);
  };

  return (
    <div ref={wrapRef} style={{ padding: "36px 0 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative", width: "36px", height: "36px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `${C.purple}22`, border: `1px solid ${C.purple}55` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.purple}`, animation: "memoryRipple 2.5s ease-out infinite" }} />
            {/* orbiting sparkle dot */}
            <div style={{ position: "absolute", inset: "-6px", animation: "memOrbit 4s linear infinite" }}>
              <div style={{ position: "absolute", top: 0, left: "50%", width: "4px", height: "4px", borderRadius: "50%", background: C.cyan, boxShadow: `0 0 6px ${C.cyan}`, transform: "translateX(-50%)" }} />
            </div>
            <div style={{ position: "absolute", inset: "10px", borderRadius: "50%", background: C.purple, animation: "pulse 2s ease-in-out infinite", boxShadow: `0 0 12px ${C.purple}` }} />
          </div>
          <div>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "14px", color: "#fff", margin: 0 }}>Memory Bank</p>
            <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "9.5px", color: "rgba(180,160,235,0.55)", letterSpacing: "0.12em", margin: "2px 0 0" }}>{MEMORY_DOTS.length} SESSIONS · LIVE SYNC</p>
          </div>
        </div>
        <a href="/memory" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "9999px", border: `1px solid ${C.purple}40`, background: `${C.purple}0a`, color: C.purple, fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "12px", textDecoration: "none", transition: "all 0.25s" }} onMouseOver={e => { e.currentTarget.style.background = `${C.purple}18`; e.currentTarget.style.borderColor = `${C.purple}80`; }} onMouseOut={e => { e.currentTarget.style.background = `${C.purple}0a`; e.currentTarget.style.borderColor = `${C.purple}40`; }}>
          Open Memory Bank
          <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "14px" }}>arrow_outward</span>
        </a>
      </div>

      {/* Animated timeline line */}
      <div style={{ position: "relative", marginBottom: "28px" }}>
        <div style={{ height: "2px", borderRadius: "9999px", background: `linear-gradient(90deg,${C.purple}80,${C.cyan}60,${C.green}50,${C.amber}50,${C.crimson}50,${C.teal}60,${C.indigo}70,${C.gold}60)`, backgroundSize: "200% 100%", animation: "timelineFlow 4s linear infinite", boxShadow: `0 0 12px ${C.purple}50` }} />
      </div>

      {/* Cards grid */}
      <div ref={scrollRef} className="no-scrollbar" style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "16px", scrollbarWidth: "none" }}>
        {MEMORY_DOTS.map((dot, i) => {
          const isActive = activeId === dot.id;
          const isAnim = animating === dot.id;
          const isSparkling = sparkleAt === dot.id;
          const dotColor = MEMORY_COLORS[i % MEMORY_COLORS.length];

          return (
            <div
              key={dot.id}
              data-mem-card=""
              className="mem-card"
              onMouseEnter={() => handleHover(dot.id)}
              onClick={() => window.location.href = "/memory"}
              style={{
                flex: "0 0 auto",
                width: "200px",
                cursor: "pointer",
                borderRadius: "18px",
                padding: "20px 18px",
                background: isActive
                  ? `linear-gradient(145deg,${dotColor}18,rgba(8,8,22,0.95))`
                  : "rgba(8,8,22,0.75)",
                border: `1px solid ${isActive ? dotColor + "70" : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive
                  ? `0 0 0 1px ${dotColor}20, 0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${dotColor}18`
                  : "none",
                transition: "all 0.45s cubic-bezier(0.23,1,0.32,1)",
                transform: isActive ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
                animation: isAnim ? "memorySlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                backdropFilter: "blur(16px)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Top shimmer line */}
              <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "1px", background: `linear-gradient(90deg,transparent,${dotColor}${isActive ? "cc" : "30"},transparent)`, transition: "all 0.4s ease" }} />

              {/* Sparkle burst on activation */}
              {isSparkling && [0,1,2,3].map(k=>(
                <span key={k} style={{
                  position:"absolute", top:`${14+k*8}%`, left:`${20+k*22}%`,
                  fontSize:"10px", color:dotColor, pointerEvents:"none",
                  animation:`memSparkle 0.7s ${k*0.06}s ease-out`,
                }}>✦</span>
              ))}

              {/* Dot indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ position: "relative", width: "10px", height: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColor, boxShadow: isActive ? `0 0 10px ${dotColor}` : "none", transition: "box-shadow 0.3s", position: "relative", zIndex: 1 }} />
                  {isActive && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: dotColor, animation: "memoryRipple 1.2s ease-out infinite" }} />}
                </div>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: dotColor, letterSpacing: "0.08em", opacity: 0.85 }}>{dot.date}</span>
              </div>

              {/* Query text */}
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "13px", color: isActive ? "#fff" : "rgba(190,205,220,0.65)", lineHeight: 1.45, margin: "0 0 14px", transition: "color 0.3s" }}>
                {dot.query}
              </p>

              {/* Footer tag */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "Material Symbols Outlined", fontSize: "13px", color: dotColor, opacity: isActive ? 1 : 0.4, transition: "opacity 0.3s" }}>{dot.icon}</span>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: dotColor, opacity: isActive ? 0.9 : 0.35, letterSpacing: "0.06em", transition: "opacity 0.3s" }}>{dot.tag}</span>
              </div>

              {/* Session index */}
              <div style={{ position: "absolute", top: "16px", right: "14px", fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em" }}>#{String(i + 1).padStart(2, "0")}</div>
            </div>
          );
        })}
      </div>

      {/* Progress indicators */}
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "20px" }}>
        {MEMORY_DOTS.map((dot, i) => {
          const dotColor = MEMORY_COLORS[i % MEMORY_COLORS.length];
          const isActive = activeId === dot.id;
          return (
            <button key={dot.id} onClick={() => handleHover(dot.id)} style={{ width: isActive ? "24px" : "6px", height: "6px", borderRadius: "9999px", background: isActive ? dotColor : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.35s cubic-bezier(0.23,1,0.32,1)", boxShadow: isActive ? `0 0 8px ${dotColor}80` : "none" }} />
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsMiniPreview() {
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const maxR = Math.max(...SPARKLINE_RESEARCH);

  useEffect(()=>{
    const el = wrapRef.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{if(e.isIntersecting){setVisible(true);obs.unobserve(el);}},{threshold:0.25});
    obs.observe(el);
    return()=>obs.disconnect();
  },[]);

  const sparklinePath = (data, max, w, h) => {
    const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-(v/max)*h}`);
    return `M ${pts.join(" L ")}`;
  };
  const resPath = sparklinePath(SPARKLINE_RESEARCH,maxR,150,52);
  const confPath = sparklinePath(SPARKLINE_CONF,100,150,52);

  return (
    <div ref={wrapRef} onClick={()=>window.location.href="/analytics"} style={{borderRadius:"22px",padding:"2px",cursor:"pointer",position:"relative",background:visible?"linear-gradient(135deg,rgba(255,170,0,0.22),rgba(0,204,255,0.08),rgba(168,85,247,0.1),transparent)":"rgba(255,255,255,0.04)",transition:"background 1s ease"}}>
      <div style={{borderRadius:"21px",padding:"26px 28px",background:"rgba(7,7,18,0.95)",border:"1px solid rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",transition:"transform 0.35s cubic-bezier(0.23,1,0.32,1)",overflow:"hidden",position:"relative"}} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-4px)";}} onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}>
        {visible && <div style={{position:"absolute",top:0,left:"-30%",width:"30%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)",animation:"scanSweep 1.6s ease-out forwards",pointerEvents:"none"}}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"rgba(255,170,0,0.1)",border:"1px solid rgba(255,170,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"Material Symbols Outlined",fontSize:"18px",color:C.amber}}>insights</span>
            </div>
            <div>
              <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"14px",color:"#fff",margin:0}}>Analytics Dashboard</p>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9.5px",color:"rgba(130,148,168,0.5)",margin:"2px 0 0",letterSpacing:"0.06em"}}>OPEN FULL DASHBOARD →</p>
            </div>
          </div>
          <div style={{display:"flex",gap:"4px"}}>
            {[C.green,C.cyan,C.purple].map((c,i)=>(<div key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:c,animation:`pulse 1.8s ${i*0.25}s ease-in-out infinite`}}/>))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1.1fr 0.9fr 1.1fr",gap:"22px"}}>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:C.green,letterSpacing:"0.1em",marginBottom:"10px",opacity:0.85}}>RESEARCH / WEEK</p>
            <svg width="100%" height="52" viewBox="0 0 150 52" preserveAspectRatio="none">
              <defs><linearGradient id="resGradFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity="0.35"/><stop offset="100%" stopColor={C.green} stopOpacity="0"/></linearGradient></defs>
              <path d={resPath+" L 150,52 L 0,52 Z"} fill="url(#resGradFill)" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.6s"}}/>
              <path d={resPath} fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="240" strokeDashoffset={visible?0:240} style={{transition:"stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s",filter:`drop-shadow(0 0 4px ${C.green}80)`}}/>
              {SPARKLINE_RESEARCH.map((v,i)=>{const x=(i/(SPARKLINE_RESEARCH.length-1))*150,y=52-(v/maxR)*52;return i===SPARKLINE_RESEARCH.length-1?(<circle key={i} cx={x} cy={y} r="3" fill={C.green} style={{opacity:visible?1:0,transition:"opacity 0.4s ease 1.5s",filter:`drop-shadow(0 0 6px ${C.green})`}}/>):null;})}
            </svg>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"15px",color:"#fff",fontWeight:600,margin:"6px 0 0",letterSpacing:"-0.02em"}}>+40<span style={{fontSize:"10px",color:C.green,marginLeft:"4px"}}>this week</span></p>
          </div>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:C.cyan,letterSpacing:"0.1em",marginBottom:"10px",opacity:0.85}}>TOP TOPICS</p>
            <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
              {TOP_TOPICS.map((t,i)=>(
                <div key={t.label} style={{display:"flex",alignItems:"center",gap:"7px"}}>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"8.5px",color:"rgba(150,165,180,0.6)",minWidth:"40px"}}>{t.label}</span>
                  <div style={{flex:1,height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
                    <div style={{width:visible?`${t.val}%`:"0%",height:"100%",borderRadius:"3px",background:`linear-gradient(90deg,${t.color}aa,${t.color})`,boxShadow:`0 0 6px ${t.color}60`,transition:`width 0.9s cubic-bezier(0.22,1,0.36,1) ${0.3+i*0.12}s`}}/>
                  </div>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"8.5px",color:t.color,minWidth:"20px",textAlign:"right",opacity:visible?1:0,transition:`opacity 0.4s ease ${0.8+i*0.12}s`}}>{t.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:C.purple,letterSpacing:"0.1em",marginBottom:"10px",opacity:0.85}}>CONFIDENCE TREND</p>
            <svg width="100%" height="52" viewBox="0 0 150 52" preserveAspectRatio="none">
              <defs><linearGradient id="confGradFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.purple} stopOpacity="0.3"/><stop offset="100%" stopColor={C.purple} stopOpacity="0"/></linearGradient></defs>
              <path d={confPath+" L 150,52 L 0,52 Z"} fill="url(#confGradFill)" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.9s"}}/>
              <path d={confPath} fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="240" strokeDashoffset={visible?0:240} style={{transition:"stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1) 0.4s",filter:`drop-shadow(0 0 4px ${C.purple}80)`}}/>
            </svg>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"15px",color:"#fff",fontWeight:600,margin:"6px 0 0",letterSpacing:"-0.02em"}}>94<span style={{fontSize:"10px",color:C.purple,marginLeft:"2px"}}>% avg</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PREMIUM INTERACTIVE KNOWLEDGE GRAPH — smoothed drag, solid-color nodes
══════════════════════════════════════════════════════════════════════════ */
function PremiumKnowledgeGraph({ embedded = false, onNodeCountChange }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    nodes: GRAPH_NODES_DATA.map(n => ({
      ...n,
      vx: 0, vy: 0,
      dragging: false,
      targetX: n.x, targetY: n.y, // smooth-follow target while dragging — no snapping
      glowPhase: Math.random() * Math.PI * 2,
      scale: 1, scaleTarget: 1,
      birthTs: 0, born: true,
    })),
    edges: [...GRAPH_EDGES],
    draggingIdx: null,
    hoveredIdx: null,
    nextId: GRAPH_NODES_DATA.length,
    raf: null,
    lastTs: 0,
    particles: [],
    ripples: [],
    nodeCount: GRAPH_NODES_DATA.length,
    paused: false,
    W: 700, H: 360,
  });
  const [nodeCount, setNodeCount] = useState(GRAPH_NODES_DATA.length);
  const [tooltip, setTooltip] = useState(null);

  const LABEL_POOL = ["Concept","Pattern","Theory","Idea","Link","Model","Node","Fact","Signal","System","Entity","Domain","Insight","Layer","Vector"];
  const COLOR_POOL = [C.green, C.cyan, C.purple, C.crimson, C.amber, C.teal, C.gold, C.indigo];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    const s = stateRef.current;

    s.nodes.forEach(n => { n.birthTs = -2000; });

    // The canvas previously had a fixed 1100x460 pixel buffer stretched by CSS
    // to fill its container, with no devicePixelRatio scaling — soft/blurry on
    // any retina-class screen. fitCanvas sizes the backing buffer to match the
    // element's actual CSS size × devicePixelRatio, then maps 1 drawing unit to
    // 1 CSS pixel via setTransform, so everything below can keep working in
    // simple logical coordinates while rendering crisply at native resolution.
    function fitCanvas() {
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.W = w; s.H = h;
    }
    fitCanvas();

    function lerp(a, b, t) { return a + (b - a) * t; }

    function applyPhysics(dt) {
      const W = s.W, H = s.H;
      s.nodes.forEach((n, i) => {
        if (n.dragging) {
          // ease smoothly toward the pointer target — eliminates the old hard snap
          n.x = lerp(n.x, n.targetX, Math.min(1, 0.22 * dt));
          n.y = lerp(n.y, n.targetY, Math.min(1, 0.22 * dt));
          return;
        }
        s.nodes.forEach((m, j) => {
          if (i === j) return;
          const dx = n.x - m.x, dy = n.y - m.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const ideal = (n.r + m.r) * 5;
          if (d < ideal) {
            const f = ((ideal - d) / ideal) * 0.3;
            n.vx += (dx/d)*f; n.vy += (dy/d)*f;
          }
        });
        s.edges.forEach(([a,b]) => {
          const other = a===i ? s.nodes[b] : b===i ? s.nodes[a] : null;
          if (!other) return;
          const dx = other.x - n.x, dy = other.y - n.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const ideal = 145;
          const f = ((d - ideal)/ideal)*0.038;
          n.vx += (dx/d)*f; n.vy += (dy/d)*f;
        });
        n.vx += (W/2 - n.x)*0.00035;
        n.vy += (H/2 - n.y)*0.00035;
        // heavier damping → calmer, less snappy motion
        n.vx *= 0.9; n.vy *= 0.9;
        n.x += n.vx * dt; n.y += n.vy * dt;
        n.x = Math.max(n.r+14, Math.min(W-n.r-14, n.x));
        n.y = Math.max(n.r+14, Math.min(H-n.r-14, n.y));
      });
    }

    function draw(ts) {
      if (s.paused) { s.raf = requestAnimationFrame(draw); return; }
      if (!s.lastTs) s.lastTs = ts;
      const dt = Math.min((ts - s.lastTs) / 16.67, 2.5);
      s.lastTs = ts;

      ctx.clearRect(0, 0, s.W, s.H);
      applyPhysics(dt);

      // subtle dot grid
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      for (let gx = 38; gx < s.W; gx += 38) {
        for (let gy = 38; gy < s.H; gy += 38) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.7, 0, Math.PI*2); ctx.fill();
        }
      }

      // ── Edges ──
      s.edges.forEach(([a, b]) => {
        const na = s.nodes[a], nb = s.nodes[b];
        if (!na || !nb) return;
        const hov = s.hoveredIdx === a || s.hoveredIdx === b;
        const phase = 0.5 + 0.5 * Math.sin(ts * 0.00085 + a * 0.8 + b * 1.3);

        // glow haze
        ctx.beginPath();
        ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = hov ? `rgba(0,200,255,${0.06+phase*0.1})` : `rgba(70,90,160,${0.03+phase*0.03})`;
        ctx.lineWidth = hov ? 8 : 4;
        ctx.filter = "blur(4px)"; ctx.stroke(); ctx.filter = "none";

        // crisp line — brighter than before for clarity
        ctx.beginPath();
        ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = hov ? `rgba(0,200,255,${0.55+phase*0.3})` : `rgba(120,140,210,${0.16+phase*0.08})`;
        ctx.lineWidth = hov ? 1.8 : 1.1;
        ctx.setLineDash(hov ? [] : [5, 9]);
        ctx.lineDashOffset = -(ts * 0.013); // slower dash flow = calmer feel
        ctx.stroke(); ctx.setLineDash([]);
      });

      // ── Particles along edges ──
      s.particles = s.particles.filter(p => p.t < 1);
      s.particles.forEach(p => {
        p.t += p.speed * dt;
        const na = s.nodes[p.a], nb = s.nodes[p.b];
        if (!na || !nb) return;
        const x = na.x + (nb.x - na.x) * p.t;
        const y = na.y + (nb.y - na.y) * p.t;
        const alpha = Math.sin(p.t * Math.PI);
        const r = 1.8 + alpha * 2.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.globalAlpha = alpha * 0.85; ctx.fill();
        const tx2 = na.x + (nb.x - na.x) * Math.max(0, p.t - 0.07);
        const ty2 = na.y + (nb.y - na.y) * Math.max(0, p.t - 0.07);
        ctx.beginPath(); ctx.arc(tx2, ty2, r * 0.4, 0, Math.PI*2);
        ctx.globalAlpha = alpha * 0.2; ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Ripples ──
      s.ripples = s.ripples.filter(r => r.t < r.maxT);
      s.ripples.forEach(r => {
        r.t += dt;
        const prog = r.t / r.maxT;
        ctx.beginPath(); ctx.arc(r.x, r.y, prog * 55, 0, Math.PI*2);
        ctx.strokeStyle = r.color; ctx.globalAlpha = (1-prog) * 0.55;
        ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
      });

      // ── Nodes — solid premium fill, crisp legible labels, smooth scaling ──
      s.nodes.forEach((n, i) => {
        const isHov = s.hoveredIdx === i;
        n.scaleTarget = isHov ? 1.14 : (n.dragging ? 1.08 : 1);
        n.scale = lerp(n.scale, n.scaleTarget, Math.min(1, 0.14 * dt)); // slower lerp = no snap
        const scale = n.scale;
        const r = n.r * scale;
        const glow = 0.5 + 0.5 * Math.sin(ts * 0.0012 + n.glowPhase);

        ctx.save();
        ctx.translate(n.x, n.y);

        // soft halo — breathes smoothly
        const haloR = r * 2.6 + glow * 5;
        const haloA = isHov ? 0.5 : 0.18 + glow * 0.12;
        const halo = ctx.createRadialGradient(0,0,r*0.6,0,0,haloR);
        halo.addColorStop(0, n.color + Math.round(haloA * 255).toString(16).padStart(2,"0"));
        halo.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI*2);
        ctx.fillStyle = halo; ctx.fill();

        // solid node body — premium flat fill (no washed-out low-alpha gradient)
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // gentle glass-like inner shading for depth, kept subtle so the fill stays solid
        const shade = ctx.createRadialGradient(-r*0.25,-r*0.3,0,0,0,r);
        shade.addColorStop(0, "rgba(255,255,255,0.24)");
        shade.addColorStop(0.55, "rgba(255,255,255,0)");
        shade.addColorStop(1, "rgba(0,0,0,0.16)");
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fillStyle = shade; ctx.fill();

        // crisp border ring
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.strokeStyle = isHov ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)";
        ctx.lineWidth = isHov ? 2 : 1.2;
        ctx.stroke();

        // outer pulse ring when hovered
        if (isHov) {
          const pr = r + 6 + glow * 4;
          ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI*2);
          ctx.strokeStyle = n.color + "60"; ctx.lineWidth = 1; ctx.stroke();
        }

        ctx.restore();

        // Label — rendered below the node, not crammed inside it, so it stays
        // legible regardless of node radius (small nodes were unreadable before).
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.font = `${isHov ? "700" : "600"} ${isHov ? 13 : 12}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.shadowColor = n.color; ctx.shadowBlur = isHov ? 10 : 5;
        ctx.fillStyle = isHov ? "rgba(255,255,255,0.98)" : "rgba(235,240,248,0.88)";
        ctx.fillText(n.label, n.x, n.y + r + 7);
        ctx.restore();
      });

      s.raf = requestAnimationFrame(draw);
    }

    // ── helpers ──
    function getXY(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    function hitNode(x, y) {
      return s.nodes.findIndex(n => Math.hypot(n.x - x, n.y - y) < n.r * n.scale + 7);
    }

    // periodic particles — slightly slower cadence for a calmer, premium pace
    const particleTimer = setInterval(() => {
      if (!s.edges.length) return;
      const [a, b] = s.edges[Math.floor(Math.random() * s.edges.length)];
      if (!s.nodes[a] || !s.nodes[b]) return;
      s.particles.push({ a, b, t: 0, speed: 0.0032 + Math.random() * 0.0026, color: s.nodes[a].color });
    }, 650);

    const onMouseDown = e => {
      const { x, y } = getXY(e);
      const idx = hitNode(x, y);
      if (idx >= 0) {
        s.draggingIdx = idx;
        s.nodes[idx].dragging = true;
        s.nodes[idx].targetX = x;
        s.nodes[idx].targetY = y;
        s.nodes[idx].vx = 0; s.nodes[idx].vy = 0;
      }
    };

    const onMouseMove = e => {
      const { x, y } = getXY(e);
      s.hoveredIdx = hitNode(x, y);
      if (s.draggingIdx !== null) {
        s.nodes[s.draggingIdx].targetX = x;
        s.nodes[s.draggingIdx].targetY = y;
        s.hoveredIdx = s.draggingIdx;
      }
      if (s.hoveredIdx >= 0) {
        const n = s.nodes[s.hoveredIdx];
        const rect = canvas.getBoundingClientRect();
        setTooltip({ x: n.x+rect.left, y: n.y+rect.top - n.r*n.scale - 12, label: n.label, color: n.color });
        canvas.style.cursor = s.draggingIdx !== null ? "grabbing" : "grab";
      } else {
        setTooltip(null);
        canvas.style.cursor = "crosshair";
      }
    };

    const onMouseUp = () => {
      if (s.draggingIdx !== null) { s.nodes[s.draggingIdx].dragging = false; s.draggingIdx = null; }
    };

    const onClick = e => {
      const { x, y } = getXY(e);
      if (hitNode(x, y) >= 0) return;
      const id = s.nextId;
      const color = COLOR_POOL[id % COLOR_POOL.length];
      const label = LABEL_POOL[id % LABEL_POOL.length];
      const newNode = {
        id, x, y, r: 11 + Math.random() * 5, color, label,
        vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5,
        dragging: false, targetX: x, targetY: y, glowPhase: Math.random()*Math.PI*2,
        scale: 0.01, scaleTarget: 1, // start tiny → animate in smoothly
        birthTs: ts,
      };
      const sorted = s.nodes.map((n,i)=>({i,d:Math.hypot(n.x-x,n.y-y)})).sort((a,b)=>a.d-b.d);
      sorted.slice(0,Math.min(2,sorted.length)).forEach(({i})=>{
        s.edges.push([i,id]);
        s.particles.push({a:i,b:id,t:0,speed:0.006,color});
      });
      s.nodes.push(newNode);
      s.nextId++; s.nodeCount = s.nodes.length;
      setNodeCount(s.nodes.length);
      if (onNodeCountChange) onNodeCountChange(s.nodes.length);
      s.ripples.push({x,y,color,t:0,maxT:22});
    };

    let ts = 0;
    const drawWrapped = (t) => { ts = t; draw(t); };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", () => { s.hoveredIdx = null; setTooltip(null); });
    window.addEventListener("mouseup", onMouseUp);

    const visObserver = new IntersectionObserver(([entry]) => { s.paused = !entry.isIntersecting; }, { threshold: 0.05 });
    visObserver.observe(canvas);

    let resizeTimer = null;
    const onWindowResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitCanvas, 150); };
    window.addEventListener("resize", onWindowResize, { passive: true });

    s.raf = requestAnimationFrame(drawWrapped);

    return () => {
      cancelAnimationFrame(s.raf);
      clearInterval(particleTimer);
      clearTimeout(resizeTimer);
      visObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", () => {});
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={1100}
        height={460}
        style={{ width: "100%", height: embedded ? "460px" : "360px", display: "block" }}
      />
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x, top: tooltip.y,
          transform: "translate(-50%,-100%)",
          background: "rgba(4,4,18,0.96)",
          border: `1px solid ${tooltip.color}60`,
          borderRadius: "9px", padding: "5px 13px",
          fontFamily: "JetBrains Mono,monospace", fontSize: "11px", color: tooltip.color,
          pointerEvents: "none", zIndex: 9999,
          backdropFilter: "blur(14px)",
          boxShadow: `0 6px 24px rgba(0,0,0,0.55), 0 0 14px ${tooltip.color}22`,
          whiteSpace: "nowrap",
          animation: "tooltipFade 0.18s cubic-bezier(0.23,1,0.32,1)",
          letterSpacing: "0.06em",
        }}>
          {tooltip.label}
          <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 8, height: 6, overflow: "hidden" }}>
            <div style={{ width: 8, height: 8, background: "rgba(4,4,18,0.96)", border: `1px solid ${tooltip.color}60`, transform: "rotate(45deg)", transformOrigin: "top left", marginTop: -4 }} />
          </div>
        </div>
      )}
    </div>
  );
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
          <UserProfileWidget/>
          <button
            onClick={()=>window.location.href="/auth"}
            style={{padding:"7px 18px",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"9999px",background:"transparent",color:"rgba(255,255,255,0.45)",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",fontWeight:500,cursor:"pointer",transition:"all 0.25s",letterSpacing:"0.01em"}}
            onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(0,204,255,0.35)";e.currentTarget.style.color=C.cyan;}}
            onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.45)";}}>
            Sign In
          </button>
          <button
            onClick={()=>window.location.href="/auth"}
            style={{padding:"7px 20px",background:`linear-gradient(135deg,${C.green},#19e81f)`,border:"none",borderRadius:"9999px",color:C.void,fontFamily:"Sora,sans-serif",fontSize:"14px",fontWeight:800,cursor:"pointer",transition:"all 0.25s",boxShadow:`0 0 20px rgba(0,255,15,0.25),0 2px 8px rgba(0,255,15,0.15)`,letterSpacing:"0.02em"}}
            onMouseOver={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow=`0 0 32px rgba(0,255,15,0.4),0 4px 16px rgba(0,255,15,0.2)`;}}
            onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 0 20px rgba(0,255,15,0.25),0 2px 8px rgba(0,255,15,0.15)`;}}>
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

      <h1 className="reveal hero-title" ref={useReveal(0.05)} style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(4rem,10.5vw,10rem)",lineHeight:0.86,letterSpacing:"-0.065em",marginBottom:"24px"}}>
        <span style={{background:"linear-gradient(165deg,#ffffff 20%,rgba(0,255,15,0.8) 52%,rgba(0,204,255,0.65) 82%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 40px rgba(0,255,15,0.12))"}}>Research</span>
        <br/>
        <span style={{background:"linear-gradient(165deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0.16) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>beyond answers.</span>
      </h1>

      <p className="reveal" ref={useReveal(0.05)} style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"clamp(16px,1.9vw,20px)",color:"rgba(130,148,168,0.88)",maxWidth:"580px",lineHeight:1.75,marginBottom:"24px",fontWeight:400,transitionDelay:"0.14s"}}>
        Seven specialized AI agents that search, analyze, debate, and synthesize — delivering comprehensive research, not just responses.
      </p>

      <div className="reveal search-bar search-focus" ref={useReveal(0.05)} style={{width:"min(760px,100%)",marginBottom:"10px",display:"flex",alignItems:"center",gap:"10px",padding:"7px",borderRadius:"9999px",background:"rgba(10,10,22,0.8)",border:`1px solid ${focused?"rgba(0,255,15,0.35)":"rgba(255,255,255,0.06)"}`,transitionDelay:"0.2s",transition:"border-color 0.25s,box-shadow 0.25s",backdropFilter:"blur(20px)"}}>
        <span style={{fontFamily:"Material Symbols Outlined",fontSize:"19px",color:"rgba(255,255,255,0.18)",padding:"0 4px 0 16px",flexShrink:0}}>search</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="What do you want to research?" style={{flex:1,height:"50px",padding:"0 8px",background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",fontWeight:400}}/>
        <button onClick={()=>go()} style={{height:"50px",padding:"0 26px",borderRadius:"9999px",border:"none",background:`linear-gradient(135deg,${C.green},#19e81f)`,color:C.void,cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"14px",fontWeight:800,flexShrink:0,transition:"all 0.22s",letterSpacing:"0.04em",boxShadow:`0 0 20px rgba(0,255,15,0.3)`}} onMouseOver={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow=`0 0 32px rgba(0,255,15,0.5)`;}} onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 0 20px rgba(0,255,15,0.3)`;}}>Go →</button>
      </div>

      <div className="reveal" ref={useReveal(0.05)} style={{display:"flex",flexWrap:"wrap",justifyContent:"center",marginBottom:"32px",transitionDelay:"0.25s"}}>
        {QEXS.map((ex,i)=>(
          <button key={ex} onClick={()=>go(ex)} style={{background:"transparent",border:"none",color:"rgba(100,118,150,0.65)",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:"11px",padding:"0 2px",transition:"color 0.2s",letterSpacing:"0.01em"}} onMouseOver={e=>e.currentTarget.style.color=C.cyan} onMouseOut={e=>e.currentTarget.style.color="rgba(100,118,150,0.65)"}>
            {ex}{i<QEXS.length-1&&<span style={{color:"rgba(35,45,65,0.9)",padding:"0 10px"}}>·</span>}
          </button>
        ))}
      </div>

      <div className="reveal" ref={useReveal(0.05)} style={{display:"flex",flexWrap:"wrap",gap:"12px",justifyContent:"center",marginBottom:"72px",transitionDelay:"0.3s"}}>
        <div style={{padding:"2px",borderRadius:"9999px",background:"conic-gradient(from 0deg,#ff0000,#ff8800,#ffff00,#00ff0f,#00ccff,#a855f7,#ff0088,#ff0000)",animation:"rainbowSpin 4s linear infinite",boxShadow:"0 0 32px rgba(0,255,15,0.15),0 0 64px rgba(0,204,255,0.08)"}}>
          <button onClick={()=>window.location.href="/auth"} style={{padding:"13px 32px",background:"rgba(6,6,16,0.95)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"16px",fontWeight:800,color:"#fff",backdropFilter:"blur(20px)",letterSpacing:"-0.01em",transition:"transform 0.25s ease,background 0.25s ease"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.background="rgba(6,6,16,0.85)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background="rgba(6,6,16,0.95)";}}>
            Start Research →
          </button>
        </div>
        <button
          onClick={()=>window.location.href="/debate?topic=Should+AI+be+regulated%3F"}
          style={{padding:"13px 28px",borderRadius:"9999px",border:`1.5px solid ${C.crimson}`,background:`linear-gradient(135deg,rgba(255,32,64,0.16),rgba(255,32,64,0.07))`,color:"#ff4868",fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"15px",cursor:"pointer",letterSpacing:"0.02em",transition:"all 0.25s cubic-bezier(0.23,1,0.32,1)",display:"inline-flex",alignItems:"center",gap:"8px",animation:"crimsonPulse 2.4s ease-in-out infinite",textShadow:`0 0 14px rgba(255,32,64,0.9)`}}
          onMouseOver={e=>{e.currentTarget.style.animation="none";e.currentTarget.style.background=`linear-gradient(135deg,rgba(255,32,64,0.28),rgba(255,32,64,0.14))`;e.currentTarget.style.boxShadow=`0 0 32px rgba(255,32,64,0.7), 0 0 70px rgba(255,32,64,0.35)`;e.currentTarget.style.transform="scale(1.06)";}}
          onMouseOut={e=>{e.currentTarget.style.animation="crimsonPulse 2.4s ease-in-out infinite";e.currentTarget.style.background=`linear-gradient(135deg,rgba(255,32,64,0.16),rgba(255,32,64,0.07))`;e.currentTarget.style.boxShadow="";e.currentTarget.style.transform="scale(1)";}}
        >
          <span style={{fontFamily:"Material Symbols Outlined",fontSize:"16px"}}>balance</span> Try a Debate
        </button>
        <a href="#how-it-works" style={{padding:"12px 28px",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.55)",fontWeight:600,borderRadius:"9999px",background:"transparent",fontFamily:"Sora,sans-serif",fontSize:"16px",textDecoration:"none",transition:"all 0.25s",display:"inline-flex",alignItems:"center"}} onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(0,204,255,0.35)";e.currentTarget.style.color=C.cyan;}} onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}>
          See How It Works ↓
        </a>
      </div>

      <div className="reveal terminal-bg" ref={useReveal(0.1)} style={{padding:"22px 26px",borderRadius:"16px",width:"min(440px,100%)",textAlign:"left",transitionDelay:"0.38s",position:"relative",overflow:"hidden",boxShadow:`0 24px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04)`}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${C.green}50,transparent)`}}/>
        <div style={{position:"absolute",top:"10%",left:0,right:0,height:"1px",background:"rgba(0,255,15,0.03)",animation:"scanH 5s linear infinite"}}/>
        <div style={{display:"flex",gap:"7px",marginBottom:"14px"}}>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.crimson,opacity:0.7}}/>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.gold,opacity:0.7}}/>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:C.green,opacity:0.7}}/>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:"rgba(255,255,255,0.18)",marginLeft:"10px",lineHeight:"10px"}}>polynous — neural-mesh</span>
        </div>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"13px",color:C.green}}><span style={{color:"rgba(100,118,170,0.5)"}}>$ </span>uvicorn main:app --reload</div>
        <div style={{marginTop:"10px"}}>
          <TerminalTypewriter sequences={HERO_BOOT_SEQUENCES} minLines={4}/>
        </div>
        <div style={{marginTop:"14px"}}>
          <BYOKBadge/>
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

      {/* ENLARGED MEMORY BANK */}
      <div className="reveal" ref={useReveal(0.1)} style={{
        marginTop:"64px",
        padding:"36px 36px 40px",
        borderRadius:"28px",
        background:"linear-gradient(145deg,rgba(168,85,247,0.06),rgba(8,8,22,0.9))",
        border:"1px solid rgba(168,85,247,0.14)",
        position:"relative",
        overflow:"hidden",
        boxShadow:"0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(168,85,247,0.08)",
      }}>
        {/* decorative corner glow */}
        <div style={{position:"absolute",top:0,right:0,width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)",pointerEvents:"none",transform:"translate(50%,-50%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,204,255,0.06) 0%,transparent 70%)",pointerEvents:"none",transform:"translate(-30%,30%)"}}/>
        <MemoryTimeline/>
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
              <span style={{display:"inline-block",padding:"4px 14px",borderRadius:"9999px",background:`linear-gradient(135deg,${C.green},#19e81f)`,color:C.void,fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"10px",letterSpacing:"0.14em",marginBottom:"22px"}}>BYOK — BRING YOUR OWN INTELLIGENCE</span>
              <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,3.4vw,2.7rem)",marginBottom:"16px",lineHeight:1.08,letterSpacing:"-0.04em",color:"#fff"}}>Total model<br/><span style={{color:C.green}}>sovereignty.</span></h2>
              <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,marginBottom:"28px"}}>Model-agnostic by design. Bring your own Anthropic or OpenAI key — POLYNOUS routes each agent to your preferred provider with zero lock-in.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"28px"}}>
                {[{label:"Anthropic (Claude)",color:C.green},{label:"OpenAI (GPT-4o)",color:C.cyan}].map(({label,color})=>(
                  <div key={label} style={{padding:"6px 14px",borderRadius:"9999px",display:"flex",alignItems:"center",gap:"8px",background:`${color}08`,border:`1px solid ${color}22`}}>
                    <div className="animate-pulse-dot" style={{width:"5px",height:"5px",borderRadius:"50%",background:color}}/>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"12px",color}}>{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>window.location.href="/settings"} style={{padding:"13px 26px",background:"#fff",color:C.void,fontWeight:800,borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"14px",display:"inline-flex",alignItems:"center",gap:"8px",transition:"all 0.25s",letterSpacing:"0.02em"}} onMouseOver={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.boxShadow="0 0 32px rgba(255,255,255,0.18)";}} onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
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
                <p style={{paddingLeft:"16px",color:"rgba(220,228,240,0.72)"}}>search: <ScrambleText text={'"anthropic/claude-sonnet"'} style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{paddingLeft:"16px",color:"rgba(220,228,240,0.72)"}}>summarise: <ScrambleText text={'"anthropic/claude-sonnet"'} style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{paddingLeft:"16px",color:"rgba(220,228,240,0.72)"}}>critic: <ScrambleText text={'"openai/gpt-4o"'} style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{paddingLeft:"16px",color:"rgba(220,228,240,0.72)"}}>writer: <ScrambleText text={'"anthropic/claude-sonnet"'} style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{paddingLeft:"16px",color:"rgba(220,228,240,0.72)"}}>judge: <ScrambleText text={'"openai/gpt-4o"'} style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{marginTop:"8px",color:"rgba(220,228,240,0.5)"}}>embeddings: <ScrambleText text={'"openai/text-embedding-3"'} style={{color:C.cyan}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{color:"rgba(220,228,240,0.5)"}}>key_encryption: <ScrambleText text="fernet" style={{color:C.amber}} loop loopMin={5000} loopMax={10000}/></p>
                <p style={{color:"rgba(220,228,240,0.5)"}}>stored_per_user: <ScrambleText text="true" style={{color:C.green}} loop loopMin={5000} loopMax={10000}/></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features ─────────────────────────────────────────────────────────────── */
function FeaturesSection(){
  const headRef=useReveal(0.1),gridRef=useReveal(0.07);
  return(
    <section id="features" style={{padding:"96px 0 24px"}}>
      <SectionDivider/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end",marginBottom:"60px"}} className="hiw-grid">
        <div ref={headRef} className="reveal">
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"16px",opacity:0.8}}>↓ Capabilities</p>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.4rem,5.5vw,4.6rem)",lineHeight:0.9,letterSpacing:"-0.055em",color:"#fff",margin:0}}>Seven agents.<br/>One surface.</h2>
        </div>
        <p ref={useReveal(0.1)} className="reveal" style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px",transitionDelay:"0.08s"}}>Every feature built for inquiry that needs to be inspected, traced, and revisited.</p>
      </div>
      <div ref={gridRef} className="reveal-stagger features-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        {FEATURES.map(f=>(
          <button key={f.title} className={`feat-card corner-brackets ${f.cls}`} onClick={()=>window.location.href=f.route} style={{minHeight:"260px",display:"flex",flexDirection:"column",alignItems:"flex-start",textAlign:"left",padding:"28px 26px 24px",borderRadius:"20px",border:`1px solid rgba(255,255,255,0.055)`,background:"rgba(10,10,22,0.85)",cursor:"pointer",position:"relative",backdropFilter:"blur(16px)",color:f.color}}>
            <div className="feat-top-line" style={{position:"absolute",top:0,left:"15%",right:"15%",height:"2px",background:`linear-gradient(90deg,transparent,${f.color}80,transparent)`,borderRadius:"1px",opacity:0,transition:"opacity 0.4s ease"}}/>
            <div style={{position:"absolute",top:"18px",right:"18px",padding:"3px 9px",borderRadius:"9999px",background:`${f.color}10`,border:`1px solid ${f.color}25`}}>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:f.color,letterSpacing:"0.12em",opacity:0.85}}>{f.tag}</span>
            </div>
            <span className="feat-arrow" style={{position:"absolute",bottom:"22px",right:"22px",fontFamily:"Material Symbols Outlined",fontSize:"18px",color:f.color,opacity:0.3,transition:"opacity 0.3s ease, transform 0.3s ease"}}>arrow_outward</span>
            <div style={{width:"52px",height:"52px",borderRadius:"14px",background:`${f.color}0c`,border:`1px solid ${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"18px",flexShrink:0,position:"relative",zIndex:1}}>
              <span style={{fontFamily:"Material Symbols Outlined",fontSize:"26px",color:f.color}}>{f.icon}</span>
            </div>
            <span style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"16px",color:"#fff",display:"block",marginBottom:"10px",lineHeight:1.2,position:"relative",zIndex:1,letterSpacing:"-0.01em"}}>{f.title}</span>
            <span style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"13.5px",color:"rgba(145,160,178,0.78)",lineHeight:1.72,position:"relative",zIndex:1,flex:1}}>{f.desc}</span>
            <div style={{marginTop:"20px",height:"1.5px",width:"100%",borderRadius:"9999px",background:`linear-gradient(90deg,${f.color}45,${f.color}10,transparent)`,position:"relative",zIndex:1}}/>
          </button>
        ))}
      </div>

      <div className="reveal-stagger" style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:"14px",marginTop:"14px"}}>
        <div style={{borderRadius:"20px",padding:"30px 32px",background:"rgba(10,10,22,0.85)",border:"1px solid rgba(255,255,255,0.055)",backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div style={{marginBottom:"18px"}}>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:C.gold,letterSpacing:"0.12em",opacity:0.85,marginBottom:"8px"}}>PDF LAB · LIVE DEMO</p>
            <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:800,fontSize:"18px",color:"#fff",margin:0,letterSpacing:"-0.015em"}}>Try the document-grounded Q&A engine</h3>
          </div>
          <PDFDropZone/>
        </div>
        <div style={{borderRadius:"20px",padding:"30px 32px",background:"rgba(10,10,22,0.85)",border:"1px solid rgba(255,255,255,0.055)",backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",textAlign:"center"}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:C.green,letterSpacing:"0.12em",opacity:0.85}}>SCORED OUTPUT</p>
          <ConfidenceRing/>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"12.5px",color:"rgba(130,148,168,0.6)",lineHeight:1.6,margin:0,maxWidth:"200px"}}>Every answer ships with a calibrated confidence score, not just a citation.</p>
        </div>
      </div>
    </section>
  );
}

/* ── Pipeline ─────────────────────────────────────────────────────────────── */
function PipelineSection(){
  const hRef=useReveal(0.1),bRef=useReveal(0.07);
  return(
    <section id="pipeline" style={{padding:"24px 0 96px",overflow:"hidden"}}>
      <SectionDivider tight/>
      <div ref={hRef} className="reveal" style={{textAlign:"center",marginBottom:"52px"}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"14px",opacity:0.8}}>↓ Architecture</p>
        <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.6rem)",letterSpacing:"-0.05em",marginBottom:"12px",color:"#fff"}}>Neural Pipeline</h2>
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.78)",maxWidth:"420px",margin:"0 auto",lineHeight:1.7}}>Real-time multi-agent synthesis, visualized live.</p>
      </div>
      <div ref={bRef} className="reveal corner-brackets" style={{width:"100%",maxWidth:"1440px",margin:"0 auto",borderRadius:"32px",overflow:"hidden",background:"radial-gradient(ellipse 130% 80% at 25% 50%,rgba(0,24,8,0.55) 0%,rgba(3,4,16,0.92) 55%),radial-gradient(ellipse 130% 80% at 75% 50%,rgba(24,0,5,0.4) 0%,rgba(3,4,16,0.92) 55%)",border:"1px solid rgba(255,255,255,0.05)",position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,0.5)",color:C.green}}>
        <div style={{position:"absolute",inset:0,opacity:0.03,pointerEvents:"none",zIndex:1}}>
          <svg width="100%" height="100%"><defs><pattern id="hex2" width="30" height="52" patternUnits="userSpaceOnUse"><path d="M15 0l15 8.66v17.32L15 34.64 0 25.98V8.66L15 0z" fill="none" stroke="#00ff0f" strokeWidth="1" strokeOpacity="0.15"/></pattern></defs><rect width="100%" height="100%" fill="url(#hex2)"/></svg>
        </div>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:2,overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,bottom:0,left:"-40%",width:"35%",background:"linear-gradient(100deg,transparent,rgba(255,255,255,0.035),transparent)",animation:"pipelineSheen 7s ease-in-out infinite"}}/>
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
    [C.green]:"0,255,15",[C.purple]:"168,85,247",[C.cyan]:"0,204,255",
    [C.crimson]:"255,32,64",[C.amber]:"255,170,0",[C.gold]:"255,215,0",
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

      <div style={{marginTop:"28px"}}>
        <AnalyticsMiniPreview/>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PREMIUM KNOWLEDGE GRAPH SECTION
══════════════════════════════════════════════════════════════════════════ */
function KnowledgeGraphSection() {
  const ref = useReveal(0.08);
  const [liveNodeCount, setLiveNodeCount] = useState(GRAPH_NODES_DATA.length);

  return (
    <section style={{padding:"80px 0"}}>
      <SectionDivider/>
      <div ref={ref} className="reveal">
        <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr",gap:"48px",alignItems:"end",marginBottom:"40px"}} className="hiw-grid">
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.cyan,letterSpacing:"0.2em",marginBottom:"16px",opacity:0.8}}>↓ Knowledge Graph</p>
            <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2.2rem,4.8vw,3.9rem)",lineHeight:0.95,letterSpacing:"-0.055em",color:"#fff",margin:0}}>Knowledge that<br/>connects itself.</h2>
          </div>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,margin:0,paddingBottom:"4px"}}>Every session feeds a living Neo4j graph. Entities link automatically — try it below.</p>
        </div>

        {/* Premium card wrapper */}
        <div style={{
          borderRadius:"28px",
          padding:"2px",
          background:"linear-gradient(135deg,rgba(0,204,255,0.3),rgba(168,85,247,0.18),rgba(0,255,15,0.1),rgba(0,204,255,0.06))",
          boxShadow:"0 52px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.025)",
        }}>
          <div style={{
            borderRadius:"27px",
            overflow:"hidden",
            background:"rgba(3,3,13,0.98)",
            backdropFilter:"blur(28px)",
          }}>
            {/* Top bar */}
            <div style={{
              padding:"22px 32px",
              borderBottom:"1px solid rgba(255,255,255,0.05)",
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              flexWrap:"wrap",
              gap:"14px",
              background:"linear-gradient(90deg,rgba(0,204,255,0.04),rgba(168,85,247,0.025),transparent)",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                <div style={{
                  width:"44px",height:"44px",borderRadius:"14px",
                  background:"linear-gradient(135deg,rgba(0,204,255,0.12),rgba(168,85,247,0.08))",
                  border:"1px solid rgba(0,204,255,0.22)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  position:"relative",overflow:"hidden",
                  boxShadow:"0 0 20px rgba(0,204,255,0.1)",
                }}>
                  <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 120%,rgba(0,204,255,0.25),transparent 65%)",pointerEvents:"none"}}/>
                  <span style={{fontFamily:"Material Symbols Outlined",fontSize:"22px",color:C.cyan,position:"relative",zIndex:1}}>hub</span>
                </div>
                <div>
                  <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"15px",color:"#fff",margin:0}}>Live Knowledge Graph</p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9.5px",color:"rgba(130,148,168,0.4)",margin:"4px 0 0",letterSpacing:"0.08em"}}>
                    CLICK EMPTY SPACE TO ADD A NODE · DRAG TO REARRANGE · {liveNodeCount} NODES
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = "/graph"}
                style={{
                  padding:"10px 22px",borderRadius:"9999px",
                  border:`1px solid ${C.cyan}45`,
                  background:"rgba(0,204,255,0.07)",
                  color:C.cyan,fontFamily:"Sora,sans-serif",
                  fontSize:"12.5px",fontWeight:700,cursor:"pointer",
                  transition:"all 0.28s cubic-bezier(0.23,1,0.32,1)",
                  display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
                  letterSpacing:"0.02em",
                }}
                onMouseOver={e=>{
                  e.currentTarget.style.background="rgba(0,204,255,0.18)";
                  e.currentTarget.style.borderColor=`${C.cyan}90`;
                  e.currentTarget.style.boxShadow=`0 0 24px rgba(0,204,255,0.18)`;
                  e.currentTarget.style.transform="translateY(-2px)";
                }}
                onMouseOut={e=>{
                  e.currentTarget.style.background="rgba(0,204,255,0.07)";
                  e.currentTarget.style.borderColor=`${C.cyan}45`;
                  e.currentTarget.style.boxShadow="none";
                  e.currentTarget.style.transform="translateY(0)";
                }}
              >
                Launch full graph
                <span style={{fontFamily:"Material Symbols Outlined",fontSize:"15px"}}>arrow_outward</span>
              </button>
            </div>

            {/* Canvas area */}
            <div style={{position:"relative",background:"radial-gradient(ellipse 80% 55% at 50% 50%,rgba(0,204,255,0.022),transparent)"}}>
              <PremiumKnowledgeGraph embedded onNodeCountChange={setLiveNodeCount}/>
            </div>

            {/* Footer stat strip */}
            <div style={{
              padding:"18px 32px",
              borderTop:"1px solid rgba(255,255,255,0.04)",
              display:"flex",
              gap:"0",
              background:"rgba(2,2,11,0.65)",
            }}>
              {[
                {label:"Entities tracked", val:"1,204", color:C.cyan},
                {label:"Avg connections / node", val:"3.6", color:C.purple},
                {label:"Graph updates", val:"real-time", color:C.green},
              ].map((stat, i) => (
                <div key={stat.label} style={{
                  display:"flex",alignItems:"baseline",gap:"10px",
                  flex:1,
                  paddingLeft: i === 0 ? 0 : "32px",
                  borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.045)",
                }}>
                  <ScrambleText text={stat.val} style={{fontFamily:"JetBrains Mono,monospace",fontSize:"16px",fontWeight:600,color:stat.color,letterSpacing:"-0.01em"}}/>
                  <span style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"12px",color:"rgba(170,185,205,0.62)"}}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
    let elapsed=0;
    quips.forEach((q,i)=>{
      elapsed+=Math.max(600,q.length*22+280);
      setTimeout(()=>{setLog(p=>[...p,{text:q,color:agent.color}]);if(i===quips.length-1){setRunning(false);setDone(true);}},elapsed);
    });
  };
  const reset=()=>{setSelected(null);setLog([]);setRunning(false);setDone(false);};
  const active=PLAYGROUND_AGENTS.find(a=>a.id===selected);
  return(
    <section id="playground" style={{padding:"96px 0"}}>
      <SectionDivider/>
      <div ref={ref} className="reveal">
        <div style={{textAlign:"center",marginBottom:"52px"}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.purple,letterSpacing:"0.2em",marginBottom:"14px",opacity:0.8}}>Agent Playground</p>
          <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.5rem)",letterSpacing:"-0.05em",marginBottom:"10px",color:"#fff"}}>Pick an <span style={{color:C.green}}>Agent.</span> Watch it <span style={{color:C.cyan}}>Think.</span></h2>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.78)",maxWidth:"460px",margin:"0 auto",lineHeight:1.7}}>Click any agent tile to simulate its inner monologue — no backend required.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px",maxWidth:"940px",margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignContent:"start"}}>
            {PLAYGROUND_AGENTS.map(agent=>{
              const isSel=selected===agent.id;
              return(
                <button key={agent.id} className="agent-btn" onClick={()=>run(agent)} style={{padding:"18px 14px",background:isSel?`${agent.color}10`:"rgba(8,8,20,0.85)",border:`1px solid ${isSel?agent.color:"rgba(255,255,255,0.06)"}`,color:isSel?agent.color:"rgba(130,148,168,0.65)",textAlign:"left",boxShadow:isSel?`0 0 20px ${agent.color}22,0 0 40px ${agent.color}10,inset 0 1px 0 ${agent.color}12`:"none",gridColumn:agent.id==="judge"?"1 / -1":undefined}}>
                  <div style={{fontFamily:"Material Symbols Outlined",fontSize:"21px",marginBottom:"6px",color:isSel?agent.color:"rgba(180,195,210,0.55)"}}>{agent.icon}</div>
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
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:active.color,marginBottom:"7px",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:"6px"}}><span style={{fontFamily:"Material Symbols Outlined",fontSize:"13px"}}>{active.icon}</span>{active.name} — ROLE BRIEFING</div>
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
                  <span>{(i===log.length-1&&running)?<TypedLine text={e.text}/>:e.text}</span>
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
              <button onClick={()=>window.location.href="/auth"} style={{padding:"20px 52px",background:"rgba(8,8,22,0.98)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"19px",fontWeight:900,letterSpacing:"0.04em",color:"#fff",display:"inline-flex",alignItems:"center",gap:"14px",backdropFilter:"blur(24px)",transition:"transform 0.3s cubic-bezier(0.23,1,0.32,1)",position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
                <div style={{position:"absolute",inset:0,borderRadius:"9999px",background:"linear-gradient(135deg,rgba(0,255,15,0.06),rgba(0,204,255,0.04),rgba(168,85,247,0.04))",pointerEvents:"none"}}/>
                <span style={{fontFamily:"Material Symbols Outlined",fontSize:"26px",background:`linear-gradient(135deg,${C.green},${C.cyan},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",position:"relative",zIndex:1}}>rocket_launch</span>
                <span style={{background:`linear-gradient(90deg,${C.green} 0%,${C.cyan} 45%,${C.purple} 80%,${C.gold} 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200% 100%",animation:"shimmerGrad 2.5s linear infinite",position:"relative",zIndex:1}}>LET'S GO</span>
              </button>
            </div>
          </div>
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",color:"rgba(130,148,168,0.55)",letterSpacing:"0.01em"}}>Free to start · No credit card required</p>
        </div>
        <QuickActionsRow/>
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
        <div ref={ref} className="reveal corner-brackets" style={{maxWidth:"480px",width:"100%",padding:"44px 36px",borderRadius:"24px",display:"flex",flexDirection:"column",alignItems:"center",gap:"22px",background:"rgba(8,8,20,0.88)",backdropFilter:"blur(28px)",border:"1px solid rgba(0,255,15,0.08)",textAlign:"center",position:"relative",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.4)",color:C.green}}>
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

/* ══════════════════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage(){
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
          <KnowledgeGraphSection/>
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