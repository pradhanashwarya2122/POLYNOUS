import ActiveModelBadge from "./ActiveModelBadge";

// ─── Icon Component (defined locally) ────────────────────────
function Icon({ name, style }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block", userSelect: "none", ...(style || {})
    }}>{name}</span>
  );
}

const C = {
  purple: "#a855f7",
  void: "#0a0a1e",
  surfaceContainer: "#1e1e32",
  onSurfaceVariant: "#b9ccb0",
  textSecondary: "#8899aa",
  white10: "rgba(255,255,255,0.1)",
  white5: "rgba(255,255,255,0.05)",
};

const NAV = [
  { icon: "travel_explore",   label: "Research",        path: "/research" },
  { icon: "forum",            label: "Debate Chamber",  path: "/debate" },
  { icon: "account_tree",     label: "Knowledge Graph", path: "/graph", active: true },
  { icon: "search",           label: "Semantic Search", path: "/search" },
  { icon: "database",         label: "Memory Bank",     path: "/memory" },
  { icon: "picture_as_pdf",   label: "PDF Lab",         path: "/pdf-lab" },
  { icon: "analytics",        label: "Analytics",       path: "/analytics" },
  { icon: "settings",         label: "Settings",        path: "/settings" },
  { icon: "help", label: "Help", path: "/info" },
];

const FOCUS_CSS = `
  .pn-nav-item:focus-visible, .pn-icon-btn:focus-visible {
    outline: 2px solid #a855f7;
    outline-offset: 2px;
    border-radius: 8px;
  }
`;

export default function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const bye = () => (onLogout ? onLogout() : (localStorage.clear(), (window.location.href = "/")));
  const keyGo = (fn) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  // ── Collapsed State ─────────────────────────────────────────
  if (collapsed) return (
    <aside style={{
      position: "fixed", left: 0, top: 0, height: "100%", width: 56,
      background: "rgba(10,10,30,0.65)", backdropFilter: "blur(24px)",
      borderRight: "1px solid rgba(168,85,247,0.22)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 0", zIndex: 30,
    }}>
      <style>{FOCUS_CSS}</style>
      <button
        onClick={() => setCollapsed(false)}
        aria-label="Expand sidebar"
        className="pn-icon-btn"
        style={{ background: "none", border: "none", color: C.purple, cursor: "pointer", marginBottom: 32 }}
      >
        <Icon name="chevron_right" style={{ fontSize: 22 }} />
      </button>

      {NAV.map(({ icon, label, path, active }) => (
        <div
          key={label}
          onClick={() => go(path)}
          onKeyDown={keyGo(() => go(path))}
          role="button"
          tabIndex={0}
          aria-label={label}
          title={label}
          className="pn-nav-item"
          style={{
            padding: "12px 0", cursor: "pointer",
            color: active ? C.purple : C.onSurfaceVariant,
            width: "100%", display: "flex", justifyContent: "center",
            transition: "color 0.2s",
          }}
        >
          <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
        </div>
      ))}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div
          onClick={() => go("/research")}
          onKeyDown={keyGo(() => go("/research"))}
          role="button"
          tabIndex={0}
          aria-label="New Research"
          className="pn-nav-item"
          style={{
            width: 34, height: 34, borderRadius: "50%", background: C.purple,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <Icon name="add" style={{ fontSize: 16, color: C.void }} />
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: C.surfaceContainer,
          border: `1px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="face" style={{ color: C.purple, fontSize: 14 }} />
        </div>
        <div
          onClick={bye}
          onKeyDown={keyGo(bye)}
          role="button"
          tabIndex={0}
          aria-label="Log out"
          className="pn-nav-item"
          style={{ cursor: "pointer", color: C.purple }}
        >
          <Icon name="logout" style={{ fontSize: 14 }} />
        </div>
      </div>
    </aside>
  );

  // ── Expanded State ──────────────────────────────────────────
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, height: "100%", width: 320,
      background: "rgba(10,10,30,0.65)", backdropFilter: "blur(24px)",
      borderRight: "1px solid rgba(168,85,247,0.22)",
      boxShadow: "0 0 20px rgba(168,85,247,0.08)",
      display: "flex", flexDirection: "column", padding: 24, zIndex: 30,
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden",
    }}>
      <style>{FOCUS_CSS}</style>
      {/* Logo + Collapse */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
          <h1 style={{
            fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800,
            color: C.purple, letterSpacing: "-0.03em", whiteSpace: "nowrap",
          }}>POLYNOUS</h1>
          <p style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
            color: C.onSurfaceVariant, textTransform: "uppercase",
            letterSpacing: "0.2em", opacity: 0.7,
          }}>Cerebral Vitality Engine</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="pn-icon-btn"
          style={{
            background: "none", border: "none", color: C.textSecondary,
            cursor: "pointer", padding: 4, marginLeft: 8,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
        >
          <Icon name="chevron_left" style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="pn-stagger" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
        {NAV.map(({ icon, label, path, active }) => (
          <div
            key={label}
            onClick={() => go(path)}
            onKeyDown={keyGo(() => go(path))}
            role="button"
            tabIndex={0}
            className="pn-nav-item"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", borderRadius: 9999, cursor: "pointer",
              color: active ? C.purple : C.onSurfaceVariant,
              background: active ? `${C.purple}15` : "transparent",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden",
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.color = C.purple;
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.color = C.onSurfaceVariant;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Icon name={icon} style={{ fontSize: 20, color: "inherit", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div style={{ borderTop: "1px solid " + C.white5, paddingTop: 24, marginTop: 24 }}>
        <button
          onClick={() => go("/research")}
          style={{
            width: "100%", padding: 12, background: C.purple, color: C.void,
            fontWeight: 700, borderRadius: 9999, border: "none", cursor: "pointer",
            fontFamily: "'Sora',sans-serif", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Icon name="add" style={{ fontSize: 18, color: C.void }} /> New Research
        </button>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: C.surfaceContainer,
            border: `1px solid ${C.purple}`, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="face" style={{ color: C.purple, fontSize: 22 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700,
              color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user?.username || "Guest"}
            </p>
            <button
              onClick={bye}
              style={{
                fontSize: 10, color: C.purple, background: "none", border: "none",
                cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", padding: 0,
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}