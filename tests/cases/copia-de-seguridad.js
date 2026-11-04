const H = require('../helpers');
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (u.includes('qrcode-generator')) return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(H.QR_JS) }); if (u.startsWith('https://w.fake/')) return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'Proxy de Kino VIDAA funcionando ✓' }); return r.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'yoja-tv-kino', name: 'YojaTV-alpha', address: 'YojaTV-kino/YojaTV_plugin', enabled: true }, { id: 'gnula', name: 'Gnula', address: 'baskettv23/Gnula', enabled: false }, { id: 'mio', name: 'Mío', address: 'yo/mi-plugin', enabled: true }])); localStorage.setItem('kino_custom_proxy', JSON.stringify('https://w.fake/?url=')); localStorage.setItem('kino_tmdb_key', JSON.stringify('0123456789abcdef0123456789abcdef')); localStorage.setItem('kino_track_prefs', JSON.stringify({ audio: 'Latino' })); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
  await p.evaluate(() => { state.view = 'settings'; renderView(); }); await p.waitForTimeout(200);
  await p.evaluate(() => backupMakeBtn.click()); await p.waitForTimeout(600);
  const code = await p.evaluate(() => Backup.make());
  console.log('1) código:', code.length, 'caracteres · QR dibujado:', await p.evaluate(() => !!document.querySelector('#backupQr svg')));
  await p.evaluate(() => document.getElementById('backupMakeBtn').scrollIntoView()); await p.screenshot({ path: 't66.png' });
  // 2) borrar todo y reiniciar
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('kino_installed_v2', '[]'); sessionStorage.setItem('x', '1'); });
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
  console.log('2) tras borrar: plugins', await p.evaluate(() => state.installed.length), '· proxy:', JSON.stringify(await p.evaluate(() => state.customProxy)), '· llave:', JSON.stringify(await p.evaluate(() => state.tmdbKey)));
  // 3) restaurar escribiendo el código en el teclado en pantalla
  await p.evaluate(() => { state.view = 'settings'; renderView(); }); await p.waitForTimeout(200);
  await p.evaluate(() => backupRestoreBtn.click());
  await p.keyboard.type(code, { delay: 0 });
  await p.evaluate(() => OSK.done());
  await p.waitForTimeout(500);
  console.log('3) restaurado: plugins', JSON.stringify(await p.evaluate(() => state.installed.map(x => x.id + (x.enabled === false ? '(pausa)' : '')))), '· proxy:', await p.evaluate(() => state.customProxy), '· llave:', await p.evaluate(() => state.tmdbKey.slice(0, 6) + '…'), '· audio:', JSON.stringify(await p.evaluate(() => loadStore('kino_track_prefs', null))), '·', await p.evaluate(() => statusPill.textContent));
  await p.evaluate(() => Backup.restore('KINO1:basura', document.createElement('div')));
  console.log('4) código malo →', await p.evaluate(() => statusPill.textContent));
  console.log('errors', errs); await b.close(); })();
