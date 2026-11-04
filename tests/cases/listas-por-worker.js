const H = require('../helpers');
const { chromium } = require('playwright');
const M3U = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nlow.m3u8\n';
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const net = [];
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' }; const mode = route.request().headers()['sec-fetch-mode'];
    if (u.startsWith('file:')) return route.continue();
    if (u.startsWith('https://w.fake/')) { const t = new URL(u).searchParams.get('url'); if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' }); net.push('worker'); return route.fulfill({ status: 200, headers: cors, body: M3U }); }
    if (u.startsWith('https://api-encrypted.moviemaster.lat/s/')) { net.push('directo 403'); return route.fulfill({ status: 403, headers: cors, body: 'Forbidden' }); }
    if (u.startsWith('https://s40.fastream.to/')) { net.push('directo ' + (mode === 'no-cors' ? '(sonda)' : 'sin CORS')); return route.fulfill({ status: 200, body: M3U }); }  // sin cabecera CORS
    if (u.startsWith('https://cdn.fake/v.mp4')) { net.push('directo ' + (mode === 'no-cors' ? '(sonda)' : 'sin CORS')); return route.fulfill({ status: 200, body: 'xx' }); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', '[]'); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  const f = async (u) => { net.length = 0; const r = await p.evaluate(async u => { const k = createKinoEnv('cinehax-plus'); const res = await k.fetch(u); return res.status + ' «' + res.text().slice(0, 18).replace(/\n/g, ' ') + '»'; }, u); return r + ' · ' + net.join(' → '); };
  console.log('1) .m3u8 con 403 (moviemaster):', await f('https://api-encrypted.moviemaster.lat/s/9ESPHpn_xz/index.m3u8'));
  console.log('2) .m3u8 sin CORS (fastream):  ', await f('https://s40.fastream.to/hls2/10/index-v1-a1.m3u8'));
  console.log('3) .mp4 sin CORS (sonda vale):  ', await f('https://cdn.fake/v.mp4'));
  console.log('errors', errs); await b.close(); })();
