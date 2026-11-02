import { CLOUD_CONFIG } from './cloudConfig.js';

/**
 * Native IndexedDB vault for non-extractable CryptoKey and pre-restore snapshots.
 * Zero external dependencies.
 */
export class CloudKeyVault {
  #dbName = CLOUD_CONFIG.vaultDatabaseName;
  #dbVersion = 1;
  #dbPromise = null;

  #open() {
    if (this.#dbPromise) return this.#dbPromise;
    this.#dbPromise = new Promise((resolve, reject) => {
      var request = indexedDB.open(this.#dbName, this.#dbVersion);
      request.onupgradeneeded = (event) => {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.#dbPromise;
  }

  async getKey() {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('keys', 'readonly');
      var req = tx.objectStore('keys').get('backup-key');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveKey(key, saltHex, iterations) {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('keys', 'readwrite');
      var req = tx.objectStore('keys').put({
        id: 'backup-key',
        key,
        saltHex,
        iterations,
        createdAt: new Date().toISOString(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearKey() {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('keys', 'readwrite');
      var req = tx.objectStore('keys').delete('backup-key');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async saveSnapshot(json) {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('snapshots', 'readwrite');
      var req = tx.objectStore('snapshots').put({
        id: 'pre-restore',
        json,
        createdAt: new Date().toISOString(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSnapshot() {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('snapshots', 'readonly');
      var req = tx.objectStore('snapshots').get('pre-restore');
      req.onsuccess = () => resolve(req.result ? req.result.json : null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearSnapshot() {
    var db = await this.#open();
    return new Promise((resolve, reject) => {
      var tx = db.transaction('snapshots', 'readwrite');
      var req = tx.objectStore('snapshots').delete('pre-restore');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
