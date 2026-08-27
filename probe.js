// READ-ONLY diagnostic: dump candidate dropdown options / portal content.
// Usage: node probe.js "<css selector>"   (default: common dropdown option shapes)
const { connect, pickPage } = require('./lib');

const DEFAULT = '[role="option"], [role="listbox"], [role="menuitem"], [class*="allout"], [class*="ropdown"] li, [class*="ropdown"] button';

(async () => {
  const sel = process.argv[2] || DEFAULT;
  const browser = await connect();
  const page = pickPage(browser);

  const combo = await page.evaluate(() => {
    const c = document.querySelector('[role="combobox"]');
    if (!c) return null;
    return {
      id: c.id, tag: c.tagName, cls: c.className,
      expanded: c.getAttribute('aria-expanded'),
      controls: c.getAttribute('aria-controls'),
      owns: c.getAttribute('aria-owns'),
      activedesc: c.getAttribute('aria-activedescendant'),
      text: (c.innerText || '').trim().slice(0, 80),
    };
  });
  console.log('COMBOBOX: ' + JSON.stringify(combo, null, 2));

  const hits = await page.evaluate((s) => {
    const out = [];
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      if (!txt) continue;
      out.push({
        tag: el.tagName, role: el.getAttribute('role'), id: el.id,
        cls: String(el.className).slice(0, 70),
        visible: r.width > 0 && r.height > 0,
        box: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        text: txt,
      });
    }
    return out.slice(0, 40);
  }, sel);

  console.log('\nMATCHES for: ' + sel);
  if (!hits.length) console.log('  (none)');
  for (const h of hits) {
    console.log(`  <${h.tag}> role=${h.role} id=${h.id || '-'} vis=${h.visible} ${h.box}\n      cls: ${h.cls}\n      txt: ${h.text}`);
  }
  await browser.close();
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
