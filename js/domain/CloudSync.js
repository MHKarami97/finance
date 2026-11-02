/**
 * Domain constants and models for Cloud Sync
 */
export const CLOUD_SYNC_STATUS = Object.freeze({
  DISCONNECTED: 'disconnected',
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  NEEDS_RECONNECT: 'needs-reconnect',
  DECISION_PENDING: 'decision-pending',
});

export const DEFAULT_CLOUD_STATE = Object.freeze({
  connected: false,
  encryptionEnabled: false,
  notifyFailures: true,
  lastSyncedHash: null,
  lastSuccessAt: null,
  lastRemoteModifiedTime: null,
  lastError: null,
  dirtyAt: null,
  forceUpload: false,
});
