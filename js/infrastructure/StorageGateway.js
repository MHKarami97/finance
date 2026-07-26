/**
 * Infrastructure: StorageGateway
 * Single point of access to localStorage. Applies Single Responsibility Principle:
 * all serialization / persistence concerns are isolated here so repositories
 * remain persistence-agnostic (they only see plain arrays/objects).
 */
export class StorageGateway {
  static #PREFIX = 'fin-app::';

  static read(key, fallback = []) {
    try {
      const raw = localStorage.getItem(StorageGateway.#PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error(`StorageGateway.read failed for key "${key}"`, err);
      return fallback;
    }
  }

  static write(key, value) {
    try {
      localStorage.setItem(StorageGateway.#PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`StorageGateway.write failed for key "${key}"`, err);
      return false;
    }
  }

  static clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(StorageGateway.#PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }

  static exportAll() {
    const data = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith(StorageGateway.#PREFIX))
      .forEach((k) => {
        data[k.replace(StorageGateway.#PREFIX, '')] = JSON.parse(localStorage.getItem(k));
      });
    return data;
  }

  static importAll(data) {
    Object.entries(data).forEach(([key, value]) => StorageGateway.write(key, value));
  }
}
