import { useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * MaskContainer - a cursor-driven spotlight mask. The base layer shows
 * `children`; wherever the cursor moves, a soft circular hole is cut through it
 * to reveal `revealText` underneath. The hole grows on hover.
 *
 * Self-contained port of the Aceternity svg-mask-effect: inline styles + the
 * `motion` package already in this project (no Tailwind, no cn()).
 */
export function MaskContainer({
  children,
  revealText,
  size = 44,
  revealSize = 340,
  className = "",
  style,
  baseColor = "rgba(6,6,18,0.96)",
  revealBg = "linear-gradient(135deg,#00ff0f,#00ccff,#a855f7)",
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const s = hovered ? revealSize : size;
  const cx = pos.x == null ? "50%" : `${pos.x}px`;
  const cy = pos.y == null ? "50%" : `${pos.y}px`;
  // Transparent hole at the cursor → the reveal layer shows through it.
  const holeMask = `radial-gradient(${s}px ${s}px at ${cx} ${cy}, transparent 0%, transparent 40%, black 66%)`;

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPos({ x: null, y: null }); }}
      style={{ position: "relative", overflow: "hidden", cursor: "none", ...style }}
    >
      {/* Reveal layer (underneath) */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8%",
        background: revealBg, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        {revealText}
      </div>
      {/* Base layer (on top), with a moving hole cut to the cursor */}
      <motion.div
        style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8%",
          background: baseColor, color: "#fff",
          maskImage: holeMask, WebkitMaskImage: holeMask, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
          transition: "mask-image 0.15s ease, -webkit-mask-image 0.15s ease" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default MaskContainer;
