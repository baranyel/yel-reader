// Texts can be long (whole books), so they live in IndexedDB instead of localStorage's ~5 MB.
// If IndexedDB is unavailable the store falls back to localStorage so the app still works.
import { load, save, TEXTS_KEY, SEEDED_KEY, SEED_TEXTS } from './storage.js';

const DB_NAME = 'yelreader-data';
const STORE = 'texts';

let dbPromise = null;
let idbUsable = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
  }
  return dbPromise;
}

async function useIdb() {
  if (idbUsable === null) {
    try { await openDb(); idbUsable = true; } catch { idbUsable = false; }
  }
  return idbUsable;
}

// Run `work(store)` in one transaction; resolves when the transaction has committed.
async function transaction(mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    try { result = work(tx.objectStore(STORE)); } catch (e) { reject(e); return; }
    tx.oncomplete = () => resolve(result?.result ?? result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  });
}

const bySavedAtDesc = (a, b) => (b.savedAt || 0) - (a.savedAt || 0);

export async function getAllTexts() {
  if (!(await useIdb())) return load(TEXTS_KEY, []).sort(bySavedAtDesc);
  const all = await transaction('readonly', (store) => store.getAll());
  return all.sort(bySavedAtDesc);
}

export async function putText(text) {
  if (!(await useIdb())) {
    const all = load(TEXTS_KEY, []).filter((t) => t.id !== text.id);
    if (!save(TEXTS_KEY, [text, ...all])) throw new Error('localStorage full');
    return;
  }
  await transaction('readwrite', (store) => store.put(text));
}

export async function removeText(id) {
  if (!(await useIdb())) {
    save(TEXTS_KEY, load(TEXTS_KEY, []).filter((t) => t.id !== id));
    return;
  }
  await transaction('readwrite', (store) => store.delete(id));
}

// Replace every stored text (used when restoring a backup).
export async function replaceAllTexts(texts) {
  if (!(await useIdb())) {
    if (!save(TEXTS_KEY, texts)) throw new Error('localStorage full');
    return;
  }
  await transaction('readwrite', (store) => {
    store.clear();
    texts.forEach((t) => store.put(t));
  });
}

// Called once at start-up: moves texts written by older versions out of localStorage and
// adds the sample texts on the very first run. Returns the texts to show.
export async function loadTexts() {
  if (await useIdb()) {
    const legacy = load(TEXTS_KEY, null);
    if (Array.isArray(legacy)) {
      // Keep the localStorage copy until every text is safely in IndexedDB.
      await transaction('readwrite', (store) => { legacy.forEach((t) => store.put(t)); });
      try { localStorage.removeItem(TEXTS_KEY); } catch {}
    }
  }

  let texts = await getAllTexts();
  let seeded = false;
  try { seeded = !!localStorage.getItem(SEEDED_KEY); } catch {}
  if (!seeded) {
    if (texts.length === 0) {
      await replaceAllTexts(SEED_TEXTS);
      texts = await getAllTexts();
    }
    try { localStorage.setItem(SEEDED_KEY, '1'); } catch {}
  }
  return texts;
}
