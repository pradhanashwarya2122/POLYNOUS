import { useEffect, useRef, useState } from "react";

// magicui SmoothCursor - a spring-following arrow that rotates toward the
// direction of travel and replaces the native pointer. Implemented with rAF
// springs (no motion/framer-motion dependency) but matching magicui's default
// behaviour: stiffness/damping-style smoothing on position + rotation, a slight
// squash while moving fast, and the default arrow SVG.
//
// Auto-disabled on touch / coarse-pointer devices and when the user prefers
// reduced motion, in which case the OS cursor is left untouched.

const DefaultCursorSVG = (
  <svg
    width="25"
    height="27"
    viewBox="0 0 25 27"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path
      d="M4.5 1.5L4.5 22.4L10.1 17.0L13.4 24.7L16.9 23.2L13.6 15.6L21.3 15.1L4.5 1.5Z"
      fill="#0a0a1e"
      stroke="#ffffff"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export default function SmoothCursor() {
  const elRef = useRef(null);
  const raf = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);

    // Hide the native cursor everywhere while the smooth cursor is mounted.
    const prevCursor = document.documentElement.style.cursor;
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-smooth-cursor", "");
    styleTag.textContent = `* { cursor: none !important; }`;
    document.head.appendChild(styleTag);
    document.documentElement.style.cursor = "none";

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let angle = 0;          // current (smoothed) rotation, degrees
    let targetAngle = 0;    // rotation implied by latest movement
    let visible = false;
    let lastMoveTs = performance.now();

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      visible = true;
      lastMoveTs = performance.now();
      // Safety net: paint immediately so the arrow is never invisible while the
      // native cursor is hidden, even if rAF is throttled. tick() then smooths.
      const el = elRef.current;
      if (el) {
        el.style.opacity = "1";
        if (!el.style.transform) {
          el.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
        }
      }
    };
    const onLeave = () => { visible = false; };

    const shortestDelta = (from, to) => {
      let d = (to - from) % 360;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return d;
    };

    const tick = () => {
      // Spring-follow position (magicui-like smoothing).
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      pos.x += dx * 0.2;
      pos.y += dy * 0.2;

      const speed = Math.hypot(dx, dy);
      // Rotate toward the direction of travel; the arrow's rest orientation
      // points up, so offset by 90° from the motion vector's atan2.
      if (speed > 0.6) {
        targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      }
      angle += shortestDelta(angle, targetAngle) * 0.22;

      // Idle for a beat → drift back to the neutral (upright) pose.
      if (performance.now() - lastMoveTs > 220) {
        targetAngle = angle > 180 || angle < -180 ? 0 : targetAngle;
      }

      // Subtle squash while moving quickly, like the reference component.
      const scale = 1 - Math.min(speed, 40) / 400;

      const el = elRef.current;
      if (el) {
        el.style.transform =
          `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${angle}deg) scale(${scale})`;
        el.style.opacity = visible ? "1" : "0";
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      cancelAnimationFrame(raf.current);
      document.documentElement.style.cursor = prevCursor;
      styleTag.remove();
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={elRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        // Anchor the arrow tip (top-left of the SVG) at the pointer.
        transformOrigin: "4px 2px",
        pointerEvents: "none",
        zIndex: 2147483647,
        opacity: 0,
        willChange: "transform",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
      }}
    >
      {DefaultCursorSVG}
    </div>
  );
}
