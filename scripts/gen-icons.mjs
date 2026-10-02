/**
 * Generates the app icons for the PWA manifest: a heart on a rose gradient, drawn
 * pixel by pixel in Node (no image library in this repo, no network fetch), then
 * written as a real PNG with node:zlib.
 *
 *   node scripts/gen-icons.mjs
 *
 * Outputs public/icons/icon-{192,512}.png and the maskable variants, which are what
 * Android installs from and what iOS uses for the home-screen tile.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.join(process.cwd(), 'public', 'icons');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let at = 0;
  for (let y = 0; y < size; y += 1) {
    raw[at] = 0; // filter: none
    at += 1;
    pixels.copy(raw, at, y * size * 4, (y + 1) * size * 4);
    at += size * 4;
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

/** (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0 is a heart. */
function inHeart(x, y) {
  const nx = x * 1.42;
  const ny = -y * 1.28 + 0.16;
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
}

function draw({ size, padding = 0, round = 0.22 }) {
  const px = Buffer.alloc(size * size * 4);
  const inset = Math.round(size * padding);
  const radius = Math.round(size * round);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      // Squircle-ish: rounded rect in a box shrunk by `padding`.
      const lo = inset;
      const hi = size - 1 - inset;
      const dx = Math.max(lo - x, x - hi, 0);
      const dy = Math.max(lo - y, y - hi, 0);
      const cx = Math.min(Math.max(x, lo + radius), hi - radius);
      const cy = Math.min(Math.max(y, lo + radius), hi - radius);
      const corner = Math.hypot(x - cx, y - cy);
      void dx; void dy;
      const inside = (dx === 0 && dy === 0) || corner <= radius;
      if (!inside) continue; // transparent outside the tile
      const t = (x + y) / (2 * size);
      let r = mix(190, 236, t);
      let g = mix(18, 72, t);
      let b = mix(60, 153, t);
      // subtle vertical darkening so the icon does not look flat
      const shade = 0.86 + 0.14 * (1 - y / size);
      r = Math.round(r * shade); g = Math.round(g * shade); b = Math.round(b * shade);
      const ux = (x - size / 2) / (size / 2 - inset);
      const uy = (y - size / 2) / (size / 2 - inset);
      if (inHeart(ux * 1.06, uy * 1.06)) {
        const hl = 1 + 0.12 * (1 - (uy + 1) / 2);
        r = Math.min(255, Math.round(255 * hl));
        g = Math.min(255, Math.round(241 * hl));
        b = Math.min(255, Math.round(245 * hl));
      }
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  return px;
}

fs.mkdirSync(OUT, { recursive: true });
const targets = [
  { name: 'icon-192.png', size: 192, padding: 0 },
  { name: 'icon-512.png', size: 512, padding: 0 },
  { name: 'icon-192-maskable.png', size: 192, padding: 0.09 },
  { name: 'icon-512-maskable.png', size: 512, padding: 0.09 },
  { name: 'apple-touch-icon.png', size: 180, padding: 0 },
];
for (const t of targets) {
  const png = encodePng(t.size, draw({ size: t.size, padding: t.padding }));
  fs.writeFileSync(path.join(OUT, t.name), png);
  console.log(`${t.name} · ${png.length} bytes`);
}
