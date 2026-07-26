/**
 * Infrastructure: ThemeManager (Singleton-like Adapter)
 * Persists and applies the user's dark/light theme preference by toggling
 * the `data-theme` attribute on <html>, which the CSS tokens in theme.css react to.
 */
export class ThemeManager {
  static #KEY = 'fin-app::theme';

  static init() {
    const saved = localStorage.getItem(ThemeManager.#KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark === false ? 'light' : 'dark');
    ThemeManager.apply(theme);
  }

  static apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(ThemeManager.#KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121212' : '#f7f7f7');
  }

  static current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  static toggle() {
    const next = ThemeManager.current() === 'dark' ? 'light' : 'dark';
    ThemeManager.apply(next);
    return next;
  }
}
