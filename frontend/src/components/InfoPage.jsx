import { useState } from "react";
import Sidebar from "./Sidebar";
import SideRail from "./react-bits/SideRail";

const HELP_RAIL = [
  { label: "Overview", id: "info-header" },
  { label: "Free key", id: "info-free" },
  { label: "One key", id: "info-onekey" },
  { label: "Bring your own", id: "info-byok" },
  { label: "Troubleshooting", id: "info-trouble" },
];

// ============================================================================
// INFO / HELP PAGE - how to get an API key, claim a free starter key, and
// troubleshoot. Public (readable even when login is failing).
// ============================================================================

const C = {
  bg: "#0a0a1e", surface: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)",
  primary: "#e8eaf2", secondary: "#9aa3b5", muted: "#6b7386",
  cyan: "#00ccff", green: "#00e64d", amber: "#ffb020", purple: "#a855f7",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Material+Symbols+Outlined&display=swap');
  .info-root *{ box-sizing:border-box; }
  .info-root{ font-family:'Hanken Grotesk',sans-serif; }
  @keyframes infoUp{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .info-card{ animation:infoUp 0.35s cubic-bezier(0.2,0,0,1) both; }
  .info-link{ color:#00ccff; text-decoration:none; border-bottom:1px solid rgba(0,204,255,0.3); transition:border-color 0.15s; }
  .info-link:hover{ border-bottom-color:#00ccff; }
  .info-root a:focus-visible, .info-root button:focus-visible{ outline:2px solid #a855f7; outline-offset:2px; }
  @media (prefers-reduced-motion: reduce){ .info-root *{ animation:none!important; transition:none!important; } }
`;

const Icon = ({ name, style }) => (
  <span className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined", lineHeight: 1, ...style }}>{name}</span>
);

// What each kind of key actually powers in the pipeline
const KEY_ROLES = [
  { icon: "psychology", color: "#a855f7", title: "Your one LLM key — this is the only key you need",
    body: "One LLM key from any single provider (Anthropic, OpenAI, Google, Groq, NVIDIA, DeepSeek, Mistral or Zhipu/GLM) powers EVERYTHING — research, debates, the knowledge graph, PDF analysis, all of it. You do NOT need a separate key per feature and you do NOT need more than one. It reads every source, cross-examines them, scores confidence, and writes the cited report; in Debate mode it also runs both advocates and the judge. Pick whichever provider you like — that single key is the whole requirement." },
  { icon: "travel_explore", color: "#ffd700", title: "Tavily key — optional (web search is already included)",
    body: "You do NOT need this to start. POLYNOUS ships with built-in web search, so your one LLM key is enough to run real, cited research right away. Add your own Tavily key (1,000 free searches/month) only if you want higher search limits of your own." },
  { icon: "hub", color: "#00ccff", title: "Voyage key — optional (semantic memory)",
    body: "Also optional. Used only for embeddings that power Semantic Search and the memory features. The core research and debate flows work perfectly without it." },
];

// Inline free-key claim - loader → reveals a (placeholder) key, no navigation
function FreeKeyClaim() {
  const [state, setState] = useState("idle"); // idle | loading | done
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);

  const claim = () => {
    setState("loading");
    setTimeout(() => {
      const rand = Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
      setKey(`sk-polynous-free-${rand}`);
      setState("done");
    }, 1400);
  };
  const copy = () => { navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  if (state === "idle") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={claim} style={{ padding: "11px 24px", borderRadius: 9999, border: "none",
          background: "#00e64d", color: "#04140a", fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="key" style={{ fontSize: 16 }} /> Claim my free key
        </button>
        <span style={{ fontSize: 12.5, color: "#6b7386" }}>Instant · no card · one key runs everything · time-limited GLM trial</span>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(0,230,77,0.2)",
          borderTop: "2px solid #00e64d", animation: "infoSpin 0.8s linear infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: "#00e64d" }}>Generating your free key…</span>
        <style>{`@keyframes infoSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  return (
    <div className="info-card">
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#00e64d", marginBottom: 8 }}>
        Your free starter key
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#e8eaf2", background: "rgba(0,230,77,0.07)",
          border: "1px solid rgba(0,230,77,0.25)", borderRadius: 8, padding: "10px 14px", wordBreak: "break-all" }}>{key}</code>
        <button onClick={copy} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)",
          background: "transparent", color: "#e8eaf2", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5,
          display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={copied ? "check" : "content_copy"} style={{ fontSize: 14 }} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#6b7386", marginTop: 10, lineHeight: 1.55 }}>
        This single key runs <strong style={{ color: "#c8d2e0" }}>everything</strong> — research, debates, the graph — you don't need any others. It's a <strong style={{ color: "#c8d2e0" }}>time-limited trial on a lightweight GLM model</strong>; for stronger, more reliable results, add your own Claude / GPT / Gemini key in Settings → API Keys anytime.
      </p>
    </div>
  );
}

// One provider's "where to get a key" row
const PROVIDERS = [
  { name: "Anthropic (Claude)", url: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-…", free: "$5 free credit on signup", color: "#d97757" },
  { name: "OpenAI (GPT)", url: "https://platform.openai.com/api-keys", prefix: "sk-…", free: "Pay-as-you-go", color: "#10a37f" },
  { name: "Google (Gemini)", url: "https://aistudio.google.com/app/apikey", prefix: "AIza…", free: "Generous free tier", color: "#8ab4f8" },
  { name: "Mistral", url: "https://console.mistral.ai/api-keys", prefix: " - ", free: "Free tier available", color: "#f4a261" },
  { name: "Groq (fast, free)", url: "https://console.groq.com/keys", prefix: "gsk_…", free: "Free tier - great to start", color: "#ff6b6b" },
  { name: "NVIDIA NIM", url: "https://build.nvidia.com/", prefix: "nvapi-…", free: "Free credits - gpt-oss, Llama, DeepSeek", color: "#76b900" },
  { name: "DeepSeek", url: "https://platform.deepseek.com/api_keys", prefix: "sk-…", free: "Very low cost", color: "#4d6bff" },
  { name: "Tavily (web search)", url: "https://app.tavily.com/", prefix: "tvly-…", free: "1,000 free searches/mo", color: "#ffd700" },
];

const TROUBLESHOOTING = [
  { q: "The research engine or report won't open / stays blank", a: "First, refresh the page. If it's still stuck, log out and log back in - this reissues your session token. Most 'nothing happens' cases are an expired login." },
  { q: "Research starts but the answer is degraded or empty", a: "This almost always means your API key is missing, invalid, or out of credit. Open Settings → API Keys, click Test on your provider, and re-paste the key if it fails. Every research and debate run uses YOUR key." },
  { q: "\"No API key configured\" error", a: "You haven't added a key yet. Either claim your free starter key (Settings → API Keys) or paste your own from any provider below." },
  { q: "The page looks frozen mid-research", a: "Research makes several live calls and can take 20-60 seconds. Watch the Live Thought Stream - if lines are still appearing, it's working. If it's silent for over a minute, refresh and try again." },
  { q: "Knowledge Graph is empty", a: "The graph fills in as you run research - each session adds nodes. A brand-new account starts empty; run a few queries first." },
];

function Section({ icon, accent, title, subtitle, children, delay = 0, id }) {
  return (
    <div id={id} className="info-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${accent}`,
      borderRadius: 14, padding: "26px 30px", marginBottom: 20, animationDelay: `${delay}s`, scrollMarginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: subtitle ? 6 : 18 }}>
        <Icon name={icon} style={{ fontSize: 22, color: accent }} />
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: C.primary, margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.6, margin: "0 0 18px 33px" }}>{subtitle}</p>}
      <div style={{ marginLeft: 33 }}>{children}</div>
    </div>
  );
}

export default function InfoPage({ user, onNavigate, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 56 : 320;
  const go = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));

  return (
    <div className="info-root" style={{ minHeight: "100vh", background: C.bg, display: "flex" }}>
      <style>{styles}</style>
      <Sidebar
        onNavigate={go}
        user={user || { username: "Explorer" }}
        onLogout={() => (onLogout ? onLogout() : (localStorage.clear(), (window.location.href = "/")))}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main style={{ marginLeft: sidebarW, flex: 1, transition: "margin-left 0.25s cubic-bezier(0.2,0,0,1)",
        padding: "48px 56px", maxWidth: 980, width: "100%" }}>

        {/* Header */}
        <div id="info-header" className="info-card" style={{ marginBottom: 32, scrollMarginTop: 24 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.22em",
            textTransform: "uppercase", color: C.purple, marginBottom: 12 }}>Help &amp; Getting Started</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: "-0.025em", color: C.primary, margin: "0 0 12px" }}>
            How POLYNOUS works
          </h1>
          <p style={{ fontSize: 15, color: C.secondary, lineHeight: 1.7, maxWidth: 680, margin: 0 }}>
            POLYNOUS runs your questions through a multi-stage research pipeline that searches the live web,
            cross-examines sources, and writes a cited report with an honest, computed confidence score.
            Everything runs on <strong style={{ color: C.primary }}>your own API key</strong> - here's how to get one, or grab a free starter key.
          </p>
        </div>

        {/* Free starter key - claimed inline, no navigation */}
        <Section id="info-free" icon="redeem" accent={C.green} title="Every new user gets one free API key" delay={0.03}
          subtitle="Just signed up? Claim a free starter key so you can try POLYNOUS immediately - no card, no provider account needed.">
          <FreeKeyClaim />
        </Section>

        {/* What each key is used for */}
        <Section id="info-onekey" icon="help" accent={C.purple} title="You only need ONE API key — that's it" delay={0.05}
          subtitle="To be crystal clear: it's ONE key total — not two, not three. A single LLM key from any one provider below powers research, debates, the knowledge graph, PDF analysis — everything. You never need a separate key per feature. (Tavily and Voyage are optional extras, not requirements — web search is already built in.) POLYNOUS never charges you; it runs on the one key you provide, so the cost and rate limits stay yours.">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {KEY_ROLES.map(r => (
              <div key={r.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px",
                background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`, borderLeft: `3px solid ${r.color}`, borderRadius: 12 }}>
                <Icon name={r.icon} style={{ fontSize: 22, color: r.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, color: C.primary, marginBottom: 5 }}>{r.title}</div>
                  <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.65, margin: 0 }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Where to get keys */}
        <Section id="info-byok" icon="vpn_key" accent={C.cyan} title="Or bring your own API key" delay={0.06}
          subtitle="POLYNOUS supports several providers - pick any one. Groq and Google have the most generous free tiers if you're starting out. Paste your key in Settings → API Keys and hit Test.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {PROVIDERS.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none",
                display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`, transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = p.color + "66"}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, color: C.primary }}>{p.name}</span>
                  <Icon name="open_in_new" style={{ fontSize: 14, color: C.muted }} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: p.color }}>{p.prefix}</div>
                <div style={{ fontSize: 11.5, color: C.secondary }}>{p.free}</div>
              </a>
            ))}
          </div>
        </Section>

        {/* Troubleshooting */}
        <Section id="info-trouble" icon="build" accent={C.amber} title="Troubleshooting" delay={0.09}
          subtitle="The two fixes that solve most issues: refresh the page, and log out then log back in.">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {TROUBLESHOOTING.map((t, i) => (
              <details key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 0" }}>
                <summary style={{ cursor: "pointer", fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14,
                  color: C.primary, listStyle: "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="chevron_right" style={{ fontSize: 18, color: C.amber }} />
                  {t.q}
                </summary>
                <p style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.65, margin: "10px 0 2px 28px" }}>{t.a}</p>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()} style={{ padding: "9px 18px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: "transparent", color: C.primary, cursor: "pointer",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="refresh" style={{ fontSize: 15 }} /> Refresh page
            </button>
            <button onClick={() => (onLogout ? onLogout() : (localStorage.clear(), (window.location.href = "/")))}
              style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
              color: C.secondary, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
              display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="logout" style={{ fontSize: 15 }} /> Log out &amp; back in
            </button>
          </div>
        </Section>

        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 28 }}>
          Still stuck? Your keys are encrypted and never leave your account. Nothing you do here can break your data.
        </p>
      </main>

      <SideRail items={HELP_RAIL} />
    </div>
  );
}
