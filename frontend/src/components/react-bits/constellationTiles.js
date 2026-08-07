// Generates POLYNOUS-themed 512x512 tile images (as data URLs) for the
// InfiniteMenu sphere. Used when items are concepts/sessions/modules rather
// than photos, so every tile matches the dark-void + neon aesthetic.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/**
 * makeTile({ title, tag, accent, glyph })
 *   title  - main label (wrapped, up to 4 lines)
 *   tag    - small uppercase chip (e.g. "CONCEPT", "SESSION")
 *   accent - hex accent color (defaults to neon green)
 *   glyph  - optional single character / emoji drawn as a monogram
 */
export function makeTile({ title = '', tag = '', accent = '#00ff0f', glyph = '' } = {}) {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createRadialGradient(S * 0.5, S * 0.42, 40, S * 0.5, S * 0.5, S * 0.75);
  bg.addColorStop(0, '#12162e');
  bg.addColorStop(1, '#06060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Accent glow border
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 26, 26, S - 52, S - 52, 34);
  ctx.stroke();
  ctx.restore();

  // Subtle inner fill
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  roundRect(ctx, 26, 26, S - 52, S - 52, 34);
  ctx.fill();

  // Monogram / glyph
  const mono = glyph || (String(title).trim()[0] || '?').toUpperCase();
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = accent;
  ctx.font = "800 190px 'Sora', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mono, S / 2, S * 0.44);
  ctx.restore();

  // Tag chip
  if (tag) {
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    const t = String(tag).toUpperCase();
    const tw = ctx.measureText(t).width + 34;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, (S - tw) / 2, 58, tw, 40, 20);
    ctx.fill();
    ctx.strokeStyle = accent + '88';
    ctx.lineWidth = 1.5;
    roundRect(ctx, (S - tw) / 2, 58, tw, 40, 20);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textBaseline = 'middle';
    ctx.fillText(t, S / 2, 79);
  }

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = "800 46px 'Sora', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = wrap(ctx, title, S - 120);
  const lineH = 54;
  const startY = S * 0.62 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, S / 2, startY + i * lineH));

  // Accent underline
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  roundRect(ctx, S / 2 - 34, S - 92, 68, 5, 3);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
