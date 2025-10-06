/* Lightweight IndexedDB pack manager for CityNav
 * - Stores pack manifests in `manifests` store and pack binary data in `data` store
 * - Exports: createPack, listPacks, getPackManifest, getPackData, deletePack, estimateSize
 * No external dependencies; small promise-based wrapper around IndexedDB
 */

export type PackManifest = {
  id: string;
  bbox: [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
  center: [number, number]; // [lon,lat]
  radiusMeters: number;
  categories: string[];
  createdAt: string; // ISO
  sizeBytes: number;
  itemCount: number;
  compressedBytes?: number;
  contentEncoding?: 'gzip' | 'identity';
};

const DB_NAME = 'citynav-packs';
const DB_VERSION = 1;
const MANIFEST_STORE = 'manifests';
const DATA_STORE = 'data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
        db.createObjectStore(MANIFEST_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, cb: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([storeName], mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(cb(store))
      .then(result => {
        tx.oncomplete = () => resolve(result as T);
        tx.onerror = () => reject(tx.error);
      })
      .catch(err => {
        tx.abort();
        reject(err);
      });
  });
}

export async function createPack(manifest: PackManifest, data: Blob | ArrayBuffer | string): Promise<void> {
  const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data instanceof ArrayBuffer ? new Blob([data]) : data;

  // Write manifest and data in a single transaction
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([MANIFEST_STORE, DATA_STORE], 'readwrite');
    const mStore = tx.objectStore(MANIFEST_STORE);
    const dStore = tx.objectStore(DATA_STORE);

    mStore.put(manifest);
    dStore.put({ id: manifest.id, blob });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  });
}

export async function listPacks(): Promise<PackManifest[]> {
  return withStore<PackManifest[]>(MANIFEST_STORE, 'readonly', store => {
    return new Promise<PackManifest[]>((resolve, reject) => {
      const items: PackManifest[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          items.push(cur.value as PackManifest);
          cur.continue();
        } else {
          resolve(items);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getPackManifest(id: string): Promise<PackManifest | null> {
  return withStore<PackManifest | null>(MANIFEST_STORE, 'readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getPackData(id: string): Promise<Blob | null> {
  return withStore<Blob | null>(DATA_STORE, 'readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const r = req.result;
        resolve(r ? (r.blob as Blob) : null);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// Convenience: getPackText will decompress gzip blobs automatically if needed.
export async function getPackText(id: string): Promise<string | null> {
  const manifest = await getPackManifest(id);
  const blob = await getPackData(id);
  if (!blob) return null;
  if (manifest?.contentEncoding === 'gzip') {
    const buffer = await blob.arrayBuffer();
    try {
      const pako = await import('pako');
      const decompressed = pako.ungzip(new Uint8Array(buffer), { to: 'string' });
      return decompressed;
    } catch (err) {
      console.warn('gunzip failed', err);
      // fallback to text trying
      return await blob.text();
    }
  }
  return await blob.text();
}

export async function deletePack(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction([MANIFEST_STORE, DATA_STORE], 'readwrite');
    const mStore = tx.objectStore(MANIFEST_STORE);
    const dStore = tx.objectStore(DATA_STORE);
    mStore.delete(id);
    dStore.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function estimateSize(): Promise<{ totalBytes: number; count: number }> {
  // Sum the sizeBytes in manifests where available as a quick estimate.
  const manifests = await listPacks();
  const totalBytes = manifests.reduce((s, m) => s + (m.sizeBytes || 0), 0);
  return { totalBytes, count: manifests.length };
}

// Utility: stream NDJSON blob into array (small convenience for testing)
export async function readPackAsText(id: string): Promise<string | null> {
  const blob = await getPackData(id);
  if (!blob) return null;
  return await blob.text();
}

export default {
  createPack,
  listPacks,
  getPackManifest,
  getPackData,
  deletePack,
  estimateSize,
  readPackAsText,
};
