import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, buildAnki } from './exportWords.js';

const word = { word: 'dawn', definition: 'the first light of day', context: 'He rows before dawn.', example: 'Dawn broke.', note: 'à la "aube"', sourceTitle: 'Old Man' };

test('CSV starts with a BOM, uses CRLF and doubles quotes', () => {
  const csv = buildCsv([word]);
  assert.ok(csv.startsWith('﻿"Word"'));
  assert.ok(csv.includes('\r\n'));
  assert.ok(csv.includes('"à la ""aube"""'));
});

test('CSV neutralises spreadsheet formulas', () => {
  const csv = buildCsv([{ ...word, note: '=HYPERLINK("http://evil")', definition: '+1+1', example: '@SUM(A1)' }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`));
  assert.ok(csv.includes(`"'+1+1"`));
  assert.ok(csv.includes(`"'@SUM(A1)"`));
});

test('CSV copes with missing fields and embedded newlines', () => {
  const csv = buildCsv([{ word: 'a', sourceTitle: 't', definition: 'line1\nline2' }]);
  assert.ok(csv.includes('"line1\nline2"'));
  assert.ok(csv.includes('"a","line1\nline2","","","","t"'));
});

test('Anki export is one note per line even when fields contain tabs and newlines', () => {
  const out = buildAnki([{ ...word, definition: 'a\tb\nc' }, { word: 'x', definition: 'y' }]);
  const lines = out.trim().split('\n');
  assert.deepEqual(lines.slice(0, 2), ['#separator:tab', '#html:true']);
  assert.equal(lines.length, 4);
  for (const l of lines.slice(2)) assert.equal(l.split('\t').length, 2);
});

test('Anki export escapes HTML and puts the context sentence on the card', () => {
  const out = buildAnki([{ word: 'x', definition: '<script>', context: 'A & B' }]);
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('<i>A &amp; B</i>'));
});
