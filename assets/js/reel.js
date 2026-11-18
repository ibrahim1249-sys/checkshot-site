/* Checkshot site: the three-feature reel on the home page (Tag, Check, Convert).
   Canvas 2D, no libraries, no images: the "photo", the point cloud and the targets are drawn
   from the functions below. Scenes 1 and 2 use made-up data. Scene 3 uses a real conversion of
   one example point (NAD83(CSRS) UTM 12N -> Alberta 3TM 114), computed with Checkshot's own
   projection data (proj4 + crs.json); the numbers are written out below so the page needs no maths library.
   Runs only while on screen; shows still frames when the visitor prefers reduced motion. */
(function () {
  'use strict';
  var root = document.getElementById('reel');
  if (!root || !root.querySelector('canvas').getContext) return;
  var cv = root.querySelector('canvas'), cx = cv.getContext('2d');
  var tabs = [].slice.call(root.querySelectorAll('.rl-tab'));
  var hud = root.querySelector('.rl-hud-body'), pauseBtn = root.querySelector('.rl-pause');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DUR = [9.5, 9.5, 9];
  var LABEL = [
    'Illustration, made-up photo: the Tagger scans an aerial photo of a gravel pad, checks a bucket lid and a board and skips them, then matches a black and white checkered ground control target at 97 percent and finds the same target in three more photos.',
    'Illustration, made-up data: a point cloud of a graded site turns slowly while ten rod shots drop onto it. Each shot is coloured by how far the cloud is from it, then the statistics appear.',
    'Illustration with a real example point: the point cloud stays still while the grid under it turns 2.41 degrees from UTM zone 12N to Alberta 3TM 114, and the coordinates change.'
  ];
  var W = 0, H = 0, DPR = 1, scene = 0, t = 0, last = 0, raf = 0, visible = false, userPaused = false, hudCache = '';

  /* ---------- helpers ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function ease(x) { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function hash(i, j) { var n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, y) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) { return vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.2; }
  var C = {};
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    ['bg', 'panel', 'ink', 'muted', 'line', 'line-strong', 'gold', 'gold-text', 'ok', 'near', 'bad', 'sv-bg'].forEach(function (k) {
      C[k] = s.getPropertyValue('--' + k).trim() || '#888';
    });
  }
  function rgba(hex, a) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function fmt(v, d) { var s = Math.abs(v).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (v < 0 ? '−' : '') + s.join('.'); }
  function signed(v, d) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d); }
  function setHud(html) { if (html !== hudCache) { hud.innerHTML = html; hudCache = html; } }
  function line(k, v, cls) { return '<div class="rl-row' + (cls ? ' ' + cls : '') + '"><dt>' + k + '</dt><dd class="num">' + v + '</dd></div>'; }
  function text(s, x, y, size, col, align, font) {
    cx.font = (font || '400 ') + size + 'px ' + (font && font.indexOf('mono') >= 0 ? '' : '"IBM Plex Mono", ui-monospace, monospace');
    cx.fillStyle = col; cx.textAlign = align || 'left'; cx.textBaseline = 'middle'; cx.fillText(s, x, y);
  }

  /* ---------- scene 1: Tag (search one photo, then find the target in the others) ---------- */
  var GW = 640, GH = 320, GS = 1.5, ground = null;      // world units; the texture is drawn at 1.5× for detail
  var TGT = { x: 292, y: 178 }, LAT = { x: 304, y: 168 };
  var CANDS = [{ x: 128, y: 112, s: 0.34, what: 'bucket lid' }, { x: 446, y: 246, s: 0.41, what: 'board' }, { x: 214, y: 268, s: 0.22, what: 'stone' }];
  var PHOTO_W = 5472, PHOTO_H = 3648;                   // Autel XL705 frame, pixels
  function drawTarget(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(20,16,10,0.35)'; g.fillRect(-s + 0.9, -s + 0.9, 2 * s + 0.4, 2 * s + 0.4);   // sun from the upper left
    g.fillStyle = '#EEEAE0'; g.fillRect(-s - 0.5, -s - 0.5, 2 * s + 1, 2 * s + 1);
    g.fillStyle = '#161514'; g.fillRect(-s, -s, s, s); g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(120,100,70,0.35)'; [[-4.5, 3], [3.2, -5.1], [5.5, 4.4], [-2, -2.6]].forEach(function (d) { g.fillRect(d[0], d[1], 0.7, 0.7); });
    g.restore();
  }
  function drawObjects(g) {                              // world coordinates, vector, so it stays sharp under the magnifier
    var L = CANDS[0], B = CANDS[1], S = CANDS[2];
    g.fillStyle = 'rgba(20,16,10,0.35)'; g.beginPath(); g.arc(L.x + 1.3, L.y + 1.3, 4.4, 0, 7); g.fill();
    g.fillStyle = '#E4E0D6'; g.beginPath(); g.arc(L.x, L.y, 4.4, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 0.5; g.beginPath(); g.arc(L.x, L.y, 3.3, 0, 7); g.stroke();
    g.save(); g.translate(B.x, B.y); g.rotate(-0.5);
    g.fillStyle = 'rgba(20,16,10,0.35)'; g.fillRect(-5, -2.4, 12, 7); g.fillStyle = '#C9BFA6'; g.fillRect(-6, -3.5, 12, 7);
    g.strokeStyle = 'rgba(80,60,30,0.35)'; g.lineWidth = 0.4; for (var k = -2; k <= 2; k += 2) { g.beginPath(); g.moveTo(-6, k); g.lineTo(6, k + 0.3); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(20,16,10,0.3)'; g.beginPath(); g.ellipse(S.x + 1, S.y + 1, 3.2, 2.4, 0.4, 0, 7); g.fill();
    g.fillStyle = '#BDB6A6'; g.beginPath(); g.ellipse(S.x, S.y, 3.2, 2.4, 0.4, 0, 7); g.fill();
    // survey lath with flagging tape beside the target, and its shadow
    g.strokeStyle = 'rgba(20,16,10,0.35)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(LAT.x, LAT.y); g.lineTo(LAT.x + 9, LAT.y + 5); g.stroke();
    g.fillStyle = '#D8C49A'; g.fillRect(LAT.x - 1, LAT.y - 1, 2.2, 2.2);
    g.fillStyle = '#FF5FA2'; g.fillRect(LAT.x - 2.6, LAT.y - 0.6, 2, 1.2);
    drawTarget(g, TGT.x, TGT.y, 7.2, 0.32);
  }
  // stockpiles: centre, radius, height, colour (topsoil, pit-run gravel, a small topsoil pile)
  var PILES = [[468, 44, 50, 10, [96, 74, 54]], [60, 226, 40, 7, [150, 144, 132]], [196, 36, 24, 4.5, [102, 80, 58]]];
  function pileR(P, x, y) { var a = Math.atan2(y - P[1], x - P[0]); return P[2] * (0.86 + 0.22 * vnoise(Math.cos(a) * 2 + P[0], Math.sin(a) * 2 + P[1])); }
  function relief(x, y, grassAmt) {
    var h = 0;
    for (var q = 0; q < PILES.length; q++) {
      var P = PILES[q], dx = x - P[0], dy = (y - P[1]) * 1.25, dd = Math.sqrt(dx * dx + dy * dy) / pileR(P, x, y);
      if (dd < 1) h += P[3] * Math.pow(1 - dd * dd, 1.6) * (0.92 + 0.16 * vnoise(x / 5, y / 5));
    }
    return h + grassAmt * (0.9 * vnoise(x * 1.3, y * 1.3) + 0.5 * vnoise(x * 3.1, y * 2.7));
  }
  function makeGround() {
    var cw = GW * GS, ch = GH * GS, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d'), im = g.createImageData(cw, ch), d = im.data, i = 0;
    for (var Y = 0; Y < ch; Y++) for (var X = 0; X < cw; X++, i += 4) {
      var x = X / GS, y = Y / GS, n = fbm(x / 40, y / 40), fine = vnoise(x * 0.9, y * 0.9), grain = hash(X * 0.73, Y * 1.31);
      var grassA = clamp((fbm(x / 70 + 9, y / 70 + 2) - 0.56) / 0.06, 0, 1);
      var h0 = relief(x, y, grassA), hx = relief(x + 0.8, y, grassA) - h0, hy = relief(x, y + 0.8, grassA) - h0;
      var shade = clamp(1 + (-hx - hy) * 1.15, 0.45, 1.45);                  // light from the upper left
      var pileC = null, pileK = 0;
      for (var q = 0; q < PILES.length; q++) { var P = PILES[q], ddx = x - P[0], ddy = (y - P[1]) * 1.25, dd = Math.sqrt(ddx * ddx + ddy * ddy) / pileR(P, x, y);
        if (dd < 1.08) { pileK = clamp((1.08 - dd) / 0.12, 0, 1); pileC = P[4]; } }
      var ry = Math.abs(y - (0.27 * x + 34)), road = ry < 18, shoulder = ry >= 18 && ry < 23;
      var grass = fbm(x / 70 + 9, y / 70 + 2), gr = clamp((grass - 0.56) / 0.06, 0, 1) * (road || shoulder ? 0 : 1);
      var dirt = clamp((fbm(x / 55 + 4, y / 55 + 7) - 0.5) / 0.08, 0, 1) * (1 - gr);
      var R, G, B;
      if (road) { var a = 62 + 10 * n + 6 * fine + 5 * grain; R = a; G = a; B = a * 1.02; }
      else if (shoulder) { var sh = 128 + 18 * fine + 10 * grain; R = sh * 1.04; G = sh; B = sh * 0.9; }
      else {
        var gv = 132 + 30 * n + 16 * fine + 12 * grain;                      // gravel pad
        R = gv * 1.03; G = gv * 0.99; B = gv * 0.9;
        var dv = 104 + 26 * n + 10 * grain; R = mix(R, dv * 1.12, dirt); G = mix(G, dv * 0.95, dirt); B = mix(B, dv * 0.74, dirt);
        var blade = hash(X * 1.9, Y * 0.37), clump = vnoise(x * 0.45, y * 0.45), gg = 58 + 30 * fine + 24 * blade + 30 * clump;  // grass, with clumps
        R = mix(R, gg * 0.86, gr); G = mix(G, gg * 1.02, gr); B = mix(B, gg * 0.6, gr);
      }
      if (pileC && !road) { var pv = 0.86 + 0.28 * fine + 0.12 * grain; R = mix(R, pileC[0] * pv, pileK); G = mix(G, pileC[1] * pv, pileK); B = mix(B, pileC[2] * pv, pileK); }
      if (!road && grain > 0.985) { R += 40; G += 38; B += 34; }               // pebbles
      if (!road) { R *= shade; G *= shade; B *= shade; }
      d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    g.scale(GS, GS);
    g.strokeStyle = 'rgba(236,232,222,0.7)'; g.lineWidth = 1;                // road edge lines and centre dashes
    [-17, 17].forEach(function (o) { g.beginPath(); g.moveTo(0, 34 + o); g.lineTo(GW, 0.27 * GW + 34 + o); g.stroke(); });
    g.strokeStyle = 'rgba(214,184,96,0.75)'; g.setLineDash([10, 12]); g.beginPath(); g.moveTo(0, 34); g.lineTo(GW, 0.27 * GW + 34); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(60,50,38,0.22)'; g.lineWidth = 3.2;                 // tire ruts across the pad
    [0, 7].forEach(function (o) { g.beginPath(); g.moveTo(40, 300 - o); g.bezierCurveTo(180, 230 - o, 330, 236 - o, 620, 150 - o); g.stroke(); });
    drawObjects(g);
    return c;
  }
  var PATH = [[0, { x: 70, y: 70 }], [2.7, CANDS[0]], [3.5, CANDS[0]], [4.4, CANDS[1]], [5.1, CANDS[1]], [6.1, TGT]];
  function lensAt(tt) {
    for (var i = 1; i < PATH.length; i++) if (tt <= PATH[i][0]) {
      var a = PATH[i - 1], b = PATH[i], k = ease(seg(tt, a[0], b[0]));
      return { x: mix(a[1].x, b[1].x, k), y: mix(a[1].y, b[1].y, k) };
    }
    return { x: TGT.x, y: TGT.y };
  }
  function brackets(x, y, r, col, w) {
    var l = r * 0.42; cx.strokeStyle = col; cx.lineWidth = w;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
      cx.beginPath(); cx.moveTo(x + c[0] * r, y + c[1] * (r - l)); cx.lineTo(x + c[0] * r, y + c[1] * r); cx.lineTo(x + c[0] * (r - l), y + c[1] * r); cx.stroke();
    });
  }
  function scene1(tt) {
    if (!ground) ground = makeGround();
    var pan = 1 + 0.035 * Math.min(tt, 9.5) / 9.5;                         // slow push-in, like looking closer
    var s = Math.max(W / GW, H / GH) * pan, ox = (W - GW * s) / 2 + (TGT.x - GW / 2) * (pan - 1) * -s * 4, oy = (H - GH * s) / 2;
    var sx = function (x) { return ox + x * s; }, sy = function (y) { return oy + y * s; };
    cx.imageSmoothingEnabled = true;
    cx.drawImage(ground, ox, oy, GW * s, GH * s);
    var dim = 0.12 + 0.2 * seg(tt, 2.4, 3.0);
    cx.fillStyle = 'rgba(10,10,10,' + dim + ')'; cx.fillRect(0, 0, W, H);
    // photo label
    cx.fillStyle = 'rgba(14,14,15,0.78)'; cx.fillRect(12, 12, 236, 24);
    text('MAX_0142.JPG  ·  5472 × 3648', 22, 24, 11.5, '#F2EFE8', 'left');
    // scan line, then candidates
    var scan = seg(tt, 0.9, 2.4);
    if (scan > 0 && scan < 1) { var lx = W * scan; cx.fillStyle = rgba(C.gold, 0.55); cx.fillRect(lx - 1, 0, 2, H); }
    var all = CANDS.concat([{ x: TGT.x, y: TGT.y, s: 0.97, what: 'target' }]);
    all.forEach(function (c, q) {
      var px = sx(c.x), seen = W * scan > px || tt >= 2.4; if (!seen) return;
      var isT = q === 3, done = isT ? tt > 6.1 : (q === 0 ? tt > 3.2 : q === 1 ? tt > 4.8 : tt > 2.4);
      var col = isT && done ? C.gold : 'rgba(242,239,232,0.75)';
      brackets(px, sy(c.y), 13, col, isT && done ? 2 : 1.2);
      if (done) text(isT ? 'match ' + Math.round(c.s * 100) + '%' : Math.round(c.s * 100) + '%', px, sy(c.y) + 23, 10.5, isT ? '#F2EFE8' : 'rgba(242,239,232,0.7)', 'center');
    });
    // magnifier
    var lens = seg(tt, 2.5, 2.9);
    if (lens > 0) {
      var p = lensAt(tt), px = sx(p.x), py = sy(p.y), R = Math.min(H * 0.2, W * 0.15) * ease(lens), Z = 2.6;
      var lock = seg(tt, 6.1, 6.5), off = { x: px + R * 0.95, y: py - R * 0.95 };   // the lens sits up and right of what it looks at
      var lx2 = off.x + R * 0.25, ly2 = off.y - R * 0.25;
      if (ly2 - R < 8) ly2 = py + R * 1.2;
      if (lx2 + R > W - Math.min(H * 0.25, W * 0.16) - 30) lx2 = px - R * 1.2;
      cx.strokeStyle = 'rgba(242,239,232,0.6)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(lx2 - R * 0.7, ly2 + R * 0.7); cx.stroke();
      cx.save(); cx.beginPath(); cx.arc(lx2, ly2, R, 0, 7); cx.clip();
      var sw = 2 * R / (s * Z);
      cx.drawImage(ground, (p.x - sw / 2) * GS, (p.y - sw / 2) * GS, sw * GS, sw * GS, lx2 - R, ly2 - R, 2 * R, 2 * R);
      cx.translate(lx2 - p.x * s * Z, ly2 - p.y * s * Z); cx.scale(s * Z, s * Z); drawObjects(cx);
      cx.restore();
      cx.strokeStyle = '#0E0E0F'; cx.lineWidth = 4; cx.beginPath(); cx.arc(lx2, ly2, R + 1, 0, 7); cx.stroke();
      cx.strokeStyle = lock > 0 ? C.gold : '#F2EFE8'; cx.lineWidth = 2; cx.beginPath(); cx.arc(lx2, ly2, R, 0, 7); cx.stroke();
      var g2 = R * 0.16, a2 = R * 0.34;                                       // the Checkshot crosshair: a gap in the middle
      cx.lineWidth = 1.4; cx.beginPath();
      cx.moveTo(lx2 - a2, ly2); cx.lineTo(lx2 - g2, ly2); cx.moveTo(lx2 + g2, ly2); cx.lineTo(lx2 + a2, ly2);
      cx.moveTo(lx2, ly2 - a2); cx.lineTo(lx2, ly2 - g2); cx.moveTo(lx2, ly2 + g2); cx.lineTo(lx2, ly2 + a2); cx.stroke();
      if (lock >= 1) text('GCP 04  ' + (TGT.x * PHOTO_W / GW).toFixed(1) + ', ' + (TGT.y * PHOTO_H / GH).toFixed(1) + ' px', lx2, ly2 - R - 14, 11.5, '#F2EFE8', 'center');
    }
    // the same target in three more photos
    var th = Math.min(H * 0.25, W * 0.16), tx = W - th - 16, names = ['MAX_0143.JPG', 'MAX_0151.JPG', 'MAX_0152.JPG'], sc = [95, 93, 96];
    var offs = [[-9, 5, 0.22, 1.1], [7, -6, -0.35, 0.9], [-3, -8, 0.6, 1.25]];
    for (var k = 0; k < 3; k++) {
      var a = ease(seg(tt, 6.8 + k * 0.45, 7.3 + k * 0.45)); if (a <= 0) continue;
      var ty = 16 + k * (th + 26), x0 = tx + (1 - a) * (th + 30);
      cx.globalAlpha = a;
      cx.fillStyle = '#0E0E0F'; cx.fillRect(x0 - 3, ty - 3, th + 6, th + 22);
      cx.save(); cx.beginPath(); cx.rect(x0, ty, th, th); cx.clip();
      var o = offs[k], cxp = x0 + th / 2 + o[0] * th / 60, cyp = ty + th / 2 + o[1] * th / 60, zz = th / 46 * o[3];
      cx.translate(cxp, cyp); cx.rotate(o[2]); cx.scale(zz, zz);
      cx.drawImage(ground, (TGT.x - 40) * GS, (TGT.y - 40) * GS, 80 * GS, 80 * GS, -40, -40, 80, 80);
      cx.translate(-TGT.x, -TGT.y); drawObjects(cx);
      cx.restore();
      brackets(cxp, cyp, th * 0.16, C.gold, 1.6);
      text(names[k], x0, ty + th + 9, 10.5, '#F2EFE8', 'left');
      text(sc[k] + '% ✓', x0 + th, ty + th + 9, 10.5, C['gold-text'], 'right');
      cx.globalAlpha = 1;
    }
    var found = tt < 6.1 ? 0 : 1 + [0, 1, 2].filter(function (k) { return tt > 7.3 + k * 0.45; }).length;
    var status = tt < 0.9 ? 'Photo MAX_0142.JPG' : tt < 2.4 ? 'Scanning for GCP 04' : tt < 3.2 ? 'Checking: bucket lid' : tt < 3.5 ? 'Bucket lid: 34%, skipped' : tt < 4.8 ? 'Checking: board' : tt < 5.1 ? 'Board: 41%, skipped' : tt < 6.1 ? 'Checking the target' : found < 4 ? 'GCP 04 found, 97%' : 'GCP 04 found in 4 photos';
    setHud('<p class="rl-k">1 · Tag control</p><p class="rl-desc">Click a target in one photo. The Tagger finds it in the others and writes the control file.</p>' +
      '<p class="rl-status">' + status + '</p><dl>' +
      line('Target', 'checkered, 2 × 2') + line('Photos with GCP 04', found + ' of 4') +
      line('Centre in MAX_0142', tt >= 6.5 ? (TGT.x * PHOTO_W / GW).toFixed(1) + ', ' + (TGT.y * PHOTO_H / GH).toFixed(1) : '…') +
      line('Writes', tt > 8.7 ? 'gcp_list.txt · ReCap XML' : '…', tt > 8.7 ? 'hi' : '') + '</dl>' +
      '<p class="rl-note">Made-up photo and scores. You accept or reject each find; nothing is used until you do.</p>');
  }

  /* ---------- the synthetic site for scenes 2 and 3 ---------- */
  var NX = 58, NY = 30, HX = 72, HY = 36, VEX = 3;           // half extents (m), vertical exaggeration
  function height(x, y) {
    var pond = 2.6 * Math.exp(-((x + 32) * (x + 32) + (y - 9) * (y - 9)) / 180);
    var pile = 3.2 * Math.exp(-((x - 41) * (x - 41) + (y + 12) * (y + 12)) / 90);
    return 2.2 * fbm(x / 26 + 3, y / 26) + 0.018 * x - pond + pile;
  }
  var PTS = [], zmin = 1e9, zmax = -1e9;
  for (var j = 0; j < NY; j++) for (var i = 0; i < NX; i++) {
    var x = -HX + 2 * HX * i / (NX - 1) + (hash(i, j) - 0.5) * 1.6, y = -HY + 2 * HY * j / (NY - 1) + (hash(j, i) - 0.5) * 1.6, z = height(x, y);
    PTS.push([x, y, z]); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
  }
  // made-up rod shots: position and (cloud Z minus shot Z), metres
  var SHOTS = [[-55, -20, 0.012], [-38, 18, -0.018], [-20, -8, 0.025], [-5, 24, 0.004], [8, -26, -0.031],
               [22, 6, 0.019], [41, -12, 0.058], [52, 22, -0.007], [62, -2, 0.015], [-48, 4, -0.022]];
  var dzs = SHOTS.map(function (s) { return s[2]; }), n = dzs.length;
  var MEAN = dzs.reduce(function (a, b) { return a + b; }, 0) / n;
  var RMSE = Math.sqrt(dzs.reduce(function (a, b) { return a + b * b; }, 0) / n);
  var STD = Math.sqrt(dzs.reduce(function (a, b) { return a + (b - MEAN) * (b - MEAN); }, 0) / (n - 1));
  function band(d) { d = Math.abs(d); return d <= 0.03 ? 'ok' : d <= 0.05 ? 'near' : 'bad'; }
  function project(x, y, z, yaw, pitch, k, cy) {
    var c = Math.cos(yaw), s = Math.sin(yaw), X = x * c - y * s, Y = x * s + y * c, Z = (z - (zmin + zmax) / 2) * VEX;
    var sp = Math.sin(pitch), cp = Math.cos(pitch), depth = Y * cp - Z * sp, f = 260 / (260 + depth);
    return [W / 2 + X * k * f, cy - (Y * sp + Z * cp) * k * f, f];
  }
  function drawCloud(yaw, pitch, k, cy, alpha) {
    var lo = C.muted, hi = C.ink;
    for (var q = 0; q < PTS.length; q++) {
      var p = PTS[q], s = project(p[0], p[1], p[2], yaw, pitch, k, cy), h = (p[2] - zmin) / (zmax - zmin);
      cx.fillStyle = rgba(h > 0.5 ? hi : lo, alpha * (0.55 + 0.45 * h));
      var r = 1.7 * s[2]; cx.fillRect(s[0] - r / 2, s[1] - r / 2, r, r);
    }
  }

  /* ---------- scene 2: Check ---------- */
  function scene2(tt) {
    var k = Math.min(W / (HX * 2.5), H / (HY * 2.6)), cy = H * 0.56, yaw = -0.55 + Math.sin(tt * 0.32) * 0.18, pitch = 0.62;
    drawCloud(yaw, pitch, k, cy, ease(seg(tt, 0, 0.8)));
    var shown = 0;
    for (var q = 0; q < SHOTS.length; q++) {
      var sh = SHOTS[q], a = seg(tt, 1.2 + q * 0.42, 1.65 + q * 0.42); if (a <= 0) continue;
      shown++;
      var z = height(sh[0], sh[1]), col = C[band(sh[2])], drop = (1 - ease(a)) * 14;
      var base = project(sh[0], sh[1], z + drop / VEX, yaw, pitch, k, cy), top = project(sh[0], sh[1], z + drop / VEX + 8 / VEX * 1.6, yaw, pitch, k, cy);
      cx.strokeStyle = C.ink; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(base[0], base[1]); cx.lineTo(top[0], top[1]); cx.stroke();
      cx.fillStyle = col; cx.beginPath(); cx.moveTo(top[0], top[1]); cx.lineTo(top[0] + 11, top[1] + 4); cx.lineTo(top[0], top[1] + 8); cx.fill();
      if (a >= 1) {
        cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(base[0], base[1], 7, 3.2, 0, 0, 7); cx.stroke();
        if (W > 560) text(signed(sh[2], 3), top[0] + 14, top[1] + 4, 11, col, 'left');
      }
    }
    text('vertical exaggeration × ' + VEX, 14, H - 14, 10.5, C.muted, 'left');
    var done = tt > 6.0, worst = SHOTS.reduce(function (w, s) { return Math.abs(s[2]) > Math.abs(w[2]) ? s : w; });
    var out = SHOTS.filter(function (s) { return band(s[2]) === 'bad'; }).length;
    setHud('<p class="rl-k">2 · Check the cloud</p><p class="rl-desc">Grade the finished point cloud against the shots you took with the rod, before it goes to Civil 3D.</p><p class="rl-status">' + (done ? 'Checked against ' + n + ' rod shots' : 'Checking shot ' + Math.max(shown, 1) + ' of ' + n) + '</p><dl>' +
      line('Mean Δz', done ? signed(MEAN, 3) + ' m' : '…') + line('RMSE', done ? RMSE.toFixed(3) + ' m' : '…') +
      line('Std dev', done ? STD.toFixed(3) + ' m' : '…') + line('Worst shot', done ? signed(worst[2], 3) + ' m' : '…', done ? 'bad' : '') +
      line('Outside ±0.05 m', done ? out + ' of ' + n : '…') + '</dl>' +
      '<p class="rl-note">Made-up shots. Δz is cloud minus rod. The real Checker adds 95%, doming and tilt tests.</p>');
  }

  /* ---------- scene 3: Convert (real example point) ---------- */
  var FROM = { e: 334775.740, n: 5935914.577, name: 'NAD83(CSRS) / UTM 12N', code: 'EPSG 2956' };
  var TO = { e: 33552.007, n: 5934921.506, name: 'NAD83(CSRS) / Alberta 3TM 114', code: 'EPSG 3780' };
  var CONV0 = 2.006, CONV1 = -0.407, ROT = CONV0 - CONV1;   // grid convergence at the example point: UTM 12N, 3TM 114 (degrees)
  var PPM = 21;                // grid scale difference at the point: 100 m east is 99.4241 m (UTM) vs 99.4220 m (3TM)
  function scramble(v, d, k, seed) {
    var s = fmt(v, d); if (k >= 1) return s;
    var keep = Math.floor(s.length * k), out = '';
    for (var q = 0; q < s.length; q++) out += q < keep || !/\d/.test(s[q]) ? s[q] : String(Math.floor(hash(q + seed, Math.floor(t * 20)) * 10));
    return out;
  }
  function scene3(tt) {
    var k = Math.min(W / (HX * 3.0), H / (HY * 3.4)), cy = H * 0.54, pitch = 1.05, yaw = 0;
    var r = ease(seg(tt, 2.2, 4.6)), ang = -mix(CONV0, CONV1, r) * Math.PI / 180, toLbl = seg(tt, 4.2, 4.8);   // screen up = true north
    var cE = r < 0.5 ? FROM.e : TO.e, cN = r < 0.5 ? FROM.n : TO.n;
    // grid under the cloud
    cx.save(); cx.lineWidth = 1;
    var STEP = 20, ext = 110, c = Math.cos(ang), s = Math.sin(ang);
    function gp(u, v) { return project(u * c - v * s, u * s + v * c, zmin - 0.4, yaw, pitch, k, cy); }
    var offE = ((cE % STEP) + STEP) % STEP, offN = ((cN % STEP) + STEP) % STEP;
    for (var u = -ext - offE; u <= ext; u += STEP) {
      var a1 = gp(u, -ext * 0.62), a2 = gp(u, ext * 0.62); cx.strokeStyle = rgba(C.gold, 0.32); cx.beginPath(); cx.moveTo(a1[0], a1[1]); cx.lineTo(a2[0], a2[1]); cx.stroke();
      if (Math.abs(u) < ext * 0.9) { var lb = gp(u, -ext * 0.5); text(fmt(Math.round(cE + u), 0), lb[0], lb[1] + 12, 10, rgba(C['gold-text'], 0.9), 'center'); }
    }
    for (var v = -ext * 0.62 - offN; v <= ext * 0.62; v += STEP) {
      var b1 = gp(-ext, v), b2 = gp(ext, v); cx.strokeStyle = rgba(C.gold, 0.32); cx.beginPath(); cx.moveTo(b1[0], b1[1]); cx.lineTo(b2[0], b2[1]); cx.stroke();
      if (Math.abs(v) < ext * 0.5) { var lv = gp(-ext * 0.86, v); text(fmt(Math.round(cN + v), 0), lv[0], lv[1] - 8, 10, rgba(C['gold-text'], 0.9), 'left'); }
    }
    cx.restore();
    drawCloud(yaw, pitch, k, cy, 1);
    // the example point
    var ep = project(0, 0, height(0, 0), yaw, pitch, k, cy);
    cx.strokeStyle = C.ink; cx.lineWidth = 2; cx.beginPath(); cx.arc(ep[0], ep[1], 6, 0, 7); cx.stroke();
    cx.beginPath(); cx.moveTo(ep[0] - 11, ep[1]); cx.lineTo(ep[0] + 11, ep[1]); cx.moveTo(ep[0], ep[1] - 11); cx.lineTo(ep[0], ep[1] + 11); cx.stroke();
    // north arrows: true north stays, grid north turns
    var ax = W - 70, ay = 58;
    function arrow(a, col, lbl) {
      var dx = Math.sin(a) * 30, dy = -Math.cos(a) * 30; cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(ax, ay + 14); cx.lineTo(ax + dx, ay + dy); cx.stroke();
      cx.beginPath(); cx.arc(ax + dx, ay + dy, 3, 0, 7); cx.fill(); text(lbl, ax + dx + (a === 0 ? -10 : 10), ay + dy - 10, 10, col, a === 0 ? 'right' : 'left');
    }
    arrow(0, C.muted, 'true N'); arrow(ang * 6, C.gold, 'grid N');
    text('arrow angle × 6 so it shows; the grid lines turn the true 2.41°', 14, H - 14, 10.5, C.muted, 'left');
    var kE = seg(tt, 4.4, 5.6), kN = seg(tt, 4.8, 6.0);
    setHud('<p class="rl-k">3 · Convert</p><p class="rl-desc">Move the cloud into your coordinate system. Checkshot says which transform it used and what it changed.</p><p class="rl-status">' + (tt < 2.2 ? 'Example point, Edmonton' : tt < 4.6 ? 'Converting…' : 'Converted. Same ground, new grid') + '</p><dl>' +
      line('From', FROM.code) + line('E', fmt(FROM.e, 3)) + line('N', fmt(FROM.n, 3)) +
      line('To', toLbl > 0 ? TO.code : '…', toLbl > 0 ? 'hi' : '') +
      line('E', tt > 4.4 ? scramble(TO.e, 3, kE, 1) : '…') + line('N', tt > 4.8 ? scramble(TO.n, 3, kN, 7) : '…') +
      line('Grid turn here', tt > 6.2 ? ROT.toFixed(2) + '°' : '…') + line('Grid scale change', tt > 6.5 ? PPM + ' ppm (2.1 mm / 100 m)' : '…') +
      line('Round trip', tt > 6.8 ? '0.000 mm' : '…') + '</dl>' +
      '<p class="rl-note">Real numbers for one example point, from Checkshot\'s own coordinate data. The cloud on the left is made up.</p>');
  }

  /* ---------- loop ---------- */
  var SCENES = [scene1, scene2, scene3];
  function resize() {
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    draw();
  }
  function draw() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.fillStyle = C['sv-bg']; cx.fillRect(0, 0, W, H);
    SCENES[scene](t);
    tabs.forEach(function (b, q) {
      b.setAttribute('aria-pressed', q === scene ? 'true' : 'false');
      b.style.setProperty('--p', q === scene ? (reduce.matches ? 1 : clamp(t / DUR[q], 0, 1)) : 0);
    });
  }
  function running() { return visible && !userPaused && !reduce.matches && !document.hidden; }
  function frame(now) {
    raf = 0; if (!running()) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (t > DUR[scene]) { scene = (scene + 1) % 3; t = 0; cv.setAttribute('aria-label', LABEL[scene]); }
    draw(); raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && running()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function go(q) { scene = q; t = reduce.matches ? DUR[q] : 0; cv.setAttribute('aria-label', LABEL[q]); draw(); kick(); }

  tabs.forEach(function (b, q) { b.addEventListener('click', function () { go(q); }); });
  pauseBtn.addEventListener('click', function () {
    userPaused = !userPaused; pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    pauseBtn.textContent = userPaused ? 'Play' : 'Pause'; kick();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }, { threshold: 0.15 }).observe(cv);
  else visible = true;
  document.addEventListener('visibilitychange', kick);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
  new MutationObserver(function () { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  reduce.addEventListener && reduce.addEventListener('change', function () { go(scene); });
  readColors();
  if (reduce.matches) { pauseBtn.hidden = true; t = DUR[0]; }
  cv.setAttribute('aria-label', LABEL[0]);
  resize(); kick();
  window.__reel = { go: go, at: function (q, tt) { scene = q; t = tt; draw(); } };   // for screenshots in tools/check
})();
