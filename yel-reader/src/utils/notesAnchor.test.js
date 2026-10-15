import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reanchorNotes, splitParagraphs, ANCHOR_LENGTH } from './notesAnchor.js';

const body = [
  'The old fisherman rows his small boat far out into the Gulf Stream before dawn.',
  'After a long time, something very large pulls on one of his lines.',
  'He cannot see what it is, but he knows from the weight that it is a great fish.',
].join('\n\n');

const noteFor = (idx, text = body, extra = {}) => ({
  id: 'n' + idx, textId: 't1', paragraphIndex: idx,
  paragraphPreview: splitParagraphs(text)[idx].slice(0, ANCHOR_LENGTH), blocks: [], ...extra,
});

test('unchanged body returns the same object', () => {
  const notes = { n1: noteFor(1) };
  assert.equal(reanchorNotes(notes, 't1', body, body), notes);
});

test('a paragraph inserted above shifts the note down with its paragraph', () => {
  const edited = 'A brand new opening paragraph.\n\n' + body;
  const out = reanchorNotes({ n1: noteFor(1) }, 't1', body, edited);
  assert.equal(out.n1.paragraphIndex, 2);
});

test('removing an earlier paragraph shifts the note up', () => {
  const edited = splitParagraphs(body).slice(1).join('\n\n');
  const out = reanchorNotes({ n2: noteFor(2) }, 't1', body, edited);
  assert.equal(out.n2.paragraphIndex, 1);
});

test('a lightly reworded paragraph is still found and its anchor refreshed', () => {
  const edited = body.replace('something very large pulls on', 'something very heavy pulls at');
  const out = reanchorNotes({ n1: noteFor(1) }, 't1', body, edited);
  assert.equal(out.n1.paragraphIndex, 1);
  assert.match(out.n1.paragraphPreview, /heavy/);
});

test('text added in front of a paragraph is tolerated', () => {
  const edited = body.replace('After a long time', 'Hours passed. After a long time');
  assert.equal(reanchorNotes({ n1: noteFor(1) }, 't1', body, edited).n1.paragraphIndex, 1);
});

test('a deleted paragraph orphans the note but keeps it', () => {
  const edited = splitParagraphs(body).filter((_, i) => i !== 1).join('\n\n');
  const out = reanchorNotes({ n1: noteFor(1) }, 't1', body, edited);
  assert.equal(out.n1.paragraphIndex, null);
  assert.equal(out.n1.id, 'n1');
});

test('an orphaned note re-attaches when its paragraph comes back', () => {
  const without = splitParagraphs(body).filter((_, i) => i !== 1).join('\n\n');
  const orphaned = reanchorNotes({ n1: noteFor(1) }, 't1', body, without);
  const restored = reanchorNotes(orphaned, 't1', without, body);
  assert.equal(restored.n1.paragraphIndex, 1);
});

test('identical repeated paragraphs resolve to the one nearest the old position', () => {
  const para = 'Same words repeated in the text, over and over again, for testing purposes only.';
  const text = [para, 'Something else entirely, with different content here.', para].join('\n\n');
  const note = { id: 'n', textId: 't1', paragraphIndex: 2, paragraphPreview: para, blocks: [] };
  const edited = 'New first paragraph here.\n\n' + text;
  assert.equal(reanchorNotes({ n: note }, 't1', text, edited).n.paragraphIndex, 3);
});

test('notes of other texts are untouched', () => {
  const other = { ...noteFor(1), id: 'x', textId: 't2' };
  const out = reanchorNotes({ x: other }, 't1', body, 'Completely different body.');
  assert.equal(out.x, other);
});
