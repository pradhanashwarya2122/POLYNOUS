import { useState, useEffect } from "react";
import { API_BASE_URL, getAuthToken } from "../config";

/*
  TrialWelcome — one-time, minimalist welcome for the free Gemini starter key.
  States the deal plainly: one key runs everything, 3 runs a day, 7-day window,
  add your own key for more. Theme-aware (uses the app's CSS variables), a single
  crimson brand accent, hairline rules, generous whitespace — no glowing boxes,
  no gradients, no AI-slop.
*/

const F = {
  serif: "'Bricolage Grotesque','Sora',sans-serif",
  sans: "'Hanken Grotesk',-apple-system,sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export default function TrialWelcome({ user, onClose }) {
  const rawName = (user && user.username) || "";
  const safeName = (!/[:/@]|https?/i.test(rawName) && rawName.length > 0 && rawName.length <= 24) ? rawName : "";

  const [phase, setPhase] = useState("intro"); // intro | claiming | done
  const [msg, setMsg] = useState("");
  const [trial, setTrial] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 20); return () => clearTimeout(t); }, []);
  const close = () => { setMounted(false); setTimeout(() => onClose && onClose(), 300); };

  const activate = async () => {
    setPhase("claiming");
    try {
      const tok = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/settings/api-keys/free-key/claim`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
      });
      const data = res.ok ? await res.json() : {};
      if (res.ok) { setTrial(data.trial || null); setMsg(data.message || "Your free Gemini key is active."); }
      else if (res.status === 400) { setMsg("You're already set up — your key is ready to go."); }
      else { setMsg("You can activate it anytime in Settings → API Keys."); }
    } catch {
      setMsg("You can activate your free key anytime in Settings → API Keys.");
    }
    setPhase("done");
  };

  const dailyCap = (trial && trial.daily_cap) || 3;
  const days = (trial && trial.days) || 7;

  const TERMS = [
    { icon: "bolt", title: "One key runs everything", body: "Research, debates, the knowledge graph, PDF analysis — all of it. You never need a second key." },
    { icon: "restart_alt", title: `${dailyCap} free runs a day`, body: `Fair-use limit that resets every day, for ${days} days. More than enough to explore properly.` },
    { icon: "trending_up", title: "A lightweight model", body: "Great for a first look. Add your own Claude, GPT or Gemini key anytime for stronger, unlimited results." },
  ];

  const scrim = {
    position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24, background: "rgba(4,6,16,0.62)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)",
    opacity: mounted ? 1 : 0, transition: "opacity .3s ease",
  };
  const card = {
    position: "relative", width: "100%", maxWidth: 500, background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: 18, padding: "38px 38px 30px",
    boxShadow: "var(--shadow)", fontFamily: F.sans, color: "var(--text-secondary)",
    transform: mounted ? "none" : "translateY(14px) scale(0.99)", transition: "transform .4s cubic-bezier(.16,1,.3,1)",
    maxHeight: "92vh", overflowY: "auto",
  };
  const kicker = { fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--accent-ink)", marginBottom: 18, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 };
  const h1 = { fontFamily: F.serif, fontWeight: 700, fontSize: "clamp(1.6rem,4vw,2.15rem)", lineHeight: 1.08, letterSpacing: "-0.025em", color: "var(--text)", margin: 0 };
  const sub = { fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)", margin: "13px 0 0", maxWidth: "46ch" };
  const closeBtn = { position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--overlay)", color: "var(--text-muted)", fontSize: 17, cursor: "pointer", lineHeight: 1 };
  const primary = { padding: "13px 22px", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontFamily: F.sans, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "filter .18s ease" };
  const ghost = { padding: "13px 20px", borderRadius: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: F.sans, fontSize: 13.5, fontWeight: 500, cursor: "pointer" };

  return (
    <div style={scrim} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div style={card} role="dialog" aria-modal="true" aria-label="Free Gemini key">
        <button onClick={close} aria-label="Close" style={closeBtn}>×</button>

        {phase !== "done" ? (
          <>
            <div style={kicker}><span style={{ color: "var(--accent-ink)" }}>◆</span> POLYNOUS · WELCOME{safeName ? `, ${safeName.toUpperCase()}` : ""}</div>
            <h1 style={h1}>Your free Gemini<br />key is ready.</h1>
            <p style={sub}>We've set aside a free starter key so you can see POLYNOUS work right now — no card, no setup. Here's the deal, in plain terms:</p>

            <div style={{ margin: "26px 0 28px", display: "flex", flexDirection: "column" }}>
              {TERMS.map((t, i) => (
                <div key={t.title} style={{ display: "flex", gap: 15, alignItems: "flex-start", padding: "15px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                  <span className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined", fontSize: 20, color: "var(--accent-ink)", marginTop: 1, flexShrink: 0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 15, color: "var(--text)", letterSpacing: "-0.01em" }}>{t.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 3 }}>{t.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={activate} disabled={phase === "claiming"} style={{ ...primary, flex: 1, minWidth: 200, cursor: phase === "claiming" ? "wait" : "pointer" }}>
                {phase === "claiming" ? "Activating…" : "Activate free key"}
              </button>
              <button onClick={close} style={ghost}>Maybe later</button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14, fontFamily: F.mono, letterSpacing: "0.02em" }}>Add your own key anytime in Settings → API Keys.</p>
          </>
        ) : (
          <>
            <div style={{ ...kicker, color: "var(--green)" }}><span style={{ color: "var(--green)" }}>✓</span> FREE KEY ACTIVE</div>
            <h1 style={h1}>You're all set.</h1>
            <p style={sub}>{msg}</p>
            <div style={{ display: "flex", gap: 22, margin: "24px 0 28px", flexWrap: "wrap", alignItems: "center" }}>
              <Stat n={dailyCap} label="runs / day" />
              <div style={{ width: 1, height: 38, background: "var(--border)" }} />
              <Stat n={days} label="days" />
              <div style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Resets daily. Add your own key anytime to go unlimited.
              </div>
            </div>
            <button onClick={close} style={{ ...primary, width: "100%" }}>Start researching →</button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 28, color: "var(--text)" }}>{n}</span>
      <span style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
