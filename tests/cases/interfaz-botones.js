const H = require('../helpers');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.dismiss());
  await ctx.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' }));
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_custom_proxy', JSON.stringify('off')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const views = ['home', 'search', 'plugins', 'livetv', 'favorites', 'settings', 'diag'];
  const report = [];
  for (const v of views) {
    await p.evaluate(v => { __kinoState.view = v; if (v === 'plugins') __kinoState.storeTab = 'official'; renderView(); }, v);
    const n = await p.evaluate(() => document.querySelectorAll('#viewContent button').length);
    let clicked = 0, problems = [];
    for (let i = 0; i < Math.min(n, 40); i++) {
      const before = errs.length;
      const info = await p.evaluate(({ v, i }) => {
        __kinoState.view = v; renderView();
        const btn = document.querySelectorAll('#viewContent button')[i];
        if (!btn) return null;
        const label = (btn.id || btn.textContent.trim()).slice(0, 30);
        if (/Instalad|Instalar|Salir|exitApp/.test(label)) return { label, skipped: true };
        btn.click();
        return { label };
      }, { v, i });
      if (!info || info.skipped) continue;
      clicked++;
      await p.waitForTimeout(250);
      await p.evaluate(() => { ['playerOverlay', 'configOverlay', 'detailOverlay'].forEach(id => { const o = document.getElementById(id); if (o.classList.contains('open')) { const btn = { playerOverlay: 'closePlayerBtn', configOverlay: 'closeConfigBtn', detailOverlay: 'closeDetailBtn' }[id]; document.getElementById(btn).click(); } }); });
      if (errs.length > before) problems.push(`${info.label}: ${errs.slice(before).join(' | ').slice(0, 120)}`);
    }
    report.push(`${v}: ${clicked} botones pulsados${problems.length ? ' · ERRORES: ' + problems.join(' ; ') : ' · sin errores'}`);
  }
  // Overlays: detalle, config, reproductor
  await p.evaluate(() => openDetail({ id: 'x', title: 'Prueba', imdbId: 'tt0111161', kind: 'movie' }));
  for (const id of ['searchAllPluginsBtn', 'playNativeBtn', 'favToggleBtn', 'playDirectBtn']) { const before = errs.length; await p.evaluate(id => document.getElementById(id).click(), id); await p.waitForTimeout(400); if (errs.length > before) report.push(`ficha ${id}: ${errs.slice(before).join(' | ')}`); }
  await p.evaluate(() => { if (playerOverlay.classList.contains('open')) closePlayerBtn.click(); });
  await p.evaluate(() => startPlayback('https://cdn.fake/x.m3u8', 'x'));
  for (const id of ['playerRewBtn', 'playerPlayPauseBtn', 'playerFwdBtn', 'playerNextServerBtn', 'playerNativeHandoffBtn', 'closePlayerBtn']) { const before = errs.length; await p.evaluate(id => { const e = document.getElementById(id); if (e) e.click(); }, id); await p.waitForTimeout(200); if (errs.length > before) report.push(`reproductor ${id}: ${errs.slice(before).join(' | ')}`); }
  await p.evaluate(() => openPluginConfigModal({ id: 'internet-archive', name: 'Internet Archive', address: 'kinotvapp/kino-plugin-archive' })); await p.waitForTimeout(800);
  await p.evaluate(() => closeConfigBtn.click());
  console.log(report.join('\n'));
  console.log('errores totales:', errs.length, errs.slice(0, 5));
  await b.close();
})();
