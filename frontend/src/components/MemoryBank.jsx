import { API_BASE_URL } from '../config';
import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const C = {
  void:        "#0a0a1e",
  surface:     "rgba(255,255,255,0.03)",
  raised:      "rgba(255,255,255,0.05)",
  border:      "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  text:        "#e8eaf2",
  sub:         "#9aa3b5",
  muted:       "#6b7386",
  accent:      "#ffa94d",
  good:        "#4ade80",
  warn:        "#fbbf24",
  bad:         "#f87171",
  fontDisplay: "'Sora',sans-serif",
  fontMono:    "'JetBrains Mono',monospace",
  fontBody:    "'Hanken Grotesk',sans-serif",
};

const label11 = {
  fontFamily: C.fontMono, fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.08em",
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES + FONTS
───────────────────────────────────────────── */
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600&family=Material+Symbols+Outlined&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #0a0a1e; color: #e8eaf2; font-family: 'Hanken Grotesk', sans-serif; overflow-x: hidden; }

      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #0a0a1e; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 3px; }

      @keyframes spin   { to { transform: rotate(360deg); } }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

      .reveal-once { animation: fadeUp 250ms cubic-bezier(0.2,0,0,1) both; }

      button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
        outline: 2px solid ${"#ffa94d"};
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}

/* ─────────────────────────────────────────────
   MATERIAL SYMBOL ICON
───────────────────────────────────────────── */
function Icon({ name, style: s }) {
  return (
    <span aria-hidden="true" style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block",
      ...(s || {})
    }}>{name}</span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION ITEMS
═══════════════════════════════════════════════════════════════ */
const NAV = [
  { icon: "travel_explore",  label: "Research",        path: "/research" },
  { icon: "forum",           label: "Debate Chamber",  path: "/debate"   },
  { icon: "account_tree",    label: "Knowledge Graph", path: "/graph"    },
  { icon: "search",          label: "Semantic Search", path: "/search"   },
  { icon: "database",        label: "Memory Bank",     path: "/memory",  active: true  },
  { icon: "picture_as_pdf",  label: "PDF Lab",         path: "/pdf-lab"  },
  { icon: "monitoring",      label: "Analytics",       path: "/analytics"},
  { icon: "settings",        label: "Settings",        path: "/settings" },
];

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════════ */
function Sidebar({ onNavigate, user, onLogout, collapsed, setCollapsed }) {
  const go  = (p) => (onNavigate ? onNavigate(p) : (window.location.href = p));
  const bye = () =>
    onLogout
      ? onLogout()
      : (localStorage.clear(), (window.location.href = "/"));

  // ── Collapsed state ─────────────────────────────────────────
  if (collapsed)
    return (
      <aside
        style={{
          position: "fixed", left: 0, top: 0, height: "100%", width: 56,
          background: "rgba(10,10,30,0.9)",
          backdropFilter: "blur(24px)",
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "16px 0", zIndex: 30,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", marginBottom: 32 }}
        >
          <Icon name="chevron_right" style={{ fontSize: 22 }} />
        </button>

        {NAV.map(({ icon, label, path, active }) => (
          <button
            key={label}
            onClick={() => go(path)}
            title={label}
            aria-label={label}
            style={{
              padding: "12px 0", cursor: "pointer", border: "none", background: "none",
              color: active ? C.accent : C.sub,
              width: "100%", display: "flex", justifyContent: "center",
              transition: "color 150ms",
            }}
          >
            <Icon name={icon} style={{ fontSize: 20, color: "inherit" }} />
          </button>
        ))}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => go("/research")}
            aria-label="New research"
            style={{
              width: 34, height: 34, borderRadius: "50%", background: C.accent, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <Icon name="add" style={{ fontSize: 16, color: C.void }} />
          </button>
          <div
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.raised, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="face" style={{ color: C.sub, fontSize: 14 }} />
          </div>
          <button onClick={bye} aria-label="Log out" style={{ cursor: "pointer", color: C.bad, background: "none", border: "none" }}>
            <Icon name="logout" style={{ fontSize: 14 }} />
          </button>
        </div>
      </aside>
    );

  // ── Expanded state ──────────────────────────────────────────
  return (
    <aside
      style={{
        position: "fixed", left: 0, top: 0, height: "100%", width: 320,
        background: "rgba(10,10,30,0.9)",
        backdropFilter: "blur(24px)",
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        padding: 24, zIndex: 30, overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1
            style={{
              fontFamily: C.fontDisplay, fontSize: 24, fontWeight: 700,
              color: C.text, letterSpacing: "-0.02em", whiteSpace: "nowrap",
            }}
          >
            POLYNOUS
          </h1>
          <p style={{ ...label11, fontSize: 10, color: C.muted }}>
            Cerebral Vitality Engine
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 4, marginLeft: 8 }}
        >
          <Icon name="chevron_left" style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
        {NAV.map(({ icon, label, path, active }) => (
          <button
            key={label}
            onClick={() => go(path)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", borderRadius: 6, cursor: "pointer",
              color: active ? C.accent : C.sub,
              background: active ? "rgba(255,169,77,0.08)" : "transparent",
              border: "none", textAlign: "left",
              fontFamily: C.fontBody, fontSize: 14,
              fontWeight: active ? 600 : 400,
              transition: "background 150ms, color 150ms",
              whiteSpace: "nowrap", overflow: "hidden", width: "100%",
            }}
            onMouseEnter={(e) => {
              if (!active) { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.raised; }
            }}
            onMouseLeave={(e) => {
              if (!active) { e.currentTarget.style.color = C.sub; e.currentTarget.style.background = "transparent"; }
            }}
          >
            <Icon name={icon} style={{ fontSize: 20, color: "inherit", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginTop: 24 }}>
        <button
          onClick={() => go("/research")}
          style={{
            width: "100%", padding: 12,
            background: C.accent, color: C.void, fontWeight: 700,
            borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: C.fontDisplay, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Icon name="add" style={{ fontSize: 18, color: C.void }} /> New Research
        </button>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: C.raised, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Icon name="face" style={{ color: C.sub, fontSize: 22 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: C.fontBody, fontSize: 14, fontWeight: 600, color: C.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {user?.username || "Guest"}
            </p>
            <button
              onClick={bye}
              style={{
                fontSize: 11, color: C.bad, background: "none", border: "none",
                cursor: "pointer", fontFamily: C.fontMono, padding: 0,
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

/* ─────────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────────── */
function MetricCard({ value, label, delay = 0 }) {
  return (
    <div className="reveal-once"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 24,
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center", minHeight: 112,
        animationDelay: `${delay}ms`,
        transition: "border-color 150ms",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ fontFamily: C.fontDisplay, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ ...label11, color: C.sub, marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUGGESTION DATA
───────────────────────────────────────────── */
const RESEARCH_PATHS    = ["Deep Learning Neural Architectures","Quantum Machine Learning","CRISPR Gene Editing","Blockchain Consensus","Fusion Energy Breakthroughs","Autonomous Vehicle Safety","Synthetic Biology Ethics","Neuromorphic Computing"];
const NEW_DOMAINS       = ["Space Colonization Ethics","Ocean Floor Mining","Quantum Biology Frontiers","Atmospheric Carbon Capture","Brain-Computer Interfaces","Lab-Grown Meat Production","Asteroid Mining Economics","Digital Consciousness"];
const DEBATE_CHALLENGES = ["Should AI be regulated globally?","Is nuclear energy the solution?","Should we colonize Mars?","Are cryptocurrencies the future?","Should genetic engineering be allowed?","Is UBI economically viable?"];

const shuffle = arr => { const s=[...arr]; for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} return s; };

const getRandomSuggestions = () => {
  const r = shuffle(RESEARCH_PATHS);
  const d = shuffle(NEW_DOMAINS);
  const db= shuffle(DEBATE_CHALLENGES);
  return [
    { type:"Research Path",   topic:r[0],  color: C.accent, mode:"research", desc:"A topic you might want to explore further." },
    { type:"New Domain",      topic:d[0],  color: C.good,   mode:"research", desc:"An area outside your recent research." },
    { type:"Debate Challenge",topic:db[0], color: C.bad,    mode:"debate",   desc:"An open question to argue both sides of." },
  ];
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function MemoryBank({ user, onNavigate, onLogout }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState(null);
  const [stats,       setStats]       = useState(null);
  const [interests,   setInterests]   = useState([]);
  const [history,     setHistory]     = useState([]);
  const [debates,     setDebates]     = useState([]);
  const [suggestions, setSuggestions] = useState(getRandomSuggestions());
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("All Activity");

  /* rotate suggestions every 5 s */
  useEffect(() => {
    const t = setInterval(() => setSuggestions(getRandomSuggestions()), 5000);
    return () => clearInterval(t);
  }, []);

  const handleTopicClick = (topic, mode) => {
    const dest = mode === "debate"
      ? `/debate?topic=${encodeURIComponent(topic)}`
      : `/research?query=${encodeURIComponent(topic)}`;
    onNavigate ? onNavigate(dest) : (window.location.href = dest);
  };

  /* ── API calls ── */
  const fetchAllData = useCallback(async () => {
  setLoading(true);
  try {
    const accessToken = localStorage.getItem('polynous_token');

    if (!accessToken) {
      console.warn('No auth token found — memory data will be empty');
      setStats({ total_research: 0, total_debates: 0, avg_confidence: 0, unique_topics: 0 });
      setInterests([]);
      setHistory([]);
      setDebates([]);
      setLoading(false);
      return;
    }

    const base = API_BASE_URL || 'http://localhost:8000';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const [statsRes, interestsRes, historyRes, debatesRes] = await Promise.all([
      fetch(`${base}/memory/stats`, { headers }),
      fetch(`${base}/memory/interests`, { headers }),
      fetch(`${base}/memory/history`, { headers }),
      fetch(`${base}/memory/debates`, { headers })
    ]);

    let statsData = { total_research: 0, total_debates: 0, avg_confidence: 0, unique_topics: 0 };
    let interestsData = { interests: [] };
    let historyData = { history: [] };
    let debatesData = { debates: [] };

    if (statsRes.ok) {
      try { statsData = await statsRes.json(); } catch(e) { console.error('Stats parse error:', e); }
    } else {
      console.warn('Stats endpoint returned:', statsRes.status);
    }

    if (interestsRes.ok) {
      try { interestsData = await interestsRes.json(); } catch(e) { console.error('Interests parse error:', e); }
    }

    if (historyRes.ok) {
      try { historyData = await historyRes.json(); } catch(e) { console.error('History parse error:', e); }
    }

    if (debatesRes.ok) {
      try { debatesData = await debatesRes.json(); } catch(e) { console.error('Debates parse error:', e); }
    }

    setStats(statsData);
    setInterests(interestsData.interests || []);
    setHistory(historyData.history || []);
    setDebates(debatesData.debates || []);
  } catch(e) {
    console.error('Memory load error:', e);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await fetchAllData();
      setSyncMsg("Memory synced successfully.");
    } catch(_) {
      setSyncMsg("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  /* ── Grouped timeline ── */
  const groupedHistory = useCallback(() => {
    const g = {};
    history.forEach(h => {
      const d = h.timestamp
        ? new Date(h.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : "Unknown";
      if (!g[d]) g[d] = [];
      g[d].push({ ...h, kind:"research", query:h.query||"Untitled", mode:h.mode||"research", confidence:h.confidence||0 });
    });
    debates.forEach(d => {
      const date = d.timestamp
        ? new Date(d.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
        : "Unknown";
      if (!g[date]) g[date] = [];
      g[date].push({ query:d.topic||"Untitled Debate", mode:"debate",
                     confidence:Math.max(d.for_score||0, d.against_score||0)*10,
                     kind:"debate", debateData:d, timestamp:d.timestamp });
    });
    return g;
  }, [history, debates]);

  const getConfColor = v => v >= 80 ? C.good : v >= 60 ? C.warn : C.bad;

  const sidebarW = collapsed ? 56 : 320;
  const grouped  = groupedHistory();
  const TABS     = ["All Activity","Research","Debates"];

  const filteredGrouped = () => {
    if (activeTab === "All Activity") return grouped;
    if (activeTab === "Research") {
      const g = {};
      Object.entries(grouped).forEach(([d, items]) => {
        const f = items.filter(i => i.kind === "research");
        if (f.length) g[d] = f;
      });
      return g;
    }
    return {};
  };

  return (
    <div style={{ minHeight:"100vh", background: C.void, color: C.text, fontFamily: C.fontBody, overflowX:"hidden" }}>
      <Styles />

      <Sidebar
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main style={{
        marginLeft: sidebarW,
        transition:"margin-left 250ms cubic-bezier(0.2,0,0,1)",
        position:"relative", zIndex:10,
      }}>

        {/* ══ PAGE HEADER ══ */}
        <section className="reveal-once" style={{
          padding:"48px 32px 32px",
          display:"flex", justifyContent:"space-between", alignItems:"flex-end",
          maxWidth:1200, margin:"0 auto", gap:24, flexWrap:"wrap",
        }}>
          <div>
            <h1 style={{ fontFamily: C.fontDisplay, fontSize:32, fontWeight:700,
                         color: C.text, letterSpacing:"-0.02em", lineHeight:1.1 }}>
              Memory Bank
            </h1>
            <p style={{ fontFamily: C.fontBody, fontSize:14, color: C.sub, marginTop:8 }}>
              Your research history — stored, connected, never forgotten.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display:"flex", alignItems:"center", gap:8,
              background: C.raised,
              border:`1px solid ${C.border}`,
              padding:"8px 16px", borderRadius:6,
              color: C.text, fontFamily: C.fontMono, fontSize:12, fontWeight:600,
              cursor: syncing ? "not-allowed" : "pointer",
              opacity: syncing ? 0.7 : 1,
              transition:"border-color 150ms",
              flexShrink:0,
            }}
            onMouseEnter={e => { if(!syncing) e.currentTarget.style.borderColor = C.borderHover; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <Icon name="sync" style={{ fontSize:16, animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </section>

        {/* ══ PAGE BODY ══ */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 32px 48px" }}>

          {loading && !stats && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
                          minHeight:320, flexDirection:"column", gap:16 }}>
              <div style={{ width:40, height:40, border:`3px solid ${C.border}`,
                            borderTop:`3px solid ${C.accent}`, borderRadius:"50%",
                            animation:"spin 1s linear infinite" }} />
              <p style={{ color: C.sub, fontFamily: C.fontBody, fontSize:14 }}>
                Loading your memory…
              </p>
            </div>
          )}

          {/* ── METRIC CARDS ── */}
          {stats && (
            <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:32 }}>
              <MetricCard value={stats.total_research || 0} label="Research Sessions" delay={0}   />
              <MetricCard value={stats.total_debates   || 0} label="Debates"          delay={60}  />
              <MetricCard value={stats.unique_topics   || 0} label="Unique Topics"    delay={120} />
              <MetricCard value={`${stats.avg_confidence || 0}%`} label="Avg Confidence" delay={180} />
            </section>
          )}

          {/* ── ACTIVE CLUSTERS ── */}
          {interests.length > 0 && (
            <section className="reveal-once" style={{ marginBottom:32 }}>
              <h3 style={{ fontFamily: C.fontDisplay, fontSize:17, fontWeight:700,
                           color: C.text, marginBottom:12 }}>
                Research Interests
              </h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {interests.slice(0,12).map((int, i) => (
                  <button
                    key={i}
                    onClick={() => handleTopicClick(int.topic, "research")}
                    title={`${int.topic} — interest strength ${int.strength}`}
                    style={{
                      padding:"8px 12px", borderRadius:6,
                      border:`1px solid ${C.border}`,
                      background: C.surface,
                      color: C.text, fontFamily: C.fontBody, fontSize:13,
                      cursor:"pointer", transition:"border-color 150ms, background 150ms",
                      display:"flex", alignItems:"center", gap:8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.raised; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
                  >
                    {int.topic}
                    <span style={{ fontFamily: C.fontMono, fontSize:11, fontWeight:600, color: C.accent }}>+{int.strength}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── TABS ── */}
          <div className="reveal-once"
            style={{ display:"inline-flex", border:`1px solid ${C.border}`,
                     borderRadius:6, overflow:"hidden", marginBottom:24, background: C.surface }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding:"8px 16px", border:"none", cursor:"pointer",
                  ...label11,
                  background: activeTab === tab ? C.raised : "transparent",
                  color:      activeTab === tab ? C.text   : C.sub,
                  transition:"background 150ms, color 150ms",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── ACTIVITY FEED / TIMELINE ── */}
          {(activeTab === "All Activity" || activeTab === "Research") && (
            <section style={{ marginBottom:32 }}>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:12,
                            background: C.surface, overflow:"hidden" }}>
                {Object.entries(filteredGrouped()).length > 0 ? (
                  Object.entries(filteredGrouped()).map(([date, items]) => (
                    <div key={date}>
                      <div style={{ display:"flex", alignItems:"center", gap:12,
                                    padding:"8px 16px", borderBottom:`1px solid ${C.border}`,
                                    background: C.raised }}>
                        <span style={{ ...label11, fontSize:10, color: C.muted, whiteSpace:"nowrap" }}>
                          {date}
                        </span>
                      </div>
                      {items.map((item, i) => {
                        const isDebate    = item.kind === "debate";
                        const dotColor    = isDebate ? C.bad : getConfColor(item.confidence);
                        const badgeText   = isDebate
                          ? (item.debateData ? `${item.debateData.for_score}/${item.debateData.against_score}` : "DEBATE")
                          : `${item.confidence}%`;
                        const badgeTitle  = isDebate
                          ? "Debate score — for / against"
                          : `Answer confidence: ${item.confidence}%`;
                        const isLast = i === items.length - 1;
                        return (
                          <div
                            key={i}
                            className="reveal-once"
                            onClick={() => handleTopicClick(item.query, item.mode || "research")}
                            style={{
                              padding:"16px 24px",
                              borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              cursor:"pointer", transition:"background 150ms",
                              animationDelay:`${Math.min(i,5) * 60}ms`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.raised}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                              <div title={badgeTitle}
                                   style={{ marginTop:5, width:8, height:8, borderRadius:"50%",
                                            background: dotColor, flexShrink:0 }} />
                              <div>
                                <h4 style={{ fontFamily: C.fontBody, fontSize:14, fontWeight:600,
                                             color: C.text, marginBottom:8 }}>
                                  {item.query}
                                </h4>
                                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                  <span style={{ padding:"3px 8px", background: C.raised,
                                                 color: C.sub, ...label11, fontSize:10,
                                                 borderRadius:6 }}>
                                    {item.mode || "research"}
                                  </span>
                                  {item.topics?.filter(t=>t).slice(0,3).map((t,j)=>(
                                    <span key={j}
                                      onClick={e=>{e.stopPropagation(); handleTopicClick(t,"research");}}
                                      style={{ padding:"3px 8px", background: C.raised,
                                               color: C.sub, ...label11, fontSize:10,
                                               borderRadius:6, cursor:"pointer" }}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
                              <span title={badgeTitle}
                                    style={{ fontFamily: C.fontMono, fontSize:13,
                                             fontWeight:600, color: dotColor,
                                             fontVariantNumeric:"tabular-nums" }}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  !loading && (
                    <div style={{ textAlign:"center", padding:"48px 24px", color: C.sub,
                                  fontFamily: C.fontBody, fontSize:14 }}>
                      No research sessions yet — start asking questions.
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* ── DEBATES TAB ── */}
          {(activeTab === "All Activity" || activeTab === "Debates") && debates.length > 0 && (
            <section style={{ marginBottom:32 }}>
              {activeTab === "Debates" && (
                <h3 style={{ fontFamily: C.fontDisplay, fontSize:17, fontWeight:700,
                             color: C.text, marginBottom:16 }}>
                  Debate History
                </h3>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {debates.map((d, i) => (
                  <div key={i} className="reveal-once"
                    onClick={() => handleTopicClick(d.topic, "debate")}
                    style={{
                      background: C.surface,
                      border:`1px solid ${C.border}`, borderRadius:12, padding:24,
                      cursor:"pointer", transition:"background 150ms, border-color 150ms",
                      animationDelay:`${Math.min(i,5)*60}ms`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.raised; e.currentTarget.style.borderColor = C.borderHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
                  >
                    <h4 style={{ fontFamily: C.fontBody, fontSize:14, fontWeight:600,
                                 color: C.text, marginBottom:12 }}>
                      {d.topic}
                    </h4>
                    <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                      <div style={{ flex:1 }} title={`FOR argued at ${d.for_score}/10`}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                      ...label11, fontSize:10, marginBottom:4 }}>
                          <span style={{ color: C.good }}>FOR</span>
                          <span style={{ color: C.good, fontVariantNumeric:"tabular-nums" }}>{d.for_score}/10</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background: C.raised }}>
                          <div style={{ width:`${(d.for_score||0)*10}%`, height:"100%",
                                        borderRadius:2, background: C.good }} />
                        </div>
                      </div>
                      <div style={{ flex:1 }} title={`AGAINST argued at ${d.against_score}/10`}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                      ...label11, fontSize:10, marginBottom:4 }}>
                          <span style={{ color: C.bad }}>AGAINST</span>
                          <span style={{ color: C.bad, fontVariantNumeric:"tabular-nums" }}>{d.against_score}/10</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background: C.raised }}>
                          <div style={{ width:`${(d.against_score||0)*10}%`, height:"100%",
                                        borderRadius:2, background: C.bad }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ ...label11, fontSize:10,
                                  color: d.winner==="FOR" ? C.good : d.winner==="AGAINST" ? C.bad : C.sub }}>
                      Winner: {d.winner || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Debates empty state */}
          {(activeTab === "All Activity" || activeTab === "Debates") && debates.length === 0 && !loading && (
            <div style={{ textAlign:"center", padding:"32px 24px", color: C.sub,
                          fontFamily: C.fontBody, fontSize:14, marginBottom:32 }}>
              No debates yet — start a debate to see your history.
            </div>
          )}

          {/* ── SUGGESTED TOPICS ── */}
          <section className="reveal-once" style={{ paddingBottom:32 }}>
            <h3 style={{ fontFamily: C.fontDisplay, fontSize:17, fontWeight:700,
                         color: C.text, marginBottom:16 }}>
              Suggested Topics
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {suggestions.map((s, i) => (
                <div
                  key={`${s.topic}-${i}`}
                  onClick={() => handleTopicClick(s.topic, s.mode)}
                  style={{
                    background: C.surface,
                    border:`1px solid ${C.border}`,
                    borderLeft:`3px solid ${s.color}`,
                    borderRadius:12, padding:"16px 24px", cursor:"pointer",
                    transition:"background 150ms, border-color 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.raised; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.surface; }}
                >
                  <div style={{ ...label11, fontSize:10, color: s.color, marginBottom:4 }}>
                    {s.type}
                  </div>
                  <h4 style={{ fontFamily: C.fontBody, fontSize:14, fontWeight:600,
                               color: C.text, margin:"0 0 4px" }}>
                    {s.topic}
                  </h4>
                  <p style={{ fontFamily: C.fontBody, fontSize:13, color: C.sub, margin:0 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>{/* end body */}
      </main>

      {/* ── SYNC TOAST ── */}
      {syncMsg && (
        <div className="reveal-once" style={{
          position:"fixed", bottom:32, right:32, zIndex:100,
          background:"rgba(10,10,30,0.95)",
          border:`1px solid ${syncMsg.includes("failed") ? C.bad : C.border}`,
          borderRadius:12, padding:"12px 24px",
          fontFamily: C.fontBody, fontSize:14,
          color: syncMsg.includes("failed") ? C.bad : C.text,
        }}>
          {syncMsg}
        </div>
      )}
    </div>
  );
}
