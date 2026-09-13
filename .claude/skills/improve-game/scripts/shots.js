// Screenshot the game on several phone sizes for a visual review.
// Usage: NODE_PATH=$(npm root -g) node shots.js <baseUrl> <outDir> [device,device,...]
// Captures, per device: home (safari), home (math), one easy round, one hard round, one math round,
// and the celebration card. Uses the window.__bps test hook, so it needs no real taps.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const [baseUrl, outDir, devList = 'Pixel 5,iPhone SE,iPhone 12 Pro'] = process.argv.slice(2);
if (!baseUrl || !outDir) { console.log('usage: shots.js <baseUrl> <outDir> [devices]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const name of devList.split(',').map((s) => s.trim())) {
    const device = devices[name];
    if (!device) { console.log('unknown device ' + name); continue; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(name + ': pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ': console.error ' + m.text()); });
    const shot = (n) => page.screenshot({ path: path.join(outDir, `${slug}-${n}.png`) });
    const ready = () => page.waitForFunction(() => window.__bps && window.__bps.state);
    const bubbles = () => page.waitForFunction(() => window.__bps.state().bubbles.length >= 3, null, { timeout: 8000 }).catch(() => {});

    await page.goto(baseUrl + '/', { waitUntil: 'load' });
    await ready();
    await page.evaluate(() => { window.__bps.resetProgress(); window.__bps.setMode('safari'); window.__bps.setDifficulty('easy'); });
    await sleep(500); await shot('home');
    await page.evaluate(() => window.__bps.setMode('math')); await sleep(300); await shot('home-math');
    await page.evaluate(() => window.__bps.setMode('patterns')); await sleep(300); await shot('home-patterns');
    await page.evaluate(() => window.__bps.setMode('safari'));

    await page.evaluate(() => window.__bps.startRound(1)); await bubbles(); await sleep(600); await shot('easy-round');
    await page.reload({ waitUntil: 'load' }); await ready();
    await page.evaluate(() => { window.__bps.setDifficulty('hard'); window.__bps.startRound(6); }); await bubbles(); await sleep(600); await shot('hard-round');
    await page.reload({ waitUntil: 'load' }); await ready();
    await page.evaluate(() => { window.__bps.setDifficulty('easy'); window.__bps.setMode('math'); window.__bps.startRound(2); }); await bubbles(); await sleep(600); await shot('math-round');

    // celebration: pop the right bubbles by tapping them until the round completes
    await page.reload({ waitUntil: 'load' }); await ready();
    await page.evaluate(() => { window.__bps.setMode('safari'); window.__bps.setDifficulty('easy'); window.__bps.startRound(1); });
    for (let i = 0; i < 40; i++) {
      const st = await page.evaluate(() => window.__bps.state());
      if (st.screen === 'celebrate') break;
      const vp = page.viewportSize();
      const b = st.bubbles.find((b) => b.isTarget && b.y > b.r && b.y < vp.height - b.r && b.x > b.r && b.x < vp.width - b.r);
      if (b) { if (device.hasTouch) await page.touchscreen.tap(b.x, b.y); else await page.mouse.click(b.x, b.y); }
      await sleep(250);
    }
    await sleep(900); await shot('celebrate');
    await context.close();
    console.log('done ' + name);
  }
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('screenshots in ' + outDir);
})();
