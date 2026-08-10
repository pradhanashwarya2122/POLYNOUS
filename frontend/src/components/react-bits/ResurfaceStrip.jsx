// Phase F — spaced-repetition "revisit" strip (from /memory/resurface).
// Surfaces older, well-supported research worth revisiting.
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function tok() {
  if (typeof window !== 'undefined') return window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
  return '';
}

export default function ResurfaceStrip({ onOpen, accent = '#00e6b8' }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const t = tok();
        const r = await fetch(`${API_BASE_URL}/memory/resurface?limit=5`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
        const d = await r.json();
        setItems(d.resurface || []);
      } catch (_) { /* silent */ }
    })();
  }, []);

  if (!items.length) return null;

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: accent }}>history</span>
        <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#fff' }}>Worth revisiting</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: '#6a7a8c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>spaced repetition</span>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
        {items.map((it, i) => (
          <button key={i} onClick={() => onOpen?.(it.query, it.mode)}
            style={{ flex: '0 0 240px', textAlign: 'left', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}2e`, borderRadius: 13, padding: '14px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: it.mode === 'debate' ? '#ff2040' : accent }}>{it.mode === 'debate' ? 'forum' : 'travel_explore'}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7c8a99', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.days_since}d ago</span>
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: '#dbe6f2', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.query}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
