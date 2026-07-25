import { useEffect, useRef, useState } from "react";

// A smooth, spring-following cursor accent (POLYNOUS-themed). Additive: it
// trails the real pointer with easing and grows over interactive elements,
// without hiding the native cursor (so text I-beams / resize affordances still
// work in this form-heavy app). Auto-disabled on touch / coarse-pointer devices
// and when the user prefers reduced motion.
export default function SmoothCursor({ accent = "#00ff47" }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const raf = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: mouse.x, y: mouse.y };
    let hovering = false;
    let visible = false;

    // Handlers only update plain state — every DOM write happens in tick(),
    // so there's no race with the refs mounting after enabled flips true.
    const onMove = (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      visible = true;
      const el = e.target;
      hovering = !!(el && el.closest && el.closest('a,button,[role="button"],input,textarea,select,[data-cursor="grow"]'));
    };
    const onLeave = () => { visible = false; };

    const tick = () => {
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;
      const s = hovering ? 1.9 : 1;
      const r = ringRef.current, d = dotRef.current;
      if (r) {
        r.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${s})`;
        r.style.borderColor = hovering ? accent : `${accent}88`;
        r.style.opacity = visible ? "1" : "0";
      }
      if (d) {
        d.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
        d.style.opacity = (visible && !hovering) ? "1" : "0";
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [accent]);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} aria-hidden style={{
        position: "fixed", top: 0, left: 0, width: 34, height: 34, borderRadius: "50%",
        border: `1.5px solid ${accent}88`, boxShadow: `0 0 14px ${accent}44`,
        pointerEvents: "none", zIndex: 2147483646, opacity: 0,
        transition: "opacity 0.25s ease, border-color 0.2s ease",
        willChange: "transform", mixBlendMode: "screen",
      }} />
      <div ref={dotRef} aria-hidden style={{
        position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
        background: accent, boxShadow: `0 0 10px ${accent}`,
        pointerEvents: "none", zIndex: 2147483647, opacity: 0,
        transition: "opacity 0.2s ease", willChange: "transform",
      }} />
    </>
  );
}
