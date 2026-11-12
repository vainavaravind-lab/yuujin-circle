// Generates public/pwa-192.png, public/pwa-512.png, public/apple-touch-icon.png
// Yuujin Circle mark ONLY (no wordmark): teal→cyan open arc with endpoint dot
// and fading trail, on a navy rounded tile. Zero dependencies — hand-encoded PNG.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// --- Yuujin Circle geometry (normalized 0..1 coords, y down) ---
const BG = [11, 22, 31];            // #0b161f navy tile
const TEAL = [18, 165, 165];        // #12A5A5 gradient start (top-left)
const CYAN = [54, 215, 244];        // #36D7F4 gradient end (bottom-right)
const CX = 0.5, CY = 0.5;
const ARC_R = 170 / 512;            // arc radius
const HALF = 20 / 512;              // half stroke width
const CORNER = 112 / 512;           // tile corner radius
const DEG = Math.PI / 180;
// angle ranges measured y-down from +x axis: gap = (282..360)∪(0..15) upper-right
const ARC_A0 = 15, ARC_A1 = 282;
const pt = (deg, r = ARC_R) => [CX + r * Math.cos(deg * DEG), CY + r * Math.sin(deg * DEG)];
const DOT = { ...pt(15), r: 27.2 / 512 };
const TRAIL = [
  { ...pt(344), r: 12.8 / 512, a: 0.6 },
  { ...pt(322), r: 10.0 / 512, a: 0.42 },
  { ...pt(300), r: 7.5 / 512, a: 0.28 },
];

function inTile(fx, fy) {
  const rx = Math.max(CORNER - fx, fx - (1 - CORNER), 0);
  const ry = Math.max(CORNER - fy, fy - (1 - CORNER), 0);
  return Math.hypot(rx, ry) - CORNER < 0;
}
function inArc(fx, fy) {
  const d = Math.hypot(fx - CX, fy - CY);
  if (Math.abs(d - ARC_R) >= HALF) return false;
  let a = (Math.atan2(fy - CY, fx - CX) / DEG + 360) % 360;
  return a >= ARC_A0 && a <= ARC_A1;
}
const inDot = (fx, fy) => Math.hypot(fx - DOT.x, fy - DOT.y) < DOT.r;
const inTrail = (fx, fy) => TRAIL.find((t) => Math.hypot(fx - t.x, fy - t.y) < t.r);
const mix = (c1, c2, t) => c1.map((v, i) => v + (c2[i] - v) * t);
// gradient sample: teal (top-left) → cyan (bottom-right)
const grad = (fx, fy) => mix(TEAL, CYAN, Math.min(1, Math.max(0, (fx + fy - 0.35) / 0.8)));

function render(size) {
  const S = 4; // supersample
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0, cr = 0, cg = 0, cb = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = (x + (sx + 0.5) / S) / size;
          const fy = (y + (sy + 0.5) / S) / size;
          if (!inTile(fx, fy)) continue;
          cov++;
          let col = BG;
          const trail = inTrail(fx, fy);
          if (trail) col = mix(BG, CYAN, trail.a);
          if (inArc(fx, fy)) col = grad(fx, fy);
          if (inDot(fx, fy)) col = CYAN;
          cr += col[0]; cg += col[1]; cb += col[2];
        }
      }
      const i = (y * size + x) * 4;
      if (cov === 0) {
        px[i + 3] = 0; // transparent outside the rounded tile
      } else {
        px[i] = Math.round(cr / cov);
        px[i + 1] = Math.round(cg / cov);
        px[i + 2] = Math.round(cb / cov);
        px[i + 3] = Math.round((255 * cov) / (S * S));
      }
    }
  }
  return px;
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`public/${name}`, encodePNG(size, size, render(size)));
  console.log('wrote', `public/${name}`);
}
