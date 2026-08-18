// Global Admin launcher — a small fixed pill that lets you (the owner) jump to
// the admin console from ANY page, without typing /admin. It only appears when
// your admin session / dev-preview is active, so regular clients never see it.
import React from "react";
import { usePreviewFlag } from "../devPreview";

export default function AdminLauncher() {
  const on = usePreviewFlag();
  if (!on) return null;
  const isAdminPage = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  if (isAdminPage) return null; // don't show it while already inside the console
  return (
    <button
      onClick={() => { window.location.href = "/admin"; }}
      title="Open the admin console"
      style={{
        position: "fixed", left: 18, bottom: 18, zIndex: 70,
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9999,
        cursor: "pointer", background: "rgba(11,9,20,0.82)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(168,85,247,0.4)", color: "#eae5f8",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
        boxShadow: "0 0 22px -6px rgba(168,85,247,0.5)",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#a855f7" }}>admin_panel_settings</span>
      Admin
    </button>
  );
}
