/**
 * Audio files are binary and can be tens of megabytes — too large and the
 * wrong shape for localStorage (which ProjectContext uses for JSON metadata).
 * This wrapper persists the actual audio Blob per project in IndexedDB so a
 * reload doesn't lose the uploaded track, only the object URL (which is
 * cheap to recreate from the stored blob).
 */

const DB_NAME = 'cadence-audio';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export interface StoredAudioFile {
  projectId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlob(
  projectId: string,
  file: File | Blob,
  fileName: string,
): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record: StoredAudioFile = {
        projectId,
        fileName,
        mimeType: file.type || 'application/octet-stream',
        blob: file,
        savedAt: new Date().toISOString(),
      };
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

export async function getAudioBlob(projectId: string): Promise<StoredAudioFile | null> {
  try {
    const db = await openDb();
    return await new Promise<StoredAudioFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(projectId);
      req.onsuccess = () => resolve((req.result as StoredAudioFile) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function deleteAudioBlob(projectId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(projectId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* non-fatal: worst case the user re-uploads */
  }
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
