// Takes the app screenshots used on the site, from the real app page.
// Run: node tools/app-shots.cjs /path/to/checkshot-desktop [out folder]
// Needs the `playwright` package with Chromium. Everything loaded into the app here is made up on the spot:
// a synthetic 240 m square on a local-looking grid, not a survey.
// If <app>/web/vendor exists (after `node scripts/vendor.mjs`) the app's own fonts are used; if not, the
// screenshots fall back to system fonts and should be retaken on a machine that has them.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const app = path.resolve(process.argv[2] || '../checkshot-market');
const out = path.resolve(process.argv[3] || path.join(__dirname, '..', 'assets', 'shots'));
const theme = process.argv[4] || 'dark';

const site = fs.mkdtempSync(path.join(os.tmpdir(), 'checkshot-shots-'));
for (const f of ['index.html', 'app-shim.js', 'licence.js']) fs.copyFileSync(path.join(app, 'web', f), path.join(site, f));
fs.cpSync(path.join(app, 'data'), path.join(site, 'data'), { recursive: true });
const vendor = path.join(app, 'web', 'vendor');
if (fs.existsSync(path.join(vendor, 'fonts.css'))) fs.cpSync(vendor, path.join(site, 'vendor'), { recursive: true });
else {
  console.warn('app-shots: web/vendor not found, using system fonts');
  fs.mkdirSync(path.join(site, 'vendor', 'exifr'), { recursive: true });
  fs.writeFileSync(path.join(site, 'vendor', 'fonts.css'), '');
  fs.writeFileSync(path.join(site, 'vendor', 'exifr', 'full.umd.js'), 'window.exifr={parse:async()=>({})};');
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(site, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const gauss = () => { let a = 0; for (let i = 0; i < 6; i++) a += rnd(); return (a - 3) / 0.7071; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'checkshot-data-'));
  fs.mkdirSync(out, { recursive: true });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: theme });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(() => window.KitCRS && window.KitCRS.get(3005));
  await p.click(`.kit-theme button[data-mode="${theme}"]`);
  const snap = async (name, opts = {}) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `${name}-${theme}.png`), ...opts }); console.log('shot', name); };

  // Synthetic job: a gently sloping surface with a few centimetres of noise, and 24 made-up stick shots.
  const E0 = 5000, N0 = 6100000, Z0 = 100, sh = [], cl = [];
  const surf = (e, n) => Z0 + 0.011 * (e - E0) + 0.004 * (n - N0);
  for (let i = 0; i < 24; i++) {
    const e = E0 + 20 + (i % 6) * 40 + rnd() * 8, n = N0 + 20 + Math.floor(i / 6) * 60 + rnd() * 8;
    const dz = 0.006 + gauss() * 0.014;                       // cloud minus shot, made up
    for (let k = 0; k < 160; k++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1.2, x = e + r * Math.cos(a), y = n + r * Math.sin(a); cl.push(`${x.toFixed(3)} ${y.toFixed(3)} ${(surf(x, y) + gauss() * 0.004).toFixed(3)}`); }
    sh.push(`${200 + i},${n.toFixed(3)},${e.toFixed(3)},${(surf(e, n) - dz).toFixed(3)},${i % 5 === 0 ? 'TC' : i % 3 === 0 ? 'FG' : 'EG'}`);
  }
  for (let k = 0; k < 9000; k++) { const x = E0 + rnd() * 240, y = N0 + rnd() * 240; cl.push(`${x.toFixed(3)} ${y.toFixed(3)} ${(surf(x, y) + gauss() * 0.004).toFixed(3)}`); }
  fs.writeFileSync(path.join(tmp, 'synthetic_cloud.txt'), cl.join('\n') + '\n');
  fs.writeFileSync(path.join(tmp, 'synthetic_shots.csv'), sh.join('\n') + '\n');

  // made-up control for the Tagger
  fs.writeFileSync(path.join(tmp, 'synthetic_gcps.csv'), [[1, 20, 20], [2, 220, 25], [3, 30, 215], [4, 225, 220], [5, 120, 118], [6, 70, 150], [7, 180, 80]].map(g => `${g[0]},${(N0 + g[2]).toFixed(3)},${(E0 + g[1]).toFixed(3)},${surf(E0 + g[1], N0 + g[2]).toFixed(3)},GCP`).join('\n') + '\n');
  await p.setInputFiles('#csvIn', path.join(tmp, 'synthetic_gcps.csv')); await p.waitForTimeout(600);
  await snap('tagger');

  await p.click('#tab-ck');
  await p.setInputFiles('#ck-file', path.join(tmp, 'synthetic_cloud.txt')); await p.waitForFunction(() => !document.getElementById('ck-info').hidden);
  await p.setInputFiles('#ck-sfile', path.join(tmp, 'synthetic_shots.csv')); await p.waitForFunction(() => /^24 shots/.test(document.getElementById('ck-sSub').textContent));
  await p.selectOption('#ck-src', '3780'); await p.selectOption('#ck-dst', '3780'); await p.fill('#ck-tol', '0.05'); await p.click('#ck-run'); await p.waitForSelector('#ck-verdict:not([hidden])');
  console.log('where:', (await p.textContent('#ck-where')).trim()); console.log('verdict:', (await p.textContent('#ck-verdict')).trim().slice(0, 200));
  await snap('checker-top');
  await p.locator('#ck-verdict').scrollIntoViewIfNeeded(); await snap('checker');
  await snap('checker-full', { fullPage: true });

  await p.click('#tab-cv');
  const pts = Array.from({ length: 30000 }, () => (() => { const x = 400000 + rnd() * 300, y = 6100000 + rnd() * 300; return [x, y, 100 + 0.012 * (x - 400000) + 0.006 * (y - 6100000) + 1.5 * Math.sin(x / 40) * Math.cos(y / 55)]; })().map(v => v.toFixed(3)).join(' '));
  fs.writeFileSync(path.join(tmp, 'synthetic_utm.txt'), pts.join('\n') + '\n');
  await p.setInputFiles('#cv-file', path.join(tmp, 'synthetic_utm.txt')).catch(() => p.setInputFiles('#file', path.join(tmp, 'synthetic_utm.txt')));
  await p.waitForFunction(() => !document.getElementById('cv-run').disabled);
  console.log('src guess:', await p.inputValue('#cv-src'), (await p.textContent('#cv-srcWhy')).trim());
  await p.selectOption('#cv-dst', '3780'); await p.click('#cv-run'); await p.waitForSelector('#cv-dlrow:not([hidden])');
  console.log('msg:', (await p.textContent('#cv-msg')).trim().slice(0, 240));
  await snap('converter'); await snap('converter-full', { fullPage: true });
  await p.selectOption('#cv-dst', '__more'); await p.fill('.kit-crs-q', 'alberta'); await p.waitForFunction(() => document.querySelectorAll('.kit-crs-list li').length > 0);
  await snap('crs-search');
  if (errs.length) console.warn('page errors:', errs);
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
