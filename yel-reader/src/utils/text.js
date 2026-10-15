// Text helpers shared by the reader and the dictionary. Pure functions only.

// A word is a run of letters (any script) that may contain inner apostrophes:
// don't, don’t, Charlotte's, café. Surrounding quotes are not part of the word.
const WORD_RE = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;

// Split a paragraph into [{ text, word }] segments, in order, so that
// joining all `text` values gives the original paragraph back.
export function tokenize(paragraph) {
  const out = [];
  let last = 0;
  for (const m of paragraph.matchAll(WORD_RE)) {
    if (m.index > last) out.push({ text: paragraph.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < paragraph.length) out.push({ text: paragraph.slice(last), word: false });
  return out;
}

// Canonical lookup/storage form: lower-case, straight apostrophe, no stray punctuation.
export function cleanWord(word) {
  return (word || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\p{L}\p{M}']/gu, '')
    .replace(/^'+|'+$/g, '');
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('en', { granularity: 'sentence' })
  : null;

function splitSentences(text) {
  if (segmenter) return [...segmenter.segment(text)].map((s) => s.segment);
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The sentence of `paragraph` that contains `word` as a whole word.
export function extractSentence(paragraph, word) {
  const w = cleanWord(word);
  if (!w) return paragraph.trim().slice(0, 300);
  const pattern = escapeRe(w).replace(/'/g, "['’]");
  const re = new RegExp(`(?<![\\p{L}\\p{M}'’])${pattern}(?![\\p{L}\\p{M}]|['’][\\p{L}\\p{M}])`, 'iu');
  for (const s of splitSentences(paragraph)) {
    if (re.test(s)) return s.trim();
  }
  return paragraph.trim().slice(0, 300);
}
