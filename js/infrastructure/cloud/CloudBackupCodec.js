import { StorageGateway } from '../StorageGateway.js';
import { hashSha256, stableStringify, deriveKey, encryptWithKey, decryptWithKey } from './cloudCrypto.js';
import { CLOUD_CONFIG } from './cloudConfig.js';
import { CloudSyncError } from './CloudSyncError.js';

export class CloudBackupCodec {
  #vault;

  constructor(vault) {
    this.#vault = vault;
  }

  async snapshotLocal() {
    var data = StorageGateway.exportAll();
    var payload = {
      format: 'finance-pwa-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data,
    };
    return { payload, fingerprint: await this.fingerprintOf(payload) };
  }

  async fingerprintOf(payload) {
    var contentHash = await hashSha256(stableStringify(payload.data || {}));
    var itemsCount = 0;
    Object.values(payload.data || {}).forEach((val) => {
      if (Array.isArray(val)) itemsCount += val.length;
    });
    return { contentHash, itemsCount };
  }

  async serialize(snapshot, encrypt) {
    var json = JSON.stringify(snapshot.payload);
    if (!encrypt) return json;

    var record = await this.#vault.getKey();
    if (!record) {
      throw new CloudSyncError(
        'KEY_MISSING',
        'کلید رمزنگاری روی این دستگاه موجود نیست؛ رمزنگاری را دوباره فعال کنید.',
      );
    }

    var encrypted = await encryptWithKey(json, record.key);
    var container = {
      format: 'finance-encrypted-backup',
      version: '1.0',
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2',
      iterations: record.iterations,
      salt: record.saltHex,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      checksum: await hashSha256(json),
      meta: {
        createdAt: new Date().toISOString(),
        itemsCount: snapshot.fingerprint.itemsCount,
        contentHash: snapshot.fingerprint.contentHash,
        source: 'cloud',
      },
    };
    return JSON.stringify(container);
  }

  async open(content, passphrase) {
    var parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new CloudSyncError('INVALID_BACKUP', 'فایل پشتیبان ابری آسیب دیده است.');
    }

    if (parsed.format !== 'finance-encrypted-backup') {
      if (parsed.format === 'finance-pwa-backup' && parsed.data) {
        return parsed;
      }
      // Old legacy format
      if (parsed.transactions || parsed.categories || parsed.wallets) {
        return {
          format: 'finance-pwa-backup',
          version: 2,
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          data: parsed,
        };
      }
      throw new CloudSyncError('INVALID_BACKUP', 'فرمت فایل پشتیبان ابری معتبر نیست.');
    }

    var json = await this.#decrypt(parsed, passphrase);
    if ((await hashSha256(json)) !== parsed.checksum) {
      throw new CloudSyncError('INVALID_BACKUP', 'یکپارچگی فایل پشتیبان ابری تأیید نشد.');
    }
    return JSON.parse(json);
  }

  async #decrypt(container, passphrase) {
    if (!passphrase) {
      var record = await this.#vault.getKey();
      var matches =
        !!record && record.saltHex === container.salt && record.iterations === container.iterations;
      if (!record || !matches) {
        throw new CloudSyncError('PASSPHRASE_REQUIRED', 'برای باز کردن این پشتیبان، رمز عبور آن را وارد کنید.');
      }
      try {
        return await decryptWithKey(container.ciphertext, container.iv, record.key);
      } catch {
        throw new CloudSyncError('PASSPHRASE_REQUIRED', 'برای باز کردن این پشتیبان، رمز عبور آن را وارد کنید.');
      }
    }

    if (passphrase.length < CLOUD_CONFIG.minPassphraseLength) {
      throw new CloudSyncError('PASSPHRASE_INVALID', 'رمز عبور وارد شده کوتاه‌تر از حد مجاز است.');
    }

    var key = await deriveKey(passphrase, container.salt, container.iterations);
    try {
      var json = await decryptWithKey(container.ciphertext, container.iv, key);
      await this.#vault.saveKey(key, container.salt, container.iterations);
      return json;
    } catch {
      throw new CloudSyncError('PASSPHRASE_INVALID', 'رمز عبور اشتباه است یا فایل پشتیبان دستکاری شده است.');
    }
  }
}
