// Phase E — the semantic cluster map. Full-screen overlay that fetches
// /search/map (PCA 2D projection + KMeans clusters) and renders it as a themed
// SVG constellation coloured by cluster, with an auto-labelled legend.
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

const CLUSTER_COLORS = ['#00ff0f', '#00ccff', '#a855f7', '#ffd700', '#ff2040', '#00e6b8', '#ff8c00', '#5878d4'];

function tok() {
  if (typeof window !== 'undefined') return window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
  return '';
}

export default function SemanticMap({ open, onClose, onSelect }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (async () => {
      setBusy(true); setErr('');
      try {
        const t = tok();
        const r = await fetch(`${API_BASE_URL}/search/map`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
        setData(await r.json());
      } catch (e) { setErr('Could not build the map.'); }
      finally { setBusy(false); }
    })();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const pts = data?.points || [];
  const clusters = data?.clusters || [];
  // map -1..1 coords into a 1000x1000 viewBox with padding
  const project = (v) => 60 + ((v + 1) / 2) * 880;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'radial-gradient(circle at 50% 40%, rgba(8,10,24,0.94), rgba(4,4,10,0.98))', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.25s ease both' }}>
      <div style={{ position: 'absolute', top: 26, left: 32, right: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#00ccff', fontWeight: 700, marginBottom: 8 }}>Phase E · Semantic map</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Your knowledge, clustered</h2>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8ea0b6', margin: '9px 0 0' }}>
            {busy ? 'Projecting embeddings…' : `${data?.count || 0} research entries · ${clusters.length} auto-detected themes`}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Legend */}
      {clusters.length > 0 && (
        <div style={{ position: 'absolute', left: 32, bottom: 28, display: 'flex', flexDirection: 'column', gap: 7, maxHeight: '40vh', overflowY: 'auto', zIndex: 5 }}>
          {clusters.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length], boxShadow: `0 0 8px ${CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]}` }} />
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: '#d7e0ec' }}>{c.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6a7a8c' }}>· {c.size}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {busy && <div style={{ color: '#8ea0b6', fontFamily: "'Hanken Grotesk',sans-serif" }}>Computing clusters…</div>}
        {!busy && err && <div style={{ color: '#ff6b6b' }}>{err}</div>}
        {!busy && !err && pts.length === 0 && (
          <div style={{ color: '#8ea0b6', textAlign: 'center', fontFamily: "'Hanken Grotesk',sans-serif" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 34, color: '#00ccff', opacity: 0.7, display: 'block', marginBottom: 8 }}>bubble_chart</span>
            Not enough research yet to map. Run a few queries first.
          </div>
        )}
        {!busy && pts.length > 0 && (
          <svg viewBox="0 0 1000 1000" style={{ width: 'min(78vh, 92vw)', height: 'min(78vh, 92vw)' }}>
            {pts.map((p, i) => {
              const col = CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];
              const cx = project(p.x), cy = project(p.y);
              const active = hover === i;
              return (
                <g key={p.id || i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                   onClick={() => onSelect?.(p)} style={{ cursor: 'pointer' }}>
                  <circle cx={cx} cy={cy} r={active ? 9 : 5} fill={col} opacity={active ? 1 : 0.82}
                          style={{ filter: `drop-shadow(0 0 ${active ? 10 : 4}px ${col})`, transition: 'r 0.15s' }} />
                  {active && (
                    <text x={cx + 12} y={cy + 4} fill="#fff" fontSize="16" fontFamily="'Hanken Grotesk',sans-serif"
                          style={{ paintOrder: 'stroke', stroke: '#04040a', strokeWidth: 4 }}>
                      {(p.query || '').slice(0, 46)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
