/* ==========================================================================
   Dead Flowers — psychedelic paint glops along the page edges
   A few big glops of marbled paint gather at the top of the screen, just under
   the header. Each one swells, stretches, then lets go and falls down the page
   while a new one starts to build in its place.

   HOW TO USE
   - Add data-page-drips to <body> and load this script after site.js
     (and after assets/js/paint.js, which makes the paint texture).
   - Optional: data-drips-frame=".catalog" on <body> names a framed box whose
     left and right borders get a glop each (the merch catalog sheet).
   - Drawn on one fixed canvas under the header, cart, and popups. It ignores
     the mouse, so everything under the paint stays clickable.
   - "Reduce motion": the glops hang still and never fall.
   - In the browser console, DFDrips.finish() draws every glop fully swollen.
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  if (!body || !body.hasAttribute('data-page-drips')) return;

  // The marbled paint texture is shared with the age gate (assets/js/paint.js).
  var tileSrc = window.DFPaint && window.DFPaint.makeTile();
  if (!tileSrc) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'page-drips';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  body.appendChild(canvas);

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pattern = ctx.createPattern(tileSrc, 'repeat');
  var canTransform = typeof pattern.setTransform === 'function' && typeof DOMMatrix === 'function';
  function usePattern(sx, sy, ox, oy) {
    if (canTransform) pattern.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(sx, sy));
    ctx.fillStyle = pattern;
  }

  /* ---------------------------------------------------------------- layout */
  var W = 0, H = 0, dpr = 1, top = 76;
  var spots = [], drops = [];

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var header = document.querySelector('.site-header');
    top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;

    var vw = document.documentElement.clientWidth, narrow = vw < 700;
    var frameSel = body.getAttribute('data-drips-frame');
    var frame = frameSel && document.querySelector(frameSel);
    var fl = 16, fr = vw - 16, border = 0;
    if (frame) {
      var r = frame.getBoundingClientRect();
      fl = r.left; fr = r.right;
      border = parseFloat(getComputedStyle(frame).borderLeftWidth) || 0;
    }
    var margin = Math.max(0, fl);
    var big = narrow ? 18 : 30;   // fully swollen radius

    var places = narrow
      ? [[9, 0.8], [fl + border / 2 + 4, 0.9], [vw - 9, 0.85]]
      : [[margin > 60 ? margin * 0.42 : 14, 1], [fl + border / 2, 0.8], [fr - border / 2, 0.95], [margin > 60 ? vw - margin * 0.45 : vw - 14, 0.7]];

    var old = spots;
    spots = places.map(function (p, i) {
      var prev = old[i];
      return {
        x: p[0], rMax: big * p[1], seed: i * 5.3 + 2,
        grow: prev ? prev.grow : -i * 0.35,   // stagger the first glops
        period: 4.2 + i * 0.9                 // seconds to swell before letting go
      };
    });
  }

  /* ---------------------------------------------------------------- shapes */
  // A glop hanging from a lip of paint at the top: a neck stretching down to a round bead.
  function glopPath(x, r, neck, lipW) {
    var cy = top + neck + r * 0.9;
    var p = new Path2D();
    p.moveTo(x - lipW, top - 2);
    p.bezierCurveTo(x - lipW * 0.45, top + 2, x - r * 0.42, cy - r * 1.1, x - r, cy);
    p.arc(x, cy, r, Math.PI, 0, true);
    p.bezierCurveTo(x + r * 0.42, cy - r * 1.1, x + lipW * 0.45, top + 2, x + lipW, top - 2);
    p.closePath();
    return { path: p, cy: cy };
  }
  // A falling drop: round at the bottom, pointed at the top, stretched by its speed.
  function dropPath(x, y, r, stretch) {
    var p = new Path2D();
    var rx = r * (1 - 0.15 * stretch), ry = r * (1 + 0.35 * stretch);
    var tip = y - ry * (2.2 + stretch);
    p.moveTo(x, tip);
    p.bezierCurveTo(x + rx * 0.35, y - ry * 1.4, x + rx, y - ry * 0.7, x + rx, y);
    p.ellipse(x, y, rx, ry, 0, 0, Math.PI, false);
    p.bezierCurveTo(x - rx, y - ry * 0.7, x - rx * 0.35, y - ry * 1.4, x, tip);
    p.closePath();
    return p;
  }

  function paint(path, x, r, y0, y1, seed, flow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    usePattern(1.6, 1.6, seed * 41, flow);
    ctx.fill(path);
    ctx.restore();
    // Round, glossy body: light on the upper left, shadow on the lower right.
    ctx.save();
    ctx.clip(path);
    var g = ctx.createRadialGradient(x - r * 0.4, y1 - r * 1.3, r * 0.1, x, y1 - r * 0.6, r * 1.8);
    g.addColorStop(0, 'rgba(255,255,255,.4)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(15,0,30,.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y0 - 4, r * 6, y1 - y0 + r * 2 + 8);
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,0,25,.5)'; ctx.lineWidth = 1;
    ctx.stroke(path);
    // Glint.
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y1 - r * 1.35, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------------------------------------------------------------- drawing */
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var flow = still ? 0 : t * 14;

    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (!still) s.grow += dt / s.period;
      var g = still ? 0.75 : Math.max(0, s.grow);
      if (g >= 1) {
        // Let go: the glop falls and a new one starts from the lip.
        drops.push({ x: s.x, y: top + s.rMax * 2.3, v: 40, r: s.rMax * 0.92, seed: s.seed });
        s.grow = -0.25 - Math.random() * 0.5;   // short rest before the next one
        g = 0;
      }
      var e = g * g * (3 - 2 * g);
      var r = s.rMax * (0.28 + 0.72 * e);
      var neck = s.rMax * (0.15 + 1.1 * Math.pow(e, 2.2));   // stretches more as it gets heavy
      var lipW = s.rMax * 0.9 + r * 0.35;
      var gp = glopPath(s.x, r, neck, lipW);
      paint(gp.path, s.x, r, top, gp.cy + r, s.seed, flow);
    }

    for (var k = drops.length - 1; k >= 0; k--) {
      var d = drops[k];
      d.v += 1300 * dt; d.y += d.v * dt;
      if (d.y - d.r * 4 > H) { drops.splice(k, 1); continue; }
      var stretch = Math.min(1, d.v / 1600);
      paint(dropPath(d.x, d.y, d.r, stretch), d.x, d.r, d.y - d.r * 3.5, d.y + d.r, d.seed, flow);
    }
  }

  /* ---------------------------------------------------------------- loop */
  var start = performance.now(), last = start, raf = 0, frames = 0;
  function frame(now) {
    raf = 0;
    var t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (++frames % 60 === 0) layout();   // the header and frame can shift (fonts, images)
    draw(t, dt);
    if (!still && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  window.DFDrips = {
    // Draws every glop fully swollen, plus one drop mid-fall, for checking the look.
    finish: function () {
      layout();
      spots.forEach(function (s) { s.grow = 0.97; });
      if (spots[0]) drops.push({ x: spots[0].x, y: H * 0.6, v: 900, r: spots[0].rMax * 0.92, seed: spots[0].seed });
      draw((performance.now() - start) / 1000, 0);
    }
  };

  layout();
  window.addEventListener('resize', function () { layout(); kick(); });
  window.addEventListener('scroll', function () { if (still) kick(); }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.addEventListener('load', function () { layout(); kick(); });
  kick();
})();
