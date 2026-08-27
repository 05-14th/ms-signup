// Shared: attach to the already-running Edge over CDP and pick the active tab.
const { chromium } = require('playwright-core');

const CDP = 'http://127.0.0.1:9222';

async function connect() {
  return chromium.connectOverCDP(CDP);
}

function listPages(browser) {
  let pages = [];
  for (const c of browser.contexts()) pages = pages.concat(c.pages());
  return pages.filter(p => !p.url().startsWith('devtools://') && !p.url().startsWith('about:'));
}

// Rank tabs so the live signup/checkout flow always wins over the marketing page
// we started from. Re-resolved AFTER steps run, because clicks can open new tabs.
function score(url) {
  if (/signup\.microsoft\.com|checkout|purchase|admin\.microsoft\.com|login\.microsoftonline/i.test(url)) return 3;
  if (/microsoft\.com|microsoftonline|live\.com|office\.com/i.test(url)) return 2;
  return 1;
}

function pickPage(browser) {
  const pages = listPages(browser);
  if (!pages.length) throw new Error('No open tabs found in Edge.');
  let best = pages[0], bestScore = -1;
  pages.forEach((p, i) => {
    const s = score(p.url()) * 100 + i; // later tabs break ties (newest wins)
    if (s > bestScore) { bestScore = s; best = p; }
  });
  return best;
}

async function attach() {
  const browser = await connect();
  return { browser, page: pickPage(browser), allPages: listPages(browser) };
}

// Compact, readable view of the page for deciding the next step.
async function snapshot(page, { max = 14000 } = {}) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  let aria = '';
  try {
    aria = await page.locator('body').ariaSnapshot({ timeout: 15000 });
  } catch (e) {
    aria = '(aria snapshot unavailable: ' + e.message + ')';
  }
  if (aria.length > max) aria = aria.slice(0, max) + `\n... [truncated, ${aria.length} chars total]`;
  return { url: page.url(), title: await page.title().catch(() => ''), aria };
}

function report(snap, extra) {
  console.log('URL   : ' + snap.url);
  console.log('TITLE : ' + snap.title);
  if (extra) console.log(extra);
  console.log('--- ACCESSIBILITY TREE ---');
  console.log(snap.aria);
}

module.exports = { connect, listPages, pickPage, attach, snapshot, report, CDP };
