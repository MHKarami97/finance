import { CLOUD_CONFIG } from './cloudConfig.js';

export class GoogleIdentityLoader {
  #loading = null;

  load() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (this.#loading) return this.#loading;

    this.#loading = new Promise((resolve, reject) => {
      var script = document.createElement('script');
      script.src = CLOUD_CONFIG.gsiScriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        this.#loading = null;
        reject(new TypeError('Google Identity script failed to load'));
      };
      document.head.appendChild(script);
    });
    return this.#loading;
  }
}
