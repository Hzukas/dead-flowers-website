/* ==========================================================================
   Dead Flowers — psychedelic paint drips down the page edges
   A few streams of marbled paint run down the left and right edges of the page
   and collect in a pool at the bottom, just above the footer. Short drips grow
   a bead and let a drop fall into the pool now and then.

   HOW TO USE
   - Add data-page-drips to <body> and load this script after site.js.
   - Optional: data-drips-frame=".catalog" on <body> names a framed box whose
     left and right borders get a drip each (the merch catalog sheet).
   - Drips are drawn on one fixed canvas under the header, cart, and popups.
     It ignores the mouse, so everything under the paint stays clickable.
   - "Reduce motion": the paint is drawn fully grown and holds still.
   - In the browser console, DFDrips.finish() draws the paint fully grown.
   Colors match the animated landing hero (assets/js/hero-melt.js).
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  if (!body || !body.hasAttribute('data-page-drips')) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'page-drips';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  body.appendChild(canvas);

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- texture
     A seamless 256px tile of marbled psychedelic paint, made once. */
  var PALETTE = [
    [13, 56, 255],   // electric blue
    [0, 224, 245],   // cyan
    [133, 26, 250],  // violet
    [255, 10, 168],  // magenta
    [255, 31, 66],   // hot red
    [255, 128, 5],   // orange
    [255, 237, 31],  // yellow
    [255, 51, 184],  // pink
    [77, 5, 158]     // deep purple
  ];
  function makeTile() {
    var S = 256, TAU = Math.PI * 2;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var img = g.createImageData(S, S), d = img.data, P = PALETTE.length;
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var u = x / S * TAU, v = y / S * TAU;
        var w1 = Math.sin(u + 1.7 * Math.sin(v + 0.5));
        var w2 = Math.sin(2 * v + 1.3 * Math.sin(2 * u + 2.1) + 1.2 * w1);
        var val = Math.sin(2 * u + v + 2.2 * w2 + 1.4 * w1) * 0.5 + 0.5;
        var t = (val * 1.6 + w1 * 0.15 + 2) % 1;
        var f = t * P, i = Math.floor(f) % P, k = f - Math.floor(f);
        k = k * k * (3 - 2 * k);
        var a = PALETTE[i], b = PALETTE[(i + 1) % P];
        var shade = 0.86 + 0.14 * Math.sin(3 * u + 2 * v + 3 * w2);
        var o = (y * S + x) * 4;
        d[o] = (a[0] + (b[0] - a[0]) * k) * shade;
        d[o + 1] = (a[1] + (b[1] - a[1]) * k) * shade;
        d[o + 2] = (a[2] + (b[2] - a[2]) * k) * shade;
        d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  var pattern = ctx.createPattern(makeTile(), 'repeat');
  var canTransform = pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix === 'function';

  function usePattern(sx, sy, ox, oy) {
    if (canTransform) pattern.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(sx, sy));
    ctx.fillStyle = pattern;
  }

  /* ---------------------------------------------------------------- layout
     Everything is placed in page coordinates and redrawn as the page scrolls. */
  var W = 0, H = 0, dpr = 1;
  var top = 0, poolTop = 0, poolBottom = 0, poolH = 60;
  var drips = [], drops = [], ripples = [];

  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    var main = document.querySelector('main') || body;
    var footer = document.querySelector('.site-footer');
    var vw = document.documentElement.clientWidth;
    var narrow = vw < 700;
    top = docTop(main);
    poolBottom = footer ? docTop(footer) : document.documentElement.scrollHeight;
    poolH = narrow ? 46 : 64;
    poolTop = poolBottom - poolH;

    // The framed box (merch catalog) and how thick its border is.
    var frameSel = body.getAttribute('data-drips-frame');
    var frame = frameSel && document.querySelector(frameSel);
    var fl = 16, fr = vw - 16, border = 0;
    if (frame) {
      var r = frame.getBoundingClientRect();
      fl = r.left; fr = r.right;
      border = parseFloat(getComputedStyle(frame).borderLeftWidth) || 0;
    }
    var margin = Math.max(0, fl);
    var reach = poolTop + 6 - top;   // a full-length stream ends in the pool

    var old = drips;
    drips = [];
    function add(i, x, w, len, seed, delay) {
      var prev = old[i];
      drips.push({
        x: x, w: w, len: len, seed: seed, delay: delay,
        full: len >= reach,
        grown: prev ? prev.grown : 0,
        bead: prev ? prev.bead : Math.random(),
        period: 6 + (seed % 5)
      });
    }
    var edgeL = margin > 44 ? margin * 0.38 : 7;
    var edgeR = margin > 44 ? vw - margin * 0.5 : vw - 7;
    var midL = frame ? fl + border / 2 : 18;
    var midR = frame ? fr - border / 2 : vw - 18;
    if (narrow) {
      add(0, edgeL + 2, 11, reach, 3, 0.2);
      add(1, midL + 4, 8, Math.max(160, reach * 0.22), 7, 1.1);
      add(2, edgeR - 2, 10, reach, 11, 0.6);
    } else {
      add(0, edgeL, 24, reach, 3, 0.2);                        // long, left page edge
      add(1, midL, Math.min(15, border * 0.6 || 15), reach * 0.3, 7, 1.0);    // short, over the frame
      add(2, midR, Math.min(17, border * 0.65 || 17), reach, 11, 0.6);        // long, over the frame
      add(3, edgeR, 12, reach * 0.55, 13, 1.6);                // medium, right page edge
    }
  }

  /* ---------------------------------------------------------------- shapes */
  function widthAt(d, y) {
    // Slow swells (paint bellies) plus small ripples so the stream looks poured, not drawn.
    return d.w * (1 + 0.26 * Math.sin(y / 110 + d.seed) + 0.12 * Math.sin(y / 31 + d.seed * 2)
      + 0.18 * Math.max(0, Math.sin(y / 260 + d.seed * 3)));
  }
  function centerAt(d, y) { return d.x + 2.5 * Math.sin(y / 140 + d.seed); }

  // Outline of one stream from the top of the page to yEnd, with a round bead at the end.
  function streamPath(d, y0, yEnd, beadR, viewTop, viewBot) {
    var p = new Path2D();
    var a = Math.max(y0, viewTop - 40), b = Math.min(yEnd, viewBot + 40);
    if (b <= a) return null;
    var step = 10, y, left = [], right = [];
    for (y = a; y < b; y += step) {
      var hw = widthAt(d, y) / 2, cx = centerAt(d, y);
      left.push([cx - hw, y]); right.push([cx + hw, y]);
    }
    var cxE = centerAt(d, b), hwE = widthAt(d, b) / 2;
    left.push([cxE - hwE, b]); right.push([cxE + hwE, b]);
    p.moveTo(left[0][0], left[0][1]);
    for (var i = 1; i < left.length; i++) p.lineTo(left[i][0], left[i][1]);
    if (b === yEnd && beadR > 0) {
      p.arc(cxE, yEnd, Math.max(beadR, hwE), Math.PI, 0, true);
    }
    for (var j = right.length - 1; j >= 0; j--) p.lineTo(right[j][0], right[j][1]);
    p.closePath();
    // A blob where the paint seeps in under the header.
    if (y0 >= a - 1) p.ellipse(centerAt(d, y0), y0, d.w * 1.1, d.w * 0.75, 0, 0, Math.PI * 2);
    return p;
  }

  function poolSurface(x, t) {
    var y = poolTop + 8 + 5 * Math.sin(x / 90 + t * 0.5) + 3 * Math.sin(x / 37 + 1.3 - t * 0.35);
    // The surface swells where a stream pours in.
    for (var i = 0; i < drips.length; i++) {
      var d = drips[i];
      if (!d.full || d.grown < 0.98) continue;
      var dx = (x - d.x) / (d.w * 2.4);
      y -= 12 * Math.exp(-dx * dx);
    }
    return y;
  }

  /* ---------------------------------------------------------------- drawing */
  function shade(path, d, y0, y1, flowY) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    usePattern(2.2, 5, d.seed * 37, flowY);
    ctx.fill(path);
    ctx.restore();
    // Rounded look: light on the left, shadow on the right.
    ctx.save();
    ctx.clip(path);
    var g = ctx.createLinearGradient(d.x - d.w, 0, d.x + d.w, 0);
    g.addColorStop(0.18, 'rgba(255,255,255,.34)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0)');
    g.addColorStop(0.95, 'rgba(20,0,30,.45)');
    ctx.fillStyle = g;
    ctx.fillRect(d.x - d.w * 1.6, y0 - d.w, d.w * 3.2, y1 - y0 + d.w * 3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,0,25,.5)'; ctx.lineWidth = 1;
    ctx.stroke(path);
  }

  function gloss(x, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.3, r * 0.26, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(t, dt) {
    var sy = window.scrollY;
    var viewTop = sy, viewBot = sy + H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(0, -sy);
    var flowY = reduceMotion ? 0 : t * 22;

    for (var i = 0; i < drips.length; i++) {
      var d = drips[i];
      if (!reduceMotion) d.grown = Math.min(1, d.grown + Math.max(0, dt) / (d.full ? 4.5 : 2.6) * (t > d.delay ? 1 : 0));
      else d.grown = 1;
      var e = 1 - Math.pow(1 - d.grown, 3);
      var yEnd = top + d.len * e;
      var beadR = 0;
      if (!d.full || d.grown < 1) {
        // The bead swells, then lets go of a drop that falls into the pool.
        if (!reduceMotion && d.grown >= 1) {
          d.bead += dt / d.period;
          if (d.bead >= 1) {
            d.bead = 0;
            drops.push({ d: d, x: centerAt(d, yEnd), y: yEnd + d.w * 0.6, v: 60, r: d.w * 0.62 });
          }
        }
        beadR = d.w * (0.8 + 0.5 * (d.grown >= 1 ? d.bead : 0.5));
      }
      var path = streamPath(d, top, yEnd, beadR, viewTop, viewBot);
      if (path) {
        shade(path, d, Math.max(top, viewTop - 40), Math.min(yEnd, viewBot + 40), flowY);
        if (beadR && yEnd > viewTop - 40 && yEnd < viewBot + 40) gloss(centerAt(d, yEnd), yEnd, beadR);
      }
    }

    // Falling drops.
    for (var k = drops.length - 1; k >= 0; k--) {
      var p = drops[k];
      p.v += 1500 * dt; p.y += p.v * dt;
      var surf = poolSurface(p.x, t);
      if (p.y >= surf) {
        ripples.push({ x: p.x, t0: t });
        drops.splice(k, 1);
        continue;
      }
      if (p.y < viewTop - 40 || p.y > viewBot + 40) continue;
      var dp = new Path2D();
      dp.ellipse(p.x, p.y, p.r, p.r * 1.25, 0, 0, Math.PI * 2);
      dp.moveTo(p.x - p.r * 0.5, p.y - p.r);
      dp.quadraticCurveTo(p.x, p.y - p.r * 2.6, p.x + p.r * 0.5, p.y - p.r);
      shade(dp, { x: p.x, w: p.r * 2, seed: p.d.seed }, p.y - p.r * 3, p.y + p.r, flowY);
      gloss(p.x, p.y, p.r);
    }

    // The pool at the bottom of the page.
    if (poolBottom > viewTop && poolTop - 30 < viewBot) {
      var pool = new Path2D(), x, step = 8;
      pool.moveTo(0, poolBottom);
      for (x = 0; x <= W + step; x += step) pool.lineTo(x, poolSurface(x, t));
      pool.lineTo(W, poolBottom);
      pool.closePath();
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = -2;
      usePattern(4, 1.6, reduceMotion ? 0 : t * 9, poolTop);
      ctx.fill(pool);
      ctx.restore();
      // Depth: darker toward the bottom.
      ctx.save();
      ctx.clip(pool);
      var g = ctx.createLinearGradient(0, poolTop, 0, poolBottom);
      g.addColorStop(0, 'rgba(255,255,255,.12)');
      g.addColorStop(0.35, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(10,0,20,.5)');
      ctx.fillStyle = g;
      ctx.fillRect(0, poolTop - 30, W, poolH + 30);
      // Ripples where drops land.
      for (var q = ripples.length - 1; q >= 0; q--) {
        var rp = ripples[q], age = t - rp.t0;
        if (age > 1.4) { ripples.splice(q, 1); continue; }
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - age / 1.4)).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(rp.x, poolSurface(rp.x, t) + 7, 6 + age * 46, 2 + age * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // Shine along the surface.
      ctx.beginPath();
      for (x = 0; x <= W + step; x += step) {
        var yy = poolSurface(x, t) + 2;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /* ---------------------------------------------------------------- loop */
  var start = performance.now(), last = start, raf = 0, frames = 0;
  function frame(now) {
    raf = 0;
    var t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (++frames % 60 === 0) layout();   // the page can shift (fonts, images, cart)
    draw(t, dt);
    if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  // For checking in the browser console: DFDrips.finish() draws the paint fully grown.
  window.DFDrips = {
    finish: function () {
      layout();
      drips.forEach(function (d) { d.grown = 1; });
      draw((performance.now() - start) / 1000, 0);
    }
  };

  layout();
  window.addEventListener('resize', function () { layout(); kick(); });
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.addEventListener('load', function () { layout(); kick(); });
  kick();
})();
