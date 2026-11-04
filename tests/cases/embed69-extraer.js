const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const nc = require('crypto'); const pack = require('../packgen.js');
// --- embed69.org/f/tt0111161: dataLink cifrado como el sitio real ---
const challenge = 'c' + nc.randomBytes(6).toString('hex'), salt = 's' + nc.randomBytes(4).toString('hex'), difficulty = 3;
let n = 0; while (!nc.createHash('sha256').update(challenge + n).digest('hex').startsWith('000')) n++;
const keyHex = nc.createHash('sha256').update(challenge + n + salt).digest('hex');
const encLink = (url) => { const iv = nc.randomBytes(16); const c = nc.createCipheriv('aes-256-cbc', Buffer.from(keyHex, 'hex'), iv); return Buffer.concat([iv, c.update(url), c.final()]).toString('base64'); };
const dataLink = [{ video_language: 'LAT', sortedEmbeds: [
  { servername: 'vidhide', link: encLink('https://vidhide.com/v/abc123') },
  { servername: 'streamwish', link: encLink('https://streamwish.to/e/zzz999') },
  { servername: 'download', link: encLink('https://x.y/dl') }] }];
const embed69Page = `<html><script>let dataLink = ${JSON.stringify(dataLink)};\nconst POW_CHALLENGE = '${challenge}'; const POW_SALT = '${salt}'; const POW_DIFFICULTY = ${difficulty};</script></html>`;
const vidhidePage = `<html><body><div id="vplayer"></div><script>${pack(`jwplayer("vplayer").setup({sources:[{file:links.hls2}],links:{"hls2":"https://cdn.fake/x/index.m3u8"}})`)}</script></body></html>`;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const seen = [];
  await ctx.route('**/*', async route => {
    const u = route.request().url(), h = route.request().headers(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:') || u.includes('raw.githubusercontent.com/xuper-plugin/kino-plugin-embed69')) return route.continue();
    if (u.includes('hls.min.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(H.HLS_JS) });
    if (u.includes('api.themoviedb.org')) {
      seen.push('TMDB ' + new URL(u).pathname);
      if (/\/movie\/278/.test(u)) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ id: 278, title: 'Sueños de libertad', release_date: '1994-09-23', external_ids: { imdb_id: 'tt0111161' }, genres: [{ name: 'Drama' }] }) });
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ page: 1, results: [{ id: 278, title: 'Sueños de libertad', poster_path: '/p.jpg', release_date: '1994-09-23', vote_average: 8.7 }] }) });
    }
    if (u.startsWith('https://embed69.org/f/tt0111161')) { seen.push('embed69 page'); return route.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: embed69Page }); }
    if (u.startsWith('https://streamwish.to/e/zzz999')) { seen.push('streamwish page (Referer=' + (h.referer || '-') + ')'); return route.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: vidhidePage.replace('hls2', 'hls4') }); }
    if (u.startsWith('https://vidhide.com/v/abc123')) { seen.push('vidhide page'); return route.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: vidhidePage }); }
    if (u.startsWith('https://cdn.fake/x/')) { seen.push('CDN ' + u.split('/').pop()); const f = path.join('hls', u.split('?')[0].split('/').pop()); return route.fulfill({ status: 200, headers: cors, contentType: f.endsWith('m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t', body: fs.readFileSync(f) }); }
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1');
    localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'embed69', name: 'Embed 69', address: 'xuper-plugin/kino-plugin-embed69', enabled: true }]));
    localStorage.setItem('kino_tmdb_key', JSON.stringify('LLAVE')); localStorage.setItem('kino_custom_proxy', JSON.stringify('off')); localStorage.setItem('kino_cors_mode', JSON.stringify('direct')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /Inicio actualizado|Instala o activa/.test(statusPill.textContent), null, { timeout: 60000 });
  console.log('Inicio de Embed 69:', JSON.stringify(await p.evaluate(() => __kinoState.homeRows.filter(r => r.sourceId === 'embed69').map(r => r.row + ' (' + r.items.length + ')'))));
  // Flujo real con el mando: tarjeta de Embed 69 → OK → Reproducir
  await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].find(c => /Sueños de libertad/.test(c.textContent)); c.focus(); });
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('ficha abierta:', await p.evaluate(() => detailOverlay.classList.contains('open')), '· foco:', await p.evaluate(() => document.activeElement.id));
  const t0 = Date.now();
  await p.keyboard.press('Enter');
  const playing = await p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.3, null, { timeout: 45000 }).then(() => true).catch(() => false);
  console.log(`▶ Resolver y Reproducir → ${playing ? '✓ REPRODUCE' : '✗ no reproduce'} en ${((Date.now() - t0) / 1000).toFixed(1)} s · modo:`, await p.evaluate(() => playerOverlay.classList.contains('mode-video') ? 'reproductor propio (controlable)' : 'embed'), '·', await p.evaluate(() => nowPlayingTitle.textContent));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300); const paused = await p.evaluate(() => videoPlayer.paused);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('   OK pausa:', paused, '· OK reanuda:', await p.evaluate(() => !videoPlayer.paused));
  console.log('   peticiones:', [...new Set(seen)].join(' → '));
  console.log('   ' + (await p.evaluate(() => __kinoState.diagLog.filter(d => /plugin|player|embed69|error/.test(d.kind)).slice(-6).map(d => `[${d.kind}] ${d.msg}`))).join('\n   '));
  console.log('errors', errs); await b.close();
})();
