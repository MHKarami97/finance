import { CloudSyncError } from './CloudSyncError.js';

var EXPIRY_SAFETY_MS = 60 * 1000;
var SILENT_TIMEOUT_MS = 15 * 1000;

export class GoogleAuthService {
  #clientId;
  #scope;
  #loader;
  #tokenClient = null;
  #accessToken = null;
  #expiresAt = 0;
  #pending = null;

  constructor(clientId, scope, loader) {
    this.#clientId = clientId;
    this.#scope = scope;
    this.#loader = loader;
  }

  get isAuthorized() {
    return this.#accessToken !== null && Date.now() < this.#expiresAt;
  }

  getToken() {
    if (!this.isAuthorized) {
      throw new CloudSyncError('AUTH', 'نشست Google منقضی شده است؛ دوباره متصل شوید.');
    }
    return this.#accessToken;
  }

  preload() {
    this.#loader.load().catch(() => {
      // Offline or blocked; the real request will surface the error.
    });
  }

  clear() {
    this.#accessToken = null;
    this.#expiresAt = 0;
  }

  async requestAccess(mode) {
    if (this.#pending) return this.#pending;
    this.#pending = this.#runRequest(mode).finally(() => {
      this.#pending = null;
    });
    return this.#pending;
  }

  async revoke() {
    var token = this.#accessToken;
    this.clear();
    if (!token) return;
    await this.#loader.load();
    await new Promise((resolve) => {
      window.google.accounts.oauth2.revoke(token, () => resolve());
    });
  }

  async #runRequest(mode) {
    await this.#loader.load();
    var oauth2 = window.google.accounts.oauth2;

    return new Promise((resolveRaw) => {
      var settled = false;
      var timer;
      var resolve = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolveRaw(value);
      };

      if (mode === 'silent') {
        timer = window.setTimeout(() => resolve(false), SILENT_TIMEOUT_MS);
      }

      this.#tokenClient = oauth2.initTokenClient({
        client_id: this.#clientId,
        scope: this.#scope,
        callback: (response) => {
          if (response.error || !response.access_token) return resolve(false);
          if (!oauth2.hasGrantedAllScopes(response, this.#scope)) return resolve(false);
          this.#accessToken = response.access_token;
          this.#expiresAt = Date.now() + Number(response.expires_in || 0) * 1000 - EXPIRY_SAFETY_MS;
          resolve(true);
        },
        error_callback: () => resolve(false),
      });
      this.#tokenClient.requestAccessToken(mode === 'silent' ? { prompt: 'none' } : {});
    });
  }
}
