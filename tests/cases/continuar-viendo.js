const H = require('../helpers');
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const plugin = `
export async function home(){ return [{ title: 'Series', items: [{ ref: 'serie', title: 'Mi Serie', kind: 'series' }, { ref: 'peli', title: 'Mi Peli', kind: 'movie' }] }]; }
export async function episodes(){ const e = []; for (const s of [1, 2]) for (let n = 1; n <= 3; n++) e.push({ ref: 's' + s + 'e' + n, season: s, number: n, title: 'Cap ' + n }); return { series: { title: 'Mi Serie' }, episodes: e }; }
export async function resolve(ref){ return { url: 'https://cdn.fake/' + ref + '.webm', mime: 'video/webm', label: 'Servidor 1' }; }`;
const files = { 'u/sx/HEAD/kino-plugin.json': '{"name":"Series test"}', 'u/sx/HEAD/plugin.js': plugin };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const vid = fs.readFileSync(path.resolve('long.webm'));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.startsWith('https://cdn.fake/')) return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'video/webm', 'accept-ranges': 'bytes' }, cors), body: vid });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'sx', name: 'Series test', address: 'u/sx', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  const playing = () => p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.3 && isFinite(videoPlayer.duration), null, { timeout: 20000 });
  // 1) Serie: T1:E2, ir a 100 s, cerrar
  await p.evaluate(() => openDetail({ id: 's', title: 'Mi Serie', kind: 'series', pluginId: 'sx', ref: 'serie', source: 'Series test' }));
  await p.waitForFunction(() => state.episodePicker, null, { timeout: 10000 });
  await p.evaluate(() => state.episodePicker.play(state.episodePicker.find(1, 2)));
  await playing();
  await p.evaluate(() => { videoPlayer.currentTime = 100; }); await p.waitForTimeout(700);
  await p.evaluate(() => closePlayerBtn.click());
  console.log('1) guardado:', JSON.stringify(await p.evaluate(() => Object.values(Watch.all()).map(e => [e.item.title, e.ep && ('T' + e.ep.season + 'E' + e.ep.number), e.t]))));
  // 2) Película: ir a 60 s, cerrar
  await p.evaluate(() => openDetail({ id: 'p', title: 'Mi Peli', kind: 'movie', pluginId: 'sx', ref: 'peli', source: 'Series test' }));
  await p.waitForTimeout(300); await p.evaluate(() => playDirectBtn.click()); await playing();
  await p.evaluate(() => { videoPlayer.currentTime = 60; }); await p.waitForTimeout(700);
  await p.evaluate(() => closePlayerBtn.click()); await p.evaluate(() => detailOverlay.classList.remove('open'));
  // 3) Inicio: fila Continuar viendo y abrir la serie desde ahí
  await p.evaluate(() => { state.view = 'home'; renderView(); }); await p.waitForTimeout(300);
  console.log('2) fila:', JSON.stringify(await p.evaluate(() => { const r = [...document.querySelectorAll('.row-section')].find(x => /Continuar/.test(x.textContent)); return r ? [...r.querySelectorAll('.card')].map(c => c.innerText.replace(/\n/g, ' · ')) : null; })));
  await p.evaluate(() => { const r = [...document.querySelectorAll('.row-section')].find(x => /Continuar/.test(x.textContent)); [...r.querySelectorAll('.card')].find(c => /Serie/.test(c.textContent)).click(); });
  await playing(); await p.waitForTimeout(500);
  console.log('3) reanuda serie en:', Math.round(await p.evaluate(() => videoPlayer.currentTime)), 's ·', await p.evaluate(() => nowPlayingTitle.textContent), '· botón inicio visible:', await p.evaluate(() => playerRestartBtn.style.display !== 'none'));
  // 4) Fin del episodio → cuenta atrás → OK → siguiente
  await p.evaluate(() => { videoPlayer.currentTime = videoPlayer.duration - 1; }); 
  await p.waitForFunction(() => Watch.pendingNext, null, { timeout: 10000 });
  console.log('4) al terminar:', await p.evaluate(() => playerOsd.textContent));
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => /E3/.test(nowPlayingTitle.textContent) && videoPlayer.currentTime > 0.3, null, { timeout: 20000 });
  console.log('   OK →', await p.evaluate(() => nowPlayingTitle.textContent), '· empieza en', Math.round(await p.evaluate(() => videoPlayer.currentTime)), 's');
  console.log('   la fila ahora apunta a:', JSON.stringify(await p.evaluate(() => { const e = Watch.all()['sx|serie']; return e && [e.ep.season, e.ep.number, e.next || false]; })));
  // 5) "Desde el inicio" en la película
  await p.evaluate(() => closePlayerBtn.click()); await p.evaluate(() => resumeFromRow(Watch.all()['sx|peli'])); await playing(); await p.waitForTimeout(400);
  const t1 = await p.evaluate(() => videoPlayer.currentTime);
  await p.evaluate(() => playerRestartBtn.click()); await p.waitForTimeout(300);
  console.log('5) peli reanuda en', Math.round(t1), 's → Desde el inicio →', Math.round(await p.evaluate(() => videoPlayer.currentTime)), 's');
  console.log('errors', errs); await b.close(); })();
