// Renders the still images the home page falls back to (and the social preview) from the live illustration.
// node tools/poster.cjs   (needs playwright with Chromium)
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), serve = require('./serve.cjs');
(async () => {
  const s = await serve(), b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const img = path.resolve(__dirname, '..', 'assets', 'img'), tmp = process.env.SHOT_TMP || require('os').tmpdir();
  for (const theme of ['dark', 'light']) {
    const c = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    await c.addInitScript(t => { try { localStorage.setItem('cs-theme', t); } catch (e) {} }, theme);
    const p = await c.newPage(); await p.goto(s.url + '/index.html?poster'); await p.waitForFunction(() => window.__svReady); await p.waitForTimeout(800);
    await p.addStyleTag({ content: '.sv-stage{height:760px!important}.sv-readout,.sv-start,.sv-poster{display:none!important}.sv-label.is-dot{visibility:hidden}' }); await p.waitForTimeout(500);
    await p.locator('.sv-stage').screenshot({ path: path.join(tmp, `hero-poster-${theme}.png`) });
    await c.close();
  }
  if (fs.existsSync(path.join(__dirname, 'og.html'))) {
    const c = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }); const p = await c.newPage();
    await p.goto(s.url + '/tools/og.html'); await p.waitForTimeout(600); await p.screenshot({ path: path.join(img, 'og.png') }); await c.close();
  }
  await b.close(); s.close(); console.log('posters in', tmp);
})();
