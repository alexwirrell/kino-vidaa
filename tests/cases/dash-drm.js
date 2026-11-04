const H = require('../helpers');
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const mode = process.argv[2] || 'direct';
const files = { 'u/c/HEAD/kino-plugin.json': '{"name":"Caracol TV"}', 'u/c/HEAD/plugin.js': `export async function resolve(){ return { url: 'https://mdstrm.fake/video/manifest.mpd', mime: 'application/dash+xml', ${mode === 'drm' ? "drm: { type: 'widevine', licenseUrl: 'https://lic.fake/LICENSE', licenseHeaders: { Cookie: 'playback_token=T' } }," : ''} headers: { restful: 'yes', 'User-Agent': 'okhttp/4.12.0', Cookie: 'playback_token=T' } }; }` };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const net = [];
  await ctx.route('**/*', async route => { const u = route.request().url(); const cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith('file:')) return route.continue();
    if (u.includes('shaka-player.compiled.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(H.SHAKA_JS) });
    const m = u.match(/raw\.githubusercontent\.com\/(.+)$/); if (m && files[m[1]]) return route.fulfill({ status: 200, headers: cors, body: files[m[1]] });
    let t = u, via = 'directo', hdr = null;
    if (u.startsWith('https://w.fake/')) { const q = new URL(u).searchParams; t = q.get('url'); via = 'worker'; hdr = JSON.parse(q.get('hdr') || '{}'); if (!t) return route.fulfill({ status: 200, headers: cors, body: 'Proxy de Kino VIDAA funcionando ✓' }); }
    if (t.startsWith('https://mdstrm.fake/video/')) {
      const f = t.split('/video/')[1].split('?')[0];
      net.push(via + ':' + f + (hdr ? (hdr['User-Agent'] === 'okhttp/4.12.0' ? '(UA✓)' : '(UA✗)') : ''));
      if (mode === 'proxy' && via === 'directo') return route.fulfill({ status: 403, headers: cors, body: '{"message":"You are not allowed to watch this video"}' });
      return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': f.endsWith('.mpd') ? 'application/dash+xml' : 'video/mp4' }, cors), body: fs.readFileSync(path.join('dash', f)) }); }
    return route.fulfill({ status: 404, headers: cors, body: '' }); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', JSON.stringify([{ id: 'caracol-tv', name: 'Caracol TV', address: 'u/c', enabled: true }])); localStorage.setItem('kino_custom_proxy', JSON.stringify('w.fake')); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
  await p.evaluate(() => { state.selectedItem = { id: 'm', title: 'Telerobo', kind: 'series' }; });
  await p.evaluate(() => resolvePluginRef('caracol-tv', 'r', 'Telerobo'));
  await p.evaluate(() => { const s = state.directStreams[0]; startPlayback(s.url, 'Telerobo', { mime: s.mime, referer: refOf(s) }); });
  const ok = await p.waitForFunction(() => videoPlayer.currentTime > 1, null, { timeout: 45000 }).then(() => true).catch(() => false);
  console.log(`[${mode}] reproduce:`, ok, '· duración', await p.evaluate(() => Math.round(videoPlayer.duration)), '· peticiones:', [...new Set(net)].slice(0, 5).join(' '));
  console.log('  ', (await p.evaluate(() => state.diagLog.filter(d => d.kind === 'player').map(d => d.msg))).join('\n   '));
  if (ok) { await p.evaluate(() => closePlayerBtn.click()); await p.waitForTimeout(300); console.log('   cerrar → shaka destruido:', await p.evaluate(() => !state.shakaInstance)); }
  else console.log('   aviso:', await p.evaluate(() => nowPlayingSub.textContent));
  console.log('errors', errs); await b.close(); })();
