import { useRef, useEffect } from "react";
import "./MagicBento.css";

/**
 * GlobalSpotlight - a single cursor-tracked radial glow that lights up
 * whichever `.magic-bento-card--border-glow` cards it's near, scoped to
 * the grid referenced by `gridRef`.
 *
 * NOTE: per the integration guide (Path B), only this sub-component plus
 * the `.magic-bento-card--border-glow::after` CSS rule are used against
 * POLYNOUS's existing `feat-card` markup - ParticleCard, tilt, and
 * magnetism from the full upstream MagicBento are intentionally not wired
 * in, to avoid fighting the existing feat-card hover system.
 */
export function GlobalSpotlight({ gridRef, spotlightRadius = 280, glowColor = "0, 255, 15" }) {
  const spotRef = useRef(null);

  useEffect(() => {
    const grid = gridRef?.current;
    if (!grid) return;
    const spot = spotRef.current;

    const onMove = (e) => {
      const rect = grid.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spot.style.transform = `translate(${x}px, ${y}px)`;
      spot.style.opacity = "1";

      const cards = grid.querySelectorAll(".magic-bento-card--border-glow");
      cards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const cx = e.clientX - cr.left;
        const cy = e.clientY - cr.top;
        const dist = Math.hypot(e.clientX - (cr.left + cr.width / 2), e.clientY - (cr.top + cr.height / 2));
        const near = dist < spotlightRadius;
        card.style.setProperty("--glow-x", `${cx}px`);
        card.style.setProperty("--glow-y", `${cy}px`);
        card.style.setProperty("--glow-intensity", near ? String(Math.max(0, 1 - dist / spotlightRadius)) : "0");
      });
    };
    const onLeave = () => {
      spot.style.opacity = "0";
      grid.querySelectorAll(".magic-bento-card--border-glow").forEach((card) => {
        card.style.setProperty("--glow-intensity", "0");
      });
    };

    grid.addEventListener("mousemove", onMove);
    grid.addEventListener("mouseleave", onLeave);
    return () => {
      grid.removeEventListener("mousemove", onMove);
      grid.removeEventListener("mouseleave", onLeave);
    };
  }, [gridRef, spotlightRadius]);

  return (
    <div
      ref={spotRef}
      className="magic-bento-global-spotlight"
      style={{ "--spotlight-radius": `${spotlightRadius}px`, "--spotlight-color": glowColor }}
    />
  );
}

export default function MagicBento() {
  // Full upstream BentoCardGrid/ParticleCard intentionally not used - see
  // GlobalSpotlight docblock above. Exported as a default no-op so importing
  // the whole file (rather than just GlobalSpotlight) doesn't break a build.
  return null;
}
