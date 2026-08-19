// ─────────────────────────────────────────────────────────────────────────────
// AdminDashboard — owner-only visibility into the user base.
//
// Access: gated by a secret ADMIN_KEY (set on the backend). The key is entered
// once here and kept in sessionStorage (cleared when the tab closes), then sent
// as the `X-Admin-Key` header alongside the normal auth token. The backend
// returns NO passwords and NO API-key values — only counts + presence booleans.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL, getAuthToken } from "../config";
import { usePreviewFlag, setDevPreview } from "../devPreview";
import PolynousReport from "./PolynousReport";

const C = {
  bg: "#06040f",
  surface: "rgba(11,9,20,0.72)",
  surface2: "rgba(255,255,255,0.03)",
  border: "rgba(168,85,247,0.16)",
  border2: "rgba(255,255,255,0.08)",
  text: "#eef1f8",
  dim: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.32)",
  purple: "#a855f7",
  cyan: "#22d3ee",
  green: "#00ff47",
  amber: "#f5b942",
  crimson: "#ff2d55",
  head: "'Sora','Space Grotesk',sans-serif",
  body: "'Inter','Hanken Grotesk',sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};

const KEY_STORE = "polynous_admin_key";

function Ic({ name, size = 18, color = "currentColor", style }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}
function relTime(iso) {
  if (!iso) return "never";
  const d = new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - d) / 1000);
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return fmtDate(iso);
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, delay = 0 }) {
  return (
    <div style={{
      flex: "1 1 180px", minWidth: 170, position: "relative", overflow: "hidden",
      background: C.surface, backdropFilter: "blur(20px)", border: `1px solid ${C.border2}`,
      borderRadius: 16, padding: "20px 22px", animation: `admIn 0.5s ${delay}s ease both`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent 70%)`, opacity: 0.8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}1c`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic name={icon} size={16} color={accent} />
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint }}>{label}</span>
      </div>
      <div style={{ fontFamily: C.head, fontSize: 34, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function Pill({ children, color = C.purple }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 9999, background: `${color}14`, border: `1px solid ${color}33`, color, fontFamily: C.mono, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── Key-entry gate ───────────────────────────────────────────────────────────
function KeyGate({ onSubmit, error, checking }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: C.body }}>
      <div style={{ width: "min(440px,94vw)", background: C.surface, backdropFilter: "blur(24px)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "34px 32px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8)", animation: "admIn 0.4s ease both" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `${C.purple}1c`, border: `1px solid ${C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Ic name="admin_panel_settings" size={26} color={C.purple} />
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.purple, fontWeight: 700, marginBottom: 7 }}>Owner access</div>
        <h1 style={{ fontFamily: C.head, fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Admin Console</h1>
        <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, margin: "0 0 22px" }}>
          Enter your admin key to view the user base. The key is kept only in this tab and sent securely with each request.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }}>
          <input
            type="password" autoFocus value={val} onChange={(e) => setVal(e.target.value)}
            placeholder="Admin key…"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1px solid ${error ? C.crimson : C.border2}`, background: "rgba(0,0,0,0.25)", color: C.text, fontFamily: C.mono, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
          />
          {error && <div style={{ color: C.crimson, fontSize: 12, fontFamily: C.mono, marginBottom: 12 }}>✕ {error}</div>}
          <button type="submit" disabled={checking || !val.trim()} style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "none",
            background: checking || !val.trim() ? "rgba(168,85,247,0.3)" : `linear-gradient(135deg, ${C.purple}, #7c3aed)`,
            color: "#fff", fontFamily: C.head, fontWeight: 800, fontSize: 14, cursor: checking || !val.trim() ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {checking ? "Verifying…" : "Unlock console"}
            {!checking && <Ic name="arrow_forward" size={17} />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── In-development pages registry ────────────────────────────────────────────
// Add work-in-progress pages here. They are reachable ONLY from this admin
// console (each route is gated on dev-preview / admin), so clients never see
// half-finished work — you review and sign off here, then ship when ready.
const DEV_PAGES = [
  {
    id: "neural-report-v2",
    name: "Neural Report v2",
    desc: "Redesigned research report — glass cards, evidence ledger, faithfulness, citation inspector. Runs on demo data until wired to live research.",
    status: "In progress",
    route: "/report-preview",
    icon: "science",
    accent: "#5eead4",
  },
];

function DevPagesSection({ onNavigate }) {
  const go = (p) => {
    // Ensure the preview route's gate is open for this admin session.
    setDevPreview(true);
    if (onNavigate) onNavigate(p); else window.location.href = p;
  };
  return (
    <div style={{ background: C.surface, backdropFilter: "blur(20px)", border: `1px solid ${C.border2}`, borderRadius: 16, padding: "22px 24px", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Ic name="construction" size={17} color={C.amber} />
        <span style={{ fontFamily: C.head, fontSize: 15, fontWeight: 800, color: C.text }}>Pages in Development</span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.faint, marginLeft: 4 }}>admin-only · not visible to clients</span>
      </div>
      <p style={{ fontFamily: C.body, fontSize: 12, color: C.dim, margin: "0 0 16px" }}>
        Preview and sign off on unfinished work here. When a page is ready, we flip it on for everyone.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
        {DEV_PAGES.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${p.accent}2e`, borderRadius: 13, padding: "16px 18px", background: `${p.accent}0a` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: `${p.accent}1c`, border: `1px solid ${p.accent}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name={p.icon} size={16} color={p.accent} />
              </span>
              <div>
                <div style={{ fontFamily: C.head, fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: p.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.status}</div>
              </div>
            </div>
            <p style={{ fontFamily: C.body, fontSize: 12, color: C.dim, lineHeight: 1.55, margin: "0 0 14px" }}>{p.desc}</p>
            <button onClick={() => go(p.route)} className="adm-btn" style={{ borderColor: `${p.accent}55`, color: p.accent }}>
              <Ic name="visibility" size={14} color={p.accent} /> Preview page ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline demo report ───────────────────────────────────────────────────────
// Renders the full PolynousReport structure on its built-in demo data, right
// here in the console — so you can review the report layout any time without
// running a live research query.
function InlineReportPreview() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.surface, backdropFilter: "blur(20px)", border: `1px solid ${C.border2}`, borderRadius: 16, padding: open ? "22px 24px 8px" : "22px 24px", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Ic name="description" size={17} color={C.cyan} />
        <span style={{ fontFamily: C.head, fontSize: 15, fontWeight: 800, color: C.text }}>Report Structure (demo data)</span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>no research run needed</span>
        <button onClick={() => setOpen(o => !o)} className="adm-btn" style={{ marginLeft: "auto", borderColor: `${C.cyan}55`, color: C.cyan }}>
          <Ic name={open ? "expand_less" : "expand_more"} size={15} color={C.cyan} /> {open ? "Hide preview" : "Show preview"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 16, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border2}` }}>
          <PolynousReport />
        </div>
      )}
    </div>
  );
}

// ── Dev-preview controls ─────────────────────────────────────────────────────
// Flip experimental components on for yourself (admin) and open the preview —
// so you can review in-progress work live instead of running localhost.
function DevPreviewControls({ onNavigate }) {
  const on = usePreviewFlag();
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={() => setDevPreview(!on)}
        title="Show in-development components to admins only"
        className="adm-btn"
        style={{ borderColor: on ? `${C.green}66` : C.border2, color: on ? C.green : C.dim, background: on ? `${C.green}12` : C.surface2 }}
      >
        <Ic name={on ? "toggle_on" : "toggle_off"} size={17} color={on ? C.green : C.faint} />
        Dev Preview {on ? "ON" : "OFF"}
      </button>
      {on && (
        <button onClick={() => go("/report-preview")} className="adm-btn" style={{ borderColor: `${C.cyan}55`, color: C.cyan }}>
          <Ic name="science" size={14} color={C.cyan} /> New report ↗
        </button>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ onNavigate }) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY_STORE) || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState("");
  const [checking, setChecking] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("created"); // created | last_login | keys

  const fetchUsers = useCallback(async (key) => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "X-Admin-Key": key,
      },
    });
    if (res.status === 403) throw new Error("That key was rejected. Check ADMIN_KEY on the server.");
    if (res.status === 401) throw new Error("You must be signed in to your account first.");
    if (!res.ok) throw new Error(`Server error (${res.status}).`);
    return res.json();
  }, []);

  const submitKey = async (key) => {
    setChecking(true); setGateError("");
    try {
      const d = await fetchUsers(key);
      sessionStorage.setItem(KEY_STORE, key);
      setDevPreview(true);   // remember you're an admin on this device → shows the sidebar/launcher entry
      setAdminKey(key);
      setData(d);
    } catch (e) {
      setGateError(e.message || "Could not verify key.");
    } finally {
      setChecking(false);
    }
  };

  const refresh = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try { setData(await fetchUsers(adminKey)); }
    catch (e) {
      // key went bad → drop back to the gate
      sessionStorage.removeItem(KEY_STORE); setAdminKey(""); setData(null); setGateError(e.message || "Session expired.");
    } finally { setLoading(false); }
  }, [adminKey, fetchUsers]);

  useEffect(() => { if (adminKey && !data) refresh(); }, [adminKey, data, refresh]);

  const logout = () => { sessionStorage.removeItem(KEY_STORE); setAdminKey(""); setData(null); };

  if (!adminKey || (!data && !loading)) {
    return (
      <>
        <style>{styles}</style>
        <KeyGate onSubmit={submitKey} error={gateError} checking={checking} />
      </>
    );
  }

  const totals = data?.totals || { users: 0, active: 0, recently_active_7d: 0 };
  const users = (data?.users || []);
  const totalKeys = users.reduce((s, u) => s + (u.key_count || 0), 0);

  const filtered = users
    .filter(u => !q || `${u.email} ${u.username}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "keys") return (b.key_count || 0) - (a.key_count || 0);
      const key = sortBy === "last_login" ? "last_login" : "created_at";
      return new Date(b[key] || 0) - new Date(a[key] || 0);
    });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.body, padding: "clamp(18px,4vw,40px)" }}>
      <style>{styles}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 26 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Ic name="admin_panel_settings" size={22} color={C.purple} />
            <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.purple, fontWeight: 700 }}>Owner console</span>
          </div>
          <h1 style={{ fontFamily: C.head, fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>User Insights</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <DevPreviewControls onNavigate={onNavigate} />
          <button onClick={refresh} disabled={loading} className="adm-btn" title="Refresh">
            <Ic name="refresh" size={15} style={{ animation: loading ? "admSpin 0.8s linear infinite" : "none" }} /> Refresh
          </button>
          {onNavigate && <button onClick={() => onNavigate("/")} className="adm-btn"><Ic name="home" size={15} /> App</button>}
          <button onClick={logout} className="adm-btn" style={{ borderColor: `${C.crimson}44`, color: C.crimson }}><Ic name="lock" size={15} /> Lock</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon="group" label="Total users" value={totals.users} accent={C.purple} delay={0} />
        <StatCard icon="check_circle" label="Active accounts" value={totals.active} accent={C.green} delay={0.05} />
        <StatCard icon="bolt" label="Active · last 7 days" value={totals.recently_active_7d} accent={C.cyan} delay={0.1} />
        <StatCard icon="key" label="API keys configured" value={totalKeys} accent={C.amber} delay={0.15} />
      </div>

      {/* In-development pages (admin-only) */}
      <DevPagesSection onNavigate={onNavigate} />

      {/* Full report structure on demo data — no research run needed */}
      <InlineReportPreview />

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
          <Ic name="search" size={16} color={C.faint} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or username…"
            style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, border: `1px solid ${C.border2}`, background: C.surface2, color: C.text, fontFamily: C.body, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["created", "Newest"], ["last_login", "Recent login"], ["keys", "Most keys"]].map(([k, lab]) => (
            <button key={k} onClick={() => setSortBy(k)} className="adm-chip" style={{
              background: sortBy === k ? `${C.purple}22` : C.surface2,
              borderColor: sortBy === k ? `${C.purple}66` : C.border2,
              color: sortBy === k ? "#fff" : C.dim,
            }}>{lab}</button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontFamily: C.mono, fontSize: 11, color: C.faint }}>{filtered.length} of {users.length}</span>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, backdropFilter: "blur(20px)", border: `1px solid ${C.border2}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["User", "Tier", "Status", "Registered", "Last login", "Keys"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontFamily: C.mono, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint, fontWeight: 700, borderBottom: `1px solid ${C.border2}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.public_id || i} className="adm-row" style={{ borderBottom: i < filtered.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none" }}>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: `${C.purple}1c`, border: `1px solid ${C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.head, fontWeight: 800, fontSize: 13, color: C.purple }}>
                        {(u.username || u.email || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: C.head, fontWeight: 700, fontSize: 13.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{u.username || "—"}</div>
                        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px" }}><Pill color={u.tier === "pro" ? C.amber : C.dim}>{u.tier || "free"}</Pill></td>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Pill color={u.is_active ? C.green : C.crimson}>{u.is_active ? "active" : "inactive"}</Pill>
                      {u.email_verified && <Pill color={C.cyan}><Ic name="verified" size={11} /> verified</Pill>}
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", fontFamily: C.mono, fontSize: 12, color: C.dim, whiteSpace: "nowrap" }}>{fmtDate(u.created_at)}</td>
                  <td style={{ padding: "13px 18px", whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: C.mono, fontSize: 12, color: u.last_login ? C.text : C.faint }}>{relTime(u.last_login)}</span>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    {u.key_count > 0
                      ? <span title={(u.providers_configured || []).join(", ")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: 12, color: C.amber }}><Ic name="key" size={13} color={C.amber} /> {u.key_count}</span>
                      : <span style={{ fontFamily: C.mono, fontSize: 12, color: C.faint }}>none</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", fontFamily: C.mono, fontSize: 13, color: C.faint }}>No users match "{q}".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security footnote */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "flex-start", fontFamily: C.mono, fontSize: 10.5, color: C.faint, lineHeight: 1.6 }}>
        <Ic name="shield" size={14} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Passwords are stored as salted one-way hashes and API keys are encrypted per-user — neither is ever returned here. This console shows presence and counts only. {data?.logged_in_note}</span>
      </div>
    </div>
  );
}

const styles = `
@keyframes admIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes admSpin { to { transform: rotate(360deg); } }
.adm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px; cursor: pointer;
  background: ${C.surface2}; border: 1px solid ${C.border2}; color: ${C.dim};
  font-family: ${C.mono}; font-size: 12px; font-weight: 600; transition: all 0.2s; }
.adm-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
.adm-chip { padding: 8px 13px; border-radius: 9999px; cursor: pointer; border: 1px solid ${C.border2};
  font-family: ${C.mono}; font-size: 11px; font-weight: 600; transition: all 0.2s; }
.adm-row { transition: background 0.18s; }
.adm-row:hover { background: rgba(168,85,247,0.05); }
`;
