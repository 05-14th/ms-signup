// Set a Fluent UI dropdown to a given option, idempotently.
// Usage: node dropdown.js "<option text>" ["<combobox match text>"]
// Checks aria-expanded instead of blind-toggling, so re-running is safe.
const { connect, pickPage, snapshot, report, readOptions, clickOption, detach, sleep } = require('./lib');

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

    const opts = await readOptions(page);
    console.log('options seen: ' + JSON.stringify(opts));
    if (!opts.length) throw new Error('option list never appeared');

    if (!await clickOption(page, want)) {
      throw new Error(`option "${want}" not among ${JSON.stringify(opts)}`);
    }
    await sleep(4000);
  }

  // Choosing a value often advances the form and unmounts the combobox, so a
  // null here is a normal outcome — reading .text off it used to throw.
  state = await pick();
  console.log(state
    ? `combobox after : "${state.text}" expanded=${state.expanded}`
    : 'combobox after : (no longer on page — the form likely advanced)');
  console.log('');
  report(await snapshot(page, { max: 3500 }));
  await detach(browser);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
