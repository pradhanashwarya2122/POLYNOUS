import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

// Premium page-load loader for POLYNOUS.
// Navigation here is full page reloads (window.location.href), so every page is
// a fresh mount. On mount this flashes a structure-matching SKELETON on the
// app's own dark background (never white), then fades away once the page has a
// beat to paint — the "new page loading into place" effect the jQuery loader
// aimed for, adapted to React. Respects prefers-reduced-motion (no skeleton).
// Paired with critical CSS in index.html that keeps the pre-React boot flash
// dark instead of white.

const VOID = "#0a0a1e";
const ACCENT = "#00ff47";

// Which skeleton shape best matches each route's real layout.
function layoutFor(pathname) {
  if (pathname.startsWith("/debate") || pathname.startsWith("/research")) return "workspace";
  if (pathname.startsWith("/settings")) return "stacked";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/memory")) return "grid";
  if (pathname === "/" || pathname.startsWith("/auth")) return "hero";
  return "workspace";
}

const Bar = ({ w, h = 14, r = 8, mb = 12, o = 1 }) => (
  <div className="pt-shimmer" style={{ width: w, height: h, borderRadius: r, marginBottom: mb, opacity: o }} />
);

function SidebarSkeleton() {
  return (
    <div style={{ width: 288, flexShrink: 0, padding: "26px 20px", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div className="pt-shimmer" style={{ width: 34, height: 34, borderRadius: 10 }} />
        <Bar w={110} h={16} mb={0} />
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="pt-shimmer" style={{ width: 20, height: 20, borderRadius: 6 }} />
          <Bar w={130 - i * 6} h={12} mb={0} o={0.9 - i * 0.08} />
        </div>
      ))}
    </div>
  );
}

function ContentSkeleton({ layout }) {
  if (layout === "hero") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 40 }}>
        <Bar w={320} h={40} r={12} />
        <Bar w={440} h={16} o={0.6} />
        <Bar w={380} h={16} o={0.45} mb={26} />
        <div style={{ display: "flex", gap: 14 }}>
          <div className="pt-shimmer" style={{ width: 150, height: 46, borderRadius: 12 }} />
          <div className="pt-shimmer" style={{ width: 150, height: 46, borderRadius: 12, opacity: 0.6 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, padding: "44px 52px", minWidth: 0 }}>
      <Bar w="42%" h={44} r={12} mb={10} />
      <Bar w="60%" h={16} o={0.5} mb={34} />
      {layout === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pt-shimmer" style={{ height: 150, borderRadius: 18, opacity: 0.9 - i * 0.06 }} />
          ))}
        </div>
      ) : layout === "stacked" ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pt-shimmer" style={{ height: 110, borderRadius: 18, marginBottom: 16, opacity: 0.9 - i * 0.12 }} />
        ))
      ) : (
        <>
          <div className="pt-shimmer" style={{ height: 64, borderRadius: 14, marginBottom: 22 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="pt-shimmer" style={{ height: 280, borderRadius: 18 }} />
            <div className="pt-shimmer" style={{ height: 280, borderRadius: 18, opacity: 0.75 }} />
          </div>
        </>
      )}
    </div>
  );
}

export default function PageTransition() {
  const location = useLocation();
  // This app navigates with full page reloads (window.location.href), so every
  // navigation is a fresh mount. We show the structure-matching skeleton on
  // mount and fade it out once the page has had a beat to paint — the
  // "new page loading" effect, on the app's own dark background.
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [state, setState] = useState(reduced ? "idle" : "enter"); // enter | leave | idle
  const [layout] = useState(() => layoutFor(location.pathname));
  const timers = useRef([]);

  useEffect(() => {
    if (reduced) return;
    timers.current = [
      setTimeout(() => setState("leave"), 650),
      setTimeout(() => setState("idle"), 1050),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [reduced]);

  if (state === "idle") return null;

  const showSidebar = layout !== "hero";

  return createPortal(
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 3500, background: VOID,
      display: "flex", overflow: "hidden",
      opacity: state === "leave" ? 0 : 1,
      transition: "opacity 0.4s ease",
      pointerEvents: state === "leave" ? "none" : "auto",
    }}>
      <style>{`
        @keyframes ptShimmer { 0% { background-position: -560px 0; } 100% { background-position: 560px 0; } }
        .pt-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(0,255,71,0.07) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 560px 100%;
          animation: ptShimmer 1.25s infinite linear;
        }
        @keyframes ptPulse { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:1; transform:scale(1.06);} }
      `}</style>

      {showSidebar && <SidebarSkeleton />}
      <ContentSkeleton layout={layout} />

      {/* Brand pulse — a quiet "POLYNOUS is loading" mark */}
      <div style={{ position: "absolute", bottom: 26, left: showSidebar ? 308 : 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 12px ${ACCENT}`, animation: "ptPulse 1s ease-in-out infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Loading</span>
      </div>
    </div>,
    document.body
  );
}
