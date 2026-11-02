/**
 * Almacenamiento de asistencias pendientes para modo offline (módulo Colegios).
 *
 * Cuando el docente no tiene conexión, las asistencias se guardan localmente en
 * IndexedDB y se sincronizan automáticamente cuando se recupera la conexión.
 *
 * El esquema de cada registro offline:
 * - id: cuid generado en el cliente
 * - sessionId: id de la clase (ClassSession)
 * - alumnos: [{ studentId, estado, justificacion }]
 * - createdAt: timestamp de creación local
 * - synced: boolean (false hasta que se envía al servidor)
 * - syncError: string|null (último error de sincronización, si lo hay)
 */

const DB_NAME = "ColegiosOfflineDB";
const STORE_NAME = "offlineAttendance";
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
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

type AlumnoOffline = {
  studentId: string;
  estado: string;
  justificacion: string;
};

type OfflineAttendanceRecord = {
  id: string;
  sessionId: string;
  alumnos: AlumnoOffline[];
  createdAt: number;
  synced: boolean;
  syncError: string | null;
};

type RawOfflineAttendanceRecord = OfflineAttendanceRecord;

/**
 * Guarda una asistencia pendiente localmente. Devuelve el id asignado.
 */
export async function saveOfflineAttendance(params: {
  sessionId: string;
  alumnos: AlumnoOffline[];
}): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.add({
    id,
    sessionId: params.sessionId,
    alumnos: params.alumnos,
    createdAt: now,
    synced: false,
    syncError: null,
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

/**
 * Lista todas las asistencias pendientes de sincronizar.
 */
export async function listOfflineAttendance(): Promise<OfflineAttendanceRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("createdAt");
  const result: OfflineAttendanceRecord[] = [];
  return new Promise((resolve, reject) => {
    index.openCursor().onsuccess = (event) => {
      const target = event.target as IDBRequest | null;
      const cursor = target?.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        resolve(result.sort((a, b) => a.createdAt - b.createdAt));
      }
    };
    index.openCursor().onerror = (event) => {
      const target = event.target as IDBRequest | null;
      reject(target?.error);
    };
  });
}

/**
 * Marca una asistencia como sincronizada (o con error).
 */
export async function markOfflineAttendanceSynced(
  id: string,
  synced: boolean,
  syncError: string | null = null,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const record = await new Promise<RawOfflineAttendanceRecord | undefined>(
    (resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as RawOfflineAttendanceRecord | undefined);
      req.onerror = () => reject(req.error);
    },
  );
  if (!record) return;
  record.synced = synced;
  record.syncError = syncError;
  await store.put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Elimina una asistencia ya sincronizada del almacenamiento local.
 */
export async function deleteOfflineAttendance(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cuenta cuántas asistencias están pendientes de sincronizar.
 */
export async function countPendingOfflineAttendance(): Promise<number> {
  const records = await listOfflineAttendance();
  return records.filter((r) => !r.synced).length;
}

/**
 * Limpia todas las asistencias ya sincronizadas.
 */
export async function clearSyncedOfflineAttendance(): Promise<number> {
  const records = await listOfflineAttendance();
  const synced = records.filter((r) => r.synced);
  for (const record of synced) {
    await deleteOfflineAttendance(record.id);
  }
  return synced.length;
}
