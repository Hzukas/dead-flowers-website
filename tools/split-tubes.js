/*
  Split a lineup photo of doob tubes into one PNG per tube.

  Usage:
    node tools/split-tubes.js "<image>" [count] [out-dir] [--transparent]

  - Detects the background color from the image corners, finds the columns
    that contain a tube, and crops each one tightly with a little padding.
  - If [count] is given and auto-detection finds a different number of tubes,
    the image is split into [count] equal columns instead and each is cropped.
  - Crops keep the photo's own background. The carousel stage is black, so
    product shots on black blend straight in. --transparent knocks out the
    background instead; use it only when the tubes clearly contrast with the
    backdrop (a black tube on black has no edge to find and goes see-through).
  - Output goes to joint-program/labels/ by default, named
    <image-name>-1.png, <image-name>-2.png, ...
*/
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [file, countArg, outArg] = args;
const TRANSPARENT = flags.includes('--transparent');
if (!file) {
  console.error('Usage: node tools/split-tubes.js "<image>" [count] [out-dir] [--transparent]');
  process.exit(1);
}
const wanted = countArg ? Number(countArg) : 0;
const outDir = outArg || path.join(__dirname, '..', 'joint-program', 'labels');
const base = path.basename(file).replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const DIST_FG = 70;      // how far from the background a pixel must be to count as "tube"
const MIN_COL_INK = 3;   // pixels per column before the column counts as occupied
const MERGE_GAP = 6;     // columns of gap to bridge inside one tube (reflections, thin spots)
const MIN_WIDTH = 20;    // ignore specks narrower than this
const PAD = 0.04;        // padding around each crop, as a fraction of crop size
const MAX_H = 1200;      // crops taller than this are scaled down for the web
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

(async () => {
  const img = await loadImage(file);
  let W = img.width, H = img.height;
  let cv = createCanvas(W, H);
  let ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  let px = ctx.getImageData(0, 0, W, H).data;

  // Background = median of the four corner patches.
  function cornerColor() {
    const samples = [];
    const patch = Math.max(4, Math.round(Math.min(W, H) * 0.02));
    for (const [x0, y0] of [[0, 0], [W - patch, 0], [0, H - patch], [W - patch, H - patch]]) {
      for (let y = y0; y < y0 + patch; y++) for (let x = x0; x < x0 + patch; x++) {
        const i = (y * W + x) * 4; samples.push([px[i], px[i + 1], px[i + 2]]);
      }
    }
    const med = k => samples.map(s => s[k]).sort((a, b) => a - b)[samples.length >> 1];
    const color = [med(0), med(1), med(2)];
    // How many corner pixels sit close to that color? Real backgrounds are uniform;
    // tube caps or artwork in the corners are not.
    const agree = samples.filter(s => Math.max(...s.map((v, k) => Math.abs(v - color[k]))) <= 24).length / samples.length;
    color.uniform = agree > 0.9;
    return color;
  }
  let bg = cornerColor();
  const dist = i => Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]));

  // Peel outer margins: a photo may be a dark panel sitting on a white page
  // (or the reverse). Crop to the non-background area, then re-read the
  // corners. Repeat while the background color keeps changing.
  for (let pass = 0; pass < 3; pass++) {
    let minX = W, maxX = -1, minY = H, maxY = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (dist((y * W + x) * 4) > DIST_FG) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) break;
    const inset = 2; // step inside the panel edge so its border doesn't read as background
    const nx0 = Math.min(minX + inset, W - 1), ny0 = Math.min(minY + inset, H - 1);
    const nW = Math.max(1, maxX - minX + 1 - inset * 2), nH = Math.max(1, maxY - minY + 1 - inset * 2);
    if (nW >= W - 4 && nH >= H - 4) break; // nothing to peel
    const sub = ctx.getImageData(nx0, ny0, nW, nH);
    // Only commit the peel if the inner corners show a different background;
    // otherwise this box is just the tubes themselves and must stay uncropped.
    const saved = { W, H, px, bg };
    W = nW; H = nH; px = sub.data;
    const nbg = cornerColor();
    const changed = Math.max(...nbg.map((v, k) => Math.abs(v - bg[k]))) > DIST_FG;
    if (!changed || !nbg.uniform) { ({ W, H, px, bg } = saved); break; }
    cv = createCanvas(W, H); ctx = cv.getContext('2d'); ctx.putImageData(sub, 0, 0);
    bg = nbg;
    console.log(`peeled outer margin to ${W}x${H}; inner background rgb(${nbg.join(',')})`);
  }

  // Column occupancy.
  const colInk = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dist((y * W + x) * 4) > DIST_FG) colInk[x]++;

  let runs = [];
  let start = -1, gap = 0;
  for (let x = 0; x <= W; x++) {
    const on = x < W && colInk[x] >= MIN_COL_INK;
    if (on) { if (start < 0) start = x; gap = 0; }
    else if (start >= 0) {
      gap++;
      if (gap > MERGE_GAP || x === W) { runs.push([start, x - gap]); start = -1; gap = 0; }
    }
  }
  runs = runs.filter(([a, b]) => b - a >= MIN_WIDTH);
  console.log(`background rgb(${bg.join(',')}); detected ${runs.length} tube column(s)` + (wanted ? `, expected ${wanted}` : ''));

  let segments;
  if (wanted && runs.length !== wanted) {
    console.log(`falling back to ${wanted} equal columns`);
    const w = W / wanted;
    segments = Array.from({ length: wanted }, (_, i) => [Math.round(i * w), Math.round((i + 1) * w)]);
  } else {
    segments = runs;
  }
  if (!segments.length) { console.error('no tubes found'); process.exit(2); }

  // Which background pixels are reachable from the photo edge? Only those become
  // transparent, so a black tube body on a black background stays solid.
  const outside = new Uint8Array(W * H);
  {
    const stack = [];
    const push = (x, y) => { const k = y * W + x; if (!outside[k] && dist(k * 4) <= DIST_FG) { outside[k] = 1; stack.push(k); } };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (stack.length) {
      const k = stack.pop(), x = k % W, y = (k - x) / W;
      if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  segments.forEach(([x0, x1], n) => {
    // Tight bounding box inside the segment.
    let minX = x1, maxX = x0, minY = H, maxY = 0;
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
      if (dist((y * W + x) * 4) > DIST_FG) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX) { console.log(`segment ${n + 1}: empty, skipped`); return; }
    // Padding is added as transparent margin, so it is never clipped by the photo edge.
    const padX = Math.round((maxX - minX) * PAD * 2), padY = Math.round((maxY - minY) * PAD);
    const cx0 = minX - padX, cy0 = minY - padY;
    const cx1 = maxX + padX + 1, cy1 = maxY + padY + 1;
    const cw = cx1 - cx0, ch = cy1 - cy0;

    const out = createCanvas(cw, ch);
    const octx = out.getContext('2d');
    const id = octx.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const sx = cx0 + x, sy = cy0 + y, di = (y * cw + x) * 4;
      if (sx < x0 || sx >= x1 || sy < 0 || sy >= H) {
        // Outside the photo or the segment: fill with the background color.
        id.data[di] = bg[0]; id.data[di + 1] = bg[1]; id.data[di + 2] = bg[2];
        id.data[di + 3] = TRANSPARENT ? 0 : 255;
        continue;
      }
      const si = (sy * W + sx) * 4;
      id.data[di] = px[si]; id.data[di + 1] = px[si + 1]; id.data[di + 2] = px[si + 2];
      // With --transparent, edge-connected background fades out; soft edges and glow keep partial alpha.
      id.data[di + 3] = (TRANSPARENT && outside[sy * W + sx]) ? Math.round((dist(si) / DIST_FG) * 255) : 255;
    }
    octx.putImageData(id, 0, 0);
    let final = out;
    if (ch > MAX_H) {
      const s = MAX_H / ch;
      final = createCanvas(Math.round(cw * s), MAX_H);
      final.getContext('2d').drawImage(out, 0, 0, final.width, final.height);
    }
    const outFile = path.join(outDir, `${base}-${n + 1}.png`);
    fs.writeFileSync(outFile, final.toBuffer('image/png'));
    console.log(`tube ${n + 1}: x ${cx0}-${cx1}, y ${cy0}-${cy1} -> ${path.relative(process.cwd(), outFile)} (${final.width}x${final.height}, bg ${hex(bg)})`);
  });
})().catch(e => { console.error(e); process.exit(1); });
