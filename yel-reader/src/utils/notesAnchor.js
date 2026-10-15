// Notes are attached to a paragraph. The paragraph's position (index) changes whenever the
// text is edited, so each note also remembers the start of the paragraph it belongs to
// (`paragraphPreview`). After an edit we use that to find the paragraph again.
// A note whose paragraph is gone gets paragraphIndex = null (it is kept, never deleted).

export const ANCHOR_LENGTH = 160;

// Same splitting the reader uses to build its paragraphs.
export function splitParagraphs(body) {
  return (body || '').split(/\n+/).filter((p) => p.trim().length > 0);
}

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const wordsOf = (s) => new Set(norm(s).match(/[\p{L}\p{M}']+/gu) || []);

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

// Index of the paragraph in `paras` that `anchor` came from, or -1.
// `hint` is the old index and `rank` says which repeat of an identical paragraph the note
// was on (0 = first); both only matter when several paragraphs match equally well.
export function findParagraph(paras, anchor, hint, rank = null) {
  const a = norm(anchor);
  if (!a) return -1;
  const normed = paras.map((p) => norm(p.slice(0, ANCHOR_LENGTH * 2)));
  const nearest = (indices) => {
    if (rank !== null && indices.length > rank) return indices[rank];
    return indices.reduce((best, i) =>
      (best === -1 || Math.abs(i - hint) < Math.abs(best - hint) ? i : best), -1);
  };

  // 1. Paragraph still starts the same way (or was shortened to a prefix of the anchor).
  const starts = [];
  normed.forEach((p, i) => { if (p.startsWith(a) || (p.length >= 20 && a.startsWith(p))) starts.push(i); });
  if (starts.length) return nearest(starts);

  // 2. The anchor's opening still appears somewhere (text was added in front of it).
  const head = a.slice(0, 60);
  const contains = [];
  normed.forEach((p, i) => { if (head.length >= 20 && p.includes(head)) contains.push(i); });
  if (contains.length) return nearest(contains);

  // 3. Paragraph was reworded: pick the most similar one if it is similar enough.
  const target = wordsOf(a);
  let bestScore = 0;
  let best = [];
  normed.forEach((p, i) => {
    const score = jaccard(target, wordsOf(p));
    if (score > bestScore + 1e-9) { bestScore = score; best = [i]; }
    else if (Math.abs(score - bestScore) <= 1e-9 && score > 0) best.push(i);
  });
  return bestScore >= 0.5 ? nearest(best) : -1;
}

// Returns a new notes map where the notes of `textId` follow their paragraphs from
// `oldBody` to `newBody`. Returns the same object when nothing changed.
export function reanchorNotes(notes, textId, oldBody, newBody) {
  if (oldBody === newBody) return notes;
  const oldParas = splitParagraphs(oldBody);
  const newParas = splitParagraphs(newBody);
  let changed = false;
  const next = { ...notes };

  for (const [id, note] of Object.entries(notes)) {
    if (note.textId !== textId) continue;
    const hint = note.paragraphIndex ?? 0;
    const anchor = note.paragraphPreview || oldParas[note.paragraphIndex] || '';
    // Which repeat of an identical paragraph was this note on?
    const a = norm(anchor);
    const rank = note.paragraphIndex == null ? null
      : oldParas.slice(0, note.paragraphIndex).filter((p) => a && norm(p).startsWith(a)).length;
    const idx = findParagraph(newParas, anchor, hint, rank);

    let updated;
    if (idx === -1) {
      updated = note.paragraphIndex === null ? note : { ...note, paragraphIndex: null };
    } else {
      const preview = newParas[idx].slice(0, ANCHOR_LENGTH);
      updated = note.paragraphIndex === idx && note.paragraphPreview === preview
        ? note
        : { ...note, paragraphIndex: idx, paragraphPreview: preview };
    }
    if (updated !== note) { next[id] = updated; changed = true; }
  }
  return changed ? next : notes;
}
