import { Utils } from './utils.js';

const DB_NAME = 'electronics_shop';
const DB_VERSION = 1;
const STORE_NAMES = ['settings','partners','capitalEvents','products','inventoryLots','customers','suppliers','invoices','cashAccounts','ledgerTransactions','auditLog'];

class LocalFallback {
  constructor() {
    this.key = `${DB_NAME}_fallback`;
    this.data = Utils.store(this.key) || {};
  }
  _persist() { Utils.store(this.key, this.data); }
  async getAll(store) { return Object.values(this.data[store] || {}); }
  async get(store, id) { return (this.data[store]||{})[id] || null; }
  async put(store, value) {
    this.data[store] = this.data[store] || {};
    this.data[store][value.id] = value;
    this._persist();
    return value;
  }
  async delete(store, id) { if(this.data[store]) delete this.data[store][id]; this._persist(); }
  async bulkAdd(store, values) { for(const v of values) await this.put(store, v); }
}

function openIndexedDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORE_NAMES.forEach(name => {
        if(!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath:'id' });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class DB {
  static async init() {
    try {
      const db = await openIndexedDb();
      return new DB(db, null);
    } catch(err) {
      console.warn('IndexedDB unavailable, falling back to localStorage', err);
      const fallback = new LocalFallback();
      return new DB(null, fallback);
    }
  }

  constructor(db, fallback) {
    this.db = db;
    this.fallback = fallback;
  }

  async tx(store, mode='readonly') {
    if(!this.db) return null;
    return this.db.transaction([store], mode).objectStore(store);
  }

  async getAll(store) {
    if(!this.db) return this.fallback.getAll(store);
    return new Promise((resolve, reject) => {
      const request = this.tx(store).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async get(store, id) {
    if(!this.db) return this.fallback.get(store,id);
    return new Promise((resolve, reject) => {
      const request = this.tx(store).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async put(store, value) {
    if(!this.db) return this.fallback.put(store,value);
    return new Promise((resolve, reject) => {
      const request = this.tx(store,'readwrite').put(value);
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(store, id) {
    if(!this.db) return this.fallback.delete(store,id);
    return new Promise((resolve, reject) => {
      const request = this.tx(store,'readwrite').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async bulkAdd(store, values) {
    if(!this.db) return this.fallback.bulkAdd(store, values);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([store],'readwrite');
      const os = tx.objectStore(store);
      values.forEach(v => os.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
