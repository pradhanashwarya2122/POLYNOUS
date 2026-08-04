import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

// POLYNOUS-themed onboarding / demo overlay.
// - VANTA.FOG background in the POLYNOUS palette (graceful CSS fallback if the
//   effect can't init on this three version).
// - A skippable 60-second demo video area. Point a file at /demo.mp4 (public/)
//   and it plays automatically; until then an honest "coming soon" placeholder
//   shows. Users can always skip.
//
// Props:
//   mode      "signup" (new user, after register) | "demo" (from the auth CTA)
//   onClose   called when the user skips or continues
export default function OnboardingOverlay({ mode = "demo", onClose }) {
  const fogRef = useRef(null);
  const vantaRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [fogFailed, setFogFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // vanta.fog.min is a UMD side-effect bundle: it defines window.VANTA.FOG
        // and expects THREE on the global. It has no ESM export.
        window.THREE = THREE;
        await import("vanta/dist/vanta.fog.min");
        if (cancelled || !fogRef.current || !window.VANTA || !window.VANTA.FOG) {
          setFogFailed(true);
          return;
        }
        vantaRef.current = window.VANTA.FOG({
          el: fogRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          // POLYNOUS palette: deep-void base, green midtone, cyan highlight.
          highlightColor: 0x00ccff,
          midtoneColor: 0x00ff47,
          lowlightColor: 0x1a1a4e,
          baseColor: 0x0a0a1e,
          blurFactor: 0.5,
          speed: 1.6,
          zoom: 1.1,
        });
      } catch (e) {
        if (!cancelled) setFogFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      try { vantaRef.current && vantaRef.current.destroy(); } catch { /* noop */ }
    };
  }, []);

  const continueLabel = mode === "signup" ? "Enter POLYNOUS" : "Back to sign in";

  // Portal to <body> so the fixed overlay covers the viewport (an ancestor's
  // backdrop-filter would otherwise become the containing block).
  return createPortal((
    <div style={{
      position: "fixed", inset: 0, zIndex: 4000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", animation: "onbFade 0.4s ease",
    }}>
      <style>{`
        @keyframes onbFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes onbRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes onbPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
      `}</style>

      {/* Fog background (or CSS fallback) */}
      <div ref={fogRef} style={{
        position: "absolute", inset: 0,
        background: fogFailed
          ? "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(0,204,255,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 30% 80%, rgba(0,255,71,0.08), transparent 60%), #0a0a1e"
          : "#0a0a1e",
      }} />
      {/* Legibility scrim */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,10,30,0.35), rgba(10,10,30,0.82))" }} />

      {/* Content card */}
      <div style={{
        position: "relative", zIndex: 2, width: "100%", maxWidth: 860,
        background: "rgba(10,10,30,0.55)", backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.10)", borderRadius: 22,
        padding: "clamp(24px,4vw,44px)", textAlign: "center",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)", animation: "onbRise 0.5s ease both",
      }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#00ccff", textTransform: "uppercase", letterSpacing: "0.28em", marginBottom: 10 }}>
          {mode === "signup" ? "Welcome to" : "60-second tour"}
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0,
          background: "linear-gradient(90deg,#fff 55%,#00ff47)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          POLYNOUS
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "#b9c4d6", marginTop: 10, marginBottom: 24, lineHeight: 1.6, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          {mode === "signup"
            ? "You're in. Here's a 60-second look at how many minds reach one answer - search, critique, and synthesis, all with your own keys."
            : "See POLYNOUS run a real multi-agent research pass in about a minute."}
        </p>

        {/* Video / placeholder - 16:9 */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(0,204,255,0.25)", background: "#060612", marginBottom: 26 }}>
          {!videoError ? (
            <video
              src="/demo.mp4"
              controls
              playsInline
              onError={() => setVideoError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(0,255,71,0.12)", border: "1px solid rgba(0,255,71,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", animation: "onbPulse 2.4s ease-in-out infinite" }}>
                <span className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined", fontSize: 34, color: "#00ff47" }}>play_arrow</span>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>Demo video coming soon</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#7f8ba0", letterSpacing: "0.06em" }}>
                a 60-second walkthrough will play here
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onClose} style={{
            border: "none", cursor: "pointer", borderRadius: 9999, padding: "13px 34px",
            fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
            color: "#003a00", background: "#00ff47", boxShadow: "0 0 24px rgba(0,255,71,0.28)",
          }}>
            {continueLabel}
          </button>
          <button onClick={onClose} style={{
            border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer", borderRadius: 9999, padding: "13px 28px",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#9fb0c4", background: "transparent",
          }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
