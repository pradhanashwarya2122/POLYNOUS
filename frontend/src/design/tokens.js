// src/design/tokens.js
//
// Shared design tokens for POLYNOUS (Phase 7). Single source of truth for the
// palette, type ramp, and spacing that the engines and reports reuse. Colours
// here are the exact hex values already used across the app - no visual change,
// just deduplicated. Per-surface accents (research = green/cyan, debate =
// crimson) are grouped so each view imports its own accent without redefining
// the neutral base.

// ── Neutral base (shared by every dark surface) ──────────────────────────────
export const BASE = {
  void:      "#0a0a1e",   // page background
  onSurface: "#e2e0fc",   // primary body text
  variant:   "#b9ccb0",   // secondary/among-sources text
  secondary: "#8899aa",   // muted labels
  dim:       "#525c6e",   // faint captions / disabled
  white10:   "rgba(255,255,255,0.1)",
  white05:   "rgba(255,255,255,0.05)",
};

// ── Accents ──────────────────────────────────────────────────────────────────
export const ACCENT = {
  green:   "#00e64d",   // research primary / FOR advocate
  greenAlt:"#00ff47",   // research hero highlight (NeuralResearchEngine CSS)
  cyan:    "#4FD1C5",   // research secondary (relevance)
  crimson: "#ff2040",   // debate primary / AGAINST advocate
  purple:  "#a855f7",   // VS / neutral
  gold:    "#ffd700",   // verdict
  amber:   "#ffaa00",   // caution / limitations
};

// ── Type ramp ────────────────────────────────────────────────────────────────
export const FONT = {
  display: "'Sora', sans-serif",
  body:    "'Hanken Grotesk', sans-serif",
  ui:      "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
  serif:   "'Cormorant Garamond', serif",
};

// ── Spacing scale (px) ───────────────────────────────────────────────────────
export const SPACE = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40 };

// ── Convenience: the debate engine's `C` object, sourced from the tokens ──────
export const DEBATE_C = {
  crimson:   ACCENT.crimson,
  green:     ACCENT.green,
  purple:    ACCENT.purple,
  gold:      ACCENT.gold,
  void:      BASE.void,
  onSurface: BASE.onSurface,
  variant:   BASE.variant,
  secondary: BASE.secondary,
  dim:       BASE.dim,
};
