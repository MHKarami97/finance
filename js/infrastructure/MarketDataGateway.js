/**
 * Infrastructure: MarketDataGateway (Adapter)
 * Wraps the public TGJU live-price endpoint with a client-side cache: at most
 * one real HTTP request per 60 seconds; every caller within that window
 * receives the same cached snapshot (or the same in-flight promise).
 *
 * NOTE: call2.tgju.org/ajax.json is an undocumented endpoint. Its field names
 * were reverse-engineered from public references and may differ slightly.
 * If an item shows "در دسترس نیست", open the raw response in DevTools and
 * add the correct key to the relevant `candidates` array in
 * MarketPriceService.js / AssetService.js — no other change is needed.
 */
export class MarketDataGateway {
  static #ENDPOINT = 'https://call2.tgju.org/ajax.json';
  static #TTL_MS = 60 * 1000;
  static #cache = null; // { fetchedAt, map }
  static #pending = null;

  static async getSnapshot() {
    const now = Date.now();
    if (MarketDataGateway.#cache && now - MarketDataGateway.#cache.fetchedAt < MarketDataGateway.#TTL_MS) {
      return MarketDataGateway.#cache;
    }
    if (MarketDataGateway.#pending) return MarketDataGateway.#pending;

    MarketDataGateway.#pending = MarketDataGateway.#fetchAndNormalize()
      .then((map) => {
        MarketDataGateway.#cache = { fetchedAt: Date.now(), map };
        MarketDataGateway.#pending = null;
        return MarketDataGateway.#cache;
      })
      .catch((err) => {
        MarketDataGateway.#pending = null;
        if (MarketDataGateway.#cache) return MarketDataGateway.#cache;
        throw err;
      });
    return MarketDataGateway.#pending;
  }

  static async #fetchAndNormalize() {
    const res = await fetch(MarketDataGateway.#ENDPOINT, { cache: 'no-store' });
    if (!res.ok) throw new Error(`TGJU request failed: HTTP ${res.status}`);
    const json = await res.json();
    const bucket = (json && typeof json.current === 'object') ? json.current : json;
    const map = new Map();
    Object.entries(bucket || {}).forEach(([key, value]) => {
      const rial = MarketDataGateway.#extractRial(value);
      if (rial !== null) map.set(key, { key, rial, raw: value });
    });
    return map;
  }

  static #extractRial(value) {
    if (value == null) return null;
    let raw = value;
    if (typeof value === 'object') {
      raw = value.p ?? value.price ?? value.value ?? value.last ?? null;
    }
    if (raw == null) return null;
    const num = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(num) ? num : null;
  }

  static clearCache() {
    MarketDataGateway.#cache = null;
  }
}