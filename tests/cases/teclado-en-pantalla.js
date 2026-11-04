const H = require('../helpers');
const { chromium } = require('playwright');
const files = { 'u/s/HEAD/kino-plugin.json': '{"name":"Buscador"}', 'u/s/HEAD/plugin.js': `export async function search(q){ const t = typeof q === 'string' ? q : q.q; return [{ ref: 'r1', title: 'Resultado ' + t, kind: 'movie' }]; }` };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.includes('api.themoviedb.org/3/search/multi')) return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ results: [{ media_type: 'movie', title: 'Obsesión', release_date: '2026-01-01' }, { media_type: 'tv', name: 'Obsession', first_air_date: '2023-04-01' }, { media_type: 'person', name: 'X' }] }) });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'ps', name: 'Buscador', address: 'u/s', enabled: true }])); localStorage.setItem('kino_tmdb_key', JSON.stringify('0123456789abcdef0123456789abcdef')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(40); } };
  const foc = () => p.evaluate(() => (document.activeElement.textContent || document.activeElement.id || '').trim());
  await p.evaluate(() => { state.view = 'search'; renderView(); }); await p.waitForTimeout(200); await p.focus('#searchInput');
  await key('Enter');
  console.log('1) OK en el campo → teclado abierto:', await p.evaluate(() => OSK.isOpen()), '· foco en:', await foc());
  await key('ArrowRight', 8); const a = await foc(); await key('Enter');
  await key('ArrowDown', 2); await key('ArrowRight', 4); const b2 = await foc(); await key('Enter');
  await key('ArrowUp'); await key('ArrowLeft', 3); const c = await foc(); await key('Enter');
  console.log('2) con flechas:', a, b2, c, '→ texto:', await p.evaluate(() => OSK.text));
  await p.waitForTimeout(700);
  console.log('3) sugerencias:', await p.evaluate(() => [...document.querySelectorAll('#oskSugg button')].map(x => x.textContent).join(' | ')));
  for (let i = 0; i < 8 && !/Listo/.test(await foc()); i++) await key('ArrowDown');
  for (let i = 0; i < 8 && !/Listo/.test(await foc()); i++) await key('ArrowRight');
  console.log('4) ▼▶ hasta:', await foc()); await key('Enter'); await p.waitForTimeout(800);
  console.log('   → teclado cerrado:', !(await p.evaluate(() => OSK.isOpen())), '· campo:', await p.evaluate(() => searchInput.value), '· resultados:', await p.evaluate(() => [...document.querySelectorAll('#searchResults .row-title')].map(x => x.textContent).join(' | ')));
  // 5) sugerencia directa
  await p.focus('#searchInput'); await key('Enter'); await key('Backspace', 3); await p.keyboard.type('obse'); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('#oskSugg button').focus()); await key('Enter'); await p.waitForTimeout(800);
  console.log('5) teclado físico + sugerencia → campo:', await p.evaluate(() => searchInput.value), '· búsquedas:', await p.evaluate(() => state.diagLog.filter(d => /search\(/.test(d.msg)).map(d => d.msg.match(/"[^"]+"/)[0]).join(', ')));
  // 6) Back cancela
  await p.focus('#searchInput'); await key('Enter'); await key('KeyZ'); await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 461, bubbles: true })));
  console.log('6) Back → cerrado:', !(await p.evaluate(() => OSK.isOpen())), '· campo sin cambiar:', await p.evaluate(() => searchInput.value), '· foco en el campo:', await p.evaluate(() => document.activeElement.id));
  // 7) ⌨ TV
  await key('Enter'); await p.evaluate(() => OSK.press('native'));
  console.log('7) ⌨ TV → campo editable:', await p.evaluate(() => !searchInput.readOnly && !!searchInput.dataset.editing));
  // 8) Ajustes: ⌨️ Escribir llave TMDB → Listo guarda
  await p.evaluate(() => { state.view = 'settings'; renderView(); }); await p.waitForTimeout(200);
  await p.evaluate(() => writeTmdbBtn.click()); await p.evaluate(() => { OSK.text = 'abcdef0123456789abcdef0123456789'; OSK.done(); });
  console.log('8) llave guardada:', await p.evaluate(() => localStorage.getItem('kino_tmdb_key')), '·', await p.evaluate(() => statusPill.textContent));
  await p.evaluate(() => { state.view = 'search'; renderView(); }); await p.waitForTimeout(200); await p.focus('#searchInput'); await key('Enter');
  await p.screenshot({ path: 't61.png' });
  console.log('errors', errs); await b.close(); })();
