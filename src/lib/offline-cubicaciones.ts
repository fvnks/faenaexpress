/**
 * Cola offline de cubicaciones (módulo Obras).
 * Igual patrón que la asistencia offline de Colegios: IndexedDB en el cliente y
 * sincronización automática al recuperar conexión. La foto se guarda como Blob.
 */

const DB_NAME = "ObrasOfflineDB";
const STORE_NAME = "offlineCubicaciones";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export type CubicacionOffline = {
  id: string;
  obraId: string;
  partidaId: string;
  cuadrillaId: string | null;
  cantidad: number;
  fecha: string;
  photo: Blob | null;
  photoName: string | null;
  createdAt: number;
  synced: boolean;
  syncError: string | null;
};

export async function saveOfflineCubicacion(params: {
  obraId: string;
  partidaId: string;
  cuadrillaId: string | null;
  cantidad: number;
  fecha: string;
  photo: File | null;
}): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: CubicacionOffline = {
    id,
    obraId: params.obraId,
    partidaId: params.partidaId,
    cuadrillaId: params.cuadrillaId,
    cantidad: params.cantidad,
    fecha: params.fecha,
    photo: params.photo ? new Blob([await params.photo.arrayBuffer()], { type: params.photo.type }) : null,
    photoName: params.photo?.name ?? null,
    createdAt: Date.now(),
    synced: false,
    syncError: null,
  };
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function listOfflineCubicaciones(): Promise<CubicacionOffline[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const index = tx.objectStore(STORE_NAME).index("createdAt");
  const result: CubicacionOffline[] = [];
  return new Promise((resolve, reject) => {
    const request = index.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        result.push(cursor.value as CubicacionOffline);
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markCubicacionSynced(
  id: string,
  synced: boolean,
  syncError: string | null = null,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const record = await new Promise<CubicacionOffline | undefined>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as CubicacionOffline | undefined);
    request.onerror = () => reject(request.error);
  });
  if (!record) return;
  record.synced = synced;
  record.syncError = syncError;
  store.put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineCubicacion(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countPendingCubicaciones(): Promise<number> {
  const records = await listOfflineCubicaciones();
  return records.filter((record) => !record.synced).length;
}
