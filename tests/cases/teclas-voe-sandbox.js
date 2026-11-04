const H = require('../helpers');
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1,3).join(' ')));
  await ctx.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.request().url().includes('hls.min.js') ? r.fulfill({ status: 200, contentType: 'text/javascript', body: require('fs').readFileSync(H.HLS_JS) }) : r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: /\.json/.test(r.request().url()) ? '{}' : '<html></html>' }));
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('kino_installed_v2', '[]'); } });
  await p.goto(H.APP, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  // 1) tecla 463
  await p.evaluate(c => startPlayback(c, 'Clip'), 'file://' + path.resolve('clip.webm'));
  await p.waitForFunction(() => videoPlayer.currentTime > 0.2, null, { timeout: 10000 });
  const k = async () => { await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 463, bubbles: true }))); await p.waitForTimeout(150); return p.evaluate(() => videoPlayer.paused); };
  console.log('1) tecla 463 → pausado:', await k(), '· otra vez → pausado:', await k());
  await p.evaluate(() => closePlayerBtn.click());
  // 2) VOE base64
  const html = `<script>var sources = { 'hls': '${Buffer.from('https://cdn-voe.fake/engine/hls2/01/x/master.m3u8?t=abc').toString('base64')}', 'video_height': 720 };</script>`;
  console.log('2) VOE base64 →', JSON.stringify(await p.evaluate(h => findMediaUrls(h, 'https://voe.sx/e/x').map(x => x.url), html)));
  // 3) sandbox del iframe
  for (const u of ['https://voe.sx/e/abc', 'https://filemoon.sx/e/abc', 'https://vibuxer.com/e/abc', 'https://hlswish.com/e/abc']) {
    await p.evaluate(u => { state.selectedItem = { id: 'm', title: 'T', kind: 'movie' }; startPlaybackSource({ url: u, name: 'srv', type: 'embed' }, 'T'); }, u);
    await p.waitForTimeout(200);
    console.log('3)', u.split('/')[2], '→ sandbox:', await p.evaluate(() => webPlayerFrame.getAttribute('sandbox')));
  }
  console.log('errors', errs); await b.close(); })();
