// Which saved words to review, and in what order (pure).

export const SESSION_SIZE = 20;
export const MAX_RELEARN = 2; // how often a forgotten word comes back within one session

// A word can be reviewed once we know something about it: its definition or the sentence
// it was found in. (A missing definition is looked up when the card is turned over.)
export const isReviewable = (w) => !!(w.definition || w.context);

export const isDue = (w, now = Date.now()) =>
  isReviewable(w) && (!w.sm2_nextReview || w.sm2_nextReview <= now);

// Most overdue first, so a backlog is worked off in the order it built up.
export function buildQueue(words, now = Date.now(), limit = SESSION_SIZE) {
  return words
    .filter((w) => isDue(w, now))
    .sort((a, b) => (a.sm2_nextReview || 0) - (b.sm2_nextReview || 0))
    .slice(0, limit)
    .map((w) => w.word);
}

// Number of words that become due within `days` days (excluding those due now).
export function dueWithin(words, days, now = Date.now()) {
  const until = now + days * 86_400_000;
  return words.filter((w) => isReviewable(w) && w.sm2_nextReview > now && w.sm2_nextReview <= until).length;
}

// After grading: a forgotten word is shown again at the end of the session (a limited
// number of times); returns the queue to continue with.
export function afterGrade(queue, word, quality, relearnCounts) {
  if (quality > 0 || (relearnCounts[word] || 0) >= MAX_RELEARN) return queue;
  relearnCounts[word] = (relearnCounts[word] || 0) + 1;
  return [...queue, word];
}
