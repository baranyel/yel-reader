export const TEXTS_KEY = 'yelreader.texts.v1';
export const WORDS_KEY = 'yelreader.words.v1';
export const TWEAKS_KEY = 'yelreader.tweaks.v1';
export const SETTINGS_KEY = 'yelreader.settings.v1';
export const READS_KEY = 'yelreader.reads.v1';
export const HIGHLIGHTS_KEY = 'yelreader.highlights.v1';
export const PROGRESS_KEY = 'yelreader.progress.v1';
export const NOTES_KEY = 'yelreader.notes.v1';
const SEEDED_KEY = 'yelreader.seeded.v1';

export const ALL_STORAGE_KEYS = [
  TEXTS_KEY, WORDS_KEY, TWEAKS_KEY, SETTINGS_KEY,
  READS_KEY, HIGHLIGHTS_KEY, PROGRESS_KEY, NOTES_KEY,
];

export function saveNote(note) {
  const all = load(NOTES_KEY, {});
  all[note.id] = note;
  save(NOTES_KEY, all);
}

export function deleteNote(noteId) {
  const all = load(NOTES_KEY, {});
  delete all[noteId];
  save(NOTES_KEY, all);
}

export const SETTINGS_DEFAULTS = {
  uiLanguage: 'tr',
  nativeLanguage: 'tr',
  definitionIn: 'native', // 'source' | 'native'
  popupShowCefr: true,
  popupShowPos: true,
  popupShowPhonetic: true,
  popupShowExample: true,
  popupShowSynonyms: true,
  popupShowAntonyms: true,
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
    id: 't-academic',
    title: 'The Neuroscience of Memory Consolidation',
    savedAt: Date.now() - 1000 * 60 * 60 * 24,
    body:
      "Memory consolidation refers to the process by which newly acquired information is stabilized into long-term storage. This phenomenon, first systematically described in the late nineteenth century following observations of retrograde amnesia in brain-injured patients, has since become one of the most extensively studied topics in cognitive neuroscience.\n\n" +
      "At the cellular level, consolidation involves a cascade of molecular events initiated by synaptic activity. When neurons fire repeatedly in close temporal proximity, the connections between them are strengthened through a mechanism known as long-term potentiation (LTP). This process depends critically on the activation of NMDA receptors and the subsequent synthesis of new proteins, which structurally reinforce synaptic pathways. Interference with protein synthesis during a narrow post-learning window reliably impairs memory retention, a finding that underscores the biological necessity of this phase.\n\n" +
      "At the systems level, the hippocampus plays an indispensable role in the initial encoding and early consolidation of declarative memories — that is, memories for facts and events that can be consciously recalled. Evidence from patients with bilateral hippocampal lesions, most notably the extensively documented case of H.M., demonstrates that damage to this structure prevents the formation of new long-term memories while leaving remote memories and procedural skills largely intact. This dissociation has been instrumental in establishing the concept of multiple memory systems operating in parallel.\n\n" +
      "A particularly compelling theory holds that during slow-wave sleep, hippocampal representations are sequentially reactivated and gradually transferred to the neocortex for permanent storage — a process termed systems consolidation. The neocortex, with its vast associative networks, is better suited to store and integrate information over extended timescales. Empirical support for this model comes from studies demonstrating that targeted disruption of slow oscillations during sleep impairs next-day recall, whereas enhancement of these oscillations produces a corresponding improvement.\n\n" +
      "More recent conceptualizations have challenged the traditional view of consolidation as a one-time stabilization event. The discovery of reconsolidation — the observation that reactivating a stored memory renders it temporarily labile and susceptible to disruption — suggests that memory is a far more dynamic process than previously assumed. Each act of retrieval appears to initiate a new round of consolidation, potentially allowing memories to be updated, strengthened, or distorted in light of new information.\n\n" +
      "These findings carry substantial implications for the treatment of maladaptive memories in conditions such as post-traumatic stress disorder, where intrusive recollections resist voluntary suppression. Pharmacological agents administered during the reconsolidation window have shown promise in attenuating the emotional intensity of traumatic memories in both animal models and preliminary human trials, though significant ethical and practical obstacles remain before such interventions can be adopted clinically.",
  },
  {
    id: 't-novel',
    title: 'The Old Man and the Sea — A Summary',
    savedAt: Date.now() - 1000 * 60 * 60 * 48,
    body:
      "Ernest Hemingway's short novel tells the story of Santiago, an old Cuban fisherman who has not caught a fish for eighty-four days. The other fishermen feel sorry for him, and some of them laugh at him quietly. Only a young boy named Manolin still believes in Santiago and helps him every evening.\n\n" +
      "One morning before dawn, Santiago rows his small boat far out into the Gulf Stream, further than he usually goes. He puts his fishing lines deep into the water and waits. After a long time, something very large pulls on one of his lines. He cannot see what it is, but he knows from the weight that it is a great fish.\n\n" +
      "The fish begins to pull the boat slowly through the water. Santiago holds the line tightly with his hands, even though it cuts into his skin. He talks to the fish, calling it his brother. He respects the fish deeply, even as he tries to catch it. The struggle continues for two days and two nights. Santiago does not sleep. He eats a little raw fish to keep his strength. His hands hurt badly and his back aches, but he does not give up.\n\n" +
      "On the third day, the great fish — a marlin — finally comes to the surface. It is enormous, longer than the boat itself. Santiago uses all his remaining strength to pull the marlin close and kill it with his harpoon. He feels both sad and proud. He ties the marlin to the side of the boat and begins the long journey home.\n\n" +
      "But the blood from the dead marlin attracts sharks. They come one by one and then in groups, eating pieces of the marlin. Santiago fights them with his harpoon, then with a knife tied to an oar, and finally with the oar itself. But there are too many sharks. By the time he reaches the harbour, only the skeleton of the great fish remains.\n\n" +
      "Santiago drags himself home and falls asleep, exhausted. The next morning, the fishermen measure the skeleton and are amazed by its size. Manolin sits with the old man and promises to fish with him again. The story is about courage, loneliness, and what it means to face defeat without losing your dignity.",
  },
  {
    id: 't-children',
    title: 'Charlotte\'s Web — A Summary',
    savedAt: Date.now() - 1000 * 60 * 60 * 72,
    body:
      "Charlotte's Web is a story about a pig named Wilbur and his best friend, a spider named Charlotte.\n\n" +
      "Wilbur lives on a farm. A young girl named Fern loves him very much. She feeds him and takes care of him every day. But Wilbur is sad sometimes because he is lonely.\n\n" +
      "One day, Wilbur hears a voice. The voice belongs to Charlotte. She is a spider. She lives in the corner of the barn. Wilbur and Charlotte become very good friends. They talk every day.\n\n" +
      "One day, Wilbur learns some bad news. The farmer wants to sell him. Wilbur is very scared. Charlotte tells him not to worry. She has a plan.\n\n" +
      "Charlotte writes words in her web. The words say things like 'Some Pig' and 'Terrific'. People come from far away to see the special web. They think Wilbur is a very special pig. The farmer is very happy and proud.\n\n" +
      "Because of Charlotte's words, Wilbur becomes famous. The farmer decides not to sell him. Wilbur is safe!\n\n" +
      "But Charlotte is very tired. Writing the words was hard work. At the end of the story, Charlotte dies. Wilbur is very sad. He loved Charlotte very much.\n\n" +
      "Before she dies, Charlotte makes an egg sac. In spring, hundreds of baby spiders are born. Some of them stay on the farm. Wilbur is happy to have new friends.\n\n" +
      "This story teaches us about friendship and love. A good friend helps you even when it is difficult.",
  },
];

const SEED_WORDS = [];

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
