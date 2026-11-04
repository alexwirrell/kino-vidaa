const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const hlsDir = path.resolve('hls');
  const serveHls = (u, route, cors) => {
    const name = u.split('?')[0].split('/').pop();
    const f = path.join(hlsDir, name);
    if (!fs.existsSync(f)) return route.fulfill({status:404, body:''});
    return route.fulfill({status:200, headers: cors ? {'access-control-allow-origin':'*'} : {}, contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t', body: fs.readFileSync(f)});
  };
  const proxied = [];
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u === 'https://app.test/index.html') return route.fulfill({status:200, contentType:'text/html', body: fs.readFileSync(H.APP_PATH)});
    if (u.includes('hls.min.js')) return route.fulfill({status:200, contentType:'text/javascript', body: fs.readFileSync(H.HLS_JS)});
    if (u.startsWith('https://kino-prueba.ejemplo.workers.dev/?url=')) { const t = new URL(u).searchParams.get('url'); proxied.push(t.split('/').pop()); return serveHls(t, route, true); }
    if (u.startsWith('https://api.codetabs.com/v1/proxy?quest=')) {
      if (decodeURIComponent(u.split('quest=')[1]).startsWith('https://deny.fake/')) { const t = decodeURIComponent(u.split('quest=')[1]); proxied.push(t.split('/').pop()); return serveHls(t, route, true); }
      const target = decodeURIComponent(u.split('quest=')[1]); proxied.push(target.split('/').pop());
      return serveHls(target, route, true);
    }
    if (u.startsWith('http://tv.fake/') || u.startsWith('https://tv.fake/')) return serveHls(u, route, false); // sin CORS
    if (u.startsWith('https://cors.fake/')) return serveHls(u, route, true);
    if (u.startsWith('https://deny.fake/')) return route.fulfill({status:403, body:'forbidden'});
    if (u.includes('v3-cinemeta')) return route.fulfill({status:200, headers:{'access-control-allow-origin':'*'}, body:'{"metas":[]}'});
    return route.fulfill({status:404, headers:{'access-control-allow-origin':'*'}, body:''});
  });
  await p.addInitScript(() => { localStorage.setItem('kino_installed_v2', '[]'); });
  await p.goto('https://app.test/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  console.log('Hls cargado:', await p.evaluate(()=>!!window.Hls && Hls.isSupported()));
  const play = async (url, label) => {
    proxied.length = 0;
    await p.evaluate(u => startPlayback(u, 'Canal'), url);
    const ok = await p.waitForFunction(() => videoPlayer.readyState >= 2 && videoPlayer.currentTime > 0.3, null, { timeout: 30000 }).then(()=>true).catch(()=>false);
    const log = await p.evaluate(() => __kinoState.diagLog.filter(d=>d.kind==='player').slice(-4).map(d=>d.msg).join(' | '));
    console.log(`${label}: ${ok ? '✓ REPRODUCE' : '✗ no reproduce'} · por proxy: [${[...new Set(proxied)].join(', ')}]\n   ${log}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  };
  await play('https://cors.fake/live/index.m3u8', 'L0 canal https con CORS');
  await play('https://tv.fake/live/index.m3u8', 'L1 canal https SIN CORS');
  await play('http://tv.fake/live/index.m3u8', 'L2 canal http:// en app https (TV Latam)');
  await play('https://deny.fake/live/index.m3u8', 'L4 servidor que rechaza directo (cae al proxy)');
  // Canal desde la pantalla En Vivo con OK
  await p.evaluate(()=>{ __kinoState.liveChannels.unshift({name:'Canal http', url:'http://tv.fake/live/index.m3u8', group:'Prueba'}); __kinoState.view='livetv'; renderView(); document.querySelector('.live-item').focus(); });
  await p.keyboard.press('Enter');
  const ok3 = await p.waitForFunction(() => videoPlayer.currentTime > 0.3, null, { timeout: 30000 }).then(()=>true).catch(()=>false);
  console.log('L3 En Vivo → OK en el canal:', ok3 ? '✓ REPRODUCE' : '✗');
  // Barra: ▼ la oculta, ▲ la muestra
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
  const vis1 = await p.evaluate(()=>!playerOverlay.classList.contains('hud-hidden'));
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
  const hid = await p.evaluate(()=>playerOverlay.classList.contains('hud-hidden'));
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
  const vis2 = await p.evaluate(()=>!playerOverlay.classList.contains('hud-hidden'));
  console.log(`H) barra visible:${vis1} → ▼ oculta:${hid} → ▲ visible:${vis2}`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // Reproducir sin enlace controlable: no abre el embed
  await p.evaluate(() => openDetail({ id:'m', title:'Peli', imdbId:'tt0111161', kind:'movie' }));
  await p.evaluate(() => playDirectBtn.click());
  await p.waitForTimeout(3000);
  console.log('E) Sin video controlable → reproductor abierto:', await p.evaluate(()=>playerOverlay.classList.contains('open')), '· foco:', await p.evaluate(()=>document.activeElement.textContent.trim()), '· aviso:', await p.evaluate(()=>!!document.getElementById('ncRetryBtn')));
  console.log('errors', errs); await b.close();
})();
