import { cloudSyncService } from '../../infrastructure/cloud/index.js';
import { CLOUD_SYNC_STATUS } from '../../domain/CloudSync.js';

export class SyncFailedBar {
  static #element = null;
  static #dismissedKey = '';
  static #isRetrying = false;

  static init() {
    cloudSyncService.subscribe(() => {
      SyncFailedBar.update();
    });
    window.addEventListener('online', () => SyncFailedBar.update());
    window.addEventListener('offline', () => SyncFailedBar.update());
    SyncFailedBar.update();
  }

  static update() {
    var snapshot = cloudSyncService.getSnapshot();
    var isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    var status = snapshot.status;

    var shouldShow =
      snapshot.connected &&
      snapshot.notifyFailures &&
      (status === CLOUD_SYNC_STATUS.ERROR || status === CLOUD_SYNC_STATUS.NEEDS_RECONNECT) &&
      isOnline;

    var currentKey = `${status}|${snapshot.lastError || ''}`;
    if (!shouldShow || SyncFailedBar.#dismissedKey === currentKey) {
      if (SyncFailedBar.#element) {
        SyncFailedBar.#element.remove();
        SyncFailedBar.#element = null;
      }
      return;
    }

    var message =
      status === CLOUD_SYNC_STATUS.NEEDS_RECONNECT
        ? 'دیتا همگام‌سازی نشد؛ اتصال به Google Drive نیاز به تأیید دوباره دارد.'
        : `دیتا همگام‌سازی نشد. ${snapshot.lastError || ''}`.trim();

    if (!SyncFailedBar.#element) {
      SyncFailedBar.#element = document.createElement('aside');
      SyncFailedBar.#element.className = 'sync-failed-bar';
      SyncFailedBar.#element.setAttribute('role', 'status');
      SyncFailedBar.#element.setAttribute('aria-live', 'polite');
      document.body.appendChild(SyncFailedBar.#element);
    }

    SyncFailedBar.#element.innerHTML = `
      <div class="sync-failed-bar__content">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span class="sync-failed-bar__msg">${message}</span>
      </div>
      <div class="sync-failed-bar__actions">
        <button type="button" class="sync-failed-bar__retry" id="sync-bar-retry">
          ${SyncFailedBar.#isRetrying ? 'در حال تلاش...' : 'تلاش دوباره'}
        </button>
        <button type="button" class="sync-failed-bar__dismiss" id="sync-bar-dismiss" aria-label="بستن">✕</button>
      </div>
    `;

    var retryBtn = SyncFailedBar.#element.querySelector('#sync-bar-retry');
    var dismissBtn = SyncFailedBar.#element.querySelector('#sync-bar-dismiss');

    retryBtn.addEventListener('click', async () => {
      if (SyncFailedBar.#isRetrying) return;
      SyncFailedBar.#isRetrying = true;
      retryBtn.textContent = 'در حال تلاش...';
      try {
        await cloudSyncService.connect();
      } catch {
        // Will update on status change
      } finally {
        SyncFailedBar.#isRetrying = false;
        SyncFailedBar.update();
      }
    });

    dismissBtn.addEventListener('click', () => {
      SyncFailedBar.#dismissedKey = currentKey;
      SyncFailedBar.update();
    });
  }
}
