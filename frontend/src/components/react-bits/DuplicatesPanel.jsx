// Phase F — near-duplicate research entries (from /search/duplicates), shown as
// grouped cards so the user can spot redundancy in their memory.
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

function tok() {
  if (typeof window !== 'undefined') return window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
  return '';
}

export default function DuplicatesPanel({ open, onClose, accent = '#00e6b8' }) {
  const [groups, setGroups] = useState(null);
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
        const r = await fetch(`${API_BASE_URL}/search/duplicates`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
        const d = await r.json();
        setGroups(d.groups || []);
      } catch (e) { setErr('Could not scan for duplicates.'); }
      finally { setBusy(false); }
    })();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px', overflowY: 'auto', animation: 'fadeIn 0.25s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px, 96vw)', background: 'rgba(10,14,24,0.96)', border: `1px solid ${accent}33`, borderRadius: 18, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: accent, fontWeight: 700, marginBottom: 6 }}>Phase F · Memory hygiene</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>Near-duplicate research</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, width: 36, height: 36, color: '#fff', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        {busy && <div style={{ color: '#8ea0b6', fontFamily: "'Hanken Grotesk',sans-serif" }}>Scanning embeddings…</div>}
        {err && <div style={{ color: '#ff6b6b' }}>{err}</div>}
        {groups && groups.length === 0 && !busy && (
          <div style={{ color: '#8ea0b6', fontFamily: "'Hanken Grotesk',sans-serif", padding: '10px 0' }}>No near-duplicates found — your memory is clean.</div>
        )}
        {groups && groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${accent}22`, borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.length} similar entries</div>
            {g.map((m, mi) => (
              <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: mi ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: m.mode === 'debate' ? '#ff2040' : accent }}>{m.mode === 'debate' ? 'forum' : 'travel_explore'}</span>
                <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#dbe6f2' }}>{m.query}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
