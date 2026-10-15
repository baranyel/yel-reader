import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRanks, rankOf, HINT_LEVELS } from './wordRankCore.js';

const ranks = parseRanks(readFileSync(new URL('../data/wordRank.txt', import.meta.url), 'utf8'));

test('ranks follow list order', () => {
  assert.equal(ranks.get('the'), 1);
  assert.ok(ranks.get('house') < ranks.get('hippocampus') || !ranks.has('hippocampus'));
});

test('inflections take the rank of their base form', () => {
  assert.ok(rankOf(ranks, 'walked') <= HINT_LEVELS.A2);
  assert.ok(rankOf(ranks, 'ducks') < Infinity);
});

test('contractions and possessives are not flagged as rare', () => {
  assert.equal(rankOf(ranks, "don't"), 1);
  assert.ok(rankOf(ranks, "charlotte's") === rankOf(ranks, 'charlotte'));
});

test('rare words rank above the highest cap', () => {
  assert.ok(rankOf(ranks, 'reconsolidation') > HINT_LEVELS.B2);
  assert.ok(rankOf(ranks, 'ubiquitous') > HINT_LEVELS.B1);
});
