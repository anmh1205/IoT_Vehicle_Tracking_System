// Render + verify the A0 landscape IoT poster. Usage: node _render_poster.cjs
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const file = 'file://' + path.resolve(__dirname, 'poster-iot-vehicle-tracking.html').replace(/\\/g, '/');
  const browser = await chromium.launch();
  // A0 portrait at 96dpi = 3179 x 4494 px. Match viewport so the screen-fit script renders at scale 1.
  const page = await browser.newPage({ viewport: { width: 3179, height: 4494 }, deviceScaleFactor: 2 });

  const failed = [];
  page.on('requestfailed', r => failed.push(r.url()));
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(file, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });   // full size, no screen scaling
  await page.waitForTimeout(300);

  const info = await page.evaluate(() => {
    const p = document.getElementById('poster');
    p.style.transform = 'none';
    const imgs = [...document.images].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth }));
    const pr = p.getBoundingClientRect();
    const off = [];
    p.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      const right = r.right - pr.right, bottom = r.bottom - pr.bottom;
      if (right > 3 || bottom > 3) off.push({ cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName, right: Math.round(right), bottom: Math.round(bottom), w: Math.round(r.width), left: Math.round(r.left - pr.left) });
    });
    off.sort((a,b)=>Math.max(b.right,b.bottom)-Math.max(a.right,a.bottom));
    return { posterW: Math.round(pr.width), overflow: p.scrollHeight - p.clientHeight, offenders: off.slice(0,4), imgs };
  });

  const el = await page.$('#poster');
  await el.screenshot({ path: path.resolve(__dirname, 'poster-preview.png') });
  await page.pdf({ path: path.resolve(__dirname, 'poster-iot-vehicle-tracking.pdf'), preferCSSPageSize: true, printBackground: true });

  console.log('--- VERIFY ---');
  console.log('posterW(px):', info.posterW, '| overflow(px):', info.overflow);
  console.log('offenders:', JSON.stringify(info.offenders));
  console.log('failedRequests:', failed.length, failed);
  console.log('consoleErrors:', errors.length, errors);
  info.imgs.forEach(i => console.log((i.ok ? 'OK  ' : 'BAD ') + 'w=' + i.w + '  ' + i.src));

  await browser.close();
})();
