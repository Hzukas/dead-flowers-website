/* ==========================================================================
   Dead Flowers — shared psychedelic paint
   - DFPaint.makeTile(): a seamless 256px tile of marbled paint in the hero's
     colors, used by page-drips.js (the merch page glops).
   (The 21+ gate's black-and-white paint comes from hero-melt.js.)
   Load before page-drips.js. Without canvas support it does nothing.
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

  window.DFPaint = { PALETTE: PALETTE, makeTile: makeTile };
})();
