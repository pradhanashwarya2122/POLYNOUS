import { useState, useRef, useEffect } from "react";

// Character-by-character reveal driven by requestAnimationFrame at `cps`
// characters/second. Appending to existing text continues the reveal;
// brand-new text restarts it. Extracted verbatim from the two engines
// (Phase 7 - shared, no behavior change). All call sites pass an explicit
// cps, so the default is only a fallback.
export function useTypewriter(fullText, cps = 110) {
  const [revealed, setRevealed] = useState(0);
  const revealedRef = useRef(0);
  const textRef = useRef("");

  useEffect(() => {
    const text = fullText || "";
    // Brand-new text (not an extension of the old one) restarts the reveal.
    if (!text.startsWith(textRef.current.slice(0, revealedRef.current))) {
      revealedRef.current = 0;
      setRevealed(0);
    }
    textRef.current = text;
    if (revealedRef.current >= text.length) return undefined;

    let raf;
    let last = performance.now();
    const step = (now) => {
      const chars = ((now - last) / 1000) * cps;
      if (chars >= 1) {
        last = now;
        revealedRef.current = Math.min(text.length, revealedRef.current + Math.floor(chars));
        setRevealed(revealedRef.current);
      }
      if (revealedRef.current < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fullText, cps]);

  const text = fullText || "";
  return { visibleText: text.slice(0, revealed), typing: revealed < text.length };
}
