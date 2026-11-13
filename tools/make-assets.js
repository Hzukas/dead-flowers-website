// Generates the site's custom SVG frames and textures into assets/img/.
// Run with: node tools/make-assets.js
// Each output is a plain SVG file, so a designer can also open and edit them directly.
const fs = require('fs');
const path = require('path');

const IMG = path.join(__dirname, '..', 'assets', 'img');
const FRAMES = path.join(IMG, 'frames');
const TEX = path.join(IMG, 'textures');
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(TEX, { recursive: true });

const C = {
  orange: '#ff6b1a', yellow: '#ffc31f', pink: '#ec3a8c', green: '#46c246', purple: '#7a4bdc',
  cream: '#f3e6c8', ink: '#1d1611', red: '#b8301c', paper: '#efe2c2'
};
const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>\n${body}\n</svg>\n`;
const write = (dir, name, data) => { fs.writeFileSync(path.join(dir, name), data); console.log('wrote', path.relative(path.join(__dirname, '..'), path.join(dir, name))); };

/* ---------- Pinstripe frame (hot rod corner curls), one file per color ----------
   144x144, used as a border-image with slice 48: corners hold the curls, edges are straight lines. */
function pinCorner(color) {
  return `<g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round">
    <path d="M48 .8H16C7.6 .8 .8 7.6 .8 16V48"/>
    <path d="M42 6.5H27C19 6.5 14.5 9.5 14.5 15c0 4.2 3.6 5.6 5.6 3.4 1.6-1.8.6-4.6-1.8-4.4"/>
    <path d="M6.5 42V27C6.5 19 9.5 14.5 15 14.5c4.2 0 5.6 3.6 3.4 5.6-1.8 1.6-4.6.6-4.4-1.8"/>
  </g>
  <circle cx="45.4" cy="6.5" r="1.3" fill="${color}"/>
  <circle cx="6.5" cy="45.4" r="1.3" fill="${color}"/>
  <path d="M7.6 7.6c2.4.5 4.9 2 5.4 4a1.6 1.6 0 0 1-1.4 1.4c-2-.5-3.5-3-4-5.4z" fill="${color}"/>`;
}
function pinFrame(color) {
  const corner = pinCorner(color);
  return svg(144, 144, `<defs><g id="c">${corner}</g></defs>
  <use href="#c"/>
  <use href="#c" transform="translate(144 0) scale(-1 1)"/>
  <use href="#c" transform="translate(0 144) scale(1 -1)"/>
  <use href="#c" transform="translate(144 144) scale(-1 -1)"/>
  <g stroke="${color}" stroke-width="1.6">
    <path d="M48 .8H96M48 143.2H96M.8 48V96M143.2 48V96"/>
  </g>`);
}
for (const name of ['orange', 'yellow', 'pink', 'green', 'cream']) write(FRAMES, `pinstripe-${name}.svg`, pinFrame(C[name]));

/* ---------- Parts catalog border: ink rules with hex-nut corners ----------
   120x120, border-image slice 40. */
function nut(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    pts.push((cx + 12 * Math.cos(a)).toFixed(2) + ',' + (cy + 12 * Math.sin(a)).toFixed(2));
  }
  return `<rect x="${cx - 19}" y="${cy - 19}" width="38" height="38" fill="${C.ink}"/>
  <rect x="${cx - 15.5}" y="${cy - 15.5}" width="31" height="31" fill="none" stroke="${C.red}" stroke-width="1.4"/>
  <polygon points="${pts.join(' ')}" fill="none" stroke="${C.paper}" stroke-width="2.4"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${C.paper}" stroke-width="2.4"/>`;
}
write(FRAMES, 'catalog-frame.svg', svg(120, 120, `<g fill="none">
    <rect x="3" y="3" width="114" height="114" stroke="${C.ink}" stroke-width="6"/>
    <rect x="13" y="13" width="94" height="94" stroke="${C.red}" stroke-width="3"/>
    <rect x="20" y="20" width="80" height="80" stroke="${C.ink}" stroke-width="1.2"/>
  </g>
  ${nut(19, 19)}${nut(101, 19)}${nut(19, 101)}${nut(101, 101)}`));

/* ---------- Merch item frame: double ink rule with clipped corners and rivets ----------
   36x36, border-image slice 12. */
write(FRAMES, 'part-frame.svg', svg(36, 36, `<g fill="none" stroke="${C.ink}">
    <path d="M6 1H30L35 6V30L30 35H6L1 30V6Z" stroke-width="2"/>
    <path d="M8 5H28L31 8V28L28 31H8L5 28V8Z" stroke-width=".8"/>
  </g>
  <g fill="${C.ink}"><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="27.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="27.5" r="1.3"/><circle cx="27.5" cy="27.5" r="1.3"/></g>`));

/* ---------- 35mm film strip frame for photos ----------
   60x60, border-image slice 14 (top/bottom) 8 (sides), repeat round. */
function holes(y) {
  return [11, 33].map(x => `<rect x="${x}" y="${y}" width="8" height="6" rx="1.4"/>`).join('');
}
write(FRAMES, 'filmstrip.svg', svg(60, 60, `<path d="M0 0H60V60H0Z" fill="#17110d"/>
  <g fill="${C.cream}" fill-opacity=".42">${holes(4)}${holes(50)}</g>
  <path d="M8 14H52V46H8Z" fill="#000" fill-opacity=".001"/>`));

/* ---------- Wavy 70s triple stripe divider (tiles left to right) ---------- */
function wave(y, color) {
  return `<path d="M-80 ${y}Q-40 ${y + 8} 0 ${y}T80 ${y}T160 ${y}T240 ${y}" fill="none" stroke="${color}" stroke-width="5"/>`;
}
write(TEX, 'wave-stripes.svg', svg(160, 30, wave(7, C.yellow) + wave(15, C.orange) + wave(23, C.pink)));

/* ---------- Sunburst rays for page headers (rises from the bottom center) ---------- */
(function () {
  const cx = 400, cy = 400, R = 900, n = 36;
  let rays = '';
  for (let i = 0; i < n; i += 2) {
    const a1 = Math.PI + (i / n) * Math.PI, a2 = Math.PI + ((i + 1) / n) * Math.PI;
    rays += `<path d="M${cx} ${cy}L${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)}L${(cx + R * Math.cos(a2)).toFixed(1)} ${(cy + R * Math.sin(a2)).toFixed(1)}Z"/>`;
  }
  write(TEX, 'sunburst.svg', svg(800, 400, `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="400" cy="400" r="560">
      <stop offset="0" stop-color="${C.orange}" stop-opacity=".22"/>
      <stop offset=".45" stop-color="${C.purple}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${C.purple}" stop-opacity="0"/>
    </radialGradient></defs>
  <g fill="url(#g)">${rays}</g>`, ' preserveAspectRatio="xMidYMax slice"'));
})();

/* ---------- Checkered flag strip ---------- */
write(TEX, 'checker.svg', svg(16, 16, `<path d="M0 0H8V8H0ZM8 8H16V16H8Z" fill="${C.cream}"/><path d="M8 0H16V8H8ZM0 8H8V16H0Z" fill="#17110d"/>`));

/* ---------- Film grain (tiles seamlessly) ---------- */
write(TEX, 'grain.svg', svg(240, 240, `<filter id="n" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="240" height="240" filter="url(#n)"/>`));

/* ---------- Aged paper: fine speckle plus soft blotches (tiles seamlessly) ---------- */
write(TEX, 'paper.svg', svg(320, 320, `<filter id="speck" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 .34  0 0 0 0 .24  0 0 0 0 .12  1.6 0 0 0 -.78"/>
  </filter>
  <filter id="blot" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" stitchTiles="stitch" seed="7"/>
    <feColorMatrix values="0 0 0 0 .55  0 0 0 0 .38  0 0 0 0 .16  .9 0 0 0 -.38"/>
  </filter>
  <filter id="fiber" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".004 .35" numOctaves="2" stitchTiles="stitch" seed="3"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.2 0 0 0 -.62"/>
  </filter>
  <rect width="320" height="320" filter="url(#blot)"/>
  <rect width="320" height="320" filter="url(#fiber)"/>
  <rect width="320" height="320" filter="url(#speck)"/>`));

/* ---------- Coffee ring stain for the catalog sheet ---------- */
write(TEX, 'stain.svg', svg(220, 220, `<filter id="w" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="11"/>
    <feDisplacementMap in="SourceGraphic" scale="10"/>
    <feGaussianBlur stdDeviation=".6"/>
  </filter>
  <g filter="url(#w)" fill="none" stroke="#7a4a1c">
    <circle cx="110" cy="110" r="78" stroke-width="5" stroke-opacity=".32"/>
    <circle cx="110" cy="110" r="74" stroke-width="9" stroke-opacity=".08"/>
    <path d="M40 140a76 76 0 0 1 8-70" stroke-width="3" stroke-opacity=".25"/>
  </g>`));
