const DB_NAME = 'yelreader-images';
const STORE = 'images';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function saveImage(id, dataUrl) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = res;
    tx.onerror = (e) => rej(e.target.error);
  });
}

export async function getImage(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = (e) => rej(e.target.error);
  });
}

export async function deleteImage(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = res;
    tx.onerror = (e) => rej(e.target.error);
  });
}

export async function getAllImages() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const out = {};
    const req = db.transaction(STORE).objectStore(STORE).openCursor();
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) { out[cur.key] = cur.value; cur.continue(); }
      else res(out);
    };
    req.onerror = (e) => rej(e.target.error);
  });
}

export async function restoreImages(images) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const [id, url] of Object.entries(images || {})) store.put(url, id);
    tx.oncomplete = res;
    tx.onerror = (e) => rej(e.target.error);
  });
}
