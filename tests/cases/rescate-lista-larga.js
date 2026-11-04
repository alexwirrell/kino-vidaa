const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const UA = 'Mozilla/5.0 (Linux; Android 10) TestUA';
const plugin = (mode) => `
const UA = ${JSON.stringify(UA)};
function soloAnuncios(d){ if(!d.length) return false; for (const x of d) if (!/tiktokcdn|ad-site|\\/ad\\//i.test(x)) return false; return true; }
export async function search(){ return [{ ref: 'r', title: 'Diarios' }]; }
export async function resolve(){
  const pide = { headers: { 'User-Agent': UA } };
  const m = await kino.fetch('https://mm.fake/s/MASTER', pide); const mt = m.text();
  const v = await kino.fetch(new URL(mt.split('\\n').filter(l => l && l[0] !== '#')[0], 'https://mm.fake/s/MASTER').href, pide);
  const vt = v.text();
  if (${mode === 'ok' ? 'false' : 'soloAnuncios(vt.split("\\n").filter(l => l && l[0] !== "#"))'}) { kino.log('flujo: lista sin vídeo en Servidor 1, se salta'); }
  else return { url: 'https://mm.fake/s/MASTER', mime: 'application/x-mpegURL', headers: { 'User-Agent': UA } };
  ${mode === 'short' ? '' : ''}
  throw Object.assign(new Error('capture timeout: ningún video en la página'), { code: 'timeout' });
}`;
const SHORT = process.argv[2] === 'short';
const real = fs.readFileSync(path.resolve('hls/index.m3u8'), 'utf8').split('\n').filter(l => /^#EXTINF|^index/.test(l));
let variant = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:0\n';
const reps = SHORT ? 1 : 8;
for (let r = 0; r < reps; r++) { if (r) variant += '#EXT-X-DISCONTINUITY\n'; real.forEach(l => { variant += (/^index/.test(l) ? 'https://p16-ad-site-sign-sg.tiktokcdn.com/obj/' + l : l) + '\n'; }); }
variant += '#EXT-X-ENDLIST\n';
const files = { 'u/chx/HEAD/kino-plugin.json': '{"name":"CineHax test"}', 'u/chx/HEAD/plugin.js': plugin('bad') };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const seen = [];
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    if (u.includes('hls.min.js')) return route.fulfill({status:200, contentType:'text/javascript', body: fs.readFileSync(H.HLS_JS)});
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    let t = u, viaW = false;
    if (u.startsWith('https://w.fake/')) { t = new URL(u).searchParams.get('url'); viaW = true; if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' }); }
    if (t.startsWith('https://mm.fake/')) {
      if (!viaW) return route.fulfill({ status: 403, headers: cors, body: 'no' });
      const hdr = JSON.parse(new URL(u).searchParams.get('hdr') || '{}'); seen.push(t.replace('https://mm.fake', '') + ' UA=' + (hdr['User-Agent'] === UA ? 'ok' : 'FALTA'));
      if (/MASTER/.test(t)) return route.fulfill({ status: 200, headers: cors, body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n/s/VARIANT\n' });
      return route.fulfill({ status: 200, headers: cors, body: variant }); }
    if (/tiktokcdn\.com\/obj\/(index\d+\.ts)/.test(t)) { const f = t.match(/(index\d+\.ts)/)[1]; return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'video/mp2t' }, cors), body: fs.readFileSync(path.resolve('hls', f)) }); }
    return route.abort(); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'chx', name: 'CineHax test', address: 'u/chx', enabled: true }])); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
  await p.evaluate(() => openDetail({ id: 'm', title: 'Diarios', kind: 'movie', pluginId: 'chx', ref: 'r', source: 'CineHax test' }));
  await p.waitForTimeout(300);
  const list = await p.evaluate(() => resolvePluginRef('chx', 'r', 'Diarios'));
  console.log(SHORT ? 'CORTA (anuncio de verdad):' : 'LARGA (episodio):', 'opciones =', JSON.stringify(list.map(x => x.label)));
  if (list.length) {
    await p.evaluate(() => { const s = state.directStreams[0]; startPlayback(s.url, 'Diarios', { mime: s.mime, referer: refOf(s) }); });
    const ok = await p.waitForFunction(() => videoPlayer.currentTime > 1, null, { timeout: 30000 }).then(() => true).catch(() => false);
    console.log('   reproduce:', ok, '· duración', await p.evaluate(() => Math.round(videoPlayer.duration)), 's');
  }
  console.log('   peticiones a moviemaster:', seen.slice(0, 5).join(' | '));
  console.log('  ', (await p.evaluate(() => state.diagLog.map(x => typeof x === 'string' ? x : (x.msg || '')).filter(l => /🛟|lista |player\]|intento|reproduciendo/.test(l)))).slice(-6).join('\n   '));
  console.log('errors', errs); await b.close(); })();
