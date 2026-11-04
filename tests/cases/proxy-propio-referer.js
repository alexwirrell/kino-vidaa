const H = require('../helpers');
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport:{width:1280,height:720} }); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const seen = [];
  let workerMode = false;
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors={'access-control-allow-origin':'*'};
    if (u.startsWith('file:')) return route.continue();
    if (u.includes('hls.min.js')) return route.fulfill({status:200, contentType:'text/javascript', body: fs.readFileSync(H.HLS_JS)});
    // proxies públicos caídos (como en el TV)
    if (/codetabs|allorigins|cors\.lol/.test(u)) { seen.push('PUB '+u.split('/')[2]); await new Promise(r=>setTimeout(r, 1500)); return route.abort(); }
    // worker propio
    if (u.startsWith('https://kino.yo.workers.dev/?url=')) {
      const q = new URL(u).searchParams; const t = q.get('url'); const ref = q.get('ref');
      seen.push('WORKER ' + t.split('/').slice(2,4).join('/') + (ref ? ' ref=' + ref.split('/')[2] : ''));
      if (t.startsWith('https://cdn.fake/x/')) {
        if (!ref) return route.fulfill({status:403, headers:cors, body:'sin referer'});
        const f = path.join('hls', t.split('?')[0].split('/').pop()); return route.fulfill({status:200, headers:cors, contentType: f.endsWith('m3u8')?'application/vnd.apple.mpegurl':'video/mp2t', body: fs.readFileSync(f)});
      }
      if (t.includes('site.fake')) return route.fulfill({status:200, headers:cors, contentType:'text/html', body:'<html><body>ok site</body></html>'});
      return route.fulfill({status:404, headers:cors, body:''});
    }
    if (u.startsWith('https://cdn.fake/')) return route.fulfill({status:403, body:'sin referer'}); // CDN exige Referer
    if (u.includes('v3-cinemeta')) return route.fulfill({status:200, headers:cors, body:'{"metas":[]}'});
    return route.abort(); });
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('x')) { localStorage.setItem('kino_installed_v2','[]'); sessionStorage.setItem('x','1'); } } catch(_){} });
  await p.goto(H.APP, { waitUntil:'domcontentloaded' });
  console.log('versión en el menú:', await p.evaluate(()=>buildBadge.textContent));
  // 1) sin worker: proxies caídos → aviso y fallo rápido
  const t0 = Date.now(); await p.evaluate(()=>smartFetch('https://site.fake/a').catch(()=>null));
  const t1 = Date.now(); await p.evaluate(()=>smartFetch('https://site.fake/b').catch(()=>null));
  const t2 = Date.now(); await p.evaluate(()=>smartFetch('https://site.fake/c').catch(()=>null));
  console.log(`1) sin proxy propio: 1.ª petición ${((t1-t0)/1000).toFixed(1)} s · 2.ª ${((t2-t1)/1000).toFixed(1)} s · 3.ª ${((Date.now()-t2)/1000).toFixed(1)} s · aviso:`, await p.evaluate(()=>__kinoState.proxiesDown), '·', await p.evaluate(()=>statusPill.textContent));
  await p.evaluate(()=>{ __kinoState.view='home'; renderView(); });
  console.log('   banner en Inicio:', await p.evaluate(()=>!!document.getElementById('goSettingsBtn')));
  // 2) configurar worker escribiendo solo el dominio, en Ajustes
  await p.evaluate(()=>{ __kinoState.view='settings'; renderView(); });
  await p.evaluate(()=>{ const i = customProxyInput; i.readOnly = false; i.value = 'kino.yo.workers.dev'; saveSettingsBtn.click(); });
  console.log('2) guardado como:', await p.evaluate(()=>__kinoState.customProxy));
  seen.length = 0;
  const r = await p.evaluate(()=>smartFetch('https://site.fake/pagina', { headers: { Referer: 'https://site.fake/' } }).then(r=>r.status+' '+r.text.slice(0,20)));
  console.log('   petición de plugin →', r, '·', seen.join(' | '), '· aviso apagado:', !(await p.evaluate(()=>__kinoState.proxiesDown)));
  // 3) video capturado que exige Referer
  seen.length = 0;
  await p.evaluate(()=>startPlayback('https://cdn.fake/x/index.m3u8', 'Capturado', { referer: 'https://srv1.fake/e/abc' }));
  const ok = await p.waitForFunction(()=>videoPlayer.currentTime > 0.3, null, {timeout: 30000}).then(()=>true).catch(()=>false);
  console.log('3) video que exige Referer →', ok ? '✓ REPRODUCE' : '✗', '·', [...new Set(seen)].join(' | '));
  console.log('   ', await p.evaluate(()=>__kinoState.diagLog.filter(d=>d.kind==='player').slice(-3).map(d=>d.msg).join(' | ')));
  console.log('errors', errs); await b.close(); })();
