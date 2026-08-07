// A full-screen, POLYNOUS-themed overlay that hosts the InfiniteMenu sphere.
// Reused across pages (Knowledge Graph, Landing, Memory Bank, Semantic Search,
// PDF Lab). Give it items (with .image tiles) + onSelect; it handles the
// backdrop, header, hint, and close.
import { useEffect } from 'react';
import InfiniteMenu from './InfiniteMenu';

export default function ConstellationExplorer({
  open,
  onClose,
  items = [],
  onSelect,
  heading = 'Constellation Explorer',
  subheading = 'Drag to spin. Release to snap. Tap the arrow to open.',
  accent = '#00ff0f',
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'radial-gradient(circle at 50% 40%, rgba(8,10,24,0.92), rgba(4,4,10,0.97))',
        backdropFilter: 'blur(10px)', animation: 'fadeIn 0.25s ease both',
      }}
    >
      {/* Header */}
      <div style={{ position: 'absolute', top: 26, left: 32, right: 32, zIndex: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: accent, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Constellation</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: 0, lineHeight: 1 }}>{heading}</h2>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8ea0b6', margin: '9px 0 0', maxWidth: 420, lineHeight: 1.5 }}>{subheading}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explorer"
          style={{ pointerEvents: 'auto', flexShrink: 0, width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Sphere */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {items.length > 0
          ? <InfiniteMenu items={items} onSelect={onSelect} />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#8ea0b6', fontFamily: "'Hanken Grotesk',sans-serif" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 34, color: accent, opacity: 0.7 }}>hub</span>
              <div>Nothing to explore yet.</div>
            </div>
          )}
      </div>
    </div>
  );
}
