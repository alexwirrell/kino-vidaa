const H = require('../helpers');
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const net = [];
  await ctx.route('**/*', async route => { const u = route.request().url(), h = route.request().headers(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    if (u.startsWith('https://w.fake/')) { const t = new URL(u).searchParams.get('url'); if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' }); net.push('worker'); return route.fulfill({ status: 200, headers: cors, body: '<html>PM_UI="abc" reproductor</html>' }); }
    if (u.startsWith('https://api-encrypted.moviemaster.lat/')) { net.push('directo Origin=' + (h.origin || '-')); return route.fulfill({ status: 403, headers: cors, body: 'Forbidden' }); }
    if (u.startsWith('https://open.fake/')) { net.push('directo-ok'); return route.fulfill({ status: 404, headers: cors, body: 'no existe' }); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', '[]'); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  net.length = 0;
  const r = await p.evaluate(async () => { const k = createKinoEnv('cinehax-plus'); const res = await k.fetch('https://api-encrypted.moviemaster.lat/embed/tv/312359/1/1?pass=x', { headers: { 'User-Agent': 'UA' } }); return res.status + ' ' + res.text().slice(0, 30); });
  console.log('403 directo → reintento por el worker →', r, '· peticiones:', net.join(' → '));
  console.log('  ', await p.evaluate(() => __kinoState.diagLog.filter(d => /moviemaster|reintenta/.test(d.msg)).map(d => d.msg.slice(0, 80)).join(' | ')));
  net.length = 0;
  const r2 = await p.evaluate(async () => { const k = createKinoEnv('x'); return (await k.fetch('https://open.fake/nada')).status; });
  console.log('404 directo → no se reintenta:', r2, '· peticiones:', net.join(' → '));
  console.log('errors', errs); await b.close(); })();
