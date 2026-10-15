// Shared setup for the browser tests. Uses the locally installed Google Chrome
// (or CHROME_PATH), so no browser download is needed.
import { chromium } from 'playwright-core';

export const APP = process.env.APP_URL || 'http://localhost:4173/yel-reader/';

export function launchBrowser() {
  const options = { args: ['--no-sandbox'] };
  if (process.env.CHROME_PATH) options.executablePath = process.env.CHROME_PATH;
  else options.channel = 'chrome';
  return chromium.launch(options);
}
