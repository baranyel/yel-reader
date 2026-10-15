// Backup, restore and reset (the parts that touch storage). Validation lives in backupCore.js.
import { ALL_STORAGE_KEYS, TEXTS_KEY, save } from './storage.js';
import { getAllTexts, replaceAllTexts } from './textStore.js';
import { getAllImages, restoreImages } from './imageStore.js';
import { BACKUP_VERSION } from './backupCore.js';

export async function buildBackup() {
  const storage = {};
  for (const key of ALL_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try { storage[key] = JSON.parse(raw); } catch { /* unreadable value: leave it out of the backup */ }
  }
  storage[TEXTS_KEY] = await getAllTexts();
  const images = await getAllImages().catch(() => ({}));
  return { version: BACKUP_VERSION, exportedAt: Date.now(), storage, images };
}

export async function downloadBackup() {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yelreader-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// `valid` is the result of validateBackup() with ok === true. Replaces all current data.
// Texts and images (the parts that can fail) are written first, so a failure leaves the
// small settings/words data untouched.
export async function restoreBackup(valid) {
  await replaceAllTexts(valid.storage[TEXTS_KEY] || []);
  await restoreImages(valid.images);
  for (const key of ALL_STORAGE_KEYS) {
    if (key in valid.storage) save(key, valid.storage[key]);
    else localStorage.removeItem(key);
  }
}

// Last resort for a corrupted install: remove everything this app stored.
export async function resetAllData() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('yelreader') || k === 'tapHintSeen')
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  await Promise.all(['yelreader-data', 'yelreader-images', 'yelreader-cache'].map((name) =>
    new Promise((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      } catch { resolve(); }
    })));
}
