import { useState, useEffect, useRef, useCallback } from "react";

const PHOTO_SRC = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCANtA20DASIAAhEBAxEB/8QAHQAAAgIDAQEBAAAAAAAAAAAAAwQCBQEGBwgACf/EAF8QAAEDAgQDBQQFBgcMBggFBQECAxEAIQQFEjEGQVEHEyJhcTKBkbEIFCOhwRVCUrLR8BYkM2Jys+ElJkNTY3OCg5Kio/EJFzQ2k8InNVRVZHSktBhERWWElDdW0sP/xAAaAQADAQEBAQAAAAAAAAAAAAABAgMEBQYG/8QALBEBAQACAgICAgICAgMAAwEAAAECEQMhEjEEQTJREyIUYTNxBSNCQ1KBsf/aAAwDAQACEQMRAD8A6ngO0/OMOR9bZYxafJOg/dV/g+1rLXYGKwuIwqjzTC0/trQ1Yfe16Wcwt7iK+PvFjX105cpHZ8Bxxk2NgN5mwkn811Xdn/eirtnHNvJ1NOJdR+khQIPwrzhiMKBNpB6igMO4nL1asLiHcOrcd0spj4VnlwT6rSc37j0qvFyD86XXjE85muB4XtA4kwC/+3l9A/NxCQv794WrfhntGouFzN+J8JhMtDOJQMHiVPEqaWQFKI3tBFRvCv0heLuFcNheGl4PDcSZXhihLT+ZJdQ6hBAhJ0qEgec RUuvqM3o6kJxuRtJAP2jgJMT04+iuRPpXf7Yb7pxlH7T7FfpM8K8Y8WcKcMZhgMcleeZ/iG2sChrFspBLh2BIPKK4pxj9Jnjn6SnFuB4i4SybC8O4PB4fCYVa8NiH3GS4klSklJIBF4tPwrr19Qu9cmpHxvX5TcIZjiMBj8JiGSlhbTiFISqJSpJGofAivKe0g4YZ1l5YJwzqfFpCQ4Oi0kJP3RPwr2fsf6UPC3GXA+G44x+ewuAweJxBw7OQvvFT6n0glSU6UzBiD8KbHu8mW35O3bJt0cfKQ/PO9TRr89umwrxjtQ4gW1lmIJw7S0Y3FpGHbQmJAVAKvgrb3VZ7H+PcHj8AxgcUoM4lCCVpV0/6pHpXP+IuM8XxlmT+JeZVhGXFhDLQ0oQkWCRPTr516Y6fJljNbY6Z2a59mcCVPMhJJgAiJ61ruFBxDklO9ckybMc+m+95I28q6jheFMCTvFTkpv6HnXFZTQ8QUNYlFKtbYyBVJicX9WaL+HcQJlJ5c6iqWBagrdN6WRiL1ELkKGoAxvBpSNVOFJkDfaqSRtU/tSUiUkivgiQSb04lM2oOFJ1EzHOil06k1FYKCVAbUBkLRXxVoJ86cPiHSpR1gbUBFRRY9aTbHeFiCOdGWlIAkdaAJMqJHWigobxE7UBNiI5jlWBQAJHlFCR9P7AydV9PrT+H4VzLFwcJg3n1fcaaUrT/o3rq3CPY5xViMO3jMU03gEt+J1x3U80kdVCwHeaLBvU3srtSTJVqEcgOk3pF7M8UMpABSI3IgflW2I4fxeGX9XisPiGXBIIfYUR8iK13GNoJgT3VyaTi5yRsdGxGGXiP5QsyNxRG/PzRBRpT1I9KoGckQlQJMRQAHSTG2/Sf8A4VNORMbXA/tq5S4VnJSStBNLNEESVSn3tRRlCQrW5J2oT8nbagBNaZBHugkfCiJxDiXA0pbHXQlYSoTyCkmI8xU2I+SXfCeC4KeQ3kd6G3hHYXZVuEkGDNxFe08D/Rjbi1inFR4nJsO5IJvYqv8Ac61pxs+MvNvBWXnOC2l4bBYzKcWp2dKsM6UkHpqIkfGjtnj4w57q91kAJVJBkwfPeo9o3bG5h5/zVJHlWq2oJSr4kTXOkxMcqhzW0mT51lI8pAqyxuDKHikyUq/toMHnvS3dCikmJtrqOqXFDNXfHSq3Ml6UGPDyrqTaEm29BcUSVJAKb/Os3DGG+S2h1tSFJUJBBkVSbWOhIq5cRBFTwrr6gJjnXwRqkk7UyEkW99DSQegq4jJKCdRoNe9YAkGr7DIYbNhVngl62LGZoCDbrWlJ1RUEpgWrGRJSouHkaSUPEBVTMJIG1BJ9cxQdUXuB0qqAkNkjPmk1FcTMit+5kFAqT7qEk3mvpkqNJU2Eq0wDuL1VsSVHQ2yBvKtq+2q5JMuJSoeImsCcyoijAIBSDQ1IYcVKWxp3kgbijB1V7mTB6GsHG2liCS2etJPiOkQedfEJEBPKnjSr2m1LLMjJsKhJSU+zO0bSarCJUvSmBH3R3fGmWFqN+lbdgH0jJkxVWCTHKsKSJHvqCU3GlqsB5a6rY3S8HKUKJJpYCSK0PJ0t2Bk2iqSuCVEI0qKx3SVJuagQBVw7VYoJkmqgbXrGt0VJGqJtFBMT1pVRUE7yaVGkp1XJUE7Cc9aWTFESD98+tKbgxNXbvRDh0kSYidq1DJWVDWdR5mkHASbiZqSCELLY2gihRUrKYCdoFNFBkfCuiocAWHnUkq1pSDe/I+VWBW6VHDnxFQKiOhquUSmJG4pVBUVf5YFJiDc1WXOgBH3TRBrSl+VQoGYoSnDKtI2n41SSFHQ3+FAyPL5UyZgRtNaRmkY1+VB0TtFJNKSLxBm1KBBQiLVIi+2o1B3RpJmYoKjCkJ1A7bVQyoJKo6im3G7SDS6ioJ0zpJoCsaJ2FJuC8Wb7TUAmIJ9JqwR4RCo9aaYIlaUkTBqBSkhJtV4hRSJIBqzVmqVKnN5JrYiKoThSmJJ5CtO7VyRwBiySqTqHpNa92rQzhmr8gUqHmoPVXl8UdaKvbKSrUr5QVRFAHYjQpRXp5TyFf//Z";

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
  /* Transplanted Polynous pipeline animations */
  @keyframes pn-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
  @keyframes pn-spin{to{transform:rotate(360deg)}}
  @keyframes pn-pulse-dot{0%,100%{opacity:.6}50%{opacity:1;box-shadow:0 0 6px var(--violet3, #9B5FFF)}}
  @keyframes pn-glow-breathe{0%,100%{opacity:.35;transform:translateX(-50%) scaleX(.8)}50%{opacity:.7;transform:translateX(-50%) scaleX(1.2)}}

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

  /* ── Transplanted Polynous pipeline styles (SeqNodes / DialecticSVG / DetailPanel / Tooltip) ── */
  .pn-pipeline-scope{
    --ink:#040410;--void:#060614;--glass:#0A0A22;--glass2:#0F0F2A;--glass3:#141432;
    --rim:#1E1E45;--rim2:#2A2A58;--rim3:#38387A;
    --text:#F0EFFF;--text2:#9090C8;--text3:#505080;
    --violet:#7B2FFF;--violet2:#9B5FFF;--violet3:#C4A8FF;
    --teal:#00E5FF;--teal2:#40F0FF;--gold:#E8D5A3;
    --green:#00D68F;--green2:#40E8A8;--red:#FF4B6E;
    --amber:#FFB830;--amber2:#FFD080;--pink:#FF2D9F;--indigo:#4F6EFF;--indigo2:#7A90FF;
    font-family:'Inter',sans-serif;
  }
  .pn-seq-row{display:flex;align-items:center;gap:0;position:relative;z-index:2;justify-content:center;flex-wrap:wrap;}
  .pn-snode{width:110px;border-radius:16px;border:1px solid var(--rim);background:linear-gradient(160deg,rgba(20,20,50,.9) 0%,rgba(10,10,34,.95) 100%);display:flex;flex-direction:column;align-items:center;padding:22px 12px 20px;position:relative;cursor:pointer;transition:all .4s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .pn-snode::before{content:'';position:absolute;inset:0;border-radius:16px;opacity:0;transition:opacity .4s;pointer-events:none;background:linear-gradient(135deg,rgba(123,47,255,.12) 0%,rgba(0,229,255,.06) 100%)}
  .pn-snode:hover::before,.pn-snode.running::before{opacity:1}
  .pn-snode:hover{transform:translateY(-4px);border-color:var(--rim2);z-index:10}
  .pn-snode.running{border-color:rgba(155,95,255,.5);box-shadow:0 0 0 1px rgba(155,95,255,.15),0 4px 32px rgba(123,47,255,.2),0 0 60px rgba(123,47,255,.08);transform:translateY(-4px)}
  .pn-snode.done{border-color:rgba(0,214,143,.2);opacity:.82}
  .pn-snode.idle{opacity:.15}
  .pn-snode-icon-wrap{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative}
  .pn-snode-icon-wrap::after{content:'';position:absolute;inset:0;border-radius:12px;border:1px solid rgba(255,255,255,.06)}
  .pn-snode-name{font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:4px;text-align:center;letter-spacing:.02em;line-height:1.2}
  .pn-snode.running .pn-snode-name{color:var(--violet3)}
  .pn-snode.done .pn-snode-name{color:var(--green2)}
  .pn-snode-tag{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);text-align:center;opacity:.7}
  .pn-snode-spin{position:absolute;top:10px;right:10px;width:14px;height:14px;border:2px solid var(--violet3);border-top-color:transparent;border-radius:50%;animation:pn-spin .7s linear infinite}
  .pn-snode-check-ring{position:absolute;top:10px;right:10px;width:16px;height:16px}
  .pn-snode-bar{position:absolute;bottom:0;left:0;right:0;height:2px;overflow:hidden;border-radius:0 0 15px 15px;background:var(--rim)}
  .pn-snode-bar-fill{height:100%;border-radius:0 0 15px 15px;transition:width .6s cubic-bezier(.4,0,.2,1)}
  .pn-snode-glow{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:60%;height:20px;border-radius:50%;opacity:0;filter:blur(10px)}
  .pn-snode.running .pn-snode-glow{animation:pn-glow-breathe 2s ease infinite}
  .pn-sarrow{width:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .pn-detail-overlay{position:absolute;inset:0;z-index:50;background:rgba(4,4,16,.88);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}
  .pn-detail-overlay.show{opacity:1;pointer-events:auto}
  .pn-detail-card{background:linear-gradient(165deg,rgba(20,20,50,.95) 0%,rgba(10,10,34,.98) 100%);border:1px solid var(--rim2);border-radius:18px;width:420px;max-width:90vw;max-height:500px;overflow-y:auto;padding:28px;box-shadow:0 0 0 1px rgba(123,47,255,.1),0 24px 64px rgba(0,0,0,.6)}
  .pn-detail-card::-webkit-scrollbar{width:4px}
  .pn-detail-card::-webkit-scrollbar-track{background:var(--glass)}
  .pn-detail-card::-webkit-scrollbar-thumb{background:var(--rim2);border-radius:2px}
  .pn-detail-close{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid var(--rim);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text3);font-size:12px;transition:all .15s;flex-shrink:0}
  .pn-detail-close:hover{background:var(--rim2);color:var(--text)}
  .pn-detail-thinking-box{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--violet3);margin-bottom:12px;padding:14px 16px;background:rgba(123,47,255,.07);border-radius:10px;border:1px solid rgba(123,47,255,.18);line-height:1.7}
  .pn-detail-subquery{font-size:10px;color:var(--text3);padding:5px 10px;background:rgba(255,255,255,.025);border-radius:5px;border:1px solid var(--rim);margin-top:4px;display:flex;align-items:center;gap:6px}
  .pn-detail-subquery::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--violet3);flex-shrink:0}
  .pn-tooltip{position:fixed;z-index:999;background:rgba(10,10,34,.96);border:1px solid #2A2A58;border-radius:12px;padding:14px 16px;min-width:180px;pointer-events:none;opacity:0;transition:opacity .15s;font-size:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);backdrop-filter:blur(12px)}

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

/* ── Transplanted from Polynous__2_.jsx — pipeline agent + dialectic data ── */
function svgIcon(path, color, size = 16) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function nstate(id, step) {
  const s = STEP_MAP[id];
  if (s === undefined) return 'idle';
  return s === step ? 'running' : s < step ? 'done' : 'idle';
}

const ICONS = {
  search: 'M10 10m-7 0a7 7 0 1014 0a7 7 0 10-14 0 M21 21l-4.35-4.35',
  doc: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  pen: 'M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  scale: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
};

const AGENTS = [
  { id: 'search', num: '01', label: 'Search', tag: 'agent/01', color: '#9B5FFF', bg: 'rgba(123,47,255,.18)', icon: ICONS.search, thinking: 'Decomposing query into targeted sub-queries across 6 sources', subqueries: ['arxiv.org — "transformer architectures long context"', 'scholar.google.com — "attention mechanisms context window 2024"', 'ieee.org — "long-context reasoning transformer survey"', 'semantic.scholar.org — "efficient attention linear scaling"'], detail: 'Searches the web across academic databases, news, and journals. Decomposes complex questions into targeted sub-queries for comprehensive coverage.' },
  { id: 'synthesis', num: '02', label: 'Synthesis', tag: 'agent/02', color: '#00E5FF', bg: 'rgba(0,229,255,.12)', icon: ICONS.doc, thinking: 'Extracting key findings from 24 documents — building structured knowledge graph', subqueries: ['Cluster A · Attention mechanism variants (8 papers)', 'Cluster B · Context window optimization (6 papers)', 'Cluster C · Hardware-efficient implementations (5 papers)', 'Cluster D · Theoretical bounds (5 papers)'], detail: 'Condenses each source into structured key points, extracting salient information while preserving context.' },
  { id: 'critic', num: '03', label: 'Critic', tag: 'agent/03', color: '#FFB830', bg: 'rgba(255,184,48,.12)', icon: ICONS.shield, thinking: 'Cross-referencing 24 claims — evaluating evidence quality and contradictions', subqueries: ['Verified · Linear attention scales O(n) — Nature 2024', 'Conflict · Ring attention vs Sparse attention efficiency claims', 'Verified · Context windows now exceed 1M tokens', 'Review · Performance claims on custom hardware unverified'], detail: 'Cross-references claims across all sources, identifies contradictions, evaluates evidence quality, and assigns calibrated confidence scores.' },
  { id: 'writer', num: '04', label: 'Writer', tag: 'agent/04', color: '#00D68F', bg: 'rgba(0,214,143,.12)', icon: ICONS.pen, thinking: 'Assembling final cited answer with structured formatting and inline references', subqueries: ['Structure: Summary → Key Findings → Limitations → Confidence', 'Citations: 24 sources formatted in APA style', 'Confidence: Aggregating critic scores into final assessment', 'Polish: Ensuring readability and academic clarity'], detail: 'Assembles the final answer with inline citations, structured formatting, clear narrative flow, and a comprehensive bibliography.' },
];

const DIALECTIC = [
  { id: 'retrieval', num: '05', label: 'Retrieval', tag: 'agent/05', color: '#4F6EFF', bg: 'rgba(79,110,255,.14)', icon: ICONS.download, cx: 80, cy: 120, thinking: 'Gathering evidence corpus from knowledge base and vector store', subqueries: ['Vector DB query: "transformer context" → 12 chunks', 'Retrieved: 8 supporting documents, 4 challenging documents'], detail: 'Gathers evidence from the knowledge base, vector store, and web sources to support both sides of the argument equally.' },
  { id: 'advocate', num: '06', label: 'FOR', tag: 'agent/06', color: '#00D68F', bg: 'rgba(0,214,143,.14)', icon: ICONS.check, cx: 220, cy: 54, thinking: 'Building affirmative case — transformers CAN handle long context', subqueries: ['Ring Attention achieves O(n) complexity', '1M+ token windows demonstrated by Google (2024)', 'Sparse attention reduces compute by 40%'], detail: 'Argues in favor of the proposition using the strongest available evidence, logical reasoning, and persuasive rhetoric grounded in facts.' },
  { id: 'dissent', num: '07', label: 'AGAINST', tag: 'agent/07', color: '#FF4B6E', bg: 'rgba(255,75,110,.14)', icon: ICONS.x, cx: 220, cy: 186, thinking: 'Building counter-arguments — limitations remain significant', subqueries: ['Quadratic attention still dominates for < 8K tokens', 'Memory requirements scale with context length', 'Evaluation benchmarks lag behind capability claims'], detail: 'Counters with opposing evidence, highlights weaknesses in the supporting argument, and exposes logical gaps in reasoning.' },
  { id: 'judge', num: '08', label: 'Judge', tag: 'agent/08', color: '#E8D5A3', bg: 'rgba(232,213,163,.1)', icon: ICONS.scale, cx: 350, cy: 120, thinking: 'Weighing both sides — evidence quality: FOR 8.2 vs AGAINST 6.1', subqueries: ['FOR strengths: Strong empirical evidence, recent benchmarks', 'AGAINST strengths: Valid theoretical concerns, resource constraints', 'Verdict: FOR wins — transformers CAN handle long context with modern techniques'], detail: 'Evaluates both sides impartially, weighs evidence quality, assesses logical coherence, and delivers a final verdict with detailed reasoning.' },
];

const STEP_MAP = { search: 0, synthesis: 1, critic: 2, writer: 3, retrieval: 4, advocate: 5, dissent: 5, judge: 6 };
const STEP_DUR = 3400;

/* ── Transplanted: SeqNodes ── */
function SeqNodes({ step, onNodeClick, onTooltip }) {
  return (
    <div className="pn-seq-row">
      {AGENTS.map((a, i) => {
        const st = nstate(a.id, step);
        const isR = st === 'running', isD = st === 'done';
        const uid = `ar${i}`;
        const active = step === STEP_MAP[a.id] || step > STEP_MAP[a.id];
        const col = active ? a.color : '#1E1E45';
        return (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`pn-snode ${st}`}
              onMouseEnter={e => onTooltip(e, a, st)}
              onMouseMove={e => onTooltip(e, a, st, true)}
              onMouseLeave={() => onTooltip(null)}
              onClick={() => onNodeClick(a, st)}
            >
              <div className="pn-snode-icon-wrap" style={{ background: a.bg }}>
                {svgIcon(a.icon, a.color, 17)}
              </div>
              <div className="pn-snode-name">{a.label}</div>
              <div className="pn-snode-tag">{a.tag}</div>
              {isR && <div className="pn-snode-spin" style={{ borderColor: a.color + '66', borderTopColor: a.color }} />}
              {isD && (
                <div className="pn-snode-check-ring">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill={a.color} fillOpacity=".15" stroke={a.color} strokeWidth="1.5" />
                    <path d="M8 12l3 3 5-5" fill="none" stroke={a.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className="pn-snode-bar">
                <div className="pn-snode-bar-fill" style={{ width: isD ? '100%' : isR ? '58%' : '0%', background: `linear-gradient(90deg,${a.color}88,${a.color})` }} />
              </div>
              {isR && <div className="pn-snode-glow" style={{ background: a.color }} />}
            </div>
            {i < AGENTS.length - 1 && (
              <div className="pn-sarrow">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <defs>
                    <marker id={uid} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto">
                      <path d="M1 1L7 4L1 7" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" />
                    </marker>
                  </defs>
                  <line x1="0" y1="10" x2="34" y2="10" stroke={col} strokeWidth={active ? 1.5 : .8} opacity={active ? .65 : .2} markerEnd={`url(#${uid})`} />
                  {active && isR && (
                    <circle r="2.5" fill={a.color} opacity=".9">
                      <animateMotion dur="1.2s" repeatCount="indefinite" path="M0,10 L40,10" />
                    </circle>
                  )}
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Transplanted: DialecticSVG ── */
function DialecticSVG({ step, onNodeClick }) {
  const N = DIALECTIC;
  const s4 = step >= 4, s5 = step >= 5;
  const cw = 80, ch = 70;
  const conns = [
    { x1: N[0].cx + cw / 2, y1: N[0].cy, x2: N[1].cx - cw / 2, y2: N[1].cy, col: N[1].color, active: s4 },
    { x1: N[0].cx + cw / 2, y1: N[0].cy, x2: N[2].cx - cw / 2, y2: N[2].cy, col: N[2].color, active: s4 },
    { x1: N[1].cx + cw / 2, y1: N[1].cy, x2: N[3].cx - cw / 2, y2: N[3].cy, col: N[3].color, active: s5 },
    { x1: N[2].cx + cw / 2, y1: N[2].cy, x2: N[3].cx - cw / 2, y2: N[3].cy, col: N[3].color, active: s5 },
  ];
  return (
    <svg id="dialectic-svg" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onClick={e => {
        const g = e.target.closest('[data-ni]');
        if (!g) return;
        const ni = parseInt(g.getAttribute('data-ni'));
        onNodeClick(DIALECTIC[ni], nstate(DIALECTIC[ni].id, step));
      }}>
      <defs>
        {conns.map((c, i) => (
          <marker key={i} id={`dm${i}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M1 1L7 4L1 7" fill="none" stroke={c.col + (c.active ? 'aa' : '44')} strokeWidth="1.5" />
          </marker>
        ))}
        <filter id="node-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {conns.map((c, i) => {
        const mx = (c.x1 + c.x2) / 2;
        const d = `M${c.x1},${c.y1} C${mx},${c.y1} ${mx},${c.y2} ${c.x2},${c.y2}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={c.col} strokeWidth={c.active ? 1.5 : .8} opacity={c.active ? .55 : .1} markerEnd={`url(#dm${i})`} strokeDasharray={c.active ? undefined : '4 4'} />
            {c.active && [0, 1, 2].map(j => (
              <circle key={j} r="2.5" fill={c.col} opacity={.85 - j * .2}>
                <animateMotion dur="1.7s" begin={`${j * .56}s`} repeatCount="indefinite" path={d} />
              </circle>
            ))}
          </g>
        );
      })}
      {N.map((n, ni) => {
        const st = nstate(n.id, step);
        const isR = st === 'running', isD = st === 'done';
        const isJ = n.id === 'judge';
        const w = isJ ? 92 : cw, h = isJ ? 82 : ch;
        const x = n.cx - w / 2, y = n.cy - h / 2;
        const op = isR ? 1 : isD ? .82 : .18;
        const si = 6, sx = x + w - 11, sy = y + 11;
        return (
          <g key={n.id} opacity={op} style={{ cursor: 'pointer' }} data-ni={ni}>
            {isR && (
              <ellipse cx={n.cx} cy={n.cy} rx="50" ry="36" fill={n.color} opacity=".06" filter="url(#node-glow)">
                <animate attributeName="rx" values="50;68;50" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".06;.12;.06" dur="2.4s" repeatCount="indefinite" />
              </ellipse>
            )}
            <rect x={x} y={y} width={w} height={h} rx="12" fill={n.color} fillOpacity={isR ? .18 : isD ? .1 : .04} stroke={n.color} strokeOpacity={isR ? .6 : isD ? .28 : .12} strokeWidth={isR ? 1.5 : 1} />
            <rect x={n.cx - 15} y={y + 10} width="30" height="30" rx="8" fill={n.bg} fillOpacity=".9" />
            <g transform={`translate(${n.cx - 10},${y + 15}) scale(.72)`}>
              <path d={n.icon} fill="none" stroke={n.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <text x={n.cx} y={y + h - 20} textAnchor="middle" fontFamily="Syne,sans-serif" fontSize="10" fontWeight="700" fill={isR ? n.color : isD ? n.color + 'cc' : '#3A3A6A'}>{n.label}</text>
            <text x={n.cx} y={y + h - 8} textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="7.5" fill={isR || isD ? n.color + '88' : '#252548'}>{n.tag}</text>
            {isR && (
              <g>
                <circle cx={sx} cy={sy} r={si + 2} fill={n.color} opacity=".08">
                  <animate attributeName="r" values={`${si + 2};${si + 5};${si + 2}`} dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={sx} cy={sy} r={si} fill="none" stroke={n.color} strokeWidth="1.5" strokeDasharray="3 2">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${sx} ${sy}`} to={`360 ${sx} ${sy}`} dur=".9s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
            {isD && (
              <>
                <circle cx={sx} cy={sy} r={si} fill={n.color} />
                <path d={`M${sx - 3},${sy} L${sx - 1},${sy + 2.5} L${sx + 3.5},${sy - 2}`} fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Transplanted: DetailPanel (used by SeqNodes/DialecticSVG click-to-inspect) ── */
function PipelineDetailPanel({ detail, onClose }) {
  if (!detail) return null;
  const { agent, status } = detail;
  const sc = { running: 'var(--violet3)', done: 'var(--green2)', idle: 'var(--text3)' };
  return (
    <div className="pn-detail-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: agent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
            {svgIcon(agent.icon, agent.color, 16)}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: agent.color, fontSize: 17, letterSpacing: '-.01em' }}>{agent.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>{agent.tag}</div>
          </div>
        </div>
        <div className="pn-detail-close" onClick={onClose}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </div>
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.75, marginBottom: 16 }}>{agent.detail}</p>
      {status === 'running' && (
        <div className="pn-detail-thinking-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--violet3)', animation: 'pn-pulse-dot 1.5s ease infinite' }} />
            <span style={{ fontWeight: 600, letterSpacing: '.04em' }}>PROCESSING</span>
          </div>
          {agent.thinking}
          {(agent.subqueries || []).map((s, i) => <div key={i} className="pn-detail-subquery">{s}</div>)}
        </div>
      )}
      {status === 'done' && (
        <div className="pn-detail-thinking-box" style={{ borderColor: 'rgba(0,214,143,.25)', color: 'var(--green2)', background: 'rgba(0,214,143,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {svgIcon(ICONS.check, '#00D68F', 12)}
            <span style={{ fontWeight: 600, letterSpacing: '.04em' }}>COMPLETE · Processed {agent.subqueries?.length || 0} items</span>
          </div>
        </div>
      )}
      {status === 'idle' && (
        <div className="pn-detail-thinking-box" style={{ opacity: .5, color: 'var(--text3)', borderColor: 'var(--rim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            Awaiting upstream completion
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <span style={{ padding: '5px 14px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', color: sc[status], background: 'rgba(255,255,255,.025)', border: '1px solid var(--rim)', letterSpacing: '.08em' }}>{status.toUpperCase()}</span>
        <span style={{ padding: '5px 14px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', color: 'var(--text3)', background: 'rgba(255,255,255,.025)', border: '1px solid var(--rim)', letterSpacing: '.04em' }}>{agent.tag}</span>
      </div>
    </div>
  );
}

/* ── Transplanted: pipeline tooltip ── */
function PipelineTooltip({ tooltip }) {
  return (
    <div
      className="pn-tooltip"
      style={{ left: tooltip.x, top: tooltip.y, opacity: tooltip.visible ? 1 : 0 }}
      dangerouslySetInnerHTML={{ __html: tooltip.html }}
    />
  );
}

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
      <div className="byok-tooltip">🔒 Keys encrypted with Fernet · Never stored in plaintext</div>
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
          <span style={{fontFamily:"JetBrains Mono,monospace",fontWeight:600,fontSize:"16px",color:"#fff",letterSpacing:"-0.03em"}}>92%</span>
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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveId(prev => {
        const idx = MEMORY_DOTS.findIndex(d => d.id === prev);
        const next = MEMORY_DOTS[(idx + 1) % MEMORY_DOTS.length];
        setAnimating(next.id);
        setSparkleAt(next.id);
        setTimeout(() => setAnimating(null), 600);
        setTimeout(() => setSparkleAt(null), 750);
        if (scrollRef.current) {
          const cards = scrollRef.current.querySelectorAll("[data-mem-card]");
          const nextIdx = (idx + 1) % MEMORY_DOTS.length;
          cards[nextIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
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
    <div style={{ padding: "36px 0 0" }}>
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
            onClick={()=>window.location.href="/login"}
            style={{padding:"7px 18px",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"9999px",background:"transparent",color:"rgba(255,255,255,0.45)",fontFamily:"Hanken Grotesk,sans-serif",fontSize:"14px",fontWeight:500,cursor:"pointer",transition:"all 0.25s",letterSpacing:"0.01em"}}
            onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(0,204,255,0.35)";e.currentTarget.style.color=C.cyan;}}
            onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.45)";}}>
            Sign In
          </button>
          <button
            onClick={()=>window.location.href="/signup"}
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
          <button onClick={()=>window.location.href="/signup"} style={{padding:"13px 32px",background:"rgba(6,6,16,0.95)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"16px",fontWeight:800,color:"#fff",backdropFilter:"blur(20px)",letterSpacing:"-0.01em",transition:"transform 0.25s ease,background 0.25s ease"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.background="rgba(6,6,16,0.85)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background="rgba(6,6,16,0.95)";}}>
            Start Research →
          </button>
        </div>
        <button
          onClick={()=>window.location.href="/debate?topic=Should+AI+be+regulated%3F"}
          style={{padding:"13px 28px",borderRadius:"9999px",border:`1.5px solid ${C.crimson}`,background:`linear-gradient(135deg,rgba(255,32,64,0.16),rgba(255,32,64,0.07))`,color:"#ff4868",fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"15px",cursor:"pointer",letterSpacing:"0.02em",transition:"all 0.25s cubic-bezier(0.23,1,0.32,1)",display:"inline-flex",alignItems:"center",gap:"8px",animation:"crimsonPulse 2.4s ease-in-out infinite",textShadow:`0 0 14px rgba(255,32,64,0.9)`}}
          onMouseOver={e=>{e.currentTarget.style.animation="none";e.currentTarget.style.background=`linear-gradient(135deg,rgba(255,32,64,0.28),rgba(255,32,64,0.14))`;e.currentTarget.style.boxShadow=`0 0 32px rgba(255,32,64,0.7), 0 0 70px rgba(255,32,64,0.35)`;e.currentTarget.style.transform="scale(1.06)";}}
          onMouseOut={e=>{e.currentTarget.style.animation="crimsonPulse 2.4s ease-in-out infinite";e.currentTarget.style.background=`linear-gradient(135deg,rgba(255,32,64,0.16),rgba(255,32,64,0.07))`;e.currentTarget.style.boxShadow="";e.currentTarget.style.transform="scale(1)";}}
        >
          ⚖️ Try a Debate
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
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"13px",color:C.green}}><span style={{color:"rgba(100,118,170,0.5)"}}>$ </span>npm run polynous</div>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"12px",color:"rgba(130,148,170,0.5)",marginTop:"10px",lineHeight:2}}>
          &gt; Initializing Neural Mesh...<br/>&gt; Connecting 7 Sub-Agents...<span style={{color:C.green,opacity:0.75}}> ✓</span><br/>&gt; Logic Lab: Online <span style={{color:C.green}}>[Ready]</span><br/>&gt; <span style={{color:C.cyan}}>Synaptic Bridge established.</span>
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
              <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.82)",lineHeight:1.7,marginBottom:"28px"}}>Model-agnostic by design. Connect your preferred LLMs or run private local instances with zero lock-in.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"28px"}}>
                {[{label:"OpenAI (GPT-4o)",color:C.green},{label:"Anthropic (Claude)",color:C.cyan},{label:"Ollama (Llama 3)",color:C.crimson}].map(({label,color})=>(
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
                <p style={{paddingLeft:"16px",color:"rgba(255,255,255,0.65)"}}>research_lead: <span style={{color:C.green}}>"anthropic/claude-4-5-sonnet"</span></p>
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
          <button key={f.title} className={`feat-card ${f.cls}`} onClick={()=>window.location.href=f.route} style={{minHeight:"260px",display:"flex",flexDirection:"column",alignItems:"flex-start",textAlign:"left",padding:"28px 26px 24px",borderRadius:"20px",border:`1px solid rgba(255,255,255,0.055)`,background:"rgba(10,10,22,0.85)",cursor:"pointer",position:"relative",backdropFilter:"blur(16px)"}}>
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

/* ══════════════════════════════════════════════════════════════════════════
   PIPELINE SECTION — transplanted SeqNodes / DialecticSVG from Polynous__2_.jsx
══════════════════════════════════════════════════════════════════════════ */
function PipelineSection(){
  const hRef=useReveal(0.1),bRef=useReveal(0.07);
  const [step,setStep]=useState(0);
  const [detail,setDetail]=useState(null);
  const [tooltip,setTooltip]=useState({visible:false,x:0,y:0,html:""});

  useEffect(()=>{
    const id=setInterval(()=>setStep(s=>(s+1)%8),STEP_DUR);
    return()=>clearInterval(id);
  },[]);

  const handleTooltip=useCallback((e,agent,status)=>{
    if(!e){setTooltip(t=>({...t,visible:false}));return;}
    const html=`<div style="font-family:'Sora',sans-serif;font-weight:700;color:${agent.color};margin-bottom:6px;font-size:13px">${agent.label}</div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-bottom:3px"><span>status</span><span style="color:var(--text2)">${status}</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace"><span>tag</span><span style="color:var(--text2)">${agent.tag}</span></div>`;
    setTooltip({visible:true,x:e.clientX+14,y:Math.max(8,e.clientY-65),html});
  },[]);

  return(
    <section id="pipeline" style={{padding:"24px 0 96px",overflow:"hidden"}}>
      <SectionDivider tight/>
      <div ref={hRef} className="reveal" style={{textAlign:"center",marginBottom:"52px"}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"11px",color:C.green,letterSpacing:"0.2em",marginBottom:"14px",opacity:0.8}}>↓ Architecture</p>
        <h2 style={{fontFamily:"Sora,sans-serif",fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.6rem)",letterSpacing:"-0.05em",marginBottom:"12px",color:"#fff"}}>Neural Pipeline</h2>
        <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"17px",color:"rgba(130,148,168,0.78)",maxWidth:"420px",margin:"0 auto",lineHeight:1.7}}>Real-time multi-agent synthesis, visualized live.</p>
      </div>
      <div ref={bRef} className="reveal pn-pipeline-scope" style={{width:"100%",maxWidth:"1440px",margin:"0 auto",borderRadius:"32px",overflow:"hidden",background:"radial-gradient(ellipse 130% 80% at 25% 50%,rgba(0,24,8,0.55) 0%,rgba(3,4,16,0.92) 55%),radial-gradient(ellipse 130% 80% at 75% 50%,rgba(24,0,5,0.4) 0%,rgba(3,4,16,0.92) 55%)",border:"1px solid rgba(255,255,255,0.05)",position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,0.5)"}}>
        <div style={{position:"absolute",inset:0,opacity:0.03,pointerEvents:"none",zIndex:1}}>
          <svg width="100%" height="100%"><defs><pattern id="hex2" width="30" height="52" patternUnits="userSpaceOnUse"><path d="M15 0l15 8.66v17.32L15 34.64 0 25.98V8.66L15 0z" fill="none" stroke="#00ff0f" strokeWidth="1" strokeOpacity="0.15"/></pattern></defs><rect width="100%" height="100%" fill="url(#hex2)"/></svg>
        </div>
        <div style={{position:"relative",zIndex:10,padding:"56px 32px",display:"flex",flexDirection:"column",gap:"56px"}}>

          {/* Sequential Research — SeqNodes */}
          <div>
            <div style={{textAlign:"center",marginBottom:"32px"}}>
              <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.green,letterSpacing:"0.16em",margin:0}}>SEQUENTIAL RESEARCH</p>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:"#fff",opacity:0.28,margin:"5px 0 0",letterSpacing:"0.1em"}}>4 AGENTS · CHAIN OF THOUGHT</p>
            </div>
            <div style={{position:"relative",display:"flex",justifyContent:"center"}}>
              <SeqNodes step={step} onNodeClick={(a,st)=>setDetail({agent:a,status:st})} onTooltip={handleTooltip}/>
              <div className={`pn-detail-overlay${detail?" show":""}`} onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>
                <PipelineDetailPanel detail={detail} onClose={()=>setDetail(null)}/>
              </div>
            </div>
          </div>

          {/* Dialectic Debate — DialecticSVG */}
          <div>
            <div style={{textAlign:"center",marginBottom:"24px"}}>
              <p style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"12px",color:C.crimson,letterSpacing:"0.16em",margin:0}}>⚖️ DIALECTIC DEBATE</p>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:"9px",color:"#fff",opacity:0.28,margin:"5px 0 0",letterSpacing:"0.1em"}}>ADVERSARIAL REASONING · PRO · CON</p>
            </div>
            <div style={{position:"relative",maxWidth:"520px",margin:"0 auto"}}>
              <DialecticSVG step={step} onNodeClick={(a,st)=>setDetail({agent:a,status:st})}/>
            </div>
          </div>

        </div>
        <div style={{position:"absolute",bottom:"12px",left:"50%",transform:"translateX(-50%)",fontFamily:"JetBrains Mono,monospace",fontSize:"8px",color:"#fff",opacity:0.12,letterSpacing:"0.2em",whiteSpace:"nowrap",pointerEvents:"none",zIndex:20}}>POLYNOUS NEURAL ENGINE • AUTONOMOUS MULTI-AGENT MESH</div>
      </div>
      <PipelineTooltip tooltip={tooltip}/>
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
   KnowledgeGraph component — transplanted verbatim from KnowledgeGraph__1_.jsx
══════════════════════════════════════════════════════════════════════════ */
/**
 * KnowledgeGraph
 * Canvas-based force-directed knowledge graph with bloom-lit nodes,
 * animated bezier edges, traveling particles, click-to-spawn nodes,
 * and drag-to-reposition. 1:1 behavioral port of the original vanilla
 * canvas build — physics, rendering, and interaction logic preserved.
 *
 * No external deps beyond React. Self-contained styles via a <style>
 * tag scoped with a unique class prefix so it can drop into any app
 * (e.g. POLYNOUS) without colliding with global CSS.
 */

const COLORS = [
  '#00e5a0', '#00c8ff', '#9d8fff', '#ff5075', '#ffbe45', '#00d8cc',
  '#c47fff', '#ff7055', '#4db8ff', '#aaf07a', '#ff9f60', '#60cfff',
];

const LABELS = [
  'Neural', 'Signal', 'Model', 'Vector', 'System', 'Layer', 'Pattern',
  'Domain', 'Entity', 'Matrix', 'Node', 'Fact', 'Concept', 'Theory',
  'Cluster', 'Root', 'Axis', 'Field', 'Flux', 'Arc',
];

const INIT_NODES = [
  { id: 0, x: 190, y: 160, r: 32, color: COLORS[0], label: 'Neural' },
  { id: 1, x: 390, y: 100, r: 26, color: COLORS[1], label: 'Signal' },
  { id: 2, x: 590, y: 170, r: 36, color: COLORS[2], label: 'Model' },
  { id: 3, x: 760, y: 105, r: 22, color: COLORS[3], label: 'Vector' },
  { id: 4, x: 900, y: 220, r: 28, color: COLORS[4], label: 'System' },
  { id: 5, x: 730, y: 340, r: 24, color: COLORS[5], label: 'Layer' },
  { id: 6, x: 510, y: 420, r: 30, color: COLORS[6], label: 'Pattern' },
  { id: 7, x: 300, y: 370, r: 22, color: COLORS[7], label: 'Domain' },
  { id: 8, x: 110, y: 300, r: 26, color: COLORS[8], label: 'Entity' },
  { id: 9, x: 970, y: 390, r: 20, color: COLORS[9], label: 'Matrix' },
  { id: 10, x: 400, y: 260, r: 20, color: COLORS[10], label: 'Node' },
  { id: 11, x: 790, y: 450, r: 20, color: COLORS[11], label: 'Fact' },
];

const INIT_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0],
  [0, 10], [10, 1], [10, 6], [2, 5], [4, 9], [5, 9], [5, 11], [6, 11],
];

const CANVAS_W = 1100;
const CANVAS_H = 560;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hex2rgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function rgba(hex, a) {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function bezPt(na, nb, t) {
  const cx = (na.x + nb.x) / 2 + (nb.y - na.y) * 0.1;
  const cy = (na.y + nb.y) / 2 - (nb.x - na.x) * 0.1;
  return {
    x: (1 - t) * (1 - t) * na.x + 2 * (1 - t) * t * cx + t * t * nb.x,
    y: (1 - t) * (1 - t) * na.y + 2 * (1 - t) * t * cy + t * t * nb.y,
    cx, cy,
  };
}

function makeInitialState() {
  return {
    nodes: INIT_NODES.map(n => ({
      ...n, vx: 0, vy: 0, dragging: false, tx: n.x, ty: n.y,
      gp: Math.random() * Math.PI * 2, scale: 1, st: 1,
    })),
    edges: [...INIT_EDGES],
    dragIdx: null,
    hovIdx: null,
    nextId: INIT_NODES.length,
    particles: [],
    ripples: [],
    lastTs: 0,
  };
}

function KnowledgeGraph() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeInitialState());
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  const [counts, setCounts] = useState({
    nodes: INIT_NODES.length,
    edges: INIT_EDGES.length,
  });
  const [tooltip, setTooltip] = useState({
    visible: false, x: 0, y: 0, label: '', color: '#fff',
  });

  // ---------- coordinate helpers ----------
  const getXY = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const hit = useCallback((x, y) => {
    const S = stateRef.current;
    return S.nodes.findIndex(n => Math.hypot(n.x - x, n.y - y) < n.r * n.scale + 10);
  }, []);

  const showTip = useCallback((n) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = n.x * (rect.width / canvas.width);
    const sy = n.y * (rect.height / canvas.height);
    const pr = n.r * n.scale * (rect.height / canvas.height);
    setTooltip({
      visible: true,
      x: rect.left + sx,
      y: rect.top + sy - pr,
      label: n.label,
      color: n.color,
    });
  }, []);

  const hideTip = useCallback(() => {
    setTooltip(t => (t.visible ? { ...t, visible: false } : t));
  }, []);

  // ---------- physics ----------
  const physics = useCallback((dt) => {
    const S = stateRef.current;
    const W = CANVAS_W, H = CANVAS_H;
    S.nodes.forEach((n, i) => {
      if (n.dragging) {
        n.x = lerp(n.x, n.tx, clamp(0.22 * dt, 0, 1));
        n.y = lerp(n.y, n.ty, clamp(0.22 * dt, 0, 1));
        return;
      }
      S.nodes.forEach((m, j) => {
        if (i === j) return;
        const dx = n.x - m.x, dy = n.y - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = (n.r + m.r) * 4.2;
        if (d < ideal) {
          const f = ((ideal - d) / ideal) * 0.32;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      });
      S.edges.forEach(([a, b]) => {
        const o = a === i ? S.nodes[b] : b === i ? S.nodes[a] : null;
        if (!o) return;
        const dx = o.x - n.x, dy = o.y - n.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = 190;
        const f = ((d - ideal) / ideal) * 0.036;
        n.vx += (dx / d) * f;
        n.vy += (dy / d) * f;
      });
      n.vx += (W / 2 - n.x) * 0.00028;
      n.vy += (H / 2 - n.y) * 0.00028;
      n.vx *= 0.87;
      n.vy *= 0.87;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.x = clamp(n.x, n.r + 22, W - n.r - 22);
      n.y = clamp(n.y, n.r + 22, H - n.r - 22);
    });
  }, []);

  // ---------- main draw loop ----------
  const drawFrame = useCallback((ts) => {
    const S = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!S.lastTs) S.lastTs = ts;
    const dt = clamp((ts - S.lastTs) / 16.67, 0, 2.5);
    S.lastTs = ts;
    const W = CANVAS_W, H = CANVAS_H;

    ctx.clearRect(0, 0, W, H);
    physics(dt);

    // deep vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
    vig.addColorStop(0, 'rgba(14,8,32,0.0)');
    vig.addColorStop(0.55, 'rgba(5,4,16,0.35)');
    vig.addColorStop(1, 'rgba(2,2,8,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // dot grid
    for (let gx = 38; gx < W; gx += 42) {
      for (let gy = 38; gy < H; gy += 42) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.022)';
        ctx.fill();
      }
    }

    // scanlines
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.035)';
      ctx.fillRect(0, y, W, 1);
    }

    // hovered aura
    if (S.hovIdx !== null && S.hovIdx >= 0 && S.nodes[S.hovIdx]) {
      const n = S.nodes[S.hovIdx];
      const aura = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 210);
      aura.addColorStop(0, rgba(n.color, 0.07));
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 210, 0, Math.PI * 2);
      ctx.fill();
    }

    // edges
    S.edges.forEach(([a, b]) => {
      const na = S.nodes[a], nb = S.nodes[b];
      if (!na || !nb) return;
      const hov = S.hovIdx === a || S.hovIdx === b;
      const phase = 0.5 + 0.5 * Math.sin(ts * 0.00085 + a * 0.9 + b * 1.4);
      const { cx, cy } = bezPt(na, nb, 0.5);

      // bloom
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.quadraticCurveTo(cx, cy, nb.x, nb.y);
      if (hov) {
        ctx.strokeStyle = rgba(na.color, 0.2 + phase * 0.1);
        ctx.lineWidth = 20;
        ctx.filter = 'blur(9px)';
      } else {
        ctx.strokeStyle = `rgba(100,110,220,${0.05 + phase * 0.04})`;
        ctx.lineWidth = 8;
        ctx.filter = 'blur(4px)';
      }
      ctx.stroke();
      ctx.filter = 'none';
      ctx.restore();

      // mid glow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.quadraticCurveTo(cx, cy, nb.x, nb.y);
      if (hov) {
        ctx.strokeStyle = rgba(na.color, 0.5 + phase * 0.2);
        ctx.lineWidth = 4;
        ctx.filter = 'blur(2px)';
      } else {
        ctx.strokeStyle = `rgba(130,150,240,${0.09 + phase * 0.05})`;
        ctx.lineWidth = 2;
        ctx.filter = 'blur(1px)';
      }
      ctx.stroke();
      ctx.filter = 'none';
      ctx.restore();

      // crisp line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.quadraticCurveTo(cx, cy, nb.x, nb.y);
      if (hov) {
        ctx.strokeStyle = rgba(na.color, 0.85 + phase * 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = `rgba(160,175,255,${0.14 + phase * 0.08})`;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -(ts * 0.014);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // chevron
      if (hov) {
        const mp = bezPt(na, nb, 0.52), mp2 = bezPt(na, nb, 0.50);
        const angle = Math.atan2(mp.y - mp2.y, mp.x - mp2.x);
        ctx.save();
        ctx.translate(mp.x, mp.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-6, -4.5);
        ctx.lineTo(0, 0);
        ctx.lineTo(-6, 4.5);
        ctx.strokeStyle = rgba(na.color, 0.9);
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
    });

    // particles
    S.particles = S.particles.filter(p => p.t < 1);
    S.particles.forEach(p => {
      p.t += p.speed * dt;
      const na = S.nodes[p.a], nb = S.nodes[p.b];
      if (!na || !nb) return;
      const t = p.t, mt = Math.max(0, t - 0.06);
      const cur = bezPt(na, nb, t), prev = bezPt(na, nb, mt);
      const alpha = Math.sin(t * Math.PI);
      const pr = 2 + alpha * 3.5;
      const tail = ctx.createLinearGradient(prev.x, prev.y, cur.x, cur.y);
      tail.addColorStop(0, 'transparent');
      tail.addColorStop(1, rgba(p.color, alpha * 0.6));
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.strokeStyle = tail;
      ctx.lineWidth = pr * 1.1;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, pr + 3.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.color, alpha * 0.13);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.color, alpha * 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cur.x - pr * 0.3, cur.y - pr * 0.3, pr * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.fill();
    });

    // ripples
    S.ripples = S.ripples.filter(r => r.t < r.maxT);
    S.ripples.forEach(r => {
      r.t += dt;
      const p = r.t / r.maxT;
      ctx.beginPath();
      ctx.arc(r.x, r.y, p * 90, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(r.color, (1 - p) * 0.5);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      const p2 = Math.max(0, (r.t - 5) / r.maxT);
      if (p2 > 0) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, p2 * 130, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(r.color, (1 - p2) * 0.18);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      if (p < 0.3) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, p * 55, 0, Math.PI * 2);
        ctx.fillStyle = rgba(r.color, (0.3 - p) * 0.22);
        ctx.fill();
      }
    });

    // nodes
    S.nodes.forEach((n, i) => {
      const isHov = S.hovIdx === i;
      n.st = isHov ? 1.12 : n.dragging ? 1.06 : 1;
      n.scale = lerp(n.scale, n.st, clamp(0.13 * dt, 0, 1));
      const sc = n.scale, r = n.r * sc;
      const g = 0.5 + 0.5 * Math.sin(ts * 0.0013 + n.gp);
      const [cr, cg, cb] = hex2rgb(n.color);

      ctx.save();
      ctx.translate(n.x, n.y);

      // mega bloom
      const b0 = ctx.createRadialGradient(0, 0, r, 0, 0, r * 5.5 + g * 10);
      b0.addColorStop(0, `rgba(${cr},${cg},${cb},${isHov ? 0.12 : 0.05 + g * 0.04})`);
      b0.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, r * 5.5 + g * 10, 0, Math.PI * 2);
      ctx.fillStyle = b0;
      ctx.fill();

      // inner bloom
      const b1 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5 + g * 5);
      b1.addColorStop(0, `rgba(${cr},${cg},${cb},${isHov ? 0.3 : 0.14 + g * 0.1})`);
      b1.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.5 + g * 5, 0, Math.PI * 2);
      ctx.fillStyle = b1;
      ctx.fill();

      // chromatic ring
      ctx.beginPath();
      ctx.arc(0, 0, r + 5.5 + g * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${isHov ? 0.58 : 0.2 + g * 0.14})`;
      ctx.lineWidth = isHov ? 1.6 : 0.8;
      ctx.stroke();

      // hover rings
      if (isHov) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 13 + g * 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.24 + g * 0.08})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r + 22 + g * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.1 + g * 0.05})`;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }

      // void
      ctx.beginPath();
      ctx.arc(0, 0, r + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(4,3,12,1)';
      ctx.fill();

      // body
      const body = ctx.createRadialGradient(-r * 0.28, -r * 0.32, 0, r * 0.1, r * 0.1, r * 1.2);
      body.addColorStop(0, `rgba(${Math.min(255, cr + 65)},${Math.min(255, cg + 65)},${Math.min(255, cb + 65)},0.95)`);
      body.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.82)`);
      body.addColorStop(1, `rgba(${Math.max(0, cr - 45)},${Math.max(0, cg - 45)},${Math.max(0, cb - 45)},0.5)`);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // fresnel
      const rim = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(0.7, 'rgba(0,0,0,0.08)');
      rim.addColorStop(1, 'rgba(0,0,0,0.44)');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      // primary specular
      const sp = ctx.createRadialGradient(-r * 0.32, -r * 0.38, 0, 0, 0, r);
      sp.addColorStop(0, 'rgba(255,255,255,0.55)');
      sp.addColorStop(0.22, 'rgba(255,255,255,0.12)');
      sp.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      sp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sp;
      ctx.fill();

      // bounce specular
      const sp2 = ctx.createRadialGradient(r * 0.38, r * 0.38, 0, r * 0.3, r * 0.3, r * 0.5);
      sp2.addColorStop(0, 'rgba(255,255,255,0.08)');
      sp2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sp2;
      ctx.fill();

      // border
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = isHov ? 'rgba(255,255,255,0.9)' : `rgba(${cr},${cg},${cb},${0.48 + g * 0.22})`;
      ctx.lineWidth = isHov ? 1.8 : 1;
      ctx.stroke();

      ctx.restore();

      // label
      const fs = Math.round(9 + (n.r - 20) * 0.42);
      ctx.save();
      ctx.font = `${isHov ? 600 : 500} ${fs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 7;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(n.label, n.x + 0.5, n.y + 0.5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = isHov ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.92)';
      ctx.fillText(n.label, n.x, n.y);
      ctx.restore();
    });

    rafRef.current = requestAnimationFrame(drawFrame);
  }, [physics]);

  // ---------- lifecycle ----------
  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // ambient particle emitters
  useEffect(() => {
    const slow = setInterval(() => {
      const S = stateRef.current;
      if (!S.edges.length) return;
      const [a, b] = S.edges[Math.floor(Math.random() * S.edges.length)];
      if (!S.nodes[a] || !S.nodes[b]) return;
      S.particles.push({ a, b, t: 0, speed: 0.003 + Math.random() * 0.0025, color: S.nodes[a].color });
    }, 500);

    const burst = setInterval(() => {
      const S = stateRef.current;
      if (S.edges.length < 2) return;
      const [a, b] = S.edges[Math.floor(Math.random() * S.edges.length)];
      if (!S.nodes[a] || !S.nodes[b]) return;
      S.particles.push({ a, b, t: 0, speed: 0.005, color: S.nodes[b].color });
      S.particles.push({ a: b, b: a, t: 0, speed: 0.0045, color: S.nodes[a].color });
    }, 2000);

    return () => {
      clearInterval(slow);
      clearInterval(burst);
    };
  }, []);

  // ---------- pointer handlers ----------
  const handleMouseDown = useCallback((e) => {
    const { x, y } = getXY(e);
    const i = hit(x, y);
    const S = stateRef.current;
    if (i >= 0) {
      S.dragIdx = i;
      S.nodes[i].dragging = true;
      S.nodes[i].tx = x;
      S.nodes[i].ty = y;
      S.nodes[i].vx = 0;
      S.nodes[i].vy = 0;
    }
  }, [getXY, hit]);

  const handleMouseMove = useCallback((e) => {
    const { x, y } = getXY(e);
    const S = stateRef.current;
    S.hovIdx = hit(x, y);
    if (S.dragIdx !== null) {
      S.nodes[S.dragIdx].tx = x;
      S.nodes[S.dragIdx].ty = y;
      S.hovIdx = S.dragIdx;
    }
    if (S.hovIdx >= 0 && S.nodes[S.hovIdx]) {
      showTip(S.nodes[S.hovIdx]);
      canvasRef.current.style.cursor = S.dragIdx !== null ? 'grabbing' : 'grab';
    } else {
      hideTip();
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, [getXY, hit, showTip, hideTip]);

  const handleMouseUp = useCallback(() => {
    const S = stateRef.current;
    if (S.dragIdx !== null) {
      S.nodes[S.dragIdx].dragging = false;
      S.dragIdx = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    stateRef.current.hovIdx = null;
    hideTip();
  }, [hideTip]);

  // global mouseup so a drag released outside the canvas still ends
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleClick = useCallback((e) => {
    const { x, y } = getXY(e);
    if (hit(x, y) >= 0) return;
    const S = stateRef.current;
    const id = S.nextId;
    const color = COLORS[id % COLORS.length];
    const label = LABELS[id % LABELS.length];
    const nn = {
      id, x, y, r: 20 + Math.random() * 14, color, label,
      vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
      dragging: false, tx: x, ty: y, gp: Math.random() * Math.PI * 2,
      scale: 0.01, st: 1,
    };
    const sorted = S.nodes
      .map((n, i) => ({ i, d: Math.hypot(n.x - x, n.y - y) }))
      .sort((a, b) => a.d - b.d);
    sorted.slice(0, Math.min(2, sorted.length)).forEach(({ i }) => {
      S.edges.push([i, id]);
      S.particles.push({ a: i, b: id, t: 0, speed: 0.007, color });
    });
    S.nodes.push(nn);
    S.nextId++;
    S.ripples.push({ x, y, color, t: 0, maxT: 28 });
    setCounts({ nodes: S.nodes.length, edges: S.edges.length });
  }, [getXY, hit]);

  return (
    <div ref={containerRef} className="kg-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        .kg-shell{position:relative;border-radius:20px;overflow:hidden;background:#050508;
          box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 2px 0 rgba(255,255,255,0.04) inset,0 40px 120px rgba(0,0,0,0.85);
          font-family:'JetBrains Mono',monospace;}
        .kg-chrome-bar{position:relative;padding:0 20px;height:48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.055);background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);}
        .kg-chrome-bar::after{content:'';position:absolute;bottom:0;left:20px;right:20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);}
        .kg-dots{display:flex;gap:7px;align-items:center;}
        .kg-dot{width:10px;height:10px;border-radius:50%;}
        .kg-dot-r{background:#ff5f57;box-shadow:0 0 8px rgba(255,95,87,0.5);}
        .kg-dot-y{background:#febc2e;box-shadow:0 0 8px rgba(254,188,46,0.4);}
        .kg-dot-g{background:#28c840;box-shadow:0 0 8px rgba(40,200,64,0.4);}
        .kg-bar-right{display:flex;align-items:center;gap:8px;}
        .kg-tag{font-size:9.5px;color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:30px;padding:2px 10px;letter-spacing:0.06em;}
        .kg-canvas-wrap{position:relative;}
        .kg-canvas-wrap canvas{display:block;width:100%;height:560px;}
        .kg-overlay-tl{position:absolute;top:14px;left:16px;display:flex;flex-direction:column;gap:5px;}
        .kg-overlay-tr{position:absolute;top:14px;right:16px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;}
        .kg-micro{font-size:9px;font-weight:300;letter-spacing:0.12em;color:rgba(255,255,255,0.18);text-transform:uppercase;}
        .kg-stat-num{font-size:14px;font-weight:500;color:rgba(255,255,255,0.55);letter-spacing:0.04em;line-height:1;}
        .kg-footer{height:40px;border-top:1px solid rgba(255,255,255,0.04);background:linear-gradient(0deg,rgba(255,255,255,0.01) 0%,transparent 100%);display:flex;align-items:center;padding:0 20px;gap:20px;position:relative;}
        .kg-footer::before{content:'';position:absolute;top:0;left:20px;right:20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent);}
        .kg-hint{font-size:9px;font-weight:300;letter-spacing:0.1em;color:rgba(255,255,255,0.15);display:flex;align-items:center;gap:5px;}
        .kg-hint-pip{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,0.2);}
        .kg-tooltip{position:fixed;pointer-events:none;z-index:9999;transform:translate(-50%,-100%) translateY(-12px);transition:opacity 0.12s;}
        .kg-tooltip-inner{font-size:11px;font-weight:500;letter-spacing:0.08em;padding:6px 14px 7px;border-radius:10px;white-space:nowrap;background:rgba(6,6,14,0.97);border:1px solid;backdrop-filter:blur(20px);}
        .kg-tooltip-arrow{position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:9px;height:6px;}
      `}</style>

      <div className="kg-chrome-bar">
        <div className="kg-dots">
          <div className="kg-dot kg-dot-r" />
          <div className="kg-dot kg-dot-y" />
          <div className="kg-dot kg-dot-g" />
        </div>
        <div className="kg-bar-right">
          <span className="kg-tag">{counts.nodes} nodes · {counts.edges} edges</span>
        </div>
      </div>

      <div className="kg-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
        <div className="kg-overlay-tl">
          <span className="kg-micro">Nodes</span>
          <span className="kg-stat-num">{counts.nodes}</span>
        </div>
        <div className="kg-overlay-tr">
          <span className="kg-micro" style={{ textAlign: 'right' }}>Edges</span>
          <span className="kg-stat-num">{counts.edges}</span>
        </div>
      </div>

      <div className="kg-footer">
        <span className="kg-hint"><span className="kg-hint-pip" />Click canvas to spawn node</span>
        <span className="kg-hint"><span className="kg-hint-pip" />Drag to reposition</span>
        <span className="kg-hint"><span className="kg-hint-pip" />Hover to inspect</span>
      </div>

      {tooltip.visible && (
        <div className="kg-tooltip" style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}>
          <div
            className="kg-tooltip-inner"
            style={{
              color: tooltip.color,
              borderColor: tooltip.color + '50',
              boxShadow: `0 8px 32px rgba(0,0,0,0.6),0 0 20px ${tooltip.color}18`,
            }}
          >
            {tooltip.label}
          </div>
          <svg className="kg-tooltip-arrow" viewBox="0 0 9 6">
            <path d="M0 0L4.5 6L9 0" fill="rgba(6,6,14,0.97)" />
            <path d="M0 0L4.5 6L9 0" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KNOWLEDGE GRAPH SECTION — transplanted from KnowledgeGraph__1_.jsx
══════════════════════════════════════════════════════════════════════════ */
function KnowledgeGraphSection() {
  const ref = useReveal(0.08);

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

        <KnowledgeGraph/>
      </div>
    </section>
  );
}

/* ── Agent Playground ─────────────────────────────────────────────────────── */
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
  search:   ["Scanning 14,000 nodes… hit!","Cross-referencing semantic vectors…","Found 847 relevant chunks — filtering top 12.","Knowledge graph query complete."],
  summarise:["Compressing 4,200 tokens → 180…","Key entities extracted: 6.","Distillation confidence: 94%.","Summary locked and staged."],
  for:      ["Building affirmative case…","3 strong premises identified.","Constructing syllogism chain…","Case FOR filed — bulletproof."],
  against:  ["Stress-testing every premise…","Identified 2 logical gaps!","Counter-evidence ratio: 67%.","Opposition case finalized."],
  critic:   ["Running fallacy detection…","Ad hominem: 0. Straw man: 1. Flagged.","Source reliability score: 88/100.","Critical review complete."],
  writer:   ["Stitching narrative threads…","Prose coherence index: 97%.","Applying citation layer…","Draft ready for judgment."],
  judge:    ["Weighing all arguments…","Confidence score: 91%.","Ruling: Affirmative wins by evidence margin.","Session archived to Knowledge Graph."],
};

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
          <p style={{fontFamily:"Hanken Grotesk,sans-serif",fontSize:"16px",color:"rgba(130,148,168,0.78)",maxWidth:"460px",margin:"0 auto",lineHeight:1.7}}>Click any agent tile to simulate its inner monologue — no backend required.</p>
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
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:"10px",color:active.color,marginBottom:"7px",letterSpacing:"0.1em"}}>{active.emoji} {active.name} — ROLE BRIEFING</div>
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
              <button onClick={()=>window.location.href="/signup"} style={{padding:"20px 52px",background:"rgba(8,8,22,0.98)",borderRadius:"9999px",border:"none",cursor:"pointer",fontFamily:"Sora,sans-serif",fontSize:"19px",fontWeight:900,letterSpacing:"0.04em",color:"#fff",display:"inline-flex",alignItems:"center",gap:"14px",backdropFilter:"blur(24px)",transition:"transform 0.3s cubic-bezier(0.23,1,0.32,1)",position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.06)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
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