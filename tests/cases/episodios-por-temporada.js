const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const plugin = `
export async function search(){ return []; }
export async function details(){ return { overview: 'Serie de prueba' }; }
export async function episodes(){ const e = []; for (const s of [2, 1, 3, 0]) for (let n = 1; n <= 25; n++) e.push({ ref: 's' + s + 'e' + n, season: s, number: n, title: 'Cap ' + n }); return { series: { title: 'Serie' }, episodes: e }; }
export async function resolve(ref){ await kino.sleep(300); return { url: 'https://cdn.fake/' + ref + '.webm', mime: 'video/webm', label: 'Servidor 1' }; }`;
const files = { 'u/sx/HEAD/kino-plugin.json': '{"name":"Series test"}', 'u/sx/HEAD/plugin.js': plugin };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const clip = fs.readFileSync(path.resolve('clip.webm'));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.startsWith('https://cdn.fake/')) return route.fulfill({ status: 200, headers: cors, contentType: 'video/webm', body: clip });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'sx', name: 'Series test', address: 'u/sx', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
  await p.evaluate(() => openDetail({ id: 'x', title: 'Serie', kind: 'series', pluginId: 'sx', ref: 'r', source: 'Series test' }));
  await p.waitForSelector('#seasonTabs .season-btn', { timeout: 10000 });
  const info = () => p.evaluate(() => ({ tabs: [...document.querySelectorAll('#seasonTabs .season-btn')].map(b => (b.classList.contains('active') ? '*' : '') + b.textContent), eps: document.querySelectorAll('#epGrid .ep-btn').length, first: (document.querySelector('#epGrid .ep-btn') || {}).textContent, focus: document.activeElement && (document.activeElement.textContent || '').trim().slice(0, 30) }));
  console.log('1) al abrir:', JSON.stringify(await info()));
  // Navegar con el mando: desde ▶ Reproducir bajar hasta las temporadas
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(60); } };
  await p.focus('#playDirectBtn');
  for (let i = 0; i < 6; i++) { const f = await p.evaluate(() => document.activeElement.className); if (/season-btn/.test(f)) break; await key('ArrowDown'); }
  console.log('2) Abajo hasta temporadas → foco:', (await info()).focus);
  await key('ArrowRight'); await key('Enter'); await p.waitForTimeout(100);
  console.log('3) → y OK:', JSON.stringify(await info()));
  await key('ArrowDown'); console.log('4) ↓ entra a los episodios → foco:', (await info()).focus);
  await key('ArrowRight', 2); await key('ArrowDown', 2);
  const chosen = (await info()).focus; await key('Enter');
  await p.waitForFunction(() => document.querySelector('#directStreamsList [data-play-web]'), null, { timeout: 10000 });
  await p.waitForTimeout(200);
  const st = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { focus: a.textContent.trim(), inView: r.top >= 0 && r.bottom <= innerHeight, label: document.querySelector('#directStreamsList strong').textContent }; });
  console.log('5) OK en', chosen, '→ foco:', st.focus, '· visible en pantalla:', st.inView, '·', st.label);
  await p.screenshot({ path: 't42a.png' }); await key('Enter'); const ok = await p.waitForFunction(() => playerOverlay.classList.contains('open') && videoPlayer.currentTime > 0.2, null, { timeout: 15000 }).then(() => true).catch(() => false);
  console.log('6) OK otra vez → reproduce:', ok, '·', await p.evaluate(() => nowPlayingTitle.textContent), '· subtítulos buscan T/E:', await p.evaluate(() => state.selectedSeason + 'x' + state.selectedEpisode));
  await p.screenshot({ path: 't42.png' });
  console.log('errors', errs); await b.close(); })();
