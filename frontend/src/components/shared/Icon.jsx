// Shared Material Symbols icon wrapper (Phase 7 — extracted verbatim from
// ResearchInterface so the research report can live in its own module).
export function Icon({ name, style: s }) {
  return (
    <span style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      lineHeight: 1, display: "inline-block", ...(s || {})
    }}>{name}</span>
  );
}
