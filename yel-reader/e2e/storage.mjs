import { launchBrowser, APP } from './browser.mjs';
import fs from 'node:fs';

const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  — ' + extra : '')); };

const browser = await launchBrowser();
const newPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.route(/dictionaryapi\.dev|translate\.googleapis|datamuse|fonts\./, (r) => r.abort());
  return page;
};
// helpers reading storage straight from the browser
const ls = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
const idbAll = (page, db, store) => page.evaluate(async ([db, store]) => {
  // Never create a database just by looking at it.
  if (!(await indexedDB.databases()).some((d) => d.name === db)) return [];
  return new Promise((res) => {
    const r = indexedDB.open(db); r.onerror = () => res([]);
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) return res([]);
      const q = d.transaction(store).objectStore(store).getAllKeys(); q.onsuccess = () => res(q.result); };
  });
}, [db, store]);

// ============ 1. First run + legacy migration ============
let page = await newPage();
await page.goto(APP);
await page.waitForSelector('h3');
check('first run shows the 3 sample texts', (await page.$$('h3')).length === 3);
check('texts are in IndexedDB, not localStorage', (await idbAll(page, 'yelreader-data', 'texts')).length === 3 && (await ls(page, 'yelreader.texts.v1')) === null);

// legacy data written by the old version
const legacy = [{ id: 'old1', title: 'Legacy text', body: 'An old paragraph.\n\nAnother old paragraph.', savedAt: 5 }];
await page.evaluate((l) => { localStorage.setItem('yelreader.texts.v1', JSON.stringify(l)); }, legacy);
await page.reload();
await page.waitForSelector('h3');
const titles = await page.$$eval('h3', (e) => e.map((x) => x.textContent));
check('legacy localStorage texts are migrated and shown', titles.includes('Legacy text'), titles.join(' | '));
check('legacy localStorage key is removed after migration', (await ls(page, 'yelreader.texts.v1')) === null);
await page.reload();
await page.waitForSelector('h3');
check('migrated text survives another reload', (await page.$$eval('h3', (e) => e.map((x) => x.textContent))).includes('Legacy text'));

// ============ 2. Large text ============
await page.click('text=Yeni Metin');
await page.fill('input[placeholder^="Başlık"], input[maxlength="120"]', 'Big book');
const big = ('Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(40) + '\n\n').repeat(1800); // ≈ 4.3 MB
await page.evaluate((text) => { const ta = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, text); ta.dispatchEvent(new Event('input', { bubbles: true })); }, big);
await page.click('button:has-text("Kaydet")');
await page.waitForSelector('text=Big book');
await page.waitForTimeout(500);
const stored = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('yelreader-data'); r.onsuccess = () => { const q = r.result.transaction('texts').objectStore('texts').getAll(); q.onsuccess = () => res(q.result.find((t) => t.title === 'Big book')?.body.length || 0); }; }));
check('a 4 MB text is stored (would exceed the localStorage quota)', stored > 4_000_000, `${(stored / 1e6).toFixed(1)} MB`);
check('no storage error toast for the big text', !(await page.textContent('body')).includes('depolaması dolu'));

// ============ 3. Storage-full warning ============
await page.evaluate(() => {
  const orig = Storage.prototype.setItem;
  window.__origSetItem = orig;
  Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('yelreader.words')) throw new DOMException('full', 'QuotaExceededError'); return orig.call(this, k, v); };
});
await page.goto(APP); // fresh page object state but patch again after load
await page.waitForSelector('h3');
await page.evaluate(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('yelreader.known')) throw new DOMException('full', 'QuotaExceededError'); return orig.call(this, k, v); };
});
await page.click('text=Legacy text');
await page.waitForSelector('.rw');
await page.click('.rw >> nth=1');
await page.waitForSelector('button:has-text("Biliyorum")', { timeout: 15000 });
await page.click('button:has-text("Biliyorum")');
await page.waitForSelector('text=depolaması dolu', { timeout: 3000 }).catch(() => {});
check('a failed localStorage write shows a visible warning', (await page.textContent('body')).includes('depolaması dolu'));
await page.context().close();

// ============ 4. Notes: anchoring, images, cascade delete ============
page = await newPage();
await page.goto(APP);
await page.waitForSelector('h3');
// custom text with three paragraphs
await page.click('text=Yeni Metin');
await page.fill('input[maxlength="120"]', 'Anchor test');
const paras = ['First paragraph about the sea and its many moods in winter.', 'Second paragraph about boats that wait quietly in the harbour tonight.', 'Third paragraph about the long road home after a very tiring day.'];
await page.fill('textarea', paras.join('\n\n'));
await page.click('button:has-text("Kaydet")');
await page.waitForSelector('.rw');

// big PNG for the image upload
const pngB64 = await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 3200; c.height = 2400; const g = c.getContext('2d'); for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${i * 7},70%,50%)`; g.fillRect((i * 37) % 3200, (i * 91) % 2400, 300, 200); } const b = await new Promise((r) => c.toBlob(r, 'image/png')); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const x of buf) s += String.fromCharCode(x); return btoa(s); });
const png = Buffer.from(pngB64, 'base64');

// note on paragraph 2 (index 1) with an image
await page.locator('p', { hasText: 'Second paragraph' }).click({ button: 'right' });
await page.click('button:has-text("Not Al")');
await page.fill('textarea[placeholder^="Notunu"]', 'Remember the harbour.');
await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'big.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('img');
check('nothing is written to the image store before Save', (await idbAll(page, 'yelreader-images', 'images')).length === 0);
await page.click('button:has-text("Notu Kaydet")');
await page.waitForTimeout(600);
let imgKeys = await idbAll(page, 'yelreader-images', 'images');
check('image is stored after Save', imgKeys.length === 1, `keys=${JSON.stringify(imgKeys)} errors=${page.errors.join('|')} notes=${(await page.evaluate(() => localStorage.getItem('yelreader.notes.v1')) || '').slice(0, 120)}`);
const imgSize = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('yelreader-images'); r.onsuccess = () => { const q = r.result.transaction('images').objectStore('images').getAll(); q.onsuccess = () => res(q.result[0].length); }; }));
const dims = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('yelreader-images'); r.onsuccess = () => { const q = r.result.transaction('images').objectStore('images').getAll(); q.onsuccess = () => { const i = new Image(); i.onload = () => res([i.width, i.height]); i.src = q.result[0]; }; }; }));
check('large photo (3200×2400) was downscaled to max 1600px before storing', Math.max(...dims) === 1600, `${dims.join('×')}, ${Math.round(imgSize / 1024)} KB`);

// Cancel-after-delete must NOT lose the image
await page.locator('p', { hasText: 'Second paragraph' }).click({ button: 'right' });
await page.click('button:has-text("Notu Düzenle")');
await page.waitForSelector('img');
await page.locator('img').locator('xpath=..').locator('button').click(); // remove the image block
await page.click('button:has-text("İptal")');
await page.waitForTimeout(400);
check('deleting an image in the editor and cancelling keeps it', (await idbAll(page, 'yelreader-images', 'images')).length === 1);
// and removing + saving really deletes it
await page.locator('p', { hasText: 'Second paragraph' }).click({ button: 'right' });
await page.click('button:has-text("Notu Düzenle")');
await page.waitForSelector('img');
await page.locator('img').locator('xpath=..').locator('button').click();
await page.click('button:has-text("Notu Kaydet")');
await page.waitForTimeout(500);
check('removing an image and saving deletes it from the store', (await idbAll(page, 'yelreader-images', 'images')).length === 0);

// re-add an image so the cascade test has one
await page.locator('p', { hasText: 'Second paragraph' }).click({ button: 'right' });
await page.click('button:has-text("Notu Düzenle")');
await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'a.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('img');
await page.click('button:has-text("Notu Kaydet")');
await page.waitForTimeout(500);

// ---- edit the text: insert a paragraph above → note must follow its paragraph
await page.click('button:has-text("Kütüphane")');
await page.waitForSelector('h3');
const card = page.locator('h3', { hasText: 'Anchor test' }).locator('xpath=..');
await card.hover();
await card.locator('button[title="Düzenle"]').click();
await page.fill('textarea', ['A new opening paragraph, added later by the reader of this text.', ...paras].join('\n\n'));
await page.click('button:has-text("Değişiklikleri Kaydet"), button:has-text("Kaydet")');
await page.waitForSelector('.rw');
const notes = await ls(page, 'yelreader.notes.v1');
const note = Object.values(notes)[0];
check('note follows its paragraph after the text is edited', note.paragraphIndex === 2, `paragraphIndex=${note.paragraphIndex}`);
check('note marker is drawn on the right paragraph', await page.locator('p', { hasText: 'Second paragraph' }).locator('svg').count() > 0);

// ---- edit again: remove that paragraph → note becomes orphaned but is kept
await page.click('button:has-text("Kütüphane")');
await page.waitForSelector('h3');
const card2 = page.locator('h3', { hasText: 'Anchor test' }).locator('xpath=..');
await card2.hover();
await card2.locator('button[title="Düzenle"]').click();
await page.fill('textarea', ['A new opening paragraph, added later by the reader of this text.', paras[0], paras[2]].join('\n\n'));
await page.click('button:has-text("Değişiklikleri Kaydet"), button:has-text("Kaydet")');
await page.waitForSelector('.rw');
const note2 = Object.values(await ls(page, 'yelreader.notes.v1'))[0];
check('note of a removed paragraph is kept and marked orphaned', note2 && note2.paragraphIndex === null);
await page.click('button:has-text("Notlar")');
check('Notes page explains the orphaned note', (await page.textContent('body')).includes('paragraf metinden kaldırılmış'));

// ---- save a word from this text, then delete the text
await page.click('button:has-text("Kütüphane")');
await page.waitForSelector('h3');
await page.evaluate(() => localStorage.setItem('yelreader.words.v1', JSON.stringify([{ word: 'harbour', sourceId: JSON.parse(localStorage.getItem('yelreader.notes.v1'))[Object.keys(JSON.parse(localStorage.getItem('yelreader.notes.v1')))[0]].textId, sourceTitle: 'Anchor test', savedAt: Date.now(), definition: 'a port', sm2_interval: 1 }])));
const card3 = page.locator('h3', { hasText: 'Anchor test' }).locator('xpath=..');
await card3.hover();
await card3.locator('button[title="Metni sil"]').click();
await card3.locator('button[title="Onayla: metni sil"]').click();
await page.waitForTimeout(600);
check('deleting a text deletes its notes', Object.keys((await ls(page, 'yelreader.notes.v1')) || {}).length === 0);
check('deleting a text deletes its note images', (await idbAll(page, 'yelreader-images', 'images')).length === 0);
check('toast mentions the deleted note', (await page.textContent('body')).includes('notu silindi'));
check('saved words are kept', (await ls(page, 'yelreader.words.v1')).length === 1);
await page.reload();
await page.waitForSelector('h3');
await page.click('button:has-text("Kelimelerim")');
check('word list marks its source text as deleted', (await page.locator('button[disabled]:has-text("Anchor test")').count()) === 1);

// ============ 5. Export / import ============
await page.click('button:has-text("Ayarlar")');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Dışa Aktar")')]);
const file = await dl.path();
const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
check('backup contains texts from IndexedDB', Array.isArray(backup.storage['yelreader.texts.v1']) && backup.storage['yelreader.texts.v1'].length >= 3, `${backup.storage['yelreader.texts.v1']?.length} texts`);
check('backup contains the saved words', backup.storage['yelreader.words.v1']?.length === 1);

const badFile = (name, content) => ({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
page.on('dialog', (d) => d.accept());
await page.setInputFiles('input[type=file][accept=".json"]', badFile('x.json', '{"hello": 1}'));
await page.waitForSelector('[role=status]');
check('importing a file that is not a backup is rejected with a message', /Dosya okunamadı|farklı bir sürüm/.test(await page.textContent('[role=status]')));
const before = (await idbAll(page, 'yelreader-data', 'texts')).length;
await page.setInputFiles('input[type=file][accept=".json"]', badFile('e.json', JSON.stringify({ version: 1, storage: { 'yelreader.texts.v1': 'oops' } })));
await page.waitForTimeout(500);
check('rejected import leaves the data untouched', (await idbAll(page, 'yelreader-data', 'texts')).length === before);
const evil = { version: 1, storage: { 'yelreader.texts.v1': [{ id: 'i1', title: 'Imported', body: 'Imported body text.' }, { id: 9 }], 'attacker.key': 'x', 'yelreader.tweaks.v1': { accent: 'red;x' } } };
await page.setInputFiles('input[type=file][accept=".json"]', badFile('ok.json', JSON.stringify(evil)));
await page.waitForSelector('text=içe aktarıldı');
check('import summary reports skipped invalid entries', (await page.textContent('[role=status]')).includes('1 geçersiz'));
await page.waitForLoadState('load');
await page.waitForSelector('h3');
check('valid import replaces the data', (await page.$$eval('h3', (e) => e.map((x) => x.textContent))).join() === 'Imported');
check('unknown keys in a backup are not written', (await page.evaluate(() => localStorage.getItem('attacker.key'))) === null);
check('no uncaught page errors so far', page.errors.length === 0, page.errors.join(' | '));
await page.context().close();

// ============ 6. Error boundary ============
page = await newPage();
await page.goto(APP);
await page.waitForSelector('h3');
await page.evaluate(() => localStorage.setItem('yelreader.words.v1', JSON.stringify([{ word: 'boom', sourceId: 'x', sourceTitle: { not: 'a string' }, savedAt: 1, definition: 'd' }])));
await page.reload();
await page.waitForSelector('h3');
page.on('console', () => {});
await page.click('button:has-text("Kelimelerim")');
await page.waitForSelector('text=Bir şeyler ters gitti', { timeout: 5000 }).catch(() => {});
check('a render crash shows the recovery screen instead of a blank page', (await page.textContent('body')).includes('Bir şeyler ters gitti'));
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Yedek indir")')]);
const b2 = JSON.parse(fs.readFileSync(await dl2.path(), 'utf8'));
check('recovery screen can still export the user\'s data', b2.storage['yelreader.texts.v1'].length === 3 && b2.storage['yelreader.words.v1'].length === 1);
page.once('dialog', (d) => d.accept());
await Promise.all([page.waitForNavigation(), page.click('button:has-text("Tüm verileri sil")')]);
await page.waitForSelector('h3');
check('reset erases everything and the app starts clean', (await page.$$('h3')).length === 3 && (await ls(page, 'yelreader.words.v1')) === null);

await browser.close();
console.log(results.every(Boolean) ? '\nALL PASSED' : '\nSOME FAILED');
process.exit(results.every(Boolean) ? 0 : 1);
