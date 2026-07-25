import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL, apiFetch } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  silver:           "#c8cdd6",
  silverBright:     "#e8ecf2",
  silverDim:        "#8e98a8",
  silverFaint:      "rgba(200,205,214,0.07)",
  silverBorder:     "rgba(200,205,214,0.18)",
  silverFocus:      "rgba(200,205,214,0.38)",
  silverGlow:       "0 0 20px rgba(200,205,214,0.10)",

  crimson:          "#e05068",
  crimsonFaint:     "rgba(224,80,104,0.09)",
  cyan:             "#7ec8d8",
  cyanFaint:        "rgba(126,200,216,0.09)",
  gold:             "#c8aa6e",
  purple:           "#9b84cc",
  green:            "#5ec97e",
  greenFaint:       "rgba(94,201,126,0.09)",

  void:             "#0a0a1e",
  surface:          "rgba(38,38,52,0.90)",
  surfaceHigh:      "rgba(52,52,68,0.92)",
  inputBg:          "#0d0d22",

  onSurface:        "#dde1e9",
  onSurfaceVariant: "#8e98a8",
  textSecondary:    "#525c6e",

  white10:          "rgba(255,255,255,0.08)",
  white5:           "rgba(255,255,255,0.04)",

  fontHead:    "'Sora',sans-serif",
  fontBody:    "'Hanken Grotesk',sans-serif",
  fontMono:    "'JetBrains Mono',monospace",
  fontDisplay: "'Anton',sans-serif",
};

async function safeFetch(path, opts = {}) {
  let res;
  try {
    res = await apiFetch(path, opts);
  } catch (networkErr) {
    throw new Error(`Network error: ${networkErr.message}`);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    throw new Error("Invalid JSON response");
  }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

const api = {
  getApiKeys:   ()               => safeFetch('/settings/api-keys'),
  saveApiKey:   (provider, key, model)  => safeFetch('/settings/api-keys', { method: "PUT",    body: JSON.stringify({ provider, api_key: key, ...(model ? { model } : {}) }) }),
  setPreferredProvider: (provider) => safeFetch(`/settings/api-keys/preferred-provider?provider=${encodeURIComponent(provider)}`, { method: "PUT" }),
  freeKeyStatus: () => safeFetch('/settings/api-keys/free-key/status'),
  claimFreeKey:  () => safeFetch('/settings/api-keys/free-key/claim', { method: "POST" }),
  testCustomKey: (base_url, api_key, model) => safeFetch('/settings/api-keys/test-custom', { method: "POST", body: JSON.stringify({ base_url, api_key, model: model || null }) }),
  deleteApiKey: (provider)       => safeFetch(`/settings/api-keys/${provider}`, { method: "DELETE" }),
  testApiKey:   (provider, key)  => safeFetch('/settings/api-keys/test', { method: "POST", body: JSON.stringify({ provider, api_key: key }) }),

  getPreferences:  ()      => safeFetch('/settings/preferences'),
  savePreferences: (prefs) => safeFetch('/settings/preferences', { method: "PUT", body: JSON.stringify(prefs) }),

  getUsage:        ()      => safeFetch('/settings/usage'),
  getAdminUsers:   ()      => safeFetch('/admin/users'),

  getProfile:    ()     => safeFetch('/auth/me'),
  updateProfile: (data) => safeFetch('/auth/me', { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data) => safeFetch('/auth/change-password', { method: "PUT", body: JSON.stringify(data) }),
  revokeAllSessions: () => safeFetch('/auth/revoke-sessions', { method: "POST" }),
  deleteAccount: ()     => safeFetch('/auth/me', { method: "DELETE" }),

  getStats:   ()           => safeFetch('/memory/stats'),
  exportData: ()           => safeFetch('/settings/export'),
  clearHistory: ()         => safeFetch('/memory/clear', { method: "DELETE" }),
  clearAllData: ()         => safeFetch('/settings/reset', { method: "POST" }),

  getIntegrations:      ()       => safeFetch('/settings/integrations'),
  connectIntegration:   (name)   => safeFetch(`/settings/integrations/${name}/connect`, { method: "POST" }),
  disconnectIntegration:(name)   => safeFetch(`/settings/integrations/${name}/disconnect`, { method: "DELETE" }),
};

function Icon({ name, style }) {
  return (
    <span
      style={{
        fontFamily: "Material Symbols Outlined",
        fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
        lineHeight: 1,
        display: "inline-block",
        userSelect: "none",
        ...(style || {}),
      }}
    >
      {name}
    </span>
  );
}

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&family=Anton&family=Material+Symbols+Outlined&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { font-size: 16px; }
      body {
        background: #0a0a1e;
        color: #dde1e9;
        font-family: 'Hanken Grotesk', sans-serif;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }

      @keyframes spin    { to { transform: rotate(360deg); } }
      @keyframes pulseDot {
        0%,100% { box-shadow: 0 0 3px rgba(200,205,214,0.25); }
        50%     { box-shadow: 0 0 10px rgba(200,205,214,0.55); }
      }
      @keyframes toastIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes toastOut { from { opacity:1; transform:translateY(0);    } to { opacity:0; transform:translateY(10px); } }
      @keyframes wordmarkPulse {
        0%,100% { text-shadow: 0 0 8px rgba(200,205,214,0.25), 0 0 20px rgba(200,205,214,0.12), 0 0 40px rgba(200,205,214,0.06); }
        50%     { text-shadow: 0 0 12px rgba(232,236,242,0.55), 0 0 28px rgba(200,205,214,0.28), 0 0 56px rgba(200,205,214,0.14); }
      }
      @keyframes settingsGlow {
        0%,100% { text-shadow: 0 0 18px rgba(232,236,242,0.22), 0 0 46px rgba(200,205,214,0.10); }
        50%     { text-shadow: 0 0 26px rgba(232,236,242,0.40), 0 0 64px rgba(200,205,214,0.20); }
      }
      @keyframes slideIn {
        from { opacity:0; transform: translateY(-6px); }
        to   { opacity:1; transform: translateY(0); }
      }
      @keyframes modalIn {
        from { opacity:0; transform: scale(0.96); }
        to   { opacity:1; transform: scale(1); }
      }

      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(200,205,214,0.14); border-radius: 8px; }

      input[type=range] {
        -webkit-appearance: none; appearance: none;
        background: rgba(255,255,255,0.08);
        height: 3px; border-radius: 4px;
        outline: none; cursor: pointer; width: 100%;
      }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: #c8cdd6; cursor: pointer;
        box-shadow: 0 0 6px rgba(200,205,214,0.5);
      }
      select {
        -webkit-appearance: none; appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6272'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.85rem center;
        cursor: pointer;
      }
      select option { background: #0a0a1e; color: #dde1e9; }

      .poly-btn-base {
        transition: background 0.18s, border-color 0.18s, color 0.18s, opacity 0.18s;
      }
      .poly-btn-base:disabled {
        opacity: 0.45;
        cursor: not-allowed !important;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
      }
    `}</style>
  );
}

function NeuralCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx    = canvas.getContext("2d");
    let particles = [], mouse = { x: null, y: null }, animId;
    const N = 130;
    const COLS = [
      { r: 200, g: 205, b: 214 }, { r: 180, g: 190, b: 205 },
      { r: 220, g: 225, b: 232 }, { r: 142, g: 152, b: 168 },
      { r: 160, g: 175, b: 195 }, { r: 230, g: 235, b: 240 },
    ];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x   = Math.random() * canvas.width;
        this.y   = Math.random() * canvas.height;
        this.bvx = (Math.random() - 0.5) * 0.4;
        this.bvy = (Math.random() - 0.5) * 0.4;
        this.vx  = this.bvx; this.vy = this.bvy;
        this.r   = Math.random() * 2.2 + 0.8;
        this.col = COLS[Math.floor(Math.random() * COLS.length)];
        this.op  = Math.random() * 0.35 + 0.12;
        this.ts  = Math.random() * 0.018 + 0.004;
        this.to  = Math.random() * Math.PI * 2;
        this.wa  = Math.random() * 0.25;
        this.ws  = Math.random() * 0.018 + 0.008;
        this.wo  = Math.random() * Math.PI * 2;
      }
      update(t) {
        this.vx = this.bvx + Math.sin(t * this.ws + this.wo) * this.wa;
        this.vy = this.bvy + Math.cos(t * this.ws + this.wo) * this.wa;
        this.x += this.vx; this.y += this.vy;
        if (mouse.x !== null) {
          const dx = this.x - mouse.x, dy = this.y - mouse.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) { const f = (160 - d) / 160; this.x += (dx / d) * f * 2.5; this.y += (dy / d) * f * 2.5; }
        }
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = canvas.height + 10;
        if (this.y > canvas.height + 10) this.y = -10;
      }
      draw(t) {
        const tw = Math.sin(t * this.ts + this.to) * 0.18 + 0.82;
        const al = this.op * tw;
        const { r: cr, g, b } = this.col;
        const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 5);
        grd.addColorStop(0, `rgba(${cr},${g},${b},${al * 0.45})`);
        grd.addColorStop(1, `rgba(${cr},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${cr},${g},${b},${al})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    const init = () => { particles = Array.from({ length: N }, () => new Particle()); };
    let t0 = performance.now();
    const frame = (ts) => {
      const t = ts - t0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            const al = (1 - d / 120) * 0.055;
            const cr = Math.floor((particles[i].col.r + particles[j].col.r) / 2);
            const cg = Math.floor((particles[i].col.g + particles[j].col.g) / 2);
            const cb = Math.floor((particles[i].col.b + particles[j].col.b) / 2);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${al})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
          }
        }
      }
      particles.forEach(p => { p.update(t); p.draw(t); });
      animId = requestAnimationFrame(frame);
    };
    const onMM = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onML = () => { mouse.x = null; mouse.y = null; };
    const onRz = () => { resize(); init(); };
    window.addEventListener("resize", onRz);
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseleave", onML);
    resize(); init();
    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onRz);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mouseleave", onML);
    };
  }, []);
  return (
    <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />
  );
}

const NAV = [
  { icon: "travel_explore", label: "Research", path: "/research" },
  { icon: "forum", label: "Debate Chamber", path: "/debate" },
  { icon: "account_tree", label: "Knowledge Graph", path: "/graph" },
  { icon: "search", label: "Semantic Search", path: "/search" },
  { icon: "database", label: "Memory Bank", path: "/memory" },
  { icon: "picture_as_pdf", label: "PDF Lab", path: "/pdf-lab" },
  { icon: "analytics", label: "Analytics", path: "/analytics" },
  { icon: "settings", label: "Settings", path: "/settings", active: true },
  { icon: "help", label: "Help", path: "/info" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — persona-aware
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed, persona }) {
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const bye = () =>
    onLogout
      ? onLogout()
      : (localStorage.clear(), (window.location.href = "/"));

  const avatarBg = persona ? persona.gradient : "#14143a";
  const avatarBorder = persona ? `${persona.color}88` : C.silver;

  if (collapsed)
    return (
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100%",
          width: 56,
          background: "rgba(10,10,30,0.96)",
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: "none",
            border: "none",
            color: C.silver,
            cursor: "pointer",
            marginBottom: 32,
          }}
        >
          <Icon name="chevron_right" style={{ fontSize: 22 }} />
        </button>

        {NAV.map(({ icon, label, path, active }) => (
          <div
            key={label}
            onClick={() => go(path)}
            title={label}
            style={{
              padding: "12px 0",
              cursor: "pointer",
              color: active ? C.silverBright : C.onSurfaceVariant,
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
          </div>
        ))}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            onClick={() => go("/research")}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: C.silver,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="add" style={{ fontSize: 16, color: C.void }} />
          </div>
          <div
            title={persona ? `${persona.name} — ${persona.role}` : "Account"}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: avatarBg,
              border: `1px solid ${avatarBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {persona ? (
              <>
                <img
                  src={persona.img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
                <span style={{ position: "relative", zIndex: 1, fontFamily: C.fontDisplay, fontSize: 12, color: persona.color }}>
                  {persona.name[0]}
                </span>
              </>
            ) : (
              <Icon name="face" style={{ color: C.silver, fontSize: 14 }} />
            )}
          </div>
          <div onClick={bye} style={{ cursor: "pointer", color: C.silver }}>
            <Icon name="logout" style={{ fontSize: 14 }} />
          </div>
        </div>
      </aside>
    );

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100%",
        width: 320,
        background: "rgba(10,10,30,0.96)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid " + C.white10,
        boxShadow: "0 0 20px rgba(200,205,214,0.08)",
        display: "flex",
        flexDirection: "column",
        padding: 24,
        zIndex: 30,
        transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: C.silverBright,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
            }}
          >
            POLYNOUS
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10,
              color: C.onSurfaceVariant,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.7,
            }}
          >
            Cerebral Vitality Engine
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            padding: 4,
            marginLeft: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
        >
          <Icon name="chevron_left" style={{ fontSize: 20 }} />
        </button>
      </div>

      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "hidden",
        }}
      >
        {NAV.map(({ icon, label, path, active }) => (
          <div
            key={label}
            onClick={() => go(path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 9999,
              cursor: "pointer",
              color: active ? C.silverBright : C.onSurfaceVariant,
              background: active ? C.silverFaint : "transparent",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.silverBright;
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.onSurfaceVariant;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Icon
              name={icon}
              style={{ fontSize: 20, color: "inherit", flexShrink: 0 }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
          </div>
        ))}
      </nav>

      <div
        style={{
          borderTop: "1px solid " + C.white5,
          paddingTop: 24,
          marginTop: 24,
        }}
      >
        <button
          onClick={() => go("/research")}
          style={{
            width: "100%",
            padding: 12,
            background: C.silver,
            color: C.void,
            fontWeight: 700,
            borderRadius: 9999,
            border: "none",
            cursor: "pointer",
            fontFamily: "'Sora',sans-serif",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Icon name="add" style={{ fontSize: 18, color: C.void }} /> New Research
        </button>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: avatarBg,
              border: `1px solid ${avatarBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
              transition: "border-color 0.3s, background 0.3s",
            }}
          >
            {persona ? (
              <>
                <img
                  src={persona.img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
                <span style={{ position: "relative", zIndex: 1, fontFamily: C.fontDisplay, fontSize: 16, color: persona.color }}>
                  {persona.name[0]}
                </span>
              </>
            ) : (
              <Icon name="face" style={{ color: C.silver, fontSize: 22 }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.username || "Guest"}
            </p>
            {persona ? (
              <p style={{
                fontSize: 10.5, color: persona.color, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {persona.name}
              </p>
            ) : (
              <button
                onClick={bye}
                style={{
                  fontSize: 10,
                  color: C.silver,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono',monospace",
                  padding: 0,
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          {persona && (
            <button
              onClick={bye}
              title="Disconnect"
              style={{
                fontSize: 10, color: C.textSecondary, background: "none", border: "none",
                cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.silver}
              onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
            >
              <Icon name="logout" style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return { toasts, push };
}

function ToastBox({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "14px 20px", borderRadius: 12,
          fontFamily: C.fontMono, fontSize: 13.5,
          backdropFilter: "blur(24px)",
          background: t.type === "err" ? C.crimsonFaint : t.type === "warn" ? "rgba(200,170,110,0.09)" : C.silverFaint,
          border: `1px solid ${t.type === "err" ? "rgba(224,80,104,0.38)" : t.type === "warn" ? "rgba(200,170,110,0.35)" : C.silverBorder}`,
          color: t.type === "err" ? C.crimson : t.type === "warn" ? C.gold : C.silverBright,
          boxShadow: t.type === "err" ? "0 0 14px rgba(224,80,104,0.2)" : C.silverGlow,
          animation: "toastIn 0.28s ease",
          display: "flex", alignItems: "center", gap: 10,
          maxWidth: 360,
        }}>
          {t.type === "err" ? "⚠" : t.type === "warn" ? "!" : "✓"}&nbsp;{t.msg}
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 440 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,10,30,0.78)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: width,
        background: "rgba(22,22,44,0.98)",
        border: `1px solid ${C.silverBorder}`,
        borderRadius: 18, padding: 28,
        boxShadow: "0 0 60px rgba(0,0,0,0.7), 0 0 24px rgba(200,205,214,0.08)",
        animation: "modalIn 0.22s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span style={{ fontFamily: C.fontHead, fontWeight: 700, fontSize: 17, color: C.onSurface }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSecondary, padding: 4, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.silverBright}
            onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}>
            <Icon name="close" style={{ fontSize: 20 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ fontFamily: C.fontBody, fontSize: 14.5, color: C.onSurfaceVariant, lineHeight: 1.7, marginBottom: 24 }}>{body}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} disabled={loading} style={{ padding: "9px 20px", borderRadius: 9999, border: `1px solid ${C.white10}`, background: "transparent", color: C.onSurfaceVariant, cursor: "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 500 }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} style={{
          padding: "9px 22px", borderRadius: 9999, border: "none",
          background: danger ? C.crimson : C.silver,
          color: danger ? "#fff" : C.void,
          cursor: loading ? "wait" : "pointer",
          fontFamily: C.fontHead, fontSize: 14, fontWeight: 700,
          opacity: loading ? 0.65 : 1, transition: "opacity 0.18s",
        }}>
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function SectionHead({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.silverFaint, border: `1px solid ${C.silverBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} style={{ fontSize: 16, color: C.silverDim }} />
        </div>
        <span style={{ fontFamily: C.fontHead, fontSize: 17, fontWeight: 700, color: C.onSurface, letterSpacing: "-0.025em" }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ fontFamily: C.fontMono, fontSize: 11, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.16em", paddingLeft: 44, marginTop: 4, lineHeight: 1 }}>{subtitle}</p>
      )}
      <div style={{ height: 1, background: `linear-gradient(90deg, ${C.silverBorder}, transparent)`, marginTop: 12 }} />
    </div>
  );
}

function Card({ children, danger }) {
  return (
    <div style={{
      background: C.surface, backdropFilter: "blur(22px)",
      border: `1px solid ${danger ? "rgba(224,80,104,0.22)" : C.white10}`,
      borderRadius: 18, padding: 28, marginBottom: 16,
      boxShadow: danger ? "0 0 16px rgba(224,80,104,0.08)" : C.silverGlow,
      position: "relative", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontFamily: C.fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: C.textSecondary, marginBottom: 10 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  background: C.inputBg,
  border: `1px solid ${C.white10}`,
  borderRadius: 9, color: C.onSurface,
  fontFamily: C.fontMono, fontSize: 13.5,
  padding: "11px 14px", width: "100%",
  outline: "none", transition: "border 0.15s, box-shadow 0.15s",
};

const onFI = e => { e.target.style.border = `1px solid ${C.silverFocus}`; e.target.style.boxShadow = "0 0 0 3px rgba(200,205,214,0.07)"; };
const onFO = e => { e.target.style.border = `1px solid ${C.white10}`; e.target.style.boxShadow = "none"; };

function StatusDot({ active }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: C.fontMono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? C.silver : C.textSecondary }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? C.silver : C.textSecondary, boxShadow: active ? "0 0 7px rgba(200,205,214,0.55)" : "none", animation: active ? "pulseDot 2.4s ease infinite" : "none" }} />
      {active ? "Active" : "Not set"}
    </span>
  );
}

function Toggle({ on, onToggle, disabled }) {
  return (
    <div role="switch" aria-checked={on} tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={e => !disabled && (e.key === " " || e.key === "Enter") && onToggle()}
      style={{
        width: 42, height: 24, borderRadius: 999,
        background: on ? C.silver : "rgba(255,255,255,0.09)",
        border: `1px solid ${on ? "rgba(200,205,214,0.55)" : C.white10}`,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s, border 0.2s", flexShrink: 0, outline: "none",
        opacity: disabled ? 0.45 : 1,
      }}>
      <div style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: on ? C.void : "#6a737f",
        boxShadow: on ? "0 0 5px rgba(200,205,214,0.45)" : "0 1px 3px rgba(0,0,0,0.5)",
        transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }} />
    </div>
  );
}

function Spinner({ size = 32 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
      <div style={{ width: size, height: size, border: "2px solid rgba(200,205,214,0.15)", borderTop: "2px solid #c8cdd6", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <span style={{ fontFamily: C.fontMono, fontSize: 12, color: C.textSecondary, letterSpacing: "0.08em" }}>Loading…</span>
    </div>
  );
}

function InlineSpinner() {
  return <span style={{ display: "inline-block", width: 14, height: 14, border: "1.5px solid rgba(200,205,214,0.25)", borderTop: "1.5px solid #c8cdd6", borderRadius: "50%", animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 6 }} />;
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12, color: C.crimson, fontFamily: C.fontMono, fontSize: 13, background: C.crimsonFaint, borderRadius: 10, border: "1px solid rgba(224,80,104,0.2)" }}>
      <Icon name="error_outline" style={{ fontSize: 20, color: C.crimson, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{msg}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ padding: "6px 14px", borderRadius: 9999, border: "1px solid rgba(224,80,104,0.35)", background: "transparent", color: C.crimson, cursor: "pointer", fontFamily: C.fontMono, fontSize: 11.5, flexShrink: 0 }}>
          Retry
        </button>
      )}
    </div>
  );
}

const PROVIDERS = {
  anthropic: { label: "Anthropic Claude", icon: "psychology",      color: C.silver,   placeholder: "sk-ant-api03-…",
               models: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8"] },
  openai:    { label: "OpenAI GPT",        icon: "smart_toy",      color: C.cyan,     placeholder: "sk-…",
               models: ["gpt-4o-mini", "gpt-5.1-mini", "gpt-5.1"] },
  google:    { label: "Google Gemini",     icon: "auto_awesome",   color: "#8ab4f8",  placeholder: "AIza…",
               models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  mistral:   { label: "Mistral AI",        icon: "air",            color: "#f4a261",  placeholder: "Mistral key…",
               models: ["mistral-small-latest", "mistral-large-latest"] },
  groq:      { label: "Groq",              icon: "bolt",           color: "#ff6b6b",  placeholder: "gsk_…",
               models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
  nvidia:    { label: "NVIDIA NIM",        icon: "memory",         color: "#76b900",  placeholder: "nvapi-…",
               models: ["meta/llama-3.3-70b-instruct", "meta/llama-3.1-70b-instruct",
                        "nvidia/llama-3.3-nemotron-super-49b-v1", "openai/gpt-oss-120b",
                        "deepseek-ai/deepseek-v4-flash"] },
  deepseek:  { label: "DeepSeek",          icon: "waves",          color: "#4d6bff",  placeholder: "sk-…",
               models: ["deepseek-chat", "deepseek-reasoner"] },
  tavily:    { label: "Tavily Search",     icon: "travel_explore", color: C.gold,     placeholder: "tvly-…",
               models: null }, // search service — no model choice
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA DATA
// ─────────────────────────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: "nova",
    name: "NOVA",
    role: "The Neural Architect",
    desc: "Designs the intelligence backbone of POLYNOUS, transforming ideas into structured neural systems and research workflows.",
    trait: "Creation · Precision · Machine Reasoning",
    color: "#00ff66",
    colorFaint: "rgba(0,255,102,0.08)",
    colorGlow: "rgba(0,255,102,0.35)",
    img: "/avatars/nova.png",
    gradient: "linear-gradient(135deg, #001a0d 0%, #003318 60%, #00ff6612 100%)",
  },
  {
    id: "sage",
    name: "SAGE",
    role: "The Augmented Scientist",
    desc: "Analyzes and validates research using evidence, logic, and machine-enhanced scientific thinking.",
    trait: "Rigor · Trust · AI-Augmented Expertise",
    color: "#00ccff",
    colorFaint: "rgba(0,204,255,0.08)",
    colorGlow: "rgba(0,204,255,0.35)",
    img: "/avatars/sage.png",
    gradient: "linear-gradient(135deg, #001a22 0%, #00334a 60%, #00ccff12 100%)",
  },
  {
    id: "vexa",
    name: "VEXA",
    role: "The Holographic Visionary",
    desc: "Connects abstract ideas, sees patterns early, and imagines future possibilities with speculative intelligence.",
    trait: "Foresight · Experimentation · Pattern Recognition",
    color: "#a855f7",
    colorFaint: "rgba(168,85,247,0.08)",
    colorGlow: "rgba(168,85,247,0.35)",
    img: "/avatars/vexa.png",
    gradient: "linear-gradient(135deg, #0d0014 0%, #1a0033 60%, #a855f712 100%)",
  },
  {
    id: "spark",
    name: "SPARK",
    role: "The Curious Mind",
    desc: "Learns through exploration, questions, and wonder-driven discovery via first-principles thinking.",
    trait: "Curiosity · Energy · First-Principles Thinking",
    color: "#39e8a0",
    colorFaint: "rgba(57,232,160,0.08)",
    colorGlow: "rgba(57,232,160,0.35)",
    img: "/avatars/spark.png",
    gradient: "linear-gradient(135deg, #001a12 0%, #003326 60%, #39e8a012 100%)",
  },
  {
    id: "orion",
    name: "ORION",
    role: "The Cybernetic Mentor",
    desc: "Guides the system with wisdom, memory, and strategic perspective — trustworthy and experienced.",
    trait: "Leadership · Experience · Trusted Intelligence",
    color: "#818cf8",
    colorFaint: "rgba(129,140,248,0.08)",
    colorGlow: "rgba(129,140,248,0.35)",
    img: "/avatars/orion.png",
    gradient: "linear-gradient(135deg, #080014 0%, #130033 60%, #818cf812 100%)",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA SELECTOR — animation layer
// ─────────────────────────────────────────────────────────────────────────────
function PersonaStyles() {
  return (
    <style>{`
      @keyframes personaEnter {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .persona-card {
        transition: transform 220ms cubic-bezier(0.22,1,0.36,1),
                    border-color 220ms ease,
                    background 220ms ease;
      }
      .persona-card:hover {
        transform: translateY(-2px);
      }
      .persona-card:focus-visible {
        outline: 2px solid rgba(200,205,214,0.55);
        outline-offset: 2px;
      }
      .persona-portrait {
        transition: transform 320ms cubic-bezier(0.22,1,0.36,1);
      }
      .persona-card:hover .persona-portrait {
        transform: scale(1.04);
      }
      .persona-detail {
        animation: personaEnter 260ms cubic-bezier(0.22,1,0.36,1) both;
      }

      @media (prefers-reduced-motion: reduce) {
        .persona-card, .persona-card:hover, .persona-portrait, .persona-detail {
          transition: none !important;
          animation: none !important;
          transform: none !important;
        }
      }
    `}</style>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE PERSONA CARD
// ─────────────────────────────────────────────────────────────────────────────
function PersonaCard({ persona, isActive, isAnyActive, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const dimmed = isAnyActive && !isActive;
  const tint = isActive ? persona.color : hovered ? persona.color : null;

  return (
    <div
      className="persona-card"
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={() => onSelect(persona.id)}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(persona.id))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 14,
        cursor: "pointer",
        flex: "1 1 160px",
        minWidth: 148,
        maxWidth: 210,
        background: isActive ? `linear-gradient(180deg, ${persona.colorFaint}, rgba(20,20,36,0.7) 65%)` : "rgba(20,20,36,0.62)",
        border: `1px solid ${tint ? tint + "4a" : "rgba(255,255,255,0.07)"}`,
        opacity: dimmed ? 0.55 : 1,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Signature accent — a single quiet hairline at the top when active */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: isActive ? persona.color : "transparent",
        opacity: isActive ? 0.85 : 0,
        transition: "opacity 220ms ease",
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: "18px 14px 16px" }}>

        {/* Portrait */}
        <div style={{
          width: "100%", aspectRatio: "1 / 1",
          borderRadius: 10, overflow: "hidden", marginBottom: 14,
          border: `1px solid ${isActive ? persona.color + "55" : "rgba(255,255,255,0.06)"}`,
          background: persona.gradient,
          position: "relative",
        }}>
          <img
            src={persona.img}
            alt={persona.name}
            className="persona-portrait"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          
        </div>

        {/* Name */}
        <div style={{
          fontFamily: C.fontDisplay, fontSize: 16, letterSpacing: "0.05em",
          color: isActive ? persona.color : C.silverBright,
          marginBottom: 2,
          transition: "color 220ms",
        }}>
          {persona.name}
        </div>

        {/* Role */}
        <div style={{
          fontFamily: C.fontMono, fontSize: 10, letterSpacing: "0.1em",
          textTransform: "uppercase", color: isActive ? persona.color + "b0" : C.textSecondary,
          marginBottom: 12, lineHeight: 1.3,
          transition: "color 220ms",
        }}>
          {persona.role}
        </div>

        {/* Description — only on the active card */}
        {isActive && (
          <div className="persona-detail" style={{
            fontFamily: C.fontBody, fontSize: 13, color: C.onSurfaceVariant,
            lineHeight: 1.6, marginBottom: 10,
          }}>
            {persona.desc}
          </div>
        )}

        {/* Trait tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
          {persona.trait.split(" · ").map(t => (
            <div key={t} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: C.fontMono, fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isActive ? persona.color + "99" : C.textSecondary,
              opacity: isActive ? 1 : 0.65,
              transition: "color 220ms, opacity 220ms",
            }}>
              <span style={{
                width: 3, height: 3, borderRadius: "50%", flexShrink: 0,
                background: isActive ? persona.color : C.textSecondary,
                opacity: isActive ? 0.7 : 0.4,
              }} />
              {t}
            </div>
          ))}
        </div>

      
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SECTION (persona selector embedded; persona state lifted via props)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSection({ user: initialUser, push, activePersona, onPersonaChange }) {
  const [user,     setUser]     = useState(initialUser || {});
  const [editing,  setEditing]  = useState(false);
  const [username, setUsername] = useState(initialUser?.username || "");
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getProfile()
      .then(data => {
        setUser(data);
        setUsername(data.username || "");
        if (data.persona) onPersonaChange(data.persona);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPersona = PERSONAS.find(p => p.id === activePersona) || null;
  const initials = (username || "PL").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const save = async () => {
    if (!username.trim()) { push("Username cannot be empty", "err"); return; }
    setSaving(true);
    try {
      const updated = await api.updateProfile({ username: username.trim() });
      setUser(prev => ({ ...prev, ...updated, username: username.trim() }));
      const stored = JSON.parse(localStorage.getItem("polynous_user") || "{}");
      localStorage.setItem("polynous_user", JSON.stringify({ ...stored, username: username.trim() }));
      push("Profile updated");
      setEditing(false);
    } catch (err) {
      push(err.message || "Update failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setUsername(user.username || ""); setEditing(false); };

  const handleSelectPersona = (id) => {
    const next = activePersona === id ? null : id;
    onPersonaChange(next);
    const p = PERSONAS.find(p => p.id === id);
    if (next && p) push(`${p.name} — ${p.role} activated`);
    // Optionally persist to API: api.updateProfile({ persona: next })
  };

  return (
    <>
      <PersonaStyles />
      <Card>
        <SectionHead icon="account_circle" title="Profile" subtitle="Identity & account tier" />
        {loading ? <Spinner size={24} /> : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>

              {/* Avatar — updates to persona portrait when one is active */}
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: currentPersona
                  ? currentPersona.gradient
                  : "conic-gradient(from 200deg, #5a6272, #8e98a8, #c8cdd6, #e2e6ed, #c8cdd6, #8e98a8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: C.fontDisplay, fontWeight: 800, fontSize: 20,
                color: currentPersona ? currentPersona.color : C.void,
                boxShadow: currentPersona
                  ? `0 0 0 2px ${currentPersona.color}40`
                  : "0 0 0 2px rgba(200,205,214,0.14)",
                flexShrink: 0,
                overflow: "hidden",
                position: "relative",
                transition: "box-shadow 320ms ease",
              }}>
                {currentPersona ? (
                  <>
                    <img
                      src={currentPersona.img}
                      alt={currentPersona.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                    
                  </>
                ) : initials}
              </div>

              <div>
                {editing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Username" autoFocus
                      onKeyDown={e => e.key === "Enter" && save()}
                      style={{ ...inputStyle, width: 220, fontFamily: C.fontHead, fontWeight: 600 }}
                      onFocus={onFI} onBlur={onFO} />
                    <div style={{ fontFamily: C.fontMono, fontSize: 11.5, color: C.textSecondary }}>{user.email}</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: C.fontHead, fontSize: 18, fontWeight: 700, color: C.onSurface, letterSpacing: "-0.025em" }}>{user.username || "Guest User"}</div>
                    <div style={{ fontFamily: C.fontMono, fontSize: 13, color: C.textSecondary, marginTop: 5 }}>{user.email || "guest@polynous.ai"}</div>
                    <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                      {[
                        { label: user.plan || "Free Tier", color: C.silver, bg: C.silverFaint, border: C.silverBorder },
                        
                        ...(currentPersona ? [{ label: currentPersona.name, color: currentPersona.color, bg: currentPersona.colorFaint, border: currentPersona.color + "44" }] : []),
                      ].map(b => (
                        <span key={b.label} style={{ fontFamily: C.fontMono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", background: b.bg, padding: "4px 12px", borderRadius: 9999, color: b.color, border: `1px solid ${b.border}`, transition: "all 220ms ease" }}>{b.label}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {editing && (
                <button onClick={cancel} disabled={saving} style={{ padding: "9px 20px", borderRadius: 9999, border: `1px solid ${C.white10}`, background: "transparent", color: C.onSurfaceVariant, cursor: "pointer", fontFamily: C.fontHead, fontWeight: 600, fontSize: 14 }}>
                  Cancel
                </button>
              )}
              <button onClick={() => editing ? save() : setEditing(true)} disabled={saving} style={{
                padding: "9px 22px", borderRadius: 9999,
                border: editing ? "none" : `1px solid ${C.silverBorder}`,
                background: editing ? C.silver : "transparent",
                color: editing ? C.void : C.silver,
                cursor: saving ? "wait" : "pointer",
                fontFamily: C.fontHead, fontWeight: 700, fontSize: 14,
                transition: "all 0.18s", opacity: saving ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 6,
              }}
                onMouseEnter={e => { if (!editing && !saving) e.currentTarget.style.background = C.silverFaint; }}
                onMouseLeave={e => { if (!editing) e.currentTarget.style.background = "transparent"; }}
              >
                {saving && <InlineSpinner />}
                {saving ? "Saving…" : editing ? "Save Changes" : "Edit Profile"}
              </button>
            </div>
          </div>
        )}

        {/* ── PERSONA SELECTOR ───────────────── */}
        {!loading && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ height: 1, background: `linear-gradient(90deg, ${C.silverBorder}, transparent)`, flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: C.silverFaint, border: `1px solid ${C.silverBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="person_pin" style={{ fontSize: 13, color: C.silverDim }} />
                </div>
                <span style={{
                  fontFamily: C.fontHead,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.silverBright,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  whiteSpace: "nowrap",
                }}>
                  AI Persona
                </span>
              </div>
              <div style={{ height: 1, background: `linear-gradient(270deg, ${C.silverBorder}, transparent)`, flex: 1 }} />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              {PERSONAS.map(p => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  isActive={activePersona === p.id}
                  isAnyActive={!!activePersona}
                  onSelect={handleSelectPersona}
                />
              ))}
            </div>

            {currentPersona && (
              <div className="persona-detail" style={{
                marginTop: 16,
                padding: "14px 18px",
                borderRadius: 12,
                background: currentPersona.colorFaint,
                border: `1px solid ${currentPersona.color}33`,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: currentPersona.gradient,
                  border: `1px solid ${currentPersona.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: C.fontDisplay, fontSize: 16, color: currentPersona.color,
                  overflow: "hidden", position: "relative",
                }}>
                  <img
                    src={currentPersona.img}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                  
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.fontDisplay, fontSize: 13, letterSpacing: "0.06em", color: currentPersona.color, marginBottom: 2 }}>
                    {currentPersona.name} — {currentPersona.role}
                  </div>
                  <div style={{ fontFamily: C.fontMono, fontSize: 11, color: C.textSecondary, letterSpacing: "0.04em" }}>
                    {currentPersona.trait}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectPersona(currentPersona.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 9999, flexShrink: 0,
                    border: `1px solid ${C.white10}`, background: "transparent",
                    color: C.textSecondary, cursor: "pointer",
                    fontFamily: C.fontMono, fontSize: 10, letterSpacing: "0.1em",
                    textTransform: "uppercase", transition: "all 0.18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.crimson; e.currentTarget.style.borderColor = "rgba(224,80,104,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = C.white10; }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REMAINING SECTIONS (from the second file, unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function KeyCard({ providerId, connected, preview, savedModel, onSave, onRemove, push }) {
  const [val,        setVal]        = useState("");
  const [visible,    setVisible]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [removing,   setRemoving]   = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const p = PROVIDERS[providerId];
  const [model, setModel] = useState(savedModel || (p.models ? p.models[0] : ""));
  useEffect(() => { if (savedModel) setModel(savedModel); }, [savedModel]);

  const doSave = async () => {
    if (!val.trim()) { push("Paste a key first", "err"); return; }
    setSaving(true);
    try {
      await api.saveApiKey(providerId, val.trim(), p.models ? model : undefined);
      push(`${p.label} key saved`);
      setVal("");
      if (onSave) onSave(providerId);
    } catch (err) {
      push(err.message || "Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async () => {
    setRemoving(true);
    try {
      await api.deleteApiKey(providerId);
      push(`${p.label} key removed`);
      if (onRemove) onRemove(providerId);
    } catch (err) {
      push(err.message || "Remove failed", "err");
    } finally {
      setRemoving(false);
    }
  };

  const doTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await api.testApiKey(providerId, val.trim() || "");
      setTestResult(r?.valid ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3500);
    }
  };

  const testColor = testResult === "ok" ? C.green : testResult === "fail" ? C.crimson : C.textSecondary;
  const testLabel = testing ? "Testing…" : testResult === "ok" ? "Valid ✓" : testResult === "fail" ? "Invalid ✗" : "Test";

  return (
    <div style={{
      background: "rgba(28,28,46,0.70)", border: `1px solid ${C.white10}`,
      borderRadius: 13, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 14,
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.silverBorder}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.white10}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${p.color}12`, border: `1px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={p.icon} style={{ fontSize: 18, color: p.color }} />
          </div>
          <div>
            <div style={{ fontFamily: C.fontHead, fontWeight: 600, color: C.onSurface, fontSize: 15 }}>{p.label}</div>
            {connected && preview && (
              <div style={{ fontSize: 11.5, color: C.textSecondary, fontFamily: C.fontMono, marginTop: 2 }}>••••{preview}</div>
            )}
          </div>
        </div>
        <StatusDot active={connected} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type={visible ? "text" : "password"} value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSave()}
          placeholder={connected ? "Paste to replace key…" : p.placeholder}
          style={{ ...inputStyle, flexGrow: 1, width: "auto" }}
          onFocus={onFI} onBlur={onFO}
        />
        <button onClick={() => setVisible(v => !v)} title={visible ? "Hide" : "Show"} style={{ padding: "0 12px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.white10}`, borderRadius: 9, cursor: "pointer", color: C.textSecondary, flexShrink: 0, transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = C.onSurface}
          onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}>
          <Icon name={visible ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
        </button>
      </div>

      {p.models && (
        <div>
          <Label>Model</Label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {p.models.map(m => <option key={m} value={m} style={{ background: "#1e1e32" }}>{m}</option>)}
          </select>
          <div style={{ fontSize: 10.5, color: C.textSecondary, fontFamily: C.fontMono, marginTop: 5 }}>
            Used by every agent when {p.label.split(" ")[0]} is your preferred provider · saved with the key
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, alignItems: "center" }}>
        <button onClick={doTest} disabled={testing} style={{ fontFamily: C.fontMono, fontSize: 11.5, letterSpacing: "0.08em", color: testColor, background: "none", border: "none", cursor: testing ? "wait" : "pointer", textTransform: "uppercase", transition: "color 0.2s", display: "flex", alignItems: "center", gap: 4 }}>
          {testing && <InlineSpinner />}{testLabel}
        </button>
        <span style={{ width: 1, height: 14, background: C.white10 }} />
        <button onClick={doSave} disabled={!val.trim() || saving} style={{ fontFamily: C.fontMono, fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: val.trim() && !saving ? C.cyan : C.textSecondary, background: "none", border: "none", cursor: val.trim() && !saving ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
          {saving && <InlineSpinner />}{saving ? "Saving…" : "Save"}
        </button>
        {connected && (
          <>
            <span style={{ width: 1, height: 14, background: C.white10 }} />
            <button onClick={doRemove} disabled={removing} style={{ fontFamily: C.fontMono, fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.crimson, background: "none", border: "none", cursor: removing ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {removing && <InlineSpinner />}{removing ? "Removing…" : "Remove"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApiKeysSection({ push }) {
  const providerIds = Object.keys(PROVIDERS);
  const [connected,  setConnected]  = useState(Object.fromEntries(providerIds.map(id => [id, false])));
  const [previews,   setPreviews]   = useState(Object.fromEntries(providerIds.map(id => [id, null])));
  const [savedModels, setSavedModels] = useState({});
  const [preferred,  setPreferred]  = useState("anthropic");
  const [loading,    setLoading]    = useState(true);
  const [loadErr,    setLoadErr]    = useState(null);
  const [savingPref, setSavingPref] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(null);
    try {
      const data = await api.getApiKeys();
      setConnected(Object.fromEntries(providerIds.map(id => [id, data?.[id]?.has_key || false])));
      setPreviews(Object.fromEntries(providerIds.map(id => [id, data?.[id]?.preview || null])));
      setSavedModels(data?.models || {});
      setPreferred(data?.preferred_provider || "anthropic");
    } catch (err) {
      setLoadErr(err.message);
    } finally {
      setLoading(false);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const setPreferredAndSave = async (id) => {
    setPreferred(id);
    setSavingPref(true);
    try {
      // Writes the real user.preferred_provider COLUMN (the one the research
      // endpoints read) — not the preferences JSON blob.
      await api.setPreferredProvider(id);
      push(`${PROVIDERS[id].label} set as preferred`);
    } catch (err) {
      push(err.message || "Could not save preference", "err");
    } finally {
      setSavingPref(false);
    }
  };

  // ── Free starter key ──
  const [freeStatus, setFreeStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  useEffect(() => { api.freeKeyStatus().then(setFreeStatus).catch(() => setFreeStatus(null)); }, []);
  const claimFree = async () => {
    setClaiming(true);
    try {
      const r = await api.claimFreeKey();
      push(r.message || "Free key added", "ok");
      await load();
      api.freeKeyStatus().then(setFreeStatus).catch(() => {});
    } catch (err) {
      push(err.message || "Could not claim free key", "err");
    } finally {
      setClaiming(false);
    }
  };
  const showFreeBanner = freeStatus && freeStatus.pool_configured &&
    !freeStatus.already_claimed && !freeStatus.has_own_key && freeStatus.available > 0;

  return (
    <Card>
      <SectionHead icon="key" title="API Keys" subtitle="Bring your own keys · system services managed automatically" />

      {showFreeBanner && (
        <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 12,
          background: "rgba(0,204,255,0.06)", border: "1px solid rgba(0,204,255,0.22)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: C.fontHead, fontWeight: 700, fontSize: 14, color: C.cyan, marginBottom: 4 }}>
              🎁 Claim your free starter key
            </div>
            <div style={{ fontFamily: C.fontBody, fontSize: 12.5, color: C.onSurfaceVariant, lineHeight: 1.5, maxWidth: 460 }}>
              New here? Get one free API key to try POLYNOUS instantly — no card, no setup. You can add your own key anytime.
            </div>
          </div>
          <button onClick={claimFree} disabled={claiming} style={{
            padding: "10px 22px", borderRadius: 9999, border: "none", flexShrink: 0,
            background: C.cyan, color: "#04121c", fontFamily: C.fontMono, fontSize: 12, fontWeight: 700,
            cursor: claiming ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            {claiming && <InlineSpinner />}{claiming ? "Claiming…" : "Claim free key"}
          </button>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <Label>Preferred AI Provider</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.keys(PROVIDERS).filter(id => PROVIDERS[id].models).map(id => {
            const col = PROVIDERS[id].color, active = preferred === id;
            return (
              <button key={id} onClick={() => setPreferredAndSave(id)} disabled={savingPref} style={{
                padding: "8px 18px", borderRadius: 9999,
                border: `1px solid ${active ? col + "55" : C.white10}`,
                background: active ? `${col}10` : "transparent",
                color: active ? col : C.onSurfaceVariant,
                cursor: savingPref ? "wait" : "pointer",
                fontFamily: C.fontHead, fontWeight: 600, fontSize: 13.5,
                transition: "all 0.18s", display: "flex", alignItems: "center", gap: 6,
              }}>
                {savingPref && active && <InlineSpinner />}
                {PROVIDERS[id].label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Spinner /> : loadErr ? (
        <ErrorBanner msg={loadErr} onRetry={load} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.keys(PROVIDERS).map(id => (
            <KeyCard key={id} providerId={id} connected={connected[id]} preview={previews[id]} savedModel={savedModels[id]}
              onSave={savedId => { setConnected(prev => ({ ...prev, [savedId]: true })); load(); }}
              onRemove={rid => { setConnected(prev => ({ ...prev, [rid]: false })); setPreviews(prev => ({ ...prev, [rid]: null })); }}
              push={push}
            />
          ))}
          <CustomKeyTester push={push} />
        </div>
      )}
    </Card>
  );
}

// ── Verify ANY OpenAI-compatible key against a custom endpoint (test only) ──
function CustomKeyTester({ push }) {
  const [open, setOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const doTest = async () => {
    if (!baseUrl.trim() || !key.trim()) { push("Enter a base URL and a key", "err"); return; }
    setTesting(true); setResult(null);
    try {
      const r = await api.testCustomKey(baseUrl.trim(), key.trim(), model.trim());
      setResult(r?.valid ? { ok: true, msg: r.message } : { ok: false, msg: r?.message || "Invalid" });
    } catch (err) {
      setResult({ ok: false, msg: err.message || "Verification failed" });
    } finally { setTesting(false); }
  };

  return (
    <div style={{ background: "rgba(28,28,46,0.55)", border: `1px dashed ${C.white10}`, borderRadius: 13, padding: "18px 20px" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%",
        background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${C.purple}12`, border: `1px solid ${C.purple}30`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="tune" style={{ fontSize: 18, color: C.purple }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.fontHead, fontWeight: 600, color: C.onSurface, fontSize: 15 }}>Custom / Other provider</div>
          <div style={{ fontSize: 11.5, color: C.textSecondary, fontFamily: C.fontMono, marginTop: 2 }}>
            Verify any OpenAI-compatible key against its endpoint
          </div>
        </div>
        <Icon name={open ? "expand_less" : "expand_more"} style={{ fontSize: 22, color: C.textSecondary }} />
      </button>

      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Base URL — e.g. https://integrate.api.nvidia.com/v1"
            style={{ ...inputStyle }} onFocus={onFI} onBlur={onFO} />
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="API key"
            style={{ ...inputStyle }} onFocus={onFI} onBlur={onFO} />
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model (optional — e.g. deepseek-ai/deepseek-v4-flash)"
            style={{ ...inputStyle }} onFocus={onFI} onBlur={onFO} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={doTest} disabled={testing} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.purple}55`,
              background: `${C.purple}12`, color: C.purple, cursor: testing ? "wait" : "pointer",
              fontFamily: C.fontMono, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
              {testing && <InlineSpinner />}{testing ? "Verifying…" : "Verify key"}
            </button>
            {result && (
              <span style={{ fontFamily: C.fontMono, fontSize: 12, color: result.ok ? C.green : C.crimson, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={result.ok ? "check_circle" : "cancel"} style={{ fontSize: 15 }} /> {result.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreferencesSection({ push }) {
  const [mode,      setMode]      = useState("research");
  const [style,     setStyle]     = useState("academic");
  const [streaming, setStreaming] = useState(true);
  const [autoSave,  setAutoSave]  = useState(true);
  const [conf,      setConf]      = useState(70);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [loadErr,   setLoadErr]   = useState(null);
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    setLoading(true); setLoadErr(null);
    api.getPreferences()
      .then(data => {
        if (data.default_mode)                      setMode(data.default_mode);
        if (data.response_style)                    setStyle(data.response_style);
        if (data.streaming_enabled !== undefined)   setStreaming(data.streaming_enabled);
        if (data.auto_save !== undefined)           setAutoSave(data.auto_save);
        if (data.confidence_threshold !== undefined) setConf(data.confidence_threshold);
      })
      .catch(err => setLoadErr(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const scheduleSave = useCallback((prefs) => {
    // Mirror to localStorage immediately so preferences (esp. Default Mode,
    // read by the app's landing redirect) take effect without a re-login.
    if (prefs.default_mode) localStorage.setItem("polynous_default_mode", prefs.default_mode);
    if (prefs.response_style) localStorage.setItem("polynous_response_style", prefs.response_style);
    if (prefs.streaming_enabled !== undefined) localStorage.setItem("polynous_streaming", prefs.streaming_enabled);
    if (prefs.auto_save !== undefined) localStorage.setItem("polynous_autosave", prefs.auto_save);
    if (prefs.confidence_threshold !== undefined) localStorage.setItem("polynous_confidence_threshold", prefs.confidence_threshold);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await api.savePreferences(prefs); push("Preferences saved"); }
      catch (err) { push(err.message || "Save failed", "err"); }
      finally { setSaving(false); }
    }, 600);
  }, [push]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const ToggleRow = ({ label, sub, on, onFlip }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.white5}` }}>
      <div>
        <div style={{ fontFamily: C.fontHead, fontSize: 15, fontWeight: 500, color: C.onSurface }}>{label}</div>
        {sub && <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{sub}</div>}
      </div>
      <Toggle on={on} onToggle={onFlip} disabled={saving} />
    </div>
  );

  if (loading) return <Card><SectionHead icon="tune" title="Research Preferences" subtitle="Default behaviour & response style" /><Spinner /></Card>;
  if (loadErr) return <Card><SectionHead icon="tune" title="Research Preferences" subtitle="Default behaviour & response style" /><ErrorBanner msg={loadErr} onRetry={load} /></Card>;

  return (
    <Card>
      <SectionHead icon="tune" title="Research Preferences" subtitle="Default behaviour & response style" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginBottom: 20 }}>
        <div>
          <Label>Default Mode</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: "research", label: "Research" }, { id: "debate", label: "Debate" }].map(m => {
              const active = mode === m.id, col = m.id === "debate" ? C.crimson : C.silver;
              return (
                <button key={m.id} onClick={() => { setMode(m.id); scheduleSave({ default_mode: m.id }); }} style={{
                  padding: "8px 18px", borderRadius: 9999,
                  border: `1px solid ${active ? col + "55" : C.white10}`,
                  background: active ? `${col}12` : "transparent",
                  color: active ? col : C.onSurfaceVariant,
                  cursor: "pointer", fontFamily: C.fontHead, fontWeight: 600, fontSize: 13.5, transition: "all 0.18s",
                }}>{m.label}</button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>Response Style</Label>
          <select value={style} onChange={e => { setStyle(e.target.value); scheduleSave({ response_style: e.target.value }); }} style={inputStyle}>
            {[["academic","Academic"],["casual","Casual"],["eli5","Simple"],["technical","Technical"]].map(([v,l]) =>
              <option key={v} value={v}>{l}</option>
            )}
          </select>
        </div>
      </div>

      <ToggleRow label="Streaming" sub="Progressive token output" on={streaming}
        onFlip={() => { const n = !streaming; setStreaming(n); scheduleSave({ streaming_enabled: n }); }} />
      <ToggleRow label="Auto-save" sub="Persist sessions automatically" on={autoSave}
        onFlip={() => { const n = !autoSave; setAutoSave(n); scheduleSave({ auto_save: n }); }} />

      <div style={{ paddingTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: C.fontHead, fontSize: 15, fontWeight: 500, color: C.onSurface }}>Confidence Threshold</div>
          <span style={{ fontFamily: C.fontMono, fontSize: 12, color: C.silver, background: C.silverFaint, padding: "3px 10px", borderRadius: 9999, border: `1px solid ${C.silverBorder}` }}>{conf}%</span>
        </div>
        <input type="range" min={0} max={100} value={conf}
          onChange={e => setConf(Number(e.target.value))}
          onMouseUp={e => scheduleSave({ confidence_threshold: Number(e.target.value) })}
          onTouchEnd={e => scheduleSave({ confidence_threshold: Number(e.target.value) })}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: C.fontMono, fontSize: 10, color: C.textSecondary, marginTop: 6 }}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
      {saving && <div style={{ marginTop: 8, textAlign: "right", fontFamily: C.fontMono, fontSize: 11, color: C.cyan, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><InlineSpinner />Saving…</div>}
    </Card>
  );
}

const INTEGRATION_DEFS = [
  { id: "google", monogram: "G",  monogramColor: "#4285F4", label: "Google OAuth",  sub: "Drive, Docs, Calendar"   },
  { id: "github", monogram: "GH", monogramColor: "#8e98a8", label: "GitHub",        sub: "Repos, Issues, Actions"  },
  { id: "notion", monogram: "N",  monogramColor: "#e05068", label: "Notion",        sub: "Pages, Databases"        },
];

function IntegrationsSection({ push }) {
  const [statuses,  setStatuses]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState(null);
  const [busyId,    setBusyId]    = useState(null);

  const load = useCallback(() => {
    setLoading(true); setLoadErr(null);
    api.getIntegrations()
      .then(data => setStatuses(data || {}))
      .catch(err => setLoadErr(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (row) => {
    const connected = statuses[row.id]?.connected;
    setBusyId(row.id);
    try {
      if (connected) {
        await api.disconnectIntegration(row.id);
        setStatuses(prev => ({ ...prev, [row.id]: { ...prev[row.id], connected: false, detail: null } }));
        push(`${row.label} disconnected`);
      } else {
        const result = await api.connectIntegration(row.id);
        if (result?.redirect_url) {
          window.open(result.redirect_url, "_blank", "width=600,height=700");
          push(`Opening ${row.label} auth — complete in the new window`, "warn");
        } else {
          setStatuses(prev => ({ ...prev, [row.id]: { ...prev[row.id], connected: true, detail: result?.detail || null } }));
          push(`${row.label} connected`);
        }
      }
    } catch (err) {
      push(err.message || `${row.label} action failed`, "err");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <SectionHead icon="hub" title="Integrations" subtitle="Third-party service connections" />
      {loading ? <Spinner /> : loadErr ? <ErrorBanner msg={loadErr} onRetry={load} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {INTEGRATION_DEFS.map(row => {
            const connected = statuses[row.id]?.connected || false;
            const detail    = statuses[row.id]?.detail    || null;
            const busy      = busyId === row.id;
            return (
              <div key={row.id} style={{
                background: "rgba(28,28,46,0.70)", border: `1px solid ${C.white10}`,
                borderRadius: 12, padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "border-color 0.18s, background 0.18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.silverBorder; e.currentTarget.style.background = C.surfaceHigh; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.white10; e.currentTarget.style.background = "rgba(28,28,46,0.70)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${row.monogramColor}14`, border: `1px solid ${row.monogramColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.fontHead, fontWeight: 700, fontSize: 12, color: row.monogramColor, flexShrink: 0 }}>
                    {row.monogram}
                  </div>
                  <div>
                    <div style={{ fontFamily: C.fontHead, fontWeight: 600, color: C.onSurface, fontSize: 15 }}>{row.label}</div>
                    <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{connected ? (detail || row.sub) : row.sub}</div>
                  </div>
                </div>
                <button onClick={() => !busy && toggle(row)} disabled={busy} style={{
                  fontFamily: C.fontMono, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: connected ? C.crimson : C.silver,
                  background: connected ? C.crimsonFaint : C.silverFaint,
                  padding: "5px 12px", borderRadius: 9999,
                  border: `1px solid ${connected ? "rgba(224,80,104,0.3)" : C.silverBorder}`,
                  cursor: busy ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s",
                }}>
                  {busy && <InlineSpinner />}
                  {busy ? "Working…" : connected ? "Disconnect" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const SECURITY_ROWS = [
  { icon: "lock",    color: C.purple, title: "Fernet AES-128",   sub: "All keys encrypted at rest",   status: "Active"   },
  { icon: "shield",  color: C.cyan,   title: "Session Isolation", sub: "Keys scoped to your session",  status: "Enforced" },
  { icon: "vpn_key", color: C.gold,   title: "BYOK Architecture", sub: "Keys never leave your device", status: "Verified" },
];

function ChangePasswordModal({ open, onClose, push }) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy,    setBusy]    = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const submit = async () => {
    if (!current || !next) { push("Fill in all fields", "err"); return; }
    if (next.length < 8)   { push("New password must be at least 8 characters", "err"); return; }
    if (next !== confirm)  { push("Passwords don't match", "err"); return; }
    setBusy(true);
    try {
      await api.changePassword({ current_password: current, new_password: next });
      push("Password changed — please log in again");
      reset(); onClose();
      setTimeout(() => { localStorage.clear(); window.location.href = "/auth"; }, 1200);
    } catch (err) {
      push(err.message || "Change failed", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { if (!busy) { reset(); onClose(); } }} title="Change Password">
      {[
        { label: "Current password", val: current, set: setCurrent, placeholder: "••••••••" },
        { label: "New password",     val: next,    set: setNext,    placeholder: "Min. 8 characters" },
        { label: "Confirm new",      val: confirm, set: setConfirm, placeholder: "Repeat new password" },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 14 }}>
          <Label>{f.label}</Label>
          <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
            placeholder={f.placeholder} onKeyDown={e => e.key === "Enter" && submit()}
            style={{ ...inputStyle }} onFocus={onFI} onBlur={onFO} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={() => { reset(); onClose(); }} disabled={busy} style={{ padding: "9px 20px", borderRadius: 9999, border: `1px solid ${C.white10}`, background: "transparent", color: C.onSurfaceVariant, cursor: "pointer", fontFamily: C.fontHead, fontSize: 14 }}>
          Cancel
        </button>
        <button onClick={submit} disabled={busy} style={{ padding: "9px 22px", borderRadius: 9999, border: "none", background: C.silver, color: C.void, cursor: busy ? "wait" : "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 700, opacity: busy ? 0.65 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          {busy && <InlineSpinner />}{busy ? "Changing…" : "Change Password"}
        </button>
      </div>
    </Modal>
  );
}

function SecuritySection({ push }) {
  const [showPwModal, setShowPwModal]   = useState(false);
  const [revoking,    setRevoking]      = useState(false);

  const revokeAll = async () => {
    setRevoking(true);
    try {
      await api.revokeAllSessions();
      push("All sessions revoked — logging out");
      setTimeout(() => { localStorage.clear(); window.location.href = "/auth"; }, 1400);
    } catch (err) {
      push(err.message || "Revoke failed", "err");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card>
      <SectionHead icon="security" title="Security" subtitle="Encryption & access controls" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {SECURITY_ROWS.map(row => (
          <div key={row.title} style={{ background: "rgba(28,28,46,0.70)", border: `1px solid ${C.white10}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${row.color}12`, border: `1px solid ${row.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={row.icon} style={{ fontSize: 18, color: row.color }} />
              </div>
              <div>
                <div style={{ fontFamily: C.fontHead, fontWeight: 600, color: C.onSurface, fontSize: 15 }}>{row.title}</div>
                <div style={{ fontFamily: C.fontMono, fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{row.sub}</div>
              </div>
            </div>
            <span style={{ fontFamily: C.fontMono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.silver, background: C.silverFaint, padding: "5px 12px", borderRadius: 9999, border: `1px solid ${C.silverBorder}` }}>{row.status}</span>
          </div>
        ))}
      </div>
      {/* What each control does + how your data is protected */}
      <div style={{ background: C.silverFaint, border: `1px solid ${C.silverBorder}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 9 }}>
        {[
          ["key", "Change Password", "Update the password you sign in with. It's checked against your current password, must meet strength rules, and every device is signed out afterward — you'll log in again with the new one."],
          ["logout", "Revoke All Sessions", "Instantly sign out everywhere by invalidating all existing access tokens. Use this if a device is lost or you suspect someone else has access."],
          ["lock", "Your keys & password", "API keys are encrypted per-account with a key only you unlock — they're shown masked and never in full, not even to POLYNOUS staff. Your password is stored only as a salted one-way hash and can't be viewed by anyone."],
        ].map(([icon, title, body]) => (
          <div key={title} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <Icon name={icon} style={{ fontSize: 16, color: C.cyan, marginTop: 2, flexShrink: 0 }} />
            <div>
              <span style={{ fontFamily: C.fontHead, fontSize: 13, fontWeight: 700, color: C.onSurface }}>{title}</span>
              <span style={{ fontFamily: C.fontBody, fontSize: 12.5, color: C.onSurfaceVariant, lineHeight: 1.55 }}> — {body}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setShowPwModal(true)} style={{ padding: "9px 20px", borderRadius: 9999, border: `1px solid ${C.white10}`, background: "transparent", color: C.onSurface, cursor: "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 500, transition: "all 0.18s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.silverFaint; e.currentTarget.style.borderColor = C.silverBorder; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.white10; }}>
          Change Password
        </button>
        <button onClick={revokeAll} disabled={revoking} style={{ padding: "9px 20px", borderRadius: 9999, border: "1px solid rgba(224,80,104,0.25)", background: "transparent", color: C.crimson, cursor: revoking ? "wait" : "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 500, transition: "all 0.18s", display: "flex", alignItems: "center", gap: 6, opacity: revoking ? 0.65 : 1 }}
          onMouseEnter={e => { if (!revoking) e.currentTarget.style.background = C.crimsonFaint; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          {revoking && <InlineSpinner />}{revoking ? "Revoking…" : "Revoke All Sessions"}
        </button>
      </div>
      <ChangePasswordModal open={showPwModal} onClose={() => setShowPwModal(false)} push={push} />
    </Card>
  );
}

function DangerZone({ push }) {
  const [showDelete,     setShowDelete]     = useState(false);
  const [showReset,      setShowReset]      = useState(false);
  const [deletingAcct,   setDeletingAcct]   = useState(false);
  const [resettingData,  setResettingData]  = useState(false);

  const doDeleteAccount = async () => {
    setDeletingAcct(true);
    try {
      await api.deleteAccount();
      push("Account deleted — goodbye");
      setTimeout(() => { localStorage.clear(); window.location.href = "/auth"; }, 1200);
    } catch (err) {
      push(err.message || "Delete failed", "err");
    } finally {
      setDeletingAcct(false);
      setShowDelete(false);
    }
  };

  const doResetAllData = async () => {
    setResettingData(true);
    try {
      await api.clearAllData();
      push("All data reset");
      setTimeout(() => { localStorage.clear(); window.location.href = "/auth"; }, 1200);
    } catch (err) {
      push(err.message || "Reset failed", "err");
    } finally {
      setResettingData(false);
      setShowReset(false);
    }
  };

  return (
    <Card danger>
      <SectionHead icon="warning" title="Danger Zone" subtitle="Irreversible — proceed with caution" />
      <p style={{ fontFamily: C.fontMono, fontSize: 13, color: C.textSecondary, letterSpacing: "0.03em", marginBottom: 20, lineHeight: 1.75 }}>
        These actions cannot be undone. All stored data, memory, and API keys will be permanently removed.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setShowDelete(true)} style={{ padding: "9px 22px", borderRadius: 9999, border: "1px solid rgba(224,80,104,0.4)", background: "transparent", color: C.crimson, cursor: "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 600, transition: "background 0.18s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.crimsonFaint}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          Delete Account
        </button>
        <button onClick={() => setShowReset(true)} style={{ padding: "9px 22px", borderRadius: 9999, border: "1px solid rgba(224,80,104,0.4)", background: "transparent", color: C.crimson, cursor: "pointer", fontFamily: C.fontHead, fontSize: 14, fontWeight: 600, transition: "background 0.18s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.crimsonFaint}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          Reset All Data
        </button>
      </div>

      <ConfirmModal
        open={showDelete} onClose={() => !deletingAcct && setShowDelete(false)}
        onConfirm={doDeleteAccount} loading={deletingAcct}
        title="Delete Account"
        body="Your account, all research, API keys, and settings will be permanently deleted. This cannot be undone."
        confirmLabel="Delete My Account" danger
      />
      <ConfirmModal
        open={showReset} onClose={() => !resettingData && setShowReset(false)}
        onConfirm={doResetAllData} loading={resettingData}
        title="Reset All Data"
        body="All stored research, memory nodes, knowledge graph, and session history will be wiped. Your account itself and login credentials remain intact."
        confirmLabel="Reset Everything" danger
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
// ── Usage & Credits — real per-run token/cost usage, research vs debate ──────
function UsageSection({ push }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setLoadErr(null);
    api.getUsage()
      .then(setData)
      .catch((e) => setLoadErr(e.message || "Could not load usage"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const fmtTok = (n) => (typeof n === "number" ? n.toLocaleString() : "0");
  const fmtCost = (usd, partial) =>
    typeof usd === "number" ? `${partial ? "~" : ""}$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}` : "—";
  const timeAgo = (iso) => {
    if (!iso) return "";
    // Backend stores naive UTC; append 'Z' so the browser doesn't read it as local.
    const norm = /[Z+]/.test(iso.slice(10)) ? iso : iso + "Z";
    const s = Math.max(0, (Date.now() - new Date(norm).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  if (loading) return <Card><SectionHead icon="monitoring" title="Usage & Credits" subtitle="Real token spend on your own keys" /><Spinner /></Card>;
  if (loadErr) return <Card><SectionHead icon="monitoring" title="Usage & Credits" subtitle="Real token spend on your own keys" /><ErrorBanner msg={loadErr} onRetry={load} /></Card>;

  const bm = data?.by_mode || { research: {}, debate: {} };
  const totals = data?.totals || {};
  const recent = data?.recent || [];

  const ModeCard = ({ label, icon, accent, m }) => (
    <div style={{ flex: 1, minWidth: 200, background: C.silverFaint, border: `1px solid ${C.silverBorder}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon name={icon} style={{ fontSize: 17, color: accent }} />
        <span style={{ fontFamily: C.fontHead, fontSize: 14, fontWeight: 700, color: C.onSurface }}>{label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px" }}>
        {[
          ["Runs", m.runs || 0],
          ["LLM calls", m.calls || 0],
          ["Tokens", fmtTok(m.total_tokens)],
          ["Est. cost", fmtCost(m.estimated_cost_usd, m.cost_is_partial)],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: C.fontMono, fontSize: 9.5, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
            <div style={{ fontFamily: C.fontHead, fontSize: 18, fontWeight: 700, color: k === "Est. cost" ? accent : C.onSurface }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <SectionHead icon="monitoring" title="Usage & Credits" subtitle="Real token spend on your own keys · research vs debate" />

      {!data?.available ? (
        <div style={{ textAlign: "center", padding: "24px 12px", color: C.onSurfaceVariant, fontFamily: C.fontBody, fontSize: 14 }}>
          No runs recorded yet. Your token and estimated-cost usage will appear here after your first research or debate.
        </div>
      ) : (
        <>
          {/* research vs debate side by side */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <ModeCard label="Research" icon="psychology" accent={C.green} m={bm.research || {}} />
            <ModeCard label="Debate" icon="forum" accent={C.crimson} m={bm.debate || {}} />
          </div>

          {/* combined total */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "14px 18px", background: C.silverFaint, border: `1px solid ${C.silverBorder}`, borderRadius: 12, marginBottom: recent.length ? 18 : 0 }}>
            <span style={{ fontFamily: C.fontMono, fontSize: 11, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Total · {totals.runs || 0} runs · {fmtTok(totals.total_tokens)} tokens
            </span>
            <span style={{ fontFamily: C.fontHead, fontSize: 20, fontWeight: 700, color: C.cyan }}>
              {fmtCost(totals.estimated_cost_usd, totals.cost_is_partial)} <span style={{ fontFamily: C.fontMono, fontSize: 10, color: C.textSecondary }}>est.</span>
            </span>
          </div>

          {recent.length > 0 && (
            <div>
              <div style={{ fontFamily: C.fontMono, fontSize: 10, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Recent runs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recent.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.silverFaint, borderRadius: 10, fontFamily: C.fontMono, fontSize: 11.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.mode === "debate" ? C.crimson : C.green, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.query || r.mode}</span>
                    <span style={{ color: C.textSecondary, flexShrink: 0 }}>{fmtTok(r.total_tokens)} tok</span>
                    <span style={{ color: C.cyan, flexShrink: 0, width: 64, textAlign: "right" }}>{fmtCost(r.estimated_cost_usd)}</span>
                    <span style={{ color: C.textSecondary, flexShrink: 0, width: 60, textAlign: "right" }}>{timeAgo(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p style={{ fontFamily: C.fontMono, fontSize: 9.5, color: C.textSecondary, marginTop: 14, lineHeight: 1.6 }}>
            Costs are estimates from public list prices and may differ from your provider bill. Tokens are the real counts your provider reported.
          </p>
        </>
      )}
    </Card>
  );
}

// ── Admin — owner-only user-base overview. Self-hides for non-admins (the
//    backend returns 403 unless the account's email is in ADMIN_EMAILS).
//    Never shows passwords or API keys — only presence + security guarantees.
function AdminSection({ push }) {
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);   // null = unknown, false = hide
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminUsers()
      .then((d) => { setData(d); setIsAdmin(true); })
      .catch((e) => { setIsAdmin(e.status === 403 ? false : false); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!isAdmin || !data) return null;   // non-admins never see this section

  const t = data.totals || {};
  const users = data.users || [];
  const fmtDate = (iso) => (iso ? new Date(/[Z+]/.test(iso.slice(10)) ? iso : iso + "Z").toLocaleDateString() : "—");

  return (
    <Card>
      <SectionHead icon="admin_panel_settings" title="Admin · User Base" subtitle="Owner-only · passwords & keys never exposed" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {[["Total users", t.users], ["Active", t.active], ["Active (7d)", t.recently_active_7d]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, minWidth: 130, background: C.silverFaint, border: `1px solid ${C.silverBorder}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontFamily: C.fontMono, fontSize: 9.5, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{k}</div>
            <div style={{ fontFamily: C.fontHead, fontSize: 24, fontWeight: 800, color: C.cyan }}>{v ?? 0}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "rgba(94,201,126,0.06)", border: "1px solid rgba(94,201,126,0.22)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
        <Icon name="verified_user" style={{ fontSize: 16, color: C.green, marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontFamily: C.fontBody, fontSize: 12.5, color: C.onSurfaceVariant, lineHeight: 1.55 }}>
          Passwords are salted one-way hashes — unreadable by anyone, including you. API keys are encrypted per-account and never returned here; only which providers each user configured is shown.
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.fontMono, fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.textSecondary, textAlign: "left" }}>
              {["User", "Tier", "Keys", "Joined", "Last login"].map((h, i) => (
                <th key={h} style={{ padding: "7px 10px", fontWeight: 600, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.public_id} style={{ borderTop: `1px solid ${C.white10}`, color: "#cfe" }}>
                <td style={{ padding: "8px 10px", color: "#fff", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.email}{!u.is_active && <span style={{ color: C.crimson, marginLeft: 6 }}>(inactive)</span>}
                </td>
                <td style={{ padding: "8px 10px", color: C.textSecondary }}>{u.tier}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: u.key_count ? C.green : C.textSecondary }}
                    title={(u.providers_configured || []).join(", ") || "no keys configured"}>
                  {u.key_count}{u.key_count ? " 🔒" : ""}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: C.textSecondary }}>{fmtDate(u.created_at)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: C.textSecondary }}>{fmtDate(u.last_login)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontFamily: C.fontMono, fontSize: 9.5, color: C.textSecondary, marginTop: 12, lineHeight: 1.6 }}>
        {data.logged_in_note}
      </p>
    </Card>
  );
}

export default function SettingsPage({ user, onNavigate, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const { toasts, push } = useToast();
  const sidebarW = collapsed ? 58 : 288;

  const [activePersona, setActivePersona] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("polynous_persona")) || null
  );
  const handlePersonaChange = useCallback((id) => {
    setActivePersona(id);
    localStorage.setItem("polynous_persona", id || "");
  }, []);
  const personaObj = PERSONAS.find(p => p.id === activePersona) || null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1e", color: C.onSurface, fontFamily: C.fontBody, overflowX: "hidden" }}>
      <Styles />
      <NeuralCanvas />
      <Sidebar onNavigate={onNavigate} user={user} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed} persona={personaObj} />

      <main style={{
        marginLeft: sidebarW, padding: "36px 36px 80px",
        maxWidth: "calc(980px + 288px)",
        transition: "margin-left 0.35s cubic-bezier(0.4,0,0.2,1)",
        position: "relative", zIndex: 10,
      }}>
        <header style={{ marginBottom: 44, paddingTop: 8 }}>
          <p style={{ fontFamily: C.fontMono, fontSize: 11, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.24em", marginBottom: 10 }}>
            Neural Research Environment
          </p>
          <h1 style={{
            fontFamily: C.fontDisplay,
            fontSize: "clamp(3.4rem,7.5vw,6rem)",
            fontWeight: 400, textTransform: "uppercase",
            letterSpacing: "0.02em", lineHeight: 0.95, margin: 0,
            background: "linear-gradient(180deg, #ffffff 0%, #e8ecf2 35%, #aab1bd 75%, #6f7787 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            animation: "settingsGlow 3.5s ease-in-out infinite",
          }}>
            Settings
          </h1>
          <p style={{ fontFamily: C.fontBody, fontSize: 16, color: C.onSurfaceVariant, marginTop: 14, lineHeight: 1.5 }}>
            Manage your keys, preferences, and account.
          </p>
          <div style={{ height: 1, marginTop: 18, background: `linear-gradient(90deg, ${C.silverBorder}, transparent)` }} />
        </header>

        <ProfileSection
          user={user}
          push={push}
          activePersona={activePersona}
          onPersonaChange={handlePersonaChange}
        />
        <ApiKeysSection                   push={push} />
        <UsageSection                     push={push} />
        <PreferencesSection               push={push} />
        <IntegrationsSection              push={push} />
        <SecuritySection                  push={push} />
        <AdminSection                     push={push} />
        <DangerZone                       push={push} />
      </main>

      <ToastBox toasts={toasts} />
    </div>
  );
}