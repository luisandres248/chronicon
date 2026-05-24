class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(String(key), String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new MemoryStorage();
}

if (typeof globalThis.sessionStorage === "undefined") {
  globalThis.sessionStorage = new MemoryStorage();
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
}
