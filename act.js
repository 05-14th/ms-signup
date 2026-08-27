// Executes a batch of steps from a JSON file, then reports the resulting page.
// Usage: node act.js steps.json
//
// Step shapes:
//   {"op":"goto",   "url":"https://..."}
//   {"op":"click",  "role":"button", "name":"Buy now", "exact":false, "nth":0}
//   {"op":"click",  "text":"Buy now", "nth":0}
//   {"op":"click",  "css":"#some-id"}
//   {"op":"fill",   "label":"Email", "value":"x@y.com"}      (or css / role+name)
//   {"op":"select", "css":"select#employees", "value":"10-24"}   (or "label":"...")
//   {"op":"press",  "key":"Enter"}
//   {"op":"wait",   "ms":2000}
//   {"op":"waitfor","text":"Verify"}          wait for text to appear
//   {"op":"waitfor","css":"#id"}
//   {"op":"scroll", "to":"bottom"}
const fs = require('fs');
const { connect, pickPage, listPages, snapshot, report } = require('./lib');

function locate(page, s) {
  let loc;
  if (s.css) loc = page.locator(s.css);
  else if (s.role) loc = page.getByRole(s.role, { name: s.name, exact: !!s.exact });
  else if (s.label) loc = page.getByLabel(s.label, { exact: !!s.exact });
  else if (s.placeholder) loc = page.getByPlaceholder(s.placeholder, { exact: !!s.exact });
  else if (s.text) loc = page.getByText(s.text, { exact: !!s.exact });
  else throw new Error('step needs one of: css, role+name, label, placeholder, text');
  if (typeof s.nth === 'number') loc = loc.nth(s.nth);
  else loc = loc.first();
  return loc;
}

(async () => {
  const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await connect();
  let page = pickPage(browser);
  const log = [];
  const T = 30000;

  for (const [i, s] of steps.entries()) {
    // Re-resolve every step: a click can spawn a new tab, and the next step
    // must target wherever the flow actually went, not where it started.
    page = pickPage(browser);
    // NB: no bringToFront() here — it steals focus and Fluent UI callouts
    // (dropdown option lists) dismiss themselves on blur.
    const tag =`[${i}] ${s.op} ${JSON.stringify({ ...s, op: undefined })}`;
    try {
      switch (s.op) {
        case 'goto':
          await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
          break;
        case 'click': {
          const loc = locate(page, s);
          await loc.scrollIntoViewIfNeeded({ timeout: T }).catch(() => {});
          await loc.click({ timeout: T });
          break;
        }
        case 'fill': {
          const loc = locate(page, s);
          await loc.scrollIntoViewIfNeeded({ timeout: T }).catch(() => {});
          await loc.fill(String(s.value), { timeout: T });
          break;
        }
        case 'select': {
          const loc = locate(page, s);
          await loc.selectOption(s.byLabel ? { label: String(s.value) } : String(s.value), { timeout: T });
          break;
        }
        case 'jsclick': {
          // Native in-page .click() — for portal/callout widgets whose
          // actionability checks fight with focus handling.
          const hit = await page.evaluate(({ sel, text }) => {
            const els = Array.from(document.querySelectorAll(sel));
            const norm = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ');
            const t = els.find(e => norm(e) === text) || els.find(e => norm(e).includes(text));
            if (!t) return { ok: false, seen: els.map(norm).slice(0, 20) };
            t.click();
            return { ok: true };
          }, { sel: s.css || '[role="option"]', text: s.text });
          if (!hit.ok) throw new Error(`jsclick: no "${s.text}" in ${s.css || '[role="option"]'}; saw: ${JSON.stringify(hit.seen)}`);
          break;
        }
        case 'press':
          await page.keyboard.press(s.key);
          break;
        case 'wait':
          await page.waitForTimeout(s.ms || 1000);
          break;
        case 'waitfor':
          if (s.css) await page.locator(s.css).first().waitFor({ state: 'visible', timeout: s.timeout || T });
          else await page.getByText(s.text).first().waitFor({ state: 'visible', timeout: s.timeout || T });
          break;
        case 'scroll':
          await page.evaluate(to => window.scrollTo(0, to === 'bottom' ? document.body.scrollHeight : 0), s.to || 'bottom');
          break;
        default:
          throw new Error('unknown op: ' + s.op);
      }
      log.push('OK   ' + tag);
    } catch (e) {
      log.push('FAIL ' + tag + '\n       -> ' + e.message.split('\n')[0]);
      break; // stop on first failure; never blunder onward through a checkout flow
    }
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  }

  page = pickPage(browser);
  const tabs = listPages(browser).map((p, i) => `  [${i}] ${p.url()}`).join('\n');
  const snap = await snapshot(page);
  report(snap, 'STEPS :\n' + log.map(l => '  ' + l).join('\n') + '\nTABS  :\n' + tabs);
  await browser.close();
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
