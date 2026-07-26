/**
 * Infrastructure: Router (Simple Hash-based SPA Router)
 * Maps URL hash fragments to page-render callbacks. Kept intentionally minimal
 * (Single Responsibility) — no external routing library is required for a
 * five-page application, avoiding unnecessary complexity (YAGNI).
 */
export class Router {
  #routes = new Map();
  #outlet;
  #onNavigate;

  constructor(outletElement) {
    this.#outlet = outletElement;
    window.addEventListener('hashchange', () => this.#render());
  }

  register(path, renderFn) {
    this.#routes.set(path, renderFn);
    return this;
  }

  onNavigate(callback) {
    this.#onNavigate = callback;
  }

  start() {
    if (!window.location.hash) window.location.hash = '#/dashboard';
    this.#render();
  }

  navigate(path) {
    window.location.hash = path;
  }

  #render() {
    const path = window.location.hash.replace('#', '') || '/dashboard';
    const renderFn = this.#routes.get(path) || this.#routes.get('/dashboard');
    this.#outlet.innerHTML = '';
    this.#outlet.appendChild(renderFn());
    this.#onNavigate?.(path);
    window.scrollTo(0, 0);
  }
}
