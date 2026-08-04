import { useRef, useEffect } from "react";
import "./CursorGrid.css";

/**
 * CursorGrid - a mousemove-reactive grid of cells that glow near the cursor.
 *
 * ⚠ Per the integration guide: do NOT mount this globally/full-viewport
 * alongside NeuralCanvas (already a full-page animated particle canvas).
 * This component is only ever mounted inside a small, contained,
 * position:relative section (see FinalCTA in PremiumHomepage.jsx).
 */
export default function CursorGrid({
  cellSize = 64,
  color = "#00ff0f",
  radius = 160,
  fadeDuration = 700,
  lineWidth = 1,
  maxOpacity = 0.55,
  fillOpacity = 0.03,
  gridOpacity = 0.02,
  clickPulse = false,
  pulseSpeed = 500,
}) {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const pulses = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let width, height;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onClick = (e) => {
      if (!clickPulse) return;
      const rect = canvas.getBoundingClientRect();
      pulses.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: 0 });
    };
    canvas.parentElement.addEventListener("mousemove", onMove);
    if (clickPulse) canvas.parentElement.addEventListener("click", onClick);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = `${color}${Math.round(gridOpacity * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = lineWidth;
      for (let x = 0; x <= width; x += cellSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += cellSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const px = cx * cellSize + cellSize / 2;
          const py = cy * cellSize + cellSize / 2;
          const d = Math.hypot(px - mouse.current.x, py - mouse.current.y);
          if (d < radius) {
            const t = 1 - d / radius;
            ctx.fillStyle = `${color}${Math.round(t * fillOpacity * 255).toString(16).padStart(2, "0")}`;
            ctx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
            ctx.strokeStyle = `${color}${Math.round(t * maxOpacity * 255).toString(16).padStart(2, "0")}`;
            ctx.strokeRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
          }
        }
      }
      pulses.current = pulses.current.filter((p) => p.t < 1);
      pulses.current.forEach((p) => {
        p.t += 16 / pulseSpeed;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.t * radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round((1 - p.t) * 255).toString(16).padStart(2, "0")}`;
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.parentElement.removeEventListener("mousemove", onMove);
      if (clickPulse) canvas.parentElement.removeEventListener("click", onClick);
    };
  }, [cellSize, color, radius, fadeDuration, lineWidth, maxOpacity, fillOpacity, gridOpacity, clickPulse, pulseSpeed]);

  return <canvas ref={canvasRef} className="cursor-grid-canvas" />;
}
