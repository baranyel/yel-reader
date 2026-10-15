// Validation of a backup file (pure). A backup is untrusted input: it may be hand-edited,
// truncated, from another app, or from a newer version. Nothing is written unless it passes.
import {
  TEXTS_KEY, WORDS_KEY, TWEAKS_KEY, SETTINGS_KEY, HIGHLIGHTS_KEY, PROGRESS_KEY, NOTES_KEY, KNOWN_KEY,
} from './storage.js';

export const BACKUP_VERSION = 1;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function validBlock(b) {
  if (!isObject(b) || !isStr(b.id)) return false;
  if (b.type === 'text') return isStr(b.content);
  if (b.type === 'image') return isStr(b.imageId);
  return false;
}

// Each sanitizer returns { value, skipped } or null when the whole key is unusable.
const SANITIZERS = {
  [TEXTS_KEY]: (v) => {
    if (!Array.isArray(v)) return null;
    const value = v
      .filter((t) => isObject(t) && isStr(t.id) && t.id && isStr(t.title) && isStr(t.body))
      .map((t) => ({ ...t, language: isStr(t.language) ? t.language : 'en', savedAt: isNum(t.savedAt) ? t.savedAt : Date.now() }));
    return { value, skipped: v.length - value.length };
  },
  [WORDS_KEY]: (v) => {
    if (!Array.isArray(v)) return null;
    const value = v.filter((w) => isObject(w) && isStr(w.word) && w.word.trim());
    return { value, skipped: v.length - value.length };
  },
  [NOTES_KEY]: (v) => {
    if (!isObject(v)) return null;
    const value = {};
    let skipped = 0;
    for (const [id, n] of Object.entries(v)) {
      const ok = isObject(n) && isStr(n.id) && isStr(n.textId) && Array.isArray(n.blocks) && n.blocks.every(validBlock)
        && (n.paragraphIndex === null || isNum(n.paragraphIndex));
      if (ok) value[id] = n; else skipped++;
    }
    return { value, skipped };
  },
  [HIGHLIGHTS_KEY]: (v) => {
    if (!isObject(v)) return null;
    const value = {};
    let skipped = 0;
    for (const [textId, map] of Object.entries(v)) {
      if (isObject(map) && Object.values(map).every(isStr)) value[textId] = map; else skipped++;
    }
    return { value, skipped };
  },
  [PROGRESS_KEY]: (v) => {
    if (!isObject(v)) return null;
    const value = {};
    let skipped = 0;
    for (const [textId, p] of Object.entries(v)) {
      if (isObject(p) && isNum(p.page)) value[textId] = p; else skipped++;
    }
    return { value, skipped };
  },
  [KNOWN_KEY]: (v) => {
    if (!isObject(v)) return null;
    const value = {};
    let skipped = 0;
    for (const [word, ts] of Object.entries(v)) {
      if (isNum(ts)) value[word] = ts; else skipped++;
    }
    return { value, skipped };
  },
  [SETTINGS_KEY]: (v) => (isObject(v) ? { value: v, skipped: 0 } : null),
  [TWEAKS_KEY]: (v) => {
    if (!isObject(v)) return null;
    const value = { ...v };
    // The accent colour is written straight into a CSS variable.
    if (value.accent !== undefined && !(isStr(value.accent) && /^#[0-9a-f]{6}$/i.test(value.accent))) delete value.accent;
    return { value, skipped: 0 };
  },
};

export const BACKUP_KEYS = Object.keys(SANITIZERS);

// → { ok: true, storage, images, counts, skipped } | { ok: false, error }
// error is one of: 'not_object' | 'version' | 'no_storage' | 'nothing_usable'
export function validateBackup(data) {
  if (!isObject(data)) return { ok: false, error: 'not_object' };
  if (data.version !== BACKUP_VERSION) return { ok: false, error: 'version' };
  if (!isObject(data.storage)) return { ok: false, error: 'no_storage' };

  const storage = {};
  let skipped = 0;
  for (const key of BACKUP_KEYS) {
    if (!(key in data.storage)) continue;
    const result = SANITIZERS[key](data.storage[key]);
    if (!result) { skipped++; continue; }
    storage[key] = result.value;
    skipped += result.skipped;
  }

  const images = {};
  if (isObject(data.images)) {
    for (const [id, url] of Object.entries(data.images)) {
      if (isStr(url) && /^data:image\//i.test(url)) images[id] = url; else skipped++;
    }
  }

  const counts = {
    texts: storage[TEXTS_KEY]?.length ?? 0,
    words: storage[WORDS_KEY]?.length ?? 0,
    notes: Object.keys(storage[NOTES_KEY] || {}).length,
  };
  if (!counts.texts && !counts.words && !counts.notes) return { ok: false, error: 'nothing_usable' };
  return { ok: true, storage, images, counts, skipped };
}
