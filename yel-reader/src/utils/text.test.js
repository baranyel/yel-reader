import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, cleanWord, extractSentence } from './text.js';

const words = (s) => tokenize(s).filter((t) => t.word).map((t) => t.text);

test('tokenize round-trips the paragraph', () => {
  const p = "“Don’t go,” she said — 'Some Pig' (café) 42!";
  assert.equal(tokenize(p).map((t) => t.text).join(''), p);
});

test('tokenize keeps inner apostrophes (straight and curly) in one word', () => {
  assert.deepEqual(words("Don’t stop, Charlotte's web isn't here"), ['Don’t', 'stop', 'Charlotte\'s', 'web', 'isn\'t', 'here']);
});

test('tokenize drops surrounding quotes and handles accents', () => {
  assert.deepEqual(words("'Some Pig' and a café, naïve"), ['Some', 'Pig', 'and', 'a', 'café', 'naïve']);
});

test('cleanWord normalises case, apostrophes and stray punctuation', () => {
  assert.equal(cleanWord('Don’t'), "don't");
  assert.equal(cleanWord("'Hello,'"), 'hello');
  assert.equal(cleanWord('CAFÉ'), 'café');
  assert.equal(cleanWord('123'), '');
});

test('extractSentence returns the sentence containing the whole word', () => {
  const p = 'The category was large. A cat sat down. Mr. Smith left.';
  assert.equal(extractSentence(p, 'cat'), 'A cat sat down.');
});

test('extractSentence matches curly apostrophes and falls back to the paragraph', () => {
  assert.equal(extractSentence('We can’t wait. Really.', "can't"), 'We can’t wait.');
  assert.equal(extractSentence('Nothing here.', 'zebra'), 'Nothing here.');
});
