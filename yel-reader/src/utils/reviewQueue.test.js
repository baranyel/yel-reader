import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue, isDue, dueWithin, afterGrade, MAX_RELEARN } from './reviewQueue.js';

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const w = (word, extra) => ({ word, definition: 'd', ...extra });

test('only due words with a definition or a context sentence are reviewed', () => {
  assert.ok(isDue(w('a', { sm2_nextReview: NOW - 1 }), NOW));
  assert.ok(!isDue(w('b', { sm2_nextReview: NOW + 1 }), NOW));
  assert.ok(isDue({ word: 'c', context: 'A c here.', sm2_nextReview: NOW - 1 }, NOW));
  assert.ok(!isDue({ word: 'd', sm2_nextReview: NOW - 1 }, NOW));
});

test('queue is most-overdue first and capped', () => {
  const words = [w('new'), w('late', { sm2_nextReview: NOW - 5 * DAY }), w('fresh', { sm2_nextReview: NOW - DAY }), w('future', { sm2_nextReview: NOW + DAY })];
  assert.deepEqual(buildQueue(words, NOW), ['new', 'late', 'fresh']);
  assert.equal(buildQueue(words, NOW, 2).length, 2);
});

test('upcoming count excludes words already due', () => {
  const words = [w('a', { sm2_nextReview: NOW + DAY / 2 }), w('b', { sm2_nextReview: NOW + 3 * DAY }), w('c', { sm2_nextReview: NOW - 1 })];
  assert.equal(dueWithin(words, 1, NOW), 1);
  assert.equal(dueWithin(words, 7, NOW), 2);
});

test('a forgotten word comes back later in the session, a limited number of times', () => {
  const counts = {};
  let q = ['a', 'b'];
  q = afterGrade(q, 'a', 0, counts);
  assert.deepEqual(q, ['a', 'b', 'a']);
  for (let i = 1; i < MAX_RELEARN + 3; i++) q = afterGrade(q, 'a', 0, counts);
  assert.equal(q.filter((x) => x === 'a').length, 1 + MAX_RELEARN);
  assert.deepEqual(afterGrade(['x'], 'x', 4, {}), ['x']);
});
