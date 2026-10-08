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

  /** Writes a plain (non-JSON) string, e.g. the theme name which ThemeManager stores raw. */
  static writeRaw(key, text) {
    try {
      localStorage.setItem(StorageGateway.#PREFIX + key, String(text));
      return true;
    } catch (err) {
      console.error(`StorageGateway.writeRaw failed for key "${key}"`, err);
      return false;
    }
  }

  /**
   * Snapshot of every app key. Values are parsed JSON, except raw strings such
   * as the theme ("dark"/"light") which are not valid JSON and stay strings.
   */
  static exportAll() {
    const data = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith(StorageGateway.#PREFIX))
      .forEach((k) => {
        const raw = localStorage.getItem(k);
        try {
          data[k.slice(StorageGateway.#PREFIX.length)] = JSON.parse(raw);
        } catch {
          data[k.slice(StorageGateway.#PREFIX.length)] = raw;
        }
      });
    return data;
  }

  /** Writes a snapshot produced by exportAll(). Returns false if any write failed. */
  static importAll(data) {
    let ok = true;
    Object.entries(data).forEach(([key, value]) => {
      const written = typeof value === 'string'
        ? StorageGateway.writeRaw(key, value)
        : StorageGateway.write(key, value);
      ok = written && ok;
    });
    return ok;
  }
}
