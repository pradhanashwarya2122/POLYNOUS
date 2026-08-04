import { useRef, useEffect, useCallback } from "react";
import "./VariableProximity.css";

function parseSettings(str) {
  // "'wght' 900, 'opsz' 40" -> {wght:900, opsz:40}
  const out = {};
  str.split(",").forEach((chunk) => {
    const m = chunk.trim().match(/'(\w+)'\s+([\d.]+)/);
    if (m) out[m[1]] = parseFloat(m[2]);
  });
  return out;
}

/**
 * VariableProximity - interpolates variable-font axes (wght/opsz) per
 * character based on distance from the cursor within `containerRef`.
 * Falls back gracefully to a static weight on fonts without real axes.
 */
export default function VariableProximity({
  label = "",
  fromFontVariationSettings,
  toFontVariationSettings,
  containerRef,
  radius = 150,
  falloff = "gaussian",
}) {
  const rootRef = useRef(null);
  const from = parseSettings(fromFontVariationSettings || "'wght' 400");
  const to = parseSettings(toFontVariationSettings || "'wght' 900");
  const chars = Array.from(label);

  const handleMove = useCallback(
    (e) => {
      const root = rootRef.current;
      if (!root) return;
      const spans = root.querySelectorAll(".vp-char");
      spans.forEach((span) => {
        const rect = span.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        let t = Math.max(0, 1 - dist / radius);
        if (falloff === "gaussian") t = Math.exp(-Math.pow(dist / (radius * 0.5), 2));
        const settings = Object.keys(to)
          .map((axis) => {
            const v = (from[axis] ?? 400) + ((to[axis] ?? 900) - (from[axis] ?? 400)) * t;
            return `'${axis}' ${v}`;
          })
          .join(", ");
        span.style.fontVariationSettings = settings;
        span.style.fontWeight = Math.round((from.wght ?? 400) + ((to.wght ?? 900) - (from.wght ?? 400)) * t);
      });
    },
    [radius, falloff, from, to]
  );

  useEffect(() => {
    const container = containerRef?.current || document;
    container.addEventListener("mousemove", handleMove);
    return () => container.removeEventListener("mousemove", handleMove);
  }, [containerRef, handleMove]);

  return (
    <span ref={rootRef} className="variable-proximity">
      {chars.map((c, i) => (
        <span key={i} className="vp-char" style={{ display: "inline-block", fontVariationSettings: fromFontVariationSettings }}>
          {c === " " ? "\u00A0" : c}
        </span>
      ))}
    </span>
  );
}
