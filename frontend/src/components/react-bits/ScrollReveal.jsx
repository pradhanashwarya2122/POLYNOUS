import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./ScrollReveal.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollReveal - word-by-word opacity+blur-in with a subtle container rotation
 * as the block scrolls through the viewport.
 *
 * `tag` lets you render something other than <h2> as the wrapper (default
 * matches upstream React Bits, but POLYNOUS forks this to `div` wherever the
 * text sits below a real heading, to avoid double <h2>s).
 */
export default function ScrollReveal({
  children,
  tag: Tag = "h2",
  baseOpacity = 0.1,
  enableBlur = true,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
}) {
  const containerRef = useRef(null);
  const text = typeof children === "string" ? children : String(children);
  const words = text.split(" ");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const wordEls = el.querySelectorAll(".sr-word");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { rotate: baseRotation },
        {
          rotate: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom center", scrub: true },
        }
      );
      gsap.fromTo(
        wordEls,
        { opacity: baseOpacity, filter: enableBlur ? `blur(${blurStrength}px)` : "none" },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom-=10%", end: "bottom center", scrub: true },
        }
      );
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <span className={`scroll-reveal-text ${textClassName}`}>
        {words.map((w, i) => (
          <span className="sr-word" key={i}>
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </span>
    </Tag>
  );
}
