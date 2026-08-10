// Phase E — research forecast (from /memory/forecast): activity trend,
// projected sessions next week, and trending topics.
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function tok() {
  if (typeof window !== 'undefined') return window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
  return '';
}

const TREND = {
  rising: { icon: 'trending_up', color: '#00ff0f', label: 'Rising' },
  steady: { icon: 'trending_flat', color: '#00ccff', label: 'Steady' },
  declining: { icon: 'trending_down', color: '#ffaa00', label: 'Cooling off' },
  flat: { icon: 'trending_flat', color: '#8ea0b6', label: 'Flat' },
};

export default function ForecastPanel({ open, onClose, accent = '#5878d4' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    (async () => {
      setBusy(true); setErr('');
      try {
        const t = tok();
        const r = await fetch(`${API_BASE_URL}/memory/forecast`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
        setData(await r.json());
      } catch (e) { setErr('Could not build the forecast.'); }
      finally { setBusy(false); }
    })();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tr = TREND[data?.activity_trend] || TREND.flat;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.25s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 96vw)', background: 'rgba(10,14,24,0.96)', border: `1px solid ${accent}44`, borderRadius: 18, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: accent, fontWeight: 700, marginBottom: 6 }}>Phase E · Forecast</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>Where your research is heading</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, width: 36, height: 36, color: '#fff', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        {busy && <div style={{ color: '#8ea0b6', fontFamily: "'Hanken Grotesk',sans-serif" }}>Analysing history…</div>}
        {err && <div style={{ color: '#ff6b6b' }}>{err}</div>}
        {data && !busy && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${tr.color}33`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: tr.color }}>{tr.icon}</span>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 4 }}>{tr.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#8ea0b6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>activity trend</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff' }}>{data.projected_sessions_next_week ?? '—'}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#8ea0b6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>projected next week</div>
              </div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: 9 }}>Trending topics</div>
            {(data.trending_topics || []).length === 0 && <div style={{ color: '#8ea0b6', fontSize: 12.5 }}>Not enough history yet.</div>}
            {(data.trending_topics || []).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: accent, width: 20 }}>{i + 1}</span>
                <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: '#dbe6f2', flex: 1 }}>{t.topic}</span>
              </div>
            ))}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: '#6a7a8c', marginTop: 14 }}>Based on {data.sessions_analysed || 0} sessions.</div>
          </>
        )}
      </div>
    </div>
  );
}
