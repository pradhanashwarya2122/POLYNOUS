// Recursive merge used to fold each SSE patch into the live engine state.
// Objects merge key-by-key; arrays and scalars are replaced wholesale
// (matches the backend's patch semantics). Extracted verbatim from
// NeuralResearchEngine/DebateEngine (Phase 7 — shared, no behavior change).
export function deepMerge(base, override) {
  if (!override) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.keys(override).forEach((k) => {
    if (
      override[k] !== null &&
      typeof override[k] === "object" &&
      !Array.isArray(override[k]) &&
      base != null &&
      typeof base[k] === "object" &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], override[k]);
    } else {
      out[k] = override[k];
    }
  });
  return out;
}
