// Label-aware Fluent dropdown reader/setter.
//   node dd.js "Company size"            -> list that dropdown's options (read-only)
//   node dd.js "Company size" "10 to 24" -> select that option
// State-aware (checks aria-expanded), so re-running is safe.
const { connect, pickPage, readOptions, clickOption, detach, sleep } = require('./lib');

const norm = s => s.trim().replace(/\s+/g, ' ');

(async () => {
  const comboName = process.argv[2];
  const want = process.argv[3] || null;
  if (!comboName) throw new Error('usage: node dd.js "<combobox label>" ["<option>"]');

  const browser = await connect();
  const page = pickPage(browser);
  const combo = page.getByRole('combobox', { name: comboName }).first();
  await combo.waitFor({ state: 'visible', timeout: 20000 });

  const cur = norm(await combo.innerText());
  console.log(`combobox "${comboName}" current: "${cur}"`);

  if (want && cur === want) { console.log('already set'); await detach(browser); return; }

  if ((await combo.getAttribute('aria-expanded')) !== 'true') {
    await combo.evaluate(el => el.click());
  }

  const opts = await readOptions(page);
  if (!opts.length) throw new Error('option list never appeared');

  if (!want) {
    console.log(`OPTIONS (${opts.length}):`);
    opts.forEach(o => console.log('  - ' + o));
    await page.keyboard.press('Escape').catch(() => {});
    await detach(browser);
    return;
  }

  if (!await clickOption(page, want)) {
    throw new Error(`option "${want}" not found. Available: ${JSON.stringify(opts)}`);
  }

  await sleep(2000);
  // The combobox can be unmounted by the form advancing; report that rather
  // than failing on a stale locator.
  const after = await combo.innerText().then(norm).catch(() => null);
  console.log(after === null
    ? `combobox "${comboName}" now    : (no longer on page — the form likely advanced)`
    : `combobox "${comboName}" now    : "${after}"`);
  await detach(browser);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
