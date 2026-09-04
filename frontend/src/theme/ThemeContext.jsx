// POLYNOUS theme system — persisted, system-aware light/dark, applied as
// document.documentElement.dataset.theme so the CSS var layer (theme.css) flips.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const KEY = "polynous_theme";
const ThemeContext = createContext({ theme: "dark", toggle: () => {}, setTheme: () => {} });

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch (_) {}
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  } catch (_) {}
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [explicit, setExplicit] = useState(() => {
    try { return localStorage.getItem(KEY) != null; } catch (_) { return false; }
  });

  // Reflect onto <html> so theme.css and every var() consumer update.
  useEffect(() => {
    try { document.documentElement.dataset.theme = theme; } catch (_) {}
    try { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", theme === "light" ? "#f5f6f9" : "#0a0a1e"); } catch (_) {}
  }, [theme]);

  // Follow the OS until the user makes an explicit choice.
  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = (e) => setThemeState(e.matches ? "light" : "dark");
    try { mq.addEventListener("change", on); } catch (_) { mq.addListener(on); }
    return () => { try { mq.removeEventListener("change", on); } catch (_) { mq.removeListener(on); } };
  }, [explicit]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    setExplicit(true);
    try { localStorage.setItem(KEY, t); } catch (_) {}
  }, []);

  const toggle = useCallback(() => setTheme(theme === "light" ? "dark" : "light"), [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

// A drop-in sun/moon toggle button. `variant`: "icon" (compact) | "full".
export function ThemeToggle({ variant = "icon", style = {} }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Switch to dark mode" : "Switch to light mode";
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", border: "1px solid var(--border)", background: "var(--overlay)",
    color: "var(--text-secondary)", borderRadius: 9999, transition: "all .2s ease",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
  };
  const sized = variant === "full" ? { padding: "9px 16px" } : { width: 38, height: 38, padding: 0 };
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} style={{ ...base, ...sized, ...style }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: isLight ? "var(--amber)" : "var(--text-secondary)" }}>
        {isLight ? "dark_mode" : "light_mode"}
      </span>
      {variant === "full" && <span>{isLight ? "Dark" : "Light"}</span>}
    </button>
  );
}
