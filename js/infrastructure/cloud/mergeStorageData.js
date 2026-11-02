/**
 * Merges local and remote snapshots produced by StorageGateway.exportAll().
 * - Array collections with `id` (transactions, debts, assets, installments, categories, wallets, etc.):
 *   deduplicates by `id`, keeping newer or merged fields.
 * - Objects: merged recursively.
 * - Primitive settings (e.g. theme): keeps local value if present.
 */
export function mergeStorageData(localData, remoteData) {
  var merged = { ...(localData || {}) };

  for (var [key, remoteVal] of Object.entries(remoteData || {})) {
    var localVal = localData ? localData[key] : undefined;

    if (!localVal) {
      merged[key] = remoteVal;
      continue;
    }

    if (Array.isArray(localVal) && Array.isArray(remoteVal)) {
      var hasId = localVal.some((item) => item && item.id) || remoteVal.some((item) => item && item.id);
      if (hasId) {
        var map = new Map();
        localVal.forEach((item) => {
          if (item && item.id) map.set(item.id, item);
        });
        remoteVal.forEach((item) => {
          if (item && item.id) {
            var existing = map.get(item.id);
            if (existing) {
              var existingDate = existing.updatedAt || existing.date || '';
              var remoteDate = item.updatedAt || item.date || '';
              if (remoteDate >= existingDate) {
                map.set(item.id, { ...existing, ...item });
              }
            } else {
              map.set(item.id, item);
            }
          } else {
            var str = JSON.stringify(item);
            if (!localVal.some((l) => JSON.stringify(l) === str)) {
              localVal.push(item);
            }
          }
        });
        merged[key] = Array.from(map.values());
      } else {
        var set = new Set(localVal.map((x) => JSON.stringify(x)));
        var res = [...localVal];
        remoteVal.forEach((item) => {
          var str = JSON.stringify(item);
          if (!set.has(str)) {
            set.add(str);
            res.push(item);
          }
        });
        merged[key] = res;
      }
    } else if (
      typeof localVal === 'object' &&
      typeof remoteVal === 'object' &&
      localVal !== null &&
      remoteVal !== null
    ) {
      merged[key] = { ...localVal, ...remoteVal };
    } else {
      merged[key] = localVal ?? remoteVal;
    }
  }

  return merged;
}
