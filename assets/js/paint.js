/* ==========================================================================
   Dead Flowers — shared psychedelic paint
   - DFPaint.makeTile(): a seamless 256px tile of marbled paint in the hero's
     colors. Used by page-drips.js (merch page) and the age gate below.
   - DFPaint.gate(el): paints the 21+ gate's background into el: a sheet of
     paint across the top with drips hanging down, shown in black and white
     (the grayscale comes from CSS on .age-gate-paint). Stops once el is removed.
   Load before site.js. Without canvas support it does nothing.
   ========================================================================== */
(function () {
  'use strict';

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

  var tile = null;
  function makeTile() {
    if (tile) return tile;
    var S = 256, TAU = Math.PI * 2;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    if (!g) return null;
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
    tile = c;
    return tile;
  }

  /* ---------------------------------------------------------------- age gate */
  function gate(el) {
    var canvas = document.createElement('canvas');
    canvas.className = 'age-gate-paint';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d');
    var src = ctx && makeTile();
    if (!src) return;
    el.insertBefore(canvas, el.firstChild);
    var pattern = ctx.createPattern(src, 'repeat');
    var canTransform = typeof pattern.setTransform === 'function' && typeof DOMMatrix === 'function';
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W, H, dpr, sheet, drips;
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = el.clientWidth || window.innerWidth; H = el.clientHeight || window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      sheet = H * (W < 700 ? 0.2 : 0.26);
      // Drips of mixed widths and lengths along the sheet's lower edge.
      drips = [];
      var count = Math.max(6, Math.round(W / 105)), seed = 1;
      for (var i = 0; i < count; i++) {
        var r1 = frac(Math.sin(++seed * 91.7) * 4375.5), r2 = frac(Math.sin(++seed * 47.3) * 9121.1);
        drips.push({
          x: (i + 0.25 + r1 * 0.5) / count * W,
          w: (W < 700 ? 9 : 13) + r2 * (W < 700 ? 12 : 20),
          len: H * (0.08 + Math.pow(r1 * r2, 0.6) * 0.62),
          seed: i * 3.7 + 1,
          delay: r2 * 1.6,
          speed: 0.35 + r1 * 0.4,
          bead: r1
        });
      }
    }
    function frac(n) { return n - Math.floor(n); }

    function edgeY(x, t) {
      return sheet + 9 * Math.sin(x / 85 + t * 0.35) + 5 * Math.sin(x / 31 + 2.1 - t * 0.25);
    }
    function usePattern(sx, sy, oy) {
      if (canTransform) pattern.setTransform(new DOMMatrix().translateSelf(0, oy).scaleSelf(sx, sy));
      ctx.fillStyle = pattern;
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var flow = still ? 0 : t * 16;
      var x, step = 8;

      // The paint sheet across the top.
      var p = new Path2D();
      p.moveTo(0, -10); p.lineTo(W, -10);
      for (x = W; x >= -step; x -= step) p.lineTo(x, edgeY(x, t));
      p.closePath();

      // Drips hanging off it.
      for (var i = 0; i < drips.length; i++) {
        var d = drips[i];
        var g = still ? 1 : Math.max(0, Math.min(1, (t - d.delay) * d.speed / 1.6));
        g = 1 - Math.pow(1 - g, 3);
        var top = edgeY(d.x, t) - 6, len = d.len * g;
        if (len < 2) continue;
        var bead = d.w * (0.62 + 0.18 * Math.sin(t * 1.3 + d.seed));
        var cx = function (y) { return d.x + 2 * Math.sin(y / 70 + d.seed); };
        var hw = function (y) {
          var k = (y - top) / Math.max(1, len);
          // Wide where it leaves the sheet, narrowing, then swelling into the bead.
          return d.w / 2 * (1 + 0.9 * Math.exp(-k * 7) - 0.22 * k + 0.1 * Math.sin(y / 23 + d.seed));
        };
        // Traced clockwise like the sheet, so the two join instead of cutting holes.
        var end = top + len, y;
        p.moveTo(cx(top) + hw(top), top);
        for (y = top; y < end; y += 6) p.lineTo(cx(y) + hw(y), y);
        p.arc(cx(end), end, Math.max(bead, hw(end)), 0, Math.PI, false);
        for (y = end; y >= top; y -= 6) p.lineTo(cx(y) - hw(y), y);
        p.closePath();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      usePattern(3.2, 4.2, flow);
      ctx.fill(p, 'nonzero');
      ctx.restore();

      // Gloss: a soft sheen down the top and a glint on each bead.
      ctx.save();
      ctx.clip(p);
      var sheen = ctx.createLinearGradient(0, 0, 0, sheet + 20);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.75, 'rgba(255,255,255,.08)');
      sheen.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, W, sheet + 30);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (var j = 0; j < drips.length; j++) {
        var dj = drips[j];
        var gj = still ? 1 : Math.max(0, Math.min(1, (t - dj.delay) * dj.speed / 1.6));
        if (gj < 0.3) continue;
        gj = 1 - Math.pow(1 - gj, 3);
        var ey = edgeY(dj.x, t) - 6 + dj.len * gj, ex = dj.x + 2 * Math.sin(ey / 70 + dj.seed);
        ctx.beginPath();
        ctx.ellipse(ex - dj.w * 0.2, ey - dj.w * 0.15, dj.w * 0.14, dj.w * 0.1, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1;
      ctx.stroke(p);
    }

    var start = performance.now();
    function frame(now) {
      if (!canvas.isConnected) return;   // the gate was closed
      draw((now - start) / 1000);
      if (!still) requestAnimationFrame(frame);
    }
    layout();
    draw(still ? 99 : 0);
    window.addEventListener('resize', function () { if (canvas.isConnected) { layout(); draw((performance.now() - start) / 1000); } });
    if (!still) requestAnimationFrame(frame);

    // For checking in the browser console: DFPaint.gateFinish() draws the drips fully grown.
    window.DFPaint.gateFinish = function () { draw(30); };
  }

  window.DFPaint = { PALETTE: PALETTE, makeTile: makeTile, gate: gate };
})();
