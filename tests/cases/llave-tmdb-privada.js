const H = require('../helpers');
const { chromium } = require('playwright');
const KEY = '0123456789abcdef0123456789abcdef';
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const net = [];
  let directOk = true;
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    if (u.startsWith('https://w.fake/')) { const t = new URL(u).searchParams.get('url'); if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' }); net.push('worker'); return route.fulfill({ status: 200, headers: cors, body: '{"results":[{"id":1,"title":"X"}]}' }); }
    if (u.startsWith('https://api.themoviedb.org/')) { net.push('directo'); if (!directOk) return route.abort(); return route.fulfill({ status: 200, headers: cors, body: '{"results":[{"id":1,"title":"X"}]}' }); }
    if (/codetabs|allorigins|cors\.lol/.test(u)) { net.push('PÚBLICO ' + new URL(u).host); return route.abort(); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', '[]'); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  const save = async (k, proxy) => { await p.evaluate(() => { state.view = 'settings'; renderView(); }); await p.waitForTimeout(200); return p.evaluate(([k, proxy]) => { document.getElementById('tmdbKeyInput').value = k; document.getElementById('customProxyInput').value = proxy; document.getElementById('saveSettingsBtn').click(); return statusPill.textContent; }, [k, proxy]); };
  console.log('1) llave v3 →', await save(KEY, ''));
  console.log('2) token v4 →', await save('eyJhbGciOiJIUzI1NiJ9.' + 'x'.repeat(150), ''));
  console.log('3) llave corta →', await save('0123456789', ''));
  await save(KEY, '');
  net.length = 0; const r1 = await p.evaluate(() => createKinoEnv('t').tmdb('/search/movie', { query: 'x' }).then(r => r.results.length).catch(e => 'ERR ' + e.message));
  console.log('4) TMDB directo OK →', r1, '·', net.join(' → '));
  directOk = false; await save(KEY, 'w.fake');
  net.length = 0; const r2 = await p.evaluate(() => createKinoEnv('t').tmdb('/search/movie', { query: 'y' }).then(r => r.results.length).catch(e => 'ERR ' + e.message));
  console.log('5) TMDB directo falla, con worker →', r2, '·', net.join(' → '));
  await save(KEY, 'off');
  net.length = 0; const r3 = await p.evaluate(() => createKinoEnv('t').tmdb('/search/movie', { query: 'z' }).then(r => r.results.length).catch(e => 'ERR ' + e.message));
  console.log('6) TMDB directo falla, sin worker →', r3, '·', net.join(' → '), '(no debe haber PÚBLICO)');
  const logTxt = await p.evaluate(() => JSON.stringify(state.diagLog));
  console.log('7) ¿llave visible en el registro?', logTxt.includes(KEY));
  console.log('errors', errs); await b.close(); })();
