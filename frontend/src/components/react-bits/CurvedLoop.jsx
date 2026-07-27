import { useRef, useState, useCallback } from "react";
import "./CurvedLoop.css";

export default function CurvedLoop({
  marqueeText = "",
  speed = 1.4,
  curveAmount = 140,
  direction = "left",
  interactive = true,
  className = "",
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(0);
  const offsetStart = useRef(0);
  const dirRef = useRef(direction === "left" ? -1 : 1);
  const pathId = useRef(`curved-loop-path-${Math.random().toString(36).slice(2, 9)}`).current;

  useState(() => {
    let raf;
    const tick = () => {
      if (!dragging) setOffset((o) => o + speed * dirRef.current * 0.5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const onPointerDown = useCallback(
    (e) => {
      if (!interactive) return;
      setDragging(true);
      dragStart.current = e.clientX;
      offsetStart.current = offset;
    },
    [interactive, offset]
  );
  const onPointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      setOffset(offsetStart.current + (e.clientX - dragStart.current) * 0.6);
    },
    [dragging]
  );
  const onPointerUp = useCallback(() => setDragging(false), []);

  const curve = curveAmount;
  const text = (marqueeText + " ").repeat(8);

  return (
    <div
      className={`curved-loop-jacket ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ cursor: interactive ? (dragging ? "grabbing" : "grab") : "default" }}
    >
      <svg viewBox="0 0 1440 200" className="curved-loop-svg">
        <defs>
          <path id={pathId} d={`M 0 100 Q 720 ${100 - curve} 1440 100`} fill="none" />
        </defs>
        <text className="curved-loop-text-el">
          <textPath href={`#${pathId}`} startOffset={`${offset % 100}%`}>
            {text}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
