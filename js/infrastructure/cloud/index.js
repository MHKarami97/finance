import { CLOUD_CONFIG } from './cloudConfig.js';
import { CloudBackupCodec } from './CloudBackupCodec.js';
import { CloudKeyVault } from './CloudKeyVault.js';
import { CloudSyncService } from './CloudSyncService.js';
import { CloudSyncStateStorage } from './CloudSyncStateStorage.js';
import { DriveAppDataClient } from './DriveAppDataClient.js';
import { GoogleAuthService } from './GoogleAuthService.js';
import { GoogleIdentityLoader } from './GoogleIdentityLoader.js';

var vault = new CloudKeyVault();
var auth = new GoogleAuthService(
  CLOUD_CONFIG.googleClientId,
  CLOUD_CONFIG.scope,
  new GoogleIdentityLoader(),
);

export var cloudSyncService = new CloudSyncService({
  auth,
  drive: new DriveAppDataClient(auth, CLOUD_CONFIG.backupFilePrefix),
  codec: new CloudBackupCodec(vault),
  vault,
  storage: new CloudSyncStateStorage(),
});
