import { useRef, useCallback } from "react";
import "./ScrambledText.css";

/**
 * ScrambledText — scrambles characters near the cursor, then resolves back
 * to the original text. Implemented with plain rAF/text manipulation
 * (no `gsap/ScrambleTextPlugin` club-plugin dependency required).
 */
export default function ScrambledText({
  children,
  radius = 80,
  duration = 0.8,
  speed = 0.4,
  scrambleChars = "!@#$%^&*",
  className = "",
}) {
  const original = typeof children === "string" ? children : String(children);
  const spanRef = useRef(null);
  const timers = useRef({});

  const scrambleChar = useCallback(
    (el, finalChar) => {
      const id = el.dataset.idx;
      if (timers.current[id]) clearInterval(timers.current[id]);
      const start = performance.now();
      const durMs = duration * 1000 * speed;
      timers.current[id] = setInterval(() => {
        const elapsed = performance.now() - start;
        if (elapsed >= durMs) {
          el.textContent = finalChar;
          clearInterval(timers.current[id]);
          return;
        }
        el.textContent = finalChar === " " ? " " : scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
      }, 40);
    },
    [duration, speed, scrambleChars]
  );

  const handleMove = useCallback(
    (e) => {
      const root = spanRef.current;
      if (!root) return;
      const spans = root.querySelectorAll(".scrambled-char");
      spans.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < radius) scrambleChar(el, el.dataset.final);
      });
    },
    [radius, scrambleChar]
  );

  return (
    <p ref={spanRef} className={`scrambled-text ${className}`} onMouseMove={handleMove}>
      {Array.from(original).map((c, i) => (
        <span key={i} className="scrambled-char" data-idx={i} data-final={c}>
          {c}
        </span>
      ))}
    </p>
  );
}
