/* ==========================================================================
   Dead Flowers — animated landing hero ("the melt")
   A live WebGL2 painting: psychedelic liquid pours down the page, the logo
   pushes up out of it in about three seconds, and the paint keeps melting
   and dripping downward around it. No libraries, no build step.

   HOW TO HOOK IT UP
   1. The page needs this markup (index.html already has it):
        <section class="hero">
          <div class="hero-bg"></div>
          <div class="hero-logo"><img class="hero-float" src="assets/img/logo-full.png" ...></div>
        </section>
      The <img> stays in the page. It decides where and how big the logo is,
      and it is what people see if the animation can't run.
   2. Add one line after the other scripts:
        <script src="assets/js/hero-melt.js"></script>
   That is all. The script adds its own styles (only while it is running),
   so the site stylesheet and site.js need no changes.

   WHAT IT DOES ON ITS OWN
   - Waits for the 21+ gate ([data-age-gate]) to be removed before playing.
   - Fills .hero-bg, follows the hero's size, and tracks the logo <img>.
   - Makes the hero nearly a full screen tall and the logo up to 500px wide
     (the first two rules in the style block below; edit them there).
   - Drips hang past the bottom of the hero and fall onto the page below. If the
     monthly deals box (.deals-board) is just under the hero, the drips stretch
     to reach it. To aim them at something else, put data-hero-drip-target on it.
     The canvas ignores the mouse, so everything under the drips stays clickable.
   - Pauses when scrolled out of view or the tab is hidden.
   - Renders fewer pixels by itself on slow devices.
   - "Reduce motion" setting: draws one finished frame, no movement.
   - No WebGL2: does nothing, the plain logo and CSS background remain.

   FILES IT LOADS (made by tools/make-hero-assets.py)
     assets/img/logo-hero.webp   the logo
     assets/img/logo-field.png   blurred logo shape (bulge, shadow, outline)

   Handy in the browser console, or on hero-demo.html:
     DFHero.replay()     play the intro again
     DFHero.seek(1.8)    freeze the intro at 1.8 seconds
     ?herot=1.8          same, from the address bar
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
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  });
  if (!gl) return;

  /* ------------------------------------------------------------------ styles
     Everything the animation needs is added here, so the site stylesheet does not
     have to change. Rules only apply once the hero has the "hero-live" class. */
  var css = document.createElement('style');
  css.setAttribute('data-hero-melt', '');
  css.textContent = [
    '.hero.hero-live{overflow:visible;z-index:2;background:none;min-height:min(calc(100vh - 76px),960px);min-height:min(calc(100svh - 76px),960px);padding:72px 16px 96px}',
    '.hero-live .hero-bg{position:absolute;inset:0;background:none;animation:none;pointer-events:none}',
    '.hero-live .hero-bg::after{display:none}',
    '.hero-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none}',
    '.hero-live .hero-float{width:min(78vw,52vh,500px);width:min(78vw,52svh,500px);opacity:0;animation:none;filter:none}',
    '.hero-live .hero-slot-label{display:none}',
    '.hero-live .hero-scroll{background:rgba(13,10,9,.55);border-color:rgba(243,230,200,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .8s ease 3.2s}',
    '.hero-live.hero-playing .hero-scroll{opacity:1}'
  ].join(' ');
  document.head.appendChild(css);

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
    'uniform float uSpan;',     // canvas height / hero height (the canvas hangs below the hero)
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
    '  vec2 q = p*vec2(2.7,1.35);',
    '  q.y -= uTime*0.085;',
    '  for(float i=1.0;i<10.0;i++){',
    '    q.x += 0.72/i*sin(i*1.9*q.y - uTime*(0.20+0.065*i) + 1.7*i);',
    '    q.y += 0.46/i*cos(i*1.55*q.x + uTime*0.09 + 2.3*i);',
    '  }',
    '  return q.x*0.55 + q.y*0.33 + 0.32*sin(1.3*q.x - 0.7*q.y);',
    '}',

    'void main(){',
    '  vec2 p = vec2(vUv.x*uAspect, (1.0-vUv.y)*uSpan);',
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
    '  float steep = length(gr);',

    '  float c = f*0.78 + 0.09*sin(f*2.1);',
    '  vec3 col = pal(c);',
    '  float edge = abs(fract(c*10.0)-0.5);',
    '  col *= 0.80 + 0.20*smoothstep(0.0, 0.10+steep*0.004, edge);',
    // glossy wet-paint lighting, light from the upper left
    '  vec3 n = normalize(vec3(-gr*0.085, 1.0));',
    '  vec3 L = normalize(vec3(-0.45,-0.60,0.66));',
    '  float diff = clamp(dot(n,L),0.0,1.0);',
    '  float spec = pow(clamp(dot(n, normalize(L+vec3(0.0,0.0,1.0))),0.0,1.0), 42.0);',
    '  col *= 0.50 + 0.72*diff;',
    '  col *= 1.0 - 0.42*smoothstep(7.0, 26.0, steep);',      // dark creases between folds
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
    'uniform float uDripLen;',   // how far the bottom drips hang (reaches the box below the hero)
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
    // Each column collects paint into a bead that oozes down, pinches off and falls.
    // side>0 makes drips longer toward the left and right edges of the page.
    // "thick" comes back as the half-width of the paint at this spot, so thin strands
    // and round drops can be lit as smooth, rounded shapes.
    'float dripSdf(vec2 p, float w, float len, float seed, float t, float ox, float side, float drops, float yEnd, out float thick){',
    // the edge itself slowly swells and sags
    '  float dB = p.y - 0.22*w*sin(p.x/w*1.3+seed*7.0+t*0.35) - 0.1*w*sin(p.x/w*3.1+seed*3.0-t*0.5);',
    '  float d = dB;',
    '  float ci = floor(p.x/w);',
    '  float cd[3]; float cr[3];',
    '  for(int k=0;k<3;k++){',
    '    float id = ci+float(k-1);',
    '    float r1=h11(id+seed*13.7), r2=h11(id*1.31+seed*5.3+2.0), r3=h11(id*2.17+seed*9.1+7.0);',
    '    float cx = (id+0.5+(r1-0.5)*0.5)*w;',
    '    float rad = w*(0.13+0.12*r2);',
    '    float per = 3.6+4.6*r3;',
    '    float ph = fract(t/per + r1*7.0);',
    // Life of one drip: paint collects into a bead, oozes down ever faster,
    // the bead pinches off and falls, the strand springs back, and it starts over.
    '    const float REL = 0.62;',
    '    float g = clamp(ph/REL,0.0,1.0);',
    '    float rel = clamp((ph-REL)/(1.0-REL),0.0,1.0);',
    '    float ooze = mix(g*g*(3.0-2.0*g), g*g, 0.55);',
    '    float ext = ph<REL ? ooze : 1.0-smoothstep(0.0,0.55,rel);',
    '    float sx = abs((cx-ox)/uAspect-0.5)*2.0;',
    '    float Lmax = len*(0.3+0.7*r3*r3)*(r2>0.2?1.0:0.4)*mix(1.0, mix(0.2,1.0,smoothstep(0.3,1.0,sx)), side);',
    '    float L = Lmax*(0.1+0.9*ext);',
    '    vec2 tip = vec2(cx,L);',
    '    float yf = smoothstep(0.0,1.0,p.y/max(L,0.001));',
    '    float neck = rad*mix(1.0,0.58,yf)*(1.0-0.22*ext);',
    // a fat bead of fresh paint slides down the strand
    '    float bt = fract(t/(per*0.55)+r2*3.0);',
    '    float q = (p.y-bt*L)/(rad*1.7);',
    '    neck *= 1.0+0.42*exp(-q*q)*smoothstep(0.0,0.25,bt)*smoothstep(1.0,0.8,bt);',
    '    float dc = sdSeg(p, vec2(cx,-w), tip) - neck;',
    '    float bulb = ph<REL ? rad*(0.8+0.62*smoothstep(0.0,1.0,g))',
    '                        : rad*mix(mix(1.42,0.55,smoothstep(0.0,0.14,rel)), 0.8, smoothstep(0.35,1.0,rel));',
    '    float db = length(p-tip)-bulb;',
    '    float dd = smin(dc, db, rad*0.9);',
    '    float rc = mix(neck, bulb, smoothstep(0.004,-0.004,db-dc));',
    '    if(rel>0.0 && drops>0.5){',
    '      float ft = rel*(1.0-REL)*per;',
    '      float fall = 0.06*ft + 0.85*ft*ft;',
    '      vec2 dq = p - vec2(cx, Lmax + fall);',
    '      dq.y /= 1.0+min(ft*1.8,0.75);',
    // drops from the middle of the top curtain melt away before they reach the logo,
    // and every drop fades out before the bottom of the canvas instead of being cut off
    '      float keep = mix(1.0, mix(1.0-smoothstep(0.03,0.16,fall), 1.0, smoothstep(0.45,0.6,sx)), side);',
    '      keep *= 1.0-smoothstep(yEnd-0.16, yEnd-0.03, Lmax+fall);',
    '      float dr = rad*mix(1.3,0.95,smoothstep(0.0,0.3,ft))*keep;',
    '      if(dr>0.0005){',
    '        float dp = length(dq)-dr;',
    '        rc = mix(rc, dr, smoothstep(0.004,-0.004,dp-dd));',
    '        dd = smin(dd, dp, rad*0.6);',
    '      }',
    '    }',
    '    cd[k] = dd; cr[k] = rc;',
    '    d = smin(d, dd, w*0.2);',
    '  }',
    '  float wB = exp(-max(dB-d,0.0)/0.004);',
    '  float ws = wB, wr = wB*0.08;',
    '  for(int k=0;k<3;k++){ float wk = exp(-max(cd[k]-d,0.0)/0.004); ws += wk; wr += wk*cr[k]; }',
    '  thick = wr/ws;',
    '  return d;',
    '}',

    // Rounded-lip lighting for any paint edge described by a signed distance.
    'vec3 lip(vec3 col, float d, float R, float thick, float amt){',
    '  float hn = clamp(-d/min(R, thick*0.92),0.0,1.0);',
    '  vec2 gd = vec2(dFdx(d), -dFdy(d)); gd /= max(length(gd),1e-6);',
    '  float nd = dot(gd, TOLIGHT);',
    '  float rim = (1.0-hn)*(1.0-hn);',
    '  col *= 1.0 + amt*rim*(nd*0.55-0.42);',
    '  float hl = smoothstep(0.22,0.5,hn)*smoothstep(0.9,0.55,hn)*pow(max(nd,0.0),3.0);',
    '  col += vec3(1.0,0.98,0.95)*hl*0.6*amt;',
    '  return col;',
    '}',

    'void main(){',
    '  vec2 p = vec2(vUv.x*uAspect, (1.0-vUv.y)*uSpan);',
    '  float px = uSpan/uRes.y;',

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
    '  vec3 fl = texture(uFluid, vUv + vec2(refr.x/uAspect, -refr.y/uSpan)).rgb;',
    '  float bump = dot(gN*2.6 + gW*1.1, vec2(0.6,0.8))*uEmboss;',
    '  fl *= 1.0 + clamp(bump,-0.6,0.0)*0.65;',
    '  fl += vec3(1.0,0.97,0.93)*pow(clamp(bump,0.0,1.0),1.7)*0.5;',

    // ---- shadow the risen logo throws on the liquid
    '  float sh = texture(uField, fu - vec2(0.016,0.026)).g;',
    '  fl *= 1.0 - 0.62*uShadow*smoothstep(0.08,0.75,sh);',
    '  fl *= 1.0 - 0.38*uShadow*smoothstep(0.05,0.7,F.g);',

    // ---- paint still covering the logo, draining off top to bottom
    '  float nz = fbm(vec2(l.x*5.2, l.y*1.6 - uIntro*0.22) + 3.0);',
    '  float m = nz*0.9 + l.y - mix(-0.12,1.82,uReveal);',
    '  float cover = smoothstep(0.0,0.035,m);',
    '  float near = smoothstep(0.02,0.35,F.r);',
    '  vec3 paint = lip(fl, -m, 0.2, 1.0, near);',

    '  vec3 col = mix(fl, paint, cover);',
    // cream sticker edge + logo, with the retreating paint shading it
    '  float ol = smoothstep(0.10,0.34,F.r)*(1.0-lg.a)*(1.0-cover);',
    '  col = mix(col, vec3(0.97,0.93,0.82), ol*0.92);',
    '  vec3 lc = lg.rgb*mix(1.0,0.5,smoothstep(-0.16,0.0,m));',
    '  float gband = exp(-pow((l.x+l.y*0.35-uGlint)/0.075,2.0));',
    '  lc += lg.a*gband*vec3(1.0,0.98,0.9)*0.6;',
    '  col = mix(col, col*(1.0-lg.a) + lc, 1.0-cover);',

    // ---- the sheet's own lower edge: drips that hang past the hero and fall onto the page below
    '  vec2 ps = vec2(p.x, p.y-uFront);',
    '  float endS = uSpan-uFront;',
    '  float tS, tS2;',
    '  float dS = dripSdf(ps, 0.125, uDripLen*uStretch, 1.0, uTime, 0.0, 0.0, 1.0, endS, tS);',
    '  float dS2 = dripSdf(ps+vec2(0.37,0.0), 0.052, uDripLen*0.45*uStretch, 2.0, uTime*1.2, 0.0, 0.0, 1.0, endS, tS2);',
    '  tS = mix(tS2, tS, smoothstep(-0.004,0.004,dS2-dS));',
    '  dS = smin(dS, dS2, 0.012);',
    '  col = lip(col, dS, 0.024, tS, 1.2);',
    '  col *= 1.0 - 0.45*smoothstep(-0.005,0.0,dS);',
    '  float alpha = smoothstep(px,-px,dS);',
    // soft shadow the hanging paint throws on whatever is underneath
    '  float shadow = 0.5*exp(-max(dS,0.0)*70.0)*(1.0-alpha);',

    // ---- top curtain of thick paint, longer at the sides, shedding drops
    '  vec2 pc = vec2(p.x+1.7, p.y-uCurtain);',
    '  float endT = uSpan-uCurtain;',
    '  float tT, tT2, tT3;',
    '  float dT = dripSdf(pc, 0.115, uCurtainLen, 5.0, uTime, 1.7, 1.0, 1.0, endT, tT);',
    '  float dT2 = dripSdf(pc+vec2(0.31,0.012), 0.047, uCurtainLen*0.42, 8.0, uTime*1.15, 2.01, 1.0, 1.0, endT, tT2);',
    '  tT = mix(tT2, tT, smoothstep(-0.004,0.004,dT2-dT));',
    '  dT = smin(dT, dT2, 0.012);',
    '  float dTs = dripSdf(pc-vec2(0.012,0.02), 0.115, uCurtainLen, 5.0, uTime, 1.7, 1.0, 1.0, endT, tT3);',
    '  col *= 1.0 - 0.5*smoothstep(0.03,-0.012,dTs);',
    '  vec3 ct = texture(uFluid, vec2(0.83-vUv.x*0.6, 0.9-vUv.y*0.5)).rgb;',
    '  ct = mix(ct, vec3(1.0), 0.10)*1.12;',
    '  ct = lip(ct, dT, 0.03, tT, 1.35);',
    '  ct *= 1.0 - 0.5*smoothstep(-0.006,0.0,dT);',
    '  float cm = smoothstep(px,-px,dT);',
    '  col = mix(col, ct, cm);',
    '  alpha = max(alpha, cm);',

    // ---- finish (the canvas is see-through wherever there is no paint)
    '  vec2 v = (vec2(vUv.x, min(p.y,1.0))-0.5)*vec2(1.05,1.2);',
    '  col *= 1.0 - 0.30*pow(dot(v,v)*2.0,1.6);',
    '  col += (h21(gl_FragCoord.xy + fract(uTime)*91.0)-0.5)*0.035;',
    '  col = clamp(col,0.0,1.0);',
    '  outColor = vec4(col*alpha, alpha + shadow*(1.0-alpha));',
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

  var span = 1;               // canvas height / hero height
  var dripLen = 0.14;         // bottom drip length, in hero heights
  var FRONT_END = 0.965;      // where the sheet's lower edge settles

  function layout() {
    var r = hero.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);

    // The paint hangs past the bottom of the hero. If the monthly deals box (or any
    // element marked data-hero-drip-target) is just below, the drips reach down onto it.
    var over = 120, reach = 0.14 * cssH;
    var target = document.querySelector('[data-hero-drip-target]') || document.querySelector('.deals:not([hidden]) .deals-board');
    if (target) {
      var gap = target.getBoundingClientRect().top - r.bottom;
      if (gap > -1 && gap < 260) { reach = gap + (1 - FRONT_END) * cssH + 64; over = gap + 210; }
    }
    dripLen = Math.min(0.42, reach / cssH);
    var canvasH = cssH + over;
    span = canvasH / cssH;
    canvas.style.height = canvasH + 'px';

    var dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    var maxPixels = 3.4e6;
    var scale = Math.min(dpr, Math.sqrt(maxPixels / (cssW * canvasH)));
    var w = Math.max(2, Math.round(cssW * scale)), h = Math.max(2, Math.round(canvasH * scale));
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
    var front = -0.22 + (FRONT_END + 0.22) * pourE;
    var stretch = 1 + 2.6 * Math.sin(Math.PI * clamp01(tau / 1.7)) * (1 - smooth(1.1, 1.9, tau) * 0.4);
    if (tau >= 1.7) stretch = 1;

    var emboss = smooth(0.45, 1.5, tau) * (1 - 0.45 * smooth(2.2, 3.2, tau));
    var reveal = clamp01((tau - 1.05) / 1.95); reveal = reveal * reveal * (3 - 2 * reveal) * 0.6 + reveal * 0.4;
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
    gl.uniform1f(u.uSpan, span);
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
    gl.uniform1f(u.uSpan, span);
    gl.uniform1f(u.uDripLen, dripLen);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
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
    if (frameCount % 30 === 0) layout();   // the page below can shift (deals appear, fonts load)
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
  var domReady = new Promise(function (resolve) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(resolve, 0); });
    else resolve();
  });
  Promise.all([
    loadTexture('assets/img/logo-field.png', false, false),
    loadTexture('assets/img/logo-hero.webp', true, true),
    domReady
  ]).then(function (tex) {
    fieldTex = tex[0]; logoTex = tex[1];
    bgEl.appendChild(canvas);
    hero.classList.add('hero-live');
    layout();

    if (window.ResizeObserver) new ResizeObserver(function () { layout(); if (reduceMotion) kick(); }).observe(hero);
    window.addEventListener('resize', function () { layout(); if (reduceMotion) kick(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) kick(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) kick(); });
    hero.addEventListener('pointermove', function (ev) {
      var r = hero.getBoundingClientRect();
      var nx = (ev.clientX - r.left) / cssH, ny = (ev.clientY - r.top) / cssH;
      var moved = Math.abs(nx - mouse.tx) + Math.abs(ny - mouse.ty);
      mouse.tx = nx; mouse.ty = ny;
      mouse.tk = Math.min(1, mouse.tk + moved * 6);
    }, { passive: true });
    canvas.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault(); hero.classList.remove('hero-live', 'hero-playing'); canvas.remove();
    });

    if (reduceMotion) { started = true; kick(); return; }
    // Hold the pour until the 21+ gate is out of the way, so nobody misses it.
    var gate = document.querySelector('[data-age-gate]');
    if (gate && window.MutationObserver) {
      draw(0, 20);
      var mo = new MutationObserver(function () {
        if (document.body.contains(gate)) return;
        mo.disconnect(); setTimeout(begin, 250);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      begin();
    }
  }).catch(function (err) {
    console.warn('[hero] textures failed to load; keeping the static logo.', err);
  });

  window.DFHero = {
    replay: function () { frozenAt = null; begin(); },
    seek: function (t, at) { frozenAt = t; if (at != null) clock = at; if (fieldTex) { layout(); draw(t, clock + 20); } kick(); }
  };
})();
