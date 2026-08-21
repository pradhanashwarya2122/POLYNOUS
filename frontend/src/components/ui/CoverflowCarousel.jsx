import React from "react";

/*
  CoverflowCarousel — JS/Vite adaptation of the shadcn "coverflow-carousel" for
  POLYNOUS. No TypeScript / no `cn` / no lucide (chevrons are inline SVG). The 3D
  coverflow math, drag physics, keyboard handling and looping ring are ported
  verbatim from the original component; only the card *face* is themed (it renders
  arbitrary content via `renderCard` instead of a photo) and the styling uses
  inline theme colours instead of shadcn Tailwind tokens.

  ── HOW TO RESIZE THE CARDS ─────────────────────────────────────────────────
  The two props that control card size are `cardWidth` and `cardHeight`. They are
  set where this component is USED (in PremiumHomepage.jsx → TechHighlights).
  The defaults below are the fallback if those props are omitted.
*/

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function CoverflowCarousel({
  slides,
  renderCard,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  cardHeight = null, // null → square (aspect follows width); else any CSS length
  gap = 0.05,
  loop = true,
  showNavigation = true,
  label = "Cover carousel",
  className,
  onSelect,
}) {
  const count = slides.length;

  const frameRef = React.useRef(null);
  const cardRefs = React.useRef([]);
  const posRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef(null);
  const dragRef = React.useRef(null);

  const [selected, setSelected] = React.useState(0);

  const indexAt = React.useCallback(
    (pos) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  const setSel = React.useCallback(
    (i) => { setSelected(i); if (onSelect) onSelect(i); },
    [onSelect],
  );

  // Paint straight to the DOM — 60fps state updates would re-render every card.
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSel(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint, setSel],
  );

  const clampPos = React.useCallback(
    (pos) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index) => {
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clampPos(target));
    },
    [clampPos, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by) => settle(clampPos(Math.round(targetRef.current) + by)),
    [clampPos, settle],
  );

  const onPointerDown = (event) => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = { id: event.pointerId, x: event.clientX, pos: posRef.current, v: 0, t: performance.now() };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;
    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clampPos(drag.pos - (event.clientX - drag.x) / pitch);
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;
    const index = indexAt(posRef.current);
    if (index !== selected) setSel(index);
    paint();
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clampPos(Math.round(posRef.current + carried)));
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  const chevron = (dir) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );

  const navBtn = {
    position: "absolute", top: "50%", zIndex: 200, transform: "translateY(-50%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "42px", height: "42px", borderRadius: "9999px",
    background: "rgba(10,10,22,0.6)", border: "1px solid rgba(0,255,15,0.28)",
    color: "#eafff0", cursor: "pointer", backdropFilter: "blur(10px)",
    transition: "background 0.25s ease, border-color 0.25s ease",
  };

  return (
    <div
      className={className}
      style={{ width: "100%", ["--cf-card"]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div style={{ position: "relative" }}>
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); nudge(-1); }
            else if (event.key === "ArrowRight") { event.preventDefault(); nudge(1); }
          }}
          style={{
            cursor: "grab", overflow: "hidden", padding: "40px 0", outline: "none",
            perspective: `calc(var(--cf-card) * ${perspective})`,
            touchAction: "pan-y",
          }}
        >
          <div
            style={{
              position: "relative", userSelect: "none",
              height: cardHeight || "var(--cf-card)",
              transformStyle: "preserve-3d",
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(node) => { cardRefs.current[index] = node; }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                style={{
                  position: "absolute", left: "50%", top: 0,
                  width: "var(--cf-card)", height: cardHeight || "var(--cf-card)",
                  borderRadius: "20px", overflow: "hidden", willChange: "transform",
                }}
              >
                {renderCard ? renderCard(slide, index, index === selected) : (
                  <img src={slide.src} alt={slide.alt} draggable={false}
                    style={{ height: "100%", width: "100%", objectFit: "cover", userSelect: "none" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button type="button" aria-label="Previous slide" onClick={() => nudge(-1)}
              style={{ ...navBtn, left: "4px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,255,15,0.14)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(10,10,22,0.6)"; }}>
              {chevron("left")}
            </button>
            <button type="button" aria-label="Next slide" onClick={() => nudge(1)}
              style={{ ...navBtn, right: "4px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,255,15,0.14)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(10,10,22,0.6)"; }}>
              {chevron("right")}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: "22px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === selected}
            onClick={() => goTo(index)}
            style={{
              width: index === selected ? "22px" : "8px", height: "8px",
              borderRadius: "9999px", border: "none", cursor: "pointer", padding: 0,
              background: index === selected ? "#00ff0f" : "rgba(180,195,210,0.35)",
              transition: "width 0.3s cubic-bezier(0.23,1,0.32,1), background 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
