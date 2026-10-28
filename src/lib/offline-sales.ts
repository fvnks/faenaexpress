/**
 * Almacenamiento de ventas POS pendientes para modo offline.
 *
 * Cuando no hay conexión a internet, las ventas se guardan localmente en
 * IndexedDB y se sincronizan automáticamente cuando se recupera la conexión.
 *
 * El esquema de cada venta offline:
 * - id: cuid generado en el cliente
 * - payload: JSON con los mismos campos que createPosSale espera
 * - createdAt: timestamp de creación local
 * - synced: boolean (false hasta que se envía al servidor)
 * - syncError: string|null (último error de sincronización, si lo hay)
 */

const DB_NAME = "PosOfflineDB";
const STORE_NAME = "offlineSales";
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
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/**
 * Guarda una venta pendiente localmente. Devuelve el id asignado.
 */
export async function saveOfflineSale(payload: {
  partnerId?: string | null;
  items: Array<{ productId: string; quantity: number; discount: number }>;
  payments: Array<{ method: string; amount: number; reference?: string | null }>;
  notes?: string | null;
}): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.add({ id, payload, createdAt: now, synced: false, syncError: null });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

/**
 * Lista todas las ventas pendientes de sincronizar.
 */
export async function listOfflineSales(): Promise<Array<{
  id: string;
  payload: {
    partnerId?: string | null;
    items: Array<{ productId: string; quantity: number; discount: number }>;
    payments: Array<{ method: string; amount: number; reference?: string | null }>;
    notes?: string | null;
  };
  createdAt: number;
  synced: boolean;
  syncError: string | null;
}>> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("createdAt");
  const result: Array<{
    id: string;
    payload: any;
    createdAt: number;
    synced: boolean;
    syncError: string | null;
  }> = [];
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
 * Marca una venta como sincronizada (o con error).
 */
export async function markOfflineSaleSynced(
  id: string,
  synced: boolean,
  syncError: string | null = null,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const record = await new Promise<any>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
 * Elimina una venta ya sincronizada del almacenamiento local.
 */
export async function deleteOfflineSale(id: string): Promise<void> {
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
 * Cuenta cuántas ventas están pendientes de sincronizar.
 */
export async function countPendingOfflineSales(): Promise<number> {
  const sales = await listOfflineSales();
  return sales.filter((s) => !s.synced).length;
}

/**
 * Limpia todas las ventas ya sincronizadas.
 */
export async function clearSyncedOfflineSales(): Promise<number> {
  const sales = await listOfflineSales();
  const synced = sales.filter((s) => s.synced);
  for (const sale of synced) {
    await deleteOfflineSale(sale.id);
  }
  return synced.length;
}
