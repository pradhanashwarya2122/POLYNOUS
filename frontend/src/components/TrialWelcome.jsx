import { useState, useEffect } from "react";
import { API_BASE_URL, getAuthToken } from "../config";

/*
  TrialWelcome, premium, one-time after-signup announcement of the free GLM
  trial key. States the deal plainly and honestly: free lightweight model,
  expires after 15 queries OR 7 days (whichever first), add your own key for
  stronger results. Design per the skills: near-navy paper, ONE green accent,
  Bricolage display type, hairline rules, generous whitespace, no glowing boxes.
*/

const C = {
  ink: "#0a0a1e", panel: "#0e1434", line: "rgba(200,216,234,0.12)", line2: "rgba(200,216,234,0.07)",
  tx: "#c3d2e6", dim: "#6c7a97", hi: "#f2f6fb", acc: "#3ef07f", warn: "#ffb64a",
  serif: "'Bricolage Grotesque','Sora',sans-serif", sans: "'Hanken Grotesk',-apple-system,sans-serif", mono: "'JetBrains Mono',monospace",
};

const TERMS = [
  { icon: "bolt", tone: C.acc, title: "One key runs everything", body: "Research, debates, the graph, PDF analysis, all of it. You never need a second key." },
  { icon: "hourglass_top", tone: C.warn, title: "It's a time-limited trial", body: "Expires after 15 queries or 7 days, whichever comes first." },
  { icon: "auto_awesome", tone: C.dim, title: "It's a lightweight model", body: "Great for a first look. Stronger providers (Claude, GPT, Gemini) give noticeably better results." },
];

export default function TrialWelcome({ user, onClose }) {
  const [phase, setPhase] = useState("intro"); // intro | claiming | done | skip
  const [msg, setMsg] = useState("");
  const [trial, setTrial] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 20); return () => clearTimeout(t); }, []);

  const close = () => { setMounted(false); setTimeout(() => onClose && onClose(), 320); };

  const activate = async () => {
    setPhase("claiming");
    try {
      const tok = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/settings/api-keys/free-key/claim`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
      });
      const data = res.ok ? await res.json() : {};
      if (res.ok) { setTrial(data.trial || null); setMsg(data.message || "Your free trial key is active."); setPhase("done"); }
      else if (res.status === 400) { setMsg("You already have a key set up, you're good to go."); setPhase("done"); }
      else { setMsg("Couldn't activate automatically, you can claim it anytime in Settings, API Keys."); setPhase("done"); }
    } catch {
      setMsg("Couldn't reach the server, you can claim your free key in Settings, API Keys."); setPhase("done");
    }
  };

  const scrim = {
    position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px", background: "rgba(2,4,14,0.66)", backdropFilter: "blur(6px)",
    opacity: mounted ? 1 : 0, transition: "opacity .32s ease",
  };
  const card = {
    position: "relative", width: "100%", maxWidth: 540, background: `linear-gradient(180deg, ${C.panel} 0%, ${C.ink} 68%)`,
    border: `1px solid rgba(0,255,71,0.18)`, borderRadius: 20, padding: "40px 40px 32px",
    boxShadow: "0 40px 120px -40px rgba(0,0,10,0.95)", fontFamily: C.sans, color: C.tx,
    transform: mounted ? "none" : "translateY(18px) scale(0.985)", transition: "transform .42s cubic-bezier(.16,1,.3,1)",
    maxHeight: "92vh", overflowY: "auto",
  };
  const kicker = { fontFamily: C.mono, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: C.acc, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 };
  const h1 = { fontFamily: C.serif, fontWeight: 700, fontSize: "clamp(1.7rem,4vw,2.3rem)", lineHeight: 1.05, letterSpacing: "-0.025em", color: C.hi, margin: 0 };
  const sub = { fontSize: 15, lineHeight: 1.6, color: C.tx, margin: "14px 0 0", maxWidth: "46ch" };

  return (
    <div style={scrim} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div style={card} role="dialog" aria-modal="true" aria-label="Free trial">
        <button onClick={close} aria-label="Close" style={{ position: "absolute", top: 18, right: 18, width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.04)", color: C.dim, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>

        {phase !== "done" && (
          <>
            <div style={kicker}><span style={{ color: C.acc }}>◆</span> POLYNOUS · WELCOME{user?.username ? `, ${user.username.toUpperCase()}` : ""}</div>
            <h1 style={h1}>Your free trial<br />is ready.</h1>
            <p style={sub}>We've set aside a free starter key so you can see POLYNOUS work right now, no card, no setup. Here's the deal, in plain terms:</p>

            <div style={{ margin: "28px 0 30px", display: "flex", flexDirection: "column", gap: 2 }}>
              {TERMS.map((t, i) => (
                <div key={t.title} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line2}` }}>
                  <span className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined", fontSize: 22, color: t.tone, marginTop: 1, flexShrink: 0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontFamily: C.serif, fontWeight: 600, fontSize: 15.5, color: C.hi, letterSpacing: "-0.01em" }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, marginTop: 3 }}>{t.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={activate} disabled={phase === "claiming"} style={{ flex: 1, minWidth: 200, padding: "14px 22px", borderRadius: 12, border: "none", background: C.acc, color: "#04120b", fontFamily: C.sans, fontSize: 14.5, fontWeight: 700, cursor: phase === "claiming" ? "wait" : "pointer", transition: "filter .2s ease, transform .14s ease" }}>
                {phase === "claiming" ? "Activating…" : "Activate my free trial"}
              </button>
              <button onClick={close} style={{ padding: "14px 20px", borderRadius: 12, border: `1px solid ${C.line}`, background: "transparent", color: C.tx, fontFamily: C.sans, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Maybe later
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: C.dim, marginTop: 16, fontFamily: C.mono, letterSpacing: "0.02em" }}>You can add your own key anytime in Settings, API Keys.</p>
          </>
        )}

        {phase === "done" && (
          <>
            <div style={kicker}><span style={{ color: C.acc }}>◆</span> TRIAL ACTIVE</div>
            <h1 style={h1}>You're all set.</h1>
            <p style={sub}>{msg}</p>
            <div style={{ display: "flex", gap: 20, margin: "26px 0 30px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: C.serif, fontWeight: 700, fontSize: 30, color: C.hi }}>{trial && trial.runs_cap ? trial.runs_cap : 15}</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim }}>queries</span>
              </div>
              <div style={{ width: 1, background: C.line2 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: C.serif, fontWeight: 700, fontSize: 30, color: C.hi }}>{trial && trial.days_left != null ? trial.days_left : 7}</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim }}>days</span>
              </div>
              <div style={{ flex: 1, minWidth: 160, alignSelf: "center", fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>
                whichever comes first. Then add your own key to keep going.
              </div>
            </div>
            <button onClick={close} style={{ width: "100%", padding: "14px 22px", borderRadius: 12, border: "none", background: C.acc, color: "#04120b", fontFamily: C.sans, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              Start researching →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
