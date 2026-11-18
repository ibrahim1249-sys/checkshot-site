// Checks the built site in headless Chromium. node tools/check.cjs [screenshot folder]
// Every page at 1440x900 and 390x844: script errors, requests to other servers, sideways scroll, links, alt text,
// heading order, text contrast (both themes). Home page: frame rate of the illustration, reduced-motion and no-WebGL fallbacks.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), serve = require('./serve.cjs');
const shots = process.argv[2] || null, PAGES = ['/', '/download/', '/credits.html', '/legal/eula.html', '/legal/privacy.html', '/legal/terms.html', '/404.html', '/no-such-page'];
let fails = 0; const ok = (c, msg, extra) => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + msg + (extra ? '  [' + extra + ']' : '')); };
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const audit = () => {
  const lum = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[, /]+/).map(Number); return { c: p.slice(0, 3), a: p[3] == null || isNaN(p[3]) ? 1 : p[3] }; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = parse(getComputedStyle(e).backgroundColor); if (b && b.a > 0.99) return b.c; } return [255, 255, 255]; };
  const low = [], seen = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const el = n.parentElement; if (!n.textContent.trim() || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getClientRects().length || el.closest('[hidden]')) continue;
    if (el.closest('.sv-label[aria-pressed="true"]')) continue;
    const fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el), l1 = lum(fg.c), l2 = lum(bg), r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) low.push(el.tagName + '.' + el.className + ' ' + r.toFixed(2) + ' "' + n.textContent.trim().slice(0, 30) + '"');
  }
  const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter(h => h.getClientRects().length).map(h => +h.tagName[1]); let order = hs[0] === 1 && hs.filter(h => h === 1).length === 1;
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) order = false;
  return {
    low, order, hs: hs.join(''),
    noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.src),
    unnamed: [...document.querySelectorAll('a,button,input,canvas')].filter(e => !(e.textContent.trim() || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.title)).map(e => e.outerHTML.slice(0, 60)),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', lang: document.documentElement.lang,
    links: [...document.querySelectorAll('a[href],link[href],script[src],img[src]')].map(e => e.href || e.src),
    ids: [...document.querySelectorAll('a[href*="#"]')].map(a => { const u = new URL(a.href); return u.pathname === location.pathname && u.hash.length > 1 && !document.getElementById(u.hash.slice(1)) ? u.hash : null; }).filter(Boolean),
  };
};

(async () => {
  const s = await serve(), b = await chromium.launch({ args: GL }), origin = s.url, checked = new Map(), titles = new Map(), descs = new Map();
  const head = async u => { if (!checked.has(u)) checked.set(u, (await fetch(u)).status); return checked.get(u); };
  for (const [vw, vh, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) for (const theme of ['dark', 'light']) {
    const c = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    await c.addInitScript(t => { try { localStorage.setItem('cs-theme', t); } catch (e) {} }, theme);
    for (const pg of PAGES) {
      const p = await c.newPage(), errs = [], ext = [];
      p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      p.on('request', q => { if (!q.url().startsWith(origin) && !/^(data|blob):/.test(q.url())) ext.push(q.url()); });
      const resp = await p.goto(origin + pg + (pg === '/' ? '?poster' : '')); await p.waitForTimeout(pg === '/' ? 1500 : 250);
      const a = await p.evaluate(audit), name = `${tag} ${theme} ${pg}`;
      const errs2 = pg === '/no-such-page' ? errs.filter(e => !/404/.test(e)) : errs;
      const bad = [];
      for (const l of new Set(a.links)) if (l.startsWith(origin) && (await head(l.split('#')[0])) !== 200) bad.push(l);
      const problems = [errs2.length && 'errors: ' + errs2.join(' | '), ext.length && 'outside requests: ' + ext.join(' '), a.overflow > 0 && 'sideways scroll ' + a.overflow + 'px',
        bad.length && 'broken links: ' + bad.join(' '), a.ids.length && 'missing anchors: ' + a.ids.join(' '), a.noAlt.length && 'img without alt: ' + a.noAlt.join(' '), a.unnamed.length && 'unnamed controls: ' + a.unnamed.join(' '),
        !a.order && 'heading order ' + a.hs, a.low.length && 'low contrast: ' + a.low.slice(0, 4).join(' ; '), a.lang !== 'en-CA' && 'lang', pg === '/no-such-page' && resp.status() !== 404 && 'status'].filter(Boolean);
      ok(!problems.length, name, problems.join(' // '));
      if (tag === 'desktop' && theme === 'dark' && pg !== '/no-such-page') { titles.set(pg, a.title); descs.set(pg, a.desc); }
      if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.evaluate(() => Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode ? i.decode().catch(() => {}) : 0; }))); await p.screenshot({ path: path.join(shots, `${tag}-${theme}-${pg.replace(/\W+/g, '_') || 'home'}.png`), fullPage: true }); }
      await p.close();
    }
    await c.close();
  }
  ok(new Set(titles.values()).size === titles.size && [...titles.values()].every(t => t.length > 10 && t.length < 70), 'every page has its own title', [...titles.values()].join(' / ').slice(0, 60) + '...');
  ok(new Set(descs.values()).size === descs.size && [...descs.values()].every(d => d.length > 50 && d.length < 260), 'every page has its own description');
  for (const f of ['/sitemap.xml', '/robots.txt', '/CNAME', '/favicon.ico', '/site.webmanifest', '/assets/img/og.png', '/assets/img/favicon.svg', '/assets/img/apple-touch-icon.png', '/assets/img/icon-192.png', '/assets/img/icon-512.png']) ok((await head(origin + f)) === 200, 'serves ' + f);

  console.log('Home page illustration');
  for (const [vw, vh, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const c = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: tag === 'phone' ? 2 : 1, hasTouch: tag === 'phone', isMobile: tag === 'phone' });
    const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__svFrames = 0; });
    await p.goto(origin + '/'); await p.waitForFunction(() => window.__svReady); await p.waitForTimeout(1500);
    const f0 = await p.evaluate(() => window.__svFrames); await p.waitForTimeout(4000); const f1 = await p.evaluate(() => window.__svFrames), fps = (f1 - f0) / 4;
    ok(fps > 4, `${tag}: illustration draws while playing`, fps.toFixed(0) + ' frames/s in software WebGL (a real GPU is faster)');
    if (shots) await p.screenshot({ path: path.join(shots, `hero-${tag}-playing.png`) });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(600);
    const g0 = await p.evaluate(() => window.__svFrames); await p.waitForTimeout(1500); const g1 = await p.evaluate(() => window.__svFrames);
    ok(g1 - g0 <= 1, `${tag}: stops drawing when scrolled out of view`, (g1 - g0) + ' frames in 1.5 s');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForFunction(() => /Replay/.test(document.querySelector('.sv-play').textContent), null, { timeout: 90000 });
    await p.waitForTimeout(700); const h0 = await p.evaluate(() => window.__svFrames); await p.waitForTimeout(1500); const h1 = await p.evaluate(() => window.__svFrames);
    ok(h1 - h0 <= 1, `${tag}: stops drawing once the sequence has finished`, (h1 - h0) + ' frames in 1.5 s');
    ok(/^Pass\. RMSE 1\.9 cm is within the 5\.0 cm tolerance\.$/.test((await p.textContent('.sv-verdict')).trim()), `${tag}: summary reads like the Checker`, (await p.textContent('.sv-verdict')).trim());
    const lab = p.locator('.sv-label:not([hidden]):not(.is-dot)').first(); await lab.click(); ok(/^Shot 2\d\d\./.test((await p.textContent('.sv-verdict')).trim()) && await p.isVisible('.sv-back'), `${tag}: picking a shot shows its numbers`, (await p.textContent('.sv-readout')).replace(/\s+/g, ' ').trim().slice(0, 90));
    if (shots) await p.screenshot({ path: path.join(shots, `hero-${tag}-shot.png`) });
    await p.click('.sv-back'); ok(/^Pass/.test((await p.textContent('.sv-verdict')).trim()), `${tag}: back to the summary`);
    if (tag === 'desktop') {
      const bx = await p.locator('#survey canvas').boundingBox(); const before = await p.locator('.sv-label:not([hidden])').first().evaluate(e => e.style.transform);
      await p.mouse.move(bx.x + bx.width - 30, bx.y + bx.height - 24); await p.mouse.down(); await p.mouse.move(bx.x + bx.width - 230, bx.y + bx.height - 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
      ok(before !== await p.locator('.sv-label:not([hidden])').first().evaluate(e => e.style.transform), 'desktop: dragging turns the view');
      await p.focus('#survey canvas'); const k0 = await p.locator('.sv-label:not([hidden])').first().evaluate(e => e.style.transform); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
      ok(k0 !== await p.locator('.sv-label:not([hidden])').first().evaluate(e => e.style.transform), 'desktop: arrow keys turn the view');
      await p.focus('.sv-scrub'); await p.keyboard.press('Home'); await p.waitForTimeout(300); ok(/Before the flight/.test(await p.textContent('.sv-status')), 'desktop: the slider moves through the survey by keyboard', await p.textContent('.sv-status'));
      await p.click('.sv-play'); await p.waitForTimeout(400); ok(await p.getAttribute('.sv-play', 'aria-pressed') === 'true' && /Pause/.test(await p.textContent('.sv-play')), 'desktop: Play starts it and turns into Pause');
      await p.click('#theme-btn'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light' && getComputedStyle(document.body).backgroundColor === 'rgb(246, 245, 241)' && localStorage.getItem('cs-theme') === 'light'), 'desktop: theme switch goes light and is remembered');
    }
    ok(!errs.length, `${tag}: no script errors`, errs.join(' | ')); await c.close();
  }
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.addInitScript(() => { window.__svFrames = 0; });
    await p.goto(origin + '/'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => window.__svFrames === 0 && !document.getElementById('survey').classList.contains('is-live') && getComputedStyle(document.querySelector('.sv-poster.dark')).visibility === 'visible' && document.querySelector('.sv-poster.dark').naturalWidth > 0), 'reduced motion: nothing is drawn, the still image shows');
    ok(await p.isVisible('.sv-start') && await p.isVisible('.sv-readout') && /^Pass/.test((await p.textContent('.sv-verdict')).trim()), 'reduced motion: summary and a "Play the illustration" button are there');
    if (shots) await p.screenshot({ path: path.join(shots, 'hero-reduced-motion.png') });
    await p.click('.sv-start'); await p.waitForTimeout(800); ok(await p.evaluate(() => window.__svFrames > 0), 'reduced motion: it plays only when asked'); await c.close();
  }
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await p.goto(origin + '/'); await p.waitForTimeout(800);
    ok(!errs.length && await p.evaluate(() => document.getElementById('survey').classList.contains('is-static') && document.querySelectorAll('#sv-table-body tr').length === 15) && !(await p.isVisible('.sv-play')) && await p.isVisible('.sv-readout'), 'no WebGL: still image, summary and the table of shots, no dead controls');
    if (shots) await p.screenshot({ path: path.join(shots, 'hero-no-webgl.png') }); await c.close();
  }
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const p = await c.newPage(); await p.goto(origin + '/');
    ok(await p.isVisible('h1') && await p.isVisible('.sv-poster.dark') && await p.isVisible('#reel') && /Tag control/.test(await p.textContent('#reel')), 'no JavaScript: the page still reads, with the still image and the three features in words'); await c.close();
  }
  await b.close(); s.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
