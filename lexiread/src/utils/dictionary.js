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

export function cleanWord(word) {
  return word.toLowerCase().replace(/[^a-z']/g, '');
}

export function extractSentence(paragraphText, word) {
  const lower = word.toLowerCase();
  const sentences = paragraphText.match(/[^.!?]+[.!?]*/g) || [];
  for (const s of sentences) {
    if (s.toLowerCase().includes(lower)) return s.trim();
  }
  return paragraphText.trim().slice(0, 300);
}

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

// --- English: Free Dictionary API → Anthropic fallback (if key is set) ------
async function lookupEnglish(clean, context) {
  // Try the word as-is, then try the bare stem (duck ← ducks, walk ← walked)
  let entries = await fetchDictEntries(clean);
  if (!entries) entries = await fetchDictEntries(simpleStem(clean));

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

      return {
        word: entries[0].word || clean,
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

  // Anthropic fallback — only if key is set, English only
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (apiKey) {
    const prompt = context
      ? `Given this sentence: "${context}", define the word "${clean}" in one sentence. Then give one example sentence. Nothing else.`
      : `Define the word "${clean}" in one sentence. Then give one example sentence. Nothing else.`;
    const result = await callAnthropic(prompt, apiKey);
    if (result) return { ...result, word: clean, lang: 'en' };
  }

  return {
    word: clean, pos: '—', definition: 'Definition not available.',
    example: null, found: false, source: 'none', lang: 'en',
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

async function fetchDictEntries(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) && data.length ? data : null;
    }
  } catch {}
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

// Minimal English stemmer for common inflections.
function simpleStem(word) {
  if (word.length < 4) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';   // flies → fly
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';   // leaves → leaf
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3); // swimming → swim
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3) + 'e'; // making → make
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2);  // walked → walk
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);  // watches → watch
  if (word.endsWith('s') && word.length > 4) return word.slice(0, -1);   // ducks → duck
  return word;
}

// --- Translation: Google (primary, unlimited) → Lingva fallback -------------
async function translate(text, from, to) {
  return (await translateWithGoogle(text, from, to))
      || (await translateWithLingva(text, from, to));
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
