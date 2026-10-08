import { StorageGateway } from '../infrastructure/StorageGateway.js';

const FORMAT = 'finance-pwa-backup';
const VERSION = 2;
const KEY_PATTERN = /^[a-z0-9-]{1,40}$/;
const THEMES = ['dark', 'light'];
const LEGACY_KEYS = ['transactions', 'categories', 'wallets'];

const LABELS = Object.freeze({
  transactions: 'تراکنش‌ها',
  categories: 'دسته‌بندی‌ها',
  wallets: 'کیف پول‌ها',
  budgets: 'بودجه‌ها',
  assets: 'دارایی‌ها',
  installments: 'اقساط، قرض و قبض',
  'debt-people': 'افراد (دنگ و قرعه‌کشی)',
  'debt-groups': 'گروه‌های دنگ',
  'debt-expenses': 'خرج‌های دنگ',
  'lottery-pools': 'قرعه‌کشی‌ها',
  theme: 'تم برنامه',
});

/**
 * Application Service: BackupService
 * Full, lossless backup/restore of everything the app keeps in localStorage.
 * The export is a snapshot of every `fin-app::*` key, so a new feature that
 * stores data through StorageGateway is covered automatically — no list of
 * repositories to keep in sync.
 *
 * Backup file (version 2):
 *   { format, version, exportedAt, data: { [storageKey]: value } }
 * Old files ({ transactions, categories, wallets, exportedAt }) are still
 * accepted and are merged into the existing data instead of replacing it.
 */
export class BackupService {
  createBackup(now = new Date()) {
    return { format: FORMAT, version: VERSION, exportedAt: now.toISOString(), data: StorageGateway.exportAll() };
  }

  fileName(now = new Date()) {
    return `financial-backup-${now.toISOString().slice(0, 10)}.json`;
  }

  /** @returns {{ data: object, mode: 'replace' | 'merge' }} validated payload. Throws Error with a Persian message. */
  parse(jsonText) {
    let raw;
    try {
      raw = JSON.parse(jsonText);
    } catch {
      throw new Error('فایل JSON معتبر نیست');
    }
    if (!BackupService.#isPlainObject(raw)) throw new Error('ساختار فایل پشتیبان نامعتبر است');

    let data;
    let mode;
    if (raw.format === FORMAT) {
      if (!Number.isInteger(raw.version) || raw.version > VERSION) {
        throw new Error('این فایل با نسخه جدیدتری از برنامه ساخته شده است');
      }
      data = raw.data;
      mode = 'replace';
    } else if (LEGACY_KEYS.some((key) => key in raw)) {
      data = Object.fromEntries(LEGACY_KEYS.filter((key) => key in raw).map((key) => [key, raw[key]]));
      mode = 'merge';
    } else {
      throw new Error('این فایل پشتیبان این برنامه نیست');
    }

    if (!BackupService.#isPlainObject(data)) throw new Error('بخش داده‌ها در فایل وجود ندارد');
    Object.entries(data).forEach(([key, value]) => BackupService.#assertEntry(key, value));
    return { data, mode };
  }

  summarize(data) {
    return Object.entries(data).map(([key, value]) => ({
      key,
      label: LABELS[key] ?? key,
      count: Array.isArray(value) ? value.length : null,
    }));
  }

  /**
   * 'replace' wipes the app data first so the result equals the backup.
   * If a write fails (e.g. quota), the previous data is put back.
   */
  restore(data, mode = 'replace') {
    const snapshot = StorageGateway.exportAll();
    if (mode === 'replace') StorageGateway.clearAll();

    if (!StorageGateway.importAll(data)) {
      StorageGateway.clearAll();
      StorageGateway.importAll(snapshot);
      throw new Error('بازیابی ناموفق بود (احتمالاً فضای ذخیره‌سازی کافی نیست). اطلاعات قبلی حفظ شد.');
    }
  }

  static #assertEntry(key, value) {
    if (!KEY_PATTERN.test(key)) throw new Error(`کلید نامعتبر در فایل: ${key}`);
    if (key === 'theme') {
      if (!THEMES.includes(value)) throw new Error('مقدار تم نامعتبر است');
      return;
    }
    if (!Array.isArray(value) && !BackupService.#isPlainObject(value)) {
      throw new Error(`داده «${LABELS[key] ?? key}» نامعتبر است`);
    }
  }

  static #isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
