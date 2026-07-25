import { useState, useRef, useEffect } from "react";
import { deepMerge } from "./deepMerge";

// Shared SSE-over-fetch hook for the live engines (Phase 7). Both
// NeuralResearchEngine (/ask-visual) and DebateEngine (/debate-visual)
// POST a query with the bearer token, then read a `data: {...}\n\n` stream,
// deep-merging each patch into a per-engine `defaultData` shape.
//
// Behavior preserved exactly from the two former hooks:
//   - useLiveResearch: pass options.extraBody = { force_fresh } and include
//     the same value in options.deps so a rerun re-fires the effect.
//   - useLiveDebate:   no extra body, no extra deps.
//
// options:
//   responseStyle : string sent as response_style
//   defaultData   : initial state object patches merge into
//   extraBody     : extra fields merged into the POST body (default {})
//   deps          : extra effect deps (default []) — e.g. [forceFresh]
export function useLiveStream(apiUrl, query, options = {}) {
  const { responseStyle, defaultData, extraBody = {}, deps = [] } = options;
  const [liveData, setLiveData] = useState(null);
  const [liveError, setLiveError] = useState(null);

  const stateRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!apiUrl || !query) return;

    startedRef.current = false;
    stateRef.current = null;
    setLiveData(null);
    setLiveError(null);

    const controller = new AbortController();

    async function connect() {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        const token =
          (typeof localStorage !== "undefined" && localStorage.getItem("polynous_token")) ||
          (typeof window !== "undefined" && window.__POLYNOUS_ACCESS_TOKEN__) ||
          "";

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query, response_style: responseStyle || "", ...extraBody }),
          signal: controller.signal,
        });

        if (!res.ok) { setLiveError(`Server returned ${res.status}`); return; }
        if (!res.body) { setLiveError("No stream body"); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            let event;
            try { event = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
            if (event && typeof event.error === "string") { setLiveError(event.error); continue; }
            const next = deepMerge(stateRef.current || defaultData, event);
            stateRef.current = next;
            setLiveData({ ...next });
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setLiveError(err.message || "Stream connection failed.");
      }
    }
    connect();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, query, responseStyle, ...deps]);

  return { liveData, liveError };
}
