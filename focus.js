// Bring the live signup tab to the foreground and focus its first text field,
// so the user can type the verification code without hunting for the window.
const { connect, pickPage } = require('./lib');

(async () => {
  const browser = await connect();
  const page = pickPage(browser);
  await page.bringToFront();
  await page.locator('input[type="text"], [role="textbox"]').first().focus().catch(() => {});
  console.log('Foregrounded: ' + (await page.title()));
  console.log('URL         : ' + page.url());
  await browser.close();
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
