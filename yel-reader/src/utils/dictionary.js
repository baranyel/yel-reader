import { cleanWord, extractSentence } from './text.js';
import { lemmaCandidates } from './lemma.js';
import { cacheGet, cacheSet } from './lookupCache.js';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

// Lingva instances — fallback only
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
  'https://lingva.lunar.icu',
  'https://lingva.tiekoetter.com',
];

const POS_TR = {
  noun: 'isim', verb: 'fiil', adjective: 'sıfat', adverb: 'zarf',
  pronoun: 'zamir', preposition: 'edat', conjunction: 'bağlaç',
  interjection: 'ünlem', exclamation: 'ünlem', article: 'artikel',
  numeral: 'sayı', determiner: 'belirteç',
};

function translatePOS(pos, lang) {
  if (!pos || pos === '—') return '—';
  if (lang === 'tr') return POS_TR[pos.toLowerCase()] || pos;
  return pos;
}

export { cleanWord, extractSentence };

// options: { definitionIn: 'source'|'native', nativeLanguage: 'tr'|... }
export async function lookupWord(word, context = '', options = {}) {
  const { definitionIn = 'source', nativeLanguage = 'tr' } = options;
  const clean = cleanWord(word);
  if (!clean) return null;

  if (definitionIn === 'native' && nativeLanguage !== 'en') {
    return await lookupNative(clean, context, nativeLanguage);
  }
  return await lookupEnglish(clean, context);
}

// --- English: Free Dictionary API (cached) → Anthropic fallback (if key is set) ---
async function lookupEnglish(clean, context) {
  // Try the word as written first, then plausible base forms (ducks → duck, walked → walk).
  let entries = null;
  let unreachable = false;
  for (const candidate of [clean, ...lemmaCandidates(clean).slice(0, 4)]) {
    try {
      entries = await fetchDictEntries(candidate);
    } catch {
      unreachable = true;
      break;
    }
    if (entries) break;
  }

  if (entries) {
    const allMeanings = entries.flatMap((e) => e.meanings || []);
    const meaning = selectBestMeaning(allMeanings, clean, context);
    const def = meaning?.definitions?.[0];
    if (def?.definition) {
      // Phonetics
      const phoneticsArr = entries[0].phonetics || [];
      const phonetic = entries[0].phonetic
        || phoneticsArr.find((p) => p.text)?.text
        || null;
      const audioUrl = phoneticsArr.find((p) => p.audio?.startsWith('http'))?.audio
        || phoneticsArr.find((p) => p.audio)?.audio
        || null;

      // Synonyms & antonyms from the selected meaning + its first definition
      const synonyms = [...new Set([...(meaning?.synonyms || []), ...(def?.synonyms || [])])].slice(0, 6);
      const antonyms = [...new Set([...(meaning?.antonyms || []), ...(def?.antonyms || [])])].slice(0, 6);

      const headword = (entries[0].word || clean).toLowerCase();
      return {
        word: headword,
        lemma: headword !== clean ? headword : null,
        pos: meaning.partOfSpeech || '—',
        definition: def.definition,
        example: def.example || null,
        phonetic,
        audioUrl,
        synonyms,
        antonyms,
        found: true,
        source: 'dictionary',
        lang: 'en',
      };
    }
  }

  // Anthropic fallback — only if key is set, English only, and only when we are online
  const apiKey = import.meta.env?.VITE_ANTHROPIC_API_KEY;
  if (apiKey && !unreachable) {
    const prompt = context
      ? `Given this sentence: "${context}", define the word "${clean}" in one sentence. Then give one example sentence. Nothing else.`
      : `Define the word "${clean}" in one sentence. Then give one example sentence. Nothing else.`;
    const result = await callAnthropic(prompt, apiKey);
    if (result) return { ...result, word: clean, lang: 'en' };
  }

  return {
    word: clean, pos: '—', definition: 'Definition not available.',
    example: null, found: false, source: 'none', lang: 'en', offline: unreachable,
  };
}

// --- Native (Turkish): Free Dict → Lingva translate → fallback to English ---
async function lookupNative(clean, context, nativeLang) {
  // Get English definition first (best quality source)
  const english = await lookupEnglish(clean, context);

  if (english && english.found && english.definition) {
    // Translate the word itself + definition + example in parallel
    const [translatedWord, translatedDef, translatedEx] = await Promise.all([
      translate(clean, 'en', nativeLang),
      translate(english.definition, 'en', nativeLang),
      english.example ? translate(english.example, 'en', nativeLang) : Promise.resolve(null),
    ]);

    if (translatedDef) {
      // Only keep the word translation if it differs from the original
      const wordTr = translatedWord && translatedWord.toLowerCase() !== clean ? translatedWord : null;
      return {
        ...english,
        pos: translatePOS(english.pos, nativeLang),
        translation: wordTr,
        definition: translatedDef,
        example: translatedEx || null,
        lang: nativeLang,
        source: english.source,
        translatedWith: 'translated',
      };
    }
  }

  // Lingva failed — return English result with fallback flag
  return { ...(english || notFound(clean)), lang: 'en', fallback: true };
}

// --- Dictionary helpers ------------------------------------------------------

// Words the API said it does not know (this session only; the API may learn them later).
const missing = new Set();

// Resolves to the entries, or null when the word is unknown. Throws if the service
// cannot be reached, so callers can tell "unknown word" from "offline".
async function fetchDictEntries(word) {
  const key = 'dict:en:' + word;
  const cached = await cacheGet(key);
  if (cached) return cached;
  if (missing.has(word)) return null;

  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (res.status === 404) { missing.add(word); return null; }
  if (!res.ok) throw new Error('dictionary http ' + res.status);
  const data = await res.json();
  if (Array.isArray(data) && data.length) {
    await cacheSet(key, data);
    return data;
  }
  missing.add(word);
  return null;
}

// Guess whether a word acts as 'noun' or 'verb' in the given sentence.
function guessRole(word, sentence) {
  if (!sentence) return null;
  const s = sentence.toLowerCase();
  const w = word.toLowerCase();
  const idx = s.indexOf(w);
  if (idx === -1) return null;
  const before = s.slice(0, idx).trimEnd();

  // Starts sentence / follows punctuation → subject → noun
  if (!before || /[.!?]$/.test(before)) return 'noun';
  // After article or possessive → noun
  if (/\b(a|an|the|many|some|several|few|all|no|my|your|his|her|its|our|their|this|that|these|those)\s*$/.test(before)) return 'noun';
  // After subject pronoun → verb
  if (/\b(he|she|it|they|we|i|you)\s*$/.test(before)) return 'verb';
  // After auxiliary → main verb
  if (/\b(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|can|could|should|may|might)\s*$/.test(before)) return 'verb';
  // After adverb-like words → adjective/adverb
  if (/\b(very|quite|rather|so|too|more|most|less|least)\s*$/.test(before)) return 'adjective';

  return null;
}

// Pick the meaning that best matches the word's role in context.
function selectBestMeaning(meanings, word, context) {
  if (!meanings?.length) return null;
  if (meanings.length === 1) return meanings[0];
  const role = guessRole(word, context);
  if (!role) return meanings[0];
  const match = meanings.find((m) => m.partOfSpeech === role);
  return match || meanings[0];
}

// --- Translation: Google (primary, unlimited) → Lingva fallback -------------
async function translate(text, from, to) {
  const key = `tr:${from}>${to}:${text}`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  const result = (await translateWithGoogle(text, from, to))
              || (await translateWithLingva(text, from, to));
  if (result) await cacheSet(key, result);
  return result;
}

// Google Translate unofficial endpoint — no key, no rate limit, CORS enabled
async function translateWithGoogle(text, from, to) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      // Response shape: [[[translated, original], ...], ...]
      const result = data[0]?.map((item) => item?.[0]).filter(Boolean).join('');
      if (result) return result;
    }
  } catch {}
  return null;
}

// Lingva instances — fallback if Google fails
async function translateWithLingva(text, from, to) {
  for (const base of LINGVA_INSTANCES) {
    try {
      const url = `${base}/api/v1/${from}/${to}/${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.translation) return data.translation;
      }
    } catch {}
  }
  return null;
}

// --- Anthropic (English fallback only) --------------------------------------
async function callAnthropic(prompt, apiKey) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || '').trim();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return {
      pos: '—',
      definition: sentences[0]?.trim() || text,
      example: sentences[1]?.trim() || null,
      found: true,
      source: 'anthropic',
    };
  } catch {
    return null;
  }
}

function notFound(word) {
  return { word, pos: '—', definition: 'Definition not available.', example: null, found: false, source: 'none' };
}
