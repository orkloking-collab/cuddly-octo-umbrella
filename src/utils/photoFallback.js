/**
 * Locally generated portrait tiles.
 * Used as an <img> fallback so a dead remote URL can never leave a broken-image
 * icon in the middle of someone's profile. Also used for empty profile photos.
 */

const PALETTES = [
  ['#7f1d3a', '#c2410c'],
  ['#4c1d95', '#be185d'],
  ['#0f766e', '#b45309'],
  ['#1e3a8a', '#db2777'],
  ['#3f1d3b', '#f59e0b'],
  ['#111827', '#e11d48'],
];

function hash(str) {
  let h = 0x811c9dc5;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '♥';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/** Returns an inline SVG data URI: gradient background, monogram, subtle grain. */
export function portraitTile({ name = '', seed = name, label = '' } = {}) {
  const h = hash(seed);
  const [from, to] = PALETTES[h % PALETTES.length];
  const rotate = (h % 40) - 20;
  const mono = initials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-label="${escapeXml(label || `Portrait placeholder for ${name}`)}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient>
  <radialGradient id="v" cx="50%" cy="38%" r="72%">
    <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
  </radialGradient>
</defs>
<rect width="600" height="800" fill="url(#g)"/>
<g transform="rotate(${rotate} 300 400)" opacity="0.16" fill="#fff">
  <circle cx="120" cy="140" r="90"/><circle cx="470" cy="620" r="130"/>
</g>
<rect width="600" height="800" fill="url(#v)"/>
<text x="300" y="430" text-anchor="middle" font-family="Georgia, 'Playfair Display', serif" font-size="230" font-weight="700" fill="#fff" fill-opacity="0.9">${escapeXml(mono)}</text>
<text x="300" y="720" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" letter-spacing="6" fill="#fff" fill-opacity="0.7">${escapeXml(String(name).toUpperCase().slice(0, 26))}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(str) {
  return String(str)
    .replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
