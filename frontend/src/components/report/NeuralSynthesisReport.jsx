// src/components/report/NeuralSynthesisReport.jsx
//
// The Neural Synthesis Report and its parsing/render helpers, extracted
// verbatim from ResearchInterface.jsx (Phase 7, pure refactor — zero visual
// or behavioral change). Prefers the structured `report` payload (Phase 3),
// falling back to the legacy emoji-text regex parser.
import { useState, useRef, useEffect } from "react";
import { C } from "../../design/researchColors";
import { Icon } from "../shared/Icon";
import { API_BASE_URL } from "../../config";


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
// to emit markdown, but this guarantees it — stray ##, **, ---, and list
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

// Split a section body into bullet items — handles "- item", "• item",
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
  return splitItems(text)
    .map(clean)
    // drop leaked header tails like "& UNCERTAINTIES" or bare "CONFIDENCE ASSESSMENT"
    .filter((l) => l.length > 15 && !/^(&|CONFIDENCE|SOURCES)/i.test(l));
}

function SynapseDots() {
  // Retired under the design-restraint pass — decorative corner dots read
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

// Cyan [n] citation chips inside body text
function CitationText({ text }) {
  const parts = String(text).split(/(\[\d{1,2}(?:,\s*\d{1,2})*\])/g);
  return parts.map((p, i) => {
    if (!/^\[\d/.test(p)) return <span key={i}>{p}</span>;
    const first = (p.match(/\d{1,2}/) || [])[0];
    return (
      <button key={i} type="button" aria-label={`Jump to source ${first}`}
        onClick={() => document.getElementById(`source-ref-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        style={{ color: C.cyan, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.9em", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        {p}
      </button>
    );
  });
}

// ─── Premium report section card (13-section briefing format) ────────────────
// Headings are HARD-LOCKED here — the LLM's text never carries or styles
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
  "Confidence Analysis — Computed": "Measured, not guessed",
  "Research Trajectory": "Where to go next",
};

function PremiumSection({ icon, title, accent, body, delay = 0, mono = false, linkify = false }) {
  const cleaned = cleanBlock(body);
  if (!cleaned) return null;
  return (
    <div style={{
      background:"rgba(5,20,36,0.7)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(255,255,255,0.08)", borderLeft:`4px solid ${accent}`,
      borderRadius:14, padding:"26px 30px", position:"relative",
      animation:`sectionIn 0.5s ${delay}s ease both`,
    }}>
      <SynapseDots color={accent} />
      {/* Hard-locked heading block — permanent structure, custom typography */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:accent, textTransform:"uppercase", letterSpacing:"0.24em", fontWeight:700, marginBottom:7, opacity:0.85 }}>
          {SECTION_EYEBROWS[title] || "Section"}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon name={icon} style={{ fontSize:19, color:accent }} />
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0 }}>{title}</h3>
        </div>
        <div style={{ height:2, width:44, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:2, marginTop:11 }} />
      </div>
      <div style={{
        fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif",
        fontSize: mono ? 12 : 14, lineHeight:1.85, color:C.onSurface, whiteSpace:"pre-wrap",
      }}>
        {linkify ? <Linkify text={cleaned} /> : <CitationText text={cleaned} />}
      </div>
    </div>
  );
}

// ─── Neural Synthesis Report ──────────────────────────────────────────────────
// Structured report (Phase 3 JSON contract) -> the same shape parseAnswer
// produces from text, so the render tree below never needs to know which
// path it came from. Only used when report is present AND parsing succeeded
// — a parse_failed or missing/legacy report falls through to the regex
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

// Confidence Analysis — Computed, rendered from the structured factors[]
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
          <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff", margin:0 }}>Confidence Analysis — Computed</h3>
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
              CRITIC CONSENSUS SCORE: <span style={{ color:accent, fontWeight:700 }}>{analysis.critic_consensus.score}%</span> — {analysis.critic_consensus.explanation}
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
// latency, all straight from the pipeline. "—" wherever a provider's SDK
// didn't report usage — never a fabricated number.
const PROVIDER_LABEL = { openai: "OpenAI", anthropic: "Anthropic", google: "Google", groq: "Groq", mistral: "Mistral", cohere: "Cohere", together: "Together" };

function RunTelemetryCard({ telemetry, accent = C.cyan }) {
  if (!telemetry) return null;
  const t = telemetry;
  const cost = t.estimated_cost || {};
  const fmtTok = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
  const fmtCost = (usd) => (typeof usd === "number" ? `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}` : "—");
  const stages = Object.entries(t.by_stage || {});
  const missing = t.missing_usage;
  const STAGE_LABEL = { search: "Search", summarise: "Summarise", critic: "Critic",
    deepen: "Deepen", writer: "Writer", reformulate: "Reformulate",
    for_opening: "FOR opening", against_opening: "AGAINST opening",
    for_rebuttal: "FOR rebuttal", against_rebuttal: "AGAINST rebuttal", judge: "Judge" };

  const tiles = [
    { label: "LLM calls", value: t.calls ?? "—" },
    { label: "Total tokens", value: fmtTok(t.total_tokens) },
    { label: "Est. cost", value: fmtCost(cost.usd), sub: "estimate" },
    { label: "Scrape cache", value: t.scrape_cache_hits ? `${t.scrape_cache_hits} hit${t.scrape_cache_hits !== 1 ? "s" : ""}` : "0" },
  ];

  return (
    <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${accent}`,borderRadius:14,padding:"22px 26px",position:"relative",animation:"sectionIn 0.5s 0.14s ease both" }}>
      <div style={{ marginBottom:16 }}>
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
        </div>
        <div style={{ height:2,width:44,background:`linear-gradient(90deg, ${accent}, transparent)`,borderRadius:2,marginTop:11 }} />
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
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>{s.calls ?? "—"}</td>
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>
                    {(s.input_tokens || s.output_tokens) ? `${fmtTok(s.input_tokens)} / ${fmtTok(s.output_tokens)}` : "—"}
                  </td>
                  <td style={{ padding:"6px 8px",textAlign:"right" }}>{typeof s.latency_s === "number" ? `${s.latency_s.toFixed(1)}s` : "—"}</td>
                  <td style={{ padding:"6px 8px",textAlign:"right",color:accent }}>{fmtCost((cost.by_stage || {})[stage])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop:12,fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:C.textSecondary,lineHeight:1.6 }}>
        Costs are estimates from public list prices{cost.priced_all === false ? " (partial — some models have no price entry, shown as —)" : ""}.
        {missing ? " Some calls' providers did not report token usage (shown as —)." : ""}
      </div>
    </div>
  );
}

// ── Chat with your report ────────────────────────────────────────────────────
// A grounded follow-up Q&A: answers come ONLY from the report + the source
// summaries already fetched for this run (POST /report/chat) — no new web
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

  const grounded = (sourceSummaries && sourceSummaries.length) || (sources && sources.length);

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
      const token = localStorage.getItem("polynous_token") || "";
      const res = await fetch(`${API_BASE_URL}/report/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question,
          report_answer: answer || "",
          source_summaries: sourceSummaries || [],
          citations: (sources || []).map((s) => (typeof s === "string" ? { title: s } : { title: s.title, url: s.url })),
          response_style: localStorage.getItem("polynous_response_style") || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.message || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", text: data.answer || "(no answer)" }]);
    } catch (e) {
      setErr(String(e.message || e));
      setMessages((m) => [...m, { role: "assistant", text: "", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "rgba(5,20,36,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `4px solid ${C.green}`, borderRadius: 14, padding: "22px 26px", animation: "sectionIn 0.5s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Icon name="forum" style={{ fontSize: 19, color: C.green }} />
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", margin: 0 }}>Chat with this report</h3>
      </div>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
        Answered only from the {sourceSummaries?.length || sources?.length || 0} sources already fetched — no new web search. It will say if the report doesn't cover something.
      </p>

      {messages.length > 0 && (
        <div ref={scrollRef} style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, paddingRight: 4 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "86%" }}>
              <div style={{
                fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                padding: "11px 15px", borderRadius: 14,
                background: m.role === "user" ? "rgba(0,255,71,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${m.role === "user" ? "rgba(0,255,71,0.25)" : "rgba(255,255,255,0.08)"}`,
                color: m.error ? C.crimson : "#d7e6f5",
              }}>
                {m.error ? "Something went wrong answering that. Try again." : m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ alignSelf: "flex-start", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.green, opacity: 0.8, padding: "4px 6px" }}>
              reading the sources…
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {CHAT_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy || !grounded} style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: "#bfe9ff", cursor: grounded ? "pointer" : "not-allowed",
              background: "rgba(0,204,255,0.06)", border: "1px solid rgba(0,204,255,0.22)", borderRadius: 9999, padding: "7px 14px",
            }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={grounded ? "Ask a follow-up about this report…" : "No sources available to ground a chat"}
          disabled={busy || !grounded}
          style={{ flex: 1, background: "rgba(1,15,31,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999, padding: "12px 18px", color: "#fff", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, outline: "none" }}
        />
        <button onClick={() => send()} disabled={busy || !grounded || !input.trim()} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", background: C.green, color: "#000", fontWeight: 700,
          borderRadius: 9999, border: "none", cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? 0.55 : 1,
          fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, whiteSpace: "nowrap",
        }}>
          <Icon name="send" style={{ fontSize: 15, color: "#000" }} /> Ask
        </button>
      </div>
      {err && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.crimson, margin: "10px 0 0" }}>{err}</p>}
    </div>
  );
}

export function NeuralSynthesisReport({ query, answer, report, sources, confidence, confThreshold = 70, telemetry, sourceSummaries = [], cacheInfo, onRerun, onCopy, onNew }) {
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

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24,animation:"fadeSlideUp 0.5s ease" }}>

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
        {/* Donut */}
        <div style={{ position:"relative",width:100,height:100,flexShrink:0 }}>
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
        </div>
      </div>

      {/* Cached-result chip + rerun-fresh (Phase 6) */}
      {cacheInfo && (
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:"rgba(0,204,255,0.06)",border:"1px solid rgba(0,204,255,0.28)",borderRadius:12,padding:"12px 16px",animation:"sectionIn 0.4s ease both" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <Icon name="bolt" style={{ fontSize:18,color:C.cyan }} />
            <span style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13.5,color:"#bfe9ff" }}>
              Cached result{cacheInfo.age ? ` · ${cacheInfo.age}` : ""} — served instantly, no tokens spent.
            </span>
          </div>
          {onRerun && (
            <button onClick={onRerun} style={{ display:"flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${C.cyan}`,color:C.cyan,borderRadius:9999,padding:"7px 16px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
              <Icon name="refresh" style={{ fontSize:14 }} /> Rerun fresh
            </button>
          )}
        </div>
      )}

      {/* Run telemetry (Phase 6) — real token counts + estimated cost */}
      <RunTelemetryCard telemetry={telemetry} accent={C.cyan} />

      {/* Confidence-threshold guard — honours the user's Settings preference */}
      {confValue > 0 && confValue < confThreshold && (
        <div style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,170,0,0.06)",border:"1px solid rgba(255,170,0,0.28)",borderRadius:12,padding:"14px 18px",animation:"sectionIn 0.4s ease both" }}>
          <Icon name="warning" style={{ fontSize:20,color:C.amber,flexShrink:0 }} />
          <span style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13.5,color:"#e2d0a0",lineHeight:1.5 }}>
            This answer's confidence (<strong>{confValue}%</strong>) is below your <strong>{confThreshold}%</strong> threshold — the sources were thin or disagreed. Treat it as a lead, not a conclusion, and consider a follow-up query.
          </span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:`4px solid ${C.green}`,borderRadius:14,padding:28,position:"relative",animation:"sectionIn 0.5s 0.08s ease both" }}>
          <SynapseDots color={C.green} />
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9.5,color:C.green,textTransform:"uppercase",letterSpacing:"0.24em",fontWeight:700,marginBottom:7,opacity:0.85 }}>The briefing in brief</div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <Icon name="auto_awesome" style={{ fontSize:19,color:C.green }} />
              <h3 style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:"#fff",margin:0 }}>Executive Summary</h3>
            </div>
            <div style={{ height:2,width:44,background:`linear-gradient(90deg, ${C.green}, transparent)`,borderRadius:2,marginTop:11 }} />
          </div>
          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14.5,lineHeight:1.9,color:C.onSurface,whiteSpace:"pre-wrap" }}>{cleanBlock(summary)}</p>
        </div>
      )}

      {/* Key Findings — every card is a sourced claim from the digest.
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
                  <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:C.onSurface }}><CitationText text={clean(f)} /></p>
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
      <PremiumSection icon="travel_explore" title="Source Intelligence" accent={C.cyan}
        body={sections.sourceIntel} delay={0.18} mono />

      {(sections.consensus || sections.divergence) && (
        <div style={{ display:"grid", gridTemplateColumns: sections.consensus && sections.divergence ? "1fr 1fr" : "1fr", gap:18 }}>
          <PremiumSection icon="handshake" title="Consensus Map" accent={C.green}
            body={sections.consensus} delay={0.2} />
          <PremiumSection icon="bolt" title="Divergence Map" accent={C.crimson}
            body={sections.divergence} delay={0.14} />
        </div>
      )}

      <PremiumSection icon="lightbulb" title="Unique Insights" accent={C.amber}
        body={sections.unique} delay={0.16} />
      <PremiumSection icon="fact_check" title="Source Quality Assessment" accent={C.cyan}
        body={sections.quality} delay={0.18} />
      <PremiumSection icon="search_off" title="Coverage Audit" accent={C.amber}
        body={sections.coverage} delay={0.18} />
      <PremiumSection icon="balance" title="Contradiction Resolution" accent={C.crimson}
        body={sections.contradiction} delay={0.2} />
      {structured
        ? <StructuredConfidenceCard analysis={confAnalysis} delay={0.2} />
        : <PremiumSection icon="analytics" title="Confidence Analysis — Computed" accent={C.green}
            body={sections.confidence} delay={0.2} mono />}
      <PremiumSection icon="explore" title="Research Trajectory" accent={C.green}
        body={sections.trajectory} delay={0.2} />

      {/* Confidence Matrix */}
      <div style={{ background:"rgba(5,20,36,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"18px 26px",animation:"sectionIn 0.5s 0.24s ease both" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14 }}>
          <div style={{ maxWidth:300 }}>
            <h3 style={{ fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.1rem",color:C.cyan,marginBottom:6 }}>Confidence Matrix</h3>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.textSecondary }}>Measured from source agreement, domain diversity, recency, and citation grounding.</p>
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {Array.from({length:10}).map((_,i)=>(
              <div key={i} style={{ width:20,height:20,borderRadius:"50%",background:i<filled?C.green:"rgba(255,255,255,0.07)",boxShadow:i<filled?`0 0 10px ${C.green}`:"none",border:i>=filled?"1px solid rgba(255,255,255,0.13)":"none",transition:"all 0.3s" }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop:12,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:confColor }}>
          {confValue>=80?"✓ High Confidence — Research synthesis is reliable":confValue>=60?"△ Moderate — Results are plausible but verify":"⚠ Low Confidence — Treat with caution"}
        </div>
      </div>

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
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {limitationPoints.length>0 ? limitationPoints.map((pt,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                <span style={{ flexShrink:0,width:26,height:26,borderRadius:"50%",background:"rgba(255,170,0,0.1)",border:`1px solid ${C.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:C.amber,marginTop:2 }}>{i+1}</span>
                <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:"rgba(255,200,100,0.9)",fontStyle:"italic" }}>{clean(pt)}</p>
              </div>
            )) : <p style={{ fontFamily:"'Inter',sans-serif",fontSize:14,lineHeight:1.8,color:"rgba(255,200,100,0.85)",fontStyle:"italic" }}>{clean(limitations)}</p>}
          </div>
        </div>
      )}

      {/* Source Constellation — structured card grid, real citation objects */}
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

      {/* Chat with your report — grounded follow-up Q&A over the fetched sources */}
      <ReportChat query={query} answer={answer} sources={sources} sourceSummaries={sourceSummaries} />

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
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={()=>{if(navigator.share)navigator.share({title:"POLYNOUS Research",text:answer});else navigator.clipboard.writeText(window.location.href);}}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 24px",background:C.green,color:"#000",fontWeight:700,borderRadius:9999,border:"none",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,boxShadow:"0 0 20px rgba(0,255,71,0.3)",transition:"all 0.2s" }}>
            <Icon name="share" style={{ fontSize:15,color:"#000" }} /> Share Research
          </button>
          <button onClick={onNew} style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9999,color:C.onSurfaceVariant,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all 0.2s" }}>
            <Icon name="refresh" style={{ fontSize:15 }} /> New Research
          </button>
        </div>
      </div>
    </div>
  );
}

