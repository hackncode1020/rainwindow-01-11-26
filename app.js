/* Rainy Window 🌧️❤️ by @hack.n.code (Day 6/100)
   WebGL rain-on-glass + a fog layer you can write in. No libraries. */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const DEMO = Q.has('demo'), REC = Q.has('rec');
const NAME = (Q.get('name') || '').replace(/[<>]/g, '').trim().slice(0, 16);
const $ = s => document.querySelector(s);
const cv = $('#gl');
const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: 'high-performance' });

/* ---------- story timeline (seconds after the tap) ---------- */
const T = {
  rain: 0, fog: 3.5, heart: 6.5, write: 11.0, fade1: 17.6, flash: 20.2, fade2: 25.8,
  write2: 27.8, fade3: 33.8, final: 35.8, words: 41.0, buttons: 42.6, done: 43.4
};
const CAPS = [
  ['it’s raining tonight 🌧️', 0.3, 3.3],
  ['the window fogs up…', 3.6, 6.4],
  ['so I drew something ❤️', 6.8, 10.8],
  ['…but the fog always comes back', 17.8, 20.0],
  ['⚡ a flash… and the glass remembers', 21.0, 25.6],
  ['one more for you…', 34.0, 35.8],
];
const LINES = {
  write: ['I’d wait in', 'every rain', 'for you'],
  hidden: ['you’re my calm', 'in every storm'],
  write2: ['rain or shine,', 'it’s always you'],
  final: [NAME ? 'forever, ' + NAME : 'forever.'],
};

/* ---------- canvases ---------- */
let W = 0, H = 0, FW = 0, FH = 0, PR = 1;
const fogC = document.createElement('canvas'), fx = fogC.getContext('2d', { willReadFrequently: false });
const glowC = document.createElement('canvas'), gx = glowC.getContext('2d');
const bgC = document.createElement('canvas'), bgB = document.createElement('canvas');
let masks = {}, heartA = null, heartB = null, drips = [];

function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------- the city behind the glass ---------- */
function paintCity() {
  bgC.width = W; bgC.height = H; bgB.width = W; bgB.height = H;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const R = rnd(20261101);
  let g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070a1d'); g.addColorStop(.38, '#141432'); g.addColorStop(.62, '#2a1631'); g.addColorStop(.8, '#3a1a26'); g.addColorStop(1, '#170b14');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // skyline glow
  g = x.createRadialGradient(W * .5, H * .62, 0, W * .5, H * .62, H * .55);
  g.addColorStop(0, 'rgba(255,120,90,.30)'); g.addColorStop(.5, 'rgba(160,60,120,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // buildings + windows
  const u = Math.min(W, H * .6);
  for (let i = 0; i < 26; i++) {
    const bw = u * (.08 + R() * .16), bx = R() * W - bw * .3, top = H * (.22 + R() * .32), bot = H * .78;
    x.fillStyle = `rgba(${8 + R() * 14 | 0},${8 + R() * 10 | 0},${20 + R() * 20 | 0},${.75 + R() * .25})`;
    x.fillRect(bx, top, bw, bot - top);
    const ww = u * .012, wh = u * .016;
    for (let yy = top + wh; yy < bot - wh; yy += wh * 2.1) for (let xx = bx + ww; xx < bx + bw - ww; xx += ww * 2.2) {
      if (R() < .42) { const k = R(); x.fillStyle = k < .7 ? `rgba(255,${190 + R() * 50 | 0},${110 + R() * 60 | 0},${.45 + R() * .5})` : `rgba(160,200,255,${.35 + R() * .4})`; x.fillRect(xx, yy, ww, wh); }
    }
  }
  // street + road reflections
  g = x.createLinearGradient(0, H * .76, 0, H);
  g.addColorStop(0, 'rgba(60,20,30,.9)'); g.addColorStop(1, 'rgba(15,6,12,1)');
  x.fillStyle = g; x.fillRect(0, H * .77, W, H * .23);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    const yy = H * (.79 + R() * .2), xx = R() * W, l = u * (.05 + R() * .25);
    x.fillStyle = R() < .5 ? `rgba(255,70,60,${.15 + R() * .25})` : `rgba(255,190,120,${.12 + R() * .2})`;
    x.fillRect(xx, yy, l, u * .004 + R() * u * .006);
  }
  // bokeh lights: big soft discs, warm palette
  const pal = [[255, 178, 92], [255, 208, 138], [255, 111, 165], [255, 70, 80], [255, 150, 70], [120, 200, 255], [255, 240, 210]];
  const bok = (n, rmin, rmax, ymin, ymax, amin, amax) => {
    for (let i = 0; i < n; i++) {
      const cx = R() * W, cy = H * (ymin + R() * (ymax - ymin)), r = u * (rmin + R() * (rmax - rmin));
      const p = pal[(R() < .1 ? 5 : (R() * pal.length) | 0)], a = amin + R() * (amax - amin);
      const gg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gg.addColorStop(0, `rgba(${p[0]},${p[1]},${p[2]},${a * .75})`); gg.addColorStop(.78, `rgba(${p[0]},${p[1]},${p[2]},${a * .9})`);
      gg.addColorStop(.9, `rgba(${p[0]},${p[1]},${p[2]},${a})`); gg.addColorStop(1, `rgba(${p[0]},${p[1]},${p[2]},0)`);
      x.fillStyle = gg; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
  };
  bok(70, .012, .03, .3, .98, .25, .7);
  bok(46, .03, .07, .2, 1, .12, .35);
  bok(18, .07, .13, .15, 1, .06, .16);
  x.globalCompositeOperation = 'source-over';
  const bctx = bgC.getContext('2d'); bctx.filter = `blur(${Math.max(1, u * .003)}px)`; bctx.drawImage(c, 0, 0); bctx.filter = 'none';
  const b2 = bgB.getContext('2d'); b2.filter = `blur(${u * .035}px) brightness(1.05)`; b2.drawImage(c, 0, 0); b2.filter = 'none';
}

/* ---------- WebGL ---------- */
const VS = `attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uBg,uBgB,uFog,uGlow;
uniform vec2 uRes;uniform float uT,uRain,uFogLvl,uFlash,uGlowAmt,uPulse,uDim,uHid;
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}
// tiny beads that appear, sit and evaporate
vec3 beads(vec2 q,float sc,float t,float sd,float dens){
  vec2 p=q*sc;vec2 id=floor(p);vec2 f=fract(p)-.5;vec2 r=h22(id+sd);float r3=h12(id*1.37+sd);
  vec2 c=(r-.5)*.56;float life=fract(t*(.035+.07*r3)+r3*7.);
  float rad=(.13+.22*r.x)*smoothstep(0.,.12,life)*smoothstep(1.,.75,life)*step(dens,r3);
  vec2 d=f-c;float rr=max(rad,1e-3);float m=smoothstep(rr,rr*.55,length(d))*step(1e-3,rad);
  return vec3(d/max(rad,1e-4)*m,m);
}
float wob(float y,float r,float r2){return sin(y*9.+r*20.)*.14+sin(y*23.+r2*9.)*.05;}
// big drops that slide down in stop-and-go steps, leaving a trail
vec3 runner(vec2 q,float cols,float t,float sd,out float trail){
  float col=floor(q.x*cols);float r=h11(col*7.13+sd),r2=h11(col*3.71+sd*2.3);
  float ph=t*(.075+.09*r)+r2*10.;float cyc=floor(ph),fr=fract(ph);
  float on=step(.3,h11(cyc*1.37+col*.71+sd));
  float s=fr*5.;float si=floor(s),sf=fract(s);
  float y=(si+smoothstep(.0,1.,pow(sf,.55)))/5.;y=y*1.45-.22;
  float base=(col+.5+(r-.5)*.3)/cols;
  float x0=base+wob(y,r,r2)/cols;
  float rad=(.011+.008*r2)*clamp(7./cols,.55,1.);
  vec2 d=q-vec2(x0,y);d.y*=d.y<0.?1.25:.92;
  float m=smoothstep(rad,rad*.5,length(d))*on;
  float above=y-q.y;float tl=.16+.22*r;
  float px=base+wob(q.y,r,r2)/cols;float tx=q.x-px;
  float tw=rad*.2*smoothstep(tl,0.,above);
  trail=smoothstep(max(tw,1e-4),max(tw,1e-4)*.35,abs(tx))*step(1e-4,tw)*step(0.,above)*on;
  float cell=floor(q.y*46.);float ty=fract(q.y*46.)-.5;
  float tdr=rad*.42*smoothstep(tl,.0,above)*step(.45,h11(cell+col*3.1+cyc));
  vec2 dd=vec2(tx,ty/46.);float tdd=max(tdr,1e-4);float tm=smoothstep(tdd,tdd*.45,length(dd))*step(1e-4,tdr)*step(.012,above)*on;
  return vec3(d/rad*m+dd/max(tdr,1e-4)*tm,max(m,tm));
}
void main(){
  vec2 uv=vUv;float asp=uRes.x/uRes.y;vec2 q=vec2(uv.x*asp,uv.y);float t=uT;
  vec3 b1=beads(q,24.,t,1.,.55),b2=beads(q,50.,t*1.3,9.,.74);
  float t1,t2,t3;
  vec3 r1=runner(q,7.,t,3.,t1),r2=runner(q+vec2(.031,0.),11.,t*1.08,11.,t2),r3=runner(q+vec2(.017,0.),17.,t*.93,21.,t3);
  float rn=uRain;
  vec2 off=-(b1.xy*.010+b2.xy*.005+r1.xy*.034+r2.xy*.026+r3.xy*.018)*rn;
  float beadM=max(b1.z,b2.z*.85)*rn;float runM=max(max(r1.z,r2.z),r3.z)*rn;float dropM=max(beadM,runM);
  float trailM=max(max(t1,t2),t3)*rn;
  vec2 par=vec2(sin(t*.07)*.004,0.);
  vec3 sharp=texture2D(uBg,uv+off*1.6+par).rgb;
  sharp=mix(sharp,sharp*1.35+texture2D(uBgB,uv-off*2.).rgb*.35+.03,runM);
  vec3 blur=texture2D(uBgB,uv+off*.6+par).rgb;
  float n=vn(uv*vec2(3.,5.))*.6+vn(uv*13.)*.4;
  float front=smoothstep(n-.18,n+.18,uFogLvl*1.36-.18);
  float fog=texture2D(uFog,uv).r*front;
  fog*=1.-max(max(beadM*.3,runM*.75),trailM*.3);
  float gr=vn(uv*uRes*.42)*.6+vn(uv*uRes*.13)*.4;
  vec3 clear=mix(sharp,blur,.18);
  vec3 fogC=blur*1.45+vec3(.15,.15,.18)+(gr-.5)*.04;
  vec3 col=mix(clear,fogC,smoothstep(0.,1.,fog)*.94);
  // drop light: bright rim on top-left, dark rim lower right
  float rim=length(off)*28.;
  float lit=dot(normalize(off+1e-5),vec2(-.45,-.9));
  col+=dropM*smoothstep(.3,1.,rim)*(.06+.16*smoothstep(.2,.9,lit))*vec3(.95,.97,1.);
  col*=1.-dropM*.10*smoothstep(.2,.9,-lit);
  col+=beadM*fog*.08;
  vec4 g=texture2D(uGlow,uv);
    col=mix(col,col*vec3(1.25,.85,1.)+vec3(.10,.01,.04),g.g*uGlowAmt*(.35+.15*uPulse));
  col+=g.r*uGlowAmt*vec3(1.,.25,.5)*(.55+.3*uPulse);
    float v=length((uv-.5)*vec2(1.,.8));col*=1.-.55*v*v;
  col*=uDim;
  col+=g.b*uHid*vec3(.8,.9,1.)*.62;
  col+=uFlash*(vec3(.72,.78,1.)*(.28+fog*.55)+sharp*.9);
  gl_FragColor=vec4(pow(max(col,0.),vec3(.96)),1.);
}`;
let prog, U = {}, tex = {};
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function initGL() {
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  ['uBg', 'uBgB', 'uFog', 'uGlow', 'uRes', 'uT', 'uRain', 'uFogLvl', 'uFlash', 'uGlowAmt', 'uPulse', 'uDim', 'uHid'].forEach(k => U[k] = gl.getUniformLocation(prog, k));
  ['bg', 'bgB', 'fog', 'glow'].forEach((k, i) => {
    const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    tex[k] = { tx, unit: i };
  });
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.uniform1i(U.uBg, 0); gl.uniform1i(U.uBgB, 1); gl.uniform1i(U.uFog, 2); gl.uniform1i(U.uGlow, 3);
}
function upload(k, c) { gl.activeTexture(gl.TEXTURE0 + tex[k].unit); gl.bindTexture(gl.TEXTURE_2D, tex[k].tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); }

/* ---------- fog writing helpers ---------- */
function heartPt(cx, cy, s, a) { const k = s / 34, si = Math.sin(a); return [cx + 16 * si * si * si * k, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * k + 2.5 * k]; }
function heartPath(c, h) { c.beginPath(); for (let i = 0; i <= 160; i++) { const p = heartPt(h.cx, h.cy, h.s, i / 160 * Math.PI * 2); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.closePath(); }
let brushCache = {};
function brush(r) {
  r = Math.max(2, Math.round(r)); if (brushCache[r]) return brushCache[r];
  const c = document.createElement('canvas'); c.width = c.height = r * 2; const x = c.getContext('2d');
  const g = x.createRadialGradient(r, r, 0, r, r, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); return brushCache[r] = c;
}
function wipe(x0, y0, x1, y1, r) {
  const b = brush(r), d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / (r * .22)));
  fx.globalCompositeOperation = 'destination-out';
  for (let i = 1; i <= n; i++) { const k = i / n; fx.drawImage(b, x0 + (x1 - x0) * k - b.width / 2, y0 + (y1 - y0) * k - b.width / 2); }
  fx.globalCompositeOperation = 'source-over';
}
function makeText(lines, cy, maxFsK, widthK) {
  const c = document.createElement('canvas'); c.width = FW; c.height = FH; const x = c.getContext('2d');
  x.font = `700 100px Caveat`; let mw = 0; lines.forEach(l => mw = Math.max(mw, x.measureText(l).width));
  const fs = Math.min(FH * maxFsK, FW * widthK / mw * 100), lh = fs * 1.0;
  x.font = `700 ${fs}px Caveat`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = fs * .04; x.fillStyle = x.strokeStyle = '#000';
  const y0 = cy - (lines.length - 1) * lh / 2, info = [];
  lines.forEach((l, i) => {
    const y = y0 + i * lh, w = x.measureText(l).width;
    x.fillText(l, FW / 2, y); x.strokeText(l, FW / 2, y);
    info.push({ x0: FW / 2 - w / 2 - fs * .08, x1: FW / 2 + w / 2 + fs * .08, top: y - fs * .62, bot: y + fs * .62, y });
  });
  const total = info.reduce((s, o) => s + (o.x1 - o.x0), 0);
  return { c, info, total, fs, lines, cy, done: 0 };
}
function revealText(m, p) {
  const want = m.total * Math.min(1, p); if (want <= m.done) return;
  fx.globalCompositeOperation = 'destination-out';
  let acc = 0;
  for (const o of m.info) {
    const w = o.x1 - o.x0, a = Math.max(0, m.done - acc), b = Math.min(w, want - acc);
    if (b > a) { const sx = Math.max(0, Math.floor(o.x0 + a) - 1), ex = Math.min(FW, Math.ceil(o.x0 + b)), top = Math.max(0, Math.floor(o.top)), hh = Math.min(FH - top, Math.ceil(o.bot - o.top));
      if (ex > sx) fx.drawImage(m.c, sx, top, ex - sx, hh, sx, top, ex - sx, hh); }
    acc += w;
  }
  fx.globalCompositeOperation = 'source-over';
  m.done = want;
}
function spawnDrips(m, n, seed, t0) {
  const R = rnd(seed), x = m.c.getContext('2d'), out = [];
  let tries = 0;
  while (out.length < n && tries++ < 400) {
    const o = m.info[(R() * m.info.length) | 0], cx = o.x0 + R() * (o.x1 - o.x0);
    const col = x.getImageData(Math.round(cx), Math.max(0, Math.round(o.top)), 1, Math.max(1, Math.round(o.bot - o.top))).data;
    let by = -1; for (let i = col.length / 4 - 1; i >= 0; i--) if (col[i * 4 + 3] > 200) { by = i; break; }
    if (by < 0) continue;
    out.push({ x: cx, y: o.top + by - m.fs * .02, len: FH * (.025 + R() * .07), r: m.fs * (.03 + R() * .018), t0: t0 + R() * 1.6, dur: 2.2 + R() * 2.2, p: 0, w: (R() - .5) * m.fs * .06 });
  }
  return out;
}
function runDrips(t) {
  for (const d of drips) {
    const p = Math.max(0, Math.min(1, (t - d.t0) / d.dur)); if (p <= d.p) continue;
    const e0 = 1 - Math.pow(1 - d.p, 2), e1 = 1 - Math.pow(1 - p, 2);
    wipe(d.x + d.w * e0, d.y + d.len * e0, d.x + d.w * e1, d.y + d.len * e1, d.r * (1 - .35 * e1)); d.p = p;
  }
}
function heartDraw(h, p0, p1) {
  if (p1 <= p0) return; const a0 = -p0 * Math.PI * 2, a1 = -p1 * Math.PI * 2, n = Math.max(1, Math.ceil((p1 - p0) * 140));
  for (let i = 0; i < n; i++) { const A = heartPt(h.cx, h.cy, h.s, a0 + (a1 - a0) * i / n), B = heartPt(h.cx, h.cy, h.s, a0 + (a1 - a0) * (i + 1) / n); wipe(A[0], A[1], B[0], B[1], h.r); }
}
function heartFill(h, p) {
  fx.save(); heartPath(fx, h); fx.clip(); fx.globalCompositeOperation = 'destination-out';
  const g = fx.createRadialGradient(h.cx, h.cy, 0, h.cx, h.cy, h.s * .75 * p + 1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.8, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  fx.fillStyle = g; fx.fillRect(0, 0, FW, FH); fx.restore();
}
function paintGlowHeart(h) {
  gx.clearRect(0, 0, FW, FH); gx.globalCompositeOperation = 'lighter';
  gx.filter = `blur(${h.s * .015}px)`; heartPath(gx, h); gx.fillStyle = 'rgb(0,255,0)'; gx.fill();
  gx.filter = `blur(${h.s * .03}px)`; heartPath(gx, h); gx.lineWidth = h.r * 1.1; gx.strokeStyle = 'rgb(95,0,0)'; gx.stroke();
  gx.filter = `blur(${h.s * .007}px)`; gx.lineWidth = h.r * .45; gx.strokeStyle = 'rgb(200,0,0)'; gx.stroke(); gx.filter = 'none'; gx.globalCompositeOperation = 'source-over';
  upload('glow', glowC);
}
function paintHidden(m) {
  const tc = document.createElement('canvas'); tc.width = FW; tc.height = FH; const tx = tc.getContext('2d');
  tx.drawImage(m.c, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgb(0,0,255)'; tx.fillRect(0, 0, FW, FH);
  gx.clearRect(0, 0, FW, FH); gx.globalCompositeOperation = 'lighter';
  gx.filter = `blur(${m.fs * .09}px)`; gx.globalAlpha = .28; gx.drawImage(tc, 0, 0); gx.filter = `blur(${m.fs * .01}px)`; gx.globalAlpha = .75; gx.drawImage(tc, 0, 0);
  gx.filter = 'none'; gx.globalAlpha = 1; gx.globalCompositeOperation = 'source-over';
  upload('glow', glowC);
}
function glowWords(m) {
  gx.globalCompositeOperation = 'lighter'; gx.filter = `blur(${m.fs * .05}px)`; gx.globalAlpha = .55;
  const tc = document.createElement('canvas'); tc.width = FW; tc.height = FH; const tx = tc.getContext('2d');
  tx.drawImage(m.c, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgb(255,0,0)'; tx.fillRect(0, 0, FW, FH);
  gx.drawImage(tc, 0, 0); gx.filter = 'none'; gx.globalAlpha = 1; gx.globalCompositeOperation = 'source-over'; upload('glow', glowC);
}
function clearGlow() { gx.clearRect(0, 0, FW, FH); upload('glow', glowC); }

/* ---------- layout ---------- */
let H1, H2;
function layout() {
  const vw = innerWidth, vh = innerHeight;
  PR = Math.min(window.devicePixelRatio || 1, 2) * (parseFloat(Q.get('q')) || 1);
  W = Math.round(vw * PR); H = Math.round(vh * PR); cv.width = W; cv.height = H;
  FW = Math.round(W * .5); FH = Math.round(H * .5);
  fogC.width = FW; fogC.height = FH; glowC.width = FW; glowC.height = FH;
  fx.fillStyle = '#fff'; fx.fillRect(0, 0, FW, FH);
  paintCity(); gl.viewport(0, 0, W, H);
  upload('bg', bgC); upload('bgB', bgB); upload('fog', fogC); clearGlow();
  const s1 = Math.min(FW * .6, FH * .27);
  H1 = { cx: FW / 2, cy: FH * .285, s: s1, r: s1 * .05 };
  const s2 = Math.min(FW * .8, FH * .37);
  H2 = { cx: FW / 2, cy: FH * .37, s: s2, r: s2 * .045 };
  masks.write = makeText(LINES.write, FH * .645, .1, .8);
  masks.hidden = makeText(LINES.hidden, FH * .47, .095, .86);
  masks.write2 = makeText(LINES.write2, FH * .47, .095, .86);
  masks.final = makeText(LINES.final, FH * .655, .09, NAME ? .8 : .5);
}

/* ---------- sound (Web Audio, all generated) ---------- */
let AC = null, master = null, muted = false;
function noiseBuf(sec, brown) { const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } return b; }
function startAudio() {
  if (AC || DEMO) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
    const n = AC.createBufferSource(); n.buffer = noiseBuf(4, false); n.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 2600; const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const g = AC.createGain(); g.gain.value = .16; n.connect(bp); bp.connect(hp); hp.connect(g); g.connect(master); n.start();
    const n2 = AC.createBufferSource(); n2.buffer = noiseBuf(5, true); n2.loop = true; const g2 = AC.createGain(); g2.gain.value = .22; n2.connect(g2); g2.connect(master); n2.start();
    $('#snd').style.display = 'block';
  } catch (e) { AC = null; }
}
function thunder(delay) {
  if (!AC) return; const t0 = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = noiseBuf(6, true); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(120, t0 + 4);
  const g = AC.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1.4, t0 + .08); g.gain.exponentialRampToValueAtTime(.5, t0 + 1.2); g.gain.exponentialRampToValueAtTime(.001, t0 + 5.5);
  s.connect(lp); lp.connect(g); g.connect(master); s.start(t0); s.stop(t0 + 6);
}
function squeak(on) { /* finger on glass: very soft */ }

/* ---------- state machine ---------- */
let t = -1, prevT = -1, started = false, last = performance.now(), startAt = 0, phaseName = 'start', thundered = false;
const st = { fogLvl: 0, flash: 0, dim: 1, glow: 0, hid: 0, regrow: 0 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
function phaseAt(x) { let p = 'start'; if (x < 0) return p; for (const k of ['rain', 'fog', 'heart', 'write', 'fade1', 'flash', 'fade2', 'write2', 'fade3', 'final', 'done']) if (x >= T[k]) p = k; return p; }
function resetFog() { fx.globalCompositeOperation = 'source-over'; fx.fillStyle = '#fff'; fx.fillRect(0, 0, FW, FH); }
function between(a, b) { return prevT < b && t > a; }
function prog01(a, b, x) { return clamp((x - a) / (b - a)); }
function update(dt) {
  if (!started) { prevT = t; return; }
  t = (performance.now() - startAt) / 1000;
  const ph = phaseAt(t);
  // fog formation
  st.fogLvl = sm(prog01(T.fog, T.fog + 2.8, t));
  // heart
  if (between(T.heart + .3, T.heart + 2.8)) heartDraw(H1, sm(prog01(T.heart + .3, T.heart + 2.8, Math.max(prevT, T.heart + .3))), sm(prog01(T.heart + .3, T.heart + 2.8, t)));
  if (between(T.heart + 2.6, T.heart + 2.7) && !masks.heartDrips) { masks.heartDrips = 1; const tip = heartPt(H1.cx, H1.cy, H1.s, Math.PI);
    drips.push({ x: tip[0], y: tip[1], len: FH * .03, r: H1.r * .75, t0: T.heart + 2.8, dur: 3, p: 0, w: H1.r * .3 }, { x: H1.cx - H1.s * .42, y: H1.cy + H1.s * .1, len: FH * .045, r: H1.r * .6, t0: T.heart + 3.2, dur: 3.2, p: 0, w: 0 }); }
  // line 1
  if (between(T.write + .2, T.write + 3.4)) revealText(masks.write, prog01(T.write + .2, T.write + 3.4, t));
  if (between(T.write + 3.4, T.write + 3.5) && !masks.write.dr) { masks.write.dr = 1; drips.push(...spawnDrips(masks.write, 5, 7, T.write + 3.4)); }
  // hidden words on the flash
  if (between(T.flash + .6, T.flash + .7) && !masks.hidden.shown) { masks.hidden.shown = 1; paintHidden(masks.hidden); }
  // line 2
  if (between(T.write2 + .2, T.write2 + 3.0)) revealText(masks.write2, prog01(T.write2 + .2, T.write2 + 3.0, t));
  if (between(T.write2 + 3.0, T.write2 + 3.1) && !masks.write2.dr) { masks.write2.dr = 1; drips.push(...spawnDrips(masks.write2, 5, 23, T.write2 + 3.0)); }
  // final heart
  if (between(T.final + .2, T.final + 2.3)) heartDraw(H2, sm(prog01(T.final + .2, T.final + 2.3, Math.max(prevT, T.final + .2))), sm(prog01(T.final + .2, T.final + 2.3, t)));
  if (between(T.final + 2.2, T.final + 2.3) && !H2.g) { H2.g = 1; paintGlowHeart(H2); }
  if (t > T.final + 2.2 && t < T.final + 3.6) heartFill(H2, sm(prog01(T.final + 2.2, T.final + 3.4, t)));
  if (between(T.words, T.words + 1.4)) revealText(masks.final, prog01(T.words, T.words + 1.4, t));
  if (between(T.words + 1.4, T.words + 1.5) && !masks.final.g) { masks.final.g = 1; glowWords(masks.final); }
  runDrips(t);
  // fog regrow during the fades
  let rg = 0;
  if (t > T.fade1 && t < T.flash) rg = 1.6; if (t > T.fade2 && t < T.write2) rg = 1.8; if (t > T.fade3 && t < T.final) rg = 1.8;
  if (rg) { const a = Math.max(.012, 1 - Math.exp(-rg * dt)); fx.globalCompositeOperation = 'source-over'; fx.fillStyle = `rgba(255,255,255,${a})`; fx.fillRect(0, 0, FW, FH); }
  if (between(T.flash - .05, T.flash) || between(T.write2 - .05, T.write2) || between(T.final - .05, T.final)) { resetFog(); drips = []; }
  // lightning
  const f = t - (T.flash + .6);
  st.dim = 1 - .4 * sm(prog01(T.flash, T.flash + .6, t)) + .4 * sm(prog01(T.fade2 - .4, T.fade2 + .6, t));
  st.flash = f < 0 ? 0 : Math.max(0, 1.6 * Math.exp(-f * 9) + (f > .22 ? 1.1 * Math.exp(-(f - .22) * 7) : 0) + (f > .5 ? .5 * Math.exp(-(f - .5) * 6) : 0)) * (f < 2.5 ? 1 : 0);
  st.hid = f < 0 ? 0 : (t < T.fade2 ? .8 + .5 * Math.exp(-f * 2) : Math.max(0, .8 * (1 - (t - T.fade2) / 1.2)));
  if (f >= 0 && !thundered) { thundered = true; thunder(.25); }
  if (between(T.fade2 + 1.3, T.fade2 + 1.4)) clearGlow();
  st.glow = sm(prog01(T.final + 2.2, T.final + 3.4, t));
  // captions
  let cap = '', ca = 0; for (const c of CAPS) if (t > c[1] && t < c[2]) { cap = c[0]; ca = Math.min(sm((t - c[1]) / .5), sm((c[2] - t) / .5)); }
  const ce = $('#cap'); if (ce.textContent !== cap && cap) ce.textContent = cap; ce.style.opacity = ca.toFixed(3);
  const ea = sm(prog01(T.buttons, T.buttons + .7, t)); const en = $('#end'); en.style.opacity = ea.toFixed(3); en.style.transform = `translateY(${(1 - ea) * 30}px)`; en.classList.toggle('on', ea > .5);
  if (ph !== phaseName) { phaseName = ph; }
  window.__t = t; window.__demo = t >= T.done ? 'done' : ph;
  prevT = t;
}
let base = 0;
function render() {
  const now = (performance.now() - base) / 1000 + 5;
  upload('fog', fogC);
  gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uT, now % 1000); gl.uniform1f(U.uRain, 1);
  gl.uniform1f(U.uFogLvl, st.fogLvl); gl.uniform1f(U.uFlash, st.flash); gl.uniform1f(U.uGlowAmt, st.glow);
  gl.uniform1f(U.uPulse, .5 + .5 * Math.sin(now * 2.4)); gl.uniform1f(U.uDim, st.dim); gl.uniform1f(U.uHid, st.hid);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (REC) gl.finish();
}
function loop() { const n = performance.now(); const dt = Math.min(.1, (n - last) / 1000); last = n; update(dt); if (!REC) render(); requestAnimationFrame(loop); }

function begin() {
  if (started) return; started = true; startAt = performance.now(); prevT = 0; t = 0;
  const s = $('#start'); s.style.transition = 'opacity .8s'; s.style.opacity = '0'; s.style.pointerEvents = 'none';
  if (REC) { const t0 = performance.now(); const fade = () => { const k = clamp((performance.now() - t0) / 800); s.style.opacity = String(1 - k); if (k < 1) requestAnimationFrame(fade); else s.style.display = 'none'; }; fade(); }
  else setTimeout(() => s.style.display = 'none', 900);
  startAudio();
}
function replay() {
  resetFog(); clearGlow(); drips = []; H2.g = 0; masks.heartDrips = 0; thundered = false;
  for (const k in masks) if (masks[k] && masks[k].c) { masks[k].done = 0; masks[k].dr = 0; masks[k].shown = 0; masks[k].g = 0; }
  startAt = performance.now(); prevT = 0; t = 0;
}
function toast(m) { const e = $('#toast'); e.textContent = m; e.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.opacity = 0, 1800); }
function link(name) { const u = new URL(location.href.split('?')[0]); if (name) u.searchParams.set('name', name); return u.toString(); }
async function copy(s) { try { await navigator.clipboard.writeText(s); return true; } catch (e) { const a = document.createElement('textarea'); a.value = s; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } a.remove(); return ok; } }

$('#begin').addEventListener('click', begin);
$('#replay').addEventListener('click', replay);
$('#share').addEventListener('click', async () => {
  const u = link(NAME); if (navigator.share && !DEMO) { try { await navigator.share({ title: 'Rainy Window 🌧️❤️', text: 'I wrote something for you on a rainy window 🌧️❤️', url: u }); return; } catch (e) { } }
  toast((await copy(u)) ? 'Link copied 💌' : u);
});
$('#mk').addEventListener('click', () => { $('#make').classList.add('on'); $('#petname').value = NAME; $('#mklink').textContent = ''; });
$('#mkclose').addEventListener('click', () => $('#make').classList.remove('on'));
$('#mkcopy').addEventListener('click', async () => { const u = link($('#petname').value.replace(/[<>]/g, '').trim().slice(0, 16)); $('#mklink').textContent = u; toast((await copy(u)) ? 'Link copied 🔗' : 'Copy the link below'); });
$('#snd').addEventListener('click', () => { muted = !muted; if (master) master.gain.value = muted ? 0 : .9; $('#snd').textContent = muted ? '🔇' : '🔊'; });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); if (started) replay(); }, 200); });

window.__api = { T, phase: () => window.__demo || 'start', begin, replay, zero: () => { base = performance.now(); } };
window.__render = render;
if (Q.has('dbg')) window.__dbg = { bgC, bgB, fogC, glowC };
try { initGL(); } catch (e) { document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;top:40%;width:100%;text-align:center;font-size:22px">This device can’t draw the rain 😢</p>'); throw e; }
const fontsReady = Promise.all([document.fonts.load('700 80px Caveat', 'I’d wait in every rain'), document.fonts.load('800 30px Poppins')]).catch(() => { }).then(() => document.fonts.ready);
fontsReady.then(() => {
  layout(); window.__ready = true; last = performance.now(); requestAnimationFrame(loop);
  if (DEMO && !REC) { setTimeout(() => $('#begin').classList.add('pressed'), 1100); setTimeout(() => { $('#begin').classList.remove('pressed'); begin(); }, 1400); }
});
})();
