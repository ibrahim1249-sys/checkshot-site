/* Checkshot site: the survey illustration on the home page.
   Everything here is synthetic: the site is generated from the functions below, and the
   "check shot" differences are a fixed list of made-up numbers. Nothing is survey data.
   Raw WebGL 1, no libraries. */
(function () {
  'use strict';
  var root = document.getElementById('survey');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var canvas = $('canvas'), labelsEl = $('.sv-labels'), stageEl = $('.sv-stage');
  var playBtn = $('.sv-play'), scrub = $('.sv-scrub'), statusEl = $('.sv-status');
  var readout = $('.sv-readout'), startBtn = $('.sv-start');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var params = new URLSearchParams(location.search);
  var POSTER = params.has('poster');

  /* ---------- the synthetic site ---------- */
  function hash(i, j) { var n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, y) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) { return vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.2; }
  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  var HX = 150, HY = 105;                                    // half extents, metres
  function base(x, y) { return 100 + 0.010 * x + 0.006 * y; } // assumed datum: 100.000 at the middle
  var ROAD_A = [[-170, -18], [30, -18], [62, -6], [74, 24], [74, 125]];
  var ROAD_B = [[-40, -18], [-40, 60]], BULB = [-40, 62];
  function segDist(px, py, a, b, out) {
    var vx = b[0] - a[0], vy = b[1] - a[1], t = ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy);
    t = Math.min(1, Math.max(0, t)); var qx = a[0] + vx * t, qy = a[1] + vy * t, d = Math.hypot(px - qx, py - qy);
    if (d < out.d) { out.d = d; out.x = qx; out.y = qy; }
  }
  var rd = { d: 0, x: 0, y: 0 };
  function roadDist(x, y) {
    rd.d = 1e9; var i;
    for (i = 0; i < ROAD_A.length - 1; i++) segDist(x, y, ROAD_A[i], ROAD_A[i + 1], rd);
    segDist(x, y, ROAD_B[0], ROAD_B[1], rd);
    var db = Math.hypot(x - BULB[0], y - BULB[1]) - 9.5;
    if (db < rd.d) { rd.d = Math.max(0, db); rd.x = BULB[0]; rd.y = BULB[1]; }
    return rd;
  }
  var POND = [-98, -66, 40, 26], PILE = [108, -62, 21, 7.5];
  var PITS = [[-112, 22, 11, 13], [-84, 22, 11, 13], [-12, 24, 11, 13], [16, 60, 11, 13], [-14, -47, 11, 12], [112, 62, 11, 13]];
  function padZ(x, y) {
    var w = 14, dpt = 38, fx = x / w, fy = (y + 4) / dpt, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    function pz(ii, jj) { return Math.round(base((ii + 0.5) * w, (jj + 0.5) * dpt - 4) / 0.3) * 0.3 + 0.35; }
    var z = pz(i, j);
    if (tx > 0.9) z = mix(z, pz(i + 1, j), sstep(0.9, 1.0, tx) * 0.5); else if (tx < 0.1) z = mix(z, pz(i - 1, j), sstep(0.1, 0, tx) * 0.5);
    if (ty > 0.94) z = mix(z, pz(i, j + 1), sstep(0.94, 1.0, ty) * 0.5) - 0.25 * sstep(0.94, 1, ty);
    else if (ty < 0.06) z = mix(z, pz(i, j - 1), sstep(0.06, 0, ty) * 0.5) - 0.25 * sstep(0.06, 0, ty);
    return z;
  }
  // surface types: 0 asphalt, 1 concrete, 2 graded pad, 3 topsoil, 4 seeded slope, 5 water, 6 stripped ground
  var srf = { z: 0, t: 0 };
  function surface(x, y) {
    var r = roadDist(x, y), d = r.d, zc = base(r.x, r.y) - 0.3, z, t;
    var inLots = (y > -8) || (x > -58 && x < 44 && y < -28 && y > -66);
    var ground = inLots ? padZ(x, y) : base(x, y) + (fbm(x * 0.07, y * 0.07) - 0.5) * 0.9;
    t = inLots ? 2 : 6;
    if (d < 4.5) { z = zc - 0.02 * d; t = 0; }
    else if (d < 5.0) { z = zc + 0.06; t = 1; }
    else if (d < 6.6) { z = zc + 0.07 + 0.02 * (d - 5); t = 1; }
    else { var w = sstep(6.6, 11.5, d); z = mix(zc + 0.1, ground, w); if (w < 0.6) t = 6; }
    // basements, with a spoil pile beside each
    for (var k = 0; k < PITS.length; k++) {
      var p = PITS[k], ix = p[2] / 2 - Math.abs(x - p[0]), iy = p[3] / 2 - Math.abs(y - p[1]), inside = Math.min(ix, iy);
      if (inside > -1) { z -= 2.4 * sstep(-0.6, 1.6, inside); if (inside > 0.4) t = 6; }
      var sx = x - (p[0] + p[2] / 2 + 6), sy = y - p[1], sr = Math.hypot(sx, sy);
      if (sr < 6) { z += 1.7 * Math.pow(1 - sr / 6, 1.3) * (0.8 + 0.4 * vnoise(x * 0.5, y * 0.5)); t = 3; }
    }
    // stormwater pond
    var px = (x - POND[0]) / POND[2], py = (y - POND[1]) / POND[3];
    var pr = Math.hypot(px, py) * (1 + 0.06 * Math.sin(Math.atan2(py, px) * 3 + 0.7));
    if (pr < 1.35) {
      var rim = base(POND[0], POND[1]);
      if (pr < 1.0) { z = rim - 3.2 * sstep(1.0, 0.3, pr) + 0.25 * sstep(0.74, 0.66, pr) * sstep(0.5, 0.66, pr); t = 4; if (z < rim - 1.85) { z = rim - 1.85; t = 5; } }
      else { z = mix(rim, z, sstep(1.0, 1.35, pr)); t = 4; }
    }
    // topsoil stockpile
    var qx = x - PILE[0], qy = y - PILE[1], qr = Math.hypot(qx, qy * 1.25) / PILE[2];
    if (qr < 1) { z += PILE[3] * (1 - Math.pow(qr, 1.5)) * (0.86 + 0.28 * fbm(x * 0.16, y * 0.16)); t = 3; }
    z += (vnoise(x * 1.7, y * 1.7) - 0.5) * (t === 0 || t === 1 ? 0.012 : t === 5 ? 0 : 0.06);
    srf.z = z; srf.t = t; return srf;
  }
  function h(x, y) { return surface(x, y).z; }
  var COL = [[0.215, 0.215, 0.225], [0.74, 0.73, 0.69], [0.60, 0.47, 0.34], [0.33, 0.25, 0.185], [0.40, 0.45, 0.30], [0.17, 0.30, 0.35], [0.50, 0.42, 0.32]];

  /* ---------- flight plan, control and check shots ---------- */
  var ALT = 62, FW = 78, FH = 52, LINE = 36, STEP = 20;
  var photos = [], path = [];
  (function () {
    var li = 0, s = 0, prev = null;
    for (var x = -162; x <= 162.01; x += LINE, li++) {
      var ys = []; for (var y = -120; y <= 120.01; y += STEP) ys.push(y);
      if (li % 2) ys.reverse();
      for (var k = 0; k < ys.length; k++) {
        var p = [x, ys[k]]; if (prev) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        photos.push({ x: x, y: ys[k], s: s }); path.push({ x: x, y: ys[k], s: s }); prev = p;
      }
    }
    var L = s; for (k = 0; k < photos.length; k++) { photos[k].u = photos[k].s / L; path[k].u = photos[k].u; }
  })();
  var T0 = 0.9, TF = 9.2, TG = T0 + TF + 0.3, TS = TG + 1.6, SHOT_GAP = 0.27;
  var GCPS = [[-132, 88], [128, 90], [-134, -22], [132, -18], [6, 6], [-30, -90], [70, -92]];
  // [x, y, code, description, made-up difference (cloud minus shot, m), used in the statistics]
  var SHOTS = [
    [-100, -18, 'CL', 'road centreline', 0.012, 1], [-60, -12.9, 'TC', 'top of curb', -0.008, 1],
    [-119, 52, 'FG', 'lot pad', 0.021, 1], [-63, 30, 'FG', 'lot pad', 0.004, 1],
    [-40, 40, 'CL', 'road centreline', -0.015, 1], [-12, 62, 'FG', 'lot pad', 0.009, 1],
    [33, 22, 'FG', 'lot pad', 0.031, 1], [74, 70, 'CL', 'road centreline', -0.003, 1],
    [110, 22, 'FG', 'lot pad', 0.017, 1], [10, -18, 'CL', 'road centreline', -0.022, 1],
    [14, -48, 'FG', 'lot pad', 0.006, 1], [-98, -30, 'EG', 'top of pond bank', 0.011, 1],
    [-50, -88, 'EG', 'stripped ground', -0.011, 1], [70, -44, 'EG', 'stripped ground', 0.044, 1],
    [118, -56, 'EG', 'side of the topsoil pile', -0.118, 0]
  ];
  var TOL = 0.05, shots = SHOTS.map(function (s, i) {
    var z = h(s[0], s[1]);
    return { id: 201 + i, x: s[0], y: s[1], code: s[2], desc: s[3], dz: s[4], use: !!s[5], cloudZ: z, shotZ: z - s[4], t: TS + i * SHOT_GAP,
      grade: !s[5] ? 'out' : Math.abs(s[4]) > TOL ? 'bad' : Math.abs(s[4]) > 0.6 * TOL ? 'near' : 'ok' };
  });
  var TEND = TS + shots.length * SHOT_GAP + 0.5, TMAX = TEND + 0.6;
  // The same statistics the Checker reports: mean, RMSE, standard deviation (n - 1), 95% = 1.96 x RMSE, worst.
  var stats = (function () {
    var d = shots.filter(function (s) { return s.use; }).map(function (s) { return s.dz; }), n = d.length;
    var mean = d.reduce(function (a, c) { return a + c; }, 0) / n;
    var rmse = Math.sqrt(d.reduce(function (a, c) { return a + c * c; }, 0) / n);
    var sd = Math.sqrt(d.reduce(function (a, c) { return a + (c - mean) * (c - mean); }, 0) / (n - 1));
    var worst = d.reduce(function (a, c) { return Math.abs(c) > Math.abs(a) ? c : a; }, 0);
    return { n: n, of: shots.length, mean: mean, rmse: rmse, sd: sd, p95: 1.96 * rmse, worst: worst, pass: rmse <= TOL };
  })();
  function sgn(v, dp) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(dp == null ? 3 : dp); }

  /* ---------- readout: works with or without WebGL ---------- */
  var selected = null;
  function drawReadout() {
    var hd = readout.querySelector('.sv-verdict'), dl = readout.querySelector('dl'), back = readout.querySelector('.sv-back');
    function rows(a) { dl.innerHTML = a.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join(''); }
    if (selected) {
      var s = selected;
      hd.className = 'sv-verdict is-' + s.grade;
      hd.innerHTML = '<strong>Shot ' + s.id + '.</strong> ' + s.code + ', ' + s.desc + '.';
      rows([['Shot Z', s.shotZ.toFixed(3) + ' m'], ['Cloud Z', s.cloudZ.toFixed(3) + ' m'], ['Δz', sgn(s.dz) + ' m'],
        ['Note', s.use ? (s.grade === 'near' ? 'inside ±0.050, close to it' : 'inside ±0.050') : 'steep slope, left out of the statistics']]);
      back.hidden = false;
    } else {
      hd.className = 'sv-verdict is-' + (stats.pass ? 'ok' : 'bad');
      hd.innerHTML = '<strong>' + (stats.pass ? 'Pass.' : 'Fail.') + '</strong> RMSE ' + (stats.rmse * 100).toFixed(1) + ' cm is ' + (stats.pass ? 'within' : 'over') + ' the ' + (TOL * 100).toFixed(1) + ' cm tolerance.';
      rows([['Used', stats.n + ' of ' + stats.of], ['Mean Δz', sgn(stats.mean) + ' m'], ['RMSE', stats.rmse.toFixed(3) + ' m'],
        ['Std dev', stats.sd.toFixed(3) + ' m'], ['95%', '±' + stats.p95.toFixed(3) + ' m'], ['Worst', sgn(stats.worst) + ' m']]);
      back.hidden = true;
    }
  }
  function select(s) { selected = s; drawReadout(); labels.forEach(function (l) { l.el.setAttribute('aria-pressed', String(l.s === s)); }); dirty = true; }
  readout.querySelector('.sv-back').addEventListener('click', function () { select(null); });
  var tb = document.getElementById('sv-table-body');
  if (tb) tb.innerHTML = shots.map(function (s) {
    return '<tr><td>' + s.id + '</td><td>' + s.code + '</td><td>' + s.shotZ.toFixed(3) + '</td><td>' + s.cloudZ.toFixed(3) + '</td><td>' + sgn(s.dz) + '</td><td>' + (s.use ? 'yes' : 'no, steep') + '</td></tr>';
  }).join('');

  var labels = shots.map(function (s) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sv-label is-' + s.grade; b.hidden = true;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Check shot ' + s.id + ', ' + s.desc + ': cloud minus shot ' + sgn(s.dz).replace('−', 'minus ').replace('+', 'plus ') + ' metres' + (s.use ? '' : ', steep slope, left out'));
    b.innerHTML = '<i aria-hidden="true"></i><span>' + sgn(s.dz) + ' m</span>';
    b.addEventListener('click', function () { select(s); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') select(s); });
    b.addEventListener('focus', function () { select(s); });
    labelsEl.appendChild(b);
    return { s: s, el: b, shown: false, dot: false, top: [s.x, s.y, s.cloudZ + 11] };
  });
  drawReadout();
  scrub.max = String(TMAX); scrub.value = String(TMAX);

  /* ---------- WebGL ---------- */
  var gl = null;
  try { gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
  if (!gl || params.has('nogl')) { root.classList.add('is-static'); return; }

  function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  var pPts, pFlat;
  try {
    pPts = program(
      'attribute vec3 aPos;attribute vec3 aStart;attribute vec3 aCol;attribute float aRev;' +
      'uniform mat4 uMVP;uniform float uT;uniform float uPx;uniform vec3 uNoise;uniform vec3 uGold;varying vec3 vCol;' +
      'void main(){float t=uT*12.;float k=clamp((uT-aRev)*12./0.85,0.,1.);float e=1.-pow(1.-k,3.);' +
      'vec3 st=aStart+vec3(sin(t*.45+aStart.y*.07),cos(t*.4+aStart.x*.06),sin(t*.6+aStart.x*.05+aStart.y*.04))*2.5;' +
      'vec4 p=uMVP*vec4(mix(st,aPos,e),1.);gl_Position=p;gl_PointSize=max(1.5,uPx/p.w*mix(.42,1.,e));' +
      'vec3 c=mix(uNoise*(.55+.45*fract(aStart.x*12.9+aStart.y*7.7)),aCol,e);vCol=mix(c,uGold,sin(k*3.1416)*.55);}',
      'precision mediump float;varying vec3 vCol;void main(){vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;gl_FragColor=vec4(vCol,1.);}');
    pFlat = program(
      'attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;varying vec4 vCol;void main(){gl_Position=uMVP*vec4(aPos,1.);vCol=aCol;}',
      'precision mediump float;varying vec4 vCol;void main(){gl_FragColor=vCol;}');
  } catch (e) { root.classList.add('is-static'); return; }

  var small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  var N = small ? 70000 : 130000, drawN = N, spacing = Math.sqrt(4 * HX * HY / N);
  var rs = 20260115; function rnd() { rs = (rs * 16807) % 2147483647; return rs / 2147483647; }
  var ptBuf = gl.createBuffer(), STRIDE = 28;
  (function build() {
    var buf = new ArrayBuffer(N * STRIDE), f = new Float32Array(buf), u8 = new Uint8Array(buf);
    var lx = -0.42, ly = 0.5, lz = 0.76, n = 0, tries = 0, i, k;
    while (n < N && tries < N * 3) {
      tries++;
      var x = (rnd() * 2 - 1) * HX, y = (rnd() * 2 - 1) * HY, s = surface(x, y), z = s.z, t = s.t;
      if (t === 5) { if (rnd() > 0.3) continue; z += (rnd() - 0.5) * 0.22; }   // water matches badly: few points, noisy
      var e = 0.6, nx = (h(x - e, y) - h(x + e, y)) / (2 * e), ny = (h(x, y - e) - h(x, y + e)) / (2 * e), nl = Math.hypot(nx, ny, 1);
      var sh = 0.25 + 0.95 * Math.pow(Math.max(0, (nx * lx + ny * ly + lz) / nl) / lz, 3) + (rnd() - 0.5) * 0.1;
      if (t === 2 || t === 6) sh *= 0.9 + 0.2 * fbm(x * 0.09 + 7, y * 0.09);
      if (t === 2) sh *= 0.86 + 0.26 * hash(Math.floor(x / 14) + 31, Math.floor((y + 4) / 38) + 17);
      // revealed by the second photo that sees the point: one photo is not enough to place it
      var seen = 0, rev = 1;
      for (k = 0; k < photos.length; k++) { var ph = photos[k]; if (Math.abs(x - ph.x) <= FW / 2 && Math.abs(y - ph.y) <= FH / 2 && ++seen === 2) { rev = ph.u; break; } }
      var o = n * 7; f[o] = x; f[o + 1] = y; f[o + 2] = z;
      f[o + 3] = (rnd() * 2 - 1) * HX * 1.25; f[o + 4] = (rnd() * 2 - 1) * HY * 1.25; f[o + 5] = 92 + rnd() * 75;
      var c = COL[t], b = n * STRIDE + 24;
      u8[b] = Math.min(255, c[0] * sh * 255); u8[b + 1] = Math.min(255, c[1] * sh * 255); u8[b + 2] = Math.min(255, c[2] * sh * 255);
      u8[b + 3] = Math.round(Math.min(1, (T0 + rev * TF + rnd() * 0.3) / 12) * 255);   // reveal time, in 12ths of a byte
      n++;
    }
    N = drawN = n;
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  })();
  var flatBuf = gl.createBuffer(), flat = new Float32Array(7 * 6000), fn = 0, triStart = 0;
  function V(x, y, z, c, a) { var o = fn * 7; flat[o] = x; flat[o + 1] = y; flat[o + 2] = z; flat[o + 3] = c[0]; flat[o + 4] = c[1]; flat[o + 5] = c[2]; flat[o + 6] = a; fn++; }
  function line(a, b, c, al) { V(a[0], a[1], a[2], c, al); V(b[0], b[1], b[2], c, al); }

  var theme = {};
  function readTheme() {
    var cs = getComputedStyle(root);
    function rgb(name) { var m = cs.getPropertyValue(name).trim().match(/^#(..)(..)(..)$/); return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [0.5, 0.5, 0.5]; }
    theme = { bg: rgb('--sv-bg'), noise: rgb('--sv-noise'), gold: rgb('--sv-gold'), target: rgb('--sv-target'), rod: rgb('--sv-rod'),
      ok: rgb('--ok'), near: rgb('--near'), bad: rgb('--bad'), out: rgb('--bad') };
    dirty = true;
  }

  /* ---------- camera ---------- */
  var az = -0.62, el = 0.56, W = 1, H = 1, dpr = 1, mvp = new Float32Array(16), userMoved = false, FOV = 34 * Math.PI / 180;
  function resize() {
    var r = stageEl.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2) * quality;
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); dirty = true;
  }
  function camera() {
    var asp = W / H, f = 1 / Math.tan(FOV / 2), fx = f / asp, wide = W > 860;
    var dist = Math.max(112 * f, (wide ? 238 : 162) * fx) * 1.06;
    var ce = Math.cos(el), ex = Math.sin(az) * ce * dist, ey = -Math.cos(az) * ce * dist, ez = Math.sin(el) * dist;
    var tz = 100;
    // view basis: forward = target - eye, world up = +z
    var fwx = -ex, fwy = -ey, fwz = -ez, fl = Math.hypot(fwx, fwy, fwz); fwx /= fl; fwy /= fl; fwz /= fl;
    var sx = fwy, sy = -fwx, sl = Math.hypot(sx, sy); sx /= sl; sy /= sl;                   // side = fwd x up
    var ux = sy * fwz, uy = -sx * fwz, uz = sx * fwy - sy * fwx;                             // up = side x fwd
    var near = dist * 0.2, far = dist * 3, A = (far + near) / (near - far), B = 2 * far * near / (near - far);
    var tx = -(sx * ex + sy * ey), ty = -(ux * ex + uy * ey + uz * (ez + tz) - uz * 0) , tzv = (fwx * ex + fwy * ey + fwz * (ez + tz));
    ty = -(ux * ex + uy * ey + uz * (ez + tz));
    // columns of projection * view
    mvp[0] = fx * sx; mvp[1] = f * ux; mvp[2] = -A * fwx; mvp[3] = fwx;
    mvp[4] = fx * sy; mvp[5] = f * uy; mvp[6] = -A * fwy; mvp[7] = fwy;
    mvp[8] = 0;       mvp[9] = f * uz; mvp[10] = -A * fwz; mvp[11] = fwz;
    mvp[12] = fx * tx; mvp[13] = f * ty; mvp[14] = A * tzv + B; mvp[15] = -tzv;
    if (wide) { var sh = 0.2; mvp[0] += sh * mvp[3]; mvp[4] += sh * mvp[7]; mvp[8] += sh * mvp[11]; mvp[12] += sh * mvp[15]; }  // leave room for the readout on the left
    else { mvp[1] -= 0.08 * mvp[3]; mvp[5] -= 0.08 * mvp[7]; mvp[9] -= 0.08 * mvp[11]; mvp[13] -= 0.08 * mvp[15]; }
  }
  function project(p, out) {
    var x = p[0], y = p[1], z = p[2], w = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
    out[0] = ((mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12]) / w * 0.5 + 0.5) * W;
    out[1] = (0.5 - (mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13]) / w * 0.5) * H;
    return w > 0;
  }

  /* ---------- per-frame geometry ---------- */
  function dronePos(u, out) {
    u = Math.min(1, Math.max(0, u)); var i = 1; while (i < path.length - 1 && path[i].u < u) i++;
    var a = path[i - 1], b = path[i], t = (u - a.u) / Math.max(1e-6, b.u - a.u);
    out[0] = mix(a.x, b.x, t); out[1] = mix(a.y, b.y, t); out[2] = 100 + ALT; out[3] = i; return out;
  }
  var dp = [0, 0, 0, 0];
  function buildFlat(T) {
    fn = 0; var g = theme.gold, i, k, u = (T - T0) / TF;
    var fade = 1 - sstep(T0 + TF + 0.2, T0 + TF + 1.6, T);
    // site limits
    var cz = [h(-HX, -HY), h(HX, -HY), h(HX, HY), h(-HX, HY)], cs = [[-HX, -HY], [HX, -HY], [HX, HY], [-HX, HY]];
    for (i = 0; i < 4; i++) { var a = cs[i], b = cs[(i + 1) % 4]; line([a[0], a[1], cz[i] + 0.3], [b[0], b[1], cz[(i + 1) % 4] + 0.3], g, 0.4); }
    if (u > 0 && fade > 0.01) {
      dronePos(u, dp); var last = dp[3] - 1 + (u >= 1 ? 1 : 0);
      for (i = 1; i <= Math.min(last, path.length - 1); i++) line([path[i - 1].x, path[i - 1].y, 100 + ALT], [path[i].x, path[i].y, 100 + ALT], g, 0.3 * fade);
      if (u < 1) line([path[Math.max(0, last)].x, path[Math.max(0, last)].y, 100 + ALT], [dp[0], dp[1], dp[2]], g, 0.3 * fade);
      for (i = 0; i <= Math.min(last, photos.length - 1); i++) {
        var ph = photos[i], zc = 100 + ALT;
        line([ph.x - 1.6, ph.y, zc], [ph.x + 1.6, ph.y, zc], g, 0.75 * fade); line([ph.x, ph.y - 1.6, zc], [ph.x, ph.y + 1.6, zc], g, 0.75 * fade);
        var age = (u - ph.u) * TF;
        if (u < 1.02 && age < 0.42) {
          var al = (1 - age / 0.42) * 0.9, q = [[-1, -1], [1, -1], [1, 1], [-1, 1]], c3 = [];
          for (k = 0; k < 4; k++) { var qx = ph.x + q[k][0] * FW / 2, qy = ph.y + q[k][1] * FH / 2; c3.push([qx, qy, base(qx, qy) + 0.5]); }
          for (k = 0; k < 4; k++) { line([ph.x, ph.y, zc], c3[k], g, al * 0.55); line(c3[k], c3[(k + 1) % 4], g, al); }
        }
      }
      if (u < 1) { // the drone: four arms
        for (k = 0; k < 4; k++) { var an = Math.PI / 4 + k * Math.PI / 2, ax = dp[0] + Math.cos(an) * 4.2, ay = dp[1] + Math.sin(an) * 4.2;
          line([dp[0], dp[1], dp[2]], [ax, ay, dp[2] + 0.4], theme.target, 1);
          for (var m = 0; m < 8; m++) { var a1 = m * Math.PI / 4, a2 = (m + 1) * Math.PI / 4; line([ax + Math.cos(a1) * 1.7, ay + Math.sin(a1) * 1.7, dp[2] + 0.5], [ax + Math.cos(a2) * 1.7, ay + Math.sin(a2) * 1.7, dp[2] + 0.5], theme.target, 0.8); } }
      }
    }
    // rings round the control targets, rods of the check shots
    for (i = 0; i < GCPS.length; i++) {
      var s = sstep(TG + i * 0.16, TG + i * 0.16 + 0.5, T); if (s <= 0) continue;
      var gx = GCPS[i][0], gy = GCPS[i][1], gz = h(gx, gy) + 1.3, rr = 7.5 * (2 - s);
      for (k = 0; k < 28; k++) { var b1 = k / 28 * 6.2832, b2 = (k + 1) / 28 * 6.2832; line([gx + Math.cos(b1) * rr, gy + Math.sin(b1) * rr, gz], [gx + Math.cos(b2) * rr, gy + Math.sin(b2) * rr, gz], g, s * 0.9); }
    }
    for (i = 0; i < shots.length; i++) {
      var sh = shots[i], sp = sstep(sh.t, sh.t + 0.3, T); if (sp <= 0) continue;
      line([sh.x, sh.y, sh.cloudZ], [sh.x, sh.y, sh.cloudZ + 10.2 * sp], theme.rod, 0.95);
    }
    triStart = fn;
    // painted X targets, flat on the ground
    for (i = 0; i < GCPS.length; i++) {
      s = sstep(TG + i * 0.16, TG + i * 0.16 + 0.35, T); if (s <= 0) continue;
      gx = GCPS[i][0]; gy = GCPS[i][1]; gz = h(gx, gy) + 1.3;
      for (k = 0; k < 2; k++) {
        var ca = k ? 0.7071 : 0.7071, sa = k ? -0.7071 : 0.7071, Lh = 5.2 * s, Wh = 0.95;
        var p1 = [gx - ca * Lh - sa * Wh, gy - sa * Lh + ca * Wh], p2 = [gx + ca * Lh - sa * Wh, gy + sa * Lh + ca * Wh], p3 = [gx + ca * Lh + sa * Wh, gy + sa * Lh - ca * Wh], p4 = [gx - ca * Lh + sa * Wh, gy - sa * Lh - ca * Wh];
        V(p1[0], p1[1], gz, theme.target, 1); V(p2[0], p2[1], gz, theme.target, 1); V(p3[0], p3[1], gz, theme.target, 1);
        V(p1[0], p1[1], gz, theme.target, 1); V(p3[0], p3[1], gz, theme.target, 1); V(p4[0], p4[1], gz, theme.target, 1);
      }
    }
    // prism on top of each rod: a small upright diamond that always faces the camera
    var sdx = Math.cos(az), sdy = Math.sin(az);
    for (i = 0; i < shots.length; i++) {
      sh = shots[i]; sp = sstep(sh.t, sh.t + 0.3, T); if (sp <= 0) continue;
      var col = theme[sh.grade], zt = sh.cloudZ + 10.2 * sp, rw = (selected === sh ? 2.6 : 1.9) * sp;
      var L = [sh.x - sdx * rw, sh.y - sdy * rw, zt], Rr = [sh.x + sdx * rw, sh.y + sdy * rw, zt];
      V(L[0], L[1], L[2], col, 1); V(Rr[0], Rr[1], Rr[2], col, 1); V(sh.x, sh.y, zt + rw * 1.25, col, 1);
      V(L[0], L[1], L[2], col, 1); V(Rr[0], Rr[1], Rr[2], col, 1); V(sh.x, sh.y, zt - rw * 1.25, col, 1);
    }
  }

  /* ---------- draw ---------- */
  var T = 0, started = false, playing = false, dirty = true, visible = true, quality = 1, raf = 0, lastNow = 0;
  var aP = { pos: gl.getAttribLocation(pPts, 'aPos'), start: gl.getAttribLocation(pPts, 'aStart'), col: gl.getAttribLocation(pPts, 'aCol'), rev: gl.getAttribLocation(pPts, 'aRev') };
  var uP = { mvp: gl.getUniformLocation(pPts, 'uMVP'), t: gl.getUniformLocation(pPts, 'uT'), px: gl.getUniformLocation(pPts, 'uPx'), noise: gl.getUniformLocation(pPts, 'uNoise'), gold: gl.getUniformLocation(pPts, 'uGold') };
  var aF = { pos: gl.getAttribLocation(pFlat, 'aPos'), col: gl.getAttribLocation(pFlat, 'aCol') }, uF = { mvp: gl.getUniformLocation(pFlat, 'uMVP') };
  var scr = [0, 0], boxes = [];
  function draw() {
    camera();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(theme.bg[0], theme.bg[1], theme.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true);
    gl.useProgram(pPts); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.enableVertexAttribArray(aP.pos); gl.vertexAttribPointer(aP.pos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aP.start); gl.vertexAttribPointer(aP.start, 3, gl.FLOAT, false, STRIDE, 12);
    gl.enableVertexAttribArray(aP.col); gl.vertexAttribPointer(aP.col, 3, gl.UNSIGNED_BYTE, true, STRIDE, 24);
    gl.enableVertexAttribArray(aP.rev); gl.vertexAttribPointer(aP.rev, 1, gl.UNSIGNED_BYTE, true, STRIDE, 27);
    gl.uniformMatrix4fv(uP.mvp, false, mvp); gl.uniform1f(uP.t, T / 12);
    gl.uniform1f(uP.px, spacing * Math.sqrt(N / drawN) * 2.3 * canvas.height / (2 * Math.tan(FOV / 2)));
    gl.uniform3fv(uP.noise, theme.noise); gl.uniform3fv(uP.gold, theme.gold);
    gl.drawArrays(gl.POINTS, 0, drawN);
    gl.disableVertexAttribArray(aP.start); gl.disableVertexAttribArray(aP.col); gl.disableVertexAttribArray(aP.rev);

    buildFlat(T);
    gl.useProgram(pFlat); gl.bindBuffer(gl.ARRAY_BUFFER, flatBuf); gl.bufferData(gl.ARRAY_BUFFER, flat.subarray(0, fn * 7), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aF.pos); gl.vertexAttribPointer(aF.pos, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(aF.col); gl.vertexAttribPointer(aF.col, 4, gl.FLOAT, false, 28, 12);
    gl.uniformMatrix4fv(uF.mvp, false, mvp);
    if (fn > triStart) gl.drawArrays(gl.TRIANGLES, triStart, fn - triStart);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawArrays(gl.LINES, 0, triStart);
    gl.disableVertexAttribArray(aF.col);

    // labels
    boxes.length = 0;
    for (var i = 0; i < labels.length; i++) {
      var l = labels[i], on = T >= l.s.t + 0.2 && project(l.top, scr) && scr[0] > 4 && scr[0] < W - 4 && scr[1] > 4 && scr[1] < H - 4;
      if (on !== l.shown) { l.shown = on; l.el.hidden = !on; }
      if (!on) continue;
      var x = scr[0], y = scr[1], w = W < 640 ? 62 : 78, hgt = 22, dot = false, bx = [x - 6, y - hgt - 6, x + w, y - 2];
      for (var k = 0; k < boxes.length; k++) { var b = boxes[k]; if (bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1]) { dot = true; break; } }
      if (bx[2] > W - 2) dot = true;
      if (l.s === selected) dot = false;
      if (dot) bx = [x - 9, y - 9, x + 9, y + 9];
      boxes.push(bx);
      if (dot !== l.dot) { l.dot = dot; l.el.classList.toggle('is-dot', dot); }
      l.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }
  }
  function status() {
    var u = (T - T0) / TF, txt;
    if (T < T0) txt = 'Before the flight: nothing but noise';
    else if (u < 1) txt = 'Flying the grid: photo ' + Math.min(photos.length, 1 + photos.filter(function (p) { return p.u <= u; }).length) + ' of ' + photos.length;
    else if (T < TS) txt = 'Ground control: ' + GCPS.length + ' painted targets, used to fit the model';
    else if (T < TEND) txt = 'Check shots: ' + shots.filter(function (s) { return s.t <= T; }).length + ' of ' + shots.length + ', used only to grade it';
    else txt = 'Checked against ' + stats.n + ' stick shots';
    if (statusEl.textContent !== txt) statusEl.textContent = txt;
    root.classList.toggle('is-done', T >= TEND);
  }
  var frames = 0, slow = 0, tuned = false;
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.1, (now - lastNow) / 1000 || 0.016); lastNow = now;
    if (playing) {
      T += dt; if (!userMoved) az += dt * 0.022;
      if (T >= TMAX) { T = TMAX; setPlaying(false); }
      scrub.value = String(T);
      if (!tuned) { frames++; if (dt > 0.03) slow++; if (frames === 45) { tuned = true; if (slow > 20) { if (quality === 1 && (window.devicePixelRatio || 1) > 1) quality = 0.66; drawN = Math.round(N * 0.55); resize(); } } }
    }
    if (window.__svFrames != null) window.__svFrames++;
    draw(); status(); dirty = false;
    schedule();
  }
  function schedule() { if (started && !raf && visible && !document.hidden && (playing || dirty || dragging)) raf = requestAnimationFrame(frame); }
  function setPlaying(p) {
    playing = p; playBtn.setAttribute('aria-pressed', String(p));
    playBtn.querySelector('span').textContent = p ? 'Pause' : (T >= TMAX ? 'Replay' : 'Play');
    root.classList.toggle('is-playing', p); lastNow = performance.now(); schedule();
  }
  playBtn.addEventListener('click', function () { if (!playing && T >= TMAX) { T = 0; select(null); } setPlaying(!playing); });
  scrub.addEventListener('input', function () { T = parseFloat(scrub.value); if (playing) setPlaying(false); else playBtn.querySelector('span').textContent = T >= TMAX ? 'Replay' : 'Play'; dirty = true; schedule(); });

  /* ---------- orbit ---------- */
  var dragging = false, px0 = 0, py0 = 0;
  canvas.addEventListener('pointerdown', function (e) { dragging = true; userMoved = true; px0 = e.clientX; py0 = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} root.classList.add('is-dragging'); });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    az -= (e.clientX - px0) * 0.006; if (e.pointerType !== 'touch') el = Math.min(1.25, Math.max(0.2, el + (e.clientY - py0) * 0.005));
    px0 = e.clientX; py0 = e.clientY; dirty = true; schedule();
  });
  function endDrag() { dragging = false; root.classList.remove('is-dragging'); }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', function (e) {
    var k = e.key, used = true;
    if (k === 'ArrowLeft') az += 0.12; else if (k === 'ArrowRight') az -= 0.12;
    else if (k === 'ArrowUp') el = Math.min(1.25, el + 0.08); else if (k === 'ArrowDown') el = Math.max(0.2, el - 0.08); else used = false;
    if (used) { e.preventDefault(); userMoved = true; dirty = true; schedule(); }
  });

  /* ---------- lifecycle ---------- */
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { lastNow = performance.now(); schedule(); } }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', function () { lastNow = performance.now(); schedule(); });
  if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); schedule(); }).observe(stageEl); else window.addEventListener('resize', function () { resize(); schedule(); });
  new MutationObserver(function () { readTheme(); schedule(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); root.classList.remove('is-live'); root.classList.add('is-static'); playing = false; });

  function start(play) {
    started = true; readTheme(); resize();
    root.classList.add('is-live'); root.classList.remove('is-waiting');
    if (play) { T = 0; setPlaying(true); } else { T = TMAX; scrub.value = String(T); setPlaying(false); dirty = true; schedule(); }
  }
  if (POSTER) { az = -0.62 + 0.022 * TMAX; start(false); if (params.get('t')) { T = parseFloat(params.get('t')); scrub.value = String(T); az = -0.62 + 0.022 * T; dirty = true; schedule(); } window.__svReady = true; return; }
  if (reduce.matches) {
    root.classList.add('is-waiting');
    startBtn.addEventListener('click', function () { start(true); playBtn.focus(); });
  } else start(true);
  window.__svReady = true;
})();
