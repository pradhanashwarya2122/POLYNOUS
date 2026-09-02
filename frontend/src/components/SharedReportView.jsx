// SharedReportView — public, no-sign-in view of a shared report.
// Fetches the snapshot saved by Copy-link (/share/<id>) and renders it read-only,
// with a slim banner inviting the viewer to sign in and run their own research.
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import PolynousReport from "./PolynousReport";
import PolynousDebateReport from "./PolynousDebateReport";

const WRAP = { minHeight: "100vh", background: "#0a0a1e", color: "#c3d2e6", fontFamily: "'Hanken Grotesk',-apple-system,sans-serif" };
const CENTER = { ...WRAP, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, textAlign: "center", padding: 24 };

export default function SharedReportView({ kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(res.status === 404 ? "This shared report was not found or has expired." : "Could not load this shared report.");
        const json = await res.json();
        if (alive) setState({ loading: false, error: "", data: json });
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message || "Could not load this report.", data: null });
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (state.loading) return <div style={CENTER}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.14em", color: "#ff2040" }}>◆ POLYNOUS</div><div style={{ color: "#6c7a97" }}>Loading shared report…</div></div>;

  if (state.error) return (
    <div style={CENTER}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.14em", color: "#ff2040" }}>◆ POLYNOUS</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 26, color: "#f2f6fb" }}>Report unavailable</h1>
      <p style={{ maxWidth: 420, color: "#8899aa" }}>{state.error}</p>
      <button onClick={() => navigate("/")} style={btn}>Go to Polynous</button>
    </div>
  );

  const payload = (state.data && state.data.payload) || {};
  const isDebate = (state.data && state.data.kind) === "debate" || kind === "debate";

  return (
    <div style={WRAP}>
      <div style={banner}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", color: "#ff2040", fontWeight: 700 }}>◆ POLYNOUS · SHARED {isDebate ? "DEBATE" : "REPORT"}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "#8899aa", fontSize: 13 }}>You are viewing a shared report.</span>
        <button onClick={() => navigate("/")} style={ctaBtn}>Sign in to run your own →</button>
      </div>
      <div style={{ paddingTop: 8 }}>
        {isDebate
          ? <PolynousDebateReport result={payload.result} activeTopic={payload.activeTopic || payload.topic} showRail={false} />
          : <PolynousReport {...payload} />}
      </div>
    </div>
  );
}

const banner = { position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 22px", background: "rgba(10,10,30,0.86)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(200,216,234,0.1)" };
const btn = { padding: "10px 20px", borderRadius: 9999, border: "1px solid rgba(255,32,64,0.4)", background: "rgba(255,32,64,0.08)", color: "#ff2040", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 };
const ctaBtn = { padding: "8px 16px", borderRadius: 9999, border: "none", background: "#ff2040", color: "#0a0a1e", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700 };
