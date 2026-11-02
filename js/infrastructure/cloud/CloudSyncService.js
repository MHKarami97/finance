import { CLOUD_CONFIG } from './cloudConfig.js';
import { CLOUD_SYNC_STATUS } from '../../domain/CloudSync.js';
import { StorageGateway } from '../StorageGateway.js';
import { mergeStorageData } from './mergeStorageData.js';
import { deriveKey, newSaltHex } from './cloudCrypto.js';
import { CloudSyncError, toUserMessage } from './CloudSyncError.js';

export class CloudSyncService {
  #auth;
  #drive;
  #codec;
  #vault;
  #storage;

  #state;
  #status;
  #decision = null;
  #hasRollback = false;
  #listeners = new Set();
  #dismissedRemoteIds = new Set();
  #debounceTimer;
  #running = false;
  #rerunRequested = false;
  #suppressDirty = false;
  #started = false;
  #lastSilentAttemptAt = 0;
  #onDataRestored = async () => {};

  constructor({ auth, drive, codec, vault, storage }) {
    this.#auth = auth;
    this.#drive = drive;
    this.#codec = codec;
    this.#vault = vault;
    this.#storage = storage;
    this.#state = this.#storage.load();
    this.#status = this.#state.connected ? CLOUD_SYNC_STATUS.IDLE : CLOUD_SYNC_STATUS.DISCONNECTED;
  }

  isSuppressingDirty() {
    return this.#suppressDirty;
  }

  setDataRestoredHandler(handler) {
    this.#onDataRestored = handler;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  getSnapshot() {
    return {
      ...this.#state,
      status: this.#status,
      hasRollbackSnapshot: this.#hasRollback,
      decision: this.#decision,
    };
  }

  async start() {
    if (this.#started) return;
    this.#started = true;
    this.#installDirtyHooks();
    this.#installConnectivityListeners();
    this.#hasRollback = (await this.#vault.getSnapshot()) !== null;
    this.#emit();
    if (this.#isOnline()) this.preload();

    if (!this.#state.connected || !this.#isOnline()) return;
    if (!(await this.#ensureAuthorized('silent'))) {
      this.#setStatus(CLOUD_SYNC_STATUS.NEEDS_RECONNECT);
      return;
    }
    await this.#guarded(() => this.#reconcile());
  }

  preload() {
    this.#auth.preload();
  }

  async connect() {
    var granted = this.#auth.isAuthorized || (await this.#auth.requestAccess('interactive'));
    if (!granted) {
      throw new CloudSyncError('AUTH', 'اتصال به Google انجام نشد یا دسترسی داده نشد.');
    }
    this.#patch({ connected: true, lastError: null });
    await this.#guarded(() => this.#reconcile());
  }

  async disconnect(deleteRemote) {
    window.clearTimeout(this.#debounceTimer);
    if (deleteRemote) {
      try {
        if (await this.#ensureAuthorized('interactive')) {
          var files = await this.#drive.list();
          for (var file of files) await this.#drive.remove(file.id);
        }
      } catch {
        // Remote cleanup is best-effort
      }
    }
    try {
      await this.#auth.revoke();
    } catch {
      this.#auth.clear();
    }
    this.#decision = null;
    this.#patch({
      connected: false,
      lastSyncedHash: null,
      lastRemoteModifiedTime: null,
      lastError: null,
      dirtyAt: null,
      forceUpload: false,
    });
    this.#setStatus(CLOUD_SYNC_STATUS.DISCONNECTED);
  }

  async backupNow(trigger = 'manual') {
    if (!this.#state.connected || this.#decision) return;
    if (!this.#isOnline()) return;
    var mode = trigger === 'manual' ? 'interactive' : 'silent';
    if (!(await this.#ensureAuthorized(mode))) {
      this.#setStatus(CLOUD_SYNC_STATUS.NEEDS_RECONNECT);
      return;
    }
    await this.#guarded(() => this.#uploadIfChanged());
  }

  async resolveRestore(mode, passphrase) {
    var pending = this.#decision;
    if (!pending) return;
    if (!(await this.#ensureAuthorized('interactive'))) {
      throw new CloudSyncError('AUTH', 'برای ادامه باید دسترسی Google را تأیید کنید.');
    }

    var targetDecision = pending;
    await this.#guarded(async () => {
      var content = await this.#drive.read(targetDecision.remote.id);
      var payload = await this.#codec.open(content, passphrase);

      var currentSnapshot = await this.#codec.snapshotLocal();
      await this.#vault.saveSnapshot(JSON.stringify(currentSnapshot.payload));
      this.#hasRollback = true;

      await this.#withoutDirtyTracking(async () => {
        if (mode === 'replace') {
          StorageGateway.clearAll();
          StorageGateway.importAll(payload.data || {});
        } else {
          var localData = StorageGateway.exportAll();
          var merged = mergeStorageData(localData, payload.data || {});
          StorageGateway.clearAll();
          StorageGateway.importAll(merged);
        }
      });

      await this.#onDataRestored();
      this.#decision = null;
      if (await this.#vault.getKey()) this.#patch({ encryptionEnabled: true });

      var remoteHash = targetDecision.remote.appProperties?.contentHash ?? null;
      if (mode === 'merge') {
        var mergedLocal = await this.#codec.snapshotLocal();
        await this.#upload(mergedLocal, this.#state.encryptionEnabled, await this.#drive.list());
      } else {
        var local = await this.#codec.snapshotLocal();
        this.#markSuccess(remoteHash ?? local.fingerprint.contentHash, targetDecision.remote.modifiedTime);
      }
    }, true);
  }

  async resolveKeepLocal() {
    if (!this.#decision) return;
    if (!(await this.#ensureAuthorized('interactive'))) {
      throw new CloudSyncError('AUTH', 'برای ادامه باید دسترسی Google را تأیید کنید.');
    }
    await this.#guarded(async () => {
      var local = await this.#codec.snapshotLocal();
      var remotes = await this.#drive.list();
      this.#decision = null;
      await this.#upload(local, this.#state.encryptionEnabled, remotes);
    });
  }

  dismissDecision() {
    if (!this.#decision) return;
    this.#dismissedRemoteIds.add(this.#decision.remote.id);
    this.#decision = { ...this.#decision, dismissed: true };
    this.#emit();
  }

  reopenDecision() {
    if (!this.#decision) return;
    this.#decision = { ...this.#decision, dismissed: false };
    this.#emit();
  }

  async rollbackLastRestore() {
    var json = await this.#vault.getSnapshot();
    if (!json) throw new CloudSyncError('INVALID_BACKUP', 'نسخه‌ی قبل از بازیابی موجود نیست.');
    var payload = JSON.parse(json);
    await this.#withoutDirtyTracking(async () => {
      StorageGateway.clearAll();
      StorageGateway.importAll(payload.data || {});
    });
    await this.#vault.clearSnapshot();
    this.#hasRollback = false;
    await this.#onDataRestored();
    this.#emit();
    this.markDirty();
  }

  async enableEncryption(passphrase) {
    if (passphrase.length < CLOUD_CONFIG.minPassphraseLength) {
      throw new CloudSyncError(
        'PASSPHRASE_INVALID',
        `رمز عبور باید حداقل ${CLOUD_CONFIG.minPassphraseLength} نویسه باشد.`,
      );
    }

    var previous = await this.#vault.getKey();
    var verified = false;
    if (this.#state.connected && this.#isOnline() && this.#auth.isAuthorized) {
      var latest = (await this.#drive.list())[0];
      if (latest?.appProperties?.encrypted === '1') {
        await this.#vault.clearKey();
        try {
          await this.#codec.open(await this.#drive.read(latest.id), passphrase);
          verified = true;
        } catch (error) {
          if (previous) await this.#vault.saveKey(previous.key, previous.saltHex, previous.iterations);
          throw error;
        }
      }
    }

    if (!verified) {
      var saltHex = newSaltHex();
      var key = await deriveKey(passphrase, saltHex, CLOUD_CONFIG.pbkdf2Iterations);
      await this.#vault.saveKey(key, saltHex, CLOUD_CONFIG.pbkdf2Iterations);
    }

    this.#patch({ encryptionEnabled: true, forceUpload: this.#state.connected });
    if (this.#state.connected) this.#scheduleBackup(500);
  }

  async disableEncryption() {
    await this.#vault.clearKey();
    this.#patch({ encryptionEnabled: false, forceUpload: this.#state.connected });
    if (this.#state.connected) this.#scheduleBackup(500);
  }

  setNotifyFailures(value) {
    this.#patch({ notifyFailures: value });
  }

  markDirty() {
    this.#patch({ dirtyAt: new Date().toISOString() });
    if (this.#state.connected && !this.#decision) {
      this.#scheduleBackup(CLOUD_CONFIG.autoBackupDebounceMs);
    }
  }

  #scheduleBackup(delayMs) {
    window.clearTimeout(this.#debounceTimer);
    this.#debounceTimer = window.setTimeout(() => void this.backupNow('auto'), delayMs);
  }

  async #reconcile() {
    var local = await this.#codec.snapshotLocal();
    var remotes = await this.#drive.list();
    var latest = remotes[0];

    if (!latest) {
      if (local.fingerprint.itemsCount > 0) {
        await this.#upload(local, this.#state.encryptionEnabled, []);
      } else {
        this.#markSuccess(local.fingerprint.contentHash, null);
      }
      return;
    }

    var remoteHash = latest.appProperties?.contentHash ?? null;
    var localHash = local.fingerprint.contentHash;

    if (remoteHash === localHash && !this.#state.forceUpload) {
      this.#markSuccess(localHash, latest.modifiedTime);
      return;
    }
    if (local.fingerprint.itemsCount === 0) {
      this.#raiseDecision('remote-only', latest, local);
      return;
    }

    var lastHash = this.#state.lastSyncedHash;
    var remoteUnchanged = !!lastHash && remoteHash === lastHash;
    var localUnchanged = !!lastHash && localHash === lastHash;

    if (remoteUnchanged) {
      await this.#upload(local, this.#state.encryptionEnabled, remotes);
      return;
    }
    this.#raiseDecision(localUnchanged ? 'remote-newer' : 'conflict', latest, local);
  }

  async #uploadIfChanged() {
    var local = await this.#codec.snapshotLocal();
    var localHash = local.fingerprint.contentHash;
    if (!this.#state.forceUpload && localHash === this.#state.lastSyncedHash) {
      this.#markSuccess(localHash, this.#state.lastRemoteModifiedTime);
      return;
    }

    var remotes = await this.#drive.list();
    var latest = remotes[0];
    if (latest) {
      var remoteHash = latest.appProperties?.contentHash ?? null;
      if (remoteHash === localHash && !this.#state.forceUpload) {
        this.#markSuccess(localHash, latest.modifiedTime);
        return;
      }
      if (remoteHash !== this.#state.lastSyncedHash) {
        this.#raiseDecision('conflict', latest, local);
        return;
      }
    }
    await this.#upload(local, this.#state.encryptionEnabled, remotes);
  }

  async #upload(local, encrypt, existing) {
    var content = await this.#codec.serialize(local, encrypt);
    var stamp = new Date().toISOString().replace(/[:.]/g, '-');
    var created = await this.#drive.create(
      `${CLOUD_CONFIG.backupFilePrefix}${stamp}.json`,
      content,
      {
        contentHash: local.fingerprint.contentHash,
        itemsCount: String(local.fingerprint.itemsCount),
        encrypted: encrypt ? '1' : '0',
        schema: '2',
        deviceId: this.#getDeviceId(),
      },
    );
    await this.#prune([created, ...existing]);
    this.#markSuccess(local.fingerprint.contentHash, created.modifiedTime);
  }

  async #prune(files) {
    var sorted = [...files].sort((a, b) => (a.modifiedTime < b.modifiedTime ? 1 : -1));
    for (var stale of sorted.slice(CLOUD_CONFIG.keepVersions)) {
      try {
        await this.#drive.remove(stale.id);
      } catch {
        // Ignored
      }
    }
  }

  #raiseDecision(kind, remote, local) {
    this.#decision = {
      kind,
      remote,
      remoteItemsCount: Number(remote.appProperties?.itemsCount ?? 0),
      localItemsCount: local.fingerprint.itemsCount,
      remoteEncrypted: remote.appProperties?.encrypted === '1',
      dismissed: this.#dismissedRemoteIds.has(remote.id),
    };
    this.#setStatus(CLOUD_SYNC_STATUS.DECISION_PENDING);
  }

  async #guarded(task, rethrowPassphraseErrors = false) {
    if (this.#running) {
      this.#rerunRequested = true;
      return;
    }
    this.#running = true;
    this.#setStatus(CLOUD_SYNC_STATUS.SYNCING);
    try {
      await task();
      if (this.#status === CLOUD_SYNC_STATUS.SYNCING) {
        this.#setStatus(this.#decision ? CLOUD_SYNC_STATUS.DECISION_PENDING : CLOUD_SYNC_STATUS.IDLE);
      }
    } catch (error) {
      var isPassphrase =
        error instanceof CloudSyncError &&
        (error.code === 'PASSPHRASE_REQUIRED' || error.code === 'PASSPHRASE_INVALID');
      if (isPassphrase && rethrowPassphraseErrors) {
        this.#setStatus(this.#decision ? CLOUD_SYNC_STATUS.DECISION_PENDING : CLOUD_SYNC_STATUS.IDLE);
        throw error;
      }
      this.#fail(error);
    } finally {
      this.#running = false;
      if (this.#rerunRequested) {
        this.#rerunRequested = false;
        this.#scheduleBackup(1000);
      }
    }
  }

  #fail(error) {
    var needsReconnect = error instanceof CloudSyncError && error.code === 'AUTH';
    this.#patch({ lastError: toUserMessage(error) });
    this.#setStatus(needsReconnect ? CLOUD_SYNC_STATUS.NEEDS_RECONNECT : CLOUD_SYNC_STATUS.ERROR);
  }

  #markSuccess(hash, remoteModifiedTime) {
    this.#patch({
      lastSyncedHash: hash,
      lastRemoteModifiedTime: remoteModifiedTime,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      dirtyAt: null,
      forceUpload: false,
    });
    this.#setStatus(CLOUD_SYNC_STATUS.SUCCESS);
  }

  async #ensureAuthorized(mode) {
    if (this.#auth.isAuthorized) return true;
    if (mode === 'interactive') return this.#auth.requestAccess('interactive');

    var now = Date.now();
    if (now - this.#lastSilentAttemptAt < CLOUD_CONFIG.silentRetryCooldownMs) return false;
    this.#lastSilentAttemptAt = now;
    return this.#auth.requestAccess('silent');
  }

  async #withoutDirtyTracking(action) {
    this.#suppressDirty = true;
    try {
      return await action();
    } finally {
      this.#suppressDirty = false;
    }
  }

  #installDirtyHooks() {
    var onChange = () => {
      if (this.#suppressDirty) return;
      window.setTimeout(() => this.markDirty(), 0);
    };

    StorageGateway.onChange(onChange);
  }

  #installConnectivityListeners() {
    window.addEventListener('online', () => void this.#syncSoon());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.#state.dirtyAt) void this.#syncSoon();
    });
  }

  async #syncSoon() {
    if (!this.#state.connected || this.#decision || !this.#isOnline()) return;
    if (this.#state.dirtyAt || this.#status === CLOUD_SYNC_STATUS.ERROR) this.#scheduleBackup(1000);
  }

  #isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  #getDeviceId() {
    try {
      var existing = localStorage.getItem(CLOUD_CONFIG.deviceIdStorageKey);
      if (existing) return existing;
      var created = crypto.randomUUID().slice(0, 8);
      localStorage.setItem(CLOUD_CONFIG.deviceIdStorageKey, created);
      return created;
    } catch {
      return 'unknown';
    }
  }

  #setStatus(status) {
    this.#status = status;
    this.#emit();
  }

  #patch(partial) {
    this.#state = { ...this.#state, ...partial };
    this.#storage.save(this.#state);
    this.#emit();
  }

  #emit() {
    var snapshot = this.getSnapshot();
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}
