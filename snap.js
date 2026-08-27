// READ-ONLY. Attaches to Edge and prints what is currently on screen.
// Never clicks, types, or navigates. Safe to run at any time.
const { attach, snapshot, report } = require('./lib');

(async () => {
  const { browser, page, allPages } = await attach();
  const tabs = allPages.map((p, i) => `  [${i}] ${p.url()}`).join('\n');
  const snap = await snapshot(page);
  report(snap, `TABS  :\n${tabs}`);
  await browser.close(); // detaches only; the Edge window stays open
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
