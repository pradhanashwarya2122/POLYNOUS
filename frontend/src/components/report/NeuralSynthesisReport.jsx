// src/components/report/NeuralSynthesisReport.jsx
//
// The Neural Synthesis Report and its parsing/render helpers, extracted
// verbatim from ResearchInterface.jsx (Phase 7, pure refactor - zero visual
// or behavioral change). Prefers the structured `report` payload (Phase 3),
// falling back to the legacy emoji-text regex parser.
import { useState, useRef, useEffect, createContext, useContext } from "react";
import { C } from "../../design/researchColors";
import { Icon } from "../shared/Icon";
import { API_BASE_URL, apiFetch } from "../../config";

// Maps a citation index [n] → { title, url, summary } so a [n] chip can prove
// its grounding on hover. Populated by NeuralSynthesisReport, read by CitationText.
const SourceMapContext = createContext({});

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}


function clean(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")     // **bold** → bold
    .replace(/\*(.*?)\*/g, "$1")         // *italic* → italic
    .replace(/^#{1,4}\s*/gm, "")         // markdown headers
    .replace(/`{1,3}/g, "")              // backticks
    .replace(/^[&\-•]\s*/, "")           // orphaned leading & / - / •
    .replace(/\s{2,}/g, " ")             // collapsed whitespace
    .trim();
}

// Multi-line body sanitizer for section blocks: the LLM is instructed not
// to emit markdown, but this guarantees it - stray ##, **, ---, and list
// dashes are stripped/normalized so the styled components stay clean.
function cleanBlock(text) {
  if (!text) return "";
  return text
    .replace(/^\s*-{3,}\s*$/gm, "")          // --- divider lines
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`{1,3}/g, "")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ")      // markdown dashes → bullets
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Section header matcher: tolerates emoji prefixes, **bold**, colons,
// case variations, and "&" joins (e.g. "CAVEATS & LIMITATIONS & UNCERTAINTIES").
//
// CRITICAL: a header only counts if it's at the START OF A LINE, or is
// EMOJI-PREFIXED (emoji headers can appear mid-blob in LLM output).
// Without this, prose like "The sources characterize..." or "This
// confidence level reflects..." hijacks the section boundaries.
function headerRe(emoji, word) {
  // (?:(?:^|\n)[ \t]*(?:EMOJI\s*)? | EMOJI\s*) \**\s* WORD \s*\**\s*:?
  return new RegExp(
    `(?:(?:^|\\n)[ \\t]*(?:${emoji}\\s*)?|${emoji}\\s*)\\*{0,2}\\s*${word}\\s*\\*{0,2}\\s*:?`,
    "i"
  );
}
const SECTION_DEFS = [
  // 13-section premium report headers (plus legacy fallbacks)
  { key: "summary",       re: headerRe("📋", "EXECUTIVE\\s+(?:SUMMARY|BRIEF)|SUMMARY") },
  { key: "sourceIntel",   re: headerRe("📚", "SOURCE\\s+INTELLIGENCE") },
  { key: "findings",      re: headerRe("🔑", "KEY\\s+FINDINGS?") },
  { key: "consensus",     re: headerRe("🤝", "CONSENSUS\\s+MAP|WHERE\\s+SOURCES\\s+AGREE") },
  { key: "divergence",    re: headerRe("⚡", "DIVERGENCE\\s+MAP|WHERE\\s+SOURCES\\s+DISAGREE") },
  { key: "unique",        re: headerRe("💡", "UNIQUE\\s+(?:INSIGHTS?|PERSPECTIVES?)") },
  { key: "quality",       re: headerRe("⚠️", "SOURCE\\s+QUALITY(?:\\s+(?:ASSESSMENT|NOTES?))?") },
  { key: "coverage",      re: headerRe("🔍", "COVERAGE\\s+AUDIT") },
  { key: "confidence",    re: headerRe("(?:🎯|🔬)", "CONFIDENCE(?:\\s+(?:ASSESSMENT|ANALYSIS))?") },
  { key: "limitations",   re: headerRe("⚠️", "(?:CAVEATS\\s*&?\\s*)?LIMITATIONS?(?:\\s*&\\s*(?:CAVEATS|UNCERTAINTIES))?") },
  { key: "contradiction", re: headerRe("⚖️", "CONTRADICTION\\s+RESOLUTION") },
  { key: "trajectory",    re: headerRe("🔮", "RESEARCH\\s+TRAJECTORY|FOLLOW[-\\s]?UP\\s+QUESTIONS?") },
  { key: "bibliography",  re: headerRe("📖", "(?:SOURCE\\s+)?BIBLIOGRAPHY") },
  { key: "sources",       re: headerRe("(?:📚|🔗)", "SOURCES?(?:\\s+ANALYZED)?") },
];

// Split raw answer text into named sections by scanning for header positions.
function splitSections(text) {
  const hits = [];
  for (const def of SECTION_DEFS) {
    const m = def.re.exec(text);
    if (m) hits.push({ key: def.key, start: m.index, headerEnd: m.index + m[0].length });
  }
  hits.sort((a, b) => a.start - b.start);

  const sections = {};
  // Anything before the first header is the summary (common LLM behaviour)
  if (hits.length > 0 && hits[0].start > 40) {
    sections.summary = text.slice(0, hits[0].start).trim();
  }
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    const body = text.slice(h.headerEnd, end).trim();
    // First matched section of a key wins; later duplicates are appended
    sections[h.key] = sections[h.key] ? sections[h.key] + "\n" + body : body;
  });
  return sections;
}

// Split a section body into bullet items - handles "- item", "• item",
// "1. item", "1) item", newline-separated, and citation-boundary fallbacks.
function splitItems(body) {
  if (!body) return [];
  // 1) explicit bullets / numbered lines
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bulleted = lines
    .filter((l) => /^([-•*]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-•*]|\d+[.)])\s+/, "").trim())
    .filter((l) => l.length > 10);
  if (bulleted.length > 1) return bulleted;

  // 2) inline bullets: "point one • point two • point three"
  const byDot = body.split(/\s+•\s+/).map((s) => s.trim()).filter((s) => s.length > 15);
  if (byDot.length > 1) return byDot;

  // 3) citation boundaries: "…claim [1][3] Next claim…"
  const byCit = body.split(/(?<=\[\d+\])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 15);
  if (byCit.length > 1) return byCit;

  // 4) sentence fallback
  return body
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

// RPT-06: pull a "Claim A / Claim B / Resolution" shape out of the freeform
// contradiction-resolution prose so it renders as two opposed claim cards plus
// a resolution line instead of a dumped paragraph. Returns null (and the caller
// falls back to plain prose) whenever the labelled shape isn't present.
function parseContradiction(text) {
  const t = String(text || "");
  const grab = (re) => { const m = t.match(re); return m ? m[1].trim().replace(/\s+/g, " ") : null; };
  const a = grab(/claim\s*a\s*[:\-–]\s*([\s\S]*?)(?=claim\s*b\s*[:\-–]|resolution\s*[:\-–]|reconcil|$)/i);
  const b = grab(/claim\s*b\s*[:\-–]\s*([\s\S]*?)(?=resolution\s*[:\-–]|reconcil|verdict\s*[:\-–]|$)/i);
  const res = grab(/(?:resolution|reconciliation|verdict)\s*[:\-–]\s*([\s\S]*)$/i);
  if (a && b) return { a, b, res };
  return null;
}

function parseAnswer(text) {
  if (!text) return { summary: "", findings: [], limitations: "", parsedConf: 0, parsedSources: [], sections: {} };

  const sections = splitSections(text);

  const summary = clean(sections.summary || "");
  const findings = splitItems(sections.findings).map(clean).filter(Boolean);
  const limitations = (sections.limitations || "").trim();

  // Confidence: look in the confidence section first, then anywhere
  const confSource = sections.confidence || text;
  const confMatch =
    confSource.match(/(?:overall\s+)?confidence[:\s]*\**\s*(\d{1,3})\s*%/i) ||
    confSource.match(/(\d{1,3})\s*%\s*\(?(?:high|moderate|low)?/i);
  const parsedConf = confMatch ? Math.min(100, parseInt(confMatch[1], 10)) : 0;

  // Sources: numbered/bracketed lines inside source intelligence (13-section
  // format) or the legacy sources section
  const parsedSources = ((sections.sourceIntel || sections.sources) || "")
    .split(/\n|(?=\[\d+\])/)
    .map((l) => l.replace(/^\[\d+\]\s*/, "").trim())
    .filter((l) => l.length > 5);

  // If nothing matched at all, treat the whole text as summary (fallback)
  const nothingParsed = !summary && findings.length === 0 && !limitations;
  return {
    summary: nothingParsed ? clean(text) : summary,
    findings,
    limitations,
    parsedConf,
    parsedSources,
    sections,
  };
}

function parseLimitationPoints(text) {
  if (!text) return [];
  // Already an array (critic sometimes hands coverage_gaps straight through).
  if (Array.isArray(text)) return text.map(clean).filter((l) => l.length > 6);
  let s = String(text).trim();
  // A stringified array, e.g. ['a', 'b', 'c'] or ["a","b"] - parse into items
  // instead of dumping the raw brackets into the UI.
  if (/^\[[\s\S]*\]$/.test(s)) {
    try {
      const arr = JSON.parse(s.replace(/'/g, '"'));
      if (Array.isArray(arr)) return arr.map(clean).filter((l) => l.length > 6);
    } catch (_) {
      const inner = s.slice(1, -1).split(/'\s*,\s*'|"\s*,\s*"/).map((x) => x.replace(/^['"]|['"]$/g, ""));
      if (inner.length) return inner.map(clean).filter((l) => l.length > 6);
    }
  }
  return splitItems(s)
    .map(clean)
    // drop leaked header tails like "& UNCERTAINTIES" or bare "CONFIDENCE ASSESSMENT"
    .filter((l) => l.length > 15 && !/^(&|CONFIDENCE|SOURCES)/i.test(l));
}

// Classify a caveat into a typed, labelled, colour-coded card from its wording.
function caveatMeta(t) {
  const s = String(t).toLowerCase();
  if (/bias|affiliation|perspective|institution|funding|agenda|commercial/.test(s)) return { label: "Institutional Bias", icon: "balance", color: "#ffaa00" };
  if (/informal|blog|rigou?r|peer|anecdot|unverified|opinion|less rigorous/.test(s)) return { label: "Source Rigor", icon: "school", color: "#ff6b6b" };
  if (/temporal|date|recen|outdated|\btime\b|year|context is unclear/.test(s)) return { label: "Temporal Ambiguity", icon: "schedule", color: "#00ccff" };
  if (/coverage|gap|missing|not covered|absent|limited data|sample|underrepresent/.test(s)) return { label: "Coverage Gap", icon: "search_off", color: "#a855f7" };
  if (/conflict|contradict|disagree|dispute/.test(s)) return { label: "Conflicting Evidence", icon: "bolt", color: "#ff2040" };
  return { label: "Caveat", icon: "info", color: "#ffaa00" };
}

function SynapseDots() {
  // Retired under the design-restraint pass - decorative corner dots read
  // as template flourish. Kept as a no-op so existing call sites are safe.
  return null;
}

// Linkify bare URLs inside bibliography/source text
function Linkify({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s)\]]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: C.cyan, textDecoration: "none", borderBottom: `1px dotted ${C.cyan}55`, wordBreak: "break-all" }}>{p}</a>
      : <span key={i}>{p}</span>
  );
}

// A single [n] citation chip that reveals the EXACT source it's grounded in on
// hover - the "it's genuinely not hallucinating" proof. Clicking still scrolls
// to the full source card.
function CitationChip({ label, num }) {
  const sourceMap = useContext(SourceMapContext);
  const src = sourceMap[num];
  const [open, setOpen] = useState(false);
  const closeT = useRef(null);

  const show = () => { clearTimeout(closeT.current); setOpen(true); };
  const hide = () => { closeT.current = setTimeout(() => setOpen(false), 90); };

  return (
    <span style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={show} onMouseLeave={hide}>
      <button type="button" aria-label={`Source ${num}`}
        onClick={() => document.getElementById(`source-ref-${num}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        style={{ color: C.cyan, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.9em", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        {label}
      </button>
      {open && src && (
        <span onMouseEnter={show} onMouseLeave={hide} style={{
          position: "absolute", bottom: "calc(100% + 9px)", left: "50%", transform: "translateX(-50%)",
          width: "min(360px, 78vw)", zIndex: 50, textAlign: "left",
          background: "rgba(6,17,30,0.98)", backdropFilter: "blur(14px)",
          border: `1px solid ${C.cyan}44`, borderLeft: `3px solid ${C.cyan}`, borderRadius: 12,
          padding: "13px 15px", boxShadow: "0 14px 44px rgba(0,0,0,0.55)",
          animation: "sectionIn 0.16s ease both",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: "#001018", background: C.cyan, borderRadius: 5, padding: "1px 6px" }}>{num}</span>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 700, color: "#fff", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{src.title || "Source"}</span>
          </span>
          {src.url && <span style={{ display: "block", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.cyan, marginBottom: 8, opacity: 0.85 }}>{domainOf(src.url)}</span>}
          <span style={{ display: "block", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, lineHeight: 1.6, color: "#c2d4e6", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {src.summary ? `“${src.summary.slice(0, 320)}${src.summary.length > 320 ? "…" : ""}”` : "This source was cited here - open it for the full text."}
          </span>
          <span style={{ display: "block", marginTop: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textSecondary }}>
            {src.summary ? "Grounded in this source" : "Cited source"} · click to open
          </span>
          {/* pointer */}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `7px solid rgba(6,17,30,0.98)` }} />
        </span>
      )}
    </span>
  );
}

// Cyan [n] citation chips inside body text - each proves its source on hover.
function CitationText({ text }) {
  // Render **bold** in addition to [n] citation chips. Without the bold pass,
  // section prose (trajectory, contradiction resolution, consensus, etc.)
  // showed literal "**Claim A:**" asterisks and read like dumped text.
  const parts = String(text)
    .split(/(\*\*[^*]+\*\*|\[\d{1,2}(?:,\s*\d{1,2})*\])/g)
    .filter((p) => p !== "");
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (/^\[\d/.test(p)) {
      const first = parseInt((p.match(/\d{1,2}/) || [])[0], 10);
      return <CitationChip key={i} label={p} num={first} />;
    }
    return <span key={i}>{p}</span>;
  });
}

// ─── Premium report section card (13-section briefing format) ────────────────
// Headings are HARD-LOCKED here - the LLM's text never carries or styles
// them. Each section owns a fixed eyebrow + Sora display title; the body is
// sanitized prose mapped into the card.
const SECTION_EYEBROWS = {
  "Source Intelligence": "Retrieval record",
  "Consensus Map": "Where sources agree",
  "Divergence Map": "Where sources conflict",
  "Unique Insights": "Single-source findings",
  "Source Quality Assessment": "Credibility review",
  "Coverage Audit": "What's missing",
  "Contradiction Resolution": "Conflict analysis",
  "Confidence Analysis - Computed": "Measured, not guessed",
  "Research Trajectory": "Where to go next",
};

function PremiumSection({ icon, title, accent, body, delay = 0, mono = false, linkify = false, collapsible = false, defaultOpen = true, claimStructured = false }) {
  const cleaned = cleanBlock(body);
  const [open, setOpen] = useState(defaultOpen);
  if (!cleaned) return null;
  const claims = claimStructured ? parseContradiction(cleaned) : null;
  return (
    <div style={{
      background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(255,255,255,0.08)", borderLeft:`4px solid ${accent}`,
      borderRadius:14, padding:"26px 30px", position:"relative",
      animation:`sectionIn 0.5s ${delay}s ease both`,
      transition:"border-color 0.25s ease",
    }}>
      <SynapseDots color={accent} />
      {/* Hard-locked heading block - permanent structure, custom typography.
          When `collapsible`, the whole heading becomes a click target that
          expands / collapses the body (chevron mirrors the state). */}
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? open : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } } : undefined}
        style={{
          marginBottom: open ? 18 : 0, cursor: collapsible ? "pointer" : "default",
          userSelect: "none", transition:"margin-bottom 0.4s cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:accent, textTransform:"uppercase", letterSpacing:"0.24em", fontWeight:700, marginBottom:7, opacity:0.85 }}>
          {SECTION_EYEBROWS[title] || "Section"}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon name={icon} style={{ fontSize:19, color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0, flex:1 }}>{title}</h3>
          {collapsible && (
            <Icon name="expand_more" style={{
              fontSize:22, color:accent, flexShrink:0,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition:"transform 0.35s cubic-bezier(0.23,1,0.32,1)",
            }} />
          )}
        </div>
        <div style={{ height:2, width:44, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:2, marginTop:11 }} />
      </div>
      <div style={{
        overflow:"hidden",
        maxHeight: collapsible ? (open ? 6000 : 0) : "none",
        opacity: collapsible ? (open ? 1 : 0) : 1,
        transition:"max-height 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.35s ease",
      }}>
        {claims ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[["Claim A", claims.a, C.cyan], ["Claim B", claims.b, C.crimson]].map(([label, txt, col]) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${col}33`, borderLeft:`3px solid ${col}`, borderRadius:11, padding:"13px 16px" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:col, marginBottom:7 }}>{label}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, lineHeight:1.75, color:C.onSurface }}><CitationText text={txt} /></div>
              </div>
            ))}
            {claims.res && (
              <div style={{ background:`${accent}0f`, border:`1px solid ${accent}33`, borderRadius:11, padding:"13px 16px" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:accent, marginBottom:7 }}>Resolution</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, lineHeight:1.75, color:C.onSurface }}><CitationText text={claims.res} /></div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif",
            fontSize: mono ? 12 : 14, lineHeight:1.85, color:C.onSurface, whiteSpace:"pre-wrap",
          }}>
            {linkify ? <Linkify text={cleaned} /> : <CitationText text={cleaned} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Research Trajectory ("Where to go next") - a numbered roadmap of the next
//     research moves instead of a plain paragraph. ─────────────────────────────
function ResearchTrajectory({ body, accent = C.green, delay = 0.2 }) {
  const cleaned = cleanBlock(body);
  if (!cleaned) return null;
  const parsed = splitItems(cleaned).map(clean).filter((s) => s.length > 8);
  const steps = parsed.length ? parsed.slice(0, 6) : [cleaned];
  return (
    <div style={{
      background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(255,255,255,0.08)", borderLeft:`4px solid ${accent}`,
      borderRadius:14, padding:"26px 30px", position:"relative",
      animation:`sectionIn 0.5s ${delay}s ease both`,
    }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:accent, textTransform:"uppercase", letterSpacing:"0.24em", fontWeight:700, marginBottom:7, opacity:0.85 }}>Where to go next</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon name="explore" style={{ fontSize:19, color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0 }}>Research Trajectory</h3>
        </div>
        <div style={{ height:2, width:44, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:2, marginTop:11 }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start", position:"relative", paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
            {i < steps.length - 1 && <div style={{ position:"absolute", left:15, top:32, bottom:0, width:2, background:`linear-gradient(to bottom, ${accent}55, ${accent}12)` }} />}
            <div style={{ flexShrink:0, width:32, height:32, borderRadius:"50%", background:`${accent}18`, border:`1.5px solid ${accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:800, color:accent, zIndex:1 }}>{i + 1}</div>
            <div style={{ flex:1, paddingTop:4, fontFamily:"'Inter',sans-serif", fontSize:14, lineHeight:1.7, color:C.onSurface }}>
              <CitationText text={s} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Neural Synthesis Report ──────────────────────────────────────────────────
// Structured report (Phase 3 JSON contract) -> the same shape parseAnswer
// produces from text, so the render tree below never needs to know which
// path it came from. Only used when report is present AND parsing succeeded
// - a parse_failed or missing/legacy report falls through to the regex
// parser untouched.
function sectionsFromReport(report) {
  return {
    sourceIntel: report.source_intelligence || "",
    consensus: report.consensus_map || "",
    divergence: report.divergence_map || "",
    unique: report.unique_insights || "",
    quality: report.source_quality || "",
    coverage: report.coverage_audit || "",
    contradiction: report.contradiction_resolution || "",
    trajectory: report.research_trajectory || "",
    bibliography: report.bibliography || "",
  };
}

// Confidence Analysis - Computed, rendered from the structured factors[]
// the backend computes from real source data (never from LLM mono text).
function StructuredConfidenceCard({ analysis, delay = 0 }) {
  if (!analysis) return null;
  const accent = C.green;
  const bandColor = analysis.band === "HIGH" ? C.green : analysis.band === "MODERATE" ? C.amber : C.crimson;
  return (
    <div style={{
      background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(255,255,255,0.08)", borderLeft:`4px solid ${accent}`,
      borderRadius:14, padding:"26px 30px", position:"relative",
      animation:`sectionIn 0.5s ${delay}s ease both`,
    }}>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:accent, textTransform:"uppercase", letterSpacing:"0.24em", fontWeight:700, marginBottom:7, opacity:0.85 }}>
          Measured, not guessed
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon name="analytics" style={{ fontSize:19, color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0 }}>Confidence Analysis - Computed</h3>
        </div>
        <div style={{ height:2, width:44, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:2, marginTop:11 }} />
      </div>

      {!analysis.available ? (
        <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.textSecondary }}>
          {analysis.explanation || "Confidence could not be computed for this run."}
        </p>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:18 }}>
            <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:28, color:"#fff" }}>{analysis.overall}%</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:bandColor, textTransform:"uppercase", letterSpacing:"0.1em" }}>{analysis.band}</span>
          </div>

          {analysis.factors.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom: analysis.explanation ? 14 : 0 }}>
              {analysis.factors.map((f) => (
                <div key={f.key}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.onSurface }}>{f.label} <span style={{ color:C.textSecondary, fontSize:11 }}>(weight {f.weight}%)</span></span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:accent, fontWeight:700 }}>{f.value.toFixed(2)}</span>
                  </div>
                  <div style={{ height:6, borderRadius:4, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.round(f.value*100)}%`, background:accent, borderRadius:4, transition:"width 0.6s ease" }} />
                  </div>
                  {f.note && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.textSecondary, marginTop:4 }}>{f.note}</div>}
                </div>
              ))}
            </div>
          )}

          {analysis.explanation && (
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, lineHeight:1.7, color:C.onSurface, marginBottom: analysis.critic_consensus ? 12 : 0 }}>{analysis.explanation}</p>
          )}

          {analysis.critic_consensus ? (
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11.5, color:C.textSecondary, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              CRITIC CONSENSUS SCORE: <span style={{ color:accent, fontWeight:700 }}>{analysis.critic_consensus.score}%</span> - {analysis.critic_consensus.explanation}
            </div>
          ) : (
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11.5, color:C.textSecondary, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              CRITIC CONSENSUS SCORE: unavailable (critique analysis failed this run).
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Run telemetry (Phase 6): REAL token counts + estimated cost + per-stage
// latency, all straight from the pipeline. " - " wherever a provider's SDK
// didn't report usage - never a fabricated number.
const PROVIDER_LABEL = { openai: "OpenAI", anthropic: "Anthropic", google: "Google", groq: "Groq", mistral: "Mistral", cohere: "Cohere", together: "Together" };

function RunTelemetryCard({ telemetry, accent = C.cyan }) {
  const [open, setOpen] = useState(false);
  if (!telemetry) return null;
  const t = telemetry;
  const cost = t.estimated_cost || {};
  const fmtTok = (n) => (typeof n === "number" ? n.toLocaleString() : " - ");
  const fmtCost = (usd) => (typeof usd === "number" ? `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}` : " - ");
  const stages = Object.entries(t.by_stage || {});
  const missing = t.missing_usage;
  const STAGE_LABEL = { search: "Search", summarise: "Summarise", critic: "Critic",
    deepen: "Deepen", writer: "Writer", reformulate: "Reformulate",
    for_opening: "FOR opening", against_opening: "AGAINST opening",
    for_rebuttal: "FOR rebuttal", against_rebuttal: "AGAINST rebuttal", judge: "Judge" };

  const tiles = [
    { label: "LLM calls", value: t.calls ?? " - " },
    { label: "Total tokens", value: fmtTok(t.total_tokens) },
    { label: "Est. cost", value: fmtCost(cost.usd), sub: "estimate" },
    { label: "Scrape cache", value: t.scrape_cache_hits ? `${t.scrape_cache_hits} hit${t.scrape_cache_hits !== 1 ? "s" : ""}` : "0" },
  ];

  return (
    <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${accent}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.5s 0.14s ease both" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",padding:0,marginBottom: open ? 16 : 0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:7 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:accent,textTransform:"uppercase",letterSpacing:"0.24em",fontWeight:700,opacity:0.85 }}>Real usage · your key</span>
          {(t.providers || []).map((p) => (
            <span key={`${p.provider}-${p.model}`} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:"#cfe6ff",background:"rgba(0,204,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"3px 10px" }}>
              {PROVIDER_LABEL[p.provider] || p.provider}{p.model ? ` · ${p.model}` : ""}
            </span>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <Icon name="monitoring" style={{ fontSize:19,color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:"#fff",margin:0 }}>Run Telemetry</h3>
          <span style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:"#fff" }}>{fmtCost(cost.usd)}</span>
            <Icon name="expand_more" style={{ fontSize:22,color:accent,transform:open?"rotate(180deg)":"none",transition:"transform 0.35s cubic-bezier(0.23,1,0.32,1)" }} />
          </span>
        </div>
        {!open && <p style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:12,color:C.textSecondary,margin:"9px 0 0" }}>Tap to see the full per-agent token and cost breakdown.</p>}
        <div style={{ height:2,width:44,background:`linear-gradient(90deg, ${accent}, transparent)`,borderRadius:2,marginTop:11 }} />
      </button>
      <div style={{ maxHeight: open ? 4000 : 0, opacity: open ? 1 : 0, overflow:"hidden", transition:"max-height 0.55s cubic-bezier(0.23,1,0.32,1), opacity 0.4s ease" }}>

      {/* Prominent, explicit spend headline for this run */}
      <div style={{ display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap",background:`${accent}0f`,border:`1px solid ${accent}33`,borderRadius:12,padding:"14px 18px",marginBottom:16 }}>
        <Icon name="payments" style={{ fontSize:22,color:accent,alignSelf:"center" }} />
        <span style={{ fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:800,color:"#fff",lineHeight:1 }}>{fmtCost(cost.usd)}</span>
        <span style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:12.5,color:C.textSecondary }}>
          spent on your key this run{typeof cost.usd === "number" ? " · estimated from list prices" : " - provider didn't report token usage"}
        </span>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom: stages.length ? 18 : 0 }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:C.textSecondary,marginBottom:5 }}>{tile.label}</div>
            <div style={{ fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:800,color:"#fff" }}>{tile.value}</div>
            {tile.sub && <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8.5,color:C.textSecondary,marginTop:2 }}>{tile.sub}</div>}
          </div>
        ))}
      </div>

      {stages.length > 0 && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
            <thead>
              <tr style={{ color:C.textSecondary,textAlign:"left" }}>
                <th style={{ padding:"6px 8px",fontWeight:600 }}>Stage</th>
                <th style={{ padding:"6px 8px",fontWeight:600,textAlign:"right" }}>Calls</th>
                <th style={{ padding:"6px 8px",fontWeight:600,textAlign:"right" }}>Tokens (in/out)</th>
                <th style={{ padding:"6px 8px",fontWeight:600,textAlign:"right" }}>Latency</th>
                <th style={{ padding:"6px 8px",fontWeight:600,textAlign:"right" }}>Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {stages.map(([stage, s]) => (
                <tr key={stage} style={{ borderTop:"1px solid rgba(255,255,255,0.06)",color:"#cfe" }}>
                  <td style={{ padding:"6px 8px",color:"#fff" }}>{STAGE_LABEL[stage] || stage}</td>
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>{s.calls ?? " - "}</td>
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>
                    {(s.input_tokens || s.output_tokens) ? `${fmtTok(s.input_tokens)} / ${fmtTok(s.output_tokens)}` : " - "}
                  </td>
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>{typeof s.latency_s === "number" ? `${s.latency_s.toFixed(1)}s` : " - "}</td>
                  <td style={{ padding:"6px 8px",textAlign:"right",color:accent }}>{fmtCost((cost.by_stage || {})[stage])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop:12,fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:C.textSecondary,lineHeight:1.6 }}>
        Costs are estimates from public list prices{cost.priced_all === false ? " (partial - some models have no price entry, shown as - )" : ""}.
        {missing ? " Some calls' providers did not report token usage (shown as - )." : ""}
      </div>
      </div>
    </div>
  );
}

// ── Chat with your report ────────────────────────────────────────────────────
// A grounded follow-up Q&A: answers come ONLY from the report + the source
// summaries already fetched for this run (POST /report/chat) - no new web
// search, no new scrape spend. The "not hallucinating" proof: it will say the
// report doesn't cover something rather than invent an answer.
const CHAT_SUGGESTIONS = [
  "Explain the key finding like I'm five",
  "What did the sources disagree on?",
  "What's the strongest evidence here?",
  "What's missing or uncertain?",
];

function ReportChat({ query, answer, sources, sourceSummaries }) {
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef(null);

  // Chat is grounded if we have ANY context to constrain it to: source
  // summaries, cited sources, OR the report answer itself. The backend's
  // _build_context accepts the report answer alone, so requiring sources here
  // wrongly disabled chat on every report that didn't ship a separate sources
  // array (the "chat is disabled and does nothing" bug).
  const grounded = !!(
    (sourceSummaries && sourceSummaries.length) ||
    (sources && sources.length) ||
    (answer && String(answer).trim())
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setErr("");
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      // Plain fetch with a Bearer token (NOT credentials:'include') - matches
      // the working /debate-visual stream. Using credentialed CORS here made the
      // browser block the request on deployments whose CORS doesn't allow
      // credentials, surfacing as "Unable to connect to server".
      const body = JSON.stringify({
        question,
        report_answer: answer || "",
        source_summaries: sourceSummaries || [],
        citations: (sources || []).map((s) => (typeof s === "string" ? { title: s } : { title: s.title, url: s.url })),
        response_style: localStorage.getItem("polynous_response_style") || "",
      });
      const doPost = (tok) => fetch(`${API_BASE_URL}/report/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body,
      });
      let token = localStorage.getItem("polynous_token") || window.__POLYNOUS_ACCESS_TOKEN__ || "";
      let res = await doPost(token);
      // The access token lives ~15 min. If it expired, the user is still logged
      // in (30-day refresh cookie) - silently refresh once and retry instead of
      // telling them to sign in.
      if (res.status === 401) {
        try {
          const rr = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
          if (rr.ok) {
            const rd = await rr.json().catch(() => ({}));
            if (rd.access_token) {
              localStorage.setItem("polynous_token", rd.access_token);
              window.__POLYNOUS_ACCESS_TOKEN__ = rd.access_token;
              res = await doPost(rd.access_token);
            }
          }
        } catch (_) { /* fall through to error handling below */ }
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Report chat is unavailable on the server right now (404). Please try again shortly.");
        }
        if (res.status === 401) {
          throw new Error("Your session expired. Please refresh the page, then ask again.");
        }
        throw new Error(data?.detail || data?.message || `Chat failed (${res.status})`);
      }
      setMessages((m) => [...m, { role: "assistant", text: data.answer || "(no answer)" }]);
    } catch (e) {
      const msg = String(e.message || e);
      setErr(msg);
      setMessages((m) => [...m, { role: "assistant", text: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const srcCount = sourceSummaries?.length || sources?.length || 0;
  const canSend = !busy && input.trim().length > 0;

  return (
    <div style={{ background: "rgba(5,20,36,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `4px solid ${C.green}`, borderRadius: 14, padding: "22px 26px", animation: "sectionIn 0.5s ease both" }}>
      <style>{`
        @keyframes chatDot { 0%,80%,100%{ transform:scale(0.6); opacity:0.4 } 40%{ transform:scale(1); opacity:1 } }
        @keyframes chatMsgIn { from{ opacity:0; transform:translateY(6px) } to{ opacity:1; transform:translateY(0) } }
        @keyframes chatSpin { to { transform:rotate(360deg) } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Icon name="forum" style={{ fontSize: 19, color: C.green }} />
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", margin: 0 }}>Chat with this report</h3>
      </div>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
        {srcCount > 0
          ? `Answered only from this report and its ${srcCount} source${srcCount === 1 ? "" : "s"} - no new web search. It will say if the report doesn't cover something.`
          : "Answered only from this report - no new web search. It will say if the report doesn't cover something."}
      </p>

      {messages.length > 0 && (
        <div ref={scrollRef} style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, paddingRight: 4 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "86%", animation: "chatMsgIn 0.28s cubic-bezier(0.16,1,0.3,1) both" }}>
              <div style={{
                fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                padding: "11px 15px", borderRadius: 14,
                background: m.role === "user" ? "rgba(0,255,71,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${m.role === "user" ? "rgba(0,255,71,0.25)" : "rgba(255,255,255,0.08)"}`,
                color: m.error ? C.crimson : "#d7e6f5",
              }}>
                {m.error ? (m.text || "Something went wrong answering that. Try again.") : m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animation: "chatMsgIn 0.28s ease both" }}>
              <span style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: `chatDot 1.2s ${d * 0.16}s infinite ease-in-out` }} />
                ))}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.green, opacity: 0.85 }}>reading the sources…</span>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {CHAT_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy} style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: "#bfe9ff", cursor: busy ? "wait" : "pointer",
              background: "rgba(0,204,255,0.06)", border: "1px solid rgba(0,204,255,0.22)", borderRadius: 9999, padding: "7px 14px",
              opacity: busy ? 0.6 : 1, transition: "all 0.18s",
            }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a follow-up about this report…"
          disabled={busy}
          style={{ flex: 1, background: "rgba(1,15,31,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999, padding: "12px 18px", color: "#fff", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, outline: "none", opacity: busy ? 0.7 : 1 }}
        />
        <button onClick={() => send()} disabled={!canSend} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", background: C.green, color: "#000", fontWeight: 700,
          borderRadius: 9999, border: "none", cursor: canSend ? "pointer" : "default", opacity: canSend ? 1 : 0.55,
          fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, whiteSpace: "nowrap", transition: "opacity 0.18s",
        }}>
          {busy
            ? <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.35)", borderTopColor: "#000", borderRadius: "50%", animation: "chatSpin 0.7s linear infinite" }} />
            : <Icon name="send" style={{ fontSize: 15, color: "#000" }} />}
          {busy ? "Asking…" : "Ask"}
        </button>
      </div>
      {err && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, margin: "10px 0 0" }}>{err}</p>}
    </div>
  );
}

// ── Confidence provenance modal ──────────────────────────────────────────────
// Turns the score from a vanity number into a defensible artifact: the exact
// measured factors (with weights + values), the critic's consensus, and the
// plain-language explanation - all computed server-side, never LLM-written.
function ConfidenceProvenanceModal({ analysis, confValue, confColor, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const factors = analysis.factors || [];
  const band = analysis.band || "";
  const bandColor = band === "HIGH" ? C.green : band === "MODERATE" ? C.amber : C.crimson;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 4000, background: "rgba(2,8,16,0.72)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "sectionIn 0.2s ease both",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(560px, 96vw)", maxHeight: "88vh", overflowY: "auto",
        background: "rgba(6,18,32,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderLeft: `4px solid ${confColor}`,
        borderRadius: 18, padding: "26px 28px", boxShadow: "0 30px 90px rgba(0,0,0,0.6)", animation: "fadeSlideUp 0.28s ease both",
      }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: confColor, fontWeight: 700, marginBottom: 8 }}>Confidence provenance</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 21, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>How this {confValue}% was computed</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, width: 34, height: 34, color: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 20px" }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{confValue}%</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: bandColor, border: `1px solid ${bandColor}66`, background: `${bandColor}14`, borderRadius: 9999, padding: "4px 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{band} confidence</span>
        </div>

        {analysis.explanation && (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, lineHeight: 1.7, color: "#c8d8ea", margin: "0 0 22px" }}>{analysis.explanation}</p>
        )}

        {/* factor bars */}
        {factors.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: C.textSecondary, marginBottom: 14 }}>Measured factors</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {factors.map((f) => {
                const pct = Math.max(0, Math.min(100, Math.round((f.value <= 1 ? f.value * 100 : f.value))));
                return (
                  <div key={f.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>
                        {f.label}
                        {f.weight ? <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: C.textSecondary, marginLeft: 8 }}>weight {f.weight}%</span> : null}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: confColor }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 9999, background: `linear-gradient(90deg, ${confColor}88, ${confColor})`, transition: "width 0.6s ease" }} />
                    </div>
                    {f.note && <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5, color: C.textSecondary, margin: "6px 0 0", lineHeight: 1.5 }}>{f.note}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* critic consensus */}
        {analysis.critic_consensus && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name="rule" style={{ fontSize: 16, color: C.cyan }} />
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: "#fff" }}>Critic consensus</span>
              <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: C.cyan }}>{analysis.critic_consensus.score}%</span>
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{analysis.critic_consensus.explanation}</p>
          </div>
        )}

        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, margin: 0, lineHeight: 1.6, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <Icon name="verified" style={{ fontSize: 13, color: C.green, flexShrink: 0, marginTop: 1 }} />
          Every number here is measured from the sources - never written by the model, so it can't be inflated.
        </p>
      </div>
    </div>
  );
}

// ── Shared section shell (same chrome as PremiumSection) so custom-rendered
//    sections match the rest of the briefing. ──────────────────────────────────
function ReportSectionShell({ icon, title, accent, delay = 0, children }) {
  return (
    <div style={{ background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderLeft:`4px solid ${accent}`, borderRadius:14, padding:"26px 30px", position:"relative", animation:`sectionIn 0.5s ${delay}s ease both` }}>
      <SynapseDots color={accent} />
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:accent, textTransform:"uppercase", letterSpacing:"0.24em", fontWeight:700, marginBottom:7, opacity:0.85 }}>{SECTION_EYEBROWS[title] || "Section"}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon name={icon} style={{ fontSize:19, color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0 }}>{title}</h3>
        </div>
        <div style={{ height:2, width:44, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:2, marginTop:11 }} />
      </div>
      {children}
    </div>
  );
}

// ── Source trust helpers (client-side mirror of the backend domain tiers) ─────
const _HIGH_TRUST = [".edu", ".gov", ".ac.", "nature.com", "science.org", "arxiv.org", "ieee.org", "nih.gov", "nasa.gov", "who.int", "acm.org", "springer.com", "sciencedirect.com", "britannica.com", "reuters.com", "apnews.com", "cell.com", "pnas.org"];
const _LOW_TRUST = ["quora.com", "reddit.com", "youtube.com", "medium.com", "pinterest.", "facebook.com", "twitter.com", "x.com", "tiktok.com", "fandom.com", "blogspot.", "wordpress.", "substack.com"];
function trustTier(url, text = "") {
  const hay = ((domainOf(url) || "") + " " + text).toLowerCase();
  if (_HIGH_TRUST.some((h) => hay.includes(h)) || /peer.?review|academic|journal|government|official|encyclopedia|\.gov|\.edu/.test(hay)) return "high";
  if (_LOW_TRUST.some((h) => hay.includes(h)) || /\bblog\b|opinion|personal|forum|unverified|self.?published/.test(hay)) return "low";
  return "med";
}
const TIER_META = { high: { label: "High trust", color: C.green }, med: { label: "Moderate", color: C.cyan }, low: { label: "Verify", color: C.crimson } };
function sourceTypeColor(t) {
  const s = (t || "").toUpperCase();
  if (/ACADEMIC|FULL/.test(s)) return C.green;
  if (/NEWS/.test(s)) return C.cyan;
  if (/OPINION/.test(s)) return C.crimson;
  return C.amber;
}
function IdxBadge({ n, color }) {
  return <span style={{ flexShrink:0, width:24, height:24, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", background:`${color}18`, border:`1px solid ${color}44`, color, fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700 }}>{n}</span>;
}

// RPT-09: parse "[n] \"Title\" — domain (year) — TYPE" into structured rows.
function parseSourceIntel(body) {
  return String(body || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^\[(\d+)\]\s*(.*)$/);
    const idx = m ? parseInt(m[1], 10) : null;
    const rest = m ? m[2] : line;
    const segs = rest.split(/\s+[—–-]\s+/).map((s) => s.trim()).filter(Boolean);
    let type = "";
    if (segs.length > 1 && /^[A-Z][A-Z /]{2,}$/.test(segs[segs.length - 1])) type = segs.pop();
    const title = (segs.shift() || "").replace(/^["“]|["”]$/g, "");
    const domain = segs.join(" · ");
    return { idx, title, domain, type };
  });
}

function SourceIntelligenceSection({ body, delay = 0.18 }) {
  const cleaned = cleanBlock(body);
  const sourceMap = useContext(SourceMapContext);
  if (!cleaned) return null;
  const rows = parseSourceIntel(cleaned).filter((r) => r.idx || r.title);
  if (rows.length < 1) return <PremiumSection icon="travel_explore" title="Source Intelligence" accent={C.cyan} body={body} delay={delay} mono />;
  return (
    <ReportSectionShell icon="travel_explore" title="Source Intelligence" accent={C.cyan} delay={delay}>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {rows.map((r, i) => {
          const url = (r.idx && sourceMap[r.idx]?.url) || "";
          const host = domainOf(url) || r.domain;
          const tcol = sourceTypeColor(r.type);
          const Row = url ? "a" : "div";
          return (
            <Row key={i} {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
              title={url ? "Open source in a new tab" : undefined}
              style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", cursor:url ? "pointer" : "default" }}>
              <IdxBadge n={r.idx ?? i + 1} color={C.cyan} />
              {url && <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" width="16" height="16" style={{ borderRadius:4, flexShrink:0 }} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:"#e6eef7", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title || host}</div>
                {host && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.textSecondary, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{host}</div>}
              </div>
              {r.type && <span style={{ flexShrink:0, fontFamily:"'JetBrains Mono',monospace", fontSize:8.5, fontWeight:700, letterSpacing:"0.04em", color:tcol, background:`${tcol}14`, border:`1px solid ${tcol}44`, borderRadius:6, padding:"3px 8px", textTransform:"uppercase" }}>{r.type}</span>}
              {url && <Icon name="open_in_new" style={{ fontSize:15, color:C.cyan, opacity:0.75, flexShrink:0 }} />}
            </Row>
          );
        })}
      </div>
    </ReportSectionShell>
  );
}

// RPT-07: parse the source-quality lines and render per-source credibility
// cards with a computed trust tier + the model's factual note.
function parseSourceQuality(body) {
  return String(body || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^\[?(\d+)\]?[.:)]?\s+(.*)$/);
    return { idx: m ? parseInt(m[1], 10) : null, text: m ? m[2].trim() : line };
  }).filter((r) => r.text && r.text.length > 4);
}

function SourceQualitySection({ body, delay = 0.18 }) {
  const cleaned = cleanBlock(body);
  const sourceMap = useContext(SourceMapContext);
  if (!cleaned) return null;
  const rows = parseSourceQuality(cleaned);
  if (rows.length < 1) return <PremiumSection icon="fact_check" title="Source Quality Assessment" accent={C.cyan} body={body} delay={delay} />;
  return (
    <ReportSectionShell icon="fact_check" title="Source Quality Assessment" accent={C.cyan} delay={delay}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {rows.map((r, i) => {
          const url = (r.idx && sourceMap[r.idx]?.url) || "";
          const host = domainOf(url);
          const tier = trustTier(url, r.text);
          const meta = TIER_META[tier];
          return (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"13px 15px", borderRadius:11, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", borderLeft:`3px solid ${meta.color}` }}>
              <IdxBadge n={r.idx ?? i + 1} color={meta.color} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:5, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8.5, fontWeight:700, letterSpacing:"0.06em", color:meta.color, background:`${meta.color}16`, border:`1px solid ${meta.color}44`, borderRadius:6, padding:"3px 9px", textTransform:"uppercase" }}>{meta.label}</span>
                  {host && (url
                    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.cyan, textDecoration:"none" }}>{host} ↗</a>
                    : <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.textSecondary }}>{host}</span>)}
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, lineHeight:1.65, color:C.onSurface }}><CitationText text={r.text} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </ReportSectionShell>
  );
}

// Phase F — NLI faithfulness. Check whether the report's sources actually
// ENTAIL a claim (real entailment via /report/verify-claim), beyond the
// citation-based faithfulness meter.
function ClaimVerifier({ answer, sourceSummaries, sources }) {
  const [claim, setClaim] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const evidence = () => {
    const parts = (sourceSummaries || []).map((s) => (typeof s === "string" ? s : (s.summary || s.title || ""))).filter(Boolean);
    return (parts.join("\n\n") || (answer || "")).slice(0, 4000);
  };

  const verify = async () => {
    const c = claim.trim();
    if (!c || busy) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const body = JSON.stringify({ claim: c, evidence: evidence() });
      const doPost = (tok) => fetch(`${API_BASE_URL}/report/verify-claim`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body,
      });
      let token = localStorage.getItem("polynous_token") || window.__POLYNOUS_ACCESS_TOKEN__ || "";
      let res = await doPost(token);
      if (res.status === 401) {
        const rr = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
        if (rr.ok) { const rd = await rr.json().catch(() => ({})); if (rd.access_token) { localStorage.setItem("polynous_token", rd.access_token); res = await doPost(rd.access_token); } }
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.message || "Verification failed");
      setResult(d);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const META = {
    entailment: { color: C.green, icon: "check_circle", label: "Supported by the sources" },
    contradiction: { color: C.crimson, icon: "cancel", label: "Contradicted by the sources" },
    neutral: { color: C.amber, icon: "help", label: "Not established either way" },
  };
  const m = result ? (META[result.label] || META.neutral) : null;

  return (
    <div style={{ background: "rgba(5,20,36,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `4px solid ${C.cyan}`, borderRadius: 14, padding: "22px 26px", animation: "sectionIn 0.5s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Icon name="fact_check" style={{ fontSize: 19, color: C.cyan }} />
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", margin: 0 }}>Verify a claim</h3>
      </div>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.6 }}>
        Paste any statement and I'll check whether this report's sources actually entail it (natural-language inference), not just whether it's cited.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={claim} onChange={(e) => setClaim(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()}
          placeholder="e.g. CRISPR has been FDA-approved for sickle cell disease"
          disabled={busy}
          style={{ flex: 1, background: "rgba(1,15,31,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999, padding: "12px 18px", color: "#fff", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, outline: "none" }} />
        <button onClick={verify} disabled={busy || !claim.trim()} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", background: C.cyan, color: "#00121f", fontWeight: 700, borderRadius: 9999, border: "none", cursor: busy || !claim.trim() ? "default" : "pointer", opacity: busy || !claim.trim() ? 0.55 : 1, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, whiteSpace: "nowrap" }}>
          <Icon name={busy ? "hourglass_empty" : "rule"} style={{ fontSize: 15, color: "#00121f" }} /> {busy ? "Checking…" : "Verify"}
        </button>
      </div>
      {result && m && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 15px", borderRadius: 12, background: `${m.color}12`, border: `1px solid ${m.color}44` }}>
          <Icon name={m.icon} style={{ fontSize: 20, color: m.color, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: m.color }}>{m.label} <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textSecondary, fontWeight: 400 }}>· {Math.round((result.confidence || 0) * 100)}% confident</span></div>
            {result.why && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: "#c8d8ea", marginTop: 4, lineHeight: 1.55 }}>{result.why}</div>}
          </div>
        </div>
      )}
      {err && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, margin: "10px 0 0" }}>{err}</p>}
    </div>
  );
}

export function NeuralSynthesisReport({ query, answer, report, sources, confidence, confThreshold = 70, telemetry, sourceSummaries = [], cacheInfo, onRerun, onCopy, onNew, onDeepen }) {
  const structured = !!report && !report.parse_failed;
  const legacy = parseAnswer(answer);

  const summary = structured ? clean(report.executive_summary || "") : legacy.summary;
  const findings = structured ? (report.key_findings || []) : legacy.findings;
  const limitations = structured ? (report.limitations || "") : legacy.limitations;
  const sections = structured ? sectionsFromReport(report) : legacy.sections;
  const parsedSources = legacy.parsedSources; // source constellation always prefers real citation objects below

  const confAnalysis = structured ? report.confidence_analysis : null;
  const parsedConf = structured
    ? (confAnalysis?.available ? confAnalysis.overall : 0)
    : legacy.parsedConf;

  const confValue  = parsedConf || confidence;
  const confColor  = confValue>=80 ? C.green : confValue>=60 ? C.amber : C.crimson;
  const allSources = parsedSources.length>0 ? parsedSources : sources.map(s=>typeof s==="string"?s:s.title||"Source");
  const filled = Math.round(confValue/10);
  const limitationPoints = parseLimitationPoints(limitations);

  // Build the [n] → source map: title/url from the citation list, enriched with
  // the fetched summary (matched by URL, index fallback) so hovering a citation
  // reveals the exact passage it was grounded in.
  const sourceMap = {};
  (sources || []).forEach((s, i) => {
    const o = typeof s === "string" ? { title: s } : (s || {});
    sourceMap[i + 1] = { title: o.title || "", url: o.url || "" };
  });
  (sourceSummaries || []).forEach((ss, idx) => {
    let key = Object.keys(sourceMap).find(k => sourceMap[k].url && ss.url && sourceMap[k].url === ss.url);
    if (!key) key = String(idx + 1);
    sourceMap[key] = {
      title: (sourceMap[key] && sourceMap[key].title) || ss.title || "",
      url: (sourceMap[key] && sourceMap[key].url) || ss.url || "",
      summary: ss.summary || "",
    };
  });

  const [showConf, setShowConf] = useState(false);
  const [shared, setShared] = useState(false);
  const canExplainConf = !!(confAnalysis && confAnalysis.available);

  return (
   <SourceMapContext.Provider value={sourceMap}>
    <div style={{ display:"flex",flexDirection:"column",gap:24,animation:"fadeSlideUp 0.5s ease" }}>

      {showConf && canExplainConf && (
        <ConfidenceProvenanceModal analysis={confAnalysis} confValue={confValue} confColor={confColor} onClose={() => setShowConf(false)} />
      )}

      {/* Header */}
      <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:28,display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden",animation:"sectionIn 0.4s ease" }}>
        <SynapseDots color={C.green} />
        <div style={{ display:"flex",alignItems:"center",gap:18 }}>
          <div style={{ width:54,height:54,borderRadius:"50%",background:"rgba(0,255,71,0.1)",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulseBrain 3s ease-in-out infinite" }}>
            <Icon name="psychology" style={{ color:C.green,fontSize:30 }} />
          </div>
          <div>
            <h2 style={{ fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:"clamp(1rem,2.5vw,1.3rem)",textTransform:"uppercase",letterSpacing:"0.1em",color:C.onSurface,marginBottom:6 }}>Neural Synthesis Report</h2>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:C.green,marginBottom:3 }}>QUERY: {query}</p>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.textSecondary }}>Generated: {new Date().toLocaleDateString()} · Sources: {allSources.length} found</p>
          </div>
        </div>
        {/* Donut - click to see how the score was computed (provenance) */}
        <button type="button" onClick={() => canExplainConf && setShowConf(true)} title={canExplainConf ? "See how this score was computed" : ""}
          className={canExplainConf ? "conf-donut" : ""}
          style={{ position:"relative",width:100,height:100,flexShrink:0,background:"none",border:"none",padding:0,cursor:canExplainConf?"pointer":"default" }}>
          <svg style={{ width:"100%",height:"100%",transform:"rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke={confColor} strokeWidth="6"
              strokeDasharray={2*Math.PI*40} strokeDashoffset={2*Math.PI*40*(1-confValue/100)}
              style={{ transition:"stroke-dashoffset 1s ease" }} />
          </svg>
          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:20,color:"#fff",lineHeight:1 }}>{confValue}%</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.cyan,textTransform:"uppercase",marginTop:2,letterSpacing:"0.05em" }}>Score</span>
          </div>
          {canExplainConf && (
            <span style={{ position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:"0.08em",textTransform:"uppercase",color:C.cyan,opacity:0.85,display:"flex",alignItems:"center",gap:3 }}>
              <Icon name="info" style={{ fontSize:9 }} /> why?
            </span>
          )}
        </button>
      </div>

      {/* Cached-result chip + rerun-fresh (Phase 6) */}
      {cacheInfo && (
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:"rgba(0,204,255,0.06)",border:"1px solid rgba(0,204,255,0.28)",borderRadius:12,padding:"12px 16px",animation:"sectionIn 0.4s ease both" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <Icon name="bolt" style={{ fontSize:18,color:C.cyan }} />
            <span style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13.5,color:"#bfe9ff" }}>
              Cached result{cacheInfo.age ? ` · ${cacheInfo.age}` : ""} - served instantly, no tokens spent.
            </span>
          </div>
          {onRerun && (
            <button onClick={onRerun} style={{ display:"flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${C.cyan}`,color:C.cyan,borderRadius:9999,padding:"7px 16px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
              <Icon name="refresh" style={{ fontSize:14 }} /> Rerun fresh
            </button>
          )}
        </div>
      )}

      {/* Run telemetry (Phase 6) - real token counts + estimated cost */}
      <RunTelemetryCard telemetry={telemetry} accent={C.cyan} />

      {/* Low-confidence guard. Previously this fired on ANY near-miss below the
          user's personal threshold, so a solid 70% answer nagged an 86% setting
          every time. It now only warns when confidence is genuinely LOW in
          absolute terms (capped at a 55% floor), so the notice is rare and
          meaningful instead of constant. */}
      {(() => {
        const guardFloor = Math.min(confThreshold, 55);
        if (!(confValue > 0 && confValue < guardFloor)) return null;
        return (
          <div style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,170,0,0.06)",border:"1px solid rgba(255,170,0,0.28)",borderRadius:12,padding:"14px 18px",animation:"sectionIn 0.4s ease both" }}>
            <Icon name="warning" style={{ fontSize:20,color:C.amber,flexShrink:0 }} />
            <span style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13.5,color:"#e2d0a0",lineHeight:1.5 }}>
              This answer's confidence is low (<strong>{confValue}%</strong>) - the sources were thin or disagreed. Treat it as a lead, not a conclusion, and consider a follow-up query.
            </span>
          </div>
        );
      })()}

      {/* Summary */}
      {summary && (() => {
        // RPT-10: the Executive Summary is the hero of the report - a gradient-
        // framed, glowing card with larger type and formatted (bold + citation)
        // prose split into paragraphs, not a plain dumped block.
        const paras = cleanBlock(summary).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
        const blocks = paras.length ? paras : [cleanBlock(summary)];
        return (
          <div style={{ position:"relative", borderRadius:22, padding:"1.5px", background:`linear-gradient(135deg, ${C.green}77, transparent 42%, ${C.cyan}44)`, boxShadow:`0 30px 70px -34px ${C.green}55`, animation:"sectionIn 0.5s 0.05s ease both" }}>
            <div style={{ position:"relative", overflow:"hidden", borderRadius:20.5, padding:"34px 38px", background:"linear-gradient(180deg, rgba(7,26,20,0.93), rgba(5,15,27,0.95))", backdropFilter:"blur(22px)" }}>
              <div style={{ position:"absolute", top:-90, right:-70, width:280, height:280, background:`radial-gradient(circle, ${C.green}26, transparent 70%)`, pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, position:"relative" }}>
                <div style={{ width:46, height:46, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`radial-gradient(circle at 30% 30%, ${C.green}, ${C.green}33)`, boxShadow:`0 0 24px ${C.green}66, inset 0 0 10px rgba(255,255,255,0.25)` }}>
                  <Icon name="auto_awesome" style={{ fontSize:24, color:"#04120b" }} />
                </div>
                <div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.24em",fontWeight:700 }}>The briefing in brief</div>
                  <h2 style={{ fontFamily:"'Sora',sans-serif",fontSize:"clamp(1.5rem,3vw,1.85rem)",fontWeight:900,letterSpacing:"-0.03em",color:"#fff",margin:"3px 0 0",lineHeight:1.05 }}>Executive Summary</h2>
                </div>
              </div>
              <div style={{ position:"relative", fontFamily:"'Inter',sans-serif", fontSize:16.5, lineHeight:1.85, color:"#e7eff8" }}>
                {blocks.map((p, i) => (
                  <p key={i} style={{ margin: i === blocks.length - 1 ? 0 : "0 0 14px" }}><CitationText text={p} /></p>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Key Findings - every card is a sourced claim from the digest.
          (Previously split by index parity into fake "Debate Counter-Args".) */}
      {findings.length>0 && (
        <div style={{ animation:"sectionIn 0.5s 0.16s ease both" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 14px",background:"rgba(0,255,71,0.08)",borderRadius:9999,width:"fit-content",marginBottom:14 }}>
            <Icon name="key" style={{ color:C.green,fontSize:15 }} />
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em" }}>Key Findings · {findings.length} sourced claims</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14 }}>
            {findings.map((f,i)=>(
              <div key={i} className="finding-card-green" style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.07)",borderLeft:`3px solid ${C.green}55`,borderRadius:12,padding:"18px 20px",position:"relative",transition:"border-color 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)" }}
                onMouseEnter={(e)=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor="rgba(0,255,71,0.35)"; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; }}
              >
                <span style={{ position:"absolute",top:-2,left:-2,width:4,height:4,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}` }} />
                <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(0,255,71,0.1)",border:`1px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.green,marginTop:2 }}>{i+1}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:C.onSurface,margin:0 }}><CitationText text={clean(f)} /></p>
                    {onDeepen && (
                      <button className="deepen-btn" onClick={()=>onDeepen(clean(f))} title="Run a focused research pass on this finding"
                        style={{ marginTop:12,display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(0,255,71,0.06)",border:`1px solid ${C.green}40`,borderRadius:9999,color:C.green,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,fontWeight:700,letterSpacing:"0.04em",transition:"all 0.2s" }}
                        onMouseEnter={(e)=>{ e.currentTarget.style.background="rgba(0,255,71,0.14)"; }}
                        onMouseLeave={(e)=>{ e.currentTarget.style.background="rgba(0,255,71,0.06)"; }}>
                        <Icon name="travel_explore" style={{ fontSize:13 }} /> Deepen this
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw answer fallback */}
      {findings.length===0 && !summary && (
        <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,255,71,0.2)",borderLeft:`4px solid ${C.green}`,borderRadius:14,padding:28,animation:"sectionIn 0.5s 0.08s ease both" }}>
          <SynapseDots color={C.green} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:18 }}>📋 Research Synthesis</div>
          {(() => {
            const pts = answer.split(/\s*[•]\s*/).map(s=>s.replace(/^(\[\d+\])+\s*/,"").trim()).filter(s=>s.length>15);
            if (pts.length>1) return (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {pts.map((pt,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                    <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(0,255,71,0.1)",border:`1px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.green,marginTop:2 }}>{i+1}</span>
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,color:C.onSurface,lineHeight:1.85 }}>{clean(pt)}</p>
                  </div>
                ))}
              </div>
            );
            return <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,color:"#c8d6e5",lineHeight:1.9,whiteSpace:"pre-wrap" }}>{answer}</p>;
          })()}
        </div>
      )}

      {/* ── Premium 13-section briefing ── */}
      <SourceIntelligenceSection body={sections.sourceIntel} delay={0.18} />

      {(sections.consensus || sections.divergence) && (
        <div style={{ display:"grid", gridTemplateColumns: sections.consensus && sections.divergence ? "1fr 1fr" : "1fr", gap:18 }}>
          <PremiumSection icon="handshake" title="Consensus Map" accent={C.green}
            body={sections.consensus} delay={0.2} collapsible />
          <PremiumSection icon="bolt" title="Divergence Map" accent={C.crimson}
            body={sections.divergence} delay={0.14} collapsible />
        </div>
      )}

      <PremiumSection icon="lightbulb" title="Unique Insights" accent={C.amber}
        body={sections.unique} delay={0.16} />
      <SourceQualitySection body={sections.quality} delay={0.18} />
      <PremiumSection icon="search_off" title="Coverage Audit" accent={C.amber}
        body={sections.coverage} delay={0.18} collapsible />
      <PremiumSection icon="balance" title="Contradiction Resolution" accent={C.crimson}
        body={sections.contradiction} delay={0.2} claimStructured />
      {structured
        ? <StructuredConfidenceCard analysis={confAnalysis} delay={0.2} />
        : <PremiumSection icon="analytics" title="Confidence Analysis - Computed" accent={C.green}
            body={sections.confidence} delay={0.2} mono />}
      <ResearchTrajectory body={sections.trajectory} accent={C.green} delay={0.2} />

      {/* Confidence Matrix - per-dimension breakdown, color-coded with tooltips */}
      {(() => {
        const src = (sources?.length ? sources : (allSources || [])).map(s => typeof s === "string" ? { title: s } : s);
        const n = src.length || 1;
        const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
        const yearOf = (d) => { const m = String(d || "").match(/\b(19|20)\d{2}\b/); return m ? +m[0] : 0; };
        const domains = new Set(src.map(s => domainOf(s.url || "")).filter(Boolean));
        const years = src.map(s => yearOf(s.date || s.published || s.title || "")).filter(Boolean);
        const nowY = new Date().getFullYear();
        const agreement = Math.round(confValue);
        const diversity = domains.size ? Math.min(100, Math.round((domains.size / n) * 100)) : null;
        const recency = years.length ? Math.max(5, Math.min(100, Math.round(100 - (nowY - (years.reduce((a, b) => a + b, 0) / years.length)) * 12))) : null;
        const grounding = Math.min(100, Math.round((Math.min(n, 8) / 8) * 100));
        const dims = [
          { k: "Source agreement", v: agreement, tip: "How strongly the sources concur on the core claims. This is the main driver of the headline confidence score." },
          { k: "Domain diversity", v: diversity, tip: "Share of distinct publishers/domains among the sources. Higher means less single-source bias." },
          { k: "Recency", v: recency, tip: "How recent the cited sources are, inferred from dates in the material. Higher means more up-to-date evidence." },
          { k: "Citation grounding", v: grounding, tip: "Breadth of retrieved sources backing the answer. Higher means the synthesis rests on more independent evidence." },
        ];
        const dcol = (v) => v == null ? "rgba(255,255,255,0.25)" : v >= 75 ? C.green : v >= 50 ? C.amber : C.crimson;
        return (
          <div style={{ position:"relative",overflow:"hidden",background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${confColor}`,borderRadius:14,padding:"22px 26px",animation:"sectionIn 0.5s 0.24s ease both" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg, ${confColor}, transparent 70%)`,opacity:0.7 }} />
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:18 }}>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:confColor,textTransform:"uppercase",letterSpacing:"0.24em",fontWeight:700,marginBottom:7,opacity:0.85 }}>Confidence provenance</div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <Icon name="grid_view" style={{ fontSize:19,color:confColor }} />
                  <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:"#fff",margin:0 }}>Confidence Matrix</h3>
                </div>
              </div>
              {/* RPT-04: the overall score opens the full computed provenance. */}
              <button onClick={() => canExplainConf && setShowConf(true)} disabled={!canExplainConf}
                title={canExplainConf ? "See exactly how this score was computed" : undefined}
                style={{ textAlign:"right",background:"transparent",border:"none",padding:0,cursor:canExplainConf?"pointer":"default",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                <div style={{ fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:800,color:confColor,lineHeight:1 }}>{agreement}%</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.textSecondary,letterSpacing:"0.1em",marginTop:4,textTransform:"uppercase" }}>Overall</div>
                {canExplainConf && <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:confColor,letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:3 }}>how computed <Icon name="arrow_forward" style={{ fontSize:11 }} /></div>}
              </button>
            </div>
            <div style={{ display:"grid",gap:13 }}>
              {dims.map(d => (
                <div key={d.k} title={d.tip} style={{ cursor:"help" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                    <span style={{ display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13,color:"rgba(210,222,236,0.88)" }}>
                      {d.k}
                      <Icon name="info" style={{ fontSize:13,color:"rgba(150,165,185,0.5)" }} />
                    </span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,color:dcol(d.v) }}>{d.v == null ? "n/a" : `${d.v}%`}</span>
                  </div>
                  <div style={{ height:8,borderRadius:5,background:"rgba(255,255,255,0.05)",overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${d.v == null ? 0 : d.v}%`,borderRadius:5,background:`linear-gradient(90deg, ${dcol(d.v)}aa, ${dcol(d.v)})`,boxShadow:`0 0 8px ${dcol(d.v)}55`,transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16,padding:"10px 14px",borderRadius:10,background:`${confColor}0d`,border:`1px solid ${confColor}25`,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:confColor }}>
              {confValue>=80?"✓ High confidence - synthesis is well-supported across dimensions":confValue>=60?"△ Moderate - plausible, but verify weaker dimensions above":"⚠ Low confidence - treat as a lead, not a conclusion"}
            </div>
          </div>
        );
      })()}

      {/* Limitations */}
      {limitations && (
        <div style={{ background:"rgba(255,170,0,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,170,0,0.15)",borderLeft:`4px solid ${C.amber}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.5s 0.32s ease both" }}>
          <SynapseDots color={C.amber} />
          <div style={{ marginBottom:18 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:C.amber,textTransform:"uppercase",letterSpacing:"0.24em",fontWeight:700,marginBottom:7,opacity:0.85 }}>Honest boundaries</div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <Icon name="warning" style={{ fontSize:19,color:C.amber }} />
              <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:"#fff",margin:0 }}>Caveats &amp; Limitations</h3>
            </div>
            <div style={{ height:2,width:44,background:`linear-gradient(90deg, ${C.amber}, transparent)`,borderRadius:2,marginTop:11 }} />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(248px,1fr))",gap:12 }}>
            {(limitationPoints.length>0 ? limitationPoints : [clean(limitations)]).filter(Boolean).map((pt,i)=>{
              const m = caveatMeta(pt);
              return (
                <div key={i} style={{ background:`${m.color}0d`,border:`1px solid ${m.color}33`,borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:9,transition:"transform 0.25s, box-shadow 0.25s" }}
                  onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 14px 30px rgba(0,0,0,0.35), 0 0 20px ${m.color}18`;}}
                  onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                    <span style={{ flexShrink:0,width:30,height:30,borderRadius:9,background:`${m.color}1c`,border:`1px solid ${m.color}45`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Icon name={m.icon} style={{ fontSize:17,color:m.color }} />
                    </span>
                    <span style={{ fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:12.5,color:"#fff",letterSpacing:"-0.01em" }}>{m.label}</span>
                  </div>
                  <p style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13,lineHeight:1.62,color:"rgba(232,222,204,0.84)",margin:0 }}>{pt}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source Constellation - structured card grid, real citation objects */}
      {(sources?.length > 0 || allSources.length > 0) && (() => {
        const structured = (sources?.length ? sources : allSources).map((s) =>
          typeof s === "string" ? { title: s } : s
        );
        const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
        const yearOf = (d) => { const m = String(d || "").match(/\b(19|20)\d{2}\b/); return m ? m[0] : ""; };
        return (
          <div style={{ animation:"sectionIn 0.5s 0.40s ease both" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.cyan,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
              <Icon name="hub" style={{ fontSize:15,color:C.cyan }} /> Source Constellation
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
              {structured.map((s, i) => {
                const domain = domainOf(s.url);
                const year = yearOf(s.published_date);
                const badge = s.content_source === "scraped" ? "ARTICLE" : (s.content_source ? "SNIPPET" : null);
                const card = (
                  <div className="source-pill" style={{
                    background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)",
                    border:"1px solid rgba(0,204,255,0.18)", borderRadius:12,
                    padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start",
                    cursor: s.url ? "pointer" : "default", height:"100%",
                    transition:"transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                    onMouseEnter={(e)=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor="rgba(0,204,255,0.45)"; e.currentTarget.style.boxShadow="0 10px 26px rgba(0,0,0,0.35)"; }}
                    onMouseLeave={(e)=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(0,204,255,0.18)"; e.currentTarget.style.boxShadow="none"; }}
                  >
                    <span style={{ flexShrink:0, width:24, height:24, borderRadius:"50%", background:"rgba(0,204,255,0.1)", border:`1px solid ${C.cyan}55`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif", fontSize:11, fontWeight:800, color:C.cyan }}>{i+1}</span>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.onSurface, lineHeight:1.45, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                        {s.title || "Untitled source"}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:7, flexWrap:"wrap" }}>
                        {domain && (
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textSecondary }}>
                            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width="12" height="12" style={{ borderRadius:3 }} onError={(e)=>{e.currentTarget.style.display="none";}} />
                            {domain}{year ? ` · ${year}` : ""}
                          </span>
                        )}
                        {badge && (
                          <span style={{ fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, letterSpacing:"0.06em", color:C.cyan, border:`1px solid ${C.cyan}45`, background:"rgba(0,204,255,0.07)", borderRadius:9999, padding:"1px 7px" }}>{badge}</span>
                        )}
                      </div>
                    </div>
                    {s.url && <Icon name="open_in_new" style={{ fontSize:13, color:C.textSecondary, flexShrink:0, marginTop:2 }} />}
                  </div>
                );
                return s.url
                  ? <a key={i} id={`source-ref-${i+1}`} href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>{card}</a>
                  : <div key={i} id={`source-ref-${i+1}`}>{card}</div>;
              })}
            </div>
          </div>
        );
      })()}

      {/* Chat with your report - grounded follow-up Q&A over the fetched sources */}
      <ReportChat query={query} answer={answer} sources={sources} sourceSummaries={sourceSummaries} />

      {/* Phase F NLI faithfulness: verify any claim against this report's sources */}
      <ClaimVerifier answer={answer} sources={sources} sourceSummaries={sourceSummaries} />

      {/* Footer actions */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:22,animation:"sectionIn 0.5s 0.48s ease both" }}>
        <div style={{ display:"flex",gap:10 }}>
          {[
            { icon:"download", label:"Export", action:()=>{const b=new Blob([`POLYNOUS Neural Synthesis Report\nQuery: ${query}\n\n${answer}`],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-report.txt";a.click();} },
            { icon:"data_object", label:"JSON", action:()=>{const b=new Blob([JSON.stringify({query,answer,confidence,sources:allSources,generated:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="polynous-vectors.json";a.click();} },
          ].map(({icon,label,action})=>(
            <button key={label} className="action-btn" onClick={action} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(5,20,36,0.7)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
              <Icon name={icon} style={{ fontSize:15 }} /> {label}
            </button>
          ))}
          <button className="copy-btn" onClick={onCopy} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(5,20,36,0.7)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurface,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
            <Icon name="content_copy" style={{ fontSize:15 }} /> Copy
          </button>
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          {shared && (
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:C.green,display:"flex",alignItems:"center",gap:5 }}>
              <Icon name="check_circle" style={{ fontSize:14 }} /> Copied - {allSources.length} clickable source link{allSources.length!==1?"s":""} included
            </span>
          )}
          <button onClick={()=>{
              const srcLines = (sources||[]).map((s,i)=>{ const o = typeof s==="string"?{title:s}:s; return `[${i+1}] ${o.title||"Source"}${o.url?`\n    ${o.url}`:""}`; }).join("\n");
              const block = `POLYNOUS - Neural Synthesis Report\nQuery: ${query}\nConfidence: ${confValue}%\n\n${answer}\n\nSources:\n${srcLines}\n\nvia ${window.location.origin}`;
              navigator.clipboard.writeText(block).then(()=>{ setShared(true); setTimeout(()=>setShared(false),3000); });
              if(navigator.share){ navigator.share({title:"POLYNOUS Research",text:block}).catch(()=>{}); }
            }}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 24px",background:C.green,color:"#000",fontWeight:700,borderRadius:9999,border:"none",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,boxShadow:"0 0 20px rgba(0,255,71,0.3)",transition:"all 0.2s" }}>
            <Icon name="share" style={{ fontSize:15,color:"#000" }} /> Share Research
          </button>
          <button onClick={onNew} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurfaceVariant,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
            <Icon name="refresh" style={{ fontSize:15 }} /> New Research
          </button>
        </div>
      </div>
    </div>
   </SourceMapContext.Provider>
  );
}

