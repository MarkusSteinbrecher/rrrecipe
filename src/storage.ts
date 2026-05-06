import appSnapshot from "./data/app-snapshot.json";
import { baselineCatalog } from "./data/baseline-catalog";
import { mergeBaselineCatalog } from "./snapshot-merge";
import type { AppSnapshot } from "./types";

const DB_NAME = "rrrecipe";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const SNAPSHOT_KEY = "snapshot";
const initialSnapshot = appSnapshot as AppSnapshot;

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const snapshot = await requestToPromise<AppSnapshot | undefined>(store.get(SNAPSHOT_KEY));

  if (snapshot) {
    const hydrated = mergeBaselineCatalog(snapshot, baselineCatalog);
    if (hydrated.changed) await saveSnapshot(hydrated.snapshot);
    return hydrated.snapshot;
  }

  const hydrated = mergeBaselineCatalog(initialSnapshot, baselineCatalog).snapshot;
  await saveSnapshot(hydrated);
  return hydrated;
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.put(snapshot, SNAPSHOT_KEY));
}

export async function resetSnapshot(): Promise<AppSnapshot> {
  const snapshot = mergeBaselineCatalog(initialSnapshot, baselineCatalog).snapshot;
  await saveSnapshot(snapshot);
  return snapshot;
}
