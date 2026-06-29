import { useState, useRef, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '../config'

// ─── Keyframe injection (runs once) ──────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0&display=swap');

  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 5px #00ff0f); }
    50%       { opacity: 1;   filter: drop-shadow(0 0 14px #00ff0f); }
  }
  @keyframes blink {
    from, to { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .polynous-input::placeholder { color: #555555; }
  .polynous-input:focus        { outline: none; }

  .polynous-btn {
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  }
  .polynous-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 32px rgba(0,255,15,0.65);
  }
  .polynous-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .polynous-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .api-key-row {
    transition: background 0.15s ease;
  }
  .api-key-row:hover {
    background: rgba(255,255,255,0.025);
  }
  .api-reveal-btn {
    transition: color 0.15s ease, opacity 0.15s ease;
    opacity: 0.4;
  }
  .api-reveal-btn:hover {
    opacity: 1;
  }
  .api-key-input::placeholder { color: #3a3a4a; }
  .api-key-input:focus { outline: none; }
`

function injectStyles() {
  if (document.getElementById('polynous-profile-styles')) return
  const tag = document.createElement('style')
  tag.id = 'polynous-profile-styles'
  tag.textContent = STYLES
  document.head.appendChild(tag)
}

// ─── Neural Canvas (unchanged) ────────────────────────────────────────────────
function NeuralCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let particles = [], animId
    const N = 120, maxDist = 150

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    class P {
      constructor() {
        this.x  = Math.random() * canvas.width
        this.y  = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.r  = Math.random() * 2 + 1
      }
      update() {
        this.x += this.vx; this.y += this.vy
        if (this.x < 0 || this.x > canvas.width)  this.vx *= -1
        if (this.y < 0 || this.y > canvas.height)  this.vy *= -1
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,255,15,0.4)'
        ctx.fill()
      }
    }

    const init = () => { particles = Array.from({ length: N }, () => new P()) }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p, i) => {
        p.update(); p.draw()
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0,204,255,${0.1 * (1 - dist / maxDist)})`
            ctx.lineWidth = 1
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
          }
        }
      })
      animId = requestAnimationFrame(animate)
    }

    const onResize = () => { resize(); init() }
    const onMove   = (e) => {
      particles.forEach(p => {
        const dx = e.clientX - p.x, dy = e.clientY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) { p.vx += dx * 0.00005; p.vy += dy * 0.00005 }
      })
    }

    resize(); init(); animate()
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}

// ─── Sub-components (unchanged) ───────────────────────────────────────────────
function SynapseDot({ style }) {
  return (
    <div style={{
      width: 4, height: 4,
      background: '#00ff0f',
      borderRadius: '50%',
      position: 'absolute',
      boxShadow: '0 0 8px #00ff0f',
      ...style,
    }} />
  )
}

function BrainIcon() {
  return (
    <div style={{
      width: 64, height: 64,
      background: 'rgba(30,30,50,0.8)',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(0,255,15,0.3)',
      animation: 'pulseGlow 3s infinite ease-in-out',
    }}>
      <span
        className="material-symbols-outlined"
        style={{ color: '#00ff0f', fontSize: 36 }}
      >
        psychology
      </span>
    </div>
  )
}

function StatusDot({ state }) {
  const colors = { idle: 'transparent', checking: '#f59e0b', valid: '#00ff0f', invalid: '#ff2040', saved: '#00ccff' }
  const labels = { idle: '', checking: 'CHECKING', valid: 'AVAILABLE', invalid: 'INVALID', saved: 'SAVED' }
  if (state === 'idle') return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.2s ease' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, letterSpacing: '0.06em',
        color: colors[state],
      }}>
        {labels[state]}
      </span>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: colors[state],
        boxShadow: `0 0 8px ${colors[state]}`,
      }} />
    </div>
  )
}

// ─── Style Dial (unchanged) ────────────────────────────────────────────────────
const STYLES_MAP = {
  academic:  { label: 'Academic',  icon: 'auto_stories', accent: '#00ff0f', angle: 0,   sub: 'Peer-grade rigour · Cited' },
  technical: { label: 'Technical', icon: 'terminal',     accent: '#a855f7', angle: 90,  sub: 'Spec-level · Statistically rigorous' },
  eli5:      { label: 'ELI5',      icon: 'lightbulb',    accent: '#ffb800', angle: 180, sub: 'Feynman method · Always clear' },
  casual:    { label: 'Casual',    icon: 'chat_bubble',  accent: '#00ccff', angle: 270, sub: 'Brilliant friend · Zero jargon' },
}

function hexToRgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',')
}

const CX = 130, CY = 130, NODE_R = 86, NODE_BTN = 44
const NODE_POS = {
  academic:  { x: CX,          y: CY - NODE_R },
  technical: { x: CX + NODE_R, y: CY          },
  eli5:      { x: CX,          y: CY + NODE_R },
  casual:    { x: CX - NODE_R, y: CY          },
}

function StyleDial({ selected, onChange }) {
  const [needleAngle, setNeedleAngle] = useState(0)
  const [isDragging,  setIsDragging]  = useState(false)
  const dialRef = useRef(null)
  const dragRef = useRef(null)

  const getMouseAngle = useCallback((e) => {
    if (!dialRef.current) return 0
    const r  = dialRef.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width  / 2)
    const dy = e.clientY - (r.top  + r.height / 2)
    return Math.atan2(dy, dx) * 180 / Math.PI
  }, [])

  const nearestMode = useCallback((angle) => {
    const norm = ((angle % 360) + 360) % 360
    return Object.entries(STYLES_MAP).reduce((best, [id, opt]) => {
      let diff = Math.abs(norm - opt.angle)
      if (diff > 180) diff = 360 - diff
      return diff < best.diff ? { id, diff } : best
    }, { id: 'academic', diff: Infinity }).id
  }, [])

  const snapTo = useCallback((fromAngle, modeId) => {
    const target = STYLES_MAP[modeId].angle
    const curr   = ((fromAngle % 360) + 360) % 360
    let delta    = target - curr
    if (delta >  180) delta -= 360
    if (delta < -180) delta += 360
    setNeedleAngle(fromAngle + delta)
    onChange(modeId)
  }, [onChange])

  const selectStyle = useCallback((id) => {
    if (id === selected) return
    snapTo(needleAngle, id)
  }, [selected, needleAngle, snapTo])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    dragRef.current = {
      startMouseAngle:  getMouseAngle(e),
      startNeedleAngle: needleAngle,
    }
    setIsDragging(true)
  }, [getMouseAngle, needleAngle])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e) => {
      const delta = getMouseAngle(e) - dragRef.current.startMouseAngle
      setNeedleAngle(dragRef.current.startNeedleAngle + delta)
    }
    const onUp = (e) => {
      const finalAngle = dragRef.current.startNeedleAngle +
                         (getMouseAngle(e) - dragRef.current.startMouseAngle)
      const mode = nearestMode(finalAngle)
      snapTo(finalAngle, mode)
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [isDragging, getMouseAngle, nearestMode, snapTo])

  const active = STYLES_MAP[selected]

  const ticks = Array.from({ length: 36 }, (_, i) => {
    const vis = i * 10
    const rad  = (vis - 90) * Math.PI / 180
    const maj  = vis % 90 === 0
    return {
      x1: CX + 112 * Math.cos(rad), y1: CY + 112 * Math.sin(rad),
      x2: CX + (maj ? 100 : 107) * Math.cos(rad),
      y2: CY + (maj ? 100 : 107) * Math.sin(rad),
      major: maj,
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.16em', color: '#444', textTransform: 'uppercase',
        }}>Response Style</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={dialRef} style={{ position: 'relative', width: 260, height: 260, flexShrink: 0, cursor: isDragging ? 'grabbing' : 'grab' }}>
          <svg width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', userSelect: 'none' }} onMouseDown={handleMouseDown}>
            <circle cx={CX} cy={CY} r={113} fill="none" stroke={`rgba(${hexToRgb(active.accent)},0.07)`} strokeWidth={7} style={{ transition: 'stroke 0.4s ease' }} />
            <circle cx={CX} cy={CY} r={112} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
            {ticks.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={t.major ? `rgba(${hexToRgb(active.accent)},${isDragging ? 0.7 : 0.45})` : `rgba(255,255,255,${isDragging ? 0.14 : 0.09})`}
                strokeWidth={t.major ? 1.5 : 0.75} strokeLinecap="round" style={{ transition: 'stroke 0.3s ease' }} />
            ))}
            {[{ l: 'N', x: CX, y: 14, a: 'middle' }, { l: 'E', x: 250, y: CY, a: 'start' }, { l: 'S', x: CX, y: 248, a: 'middle' }, { l: 'W', x: 10, y: CY, a: 'end' }].map(({ l, x, y, a }) => (
              <text key={l} x={x} y={y} textAnchor={a} dominantBaseline="middle" fontFamily="'JetBrains Mono',monospace" fontSize={8} letterSpacing={1.5} fill={`rgba(255,255,255,${isDragging ? 0.35 : 0.18})`} style={{ transition: 'fill 0.2s ease', userSelect: 'none' }}>{l}</text>
            ))}
            {Object.entries(NODE_POS).map(([id, pos]) => (
              <line key={id} x1={CX} y1={CY} x2={pos.x} y2={pos.y} stroke={selected === id ? `rgba(${hexToRgb(STYLES_MAP[id].accent)},0.22)` : 'rgba(255,255,255,0.04)'} strokeWidth={selected === id ? 1 : 0.5} strokeDasharray="2 5" strokeLinecap="round" style={{ transition: 'stroke 0.3s ease' }} />
            ))}
            <circle cx={CX} cy={CY} r={27} fill="rgba(6,6,20,0.97)" stroke={`rgba(${hexToRgb(active.accent)},0.32)`} strokeWidth={1} style={{ transition: 'stroke 0.4s ease' }} />
            <g style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${needleAngle}deg)`, transition: isDragging ? 'none' : 'transform 0.52s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <line x1={CX} y1={CY} x2={CX} y2={CY + 18} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" />
              <line x1={CX} y1={CY + 4} x2={CX} y2={CY - 63} stroke={active.accent} strokeWidth={1.8} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${isDragging ? 6 : 3}px ${active.accent})`, transition: 'filter 0.2s, stroke 0.3s' }} />
              <polygon points={`${CX},${CY - 68} ${CX - 5},${CY - 57} ${CX + 5},${CY - 57}`} fill={active.accent} style={{ filter: `drop-shadow(0 0 ${isDragging ? 8 : 5}px ${active.accent})`, transition: 'fill 0.3s, filter 0.2s' }} />
            </g>
            <circle cx={CX} cy={CY} r={7} fill={active.accent} style={{ filter: `drop-shadow(0 0 ${isDragging ? 14 : 9}px ${active.accent})`, transition: 'fill 0.3s, filter 0.2s' }} />
            <circle cx={CX} cy={CY} r={3} fill="#06061a" />
            {isDragging && <circle cx={CX} cy={CY} r={112} fill="none" stroke={`rgba(${hexToRgb(active.accent)},0.2)`} strokeWidth={2} />}
          </svg>
          {Object.entries(STYLES_MAP).map(([id, opt]) => {
            const pos = NODE_POS[id], isActive = selected === id, half = NODE_BTN / 2
            return (
              <button key={id} onClick={() => selectStyle(id)} title={opt.label} style={{
                position: 'absolute', left: pos.x - half, top: pos.y - half, width: NODE_BTN, height: NODE_BTN,
                borderRadius: '50%', background: isActive ? `rgba(${hexToRgb(opt.accent)},0.16)` : 'rgba(8,8,24,0.93)',
                border: `1px solid ${isActive ? opt.accent : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isActive ? `0 0 22px rgba(${hexToRgb(opt.accent)},0.55), inset 0 0 12px rgba(${hexToRgb(opt.accent)},0.08)` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                backdropFilter: 'blur(10px)', transition: 'all 0.22s ease', outline: 'none', zIndex: 2,
                pointerEvents: isDragging ? 'none' : 'auto',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: isActive ? opt.accent : 'rgba(255,255,255,0.22)', transition: 'color 0.22s ease', userSelect: 'none' }}>{opt.icon}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div key={selected} style={{ animation: 'fadeIn 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase', flexShrink: 0 }}>MODE</span>
          <div style={{ flex: 1, borderTop: '1px dashed rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '0.1em', color: active.accent, textTransform: 'uppercase', flexShrink: 0, textShadow: `0 0 24px rgba(${hexToRgb(active.accent)},0.45)`, transition: 'color 0.3s ease, text-shadow 0.3s ease' }}>{active.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>{active.sub}</span>
        </div>
      </div>
    </div>
  )
}

// ─── API Key Row with Verification & Save ─────────────────────────────────────

const API_KEY_CONFIGS = [
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-••••••••••••••••••••', icon: 'hub', iconColor: '#e06c3a', iconBg: 'rgba(224,108,58,0.1)', iconBorder: 'rgba(224,108,58,0.2)', stateKey: 'anthropicKey', visibleKey: 'anthropicVisible', statusKey: 'anthropicStatus', provider: 'anthropic' },
  { id: 'openai',    label: 'OpenAI',    placeholder: 'sk-••••••••••••••••••••••••', icon: 'neurology', iconColor: '#10a37f', iconBg: 'rgba(16,163,127,0.1)', iconBorder: 'rgba(16,163,127,0.2)', stateKey: 'openaiKey', visibleKey: 'openaiVisible', statusKey: 'openaiStatus', provider: 'openai' },
  { id: 'tavily',    label: 'Tavily',    placeholder: 'tvly-••••••••••••••••••••••', icon: 'travel_explore', iconColor: '#00ccff', iconBg: 'rgba(0,204,255,0.08)', iconBorder: 'rgba(0,204,255,0.18)', stateKey: 'tavilyKey', visibleKey: 'tavilyVisible', statusKey: 'tavilyStatus', provider: 'tavily' },
]

// ─── API: Save key to backend ──────────────────────────────────────────────────
async function saveApiKeyToBackend(provider, apiKey, token) {
  if (!apiKey || !apiKey.trim()) return { ok: true } // skip empty keys
  
  try {
    const res = await fetch(`${API_BASE_URL}/settings/api-keys`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, api_key: apiKey.trim() })
    })
    const data = await res.json()
    return { ok: res.ok, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── API: Test key against provider ────────────────────────────────────────────
async function testApiKey(provider, apiKey, token) {
  if (!apiKey || !apiKey.trim()) return { valid: false, message: 'Key is empty' }
  
  try {
    const res = await fetch(`${API_BASE_URL}/settings/api-keys/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, api_key: apiKey.trim() })
    })
    const data = await res.json()
    return data
  } catch (err) {
    return { valid: false, message: err.message }
  }
}

function ApiKeysSection({ keys, visibility, statuses, onKeyChange, onToggleVisibility, onTestKey, onSaveKey, token, saving }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: '#444', textTransform: 'uppercase' }}>API Keys (Optional)</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', background: 'rgba(6,6,20,0.5)' }}>
        {API_KEY_CONFIGS.map((cfg, idx) => {
          const val       = keys[cfg.stateKey] || ''
          const isVisible = visibility[cfg.visibleKey]
          const hasValue  = val.trim().length > 0
          const isLast    = idx === API_KEY_CONFIGS.length - 1
          const status    = statuses[cfg.statusKey] || 'idle'

          return (
            <div key={cfg.id} className="api-key-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: cfg.iconBg, border: `1px solid ${cfg.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: cfg.iconColor }}>{cfg.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: '#555', textTransform: 'uppercase' }}>{cfg.label}</span>
                <input
                  type={isVisible ? 'text' : 'password'}
                  value={val}
                  onChange={e => onKeyChange(cfg.stateKey, cfg.statusKey, e.target.value)}
                  placeholder={cfg.placeholder}
                  autoComplete="off" spellCheck={false}
                  className="api-key-input polynous-input"
                  style={{ background: 'transparent', border: 'none', padding: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.04em', color: hasValue ? 'rgba(255,255,255,0.75)' : '#3a3a4a', caretColor: '#00ff0f', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Test button */}
                {hasValue && (
                  <button
                    onClick={() => onTestKey(cfg.provider, val, cfg.statusKey)}
                    disabled={saving}
                    style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(0,204,255,0.25)', background: 'rgba(0,204,255,0.06)', color: '#00ccff', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s' }}
                  >TEST</button>
                )}
                {/* Status */}
                <StatusDot state={status} />
                {/* Show/hide */}
                <button onClick={() => onToggleVisibility(cfg.visibleKey)} title={isVisible ? 'Hide key' : 'Reveal key'} className="api-reveal-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.55)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isVisible ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.08em', color: '#333', textTransform: 'uppercase', textAlign: 'center', marginTop: 10 }}>
        Keys are encrypted with Fernet · Never stored in plaintext
      </p>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProfileSetup({ onComplete, email, token }) {
  const [username, setUsername]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [inputFocused, setFocused]      = useState(false)
  const [btnLabel, setBtnLabel]         = useState('INITIALIZE →')
  const [responseStyle, setResponseStyle] = useState('academic')
  const [savingKeys, setSavingKeys]     = useState(false)
  const inputRef = useRef(null)

  // ─── API key state ───────────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState({ openaiKey: '', anthropicKey: '', tavilyKey: '' })
  const [apiVisibility, setApiVisibility] = useState({ openaiVisible: false, anthropicVisible: false, tavilyVisible: false })
  const [apiStatuses, setApiStatuses] = useState({ openaiStatus: 'idle', anthropicStatus: 'idle', tavilyStatus: 'idle' })

  // ─── Auth token ──────────────────────────────────────────────────────────
  const authToken = token || localStorage.getItem('polynous_token') || ''

  const handleKeyChange = useCallback((stateKey, statusKey, value) => {
    setApiKeys(prev => ({ ...prev, [stateKey]: value }))
    // Reset status when user edits the key
    setApiStatuses(prev => ({ ...prev, [statusKey]: 'idle' }))
  }, [])

  const handleToggleVisibility = useCallback((visibleKey) => {
    setApiVisibility(prev => ({ ...prev, [visibleKey]: !prev[visibleKey] }))
  }, [])

  const handleTestKey = useCallback(async (provider, key, statusKey) => {
    setApiStatuses(prev => ({ ...prev, [statusKey]: 'checking' }))
    const result = await testApiKey(provider, key, authToken)
    setApiStatuses(prev => ({ ...prev, [statusKey]: result.valid ? 'valid' : 'invalid' }))
  }, [authToken])

  // ─── Save ALL entered keys to backend ────────────────────────────────────
  const saveAllKeys = useCallback(async () => {
    setSavingKeys(true)
    const results = []
    
    for (const cfg of API_KEY_CONFIGS) {
      const key = apiKeys[cfg.stateKey]
      if (key && key.trim()) {
        const result = await saveApiKeyToBackend(cfg.provider, key, authToken)
        results.push({ provider: cfg.provider, ok: result.ok })
        if (result.ok) {
          setApiStatuses(prev => ({ ...prev, [cfg.statusKey]: 'saved' }))
        }
      }
    }
    
    setSavingKeys(false)
    return results
  }, [apiKeys, authToken])

  useEffect(() => {
    injectStyles()
    inputRef.current?.focus()
  }, [])

  const charCount   = username.length
  const MAX         = 24
  const MIN         = 3
  const isValid     = charCount >= MIN && charCount <= MAX
  const statusState = charCount === 0 ? 'idle' : isValid ? 'valid' : 'invalid'

  const charFeedback = (() => {
    if (charCount === 0) return `MIN. ${MIN} CHARACTERS`
    if (charCount < MIN) return 'REQUIRES MORE INPUT'
    return 'COGNITIVE MARK VALID'
  })()

  const feedbackColor = isValid ? '#00ff0f' : '#555555'

  const handleChange = useCallback((e) => {
    const val = e.target.value.replace(/\s/g, '').slice(0, MAX)
    setUsername(val)
    setError('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (loading) return
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Neural handle cannot be empty.')
      inputRef.current?.focus()
      return
    }
    if (trimmed.length < MIN) {
      setError(`Username must be at least ${MIN} characters.`)
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setError('')
    setBtnLabel('SAVING KEYS...')

    try {
      // ✅ Save API keys FIRST
      await saveAllKeys()
      
      // Then complete setup
      setBtnLabel('SYNCHRONIZING...')
      if (onComplete) await onComplete(trimmed, responseStyle)
    } catch (err) {
      setError(err?.message || 'Failed to initialize. Try again.')
      setLoading(false)
      setBtnLabel('INITIALIZE →')
    }
  }, [loading, username, responseStyle, onComplete, saveAllKeys])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit()
  }, [handleSubmit])

  const borderColor = inputFocused ? '#00ff0f' : error ? 'rgba(255,32,64,0.5)' : 'rgba(255,255,255,0.1)'
  const inputGlow = inputFocused ? '0 0 20px rgba(0,255,15,0.15)' : 'none'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a1e', fontFamily: "'Sora', 'Inter', sans-serif",
      overflow: 'hidden', zIndex: 9999,
    }}>
      <NeuralCanvas />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,255,15,0.04) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 500, padding: '24px 24px', maxHeight: '100vh', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div style={{ width: '100%', background: 'rgba(10,10,30,0.65)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, position: 'relative', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
          <SynapseDot style={{ top: 14, left: 14 }} />
          <SynapseDot style={{ top: 14, right: 14 }} />
          <SynapseDot style={{ bottom: 14, left: 14 }} />
          <SynapseDot style={{ bottom: 14, right: 14 }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <BrainIcon />
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Initialize Neural Identity</h1>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: '#b9ccb0', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0, maxWidth: 320, lineHeight: 1.6 }}>Set a unique identifier for your cognitive profile</p>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 999, background: 'rgba(12,12,32,0.6)', border: `1px solid ${borderColor}`, boxShadow: inputGlow, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(0,255,15,0.7)', letterSpacing: '0.04em' }}>@</span>
                  <div style={{ width: 2, height: 16, background: '#00ff0f', animation: 'blink 1s step-end infinite' }} />
                </div>
                <input ref={inputRef} type="text" value={username} onChange={handleChange} onKeyDown={handleKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="neural_handle" disabled={loading} autoComplete="off" className="polynous-input" style={{ flex: 1, background: 'transparent', border: 'none', color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, letterSpacing: '0.04em', padding: 0, caretColor: '#00ff0f' }} />
                <StatusDot state={statusState} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 22px' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em', color: feedbackColor, textTransform: 'uppercase', transition: 'color 0.2s ease' }}>{charFeedback}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em', color: '#555555', textTransform: 'uppercase' }}>{charCount} / {MAX}</span>
              </div>
            </div>

            <StyleDial selected={responseStyle} onChange={setResponseStyle} />

            <ApiKeysSection
              keys={apiKeys}
              visibility={apiVisibility}
              statuses={apiStatuses}
              onKeyChange={handleKeyChange}
              onToggleVisibility={handleToggleVisibility}
              onTestKey={handleTestKey}
              onSaveKey={saveAllKeys}
              token={authToken}
              saving={savingKeys}
            />

            {error && (
              <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,32,64,0.08)', border: '1px solid rgba(255,32,64,0.35)', borderLeft: '3px solid #ff2040', color: '#ff2040', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', animation: 'fadeIn 0.2s ease' }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading} className="polynous-btn" style={{ width: '100%', padding: '16px', borderRadius: 999, border: 'none', background: '#00ff0f', color: '#0a0a1e', fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 24px rgba(0,255,15,0.4)' }}>
              {btnLabel}
            </button>
          </div>

          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555555', margin: 0 }}>You can modify this later in Settings</p>

          <div style={{ position: 'absolute', bottom: 14, left: 28, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ccff' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.1em', color: '#00ccff', opacity: 0.4, textTransform: 'uppercase' }}>UPLINK_READY</span>
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 28, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.1em', color: '#77ff62', opacity: 0.4, textTransform: 'uppercase' }}>SYNC_V.03.0</span>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#77ff62' }} />
          </div>
        </div>
      </div>
    </div>
  )
}