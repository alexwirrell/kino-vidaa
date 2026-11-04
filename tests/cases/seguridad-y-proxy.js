const H = require('../helpers');
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const seen=[];
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors={'access-control-allow-origin':'*','access-control-expose-headers':'*'};
    if (u.startsWith('file:')) return route.continue();
    if (u.startsWith('https://mi.worker.dev/')) {
      const q = new URL(u).searchParams;
      if (q.get('key') !== 'secreta') return route.fulfill({status:403, headers:cors, body:'clave incorrecta'});
      if (!q.get('url')) return route.fulfill({status:200, headers:cors, body:'Proxy de Kino VIDAA funcionando ✓'});
      seen.push(route.request().method() + ' ' + q.get('url'));
      return route.fulfill({status:200, headers:Object.assign({'X-Final-Url':'https://final.host/v.m3u8'}, cors), body:'ok'});
    }
    return route.abort(); });
  await p.goto(H.APP, { waitUntil:'domcontentloaded' });
  console.log('versión:', await p.evaluate(()=>buildBadge.textContent), '· proxy por defecto:', JSON.stringify(await p.evaluate(()=>__kinoState.customProxy)));
  console.log('sin direcciones de worker en el código:', await p.evaluate(()=>{ const ejemplos = ['kino.tunombre.workers.dev', 'kino.x.workers.dev', 'kino.tu-nombre.workers.dev']; const hallados = (document.documentElement.outerHTML.match(/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/gi) || []).filter(h => !ejemplos.includes(h.toLowerCase())); return hallados.length === 0; }));
  await p.evaluate(()=>{ __kinoState.view='settings'; renderView(); const i=customProxyInput; i.readOnly=false; i.value='mi.worker.dev/?key=secreta'; saveSettingsBtn.click(); });
  console.log('guardado como:', await p.evaluate(()=>__kinoState.customProxy));
  const r = await p.evaluate(()=>smartFetch('https://api.cinehdplus.org/ir/rd.php', { method:'POST', body:{ form:{ id: 1 } }, headers:{ Referer:'https://cinehdplus.org/' } }).then(r=>r.status+' url final='+r.url));
  console.log('POST por el proxy con clave →', r, '·', seen.join(' | '));
  // reabrir: comprobación de inicio con clave
  const p2 = await ctx.newPage(); await p2.goto(H.APP, { waitUntil:'domcontentloaded' }); await p2.waitForTimeout(800);
  console.log('al abrir:', await p2.evaluate(()=>__kinoState.diagLog.filter(d=>/Proxy propio|proxy pide/.test(d.msg)).map(d=>d.msg).join(' | ')));
  console.log('errors', errs); await b.close(); })();
