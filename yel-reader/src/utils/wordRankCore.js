// Frequency-rank helpers (pure). The word list itself is loaded lazily by wordRank.js.
import { lemmaCandidates } from './lemma.js';

// Rank caps for the "my level" setting: words rarer than the cap get a hint.
// Rough heuristic (≈ vocabulary size at each CEFR level), not an official mapping.
export const HINT_LEVELS = { A2: 1800, B1: 3500, B2: 6500 };

// text: one word per line, most frequent first → Map(word → rank starting at 1)
export function parseRanks(text) {
  const map = new Map();
  let i = 1;
  for (const w of text.split('\n')) if (w) map.set(w, i++);
  return map;
}

// Rank of the most frequent form of `base` (itself or a plausible base form).
// Infinity when the word is not in the list.
export function rankOf(map, base) {
  let word = base;
  if (word.includes("'")) {
    word = word.replace(/'(s|re|ll|ve|d|m)$/, '');
    if (word.includes("'")) return 1; // contractions like don't are always basic
  }
  // An inflected form is as easy as its base form, even if the inflection itself is rarer.
  let best = map.get(word) ?? Infinity;
  for (const c of lemmaCandidates(word)) {
    const r = map.get(c);
    if (r !== undefined && r < best) best = r;
  }
  return best;
}
