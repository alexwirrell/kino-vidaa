const H = require('../helpers');
const { chromium } = require('playwright');
const files = {
  'u/g/HEAD/kino-plugin.json': '{"name":"Bueno"}', 'u/g/HEAD/plugin.js': `export async function home(){ return [{ title: 'Fila', items: [{ ref: 'a', title: 'A' }] }]; }`,
  'u/x/HEAD/kino-plugin.json': '{"name":"Gnula"}', 'u/x/HEAD/plugin.js': `export async function home(){ throw kino.error('unavailable', 'gnula respondió 403'); }`,
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const calls = [];
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) { calls.push(m[1].split('/')[1]); return route.fulfill({ status: 200, headers: cors, body: files[m[1]] }); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'g', name: 'Bueno', address: 'u/g', enabled: true }, { id: 'x', name: 'Gnula', address: 'u/x', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  for (let i = 0; i < 2; i++) await p.evaluate(() => refreshHomeCatalog());
  await p.evaluate(() => { state.view = 'plugins'; state.storeTab = 'installed'; renderView(); }); await p.waitForTimeout(200);
  const box = () => p.evaluate(() => { const h = [...document.querySelectorAll('.list-box')].find(x => /Salud/.test(x.textContent)); return h ? h.innerText.replace(/\n+/g, ' | ') : null; });
  console.log('1) resumen:', await box());
  console.log('   tarjetas:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.plugin-card')].map(c => c.querySelector('.plugin-title').textContent.trim().split(' ')[0] + ' → ' + ([...c.querySelectorAll('div')].find(d => /^🩺/.test(d.textContent.trim())) || {}).textContent))));
  await p.evaluate(() => pauseBadBtn.click()); await p.waitForTimeout(500);
  console.log('2) tras pausar:', await box());
  await p.evaluate(() => { state.diagLog.length = 0; }); await p.evaluate(() => refreshHomeCatalog());
  console.log('   Inicio llama a:', (await p.evaluate(() => state.diagLog.filter(d => /home\(\)/.test(d.msg)).map(d => d.msg.split('.')[0]))).join(', '));
  await p.evaluate(() => { const c = [...document.querySelectorAll('.plugin-card')].find(c => /Gnula/.test(c.textContent)); c.querySelector('[data-action="pause"]').click(); }); await p.waitForTimeout(300);
  console.log('3) ▶ Activar Gnula → activo:', await p.evaluate(() => state.installed.find(x => x.id === 'x').enabled));
  console.log('errors', errs); await b.close(); })();
