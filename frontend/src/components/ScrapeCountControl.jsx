import { useState } from "react";
import { apiFetch } from "../config";

// User-selectable number of web sources to scrape per run. Stored in
// localStorage ("polynous_scrape_count") which the Research/Debate engines read
// when they build their request body. In the Settings variant it ALSO persists
// to the account (PUT /settings/preferences { scrape_count }) so it becomes the
// remembered default across devices. 0 / "Auto" means "let the system decide".
const OPTIONS = [0, 3, 5, 8, 10, 12, 15, 20];
const label = (n) => (n ? String(n) : "Auto");

export default function ScrapeCountControl({ accent = "#00ff47", persist = false, compact = false }) {
  const [value, setValue] = useState(() => Number(localStorage.getItem("polynous_scrape_count")) || 0);
  const [saved, setSaved] = useState(false);

  const apply = async (n) => {
    setValue(n);
    if (n) localStorage.setItem("polynous_scrape_count", String(n));
    else localStorage.removeItem("polynous_scrape_count");
    if (persist) {
      try {
        await apiFetch("/settings/preferences", { method: "PUT", body: JSON.stringify({ scrape_count: n || null }) });
        setSaved(true); setTimeout(() => setSaved(false), 2000);
      } catch { /* non-fatal - localStorage still applies to this device */ }
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12, flexWrap: "wrap" }}>
      {!compact && (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(212,228,250,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: accent }}>travel_explore</span>
          Sources to scrape
        </span>
      )}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {OPTIONS.map((n) => {
          const active = value === n;
          return (
            <button key={n} onClick={() => apply(n)} title={n ? `${n} sources` : "Let the system choose"}
              style={{
                minWidth: 34, padding: compact ? "5px 9px" : "6px 11px", borderRadius: 8, cursor: "pointer",
                fontFamily: "'JetBrains Mono',monospace", fontSize: compact ? 11 : 12, fontWeight: 700,
                background: active ? `${accent}1f` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
                color: active ? accent : "rgba(212,228,250,0.75)", transition: "all 0.18s",
              }}>
              {label(n)}
            </button>
          );
        })}
      </div>
      {persist && saved && (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: accent }}>✓ saved as default</span>
      )}
      {compact && (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "rgba(212,228,250,0.45)" }}>sources</span>
      )}
    </div>
  );
}
