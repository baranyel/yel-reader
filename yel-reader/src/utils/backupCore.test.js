import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from './backupCore.js';

const T = 'yelreader.texts.v1', W = 'yelreader.words.v1', N = 'yelreader.notes.v1';
const text = { id: 't1', title: 'A', body: 'Body.', savedAt: 1 };
const note = { id: 'n1', textId: 't1', paragraphIndex: 0, blocks: [{ id: 'b', type: 'text', content: 'hi' }] };
const good = () => ({ version: 1, storage: { [T]: [text], [W]: [{ word: 'dawn' }], [N]: { n1: note } }, images: {} });

test('accepts a well-formed backup and reports counts', () => {
  const r = validateBackup(good());
  assert.equal(r.ok, true);
  assert.deepEqual(r.counts, { texts: 1, words: 1, notes: 1 });
  assert.equal(r.skipped, 0);
});

test('rejects things that are not backups', () => {
  assert.equal(validateBackup(null).error, 'not_object');
  assert.equal(validateBackup([]).error, 'not_object');
  assert.equal(validateBackup({ version: 2, storage: {} }).error, 'version');
  assert.equal(validateBackup({ version: 1 }).error, 'no_storage');
  assert.equal(validateBackup({ version: 1, storage: {} }).error, 'nothing_usable');
});

test('drops invalid records but keeps the valid ones, and counts them', () => {
  const data = good();
  data.storage[T].push({ id: 5, title: 'bad' }, null, { id: 't2', title: 'no body' });
  data.storage[W].push({ nope: true }, { word: '  ' });
  data.storage[N].bad = { id: 'x', textId: 't1', blocks: [{ type: 'script' }] };
  const r = validateBackup(data);
  assert.deepEqual(r.counts, { texts: 1, words: 1, notes: 1 });
  assert.equal(r.skipped, 3 + 2 + 1);
});

test('ignores unknown storage keys instead of writing them', () => {
  const data = good();
  data.storage['someOtherApp.token'] = 'secret';
  data.storage['yelreader.seeded.v1'] = 'x';
  const r = validateBackup(data);
  assert.deepEqual(Object.keys(r.storage).sort(), [N, T, W].sort());
});

test('a key with the wrong type is skipped as a whole', () => {
  const data = good();
  data.storage[W] = 'not an array';
  const r = validateBackup(data);
  assert.equal(r.ok, true);
  assert.ok(!(W in r.storage));
  assert.equal(r.skipped, 1);
});

test('texts get safe defaults for missing language/savedAt', () => {
  const data = good();
  data.storage[T] = [{ id: 't', title: 'x', body: 'y' }];
  const t = validateBackup(data).storage[T][0];
  assert.equal(t.language, 'en');
  assert.equal(typeof t.savedAt, 'number');
});

test('the accent colour must be a hex colour', () => {
  const data = good();
  data.storage['yelreader.tweaks.v1'] = { accent: 'red; background:url(x)', dark: true };
  assert.deepEqual(validateBackup(data).storage['yelreader.tweaks.v1'], { dark: true });
  data.storage['yelreader.tweaks.v1'] = { accent: '#0F766E' };
  assert.equal(validateBackup(data).storage['yelreader.tweaks.v1'].accent, '#0F766E');
});

test('only image data URLs are accepted as images', () => {
  const data = good();
  data.images = { a: 'data:image/png;base64,AAAA', b: 'https://evil/x.png', c: 'data:text/html,<script>' };
  const r = validateBackup(data);
  assert.deepEqual(Object.keys(r.images), ['a']);
  assert.equal(r.skipped, 2);
});
