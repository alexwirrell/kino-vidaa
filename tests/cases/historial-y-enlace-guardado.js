const H = require('../helpers');
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const files = {
  'u/a/HEAD/kino-plugin.json': '{"name":"Relleno"}', 'u/a/HEAD/plugin.js': `export async function search(q){ const t = typeof q === 'string' ? q : q.q; return [{ ref: t, title: t, kind: 'movie' }]; } export async function resolve(r){ return { url: 'https://vids.fake/' + encodeURIComponent(r) + '/m3tr0g0ldw1n.webm', mime: 'video/webm' }; }`,
  'u/b/HEAD/kino-plugin.json': '{"name":"Bueno"}', 'u/b/HEAD/plugin.js': `export async function search(q){ await kino.sleep(2000); const t = typeof q === 'string' ? q : q.q; return [{ ref: t, title: t, kind: 'movie' }]; } export async function resolve(r){ return { url: 'https://good.fake/' + encodeURIComponent(r) + '.webm?t=' + Date.now(), mime: 'video/webm' }; }`,
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const lion = fs.readFileSync(path.resolve('lion.webm')), good = fs.readFileSync(path.resolve('long.webm')); const net = [];
  let goodBroken = false, brokenUrl = '';
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.startsWith('https://vids.fake/')) { net.push('relleno'); return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'video/webm' }, cors), body: lion }); }
    if (u.startsWith('https://good.fake/')) { net.push('bueno'); if (goodBroken && u === brokenUrl) return route.fulfill({ status: 404, headers: cors, body: '' }); return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'video/webm', 'accept-ranges': 'bytes' }, cors), body: good }); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'pa', name: 'Relleno', address: 'u/a', enabled: true }, { id: 'pb', name: 'Bueno', address: 'u/b', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
  const play = async (title) => {
    net.length = 0; const t0 = Date.now();
    await p.evaluate(t => { if (playerOverlay.classList.contains('open')) closePlayerBtn.click(); openDetail({ id: t, title: t, kind: 'movie', year: '' }); }, title);
    await p.waitForTimeout(200); await p.evaluate(() => playDirectBtn.click());
    await p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.5 && videoPlayer.duration > 100, null, { timeout: 60000 });
    return `${((Date.now() - t0) / 1000).toFixed(1)} s · ${await p.evaluate(() => nowPlayingTitle.textContent)} · pidió: ${net.join(' → ')}`;
  };
  console.log('1) 1.ª vez (sin historial):', await play('Uno'));
  console.log('2) otro título (con historial):', await play('Dos'));
  console.log('   puntuaciones:', JSON.stringify(await p.evaluate(() => { const a = StreamStats.all(); const o = {}; Object.keys(a).forEach(k => o[k] = a[k].ok + '✓/' + a[k].fail + '✗/' + a[k].filler + 'R'); return o; })));
  console.log('3) reabrir «Uno» (enlace guardado):', await play('Uno'));
  brokenUrl = await p.evaluate(() => LinkCache.get({ id: 'Uno', title: 'Uno', kind: 'movie' }).url); goodBroken = true;
  await p.evaluate(() => { state.diagLog.length = 0; }); console.log('4) enlace guardado caducado:', await play('Uno').catch(e => 'falló: ' + e.message.slice(0, 60))); console.log((await p.evaluate(() => state.diagLog.filter(d => /player|plugin/.test(d.kind)).map(d => d.t + ' ' + d.msg))).join('\n'));
  console.log('  ', (await p.evaluate(() => state.diagLog.filter(d => /⚡/.test(d.msg)).slice(-3).map(d => d.msg))).join(' | '));
  console.log('errors', errs); await b.close(); })();
