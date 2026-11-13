// Minimal static file server for previewing the mockup: node serve.js <root> <port>
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const port = Number(process.argv[3] || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    // Screenshot helper: ?shot=1 pre-confirms the age gate; &cart=1 seeds a cart; &lang=es sets Spanish.
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    if (q.get('shot') && file.endsWith('.html')) {
      const seed = ["localStorage.setItem('df_age_ok','true')"];
      seed.push("localStorage.setItem('df_lang', JSON.stringify('" + (q.get('lang') === 'es' ? 'es' : 'en') + "'))");
      if (q.get('cart')) seed.push("localStorage.setItem('df_cart', JSON.stringify([{id:'racing-stripe-tee',size:'L',qty:2},{id:'hot-rod-flames-tee',size:'M',qty:1}]))");
      else seed.push("localStorage.removeItem('df_cart')");
      if (q.get('opencart')) seed.push("document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){DF.openCart()},50)})");
      if (q.get('holiday')) seed.push("localStorage.setItem('df_holiday', JSON.stringify('Closed Thanksgiving Day. Open 10 AM to 6 PM on Black Friday.'))");
      else seed.push("localStorage.removeItem('df_holiday')");
      data = Buffer.from(data.toString('utf8').replace('<head>', '<head><script>' + seed.join(';') + '</script>'));
      if (q.get('gate')) data = Buffer.from(data.toString('utf8').replace("localStorage.setItem('df_age_ok','true')", "localStorage.removeItem('df_age_ok')"));
    }
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('Serving ' + root + ' on http://localhost:' + port));
