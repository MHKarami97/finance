import { cloudSyncService } from '../../infrastructure/cloud/index.js';
import { formatDateTimeFa } from '../../infrastructure/cloud/cloudFormat.js';
import { CloudSyncError, toUserMessage } from '../../infrastructure/cloud/CloudSyncError.js';

export class CloudConflictModal {
  static #element = null;
  static #isWorking = false;
  static #passphraseRequested = false;
  static #mode = 'replace';

  static init() {
    cloudSyncService.subscribe(() => {
      CloudConflictModal.update();
    });
    CloudConflictModal.update();
  }

  static update() {
    var snapshot = cloudSyncService.getSnapshot();
    var decision = snapshot.decision;

    if (!decision || decision.dismissed) {
      if (CloudConflictModal.#element) {
        CloudConflictModal.#element.remove();
        CloudConflictModal.#element = null;
        CloudConflictModal.#passphraseRequested = false;
      }
      return;
    }

    if (CloudConflictModal.#element) return; // Already rendered and interactive

    CloudConflictModal.#mode = decision.kind === 'conflict' ? 'merge' : 'replace';
    CloudConflictModal.#render(decision, snapshot);
  }

  static #render(decision, snapshot) {
    var title = '';
    var description = '';

    switch (decision.kind) {
      case 'conflict':
        title = 'تفاوت بین دیتای این دستگاه و Google Drive';
        description =
          'هم این دستگاه و هم نسخه‌ی ابری از آخرین همگام‌سازی تغییر کرده‌اند. یکی از گزینه‌های زیر را انتخاب کنید.';
        break;
      case 'remote-only':
        title = 'پشتیبان ابری پیدا شد';
        description =
          'این دستگاه هنوز داده‌ای ندارد، اما در Google Drive شما نسخه‌ی پشتیبان موجود است. مایل به بازیابی هستید؟';
        break;
      default:
        title = 'نسخه‌ی جدیدتری در Google Drive هست';
        description =
          'دیتای این دستگاه تغییری نکرده است و نسخه‌ی ابری (احتمالاً از دستگاه دیگر) جدیدتر است.';
        break;
    }

    var needsPassphrase =
      CloudConflictModal.#passphraseRequested ||
      (decision.remoteEncrypted && !snapshot.encryptionEnabled);

    var overlay = document.createElement('div');
    overlay.className = 'cloud-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="cloud-modal-card">
        <div class="cloud-modal-header">
          <h2 class="cloud-modal-title">${title}</h2>
          <button type="button" class="cloud-modal-close" id="cloud-modal-close" aria-label="بستن">✕</button>
        </div>

        <p class="cloud-modal-desc">${description}</p>

        <div class="cloud-comparison-table">
          <div class="cloud-comp-row">
            <span class="cloud-comp-label">تاریخ آخرین نسخه ابری:</span>
            <span class="cloud-comp-val">${formatDateTimeFa(decision.remote.modifiedTime)}</span>
          </div>
          <div class="cloud-comp-row">
            <span class="cloud-comp-label">تعداد رکوردهای داده در Drive:</span>
            <span class="cloud-comp-val cloud-comp-val--accent">${decision.remoteItemsCount}</span>
          </div>
          <div class="cloud-comp-row">
            <span class="cloud-comp-label">تعداد رکوردهای این دستگاه:</span>
            <span class="cloud-comp-val">${decision.localItemsCount}</span>
          </div>
          <div class="cloud-comp-row">
            <span class="cloud-comp-label">نوع رمزنگاری فایل ابری:</span>
            <span class="cloud-comp-val">${decision.remoteEncrypted ? '🔒 AES-GCM (رمزشده)' : 'ساده (بدون رمز)'}</span>
          </div>
        </div>

        ${
          needsPassphrase
            ? `
          <div class="form" id="cloud-passphrase-sec">
            <label class="form__label">گذرواژه رمزگشایی فایل پشتیبان ابری:</label>
            <input type="password" id="cloud-passphrase-input" class="input" placeholder="گذرواژه‌ای که قبلاً تعیین کردید..." />
          </div>
        `
            : ''
        }

        <div class="form">
          <label class="form__label">نحوه اعمال نسخه ابری:</label>
          <div class="cloud-mode-grid">
            <label class="cloud-mode-card ${CloudConflictModal.#mode === 'merge' ? 'cloud-mode-card--active-merge' : ''}" id="mode-merge-label">
              <input type="radio" name="cloud-restore-mode" value="merge" ${CloudConflictModal.#mode === 'merge' ? 'checked' : ''} style="margin-top: 3px;" />
              <div>
                <div class="cloud-mode-title" style="color: var(--accent);">ادغام هوشمند (Merge)</div>
                <div class="cloud-mode-sub">اطلاعات دو طرف تلفیق شده و رکوردهای جدید اضافه می‌شوند.</div>
              </div>
            </label>
            <label class="cloud-mode-card ${CloudConflictModal.#mode === 'replace' ? 'cloud-mode-card--active-replace' : ''}" id="mode-replace-label">
              <input type="radio" name="cloud-restore-mode" value="replace" ${CloudConflictModal.#mode === 'replace' ? 'checked' : ''} style="margin-top: 3px;" />
              <div>
                <div class="cloud-mode-title" style="color: var(--negative);">جایگزینی کامل (Replace)</div>
                <div class="cloud-mode-sub">تمام اطلاعات دستگاه با نسخه ابری جایگزین می‌شود.</div>
              </div>
            </label>
          </div>
          <p class="cloud-reassurance">* پیش از بازیابی، یک اسنپ‌شات محلی از دیتای فعلی ذخیره می‌شود و قابل بازگشت است.</p>
        </div>

        <div id="cloud-modal-error" class="cloud-modal-error" style="display: none;"></div>

        <div class="cloud-modal-actions">
          <button type="button" class="btn btn--primary" id="cloud-modal-restore">
            بازیابی از Google Drive
          </button>
          ${
            decision.localItemsCount > 0
              ? `<button type="button" class="btn btn--outline" id="cloud-modal-keep">نگه‌داشتن دیتای این دستگاه</button>`
              : ''
          }
          <button type="button" class="btn btn--outline" id="cloud-modal-later">بعداً</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    CloudConflictModal.#element = overlay;

    var closeBtn = overlay.querySelector('#cloud-modal-close');
    var laterBtn = overlay.querySelector('#cloud-modal-later');
    var keepBtn = overlay.querySelector('#cloud-modal-keep');
    var restoreBtn = overlay.querySelector('#cloud-modal-restore');
    var errorEl = overlay.querySelector('#cloud-modal-error');
    var passInput = overlay.querySelector('#cloud-passphrase-input');

    var mergeLabel = overlay.querySelector('#mode-merge-label');
    var replaceLabel = overlay.querySelector('#mode-replace-label');
    var radios = overlay.querySelectorAll('input[name="cloud-restore-mode"]');

    radios.forEach((r) => {
      r.addEventListener('change', (e) => {
        CloudConflictModal.#mode = e.target.value;
        mergeLabel.classList.toggle('cloud-mode-card--active-merge', CloudConflictModal.#mode === 'merge');
        replaceLabel.classList.toggle('cloud-mode-card--active-replace', CloudConflictModal.#mode === 'replace');
      });
    });

    var dismissHandler = () => {
      cloudSyncService.dismissDecision();
      overlay.remove();
      CloudConflictModal.#element = null;
    };

    closeBtn.addEventListener('click', dismissHandler);
    laterBtn.addEventListener('click', dismissHandler);

    if (keepBtn) {
      keepBtn.addEventListener('click', async () => {
        if (CloudConflictModal.#isWorking) return;
        CloudConflictModal.#isWorking = true;
        keepBtn.textContent = 'در حال ذخیره...';
        try {
          await cloudSyncService.resolveKeepLocal();
          overlay.remove();
          CloudConflictModal.#element = null;
          alert('دیتای این دستگاه در Google Drive ذخیره شد.');
        } catch (err) {
          errorEl.textContent = toUserMessage(err);
          errorEl.style.display = 'block';
        } finally {
          CloudConflictModal.#isWorking = false;
          if (keepBtn) keepBtn.textContent = 'نگه‌داشتن دیتای این دستگاه';
        }
      });
    }

    restoreBtn.addEventListener('click', async () => {
      if (CloudConflictModal.#isWorking) return;
      var pass = passInput ? passInput.value : undefined;
      CloudConflictModal.#isWorking = true;
      restoreBtn.textContent = 'در حال بازیابی...';
      errorEl.style.display = 'none';

      try {
        await cloudSyncService.resolveRestore(CloudConflictModal.#mode, pass);
        overlay.remove();
        CloudConflictModal.#element = null;
        alert('داده‌ها با موفقیت از Google Drive بازیابی شدند.');
        window.location.reload();
      } catch (err) {
        if (
          err instanceof CloudSyncError &&
          (err.code === 'PASSPHRASE_REQUIRED' || err.code === 'PASSPHRASE_INVALID')
        ) {
          CloudConflictModal.#passphraseRequested = true;
          overlay.remove();
          CloudConflictModal.#element = null;
          CloudConflictModal.update();
        } else {
          errorEl.textContent = toUserMessage(err);
          errorEl.style.display = 'block';
        }
      } finally {
        CloudConflictModal.#isWorking = false;
        if (restoreBtn) restoreBtn.textContent = 'بازیابی از Google Drive';
      }
    });
  }
}
