import "./KineticText.css";

const NBSP = String.fromCharCode(160);

/**
 * KineticText — animates each character's font weight (+ ink stroke) on hover,
 * with the emphasis bleeding symmetrically into neighbouring letters.
 *
 * Self-contained (no Tailwind / cn dependency): the sibling-spread effect is
 * done in KineticText.css using :hover, adjacent-sibling and :has() selectors,
 * so it drops straight into an inline-styled codebase. Pass a plain string —
 * for multi-line headings, render one KineticText per line.
 */
export default function KineticText({ text = "", as: Tag = "span", className = "", style, ...rest }) {
  return (
    <Tag className={`kinetic-text ${className}`} style={style} aria-label={text} {...rest}>
      {text.split("").map((ch, i) => (
        <span key={i} aria-hidden="true">{ch === " " ? NBSP : ch}</span>
      ))}
    </Tag>
  );
}
