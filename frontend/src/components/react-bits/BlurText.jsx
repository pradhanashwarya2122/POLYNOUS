import { useRef } from "react";
import { motion, useInView } from "motion/react";

/**
 * BlurText - animates text by word (or char) with a blur-to-sharp settle.
 * Lightweight: Motion only, no GSAP dependency.
 */
export default function BlurText({
  text = "",
  animateBy = "words",
  direction = "top",
  delay = 15,
  stepDuration = 0.3,
  className = "",
  once = true,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  const pieces = animateBy === "words" ? text.split(" ") : Array.from(text);
  const yFrom = direction === "top" ? -16 : 16;

  return (
    <p ref={ref} className={className} style={{ display: "flex", flexWrap: "wrap" }}>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(10px)", y: yFrom }}
          animate={inView ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
          transition={{ duration: stepDuration, delay: (i * delay) / 1000, ease: "easeOut" }}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {p}
          {animateBy === "words" && i < pieces.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </p>
  );
}
