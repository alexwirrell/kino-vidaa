const H = require('../helpers');
const { chromium } = require('playwright');
const files = {
  'u/old/HEAD/kino-plugin.json': '{"name":"Viejo"}', 'u/old/HEAD/plugin.js': `export async function home(){ return Array.from({length: 9}, (_, i) => ({ title: 'Fila vieja ' + i, items: [{ ref: 'o' + i, title: 'O' + i }] })); }`,
  'u/gn/HEAD/kino-plugin.json': '{"name":"Gnula"}', 'u/gn/HEAD/plugin.js': `export async function home(){ const r = await kino.fetch('https://www2.gnula.one/'); const h = r.text(); return /Estrenos/.test(h) ? [{ title: 'Estrenos', items: [{ ref: 'x', title: 'X' }] }] : []; }`,
  'u/c/HEAD/kino-plugin.json': '{"name":"Caracol TV"}', 'u/c/HEAD/plugin.js': `export async function home(){ return [{ id: 'series', title: 'Series de Caracol', ref: 'series', items: [{ ref: 'c1', title: 'C1', kind: 'series' }] }]; }`,
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.includes('gnula.one')) return route.fulfill({ status: 200, headers: cors, body: '<!DOCTYPE html><html><head><title>Just a moment...</title></head><body>cf</body></html>' });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'old', name: 'Viejo', address: 'u/old', enabled: true }, { id: 'gnula', name: 'Gnula', address: 'u/gn', enabled: true }, { id: 'caracol-tv', name: 'Caracol TV', address: 'u/c', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  console.log('orden del Inicio:', (await p.evaluate(() => [...document.querySelectorAll('.row-section .row-title')].map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)))).slice(0, 4).join(' | '));
  console.log((await p.evaluate(() => state.diagLog.filter(d => /gnula/.test(d.msg) && /plugin/.test(d.kind)).map(d => d.msg))).join('\n'));
  console.log('errors', errs); await b.close(); })();
