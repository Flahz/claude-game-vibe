// Screenshot one mode on several phone sizes and check the home screen layout against a baseline build.
// Usage: NODE_PATH=$(npm root -g) node mode-shots.js <baseUrl> <outDir> <modeId> [rounds=1,5,10] [devices] [--base <mainUrl>]
// Per device: the home screen with the mode selected (easy), each listed round in easy, the last one in hard.
// Uses the window.__bps hook, so it needs no real taps.
// Layout: measures whether the home screen scrolls, how many lines the mode row takes, the smallest mode button and the
// height of the owl's pill. Headless Chromium in a container renders system-ui with a wider fallback font than a phone,
// so absolute numbers lie: pass --base with a server on the current main build (e.g. the main checkout on another port)
// and the script fails only on regressions (scrolls where main does not, more mode rows than main, smaller buttons, a
// taller pill). Without --base it prints the numbers and warns. Exits 1 on a regression or a page error.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2); let baseMain = null;
const bi = argv.indexOf('--base'); if (bi >= 0) { baseMain = argv[bi + 1]; argv.splice(bi, 2); }
const [baseUrl, outDir, modeId, roundList = '1,5,10', devList = 'Pixel 5,iPhone SE,iPhone 12 Pro'] = argv;
if (!baseUrl || !outDir || !modeId) { console.log('usage: mode-shots.js <baseUrl> <outDir> <modeId> [rounds] [devices] [--base <mainUrl>]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rounds = roundList.split(',').map((n) => +n).filter((n) => n >= 1 && n <= 10);

const measureHome = () => {
  const h = document.querySelector('#home'), row = document.querySelector('#modes');
  const btns = [...row.querySelectorAll('.btn')].map((b) => b.getBoundingClientRect());
  const t0 = btns.length ? Math.min(...btns.map((b) => b.top)) : 0;
  const tops = new Set(btns.map((b) => Math.round((b.top - t0) / 24)));   // a selected button is scaled a little; a wrap moves one a whole row down
  const minSide = btns.length ? Math.min(...btns.map((b) => Math.min(b.width, b.height))) : 0;
  return { scrolls: h.scrollHeight > h.clientHeight + 1, overflow: Math.max(0, h.scrollHeight - h.clientHeight), modeRows: tops.size, buttons: btns.length, minButton: Math.round(minSide) };
};

(async () => {
  const browser = await chromium.launch();
  const problems = [], warnings = [], errors = [];
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
    const pillHeight = () => page.evaluate(() => document.querySelector('#guide').getBoundingClientRect().height);

    // the baseline: main's home screen (any mode) and its tallest owl pill (math round 1, "Find n" with dots)
    let base = null;
    if (baseMain) {
      await page.goto(baseMain + '/', { waitUntil: 'load' }); await ready();
      await page.evaluate(() => { window.__bps.resetProgress(); window.__bps.setDifficulty('easy'); window.__bps.setMode('words'); }); await sleep(400);
      base = await page.evaluate(measureHome);
      base.pill = 0;   // the tallest owl pill on main: a math round with dots and both kinds of words round
      for (const [m, r] of [['math', 1], ['math', 3], ['words', 1], ['words', 8]]) {
        await page.reload({ waitUntil: 'load' }); await ready();
        await page.evaluate((a) => { window.__bps.setDifficulty('easy'); window.__bps.setMode(a.m); window.__bps.startRound(a.r); }, { m, r });
        await sleep(600); base.pill = Math.max(base.pill, await pillHeight());
      }
    }

    await page.goto(baseUrl + '/', { waitUntil: 'load' }); await ready();
    const okMode = await page.evaluate((m) => { window.__bps.resetProgress(); window.__bps.setDifficulty('easy'); window.__bps.setMode(m); return window.__bps.state().mode === m; }, modeId);
    if (!okMode) { problems.push(`${name}: setMode('${modeId}') did not switch (is '${modeId}' in MODES?)`); await context.close(); continue; }
    await sleep(500); await shot('home');
    const home = await page.evaluate(measureHome);

    let pill = 0;
    for (const r of rounds) {
      await page.reload({ waitUntil: 'load' }); await ready();
      await page.evaluate((a) => { window.__bps.setDifficulty('easy'); window.__bps.setMode(a.m); window.__bps.startRound(a.r); }, { m: modeId, r });
      await bubbles(); await sleep(700); await shot(`easy-round-${r}`); pill = Math.max(pill, await pillHeight());
    }
    const last = rounds[rounds.length - 1] || 10;
    await page.reload({ waitUntil: 'load' }); await ready();
    await page.evaluate((a) => { window.__bps.setDifficulty('hard'); window.__bps.setMode(a.m); window.__bps.startRound(a.r); }, { m: modeId, r: last });
    await bubbles(); await sleep(700); await shot(`hard-round-${last}`); pill = Math.max(pill, await pillHeight());
    home.pill = Math.round(pill);
    console.log(JSON.stringify({ device: name, mode: home, main: base }));

    const out = base ? problems : warnings;
    if (home.scrolls && !(base && base.scrolls)) out.push(`${name}: home screen scrolls by ${home.overflow}px${base ? ' (main does not)' : ''}`);
    if (base && home.scrolls && base.scrolls && home.overflow > base.overflow + 2) problems.push(`${name}: home screen scrolls ${home.overflow - base.overflow}px more than main`);
    if (home.modeRows > (base ? base.modeRows : 1)) out.push(`${name}: the mode row takes ${home.modeRows} line(s)${base ? ' vs ' + base.modeRows + ' on main' : ''}`);
    if (home.minButton < 44) out.push(`${name}: smallest mode button is ${home.minButton}px (44px minimum)`);
    if (base && home.minButton < base.minButton - 4) problems.push(`${name}: mode buttons shrank to ${home.minButton}px from ${base.minButton}px`);
    if (home.pill > (base ? base.pill + 4 : 150)) out.push(`${name}: the owl's pill is ${home.pill}px tall${base ? ' vs ' + Math.round(base.pill) + 'px for Math on main' : ''}`);
    await context.close();
  }
  await browser.close();
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  if (warnings.length) console.log('LAYOUT (no --base given, so these are absolute numbers from the container\'s wide fallback fonts; compare with --base before trusting them):\n' + warnings.join('\n'));
  if (problems.length) { console.log('LAYOUT REGRESSIONS vs main:\n' + problems.join('\n')); process.exit(1); }
  console.log('screenshots in ' + outDir + (problems.length || warnings.length ? '' : ', layout ok'));
  if (errors.length) process.exit(1);
})();
