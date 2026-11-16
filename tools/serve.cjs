// Tiny static server for looking at the site locally: node tools/serve.cjs [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), port = require.main === module ? (+process.argv[2] || 8080) : 0;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, { 'content-type': types['.html'] }); r.end(fs.readFileSync(path.join(root, '404.html'))); return; }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
module.exports = () => new Promise(res => server.listen(port, '127.0.0.1', () => res({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
if (require.main === module) module.exports().then(s => console.log(s.url));
