import { useState, useEffect } from "react";

const LABELS = {
  anthropic: "Anthropic", openai: "OpenAI", google: "Gemini",
  mistral: "Mistral", groq: "Groq", nvidia: "NVIDIA", deepseek: "DeepSeek",
};

/* Shows the user's chosen AI (provider · model) consistently across every
   page's sidebar. Reads shared localStorage set by Settings and live-updates
   via the "polynous:model-changed" event and cross-tab "storage" events. */
export default function ActiveModelBadge({ compact = false, style }) {
  const read = () => ({
    provider: localStorage.getItem("polynous_active_provider") || "",
    model: localStorage.getItem("polynous_active_model") || "",
  });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener("polynous:model-changed", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("polynous:model-changed", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  if (!v.provider && !v.model) return null;
  const label = LABELS[v.provider] || v.provider || "AI";
  const title = `Active AI: ${label}${v.model ? ` · ${v.model}` : ""}`;

  if (compact) {
    return (
      <div title={title} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: "rgba(0,255,15,0.06)", border: "1px solid rgba(0,255,15,0.2)", ...style }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00ff0f" }}>smart_toy</span>
      </div>
    );
  }
  return (
    <div title={title} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 11, background: "rgba(0,255,15,0.05)", border: "1px solid rgba(0,255,15,0.18)", ...style }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00ff0f", flexShrink: 0 }}>smart_toy</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: "0.12em", color: "rgba(150,170,190,0.6)", textTransform: "uppercase" }}>Active AI</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 11.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>
          {label}{v.model ? ` · ${v.model}` : ""}
        </div>
      </div>
    </div>
  );
}
