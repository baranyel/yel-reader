import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { lookupWord } from './dictionary.js';

const entry = (word) => [{
  word,
  phonetics: [{ text: '/x/' }],
  meanings: [{ partOfSpeech: 'verb', definitions: [{ definition: `to ${word}`, example: `They ${word}.` }] }],
}];

let calls;
function mockFetch(handler) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
}
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => { calls = []; });

test('falls back to the base form when the inflected form is unknown', async () => {
  mockFetch((url) => (url.endsWith('/walk') ? json(entry('walk')) : json({}, 404)));
  const r = await lookupWord('Walked', 'He walked home.', { definitionIn: 'source' });
  assert.equal(r.found, true);
  assert.equal(r.lemma, 'walk');
  assert.equal(r.definition, 'to walk');
  assert.ok(calls[0].endsWith('/walked'));
});

test('a second lookup of the same word is served from the cache without the network', async () => {
  mockFetch(() => json(entry('plan')));
  await lookupWord('plan', '', { definitionIn: 'source' });
  const before = calls.length;
  mockFetch(() => { throw new TypeError('offline'); });
  const r = await lookupWord('plan', '', { definitionIn: 'source' });
  assert.equal(before, 1);
  assert.equal(calls.length, 0);
  assert.equal(r.found, true);
});

test('unknown vs offline are reported differently', async () => {
  mockFetch(() => json({}, 404));
  const unknown = await lookupWord('zzqx', '', { definitionIn: 'source' });
  assert.equal(unknown.found, false);
  assert.equal(unknown.offline, false);

  mockFetch(() => { throw new TypeError('offline'); });
  const offline = await lookupWord('qqzz', '', { definitionIn: 'source' });
  assert.equal(offline.found, false);
  assert.equal(offline.offline, true);
});

test('native lookup translates the definition and caches the translation', async () => {
  const handler = (url) => {
    if (url.includes('dictionaryapi.dev')) return json(entry('river'));
    if (url.includes('translate.googleapis.com')) return json([[['çeviri', 'x']]]);
    return json({}, 404);
  };
  mockFetch(handler);
  const r = await lookupWord('river', '', { definitionIn: 'native', nativeLanguage: 'tr' });
  assert.equal(r.lang, 'tr');
  assert.equal(r.definition, 'çeviri');

  mockFetch(() => { throw new TypeError('offline'); });
  const again = await lookupWord('river', '', { definitionIn: 'native', nativeLanguage: 'tr' });
  assert.equal(again.definition, 'çeviri');
  assert.equal(calls.length, 0);
});
