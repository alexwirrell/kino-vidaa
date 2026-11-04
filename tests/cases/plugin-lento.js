const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const files = {
  'u/fast/HEAD/kino-plugin.json': '{"name":"Rápido"}', 'u/fast/HEAD/plugin.js': `export async function search(){ await kino.sleep(800); return [{ ref: 'r', title: 'Backrooms' }]; } export async function resolve(){ return { url: 'https://cdn.fake/movie.webm', mime: 'video/webm' }; }`,
  'u/slow/HEAD/kino-plugin.json': '{"name":"Lento"}', 'u/slow/HEAD/plugin.js': `export async function search(){ await new Promise(r => setTimeout(r, 15000)); return []; }`,
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const log = []; const clip = fs.readFileSync(path.resolve('clip.webm'));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.startsWith('https://w.fake/')) { const t = new URL(u).searchParams.get('url'); if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' });
      log.push('worker ' + new URL(t).host);
      if (/slow\.site/.test(t)) { await new Promise(r => setTimeout(r, 9000)); return route.fulfill({ status: 200, headers: cors, body: 'lento' }); }
      return route.fulfill({ status: 200, headers: cors, body: 'ok ' + t }); }
    if (/codetabs|allorigins|cors\.lol/.test(u)) { log.push('PÚBLICO ' + new URL(u).host); await new Promise(r => setTimeout(r, 6000)); return route.abort(); }
    if (u.startsWith('https://cdn.fake/movie.webm')) return route.fulfill({ status: 200, headers: cors, contentType: 'video/webm', body: clip });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'pf', name: 'Rápido', address: 'u/fast', enabled: true }, { id: 'ps', name: 'Lento', address: 'u/slow', enabled: true }])); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  // 1) sitio lento por el worker (timeout 7 s) y luego otro sitio
  log.length = 0;
  const t0 = Date.now(); await p.evaluate(() => smartFetch('https://slow.site/x', { timeoutMs: 7000 }).catch(() => null)); const t1 = Date.now();
  const r2 = await p.evaluate(() => smartFetch('https://fast.site/y', { timeoutMs: 7000 }).then(r => r.text).catch(e => 'ERR ' + e.message)); const t2 = Date.now();
  console.log(`1) sitio lento: ${((t1 - t0) / 1000).toFixed(1)} s · siguiente sitio: ${((t2 - t1) / 1000).toFixed(1)} s → «${r2.slice(0, 22)}» · peticiones: ${log.join(' | ')}`);
  // 2) Reproducir arranca con el plugin rápido sin esperar al lento
  await p.evaluate(() => openDetail({ id: 'm', title: 'Backrooms', imdbId: 'tt0000001', kind: 'movie' }));
  await p.waitForTimeout(200);
  const s0 = Date.now(); await p.evaluate(() => playDirectBtn.click());
  await p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.2, null, { timeout: 30000 });
  console.log(`2) Reproducir → video en ${((Date.now() - s0) / 1000).toFixed(1)} s (el plugin lento tarda 15 s) ·`, await p.evaluate(() => nowPlayingTitle.textContent));
  console.log('errors', errs); await b.close(); })();
