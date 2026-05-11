"use client";

// ═══════════════════════════════════════════════════════════════
//  IPTV TREX — IndexedDB Persistent Cache
//  Stores channel lists, VOD metadata, series info on-device.
//  TTLs: categories 24h, streams 6h, VOD/series info 48h
// ═══════════════════════════════════════════════════════════════

const DB_NAME    = "iptv-trex-db";
const DB_VERSION = 3;

const STORE_META    = "meta";     // categories, general lists
const STORE_STREAMS = "streams";  // stream lists per category
const STORE_INFO    = "info";     // individual VOD / series detail

export const TTL_CATEGORIES = 24 * 3600 * 1000;
export const TTL_STREAMS    =  6 * 3600 * 1000;
export const TTL_INFO       = 48 * 3600 * 1000;

interface CacheEntry<T> {
  key: string;
  data: T;
  savedAt: number;
  ttl: number;
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const name of [STORE_META, STORE_STREAMS, STORE_INFO]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "key" });
        }
      }
    };
    req.onsuccess = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db!); };
    req.onerror   = ()  => reject(req.error);
  });
}

async function dbGet<T>(store: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(store, "readonly").objectStore(store).get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.savedAt > entry.ttl) { dbDelete(store, key); return resolve(null); }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function dbPut<T>(store: string, key: string, data: T, ttl: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const entry: CacheEntry<T> = { key, data, savedAt: Date.now(), ttl };
      const req = db.transaction(store, "readwrite").objectStore(store).put(entry);
      req.onsuccess = () => resolve();
      req.onerror   = () => resolve();
    });
  } catch {}
}

function dbDelete(store: string, key: string) {
  openDB().then((db) => {
    db.transaction(store, "readwrite").objectStore(store).delete(key);
  }).catch(() => {});
}

// ── Public API ───────────────────────────────────────────────

export const getCategories = <T>(type: string) =>
  dbGet<T>(STORE_META, `cats:${type}`);
export const putCategories = <T>(type: string, data: T) =>
  dbPut(STORE_META, `cats:${type}`, data, TTL_CATEGORIES);

export const getStreams = <T>(categoryId: string) =>
  dbGet<T>(STORE_STREAMS, `streams:${categoryId}`);
export const putStreams = <T>(categoryId: string, data: T) =>
  dbPut(STORE_STREAMS, `streams:${categoryId}`, data, TTL_STREAMS);

export const getVodInfo = <T>(id: string | number) =>
  dbGet<T>(STORE_INFO, `vod:${id}`);
export const putVodInfo = <T>(id: string | number, data: T) =>
  dbPut(STORE_INFO, `vod:${id}`, data, TTL_INFO);

export const getSeriesInfo = <T>(id: string | number) =>
  dbGet<T>(STORE_INFO, `series:${id}`);
export const putSeriesInfo = <T>(id: string | number, data: T) =>
  dbPut(STORE_INFO, `series:${id}`, data, TTL_INFO);

export const getChannelList = <T>(playlistId: string) =>
  dbGet<T>(STORE_META, `channels:${playlistId}`);
export const putChannelList = <T>(playlistId: string, data: T) =>
  dbPut(STORE_META, `channels:${playlistId}`, data, TTL_STREAMS);

// ── Stats & clear ────────────────────────────────────────────

export async function getDBStats(): Promise<{ categories: number; streams: number; info: number }> {
  try {
    const db = await openDB();
    const count = (store: string): Promise<number> =>
      new Promise((resolve) => {
        const req = db.transaction(store, "readonly").objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => resolve(0);
      });
    const [categories, streams, info] = await Promise.all([
      count(STORE_META), count(STORE_STREAMS), count(STORE_INFO),
    ]);
    return { categories, streams, info };
  } catch { return { categories: 0, streams: 0, info: 0 }; }
}

export async function clearAllCaches(): Promise<void> {
  try {
    const db = await openDB();
    await Promise.all(
      [STORE_META, STORE_STREAMS, STORE_INFO].map(
        (store) => new Promise<void>((resolve) => {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).clear();
          tx.oncomplete = () => resolve();
          tx.onerror    = () => resolve();
        })
      )
    );
    if (typeof window !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
    }
  } catch {}
}
