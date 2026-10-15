import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveResume } from './resume.js';

test('no saved position starts at the top', () => {
  assert.equal(resolveResume(null, 3), null);
  assert.equal(resolveResume({ page: 0, scroll: 0.005 }, 1), null);
});

test('resumes inside a short, unpaginated text', () => {
  const r = resolveResume({ page: 0, scroll: 0.4 }, 1);
  assert.deepEqual([r.page, r.scroll], [0, 0.4]);
  assert.equal(Math.round(r.overall * 100), 40);
});

test('resumes on the saved page of a paginated text and tolerates old records without scroll', () => {
  assert.deepEqual(resolveResume({ page: 2 }, 5), { page: 2, scroll: 0, overall: 0.4 });
});

test('clamps a page that no longer exists after the text was shortened', () => {
  assert.equal(resolveResume({ page: 9, scroll: 0.5 }, 3).page, 2);
});

test('a finished text starts over', () => {
  assert.equal(resolveResume({ page: 2, scroll: 0.99 }, 3), null);
});
