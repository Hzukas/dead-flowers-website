/* ==========================================================================
   Dead Flowers — animated landing hero ("the melt")
   A live WebGL2 painting: psychedelic liquid pours down the page, the logo
   pushes up out of it in about three seconds, and the paint keeps melting
   and dripping downward around it.

   No libraries. Loads two textures made by tools/make-hero-assets.py:
     assets/img/logo-hero.webp   the logo
     assets/img/logo-field.png   blurred logo shape (bulge, shadow, outline)

   If WebGL2 is missing, the plain logo and CSS background stay in place.
   With "reduce motion" turned on, a single finished frame is drawn.

   Handy in the browser console:
     DFHero.replay()     play the intro again
     DFHero.seek(1.8)    freeze the intro at 1.8 seconds
   ========================================================================== */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;
  var bgEl = hero.querySelector('.hero-bg');
  var logoEl = hero.querySelector('.hero-float');
  if (!bgEl || !logoEl) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  });
  if (!gl) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params = new URLSearchParams(location.search);
  var frozenAt = params.has('herot') ? parseFloat(params.get('herot')) : null;

  /* ---------------------------------------------------------------- shaders */
  var VERT = '#version 300 es\n' +
    'in vec2 aPos; out vec2 vUv;\n' +
    'void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';

  // Shared: where a point sits inside the (bobbing, tilting) logo box.
  var COMMON = [
    'precision highp float;',
    'uniform float uAspect;',
    'uniform vec2 uLogoC;',   // logo centre, in hero-height units, y down
    'uniform vec2 uLogoS;',   // logo size, same units
    'uniform float uRot;',
    'uniform sampler2D uField;',
    'const float FM = 1.5;',  // field margin, matches tools/make-hero-assets.py
    'vec2 logoLocal(vec2 p){',
    '  vec2 d = p - uLogoC; float c = cos(uRot), s = sin(uRot);',
    '  d = vec2(c*d.x + s*d.y, -s*d.x + c*d.y);',
    '  return d/uLogoS + 0.5;',
    '}',
    'vec2 fieldUv(vec2 l){ return (l-0.5)/FM + 0.5; }'
  ].join('\n');

  // Pass A: the liquid itself, drawn at reduced size (it is smooth, so it scales up cleanly).
  var FRAG_FLUID = '#version 300 es\n' + COMMON + '\n' + [
    'in vec2 vUv; out vec4 outColor;',
    'uniform float uTime;',
    'uniform float uPush;',
    'uniform vec3 uMouse;',

    'const vec3 PAL[10] = vec3[10](',
    '  vec3(0.04,0.01,0.22),',   // midnight
    '  vec3(0.05,0.22,1.00),',   // electric blue
    '  vec3(0.00,0.88,0.96),',   // cyan
    '  vec3(0.52,0.10,0.98),',   // violet
    '  vec3(1.00,0.04,0.66),',   // magenta
    '  vec3(1.00,0.12,0.26),',   // hot red
    '  vec3(1.00,0.50,0.02),',   // orange
    '  vec3(1.00,0.93,0.12),',   // yellow
    '  vec3(1.00,0.20,0.72),',   // pink
    '  vec3(0.30,0.02,0.62));',  // deep purple
    'vec3 pal(float x){',
    '  x = fract(x)*10.0; float i = floor(x); float f = x - i;',
    '  f = f*f*(3.0-2.0*f);',
    '  return mix(PAL[int(i)], PAL[int(mod(i+1.0,10.0))], f);',
    '}',

    // Stacked sine warps. Every wave travels toward +y (down the page), each at its own speed,
    // so the whole surface slides and stretches downward like paint under gravity.
    'float flow(vec2 p){',
    '  vec2 q = p*vec2(2.3,1.25);',
    '  q.y -= uTime*0.085;',
    '  for(float i=1.0;i<8.0;i++){',
    '    q.x += 0.72/i*sin(i*1.9*q.y - uTime*(0.20+0.065*i) + 1.7*i);',
    '    q.y += 0.46/i*cos(i*1.55*q.x + uTime*0.09 + 2.3*i);',
    '  }',
    '  return q.x*0.55 + q.y*0.33 + 0.32*sin(1.3*q.x - 0.7*q.y);',
    '}',

    'void main(){',
    '  vec2 p = vec2(vUv.x*uAspect, 1.0-vUv.y);',
    // liquid parts around the logo
    '  vec2 fu = fieldUv(logoLocal(p)); float e = 0.02;',
    '  vec2 g = vec2(texture(uField, fu+vec2(e,0.0)).g - texture(uField, fu-vec2(e,0.0)).g,',
    '                texture(uField, fu+vec2(0.0,e)).g - texture(uField, fu-vec2(0.0,e)).g);',
    '  p += g*uPush*uLogoS.x*1.1;',
    // pointer nudges the surface
    '  vec2 md = p - uMouse.xy; float mr = dot(md,md);',
    '  p += md*uMouse.z*0.35*exp(-mr*26.0);',

    '  float h = 0.0035;',
    '  float f  = flow(p);',
    '  float fx = flow(p+vec2(h,0.0));',
    '  float fy = flow(p+vec2(0.0,h));',
    '  vec2 gr = vec2(fx-f, fy-f)/h;',
    '  float gl_ = length(gr);',

    '  vec3 col = pal(f*0.42 + 0.07*sin(f*2.1));',
    // glossy wet-paint lighting, light from the upper left
    '  vec3 n = normalize(vec3(-gr*0.085, 1.0));',
    '  vec3 L = normalize(vec3(-0.45,-0.60,0.66));',
    '  float diff = clamp(dot(n,L),0.0,1.0);',
    '  float spec = pow(clamp(dot(n, normalize(L+vec3(0.0,0.0,1.0))),0.0,1.0), 42.0);',
    '  col *= 0.50 + 0.72*diff;',
    '  col *= 1.0 - 0.42*smoothstep(7.0, 26.0, gl_);',      // dark creases between folds
    '  col += vec3(1.0,0.96,0.92)*spec*0.34;',
    '  col = mix(vec3(dot(col,vec3(0.299,0.587,0.114))), col, 1.18);',
    '  outColor = vec4(clamp(col,0.0,1.0), 1.0);',
    '}'
  ].join('\n');

  // Pass B: full-resolution composite. Pour front, drips, logo reveal, gloss, grain.
  var FRAG_COMP = '#version 300 es\n' + COMMON + '\n' + [
    'in vec2 vUv; out vec4 outColor;',
    'uniform sampler2D uFluid;',
    'uniform sampler2D uLogoTex;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uIntro;',
    'uniform float uFront;',     // y of the pouring sheet\'s lower edge
    'uniform float uStretch;',   // drips stretch while the sheet is moving
    'uniform float uEmboss;',
    'uniform float uReveal;',
    'uniform float uShadow;',
    'uniform float uGlint;',
    'uniform float uCurtain;',   // y of the top curtain\'s edge
    'uniform float uCurtainLen;',
    'const vec3 BG = vec3(0.051,0.039,0.035);',
    'const vec2 TOLIGHT = vec2(-0.6,-0.8);',

    'float h11(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }',
    'float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x), f.y);',
    '}',
    'float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.0,9.0); a*=0.5; } return s/0.9375; }',
    'float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }',
    'float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }',

    // Signed distance to paint hanging below the line y=0 (y grows downward).
    // Each column grows a drip with a fat bulb; now and then the bulb pinches off and falls.
    // side>0 makes drips longer toward the left and right edges of the page.
    'float dripSdf(vec2 p, float w, float len, float seed, float t, float ox, float side){',
    '  float d = p.y - 0.22*w*sin(p.x/w*1.3+seed*7.0) - 0.1*w*sin(p.x/w*3.1+seed*3.0);',
    '  float ci = floor(p.x/w);',
    '  for(int k=-1;k<=1;k++){',
    '    float id = ci+float(k);',
    '    float r1=h11(id+seed*13.7), r2=h11(id*1.31+seed*5.3+2.0), r3=h11(id*2.17+seed*9.1+7.0);',
    '    float cx = (id+0.5+(r1-0.5)*0.5)*w;',
    '    float rad = w*(0.13+0.12*r2);',
    '    float per = 6.0+9.0*r3;',
    '    float ph = fract(t/per + r1*7.0);',
    '    float rel = clamp((ph-0.7)/0.3,0.0,1.0);',
    '    float grow = smoothstep(0.0,0.7,ph)*(1.0-smoothstep(0.0,1.0,rel));',
    '    float sx = abs((cx-ox)/uAspect-0.5)*2.0;',
    '    float Lmax = len*(0.16+0.84*r3*r3)*(r2>0.22?1.0:0.2)*mix(1.0, mix(0.16,1.0,smoothstep(0.3,1.0,sx)), side);',
    '    float L = Lmax*(0.74+0.26*grow);',
    '    vec2 tip = vec2(cx,L);',
    '    float taper = mix(1.0,0.66,clamp(p.y/max(L,0.001),0.0,1.0));',
    '    float dc = sdSeg(p, vec2(cx,-w), tip) - rad*taper;',
    '    float bulb = rad*(1.08+0.42*grow);',
    '    float dd = smin(dc, length(p-tip)-bulb, rad*0.9);',
    '    if(rel>0.0){',
    '      float ft = rel*0.3*per;',
    '      vec2 dq = p - vec2(cx, Lmax + 0.85*ft*ft);',
    '      dq.y /= 1.0+min(ft*1.6,0.7);',
    '      dd = smin(dd, length(dq)-rad*0.82, rad*0.55);',
    '    }',
    '    d = smin(d, dd, w*0.2);',
    '  }',
    '  return d;',
    '}',

    // Rounded-lip lighting for any paint edge described by a signed distance.
    'vec3 lip(vec3 col, float d, float R, float px, float amt){',
    '  float hn = clamp(-d/R,0.0,1.0);',
    '  vec2 gd = vec2(dFdx(d), -dFdy(d)); gd /= max(length(gd),1e-6);',
    '  float nd = dot(gd, TOLIGHT);',
    '  float rim = (1.0-hn)*(1.0-hn);',
    '  col *= 1.0 + amt*rim*(nd*0.55-0.42);',
    '  float hl = smoothstep(0.22,0.5,hn)*smoothstep(0.9,0.55,hn)*pow(max(nd,0.0),3.0);',
    '  col += vec3(1.0,0.98,0.95)*hl*0.6*amt;',
    '  return col;',
    '}',

    'void main(){',
    '  vec2 p = vec2(vUv.x*uAspect, 1.0-vUv.y);',
    '  float px = 1.0/uRes.y;',

    // ---- logo lookups
    '  vec2 l = logoLocal(p);',
    '  vec2 fu = fieldUv(l);',
    '  vec4 F = texture(uField, fu);',
    '  float e = 0.012;',
    '  vec4 Fx1 = texture(uField, fu+vec2(e,0.0)), Fx0 = texture(uField, fu-vec2(e,0.0));',
    '  vec4 Fy1 = texture(uField, fu+vec2(0.0,e)), Fy0 = texture(uField, fu-vec2(0.0,e));',
    '  vec2 gN = vec2(Fx1.r-Fx0.r, Fy1.r-Fy0.r);',
    '  vec2 gW = vec2(Fx1.g-Fx0.g, Fy1.g-Fy0.g);',
    '  float inBox = step(0.0,l.x)*step(l.x,1.0)*step(0.0,l.y)*step(l.y,1.0);',
    '  vec4 lg = texture(uLogoTex, l)*inBox;',

    // ---- liquid, bulged and lit where the logo presses up underneath it
    '  vec2 refr = (gW*0.10 + gN*0.035)*uEmboss*uLogoS.x;',
    '  vec3 fl = texture(uFluid, vUv + vec2(refr.x/uAspect, -refr.y)).rgb;',
    '  float bump = dot(gN*2.2 + gW*1.6, vec2(0.6,0.8))*uEmboss;',
    '  fl *= 1.0 + clamp(bump,-0.6,0.0)*0.9;',
    '  fl += vec3(1.0,0.97,0.93)*pow(clamp(bump,0.0,1.0),1.5)*0.75;',

    // ---- shadow the risen logo throws on the liquid
    '  float sh = texture(uField, fu - vec2(0.016,0.026)).g;',
    '  fl *= 1.0 - 0.62*uShadow*smoothstep(0.08,0.75,sh);',

    // ---- paint still covering the logo, draining off top to bottom
    '  float nz = fbm(vec2(l.x*5.2, l.y*1.6 - uIntro*0.22) + 3.0);',
    '  float m = nz*0.9 + l.y - mix(-0.35,2.0,uReveal);',
    '  float cover = smoothstep(0.0,0.035,m);',
    '  float near = smoothstep(0.02,0.35,F.r);',
    '  vec3 paint = lip(fl, -m, 0.2, px, near*(1.0-step(1.0,1.0-uReveal+0.0001)*0.0));',

    '  vec3 col = mix(fl, paint, cover);',
    // cream sticker edge + logo, with the retreating paint shading it
    '  float ol = smoothstep(0.10,0.34,F.r)*(1.0-lg.a)*(1.0-cover);',
    '  col = mix(col, vec3(0.97,0.93,0.82), ol*0.92);',
    '  vec3 lc = lg.rgb*mix(1.0,0.5,smoothstep(-0.16,0.0,m));',
    '  float gband = exp(-pow((l.x+l.y*0.35-uGlint)/0.075,2.0));',
    '  lc += lg.a*gband*vec3(1.0,0.98,0.9)*0.6;',
    '  col = mix(col, col*(1.0-lg.a) + lc, 1.0-cover);',

    // ---- top curtain of thick paint, longer at the sides, shedding drops
    '  vec2 pc = vec2(p.x+1.7, p.y-uCurtain);',
    '  float dT = dripSdf(pc, 0.115, uCurtainLen, 5.0, uTime*0.8, 1.7, 1.0);',
    '  dT = smin(dT, dripSdf(pc+vec2(0.31,0.012), 0.047, uCurtainLen*0.42, 8.0, uTime*0.9, 2.01, 1.0), 0.012);',
    '  float dTs = dripSdf(pc-vec2(0.012,0.02), 0.115, uCurtainLen, 5.0, uTime*0.8, 1.7, 1.0);',
    '  col *= 1.0 - 0.5*smoothstep(0.03,-0.012,dTs);',
    '  vec3 ct = texture(uFluid, vec2(vUv.x*0.62+0.19, 0.93-vUv.y*0.45)).gbr;',
    '  ct = mix(ct, texture(uFluid, vec2(vUv.x*0.62+0.19, 0.93-vUv.y*0.45)).rgb, 0.45)*1.12+0.03;',
    '  ct = lip(ct, dT, 0.03, px, 1.35);',
    '  ct *= 1.0 - 0.5*smoothstep(-0.006,0.0,dT);',
    '  col = mix(col, ct, smoothstep(px,-px,dT));',

    // ---- the pouring sheet\'s own dripping lower edge
    '  vec2 ps = vec2(p.x, p.y-uFront);',
    '  float dS = dripSdf(ps, 0.09, 0.085*uStretch, 1.0, uTime, 0.0, 0.0);',
    '  dS = smin(dS, dripSdf(ps+vec2(0.37,0.0), 0.038, 0.045*uStretch, 2.0, uTime*1.1, 0.0, 0.0), 0.01);',
    '  col = lip(col, dS, 0.024, px, 1.2);',
    '  col *= 1.0 - 0.45*smoothstep(-0.005,0.0,dS);',
    '  vec3 base = BG + vec3(0.10,0.02,0.12)*exp(-max(dS,0.0)*22.0);',
    '  col = mix(base, col, smoothstep(px,-px,dS));',

    // ---- finish
    '  vec2 v = (vUv-0.5)*vec2(1.05,1.2);',
    '  col *= 1.0 - 0.30*pow(dot(v,v)*2.0,1.6);',
    '  col += (h21(gl_FragCoord.xy + fract(uTime)*91.0)-0.5)*0.035;',
    '  outColor = vec4(clamp(col,0.0,1.0),1.0);',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------- GL helpers */
  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[hero] shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(fragSrc) {
    var v = compile(gl.VERTEX_SHADER, VERT), f = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[hero] link error:', gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { prog: p, u: u };
  }
  function loadTexture(src, premultiply, mip) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (mip) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        resolve(t);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  var fluidProg = program(FRAG_FLUID);
  var compProg = program(FRAG_COMP);
  if (!fluidProg || !compProg) return;

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var fluidTex = gl.createTexture(), fluidFbo = gl.createFramebuffer();
  var fluidW = 0, fluidH = 0;
  function sizeFluid(w, h) {
    fluidW = w; fluidH = h;
    gl.bindTexture(gl.TEXTURE_2D, fluidTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fluidFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fluidTex, 0);
  }

  /* ----------------------------------------------------------------- layout */
  var quality = 1;            // drops automatically on slow devices
  var cssW = 1, cssH = 1;
  var logoBox = { cx: 0.5, cy: 0.5, w: 0.3, h: 0.36 };

  function layout() {
    var r = bgEl.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    var maxPixels = 3.4e6;
    var scale = Math.min(dpr, Math.sqrt(maxPixels / (cssW * cssH)));
    var w = Math.max(2, Math.round(cssW * scale)), h = Math.max(2, Math.round(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      sizeFluid(Math.max(2, Math.round(w * 0.5)), Math.max(2, Math.round(h * 0.5)));
    }
    // The real <img> stays in the page (invisible) so the layout decides where the logo goes.
    var lr = logoEl.getBoundingClientRect();
    logoBox.w = lr.width / cssH; logoBox.h = lr.height / cssH;
    logoBox.cx = (lr.left + lr.width / 2 - r.left) / cssH;
    logoBox.cy = (lr.top + lr.height / 2 - r.top) / cssH;
  }

  /* --------------------------------------------------------------- timeline */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeOutCubic(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }

  var started = false, startAt = 0, clock = 0, lastNow = 0;
  var mouse = { x: 0, y: 0, k: 0, tx: 0, ty: 0, tk: 0 };

  function draw(tau, time) {
    var aspect = cssW / cssH;

    // Paint pours in from the top, picking up speed like a real spill.
    var pour = clamp01(tau / 1.25);
    var pourE = pour < 0.5 ? 2 * pour * pour : 1 - Math.pow(-2 * pour + 2, 2) / 2;
    var front = -0.22 + (0.905 + 0.22) * pourE;
    var stretch = 1 + 2.6 * Math.sin(Math.PI * clamp01(tau / 1.7)) * (1 - smooth(1.1, 1.9, tau) * 0.4);
    if (tau >= 1.7) stretch = 1;

    var emboss = smooth(0.45, 1.5, tau) * (1 - 0.45 * smooth(2.2, 3.2, tau));
    var reveal = smooth(1.2, 3.0, tau);
    var rise = 0.93 + 0.07 * easeOutCubic((tau - 1.0) / 2.0);
    var settle = smooth(2.6, 4.5, tau);
    var bobY = Math.sin(time * 1.05) * 0.011 * settle;
    var rot = Math.sin(time * 0.52 + 0.6) * 0.016 * settle;

    // A flash of light crosses the logo as it clears, then again every so often.
    var glint = -1;
    var g0 = tau - 2.85;
    if (g0 > 0) { var gp = (g0 % 11) / 0.85; if (gp < 1) glint = -0.35 + 2.0 * gp; }

    var curtain = -0.14 + 0.172 * easeOutCubic((tau - 0.25) / 2.6);
    var curtainLen = 0.30 * smooth(0.5, 4.2, tau);

    mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.k += (mouse.tk - mouse.k) * 0.06; mouse.tk *= 0.96;

    // Pass A: liquid
    gl.bindFramebuffer(gl.FRAMEBUFFER, fluidFbo);
    gl.viewport(0, 0, fluidW, fluidH);
    gl.useProgram(fluidProg.prog);
    var u = fluidProg.u;
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uLogoC, logoBox.cx, logoBox.cy + bobY);
    gl.uniform2f(u.uLogoS, logoBox.w * rise, logoBox.h * rise);
    gl.uniform1f(u.uRot, rot);
    gl.uniform1f(u.uPush, emboss);
    gl.uniform3f(u.uMouse, mouse.x, mouse.y, mouse.k);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.uniform1i(u.uField, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass B: composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(compProg.prog);
    u = compProg.u;
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uIntro, tau);
    gl.uniform2f(u.uLogoC, logoBox.cx, logoBox.cy + bobY);
    gl.uniform2f(u.uLogoS, logoBox.w * rise, logoBox.h * rise);
    gl.uniform1f(u.uRot, rot);
    gl.uniform1f(u.uFront, front);
    gl.uniform1f(u.uStretch, stretch);
    gl.uniform1f(u.uEmboss, emboss);
    gl.uniform1f(u.uReveal, reveal);
    gl.uniform1f(u.uShadow, smooth(1.4, 3.2, tau));
    gl.uniform1f(u.uGlint, glint);
    gl.uniform1f(u.uCurtain, curtain);
    gl.uniform1f(u.uCurtainLen, curtainLen);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fluidTex);
    gl.uniform1i(u.uFluid, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.uniform1i(u.uField, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, logoTex);
    gl.uniform1i(u.uLogoTex, 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ------------------------------------------------------------- frame loop */
  var visible = true, onScreen = true, raf = 0;
  var slowFrames = 0, frameCount = 0;

  function frame(now) {
    raf = 0;
    if (!visible || !onScreen) return;
    var dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    clock += dt;
    var tau = started ? clock - startAt : 0;
    if (frozenAt !== null) tau = frozenAt;
    draw(tau, clock + 20);

    // If the device can't keep up, quietly render fewer pixels.
    frameCount++;
    if (frameCount > 30 && frozenAt === null) {
      if (dt > 0.03) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 25 && quality > 0.45) { quality *= 0.75; slowFrames = 0; layout(); }
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (reduceMotion) { layout(); draw(100, 31); return; }
    if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function begin() {
    started = true; startAt = clock;
    hero.classList.add('hero-playing');
    document.dispatchEvent(new CustomEvent('df:hero-start'));
    kick();
  }

  /* ------------------------------------------------------------------ start */
  var fieldTex, logoTex;
  Promise.all([
    loadTexture('assets/img/logo-field.png', false, false),
    loadTexture('assets/img/logo-hero.webp', true, true)
  ]).then(function (tex) {
    fieldTex = tex[0]; logoTex = tex[1];
    bgEl.classList.remove('placeholder');
    bgEl.appendChild(canvas);
    hero.classList.add('hero-live');
    layout();

    if (window.ResizeObserver) new ResizeObserver(function () { layout(); if (reduceMotion) kick(); }).observe(hero);
    window.addEventListener('resize', function () { layout(); if (reduceMotion) kick(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) kick(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) kick(); });
    hero.addEventListener('pointermove', function (ev) {
      var r = bgEl.getBoundingClientRect();
      var nx = (ev.clientX - r.left) / cssH, ny = (ev.clientY - r.top) / cssH;
      var moved = Math.abs(nx - mouse.tx) + Math.abs(ny - mouse.ty);
      mouse.tx = nx; mouse.ty = ny;
      mouse.tk = Math.min(1, mouse.tk + moved * 6);
    }, { passive: true });
    canvas.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault(); hero.classList.remove('hero-live'); bgEl.classList.add('placeholder'); canvas.remove();
    });

    if (reduceMotion) { started = true; kick(); return; }
    // Hold the pour until the 21+ gate is out of the way, so nobody misses it.
    if (document.querySelector('[data-age-gate]')) {
      draw(0, 20);
      document.addEventListener('df:age-ok', function () { setTimeout(begin, 250); }, { once: true });
    } else {
      begin();
    }
  }).catch(function (err) {
    console.warn('[hero] textures failed to load; keeping the static logo.', err);
  });

  window.DFHero = {
    replay: function () { frozenAt = null; begin(); },
    seek: function (t) { frozenAt = t; kick(); }
  };
})();
