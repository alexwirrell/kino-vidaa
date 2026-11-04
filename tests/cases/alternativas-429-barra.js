const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const files = { 'u/alt/HEAD/kino-plugin.json': '{"name":"Alt"}', 'u/alt/HEAD/plugin.js': `export async function resolve(ref){ if (ref === 'alt2') return { url: 'https://good.fake/video.webm', mime: 'video/webm' }; throw kino.error('not_found','x'); }` };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let bigBytes = 0;
  const clipBuf = fs.readFileSync(path.resolve('clip.webm'));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (/429\.fake/.test(u)) return route.fulfill({ status: 429, headers: cors, body: '<html>429 Too Many Requests</html>' });
    if (u.startsWith('https://w.fake/?url=') && /429\.fake/.test(decodeURIComponent(u))) return route.fulfill({ status: 429, headers: cors, body: '<html>429 Too Many Requests</html>' });
    if (u.startsWith('https://good.fake/video.webm')) return route.fulfill({ status: 200, headers: cors, contentType: 'video/webm', body: clipBuf });
    if (u.startsWith('https://big.fake/movie.mp4')) { const body = Buffer.alloc(8 * 1024 * 1024, 1); return route.fulfill({ status: 200, headers: cors, contentType: 'video/mp4', body }); }
    return route.fulfill({ status: 404, headers: cors, body: '' }); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'palt', name: 'Alt', address: 'u/alt', enabled: true }])); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  // 1) alternativa 1 da 429, alternativa 2 es diferida (lazy) y funciona
  await p.evaluate(() => { __kinoState.selectedItem = { id: 'm', title: 'Obsession', kind: 'movie' };
    __kinoState.directStreams = [{ url: 'https://cdn.429.fake/a.mp4', label: 'YojaTV · Net79', headers: { Referer: 'https://net79.cc/' } }, { lazyRef: 'alt1', lazyPluginId: 'palt', label: 'Alt · roto' }, { lazyRef: 'alt2', lazyPluginId: 'palt', label: 'Alt · bueno' }];
    playDirectBtn.click(); });
  const ok = await p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.3, null, { timeout: 60000 }).then(() => true).catch(() => false);
  console.log('1) 429 → alternativas →', ok ? '✓ REPRODUCE' : '✗', '·', await p.evaluate(() => nowPlayingTitle.textContent));
  console.log('   ', (await p.evaluate(() => __kinoState.diagLog.filter(d => /↪|alternativa|✗ (proxy|native)/.test(d.msg)).map(d => d.msg.slice(0, 70)))).join(' | '));
  // 2) barra de progreso con el mando (video con duración conocida)
  await p.evaluate(c => startPlayback(c, 'Clip'), 'file://' + path.resolve('clip.webm'));
  await p.waitForFunction(() => isFinite(videoPlayer.duration) && videoPlayer.currentTime > 0.2, null, { timeout: 10000 }); await p.keyboard.press('ArrowUp');
  console.log('2) ▲ desde Pausa →', await p.evaluate(() => document.activeElement.id));
  const t0 = await p.evaluate(() => videoPlayer.currentTime);
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  const t1 = await p.evaluate(() => videoPlayer.currentTime);
  console.log('   ▶▶▶ avanza:', (t1 - t0).toFixed(0), 's · foco sigue en la barra:', await p.evaluate(() => document.activeElement.id === 'hudSeek'));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); console.log('   ◀ retrocede a:', (await p.evaluate(() => videoPlayer.currentTime)).toFixed(0), 's');
  await p.keyboard.press('Enter'); await p.waitForTimeout(200); console.log('   OK pausa:', await p.evaluate(() => videoPlayer.paused));
  await p.keyboard.press('ArrowDown'); console.log('   ▼ vuelve a los botones →', await p.evaluate(() => document.activeElement.id));
  // 3) comprobar un mp4 grande ya no lo descarga entero
  const r = await p.evaluate(async () => { const k = createKinoEnv('t'); const res = await k.fetch('https://big.fake/movie.mp4'); return { len: res.text().length, truncated: res.truncated }; });
  console.log('3) comprobación de un .mp4 de 8 MB: leídos', Math.round(r.len / 1024), 'KB · truncated:', r.truncated);
  console.log('errors', errs); await b.close(); })();
