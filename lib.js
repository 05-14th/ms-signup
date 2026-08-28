// Shared: attach to the already-running Edge over CDP and pick the active tab.
const { chromium } = require('playwright-core');

const CDP = process.env.MS_SIGNUP_CDP || 'http://127.0.0.1:9222';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect() {
  try {
    return await chromium.connectOverCDP(CDP);
  } catch (e) {
    // First line only — Playwright appends a multi-line call log that buries the cause.
    throw new Error(
      `could not attach to Edge at ${CDP} (${e.message.split('\n')[0]})\n` +
      '       start Edge with: Start-Process msedge "--remote-debugging-port=9222"');
  }
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

// Highest score wins, ties break toward the newest tab. Compared pairwise so the
// tab count cannot bleed into the score band, as `score * 100 + i` did past 100 tabs.
function pickFrom(pages) {
  if (!pages.length) throw new Error('No open tabs found in Edge.');
  let best = pages[0], bestScore = score(pages[0].url());
  for (let i = 1; i < pages.length; i++) {
    const s = score(pages[i].url());
    if (s >= bestScore) { best = pages[i]; bestScore = s; }
  }
  return best;
}

function pickPage(browser) {
  return pickFrom(listPages(browser));
}

async function attach() {
  const browser = await connect();
  const allPages = listPages(browser); // walk the tab list once, then reuse it
  return { browser, page: pickFrom(allPages), allPages };
}

// Compact, readable view of the page for deciding the next step.
// A failed snapshot lands in `error`, never in `aria` — a caller reading the
// report must not mistake an error string for page content.
async function snapshot(page, { max = 14000 } = {}) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const snap = { url: page.url(), title: await page.title().catch(() => ''), aria: '', error: null };
  try {
    snap.aria = await page.locator('body').ariaSnapshot({ timeout: 15000 });
  } catch (e) {
    snap.error = e.message;
    return snap;
  }
  if (snap.aria.length > max) {
    snap.truncated = snap.aria.length;
    snap.aria = snap.aria.slice(0, max) + `\n... [truncated, ${snap.truncated} chars total]`;
  }
  return snap;
}

function report(snap, extra) {
  console.log('URL   : ' + snap.url);
  console.log('TITLE : ' + snap.title);
  if (extra) console.log(extra);
  if (snap.error) {
    console.log('--- ACCESSIBILITY TREE UNAVAILABLE ---');
    console.log(snap.error);
    return;
  }
  console.log('--- ACCESSIBILITY TREE ---');
  console.log(snap.aria);
}

// Fluent UI renders option lists into a portal that mounts asynchronously, so
// options are polled for rather than awaited on a locator. Shared by dd/dropdown.
async function readOptions(page, { tries = 25, interval = 200 } = {}) {
  let opts = [];
  for (let i = 0; i < tries; i++) {
    await sleep(interval);
    opts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="option"]'))
        .map(e => (e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
    if (opts.length) break;
  }
  return opts;
}

// Exact text match first, then a contains fallback for options that carry
// trailing badges ("10 to 24  Most popular").
async function clickOption(page, want) {
  return page.evaluate((w) => {
    const norm = e => (e.innerText || '').trim().replace(/\s+/g, ' ');
    const els = Array.from(document.querySelectorAll('[role="option"]'));
    const el = els.find(e => norm(e) === w) || els.find(e => norm(e).includes(w));
    if (!el) return false;
    el.click();
    return true;
  }, want);
}

// Drops the CDP connection only; the Edge window stays open.
async function detach(browser) {
  await browser.close().catch(() => {});
}

module.exports = {
  connect, listPages, pickFrom, pickPage, attach, snapshot, report,
  readOptions, clickOption, detach, sleep, CDP,
};
