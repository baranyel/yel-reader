import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lemmaCandidates, matchesSaved } from './lemma.js';

const has = (word, base) => assert.ok(lemmaCandidates(word).includes(base), `${word} → ${base} in ${lemmaCandidates(word)}`);

test('regular inflections', () => {
  has('ducks', 'duck');
  has('walked', 'walk');
  has('walking', 'walk');
  has('flies', 'fly');
  has('studied', 'study');
  has('watches', 'watch');
  has('making', 'make');
  has('liked', 'like');
  has('quickly', 'quick');
  has('happier', 'happy');
});

test('consonant doubling', () => {
  has('running', 'run');
  has('stopped', 'stop');
  has('bigger', 'big');
});

test('irregular forms and possessives', () => {
  has('went', 'go');
  has('children', 'child');
  has('wives', 'wife');
  has("duck's", 'duck');
});

test('never returns the word itself and respects minLen', () => {
  assert.ok(!lemmaCandidates('walk').includes('walk'));
  assert.ok(lemmaCandidates('bed').every((c) => c.length >= 3));
  assert.ok(lemmaCandidates('feed', 4).every((c) => c.length >= 4));
});

test('matchesSaved links inflections to saved words', () => {
  const saved = new Set(['walk', 'child']);
  assert.ok(matchesSaved(saved, 'walked'));
  assert.ok(matchesSaved(saved, 'children'));
  assert.ok(!matchesSaved(saved, 'talked'));
  assert.ok(!matchesSaved(new Set(['fee']), 'feed'));
});
