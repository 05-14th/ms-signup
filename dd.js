// Label-aware Fluent dropdown reader/setter.
//   node dd.js "Company size"            -> list that dropdown's options (read-only)
//   node dd.js "Company size" "10 to 24" -> select that option
// State-aware (checks aria-expanded), so re-running is safe.
const { connect, pickPage } = require('./lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const comboName = process.argv[2];
  const want = process.argv[3] || null;
  if (!comboName) throw new Error('usage: node dd.js "<combobox label>" ["<option>"]');

  const browser = await connect();
  const page = pickPage(browser);
  const combo = page.getByRole('combobox', { name: comboName }).first();
  await combo.waitFor({ state: 'visible', timeout: 20000 });

  const cur = (await combo.innerText()).trim().replace(/\s+/g, ' ');
  console.log(`combobox "${comboName}" current: "${cur}"`);

  if (want && cur === want) { console.log('already set'); await browser.close(); return; }

  if ((await combo.getAttribute('aria-expanded')) !== 'true') {
    await combo.evaluate(el => el.click());
  }

  let opts = [];
  for (let i = 0; i < 25; i++) {
    await sleep(200);
    opts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="option"]'))
        .map(e => (e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
    if (opts.length) break;
  }
  if (!opts.length) throw new Error('option list never appeared');

  if (!want) {
    console.log(`OPTIONS (${opts.length}):`);
    opts.forEach(o => console.log('  - ' + o));
    await page.keyboard.press('Escape').catch(() => {});
    await browser.close();
    return;
  }

  const ok = await page.evaluate((w) => {
    const norm = e => (e.innerText || '').trim().replace(/\s+/g, ' ');
    const els = Array.from(document.querySelectorAll('[role="option"]'));
    const el = els.find(e => norm(e) === w);
    if (!el) return false;
    el.click();
    return true;
  }, want);
  if (!ok) throw new Error(`option "${want}" not found. Available: ${JSON.stringify(opts)}`);

  await sleep(2000);
  console.log(`combobox "${comboName}" now    : "${(await combo.innerText()).trim().replace(/\s+/g, ' ')}"`);
  await browser.close();
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
