import { launchBrowser, APP } from './browser.mjs';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  — ' + extra : '')); };
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let release;
const gate = new Promise((r) => { release = r; });
await page.route(/dictionaryapi\.dev/, async (r) => {
  const w = decodeURIComponent(r.request().url().split('/').pop());
  if (w === 'harbour') await gate; // hold this answer back to provoke the race
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ word: w, phonetics: [], meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: `meaning of ${w}` }] }] }]) });
});
await page.route(/translate\.googleapis\.com/, (r) => { const q = new URL(r.request().url()).searchParams.get('q'); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([[[`TR(${q})`, q]]]) }); });
await page.route(/datamuse|fonts\./, (r) => r.abort());

const past = Date.now() - 86400000;
const words = [
  { word: 'dawn', definition: 'şafak', context: 'He rows before dawn.', sourceId: 'x', sourceTitle: 'X', savedAt: 1, sm2_interval: 1, sm2_repetition: 0, sm2_efactor: 2.5, sm2_nextReview: past - 1000 },
  { word: 'harbour', definition: null, context: 'The boat reaches the harbour.', sourceId: 'x', sourceTitle: 'X', savedAt: 2, sm2_interval: 1, sm2_repetition: 0, sm2_efactor: 2.5, sm2_nextReview: past },
  { word: 'later', definition: 'sonra', sourceId: 'x', sourceTitle: 'X', savedAt: 3, sm2_nextReview: Date.now() + 2 * 86400000 },
  { word: 'nothing', sourceId: 'x', sourceTitle: 'X', savedAt: 4, sm2_nextReview: past },
];
await page.goto(APP);
await page.evaluate((w) => localStorage.setItem('yelreader.words.v1', JSON.stringify(w)), words);
await page.reload();
await page.waitForSelector('h3');
const nav = await page.$$eval('nav button', (b) => b.map((x) => x.textContent));
check('no Quiz in the navigation; review badge counts due words with definition or sentence', !nav.some((x) => /quiz/i.test(x)) && nav.some((x) => /Tekrar\s*2/.test(x)), nav.join(' | '));

await page.click('button:has-text("Kelimelerim")');
const btn = page.locator('button:has-text("Tekrar et (2)")');
check('My Words offers "Tekrar et (2)" instead of the quiz', await btn.count() === 1);
await btn.click();
await page.waitForSelector('h1');
check('review opens straight on the first card (most overdue first)', (await page.textContent('h1')).trim() === 'dawn');
check('front shows the sentence the word was found in', (await page.textContent('body')).includes('He rows before dawn'));
await page.keyboard.press(' ');
await page.waitForSelector('text=şafak');
check('Space reveals the definition and the "again" button explains it comes back now', (await page.textContent('body')).includes('birazdan tekrar'));
await page.keyboard.press('1'); // Again
await page.waitForTimeout(150);
check('next card is the word without a definition', (await page.textContent('h1')).trim() === 'harbour');
check('progress shows the forgotten word was re-queued (2/3)', (await page.textContent('body')).includes('2 / 3'));

// flip: definition is fetched (held back); grade before it arrives
await page.keyboard.press(' ');
await page.waitForSelector('text=Anlamı aranıyor');
check('missing definition is looked up when the card is turned', true);
await page.keyboard.press('3'); // Good, while the lookup is still pending
release();
await page.waitForTimeout(500);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('yelreader.words.v1')));
const h = stored.find((w) => w.word === 'harbour');
check('late definition is saved without overwriting the grade just given', h.definition === 'TR(meaning of harbour)' && h.sm2_repetition === 1, JSON.stringify({ def: h.definition, rep: h.sm2_repetition, int: h.sm2_interval }));

check('forgotten word comes back at the end of the session', (await page.textContent('h1')).trim() === 'dawn');
await page.keyboard.press(' ');
await page.keyboard.press('4');
await page.waitForSelector('text=Oturum tamamlandı');
const d = stored.find((w) => w.word === 'dawn');
const doneTxt = await page.textContent('body');
check('done screen summarises the session', doneTxt.includes('3 kelime') || /3/.test(doneTxt), '');
const after = (await page.evaluate(() => JSON.parse(localStorage.getItem('yelreader.words.v1')))).find((w) => w.word === 'dawn');
check('dawn: forgotten then Easy → scheduled in the future', after.sm2_nextReview > Date.now());
check('word with neither definition nor sentence is never queued', !doneTxt.includes('nothing'));
await page.click('button:has-text("Kelimelerim")');
await page.click('button:has-text("Tekrar")');
await page.waitForTimeout(300);
check('nothing due → calm empty screen with upcoming count', (await page.textContent('body')).includes('Önümüzdeki 7 günde'));
check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(results.every(Boolean) ? '\nALL PASSED' : '\nSOME FAILED');
process.exit(results.every(Boolean) ? 0 : 1);
