// Usage: NODE_PATH=/opt/node22/lib/node_modules node smoke.js <baseUrl> <outDir> [deviceName]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const [baseUrl, outDir, deviceName = 'Pixel 5'] = process.argv.slice(2);
if (!baseUrl || !outDir) { console.log('usage: smoke.js <baseUrl> <outDir> [deviceName]'); process.exit(1); }
const device = devices[deviceName];
if (!device) { console.log('unknown device ' + deviceName); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

let step = 'setup';
const errors = [];
const assert = (c, msg) => { if (!c) throw new Error(`[${step}] ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', (r) => { if (!r.url().startsWith(baseUrl)) errors.push('external request: ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith(baseUrl)) errors.push('external request: ' + r.url()); });

  const tap = async (x, y) => { if (device.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const state = () => page.evaluate(() => window.__bps.state());
  const vp = page.viewportSize();
  const visible = (b) => b.x > b.r * 0.5 && b.x < vp.width - b.r * 0.5 && b.y > b.r * 0.5 && b.y < vp.height - b.r * 0.5;
  const tapEl = async (sel) => { const box = await page.locator(sel).boundingBox(); assert(box, `missing ${sel}`); await tap(box.x + box.width / 2, box.y + box.height / 2); };
  const noErrors = () => assert(errors.length === 0, 'errors: ' + errors.join(' | '));

  try {
    step = '1-home';
    await page.goto(baseUrl + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__bps && window.__bps.state);
    await page.evaluate(() => window.__bps.resetProgress());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__bps && window.__bps.state);
    let st = await state();
    assert(st.screen === 'home', 'expected home, got ' + st.screen);
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, 'home.png') });
    noErrors();

    step = '2-play';
    await tapEl('[data-testid="play"]');
    await sleep(200);
    st = await state();
    assert(st.screen === 'play', 'expected play, got ' + st.screen);
    assert(st.round === 1, 'expected round 1, got ' + st.round);

    step = '3-bubbles';
    await page.waitForFunction(() => window.__bps.state().bubbles.length >= 3, null, { timeout: 8000 });
    await sleep(500);
    await page.screenshot({ path: path.join(outDir, 'round.png') });
    noErrors();

    step = '4-wrong-tap';
    let wrong = null;
    for (let i = 0; i < 40 && !wrong; i++) { st = await state(); wrong = st.bubbles.find((b) => !b.isTarget && visible(b)); if (!wrong) await sleep(150); }
    assert(wrong, 'no non-target bubble appeared');
    const before = st.progress;
    await tap(wrong.x, wrong.y);
    await sleep(150);
    st = await state();
    assert(st.progress === before, `progress changed on wrong tap: ${before} -> ${st.progress}`);
    noErrors();

    async function completeRound(expectedRound) {
      step = `5-round-${expectedRound}`;
      let guard = 0;
      while (true) {
        st = await state();
        assert(st.round === expectedRound, `round drifted to ${st.round}`);
        if (st.screen !== 'play' || st.progress >= st.goal) break;
        assert(++guard < 80, 'too many attempts');
        const targets = st.bubbles.filter((b) => b.isTarget && visible(b)).sort((a, b) => b.y - a.y);
        if (!targets.length) { await sleep(150); continue; }
        const p0 = st.progress;
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          const s2 = await state();
          const fresh = s2.bubbles.find((b) => b.id === targets[0].id) || s2.bubbles.filter((b) => b.isTarget && visible(b))[0];
          if (!fresh) break;
          await tap(fresh.x, fresh.y);
          await sleep(120);
          const s3 = await state();
          if (s3.progress === p0 + 1) ok = true;
          else assert(s3.progress === p0, `progress jumped ${p0} -> ${s3.progress}`);
        }
        assert(ok, `progress did not increase by 1 after tapping target (progress=${p0})`);
        noErrors();
      }
      await page.waitForFunction((r) => { const s = window.__bps.state(); return s.screen === 'celebrate' || s.round === r + 1; }, expectedRound, { timeout: 8000 });
      st = await state();
      console.log(`round ${expectedRound} done -> screen=${st.screen} unlocked=[${st.unlocked}]`);
      await sleep(800);
      await page.screenshot({ path: path.join(outDir, `celebrate-${expectedRound}.png`) });
      if (st.screen === 'celebrate') await tapEl('[data-testid="next"]');
      await page.waitForFunction((r) => { const s = window.__bps.state(); return s.screen === 'play' && s.round === r + 1; }, expectedRound, { timeout: 8000 });
      noErrors();
    }
    await completeRound(1);
    await completeRound(2);

    step = '6-reload-stickers';
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__bps && window.__bps.state);
    st = await state();
    assert(st.screen === 'home', 'expected home after reload');
    assert(st.unlocked.includes(1) && st.unlocked.includes(2), 'unlocked missing 1,2: ' + JSON.stringify(st.unlocked));
    const stickers = await page.evaluate(() => [1, 2].map((i) => !!document.querySelector(`#book .slot.unlocked[data-round="${i}"]`)));
    assert(stickers.every(Boolean), 'sticker DOM not unlocked: ' + JSON.stringify(stickers));
    await sleep(700);
    await page.screenshot({ path: path.join(outDir, 'home-stickers.png') });
    noErrors();

    step = '7-mute';
    const m0 = (await state()).muted;
    await tapEl('[data-testid="mute"]');
    await sleep(100);
    assert((await state()).muted === !m0, 'mute did not toggle');
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__bps && window.__bps.state);
    assert((await state()).muted === !m0, 'mute did not persist');
    await tapEl('[data-testid="mute"]');
    assert((await state()).muted === m0, 'mute did not toggle back');
    noErrors();

    console.log('PASS');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.log('FAIL at step ' + step + ': ' + e.message);
    if (errors.length) console.log('errors: ' + errors.join('\n'));
    try { await page.screenshot({ path: path.join(outDir, 'fail.png') }); } catch (_) {}
    await browser.close();
    process.exit(1);
  }
})();
