import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, getAuthToken } from "../config";
import "./ReportActions.css";

/*
 * ReportActions — floating action dock for a completed research report.
 * Adds three things without touching the report's rendered HTML:
 *   1. Debate against the report (devil's advocate rebuttal)
 *   2. View from another perspective (choose a lens)
 *   3. Chain-of-research (suggested follow-up queries with one-click rerun)
 * Uses the same BYO-key auth path as report_chat.
 */

const LENSES = [
  { key: "skeptic",      label: "Skeptic",      hint: "evidence first, assumptions challenged" },
  { key: "contrarian",   label: "Contrarian",   hint: "the strongest opposite case, in good faith" },
  { key: "futurist",     label: "Futurist",     hint: "second-order and 10-year effects" },
  { key: "practitioner", label: "Practitioner", hint: "what actually ships and works in the field" },
  { key: "historian",    label: "Historian",    hint: "precedent, long-run patterns" },
  { key: "ethicist",     label: "Ethicist",     hint: "harm, fairness, downstream impact" },
];

function useLockBody(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

function apiHeaders() {
  const t = getAuthToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) };
}

function Modal({ open, onClose, title, subtitle, children, tone }) {
  useLockBody(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ra-back" onClick={onClose}>
      <div className={"ra-modal" + (tone ? " ra-tone-" + tone : "")} onClick={(e) => e.stopPropagation()}>
        <div className="ra-head">
          <div>
            <div className="ra-title">{title}</div>
            {subtitle && <div className="ra-sub">{subtitle}</div>}
          </div>
          <button className="ra-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ra-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Debate against report ---------------- */
function DebateModal({ open, onClose, ctx }) {
  const [arg, setArg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const run = async () => {
    setBusy(true); setErr(""); setData(null);
    try {
      const res = await fetch(API_BASE_URL + "/report/debate-against", {
        method: "POST", headers: apiHeaders(),
        body: JSON.stringify({
          report_answer: ctx.answer || "",
          source_summaries: ctx.sourceSummaries || [],
          citations: ctx.citations || [],
          user_argument: arg.trim(),
        }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to run this action." :
        res.status === 400 ? "Add an API key in Settings first." :
        "The devil's advocate is unavailable right now.");
      const j = await res.json();
      setData(j.result);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose}
      title="Debate against this report" tone="fire"
      subtitle="A rigorous counter-case, drawn only from the report's own material.">
      <div className="ra-inputrow">
        <textarea rows={2} value={arg} onChange={(e) => setArg(e.target.value)}
          placeholder="(optional) drop in a counter-argument you want tested"
          className="ra-textarea" />
        <button className="ra-btn ra-btn-primary" disabled={busy} onClick={run}>
          {busy ? "Arguing..." : data ? "Argue again" : "Run counter-case"}
        </button>
      </div>
      {err && <div className="ra-err">{err}</div>}
      {data && (
        <div className="ra-out ra-fade">
          <div className="ra-lead">
            <span className="ra-kicker">Counter-thesis</span>
            <div className="ra-lead-text">{data.thesis}</div>
          </div>
          <div className="ra-points">
            {(data.points || []).map((p, i) => (
              <div key={i} className="ra-point">
                <span className="ra-pnum">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="ra-ptext">{p.point}</div>
                  <div className="ra-pwhy">{p.why}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ra-grid2">
            {data.weakest_link && (
              <div className="ra-card ra-card-warn">
                <span className="ra-kicker">Weakest link</span>
                <p>{data.weakest_link}</p>
              </div>
            )}
            {data.steelman && (
              <div className="ra-card ra-card-cool">
                <span className="ra-kicker">Steelman</span>
                <p>{data.steelman}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {!data && !busy && !err && (
        <p className="ra-hint">The report will be attacked as forcefully as its own sources allow. Sources are cited [n] where used.</p>
      )}
    </Modal>
  );
}

/* ---------------- Perspective ---------------- */
function PerspectiveModal({ open, onClose, ctx }) {
  const [lens, setLens] = useState("skeptic");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const run = async (chosen) => {
    setBusy(true); setErr(""); setData(null); setLens(chosen);
    try {
      const res = await fetch(API_BASE_URL + "/report/perspective", {
        method: "POST", headers: apiHeaders(),
        body: JSON.stringify({
          report_answer: ctx.answer || "",
          source_summaries: ctx.sourceSummaries || [],
          citations: ctx.citations || [],
          lens: chosen,
        }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to run this action." :
        res.status === 400 ? "Add an API key in Settings first." :
        "This lens is unavailable right now.");
      const j = await res.json();
      setData(j.result);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose}
      title="View from another perspective" tone="prism"
      subtitle="Reframe the same evidence through a different lens.">
      <div className="ra-lenses">
        {LENSES.map((l) => (
          <button key={l.key}
            className={"ra-lens" + (lens === l.key ? " is-on" : "")}
            onClick={() => run(l.key)} disabled={busy}>
            <span className="ra-lens-label">{l.label}</span>
            <span className="ra-lens-hint">{l.hint}</span>
          </button>
        ))}
      </div>
      {busy && <div className="ra-loader"><span/><span/><span/></div>}
      {err && <div className="ra-err">{err}</div>}
      {data && (
        <div className="ra-out ra-fade">
          <div className="ra-lead">
            <span className="ra-kicker">Through the {data.lens} lens</span>
            <div className="ra-lead-text">{data.headline}</div>
          </div>
          <p className="ra-reframe">{data.reframe}</p>
          <div className="ra-grid2">
            <div className="ra-card ra-card-cool">
              <span className="ra-kicker">Accepts</span>
              <ul>{(data.agreements || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ra-card ra-card-warn">
              <span className="ra-kicker">Objects to</span>
              <ul>{(data.objections || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
          {data.question && (
            <div className="ra-question">
              <span className="ra-kicker">Would ask next</span>
              <p>&ldquo;{data.question}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Chain of research ---------------- */
function deriveFollowUps(ctx) {
  const seed = [];
  const q = String(ctx.query || "").trim();
  const findings = (ctx.findings || []).map((f) => String(f).replace(/\s*\[\d+\]/g, "").trim()).filter(Boolean);
  const boundaries = (ctx.boundaries || []).map((f) => String(f).replace(/\s*\[\d+\]/g, "").trim()).filter(Boolean);
  if (findings[0]) seed.push({ label: "Dig deeper", q: `What contradicts: ${findings[0].slice(0, 90)}?` });
  if (boundaries[0]) seed.push({ label: "Close a gap", q: `${boundaries[0].slice(0, 110)}` });
  if (q) seed.push({ label: "Broaden", q: `${q} — second-order effects and long-run outcomes` });
  if (q) seed.push({ label: "Compare", q: `How does ${q} compare across major geographies?` });
  return seed.slice(0, 4);
}

function ChainModal({ open, onClose, ctx, onRun }) {
  const suggestions = useMemo(() => deriveFollowUps(ctx), [ctx]);
  return (
    <Modal open={open} onClose={onClose}
      title="Chain-of-research" tone="chain"
      subtitle="One click launches a fresh run, using this report as a jumping-off point.">
      <div className="ra-chain">
        {suggestions.length === 0 && <p className="ra-hint">No obvious follow-ups — this report already covers the key questions.</p>}
        {suggestions.map((s, i) => (
          <button key={i} className="ra-chain-row" onClick={() => onRun(s.q)}>
            <span className="ra-chain-tag">{s.label}</span>
            <span className="ra-chain-q">{s.q}</span>
            <span className="ra-chain-go">Research →</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- Dock ---------------- */
export default function ReportActions({ ctx, onRunQuery }) {
  const [which, setWhich] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 220);
    return () => clearTimeout(t);
  }, []);
  const handleChainRun = (q) => {
    setWhich(null);
    if (typeof onRunQuery === "function") onRunQuery(q);
    else if (typeof window !== "undefined") {
      window.location.assign("/?q=" + encodeURIComponent(q));
    }
  };
  return (
    <>
      <div className={"ra-dock" + (open ? " is-open" : "")} data-print-hide>
        <button className="ra-dock-btn" onClick={() => setWhich("debate")}>
          <span className="ra-dock-glyph">⚔</span>
          <span className="ra-dock-lbl">Debate report</span>
        </button>
        <button className="ra-dock-btn" onClick={() => setWhich("persp")}>
          <span className="ra-dock-glyph">◈</span>
          <span className="ra-dock-lbl">Another lens</span>
        </button>
        <button className="ra-dock-btn" onClick={() => setWhich("chain")}>
          <span className="ra-dock-glyph">↳</span>
          <span className="ra-dock-lbl">Chain research</span>
        </button>
      </div>
      <DebateModal open={which === "debate"} onClose={() => setWhich(null)} ctx={ctx} />
      <PerspectiveModal open={which === "persp"} onClose={() => setWhich(null)} ctx={ctx} />
      <ChainModal open={which === "chain"} onClose={() => setWhich(null)} ctx={ctx} onRun={handleChainRun} />
    </>
  );
}
