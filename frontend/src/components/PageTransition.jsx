import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

// Premium page-load skeleton for POLYNOUS.
// Navigation here is full page reloads (window.location.href), so every page is
// a fresh mount. On mount this paints a skeleton that MATCHES the real layout
// of the destination page — the shared sidebar plus a per-route content
// skeleton (research / debate / settings / analytics / memory) — on the app's
// own dark background (never white), then fades out to reveal the page.
// Respects prefers-reduced-motion. Paired with critical CSS in index.html that
// keeps the pre-React boot flash dark.

const VOID = "#0a0a1e";

// Per-route: which content skeleton + which accent tints the shimmer.
function routeFor(pathname) {
  if (pathname.startsWith("/research")) return { key: "research", accent: "0,255,71" };
  if (pathname.startsWith("/debate")) return { key: "debate", accent: "255,32,64" };
  if (pathname.startsWith("/settings")) return { key: "settings", accent: "200,205,214" };
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/analytics")) return { key: "analytics", accent: "0,204,255" };
  if (pathname.startsWith("/memory")) return { key: "memory", accent: "168,85,247" };
  if (pathname.startsWith("/search")) return { key: "search", accent: "0,204,255" };
  if (pathname === "/" || pathname.startsWith("/auth")) return { key: "hero", accent: "0,255,71" };
  return { key: "research", accent: "0,255,71" };
}

// Shimmer block. `w`/`h` px or %, `r` radius, `mb` margin-bottom, `o` opacity.
const B = ({ w, h = 14, r = 8, mb = 0, o = 1, style }) => (
  <div className="pt-sk" style={{ width: w, height: h, borderRadius: r, marginBottom: mb, opacity: o, ...style }} />
);
const Row = ({ children, style }) => <div style={{ display: "flex", alignItems: "center", ...style }}>{children}</div>;

// ── Shared sidebar (identical across every app page) ─────────────────────────
function SidebarSkel() {
  return (
    <div style={{ width: 320, flexShrink: 0, height: "100%", padding: "26px 22px", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* logo */}
      <Row style={{ gap: 12, marginBottom: 26 }}>
        <B w={38} h={38} r={11} />
        <div><B w={120} h={17} mb={6} /><B w={80} h={9} o={0.5} /></div>
      </Row>
      {/* new-research pill */}
      <B w="100%" h={46} r={12} mb={26} o={0.85} />
      {/* nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Row key={i} style={{ gap: 14 }}>
            <B w={22} h={22} r={7} o={0.9 - i * 0.05} />
            <B w={150 - i * 8} h={13} o={0.85 - i * 0.05} />
          </Row>
        ))}
      </div>
      {/* user footer */}
      <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Row style={{ gap: 12 }}>
          <B w={40} h={40} r="50%" />
          <div><B w={110} h={13} mb={6} /><B w={70} h={9} o={0.5} /></div>
        </Row>
      </div>
    </div>
  );
}

// ── Per-route content skeletons ──────────────────────────────────────────────
const Card = ({ h, mb = 16, o = 1 }) => <B w="100%" h={h} r={18} mb={mb} o={o} />;

function ResearchSkel() {
  // LEFT-aligned hero matching LandingHero: eyebrow, 3-line display heading,
  // subtitle, quote block, search pill, source-count chips, then the suggestion
  // card grid — with a faint globe/mountain glow on the right.
  return (
    <div style={{ flex: 1, position: "relative", padding: "48px 56px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, overflow: "hidden" }}>
      <B w={460} h={460} r="50%" o={0.18} style={{ position: "absolute", right: -120, top: "50%", transform: "translateY(-50%)" }} />
      <div style={{ position: "relative", maxWidth: 680 }}>
        {/* eyebrow */}
        <Row style={{ gap: 8, marginBottom: 26 }}>
          {[1, 0.5, 0.2].map((o, i) => <B key={i} w={6} h={6} o={o} style={{ transform: "rotate(45deg)" }} />)}
          <B w={230} h={10} o={0.5} />
        </Row>
        {/* big heading — 3 lines */}
        <B w={280} h={62} r={10} mb={10} />
        <B w={360} h={62} r={10} mb={10} />
        <B w={230} h={62} r={10} mb={20} />
        <B w={300} h={11} o={0.5} mb={16} />
        {/* quote block */}
        <div style={{ borderLeft: "2px solid rgba(0,255,71,0.35)", paddingLeft: 14, marginBottom: 34 }}>
          <B w={240} h={13} o={0.55} mb={9} /><B w={200} h={13} o={0.45} />
        </div>
        {/* search bar */}
        <B w="min(680px,100%)" h={58} r={9999} mb={18} />
        {/* source-count chips */}
        <Row style={{ gap: 6, marginBottom: 30, flexWrap: "wrap" }}>
          {[54, 40, 40, 40, 40, 46, 46, 46].map((w, i) => <B key={i} w={w} h={30} r={8} o={0.7} />)}
        </Row>
        {/* suggestion divider + card grid */}
        <B w={140} h={10} o={0.5} mb={16} style={{ margin: "0 auto 16px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} h={62} mb={0} o={0.9 - i * 0.07} />)}
        </div>
      </div>
    </div>
  );
}

function SearchSkel() {
  // Semantic search: centered search bar + a scattered "constellation" of
  // result nodes below.
  return (
    <div style={{ flex: 1, padding: "44px 48px", minWidth: 0, display: "flex", flexDirection: "column" }}>
      <B w={170} h={11} o={0.5} mb={12} style={{ margin: "0 auto 12px" }} />
      <B w="min(520px,70%)" h={46} r={12} mb={10} style={{ margin: "0 auto 10px" }} />
      <B w="min(360px,52%)" h={14} o={0.5} mb={28} style={{ margin: "0 auto 28px" }} />
      <B w="min(720px,92%)" h={56} r={9999} mb={40} style={{ margin: "0 auto 40px" }} />
      {/* constellation field */}
      <div style={{ position: "relative", flex: 1, minHeight: 260 }}>
        {[[12, 18, 22], [70, 40, 16], [38, 62, 28], [82, 72, 18], [55, 25, 14], [25, 78, 20], [90, 30, 12], [48, 48, 30], [8, 60, 16], [65, 85, 14]].map(([l, t, s], i) => (
          <B key={i} w={s} h={s} r="50%" o={0.8 - i * 0.05} style={{ position: "absolute", left: `${l}%`, top: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}

function DebateSkel() {
  return (
    <div style={{ flex: 1, padding: "52px", position: "relative", minWidth: 0 }}>
      {/* faint globe top-right */}
      <B w={420} h={420} r="50%" o={0.25} style={{ position: "absolute", right: -60, top: -40 }} />
      <div style={{ position: "relative", maxWidth: 920 }}>
        <B w={360} h={78} r={14} mb={6} style={{ transform: "skewX(-10deg)" }} />
        <B w={520} h={78} r={14} mb={22} style={{ transform: "skewX(-10deg)" }} />
        <B w={340} h={14} o={0.55} mb={22} />
        <div style={{ borderLeft: "3px solid rgba(255,32,64,0.35)", paddingLeft: 20, marginBottom: 34 }}>
          <B w={280} h={16} mb={8} o={0.6} /><B w={220} h={16} o={0.5} />
        </div>
        {/* input row */}
        <Row style={{ gap: 14, marginBottom: 40 }}>
          <B w="100%" h={56} r={14} /><B w={150} h={56} r={14} o={0.8} />
        </Row>
        {/* topic cards */}
        <B w={140} h={12} o={0.5} mb={20} style={{ margin: "0 auto 20px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} h={92} mb={0} o={0.9 - i * 0.08} />)}
        </div>
      </div>
    </div>
  );
}

function SettingsSkel() {
  return (
    <div style={{ flex: 1, padding: "44px 40px", maxWidth: 1000, minWidth: 0 }}>
      <B w={130} h={11} o={0.5} mb={12} />
      <B w={340} h={64} r={12} mb={16} />
      <B w={420} h={15} o={0.5} mb={10} />
      <B w="100%" h={1} mb={30} o={0.4} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="pt-sk" style={{ width: "100%", borderRadius: 18, padding: 26, marginBottom: 16, opacity: 0.92 - i * 0.06, boxSizing: "border-box" }}>
          <Row style={{ gap: 12, marginBottom: 18 }}><B w={32} h={32} r={8} o={0.7} /><B w={180} h={16} o={0.7} /></Row>
          <B w="70%" h={12} o={0.4} mb={10} /><B w="55%" h={12} o={0.35} />
        </div>
      ))}
    </div>
  );
}

function AnalyticsSkel() {
  return (
    <div style={{ flex: 1, padding: "24px 32px", minWidth: 0 }}>
      <Row style={{ gap: 14, marginBottom: 14 }}>{[0, 1, 2].map((i) => <B key={i} w={42} h={42} r={12} o={0.8} />)}</Row>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 30 }}>
        <div><B w={420} h={58} r={12} mb={14} /><B w={260} h={13} o={0.5} /></div>
        <Row style={{ gap: 10 }}><B w={140} h={38} r={9999} o={0.7} /><B w={110} h={38} r={9999} o={0.7} /></Row>
      </Row>
      {/* 4 stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => <Card key={i} h={120} mb={0} o={0.92 - i * 0.05} />)}
      </div>
      {/* row 1: 2fr + 1fr */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card h={360} mb={0} /><Card h={360} mb={0} o={0.8} />
      </div>
      {/* row 2: 1fr + 2fr */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
        <Card h={320} mb={0} o={0.85} /><Card h={320} mb={0} o={0.75} />
      </div>
    </div>
  );
}

function MemorySkel() {
  return (
    <div style={{ flex: 1, padding: "44px 44px", minWidth: 0 }}>
      <B w={150} h={11} o={0.5} mb={12} />
      <B w={440} h={72} r={12} mb={14} />
      <B w={360} h={15} o={0.5} mb={34} />
      {/* 4 stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 40 }}>
        {Array.from({ length: 4 }).map((_, i) => <Card key={i} h={130} mb={0} o={0.92 - i * 0.05} />)}
      </div>
      {/* content cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <Card key={i} h={150} mb={0} o={0.9 - i * 0.06} />)}
      </div>
    </div>
  );
}

function HeroSkel() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 40 }}>
      <B w={320} h={44} r={12} /><B w={440} h={16} o={0.6} /><B w={380} h={16} o={0.45} mb={26} />
      <Row style={{ gap: 14 }}><B w={150} h={46} r={12} /><B w={150} h={46} r={12} o={0.6} /></Row>
    </div>
  );
}

const CONTENT = { research: ResearchSkel, debate: DebateSkel, settings: SettingsSkel, analytics: AnalyticsSkel, memory: MemorySkel, search: SearchSkel, hero: HeroSkel };

export default function PageTransition() {
  const location = useLocation();
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [state, setState] = useState(reduced ? "idle" : "enter"); // enter | leave | idle
  const [route] = useState(() => routeFor(location.pathname));
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

  const Content = CONTENT[route.key] || ResearchSkel;
  const showSidebar = route.key !== "hero";

  return createPortal(
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 3500, background: VOID,
      display: "flex", overflow: "hidden",
      opacity: state === "leave" ? 0 : 1,
      transition: "opacity 0.4s ease",
      pointerEvents: state === "leave" ? "none" : "auto",
      // accent tint for the shimmer, matched to the destination page's theme
      ["--pt-accent"]: route.accent,
    }}>
      <style>{`
        @keyframes ptShimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .pt-sk {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(var(--pt-accent),0.09) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 600px 100%;
          animation: ptShimmer 1.25s infinite linear;
        }
      `}</style>
      {showSidebar && <SidebarSkel />}
      <Content />
    </div>,
    document.body
  );
}
