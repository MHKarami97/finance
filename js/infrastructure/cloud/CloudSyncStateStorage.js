import { CLOUD_CONFIG } from './cloudConfig.js';
import { DEFAULT_CLOUD_STATE } from '../../domain/CloudSync.js';

export class CloudSyncStateStorage {
  load() {
    try {
      var raw = localStorage.getItem(CLOUD_CONFIG.stateStorageKey);
      return raw ? { ...DEFAULT_CLOUD_STATE, ...JSON.parse(raw) } : { ...DEFAULT_CLOUD_STATE };
    } catch {
      return { ...DEFAULT_CLOUD_STATE };
    }
  }

  save(state) {
    try {
      localStorage.setItem(CLOUD_CONFIG.stateStorageKey, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode)
    }
  }
}
