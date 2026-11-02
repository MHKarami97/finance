import { cloudSyncService } from '../../infrastructure/cloud/index.js';
import { CLOUD_SYNC_STATUS } from '../../domain/CloudSync.js';
import { CLOUD_CONFIG } from '../../infrastructure/cloud/cloudConfig.js';
import { formatDateTimeFa } from '../../infrastructure/cloud/cloudFormat.js';
import { toUserMessage } from '../../infrastructure/cloud/CloudSyncError.js';

export class CloudBackupCard {
  #container;
  #unsubscribe = null;
  #isWorking = false;

  constructor() {
    this.#container = document.createElement('section');
    this.#container.className = 'settings-group';
  }

  render() {
    this.#update();
    if (!this.#unsubscribe) {
      this.#unsubscribe = cloudSyncService.subscribe(() => {
        this.#update();
      });
    }
    return this.#container;
  }

  destroy() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  #getStatusPill(status, connected) {
    switch (status) {
      case CLOUD_SYNC_STATUS.SUCCESS:
      case CLOUD_SYNC_STATUS.IDLE:
        return connected
          ? '<span class="cloud-status-pill cloud-status-pill--success"><i class="fa-solid fa-check"></i> متصل و همگام</span>'
          : '<span class="cloud-status-pill cloud-status-pill--disconnected">قطع</span>';
      case CLOUD_SYNC_STATUS.SYNCING:
        return '<span class="cloud-status-pill cloud-status-pill--syncing"><i class="fa-solid fa-rotate"></i> در حال همگام‌سازی...</span>';
      case CLOUD_SYNC_STATUS.NEEDS_RECONNECT:
      case CLOUD_SYNC_STATUS.DECISION_PENDING:
        return '<span class="cloud-status-pill cloud-status-pill--warning"><i class="fa-solid fa-triangle-exclamation"></i> نیازمند بررسی</span>';
      case CLOUD_SYNC_STATUS.ERROR:
        return '<span class="cloud-status-pill cloud-status-pill--error"><i class="fa-solid fa-circle-xmark"></i> ناموفق</span>';
      default:
        return '<span class="cloud-status-pill cloud-status-pill--disconnected">قطع</span>';
    }
  }

  #getStatusText(snapshot) {
    switch (snapshot.status) {
      case CLOUD_SYNC_STATUS.DISCONNECTED:
        return 'متصل نیست';
      case CLOUD_SYNC_STATUS.SYNCING:
        return 'در حال همگام‌سازی...';
      case CLOUD_SYNC_STATUS.NEEDS_RECONNECT:
        return 'اتصال به Google نیاز به تأیید دوباره دارد';
      case CLOUD_SYNC_STATUS.ERROR:
        return snapshot.lastError || 'همگام‌سازی ناموفق بود';
      case CLOUD_SYNC_STATUS.DECISION_PENDING:
        return 'نسخه‌ی ابری منتظر تصمیم شماست';
      case CLOUD_SYNC_STATUS.SUCCESS:
        return 'همگام و به‌روز است';
      default:
        return snapshot.lastSuccessAt ? 'همگام و به‌روز است' : 'متصل است؛ هنوز پشتیبانی گرفته نشده';
    }
  }

  #update() {
    var snapshot = cloudSyncService.getSnapshot();
    var minLength = CLOUD_CONFIG.minPassphraseLength;
    var statusPillHtml = this.#getStatusPill(snapshot.status, snapshot.connected);
    var statusText = this.#getStatusText(snapshot);
    var lastSuccessText = formatDateTimeFa(snapshot.lastSuccessAt);

    this.#container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 var(--space-2); margin-bottom: var(--space-1);">
        <h3 class="settings-group__title" style="margin: 0; padding: 0;">پشتیبان‌گیری خودکار در Google Drive</h3>
        ${statusPillHtml}
      </div>

      <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; padding: 0 var(--space-2); margin-bottom: var(--space-2);">
        نسخه‌ی پشتیبان در پوشه‌ی مخفی اختصاصی همین برنامه در Google Drive شخصی شما (appDataFolder) ذخیره می‌شود
        و سایر برنامه‌ها به آن دسترسی ندارند. پس از هر تغییر دیتا، پشتیبان‌گیری به‌صورت خودکار با چند ثانیه تأخیر انجام می‌شود.
      </p>

      <div class="cloud-status-box">
        <div class="cloud-status-row">
          <span class="cloud-status-label">وضعیت اتصال:</span>
          <span class="cloud-status-val">${statusText}</span>
        </div>
        ${
          snapshot.connected && lastSuccessText
            ? `
          <div class="cloud-status-row">
            <span class="cloud-status-label">آخرین پشتیبان موفق:</span>
            <span class="cloud-status-val">${lastSuccessText}</span>
          </div>
        `
            : ''
        }
        ${
          snapshot.connected && snapshot.status !== CLOUD_SYNC_STATUS.ERROR && snapshot.lastError
            ? `
          <p class="cloud-status-error">${snapshot.lastError}</p>
        `
            : ''
        }
      </div>

      <div class="cloud-actions-row">
        ${
          !snapshot.connected
            ? `
          <button type="button" class="btn btn--primary" id="cloud-connect-btn">
            <i class="fa-solid fa-link"></i>
            <span>اتصال به Google Drive</span>
          </button>
        `
            : `
          ${
            snapshot.status === CLOUD_SYNC_STATUS.NEEDS_RECONNECT || snapshot.status === CLOUD_SYNC_STATUS.ERROR
              ? `
            <button type="button" class="btn btn--outline" id="cloud-reconnect-btn">
              <i class="fa-solid fa-rotate"></i>
              <span>اتصال دوباره</span>
            </button>
          `
              : ''
          }
          ${
            snapshot.decision && snapshot.decision.dismissed
              ? `
            <button type="button" class="btn btn--outline" id="cloud-review-btn">
              <i class="fa-solid fa-cloud"></i>
              <span>بررسی نسخه‌ی ابری</span>
            </button>
          `
              : ''
          }
          <button type="button" class="btn btn--primary" id="cloud-backup-now-btn" ${this.#isWorking || snapshot.status === CLOUD_SYNC_STATUS.SYNCING ? 'disabled' : ''}>
            <i class="fa-solid fa-rotate ${snapshot.status === CLOUD_SYNC_STATUS.SYNCING ? 'fa-spin' : ''}"></i>
            <span>پشتیبان‌گیری همین حالا</span>
          </button>
          <button type="button" class="btn btn--outline" id="cloud-disconnect-btn" style="color: var(--negative); border-color: var(--negative);">
            <i class="fa-solid fa-link-slash"></i>
            <span>قطع اتصال</span>
          </button>
        `
        }
      </div>

      <div class="cloud-encryption-panel">
        <div class="cloud-encryption-header">
          <i class="fa-solid fa-shield-halved"></i>
          <span>رمزنگاری سرتاسری اختیاری (Zero-Knowledge)</span>
        </div>

        ${
          snapshot.encryptionEnabled
            ? `
          <div class="cloud-encryption-active">
            <i class="fa-solid fa-circle-check"></i>
            <div>
              <strong>رمزنگاری استاندارد نظامی AES-GCM ۲۵۶ فعال است.</strong>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                تمام اطلاعات پیش از خروج از دستگاه شما رمز می‌شوند و حتی گوگل نیز به محتوای مالی شما دسترسی ندارد.
              </div>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn--outline" id="cloud-disable-enc-btn" style="font-size: 0.8rem; padding: 6px 14px; color: var(--negative);">
              غیرفعال‌سازی رمزنگاری
            </button>
          </div>
        `
            : `
          <p class="cloud-encryption-desc">
            بدون رمزنگاری، محتوای فایل به صورت استاندارد ذخیره می‌شود. با فعال‌سازی، فایل‌ها با کلید مشتق‌شده از گذرواژه شما (PBKDF2 با ۶۰۰٬۰۰۰ دور) رمز می‌شوند.
            <strong>هشدار: در صورت فراموشی گذرواژه، پشتیبان ابری هرگز قابل بازیابی نخواهد بود.</strong>
          </p>

          <div class="cloud-encryption-grid">
            <div class="form">
              <label class="form__label" style="margin: 0;">گذرواژه (حداقل ${minLength} نویسه):</label>
              <input type="password" id="cloud-enc-pass" class="input" placeholder="گذرواژه قوی..." />
            </div>
            <div class="form">
              <label class="form__label" style="margin: 0;">تکرار گذرواژه:</label>
              <input type="password" id="cloud-enc-pass-confirm" class="input" placeholder="تکرار همان گذرواژه..." />
            </div>
          </div>

          <div>
            <button type="button" class="btn btn--outline" id="cloud-enable-enc-btn" style="font-size: 0.85rem; padding: 8px 18px;">
              <i class="fa-solid fa-lock"></i>
              <span>فعال‌سازی رمزنگاری</span>
            </button>
          </div>
        `
        }
      </div>

      <div style="padding: var(--space-2) 0 0 0; display: flex; flex-direction: column; gap: var(--space-2);">
        <label class="cloud-pref-row">
          <input type="checkbox" id="cloud-notify-failures" ${snapshot.notifyFailures ? 'checked' : ''} />
          <span>نمایش نوار هشدار پایین صفحه در صورت عدم موفقیت همگام‌سازی (فقط در حالت آنلاین)</span>
        </label>

        ${
          snapshot.hasRollbackSnapshot
            ? `
          <div class="cloud-rollback-box">
            <span>پیش از آخرین بازیابی ابری، یک نسخه‌ی محلی از دیتای شما ذخیره شده است.</span>
            <button type="button" class="btn btn--outline" id="cloud-rollback-btn" style="font-size: 0.78rem; padding: 6px 12px;">
              <i class="fa-solid fa-clock-rotate-left"></i>
              <span>بازگرداندن به نسخه پیش از بازیابی</span>
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.#attachListeners(snapshot);
  }

  #attachListeners(snapshot) {
    var connectBtn = this.#container.querySelector('#cloud-connect-btn');
    var reconnectBtn = this.#container.querySelector('#cloud-reconnect-btn');
    var backupNowBtn = this.#container.querySelector('#cloud-backup-now-btn');
    var disconnectBtn = this.#container.querySelector('#cloud-disconnect-btn');
    var reviewBtn = this.#container.querySelector('#cloud-review-btn');
    var enableEncBtn = this.#container.querySelector('#cloud-enable-enc-btn');
    var disableEncBtn = this.#container.querySelector('#cloud-disable-enc-btn');
    var notifyCheck = this.#container.querySelector('#cloud-notify-failures');
    var rollbackBtn = this.#container.querySelector('#cloud-rollback-btn');

    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.#run(() => cloudSyncService.connect(), 'اتصال به Google Drive با موفقیت برقرار شد.'));
    }
    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', () => this.#run(() => cloudSyncService.connect(), 'اتصال برقرار شد.'));
    }
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => cloudSyncService.reopenDecision());
    }
    if (backupNowBtn) {
      backupNowBtn.addEventListener('click', () => this.#run(() => cloudSyncService.backupNow('manual'), 'پشتیبان‌گیری در Google Drive انجام شد.'));
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', async () => {
        if (!confirm('اتصال به Google Drive قطع شود؟ پشتیبان‌گیری خودکار متوقف می‌شود.')) return;
        var removeRemote = confirm(
          'آیا نسخه‌های پشتیبان موجود در پوشه مخفی Google Drive هم حذف شوند؟\nتأیید = حذف نسخه‌های ابری، لغو = نگه‌داشتن فایل‌ها در Drive',
        );
        await this.#run(() => cloudSyncService.disconnect(removeRemote), 'اتصال با موفقیت قطع شد.');
      });
    }

    if (enableEncBtn) {
      enableEncBtn.addEventListener('click', async () => {
        var p1 = this.#container.querySelector('#cloud-enc-pass')?.value || '';
        var p2 = this.#container.querySelector('#cloud-enc-pass-confirm')?.value || '';
        if (p1.length < CLOUD_CONFIG.minPassphraseLength) {
          alert(`رمز عبور باید حداقل ${CLOUD_CONFIG.minPassphraseLength} نویسه باشد.`);
          return;
        }
        if (p1 !== p2) {
          alert('رمز عبور و تکرار آن یکسان نیستند.');
          return;
        }
        await this.#run(async () => {
          await cloudSyncService.enableEncryption(p1);
        }, 'رمزنگاری سمت کلاینت با موفقیت فعال شد.');
      });
    }

    if (disableEncBtn) {
      disableEncBtn.addEventListener('click', async () => {
        if (!confirm('از این پس پشتیبان‌های ابری بدون رمزنگاری ذخیره می‌شوند. آیا ادامه می‌دهید؟')) return;
        await this.#run(() => cloudSyncService.disableEncryption(), 'رمزنگاری غیرفعال شد.');
      });
    }

    if (notifyCheck) {
      notifyCheck.addEventListener('change', (e) => {
        cloudSyncService.setNotifyFailures(e.target.checked);
      });
    }

    if (rollbackBtn) {
      rollbackBtn.addEventListener('click', async () => {
        if (!confirm('اطلاعات این دستگاه به وضعیت قبل از آخرین بازیابی ابری بازمی‌گردد. آیا ادامه می‌دهید؟')) return;
        await this.#run(() => cloudSyncService.rollbackLastRestore(), 'داده‌ها به وضعیت پیش از بازیابی برگشت.');
        window.location.reload();
      });
    }
  }

  async #run(action, successMessage) {
    if (this.#isWorking) return;
    this.#isWorking = true;
    try {
      await action();
      if (successMessage) alert(successMessage);
    } catch (err) {
      alert(toUserMessage(err));
    } finally {
      this.#isWorking = false;
      this.#update();
    }
  }
}
