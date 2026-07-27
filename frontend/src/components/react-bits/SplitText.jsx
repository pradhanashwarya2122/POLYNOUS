import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * SplitText — per-character or per-word stagger reveal.
 * NOTE: implemented with core GSAP + ScrollTrigger only (no `gsap/SplitText`
 * club plugin dependency), so it works regardless of your GSAP license tier.
 * Splitting is done manually by wrapping each char/word in its own <span>.
 */
export default function SplitText({
  text = "",
  tag: Tag = "span",
  className = "",
  delay = 30,
  duration = 0.9,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.3,
  textAlign = "left",
  onComplete,
}) {
  const rootRef = useRef(null);

  const pieces = splitType === "words" ? text.split(" ") : Array.from(text);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll("[data-split-unit]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        from,
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          onComplete,
          scrollTrigger: {
            trigger: root,
            start: `top ${100 - threshold * 100}%`,
            once: true,
          },
        }
      );
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Tag ref={rootRef} className={`split-parent ${className}`} style={{ textAlign, display: "inline-block" }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          data-split-unit
          className={splitType === "words" ? "split-word" : "split-char"}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {splitType === "words" ? p + (i < pieces.length - 1 ? "\u00A0" : "") : p}
        </span>
      ))}
    </Tag>
  );
}
