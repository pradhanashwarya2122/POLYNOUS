import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./ScrollFloat.css";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollFloat({
  children,
  containerClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  scrollStart = "center bottom+=30%",
  scrollEnd = "bottom bottom-=30%",
  stagger = 0.03,
}) {
  const containerRef = useRef(null);
  const text = typeof children === "string" ? children : String(children);
  const chars = Array.from(text);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const targets = el.querySelectorAll(".char");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, yPercent: 120 },
        {
          opacity: 1,
          yPercent: 0,
          duration: animationDuration,
          ease,
          stagger,
          scrollTrigger: {
            trigger: el,
            start: scrollStart,
            end: scrollEnd,
            scrub: false,
            toggleActions: "play none none none",
          },
        }
      );
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={`scroll-float ${containerClassName}`}>
      <span className="scroll-float-text">
        {chars.map((c, i) => (
          <span className="char" key={i} style={{ display: "inline-block" }}>
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </span>
    </div>
  );
}
