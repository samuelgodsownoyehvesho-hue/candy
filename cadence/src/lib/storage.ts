/**
 * Thin, defensive wrapper around localStorage. Every read is try/caught and
 * falls back gracefully — this app must never hard-crash because storage was
 * full, blocked (private browsing), or holding a stale/corrupt shape from a
 * previous schema version.
 */

const NAMESPACE = 'cadence';

function key(name: string): string {
  return `${NAMESPACE}:${name}`;
}

export function loadJSON<T>(name: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(name: string, value: T): boolean {
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(name: string): void {
  try {
    window.localStorage.removeItem(key(name));
  } catch {
    /* no-op: storage unavailable */
  }
}

export function isStorageAvailable(): boolean {
  try {
    const testKey = key('__probe__');
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
