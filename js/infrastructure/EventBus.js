/**
 * Infrastructure: EventBus (Observer Pattern / Mediator)
 * Decouples application services from presentation layer. Services publish
 * domain events; UI components subscribe and re-render reactively.
 */
export class EventBus {
  #listeners = new Map();

  subscribe(eventName, handler) {
    if (!this.#listeners.has(eventName)) this.#listeners.set(eventName, new Set());
    this.#listeners.get(eventName).add(handler);
    return () => this.#listeners.get(eventName).delete(handler);
  }

  publish(eventName, payload) {
    this.#listeners.get(eventName)?.forEach((handler) => handler(payload));
  }
}
