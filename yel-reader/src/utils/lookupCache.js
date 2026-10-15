// Persistent key/value cache for dictionary entries, translations and CEFR levels.
// Memory first, IndexedDB behind it, so a word looked up once keeps working offline.
// Every function degrades to "no cache" if IndexedDB is unavailable.

const DB_NAME = 'yelreader-cache';
const STORE = 'kv';

const mem = new Map();
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

// Resolves to the cached value, or undefined when there is none.
export async function cacheGet(key) {
  if (mem.has(key)) return mem.get(key);
  try {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (value !== undefined) mem.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export async function cacheSet(key, value) {
  mem.set(key, value);
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
