/**
 * Infrastructure: Cloud Configuration for Finance PWA
 */
export const CLOUD_CONFIG = Object.freeze({
  // Public identifier (not a secret). Embedded in the bundle by design.
  googleClientId: '627723972815-qrp35936cvbodbo2udkp4qeeh6sgoqms.apps.googleusercontent.com',
  scope: 'https://www.googleapis.com/auth/drive.appdata',
  gsiScriptUrl: 'https://accounts.google.com/gsi/client',
  // Must be unique per app because all apps share one Client ID.
  backupFilePrefix: 'finance-app.backup.',
  keepVersions: 3,
  autoBackupDebounceMs: 15000,
  silentRetryCooldownMs: 5 * 60 * 1000,
  minPassphraseLength: 8,
  // OWASP Password Storage Cheat Sheet recommendation for PBKDF2-HMAC-SHA256 (600,000 iterations)
  pbkdf2Iterations: 600000,
  inlineUploadLimitBytes: 4 * 1024 * 1024,
  stateStorageKey: 'fin-cloudSync::state',
  deviceIdStorageKey: 'fin-cloudSync::deviceId',
  vaultDatabaseName: 'FinanceCloudDB',
});
