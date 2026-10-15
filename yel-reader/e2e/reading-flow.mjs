import { launchBrowser, APP } from './browser.mjs';

const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  — ' + extra : '')); };

const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\./.test(m.text())) errors.push('console: ' + m.text()); });

// Deterministic network: fake dictionary + translation, block everything else external.
const requested = [];
await page.route(/dictionaryapi\.dev/, (route) => {
  const word = decodeURIComponent(route.request().url().split('/').pop());
  requested.push(word);
  if (['zzzz'].includes(word)) return route.fulfill({ status: 404, body: '{}' });
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ word, phonetics: [], meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: `meaning of ${word}`, example: `An example with ${word}.` }] }] }]) });
});
await page.route(/translate\.googleapis\.com/, (route) => {
  const q = new URL(route.request().url()).searchParams.get('q');
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([[[`TR(${q})`, q]]]) });
});
await page.route(/datamuse\.com/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

await page.goto(APP);
await page.waitForSelector('h3');
const titles = await page.$$eval('h3', (els) => els.map((e) => e.textContent));
check('library renders the three seed texts instantly', titles.length === 3, titles.join(' | '));

// ---- Open Charlotte's Web, tokenizer + popup
await page.click('text=Charlotte');
await page.waitForSelector('.rw');
const someTok = await page.$$eval('.rw', (els) => els.map((e) => e.textContent).filter((t) => t.includes("'")));
check("quoted 'Some Pig' no longer yields tokens with quote marks", !someTok.some((t) => t.startsWith("'") || t.endsWith("'")), JSON.stringify(someTok));
await page.click('.rw:text-is("Pig")');
await page.waitForSelector('text=meaning of pig');
check('word popup shows the (mock) definition translated', true);
const popupText = await page.textContent('body');
check('translated definition is displayed (TR(...))', /TR\(meaning of pig\)/.test(popupText));

// Stale answers: tap two words quickly — final popup must belong to the second word
await page.click('.rw:text-is("Wilbur") >> nth=0');
await page.click('.rw:text-is("farm") >> nth=0');
await page.waitForTimeout(600);
const heading = await page.$$eval('div[style*="position: fixed"] span', (els) => els.map((e) => e.textContent));
check('popup ends on the last tapped word', heading.includes('farm') && !heading.includes('wilbur'), heading.slice(0, 4).join(','));

// Sentence translation inside the popup
await page.click('text=Translate sentence, text=Cümleyi çevir').catch(() => {});
await page.waitForTimeout(400);
const bodyTxt = await page.textContent('body');
check('"Translate sentence" returns a translation of the context sentence', /TR\(.*farm.*\)/i.test(bodyTxt));

// "I know it" closes the popup and is remembered
await page.click('button:has-text("Biliyorum")');
await page.waitForTimeout(200);
const known = await page.evaluate(() => JSON.parse(localStorage.getItem('yelreader.known.v1') || '{}'));
check('"Biliyorum" stores the word as known', 'farm' in known, JSON.stringify(Object.keys(known)));

// Save a word: definition + context saved
await page.click('.rw:text-is("spider") >> nth=0');
await page.waitForSelector('button:has-text("Kaydet")');
await page.click('button:has-text("Kaydet")');
await page.waitForTimeout(300);
const words = await page.evaluate(() => JSON.parse(localStorage.getItem('yelreader.words.v1')));
check('saved word keeps its context sentence and a real definition', words[0]?.word === 'spider' && /spider/i.test(words[0].context || '') && words[0].definition, JSON.stringify(words[0]?.context));
await page.keyboard.press('Escape');

// ---- Phrase selection chip
await page.evaluate(() => {
  const p = document.querySelector('p');
  const range = document.createRange();
  const spans = p.querySelectorAll('.rw');
  range.setStartBefore(spans[0]); range.setEndAfter(spans[3]);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
});
await page.waitForSelector('button:has-text("Çevir")', { timeout: 3000 }).catch(() => {});
const chip = await page.$('button:has-text("Çevir")');
check('selecting a phrase shows the Translate chip', !!chip);
if (chip) {
  await chip.click();
  await page.waitForTimeout(500);
  check('chip opens the phrase translation', /TR\(Charlotte/.test(await page.textContent('body')));
}

// ---- Scroll: no re-render of the reading body while scrolling; position is restored
await page.click('text=Kütüphane').catch(() => {});
await page.goto(APP);
await page.click('text=Neuroscience');
await page.waitForSelector('.rw');
await page.evaluate(() => { window.__mut = 0; new MutationObserver((m) => { window.__mut += m.length; }).observe(document.querySelector('.rw').closest('div[style*="padding-left"]'), { subtree: true, childList: true, attributes: true, characterData: true }); });
await page.evaluate(async () => {
  const main = document.querySelector('main');
  const max = main.scrollHeight - main.clientHeight;
  for (let i = 1; i <= 20; i++) { main.scrollTop = (max * i) / 40; await new Promise((r) => setTimeout(r, 16)); }
});
const mutations = await page.evaluate(() => window.__mut);
check('scrolling does not touch the reading body DOM', mutations === 0, `${mutations} mutations`);
await page.waitForTimeout(800);
const savedProg = await page.evaluate(() => JSON.parse(localStorage.getItem('yelreader.progress.v1') || '{}'));
const entry = Object.values(savedProg)[0];
check('scroll position is saved (~50%)', entry && Math.abs(entry.scroll - 0.5) < 0.1, JSON.stringify(entry));
await page.click('button:has-text("Kütüphane"), button:has-text("Geri")');
await page.click('text=Neuroscience');
await page.waitForSelector('.rw');
await page.waitForTimeout(300);
const restored = await page.evaluate(() => { const m = document.querySelector('main'); return m.scrollTop / (m.scrollHeight - m.clientHeight); });
check('reopening restores the scroll position', Math.abs(restored - 0.5) < 0.1, restored.toFixed(2));
check('a "continuing" banner is shown', /devam ediyorsun/.test(await page.textContent('body')));

// ---- Hints
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('yelreader.settings.v1') || '{}'); s.hintLevel = 'B1'; localStorage.setItem('yelreader.settings.v1', JSON.stringify(s)); });
await page.goto(APP);
await page.click('text=Old Man');
await page.waitForSelector('.rw.hint', { timeout: 5000 }).catch(() => {});
const hints = await page.$$eval('.rw.hint', (els) => [...new Set(els.map((e) => e.textContent.toLowerCase()))]);
check('B1 hints mark hard words but not basic ones', hints.includes('fisherman') && !hints.includes('boat') && !hints.includes('water'), hints.join(' '));

check('no uncaught errors in the console', errors.length === 0, errors.join(' || '));
await browser.close();
console.log(results.every(Boolean) ? '\nALL PASSED' : '\nSOME FAILED');
process.exit(results.every(Boolean) ? 0 : 1);
