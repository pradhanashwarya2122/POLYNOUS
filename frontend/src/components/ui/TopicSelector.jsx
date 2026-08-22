import { motion, AnimatePresence } from "motion/react";
import { TOPIC_CATEGORIES, topicByKey } from "../../data/topics";

/*
  TopicSelector — premium onboarding interest picker. Adapts the shadcn
  multiple-select idea to POLYNOUS's JS/theme: near-navy surface, one green
  accent, category-grouped tags, Material-Symbol icons, and `motion` shared-
  layout animation so a tag glides from the pool into the "your interests" tray
  when chosen. Selection drives the user's personalisation profile.

  Props: value (string[] of topic keys), onChange(keys), min (default 3).
*/

const C = {
  ink: "#0a0a1e", panel: "#0e1434", line: "rgba(200,216,234,0.12)", line2: "rgba(200,216,234,0.06)",
  tx: "#c3d2e6", dim: "#6c7a97", hi: "#f2f6fb", acc: "#3ef07f",
  serif: "'Bricolage Grotesque','Sora',sans-serif", sans: "'Hanken Grotesk',sans-serif", mono: "'JetBrains Mono',monospace",
};

const Sym = ({ name, size = 16, color }) => (
  <span className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined", fontSize: size, color, lineHeight: 1, userSelect: "none" }}>{name}</span>
);

export default function TopicSelector({ value = [], onChange, min = 3 }) {
  const selected = Array.isArray(value) ? value : [];
  const isSel = (k) => selected.includes(k);
  const toggle = (k) => onChange && onChange(isSel(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  const selectedTopics = selected.map(topicByKey).filter(Boolean);
  const enough = selected.length >= min;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* header + counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.16em", color: C.dim, textTransform: "uppercase", flexShrink: 0 }}>Your Interests</span>
        <div style={{ flex: 1, height: 1, background: C.line2 }} />
        <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.04em", color: enough ? C.acc : C.dim, flexShrink: 0, transition: "color .3s ease" }}>
          {selected.length} selected{enough ? "" : ` · pick ${min}+`}
        </span>
      </div>

      {/* selected tray */}
      <motion.div
        layout
        style={{
          minHeight: 52, borderRadius: 12, border: `1px solid ${selected.length ? "rgba(0,255,71,0.28)" : C.line}`,
          background: selected.length ? "rgba(0,255,71,0.04)" : "rgba(255,255,255,0.015)",
          padding: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start",
          transition: "border-color .3s ease, background .3s ease",
        }}
      >
        <AnimatePresence mode="popLayout">
          {selectedTopics.length === 0 && (
            <motion.span key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontFamily: C.sans, fontSize: 13, color: C.dim, alignSelf: "center", padding: "6px 4px" }}>
              Tap the topics below to build your profile. The more you pick, the sharper your suggestions.
            </motion.span>
          )}
          {selectedTopics.map((t) => (
            <motion.button
              key={t.key} layout layoutId={`topic-${t.key}`}
              onClick={() => toggle(t.key)}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px 7px 11px",
                borderRadius: 999, border: `1px solid ${t.accent}55`, background: `${t.accent}1a`,
                color: C.hi, fontFamily: C.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              <Sym name={t.icon} size={15} color={t.accent} />
              {t.name}
              <span style={{ display: "inline-flex", opacity: 0.6 }}><Sym name="close" size={13} color={C.tx} /></span>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* pool, grouped by category */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 300, overflowY: "auto", paddingRight: 4 }} className="no-scrollbar">
        {TOPIC_CATEGORIES.map((c) => {
          const pool = c.topics.filter((t) => !isSel(t.key));
          if (pool.length === 0) return null;
          return (
            <div key={c.cat} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
                <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: "0.12em", color: C.dim, textTransform: "uppercase" }}>{c.cat}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pool.map((t) => (
                  <motion.button
                    key={t.key} layout layoutId={`topic-${t.key}`}
                    onClick={() => toggle(t.key)}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px",
                      borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.02)",
                      color: C.tx, fontFamily: C.sans, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${t.accent}66`; e.currentTarget.style.color = C.hi; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.color = C.tx; }}
                  >
                    <Sym name={t.icon} size={15} color={t.accent} />
                    {t.name}
                    <span style={{ opacity: 0.45, marginLeft: 1 }}><Sym name="add" size={13} color={C.dim} /></span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
