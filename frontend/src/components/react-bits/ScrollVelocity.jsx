import { useRef } from "react";
import { motion, useScroll, useVelocity, useSpring, useTransform, useAnimationFrame } from "motion/react";
import "./ScrollVelocity.css";

function VelocityRow({ text, baseVelocity, velocityFactor, numCopies, className }) {
  const baseX = useRef(0);
  const ref = useRef(null);

  useAnimationFrame((t, delta) => {
    let moveBy = baseVelocity * (delta / 1000);
    moveBy += moveBy * velocityFactor.get();
    baseX.current += moveBy;
    // wrap
    const wrap = -100 / numCopies;
    if (baseX.current <= wrap) baseX.current = 0;
    if (baseX.current > 0) baseX.current = wrap;
    if (ref.current) ref.current.style.transform = `translateX(${baseX.current}%)`;
  });

  return (
    <div className="scroll-velocity-row">
      <div ref={ref} className="scroll-velocity-track">
        {Array.from({ length: numCopies }).map((_, i) => (
          <span key={i} className={className}>
            {text}&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ScrollVelocity({ texts = [], velocity = 40, numCopies = 4, className = "" }) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });

  return (
    <div className="scroll-velocity-wrap">
      {texts.map((text, i) => (
        <VelocityRow
          key={i}
          text={text}
          baseVelocity={i % 2 === 0 ? velocity : -velocity}
          velocityFactor={velocityFactor}
          numCopies={numCopies}
          className={className}
        />
      ))}
    </div>
  );
}
