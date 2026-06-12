// Generates build/icon.png — run with: node build/gen-icon.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 1024, H = 1024;
const buf = new Uint8Array(W * H * 4); // RGBA

// ── Helpers ──────────────────────────────────────────────────────────────────
function blend(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  const src = a / 255, dst = buf[i + 3] / 255;
  const out = src + dst * (1 - src);
  if (out === 0) return;
  buf[i]     = Math.round((r * src + buf[i]     * dst * (1 - src)) / out);
  buf[i + 1] = Math.round((g * src + buf[i + 1] * dst * (1 - src)) / out);
  buf[i + 2] = Math.round((b * src + buf[i + 2] * dst * (1 - src)) / out);
  buf[i + 3] = Math.round(out * 255);
}

function inRR(dx, dy, w, h, r) {
  if (dx < 0 || dy < 0 || dx >= w || dy >= h) return false;
  const cornerX = dx < r || dx >= w - r;
  const cornerY = dy < r || dy >= h - r;
  if (!cornerX || !cornerY) return true;
  const cx = dx < r ? r : w - r;
  const cy = dy < r ? r : h - r;
  return (dx - cx) ** 2 + (dy - cy) ** 2 <= r * r;
}

function fillRR(ox, oy, w, h, r, R, G, B, A = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      if (inRR(dx, dy, w, h, r)) blend(ox + dx, oy + dy, R, G, B, A);
}

// ── Background (dark, subtle gradient) ───────────────────────────────────────
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(0x0f + t * 4);
  const g = Math.round(0x10 + t * 3);
  const b = Math.round(0x18 + t * 6);
  for (let x = 0; x < W; x++) blend(x, y, r, g, b);
}

// ── 3 × 3 button grid ────────────────────────────────────────────────────────
const GAP      = 20;
const CELLS    = 3;
const MARGIN   = 118;
const CELL_SZ  = Math.floor((W - 2 * MARGIN - (CELLS - 1) * GAP) / CELLS); // 250
const CELL_R   = 36;

// Per-cell accent tints  (row, col) → [r, g, b]
const TINTS = {
  '0,0': [0x14, 0x24, 0x3a],
  '0,2': [0x20, 0x20, 0x14],
  '1,1': [0xff, 0x3d, 0x8b], // center — main accent
  '2,0': [0x14, 0x22, 0x18],
  '2,2': [0x28, 0x14, 0x30],
};

for (let row = 0; row < CELLS; row++) {
  for (let col = 0; col < CELLS; col++) {
    const cx = MARGIN + col * (CELL_SZ + GAP);
    const cy = MARGIN + row * (CELL_SZ + GAP);
    const key = `${row},${col}`;
    const [R, G, B] = TINTS[key] || [0x1c, 0x1d, 0x2a];
    fillRR(cx, cy, CELL_SZ, CELL_SZ, CELL_R, R, G, B);

    // Subtle top-edge highlight (bevel)
    for (let dx = CELL_R; dx < CELL_SZ - CELL_R; dx++)
      blend(cx + dx, cy + 1, 255, 255, 255, 14);

    // Center cell: soft radial glow
    if (row === 1 && col === 1) {
      const mx = cx + CELL_SZ / 2, my = cy + CELL_SZ / 2;
      const maxD = CELL_SZ * 0.9;
      for (let dy = 0; dy < CELL_SZ; dy++) {
        for (let dx = 0; dx < CELL_SZ; dx++) {
          const d = Math.hypot(dx - CELL_SZ / 2, dy - CELL_SZ / 2);
          if (!inRR(dx, dy, CELL_SZ, CELL_SZ, CELL_R)) continue;
          const glow = Math.max(0, 1 - d / maxD);
          blend(cx + dx, cy + dy, 255, 255, 255, Math.round(glow * glow * 55));
        }
      }
    }
  }
}

// ── Outer glow bleed (ambient light from center cell) ────────────────────────
const gcx = MARGIN + 1 * (CELL_SZ + GAP) + CELL_SZ / 2;
const gcy = MARGIN + 1 * (CELL_SZ + GAP) + CELL_SZ / 2;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - gcx, y - gcy);
    if (d > 380) continue;
    const t = Math.max(0, 1 - d / 380);
    blend(x, y, 0xff, 0x3d, 0x8b, Math.round(t * t * 18));
  }
}

// ── PNG encoder (no deps) ─────────────────────────────────────────────────────
function crc32(b) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(tag, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  Buffer.from(tag).copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.slice(4, 8 + data.length)), 8 + data.length);
  return out;
}
function writePNG(w, h, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (w * 4 + 1) + 1 + x * 4;
      raw[d] = pixels[s]; raw[d+1] = pixels[s+1]; raw[d+2] = pixels[s+2]; raw[d+3] = pixels[s+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir  = path.join(__dirname);
const pngPath = path.join(outDir, 'icon.png');
fs.writeFileSync(pngPath, writePNG(W, H, buf));
console.log('icon.png written:', pngPath);
