export const TEXTS_KEY = 'yelreader.texts.v1';
export const WORDS_KEY = 'yelreader.words.v1';
export const TWEAKS_KEY = 'yelreader.tweaks.v1';
export const SETTINGS_KEY = 'yelreader.settings.v1';
export const READS_KEY = 'yelreader.reads.v1';
export const HIGHLIGHTS_KEY = 'yelreader.highlights.v1';
export const PROGRESS_KEY = 'yelreader.progress.v1';
const SEEDED_KEY = 'yelreader.seeded.v1';

export const SETTINGS_DEFAULTS = {
  uiLanguage: 'tr',
  nativeLanguage: 'tr',
  definitionIn: 'native', // 'source' | 'native'
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function uid() {
  return 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function wordCount(text) {
  const m = (text || '').trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function preview(body, n) {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n).trimEnd() + '…' : flat;
}

export function relativeTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.floor(h / 24);
  if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago');
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function readingTime(words) {
  const min = Math.max(1, Math.round(words / 220));
  return min + ' min read';
}

const SEED_TEXTS = [
  {
    id: 't-ocean',
    title: 'Notes from the Shore',
    savedAt: Date.now() - 1000 * 60 * 60 * 26,
    body:
      "The tide came in slowly that evening, a relentless murmur against the rocks. I sat at the threshold of the dunes and let my thoughts drift with it. There is a profound solitude by the sea at dusk, when the light grows luminous and then fades, and the vast horizon turns the color of cooled iron.\n\n" +
      "I have never quite been able to fathom the ocean. It is indifferent to us, serene one hour and ferocious the next, and yet people return to it for solace. Perhaps we yearn for something larger than our small and fleeting troubles. Perhaps the water simply reminds us to be patient.\n\n" +
      "A gull lingered on a post nearby, weary from the wind. I watched it gather itself and ascend, a fragile and delicate thing against an immense sky, until it was only a glimpse, and then nothing at all.",
  },
  {
    id: 't-stoic',
    title: 'On a Quiet Mind',
    savedAt: Date.now() - 1000 * 60 * 60 * 50,
    body:
      "It is not events that disturb us, the old teacher said, but our perception of them. An obstacle in the road is only an obstacle until judgment makes it a disaster. With patience and a little discipline, the same stone becomes a step.\n\n" +
      "Virtue, he believed, is a kind of resolve that we practice rather than possess. We endure what we must, we contemplate what we can change, and we meet fortune — kind or cruel — with the same tranquil face. Courage is not the absence of fear but the resolve to act despite it.\n\n" +
      "To live well, then, is a humble and inevitable discipline: to want less, to notice more, and to let the indifferent world be exactly what it is.",
  },
  {
    id: 't-stars',
    title: 'A Field Guide to the Night Sky',
    savedAt: Date.now() - 1000 * 60 * 60 * 73,
    body:
      "On a clear night far from the city, the cosmos opens overhead in vivid and intricate detail. The first thing to find is a celestial landmark — a bright, radiant star — and let your eyes wander outward from there.\n\n" +
      "What looks like a smudge of cloud may in fact be a nebula, an immense region of gas and dust where new stars kindle into being. Every point of light you see has traveled an almost unimaginable distance, at tremendous velocity, only to arrive as a faint glimpse at the back of your eye.\n\n" +
      "Gravity holds it all in its long, patient orbit. To contemplate the night sky is to feel both humble and strangely connected — a curious mind looking up into something vast, ancient, and serene.",
  },
  {
    id: 't-letter',
    title: 'A Letter to a Younger Friend',
    savedAt: Date.now() - 1000 * 60 * 60 * 120,
    body:
      "I'll be candid with you, since candor is the only gift I have to spare. The years ahead will meander more than you expect. You will yearn for a straight road and be handed a winding one instead, and that is not a failure — it is simply the shape of a life.\n\n" +
      "Be resilient, but stay tender. Let your work be fervent and your judgments slow. Seek the company of curious people and the quiet of intimate rooms. When you are weary, find solace in small and ordinary things: a warm light, an eloquent sentence, the patience of an old friend who lets you linger.\n\n" +
      "And when fortune turns, as it surely will, remember that even the most profound changes begin as a single, fragile thought.",
  },
];

const SEED_WORDS = [
  { word: 'ephemeral', sourceId: 't-ocean', sourceTitle: 'Notes from the Shore', savedAt: Date.now() - 1000 * 60 * 60 * 20 },
  { word: 'serene', sourceId: 't-stars', sourceTitle: 'A Field Guide to the Night Sky', savedAt: Date.now() - 1000 * 60 * 60 * 44 },
  { word: 'resolve', sourceId: 't-stoic', sourceTitle: 'On a Quiet Mind', savedAt: Date.now() - 1000 * 60 * 60 * 49 },
  { word: 'meander', sourceId: 't-letter', sourceTitle: 'A Letter to a Younger Friend', savedAt: Date.now() - 1000 * 60 * 60 * 6 },
  { word: 'luminous', sourceId: 't-ocean', sourceTitle: 'Notes from the Shore', savedAt: Date.now() - 1000 * 60 * 30 },
];

export function saveProgress(textId, page) {
  const all = load(PROGRESS_KEY, {});
  all[textId] = { page, updatedAt: Date.now() };
  save(PROGRESS_KEY, all);
}

export function getProgress(textId) {
  const all = load(PROGRESS_KEY, {});
  return all[textId] || null;
}

export function logRead(textId) {
  const reads = load(READS_KEY, {});
  reads[textId] = Date.now();
  save(READS_KEY, reads);
}

export function calcStats(texts, words, reads) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const wordsThisWeek = words.filter((w) => w.savedAt > weekAgo).length;
  const textsRead = Object.keys(reads || {}).length;

  // Streak: consecutive days with at least one saved word
  const wordDays = new Set(
    words.map((w) => {
      const d = new Date(w.savedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!wordDays.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { textsTotal: texts.length, textsRead, wordsTotal: words.length, wordsThisWeek, streak };
}

// SM-2 algorithm: quality 0-5 (0=forgot, 3=hard, 5=easy)
export function sm2Update(wordObj, quality) {
  const q = Math.max(0, Math.min(5, quality));
  const interval = wordObj.sm2_interval ?? 1;
  const rep = wordObj.sm2_repetition ?? 0;
  const ef = wordObj.sm2_efactor ?? 2.5;

  let newEf = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEf < 1.3) newEf = 1.3;

  let newRep, newInterval;
  if (q < 3) {
    newRep = 0;
    newInterval = 1;
  } else {
    newRep = rep + 1;
    if (rep === 0) newInterval = 1;
    else if (rep === 1) newInterval = 6;
    else newInterval = Math.round(interval * newEf);
  }

  return {
    sm2_interval: newInterval,
    sm2_repetition: newRep,
    sm2_efactor: parseFloat(newEf.toFixed(2)),
    sm2_nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000,
  };
}

export function ensureSeeded() {
  if (!localStorage.getItem(SEEDED_KEY)) {
    save(TEXTS_KEY, SEED_TEXTS);
    save(WORDS_KEY, SEED_WORDS);
    localStorage.setItem(SEEDED_KEY, '1');
  }
}
