const DB_NAME = "chronicon-offline";
const DB_VERSION = 2;
const LEGACY_EVENTS_STORE = "events";
const EVENT_SERIES_STORE = "eventSeries";
const OCCURRENCES_STORE = "occurrences";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(LEGACY_EVENTS_STORE)) {
        db.createObjectStore(LEGACY_EVENTS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(EVENT_SERIES_STORE)) {
        db.createObjectStore(EVENT_SERIES_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(OCCURRENCES_STORE)) {
        const store = db.createObjectStore(OCCURRENCES_STORE, { keyPath: "id" });
        store.createIndex("byEventSeriesId", "eventSeriesId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    let settled = false;

    const resolveOnComplete = (value) => {
      result = value;
    };

    const rejectTransaction = (error) => {
      if (settled) return;
      settled = true;
      db.close();
      reject(error);
    };

    callback(store, resolveOnComplete, rejectTransaction);

    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      rejectTransaction(tx.error);
    };
    tx.onabort = () => {
      rejectTransaction(tx.error);
    };
  });
}

export function getAllEventSeries() {
  return withStore(EVENT_SERIES_STORE, "readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function getAllOccurrences() {
  return withStore(OCCURRENCES_STORE, "readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function getLegacyEvents() {
  return withStore(LEGACY_EVENTS_STORE, "readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function putEventSeries(record) {
  return withStore(EVENT_SERIES_STORE, "readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export function putOccurrence(record) {
  return withStore(OCCURRENCES_STORE, "readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export function bulkPutEventSeries(records) {
  return withStore(EVENT_SERIES_STORE, "readwrite", (store, resolve) => {
    records.forEach((record) => store.put(record));
    resolve(records);
  });
}

export function bulkPutOccurrences(records) {
  return withStore(OCCURRENCES_STORE, "readwrite", (store, resolve) => {
    records.forEach((record) => store.put(record));
    resolve(records);
  });
}

export function deleteEventSeries(seriesId) {
  return withStore(EVENT_SERIES_STORE, "readwrite", (store, resolve, reject) => {
    const request = store.delete(seriesId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function deleteOccurrence(occurrenceId) {
  return withStore(OCCURRENCES_STORE, "readwrite", (store, resolve, reject) => {
    const request = store.delete(occurrenceId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function deleteOccurrencesForSeries(seriesId) {
  return withStore(OCCURRENCES_STORE, "readwrite", (store, resolve, reject) => {
    const index = store.index("byEventSeriesId");
    const request = index.openCursor(IDBKeyRange.only(seriesId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([EVENT_SERIES_STORE, OCCURRENCES_STORE, LEGACY_EVENTS_STORE], "readwrite");
    tx.objectStore(EVENT_SERIES_STORE).clear();
    tx.objectStore(OCCURRENCES_STORE).clear();
    tx.objectStore(LEGACY_EVENTS_STORE).clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
