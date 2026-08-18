// ─────────────────────────────────────────────────────────────────────────────
// Dev Preview — a lightweight "staging" gate so the owner can view in-progress
// components live (via the admin link) WITHOUT running localhost, iterate on
// them, and only flip them on for everyone when ready.
//
// It's ON when either:
//   • an admin key is present in this tab (you unlocked /admin), or
//   • you explicitly enabled it (localStorage `polynous_dev_preview` = "1").
//
// `usePreviewFlag()` re-renders when the flag changes (same tab or via the
// custom event the admin toggle dispatches).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

const LS_KEY = "polynous_dev_preview";
const ADMIN_KEY = "polynous_admin_key";
export const PREVIEW_EVENT = "polynous:dev-preview-changed";

export function isDevPreview() {
  try {
    if (localStorage.getItem(LS_KEY) === "1") return true;
    if (sessionStorage.getItem(ADMIN_KEY)) return true;   // admin session ⇒ preview
  } catch { /* storage blocked */ }
  return false;
}

export function setDevPreview(on) {
  try {
    if (on) localStorage.setItem(LS_KEY, "1");
    else localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { on: !!on } })); } catch { /* ignore */ }
}

export function usePreviewFlag() {
  const [on, setOn] = useState(isDevPreview());
  useEffect(() => {
    const sync = () => setOn(isDevPreview());
    window.addEventListener(PREVIEW_EVENT, sync);
    window.addEventListener("storage", sync);   // other tabs
    return () => {
      window.removeEventListener(PREVIEW_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}
