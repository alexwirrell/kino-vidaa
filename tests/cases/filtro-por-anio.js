const H = require('../helpers');
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const files = { 'u/h/HEAD/kino-plugin.json': '{"name":"CineHD Plus"}', 'u/h/HEAD/plugin.js': `
export async function search(q){ return [{ ref: 'otra', title: 'Spider-Man: Sin camino a casa', year: '2021', kind: 'movie' }, { ref: 'buena', title: 'Spider-Man: Un nuevo día', year: '2026', kind: 'movie' }, { ref: 'vieja', title: 'Spider-Man', year: '2002', kind: 'movie' }]; }
export async function resolve(ref){ kino.log('resolve ' + ref); return { url: 'https://cdn.fake/' + ref + '.webm', mime: 'video/webm' }; }` };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const clip = fs.readFileSync(path.resolve('clip.webm'));
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    if (u.startsWith('https://api.themoviedb.org/3/search/movie')) return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ results: [{ id: 969681, title: 'Spider-Man: Brand New Day', release_date: '2026-07-31' }] }) });
    if (u.startsWith('https://api.themoviedb.org/3/movie/')) return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ id: 969681, title: 'Spider-Man: Un nuevo día', release_date: '2026-07-31', external_ids: { imdb_id: 'tt22084616' } }) });
    if (u.startsWith('https://cdn.fake/')) return route.fulfill({ status: 200, headers: cors, contentType: 'video/webm', body: clip });
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_tmdb_key', JSON.stringify('0123456789abcdef0123456789abcdef')); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'h', name: 'CineHD Plus', address: 'u/h', enabled: true }])); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
  for (const it of [{ id: 'a', title: 'Spider-Man: Brand New Day', year: '2026', kind: 'movie' }, { id: 'b', title: 'Spider-Man: Brand New Day', kind: 'movie' }]) {
    await p.evaluate(it => openDetail(it), it); await p.waitForTimeout(300); await p.evaluate(() => { state.diagLog.length = 0; markUserPlayIntent(); });
    const list = await p.evaluate(it => findDirectStreams(state.selectedItem).then(l => l.map(x => x.url.split('/').pop())), it);
    console.log(`año ${it.year || '—'} → enlaces:`, list.join(', '), '·', (await p.evaluate(() => state.diagLog.filter(d => /descartan|resolve /.test(d.msg)).map(d => d.msg.trim()))).join(' | '));
  }
  console.log('errors', errs); await b.close(); })();
