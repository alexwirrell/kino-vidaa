const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const pack = require('../packgen.js');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const clip = 'file://' + path.resolve('clip.webm');
  // Vamos a servir el "video" con una URL .mp4 que el route entrega como webm
  const packed = pack(`jwplayer("v").setup({sources:[{file:"https://cdn.fake/hls/master.mp4?t=1"}]})`);
  const host = 'https://srv.fake/e/abc';
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('file:')) return route.continue();
    const cors = {'access-control-allow-origin':'*'};
    if (u.includes('embed69.org/movie')) return route.fulfill({status:200, headers:cors, contentType:'text/html', body:`<html><body><iframe src="${host}"></iframe></body></html>`});
    if (u.startsWith(host)) return route.fulfill({status:200, headers:cors, contentType:'text/html', body:`<html><script>${packed}</script></html>`});
    if (u.startsWith('https://cdn.fake/hls/master.mp4')) return route.fulfill({status:200, headers:cors, contentType:'video/webm', path: path.resolve('clip.webm')});
    if (u.includes('v3-cinemeta.strem.io')) return route.fulfill({status:200, headers:cors, body:'{"metas":[]}'});
    if (/autoembed|multiembed|vidsrc|smashy/.test(u)) return route.fulfill({status:200, headers:cors, contentType:'text/html', body:'<html>nada</html>'});
    return route.fulfill({status:404, headers:cors, body:''});
  });
  await p.addInitScript(() => { localStorage.setItem('kino_installed_v2', '[]'); localStorage.setItem('kino_cors_mode', '"direct"'); });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  console.log('unpack:', await p.evaluate(s => unpackPacker(s), packed));
  // A) Reproducir desde la ficha: espera al extractor y usa el video propio
  await p.evaluate(() => openDetail({ id:'m', title:'Peli', imdbId:'tt0111161', kind:'movie' }));
  await p.waitForTimeout(100);
  const t0 = Date.now();
  await p.evaluate(() => playDirectBtn.click());
  await p.waitForFunction(() => playerOverlay.classList.contains('open'), null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  console.log(`A) Reproducir → ${((Date.now()-t0)/1000).toFixed(1)}s · modo:`, await p.evaluate(()=>playerOverlay.classList.contains('mode-video')?'VIDEO PROPIO':'embed'), '·', await p.evaluate(()=>nowPlayingTitle.textContent), '· reproduciendo:', await p.evaluate(()=>!videoPlayer.paused && videoPlayer.currentTime>0));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('   OK → pausa:', await p.evaluate(()=>videoPlayer.paused));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('   OK → play:', await p.evaluate(()=>!videoPlayer.paused));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // B) Elegir el servidor embed a mano: cambia solo al video propio
  await p.evaluate(() => { __kinoState.directStreams = []; startEmbedPlayback(__kinoState.activeSources[0], 'Peli'); });
  await p.waitForFunction(() => playerOverlay.classList.contains('mode-video'), null, { timeout: 15000 }).catch(()=>{});
  console.log('B) Embed elegido a mano → modo:', await p.evaluate(()=>playerOverlay.classList.contains('mode-video')?'VIDEO PROPIO':'embed'));
  await p.keyboard.press('Escape');
  // C) Embed sin video extraíble: mensaje claro
  await p.evaluate(() => startEmbedPlayback(__kinoState.activeSources[1], 'Peli'));
  await p.waitForTimeout(1500);
  console.log('C) Embed sin video → OSD:', await p.evaluate(()=>playerOsd.textContent));
  await p.keyboard.press('Escape');
  // D) Autoplay bloqueado
  await p.evaluate(() => { HTMLMediaElement.prototype._play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function(){ return Promise.reject(Object.assign(new Error('x'),{name:'NotAllowedError'})); }; });
  await p.evaluate(c => startPlayback(c, 'Bloqueado'), clip); await p.waitForTimeout(400);
  console.log('D) pausado antes del OK:', await p.evaluate(()=>videoPlayer.paused)); console.log('D) Autoplay bloqueado → OSD:', await p.evaluate(()=>playerOsd.textContent), '· foco:', await p.evaluate(()=>document.activeElement.id), '· barra visible:', await p.evaluate(()=>!playerOverlay.classList.contains('hud-hidden')));
  await p.evaluate(() => { HTMLMediaElement.prototype.play = HTMLMediaElement.prototype._play; });
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  console.log('   OK → reproduce:', await p.evaluate(()=>!videoPlayer.paused));
  await p.keyboard.press('Escape');
  // E) Enlace roto
  await p.evaluate(() => startPlayback('https://cdn.fake/roto.mp4', 'Roto')); await p.waitForTimeout(2500);
  console.log('E) Enlace roto →', await p.evaluate(()=>nowPlayingSub.textContent), '· foco:', await p.evaluate(()=>document.activeElement.id));
  console.log('errors', errs); await b.close();
})();
