#!/usr/bin/env python3
"""Writes the site's HTML pages. The site itself needs no build step: the pages this writes are
committed and served as they are. Run this only after changing the shared header/footer or the
page text below:  python3 tools/build.py [folder with eula.md, privacy.md, terms.md]
"""
import html, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://checkshot.ca'
MAIL = 'support@checkshot.ca'
RELEASES = 'https://github.com/ibrahim1249-sys/checkshot-site/releases/latest'
LEGAL_SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'legal' / 'src'

MARK = ('<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="23" fill="none" stroke="var(--logo-ring)" stroke-width="3"/>'
        '<path d="M32 3V13M32 51V61M3 32H13M51 32H61" stroke="var(--logo-ring)" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M23.5 23.5 40.5 40.5M40.5 23.5 23.5 40.5" stroke="var(--logo-x)" stroke-width="5.5" stroke-linecap="round"/></svg>')
THEME = "<script>try{if(localStorage.getItem('cs-theme')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}</script>"


def page(path, title, desc, body, current='', extra_head='', scripts='', robots=''):
    depth = path.count('/')
    r = '../' * depth
    url = SITE + '/' + re.sub(r'index\.html$', '', path)
    def nav(href, label, key, cls=''):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a href="{r}{href}"{cur}{cls}>{label}</a>'
    head404 = ''
    if path == '404.html':   # served at any address, so set where relative links start from
        head404 = "<script>document.write('<base href=\"'+(/github\\.io$/.test(location.hostname)?'/'+location.pathname.split('/')[1]+'/':'/')+'\">')</script>\n"
    out = f'''<!doctype html>
<html lang="en-CA" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{head404}<title>{title}</title>
<meta name="description" content="{html.escape(desc, quote=True)}">
{robots}<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Checkshot">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(desc, quote=True)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Checkshot: a point cloud of a graded site with check shots marked on it.">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E0E0F">
<link rel="icon" href="{r}favicon.ico" sizes="32x32">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{r}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{r}site.webmanifest">
<link rel="preload" href="{r}assets/fonts/big-shoulders-700.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="{r}assets/fonts/work-sans-400.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="{r}assets/css/site.css">
{THEME}
{extra_head}</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="{r}./" aria-label="Checkshot home">{MARK}<span>CHECK<b>SHOT</b></span></a>
    <nav aria-label="Main">
      {nav('./#how', 'How it works', 'how', ' class="opt"')}
      {nav('./#requirements', 'Requirements', 'req', ' class="opt"')}
      {nav('./#faq', 'Questions', 'faq', ' class="opt"')}
      {nav('download/', 'Download', 'download', ' class="btn small"')}
      <button class="theme" type="button" id="theme-btn" aria-label="Switch to the light theme">Light</button>
    </nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="tblock">
      <div>
        <a class="brand" href="{r}./" aria-label="Checkshot home">{MARK}<span>CHECK<b>SHOT</b></span></a>
        <p>Drone-survey checking for Windows. Tag the control, convert the cloud, check it against your stick shots. Made in Alberta, Canada.</p>
      </div>
      <div>
        <h2>Contact</h2>
        <p><a href="mailto:{MAIL}">{MAIL}</a></p>
        <p>Questions, bug reports and licence requests all go to this address.</p>
      </div>
      <div>
        <h2>Site</h2>
        <ul>
          <li><a href="{r}./">Home</a></li>
          <li><a href="{r}download/">Download</a></li>
          <li><a href="{r}credits.html">Credits and licences</a></li>
        </ul>
      </div>
      <div>
        <h2>Legal</h2>
        <ul>
          <li><a href="{r}legal/eula.html">Licence agreement</a></li>
          <li><a href="{r}legal/privacy.html">Privacy</a></li>
          <li><a href="{r}legal/terms.html">Terms of sale</a></li>
        </ul>
      </div>
    </div>
    <p class="fine">&copy; 2026 Checkshot. This site sets no cookies and runs no analytics. WebODM, OpenDroneMap, Civil 3D, ReCap, Autel, DJI, Esri, ArcGIS and Windows are trademarks of their owners and are named only to describe what the app works with. No endorsement is implied.</p>
  </div>
</footer>
<script src="{r}assets/js/site.js"></script>
{scripts}</body>
</html>
'''
    f = ROOT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(out, encoding='utf-8')
    return url


def shot(r, name, alt, cap, w=2560, h=1600, link=True):
    o = f'<a href="{r}assets/shots/{name}-dark.webp" aria-label="Open the screenshot full size">' if link else '<div class="frame">'
    c = '</a>' if link else '</div>'
    return f'''<figure class="shot">
  {o}
    <img class="dark" src="{r}assets/shots/{name}-dark.webp" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{alt}">
    <img class="light" src="{r}assets/shots/{name}-light.webp" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{alt}">
  {c}
  <figcaption>{cap}</figcaption>
</figure>'''


# ------------------------------------------------------------------ home
HOME = f'''<section class="hero" aria-labelledby="h-hero">
  <div class="wrap hero-head">
    <h1 id="h-hero">Tag your ground control once. Send it to WebODM or ReCap.</h1>
    <div class="hero-side">
      <p>Checkshot is a Windows app for drone surveys on land development jobs. Click a target in one photo and the Tagger finds it in the others, then writes the control file for OpenDroneMap, WebODM or Autodesk ReCap. When the point cloud comes back, convert it to your coordinate system and check it against shots you took with the rod. It runs offline and it shows its numbers.</p>
      <div>
        <div class="hero-cta">
          <a class="btn" href="download/">Download the beta</a>
          <a href="#how">See the three steps</a>
        </div>
        <p class="hero-note">Free until March 31, 2027. Windows 10 and 11, no admin rights needed.</p>
      </div>
    </div>
  </div>

  <div class="survey" id="survey">
    <div class="sv-stage">
      <img class="sv-poster dark" src="assets/img/hero-poster-dark.webp" width="1600" height="760" alt="" fetchpriority="high">
      <img class="sv-poster light" src="assets/img/hero-poster-light.webp" width="1600" height="760" alt="" loading="lazy">
      <canvas tabindex="0" role="img" aria-label="Illustration with made-up data: a drone flies a grid over a graded site with roads, lots, a stormwater pond and a topsoil pile. The point cloud forms as photos are taken. Ground control targets and fifteen check shots then appear. Drag, or use the arrow keys, to turn the view."></canvas>
      <div class="sv-labels"></div>
      <button class="btn small sv-start" type="button">Play the illustration</button>
    </div>
    <div class="sv-readout" role="group" aria-label="Checker result for the illustration" aria-live="polite">
      <p class="sv-verdict"></p>
      <dl></dl>
      <button class="sv-back" type="button" hidden>Back to the summary</button>
    </div>
    <div class="wrap sv-bar">
      <button class="sv-play" type="button" aria-pressed="false"><span>Play</span></button>
      <input class="sv-scrub" type="range" min="0" max="17" step="0.01" value="17" aria-label="Move through the survey: flight, ground control, check shots">
      <p class="sv-status">Checked against 14 stick shots</p>
    </div>
  </div>
  <div class="wrap sv-caption">
    <p><strong>An illustration, not a survey.</strong> The site and every number on it are made up to show what the Checker reports. Drag to turn it. Pick a shot to read it.</p>
    <ul class="sv-key" aria-label="Key">
      <li class="x">ground control, used to fit the model</li>
      <li style="--k:var(--ok)">check shot inside tolerance</li>
      <li style="--k:var(--near)">close to it</li>
      <li style="--k:var(--bad)">left out</li>
    </ul>
  </div>
  <div class="wrap">
    <details class="sv-data">
      <summary>The illustration's check shots as a table</summary>
      <div class="scroll-x"><table class="nums">
        <caption class="vh">Made-up check shots used in the illustration</caption>
        <thead><tr><th scope="col">Shot</th><th scope="col">Code</th><th scope="col">Shot Z (m)</th><th scope="col">Cloud Z (m)</th><th scope="col">&Delta;z (m)</th><th scope="col">Used</th></tr></thead>
        <tbody id="sv-table-body"><tr><td colspan="6">Needs JavaScript.</td></tr></tbody>
      </table></div>
    </details>
  </div>
</section>

<section class="band" id="how" aria-labelledby="h-how">
  <div class="wrap">
    <div class="band-title">
      <h2 id="h-how">The work, in order</h2>
      <p>Three tools in one window. Use all three, or only the one you need today.</p>
    </div>
    <div>
      <article class="step">
          <h3><span class="n">1</span> Tag the control</h3>
          <p>Load the GCP shots from your data collector and the photos from the flight. Click the centre of a target in one photo. The Tagger looks for that target in the other photos and puts what it finds at the front of the list for you to accept or reject.</p>
        {shot('', 'tagger', 'The GCP Tagger with seven made-up control points loaded: a site map on the left, the control list under it, and the three steps to tag a target on the right.', 'GCP Tagger with made-up control loaded, before the photos are added.', link=False)}
          <ul>
            <li>Writes <code>gcp_list.txt</code> for OpenDroneMap and WebODM, or a survey XML for Autodesk ReCap.</li>
            <li>Notices when your firm's grid is shifted from the true projection, tells you by how much, and remembers it.</li>
            <li>A point with no elevation in the file is left out of the export and named. Nothing is written with Z = 0.</li>
            <li>Tick any shot as a check point and it is kept out of the control.</li>
          </ul>
      </article>
      <article class="step">
          <h3><span class="n">2</span> Convert the cloud</h3>
          <p>Take a LAS, LAZ or text point cloud from the system your processing software wrote it in to the one your drawings are in. The Converter guesses the source system from the numbers, says that it is a guess, and tells you in words where the cloud lands before anything runs.</p>
        {shot('', 'converter', 'The Converter after converting a made-up UTM point cloud to Alberta 3TM: a message stating the transform used and its largest difference from the exact maths, point counts, a download button and a plot of the cloud.', 'Converter result on a made-up cloud. The green line says which transform was used and how far it is from the exact maths.')}
          <ul>
            <li>5,860 EPSG projected systems, including Alberta 3TM and UTM.</li>
            <li>NAD27 through Natural Resources Canada's NTv2 grid, inside Canada. Outside the grid it stops with a message.</li>
            <li>US survey feet and international feet. X, Y and Z all come out in feet.</li>
            <li>Out: a point file thinned on a grid for Civil 3D, or a LAS with the new coordinates.</li>
            <li>Says plainly when a step changes geometry, and by how much.</li>
          </ul>
      </article>
      <article class="step">
          <h3><span class="n">3</span> Check it</h3>
          <p>Load the cloud and your stick shots and set a tolerance. The Checker fits a plane to the cloud points around each shot, so slopes do not bias the height, and gives you the difference at every one.</p>
        {shot('', 'checker', 'The Checker after grading a made-up cloud against 24 made-up shots: a Pass line with the RMSE, tiles for mean, RMSE, standard deviation, 95 percent and worst shot, doming and tilt tests, and a map of the shots.', 'Checker result on made-up data: verdict, statistics, bend tests and a map of the shots.')}
          <ul>
            <li>Mean, RMSE, standard deviation, the 95% figure (1.96 &times; RMSE), worst shot and share inside tolerance.</li>
            <li>Tests for doming and tilt. With enough shots on slopes, a horizontal shift too.</li>
            <li>Every shot in a table with its slope, roughness and point count. Untick one and the numbers update.</li>
            <li>Results out as CSV.</li>
          </ul>
          <blockquote class="app">
            <p>Independent shots only. Never the shots you tagged as GCPs: the model was fitted to those, so they always look good and prove nothing.</p>
            <footer>From the Checker's own screen</footer>
          </blockquote>
      </article>
    </div>
  </div>
</section>

<section class="band tinted" id="rules" aria-labelledby="h-rules">
  <div class="wrap">
    <div class="band-title">
      <h2 id="h-rules">Ground rules</h2>
      <p>What the app will and will not do with your data.</p>
    </div>
    <dl class="rows">
      <div><dt>Your files stay put</dt><dd>Everything runs on your computer. No account, no upload, no usage reports. One thing is optional: if you turn on the satellite map, the app asks Esri for map tiles of the area on screen, using your own ArcGIS key.</dd></div>
      <div><dt>One to one</dt><dd>Checkshot does not scale, shift or best-fit your data behind your back. When a step changes geometry, it tells you what changed and shows the numbers.</dd></div>
      <div><dt>It shows its numbers</dt><dd>You get the verdict and the working: every shot's difference, the slope it sits on, how many cloud points were used. All of it goes into the CSV.</dd></div>
      <div><dt>It stops instead of guessing</dt><dd>A NAD27 point outside the Canadian grid stops the conversion. A ReCap export in a system the app has never seen in a real ReCap file is refused. A shot with no elevation is left out and named.</dd></div>
      <div><dt>Control is not a check</dt><dd>The model was fitted to your GCPs, so they will always agree with it. The Checker tells you to bring shots the model has never seen.</dd></div>
      <div><dt>You still check it</dt><dd>Checkshot is a checking aid. It does not replace a qualified person, field verification or sign-off. Confirm results against your own control before you rely on them.</dd></div>
    </dl>
  </div>
</section>

<section class="band" id="requirements" aria-labelledby="h-req">
  <div class="wrap">
    <div class="band-title">
      <h2 id="h-req">What you need</h2>
    </div>
    <dl class="rows plain">
      <div><dt>Windows</dt><dd>Windows 10 or 11, 64-bit. The installer sets it up for your user account only, so it does not ask for admin rights. It uses Microsoft Edge WebView2, which Windows 10 and 11 already have.</dd></div>
      <div><dt>Linux</dt><dd>A <code>.deb</code> for Ubuntu and Debian and an <code>.AppImage</code> are posted with each release.</dd></div>
      <div><dt>Internet</dt><dd>Not needed. Only the optional satellite map and place search go online.</dd></div>
      <div><dt>Files in</dt><dd>Drone photos (JPEG), control and check shots as CSV (PNEZD and similar), point clouds as LAS, LAZ or text.</dd></div>
      <div><dt>Files out</dt><dd><code>gcp_list.txt</code>, ReCap survey XML, LAS, text point files, results CSV.</dd></div>
      <div><dt>Works beside</dt><dd>OpenDroneMap and WebODM, Autodesk ReCap, Civil 3D. Checkshot does not process photos into a point cloud. It prepares the control going in and checks the cloud coming out.</dd></div>
    </dl>
  </div>
</section>

<section class="band" id="beta" aria-labelledby="h-beta">
  <div class="wrap">
    <div class="band-title">
      <h2 id="h-beta">Beta and price</h2>
    </div>
    <div class="beta">
      <h3>Free until March 31, 2027</h3>
      <p>The beta is the full app and you may use it on paid work. After March 31, 2027 it needs a licence key, and it will not save files without one. The key is checked on your computer, so a licensed copy still works offline.</p>
      <p>The price has not been set. It will be posted here before the beta ends.</p>
      <p><a class="btn" href="download/">Download the beta</a></p>
    </div>
  </div>
</section>

<section class="band" id="faq" aria-labelledby="h-faq">
  <div class="wrap">
    <div class="band-title">
      <h2 id="h-faq">Questions</h2>
      <p>Anything else: <a href="mailto:{MAIL}">{MAIL}</a></p>
    </div>
    <div class="faq">
      <details><summary>Does Checkshot turn photos into a point cloud?</summary><div><p>No. That is the job of WebODM, ReCap or whatever you process with. The Tagger prepares the control those programs need. The Converter and the Checker work on the cloud they produce.</p></div></details>
      <details><summary>Is anything uploaded?</summary><div><p>No. Photos, clouds and shots are read and processed on your computer, and the app does not report usage or crashes. If you turn on the satellite map or use place search, the app sends Esri the map area or the search text, with your own ArcGIS key. Leave them off and the app never goes online.</p></div></details>
      <details><summary>Can I use my GCPs as check shots?</summary><div><p>You can load them, but the result means nothing. The model was fitted to those points. Shoot separate check shots and keep them out of the control. In the Tagger you can tick a shot as a check point so it is not exported as control.</p></div></details>
      <details><summary>What is the shifted grid the Tagger talks about?</summary><div><p>Some firms carry a grid that sits a fixed distance off the true projection. If your control and your photo positions disagree by a steady offset, the Tagger says so, shows the offset and remembers it for the next job.</p></div></details>
      <details><summary>Which coordinate systems are left out?</summary><div><p>Systems that need grid files the app does not carry (OSGB36 and US NAD27, for example), latitude and longitude systems, and projections its maths library cannot do. They are left out on purpose so that nothing converts wrongly.</p></div></details>
      <details><summary>What tolerance should I use?</summary><div><p>That is your call and your client's. The Checker suggests 0.05 m for hard surfaces and 0.10 m for open ground as a starting point, and reports the numbers whatever you choose.</p></div></details>
      <details><summary>What happens when the beta ends?</summary><div><p>On April 1, 2027 the app asks for a licence key. You paste the key once and it is checked offline. The price will be posted on this site before then.</p></div></details>
      <details><summary>Who makes it?</summary><div><p>A civil engineer in Alberta who flies drone surveys for land development work and wanted to know how good each one was before building a surface from it. Write to <a href="mailto:{MAIL}">{MAIL}</a>.</p></div></details>
    </div>
  </div>
</section>
'''

JSONLD = ('<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Checkshot",'
          '"applicationCategory":"EngineeringApplication","operatingSystem":"Windows 10, Windows 11, Linux","url":"https://checkshot.ca/",'
          '"description":"Desktop app for drone surveys: GCP Tagger for OpenDroneMap, WebODM and ReCap, point cloud Converter and stick-shot Checker. Runs offline."}</script>\n')

# ------------------------------------------------------------------ download
DOWNLOAD = f'''<div class="page-head"><div class="wrap">
  <h1>Download the beta</h1>
  <p>Free until March 31, 2027. The full app, for your own work, paid work included.</p>
</div></div>
<div class="page-body"><div class="wrap dl-grid">
  <div class="dl-box">
    <h2>Windows 10 and 11</h2>
    <a class="btn" href="{RELEASES}">Get the installer from the release page</a>
    <p><strong>The first public build is being posted.</strong> If the release page is empty, check back later today.</p>
    <p>On the release page, take the file named <code>Checkshot_x.y.z_x64-setup.exe</code>. No admin rights needed: it installs for your user account only.</p>
    <p>Linux: the <code>.deb</code> and <code>.AppImage</code> are on the same page.</p>
    <p>By installing you accept the <a href="../legal/eula.html">licence agreement</a>.</p>
  </div>
  <div class="prose">
    <h2 style="margin-top:0">Installing on Windows</h2>
    <ol class="steps">
      <li>Download the <code>-setup.exe</code> file from the release page.</li>
      <li>Run it. Windows may show a SmartScreen notice for a new release. Choose <strong>More info</strong> to see who published the file before you run it.</li>
      <li>Open Checkshot from the Start menu. It opens on the GCP Tagger. Nothing else to set up.</li>
    </ol>
    <h2>What you get</h2>
    <p>The GCP Tagger, the Converter and the Checker in one window, with light and dark themes. Everything runs on your computer. The app does not need the internet unless you turn on the satellite map.</p>
    <h2>After the beta</h2>
    <p>From April 1, 2027 the app needs a licence key and will not save files without one. The price has not been set. It will be posted on this site before the beta ends.</p>
    <h2>Something not working?</h2>
    <p>Write to <a href="mailto:{MAIL}">{MAIL}</a>. Say which version you have (it is in the installer's file name) and what you were doing. Do not send client data unless you are allowed to.</p>
  </div>
</div></div>
'''

# ------------------------------------------------------------------ credits
CREDITS = f'''<div class="page-head"><div class="wrap">
  <h1>Credits and licences</h1>
  <p>Checkshot is built on work by these people and organisations. Thank you. The full licence texts are in the app under Credits &amp; licences, and in the THIRD-PARTY-NOTICES file installed with it.</p>
</div></div>
<div class="page-body"><div class="wrap"><div class="prose" style="max-width:48em">
  <h2 style="margin-top:0">Software in the app</h2>
  <ul class="credit-list">
    <li><strong>exifr</strong> 7.1.3 by Mike Kova&#345;&iacute;k. Reads photo position, heading and camera data. <span class="lic">MIT License. github.com/MikeKovarik/exifr</span></li>
    <li><strong>laz-perf</strong> 0.0.7 by Hobu, Inc. and contributors. Opens LAZ point clouds. Used unmodified. Based on the LASzip compression format created by Martin Isenburg (rapidlasso). <span class="lic">Apache License 2.0. github.com/hobuinc/laz-perf</span></li>
    <li><strong>Proj4js</strong> 2.22.0 by Mike Adair, Richard Greenwood, Didier Richard, Stephen Irons, Olivier Terral, Calvin Metcalf and contributors. Converts between the coordinate systems in the full list. <span class="lic">MIT License. github.com/proj4js/proj4js</span></li>
    <li><strong>epsg-index</strong> 2.0.0 by Jannis R (derhuerst). The machine-readable EPSG list the coordinate system search is built from, with data from epsg.io by MapTiler. <span class="lic">ISC License. github.com/derhuerst/epsg-index</span></li>
    <li><strong>Tauri</strong> by the Tauri Programme within the Commons Conservancy. The desktop app shell. <span class="lic">MIT or Apache License 2.0. tauri.app</span></li>
    <li><strong>Rust crates</strong>. Licence keys use ed25519-dalek (BSD-3-Clause) from the dalek-cryptography project. Dates use chrono, the clock check uses sha2 from the RustCrypto project, and data handling uses serde (each MIT or Apache-2.0). <span class="lic">Every crate in the app is listed with its licence text in THIRD-PARTY-NOTICES. The build stops if a GPL-family crate turns up.</span></li>
    <li><strong>Archivo</strong> by Omnibus-Type, and <strong>IBM Plex Sans</strong> and <strong>IBM Plex Mono</strong> by IBM. The app's typefaces. <span class="lic">SIL Open Font License 1.1.</span></li>
  </ul>
  <h2>Methods and reference data</h2>
  <ul class="credit-list">
    <li><strong>EPSG Geodetic Parameter Dataset</strong>, &copy; International Association of Oil &amp; Gas Producers (IOGP). Coordinate system and datum parameters. The list in the app is filtered to systems it can convert, and its NAD83(CSRS) to WGS 84 rotations are converted from radians to arc-seconds, so it is not the official EPSG Dataset. <span class="lic">Used under the EPSG terms of use. epsg.org/terms-of-use.html</span></li>
    <li><strong>NTv2 national transformation grid</strong> (ntv2_0.gsb, NAD27 to NAD83), &copy; His Majesty the King in Right of Canada, Natural Resources Canada (Canadian Geodetic Survey). <span class="lic">Contains information licensed under the Open Government Licence &ndash; Canada. open.canada.ca/en/open-government-licence-canada</span></li>
    <li><strong>Transverse Mercator maths</strong>. Kr&uuml;ger series as given by C. F. F. Karney, &ldquo;Transverse Mercator with an accuracy of a few nanometers&rdquo;, Journal of Geodesy 85 (2011).</li>
    <li><strong>LAS file format</strong>. ASPRS LAS Specification.</li>
  </ul>
  <h2>Online services, only if you turn them on</h2>
  <ul class="credit-list">
    <li><strong>Esri World Imagery</strong>, the satellite view. Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by Esri. <span class="lic">Used through the ArcGIS Location Platform with your own ArcGIS key and under Esri's terms. Only the map area on screen is requested.</span></li>
    <li><strong>ArcGIS World Geocoding Service</strong> by Esri, for Find place. <span class="lic">With your own ArcGIS key. Results are shown, not stored.</span></li>
  </ul>
  <h2>Works with, not included</h2>
  <p>Checkshot is designed to work with OpenDroneMap and WebODM (OpenDroneMap contributors, AGPL-3.0), Autodesk ReCap and Civil 3D. None of them is included in or modified by the app.</p>
  <h2>This website</h2>
  <ul class="credit-list">
    <li><strong>Big Shoulders</strong>, &copy; 2019 The Big Shoulders Project Authors. Headings. <span class="lic">SIL Open Font License 1.1.</span></li>
    <li><strong>Work Sans</strong>, &copy; 2019 The Work Sans Project Authors. Text. <span class="lic">SIL Open Font License 1.1.</span></li>
    <li><strong>IBM Plex Mono</strong>, &copy; 2017 IBM Corp. Figures. <span class="lic">SIL Open Font License 1.1.</span></li>
  </ul>
  <p>The licence files for these fonts are in <code>assets/fonts/</code>. The site loads nothing from other servers.</p>
  <h2>Trademarks</h2>
  <p>WebODM, OpenDroneMap, Civil 3D, ReCap, AutoCAD, Autel, EVO, DJI, Esri, ArcGIS, Windows and other product names are trademarks of their respective owners and are used here only to describe compatibility. No endorsement is implied.</p>
</div></div></div>
'''

NOTFOUND = f'''<div class="page-head"><div class="wrap">
  <h1>No page at this address</h1>
  <p>The link may be old, or the address may have a typo in it.</p>
</div></div>
<div class="page-body"><div class="wrap"><div class="prose">
  <p><a class="btn" href="./">Go to the home page</a></p>
  <p>Or go straight to the <a href="download/">download</a>, or write to <a href="mailto:{MAIL}">{MAIL}</a>.</p>
</div></div></div>
'''


# ------------------------------------------------------------------ legal pages from Markdown
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = s.replace(MAIL, f'<a href="mailto:{MAIL}">{MAIL}</a>')
    return s


def md(text):
    out, title, lines, i = [], '', text.replace('\r\n', '\n').split('\n'), 0
    assert not re.search(r'[`\[\]|]|^>', text, re.M), 'legal Markdown uses syntax this converter does not handle'
    while i < len(lines):
        ln = lines[i]
        if not ln.strip(): i += 1; continue
        m = re.match(r'(#{1,3}) (.*)', ln)
        if m:
            if len(m.group(1)) == 1: title = m.group(2).strip()
            else: out.append(f'<h{len(m.group(1))}>{inline(m.group(2).strip())}</h{len(m.group(1))}>')
            i += 1; continue
        block = []
        while i < len(lines) and lines[i].strip() and not lines[i].startswith('#'): block.append(lines[i]); i += 1
        if all(b.startswith('- ') for b in block):
            out.append('<ul>' + ''.join(f'<li>{inline(b[2:])}</li>' for b in block) + '</ul>')
        elif all(re.match(r'[a-z]\. ', b) for b in block):
            out.append('<ol class="alpha">' + ''.join(f'<li>{inline(b)}</li>' for b in block) + '</ol>')
        else:
            out.append('<p>' + inline(' '.join(b.strip() for b in block)) + '</p>')
    return title, '\n'.join(out)


def legal(name, desc):
    src = LEGAL_SRC / f'{name}.md'
    if src.exists():
        title, body = md(src.read_text(encoding='utf-8'))
    else:
        title, body = {'eula': 'Checkshot End User Licence Agreement', 'privacy': 'Checkshot Privacy Policy', 'terms': 'Checkshot Terms of Sale'}[name], '<p>Text coming tonight</p>'
    b = f'''<div class="page-head"><div class="wrap"><h1>{html.escape(title)}</h1></div></div>
<div class="page-body"><div class="wrap">
<!-- The text below is generated from legal/src/{name}.md by tools/build.py. Edit the Markdown, not this page. -->
<div class="prose" id="legal-body">
{body}
</div>
</div></div>
'''
    return page(f'legal/{name}.html', f'{title.replace("Checkshot ", "")} | Checkshot', desc, b)


urls = [
    page('index.html', 'Checkshot: check a drone survey against your stick shots',
         'Windows app for drone surveys. Tag ground control in your photos for OpenDroneMap, WebODM or ReCap, convert point clouds between 5,860 coordinate systems, and check the cloud against your stick shots. Runs offline. Free beta until March 31, 2027.',
         HOME, extra_head=JSONLD, scripts='<script src="assets/js/hero.js"></script>\n'),
    page('download/index.html', 'Download the Checkshot beta for Windows',
         'Get the Checkshot beta installer for Windows 10 and 11. No admin rights needed. Free until March 31, 2027. Linux builds on the same release page.',
         DOWNLOAD, current='download'),
    page('credits.html', 'Credits and licences | Checkshot',
         'The open-source software, reference data and services Checkshot is built on, with their licences: exifr, laz-perf, Proj4js, epsg-index, the EPSG dataset, the NRCan NTv2 grid, Tauri and Esri imagery.',
         CREDITS),
    legal('eula', 'The licence agreement for the Checkshot desktop app: beta use, paid licences, your responsibility for results, warranty and liability.'),
    legal('privacy', 'What Checkshot collects: nothing from the app, no cookies or analytics on this site, and only what you send when you email or buy a licence.'),
    legal('terms', 'Terms of sale for Checkshot licences: prices and taxes, licence keys, refunds and delivery.'),
]
page('404.html', 'Page not found | Checkshot', 'There is no page at this address on checkshot.ca. Go to the home page or the download page instead.', NOTFOUND, robots='<meta name="robots" content="noindex">\n')

(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
(ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
(ROOT / 'CNAME').write_text('checkshot.ca\n')
(ROOT / '.nojekyll').write_text('')
(ROOT / 'site.webmanifest').write_text('{"name":"Checkshot","short_name":"Checkshot","start_url":"./","display":"browser","background_color":"#0E0E0F","theme_color":"#0E0E0F",'
    '"icons":[{"src":"assets/img/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"assets/img/icon-512.png","sizes":"512x512","type":"image/png"}]}\n')
print('built', len(urls) + 1, 'pages')
