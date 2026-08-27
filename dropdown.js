// Set a Fluent UI dropdown to a given option, idempotently.
// Usage: node dropdown.js "<option text>" ["<combobox match text>"]
// Checks aria-expanded instead of blind-toggling, so re-running is safe.
const { connect, pickPage, snapshot, report } = require('./lib');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const want = process.argv[2];
  const comboMatch = process.argv[3] || null;
  if (!want) throw new Error('usage: node dropdown.js "<option text>" ["<combobox text>"]');

  const browser = await connect();
  const page = pickPage(browser);

  const pick = () => page.evaluate((m) => {
    const combos = Array.from(document.querySelectorAll('[role="combobox"]'));
    const c = m ? combos.find(x => (x.innerText || '').includes(m)) || combos[0] : combos[0];
    if (!c) return null;
    return { expanded: c.getAttribute('aria-expanded') === 'true', text: (c.innerText || '').trim() };
  }, comboMatch);

  let state = await pick();
  if (!state) throw new Error('no [role="combobox"] on page');
  console.log(`combobox before: "${state.text}" expanded=${state.expanded}`);

  if (state.text === want) {
    console.log(`already set to "${want}" — nothing to do`);
  } else {
    if (!state.expanded) {
      await page.evaluate((m) => {
        const combos = Array.from(document.querySelectorAll('[role="combobox"]'));
        const c = m ? combos.find(x => (x.innerText || '').includes(m)) || combos[0] : combos[0];
        c.click();
      }, comboMatch);
    }

    // Poll for the portal-rendered option list.
    let opts = [];
    for (let i = 0; i < 25; i++) {
      await sleep(200);
      opts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="option"]'))
          .map(e => (e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
      if (opts.length) break;
    }
    console.log('options seen: ' + JSON.stringify(opts));
    if (!opts.length) throw new Error('option list never appeared');

    const clicked = await page.evaluate((w) => {
      const el = Array.from(document.querySelectorAll('[role="option"]'))
        .find(e => (e.innerText || '').trim().replace(/\s+/g, ' ') === w);
      if (!el) return false;
      el.click();
      return true;
    }, want);
    if (!clicked) throw new Error(`option "${want}" not among ${JSON.stringify(opts)}`);
    await sleep(4000);
  }

  state = await pick();
  console.log(`combobox after : "${state.text}" expanded=${state.expanded}`);
  console.log('');
  report(await snapshot(page, { max: 3500 }));
  await browser.close();
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
