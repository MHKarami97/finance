import { CLOUD_CONFIG } from './cloudConfig.js';
import { CloudSyncError } from './CloudSyncError.js';

var API = 'https://www.googleapis.com/drive/v3/files';
var UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
var FILE_FIELDS = 'id,name,modifiedTime,size,appProperties';

export class DriveAppDataClient {
  #auth;
  #namePrefix;

  constructor(auth, namePrefix) {
    this.#auth = auth;
    this.#namePrefix = namePrefix;
  }

  async list() {
    var query = encodeURIComponent(`name contains '${this.#namePrefix}' and trashed = false`);
    var url =
      `${API}?spaces=appDataFolder&q=${query}&orderBy=modifiedTime desc&pageSize=50` +
      `&fields=files(${FILE_FIELDS})`;
    var response = await this.#request(url);
    var body = await response.json();
    return body.files ?? [];
  }

  async read(fileId) {
    var response = await this.#request(`${API}/${fileId}?alt=media`);
    return response.text();
  }

  async create(name, content, appProperties) {
    var metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json', appProperties };
    var size = new Blob([content]).size;
    return size <= CLOUD_CONFIG.inlineUploadLimitBytes
      ? this.#createMultipart(metadata, content)
      : this.#createResumable(metadata, content);
  }

  async remove(fileId) {
    await this.#request(`${API}/${fileId}`, { method: 'DELETE' });
  }

  async #createMultipart(metadata, content) {
    var boundary = 'fin_' + Math.random().toString(36).slice(2);
    var body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
      content,
      `\r\n--${boundary}--`,
    ]);
    var response = await this.#request(`${UPLOAD}?uploadType=multipart&fields=${FILE_FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    return response.json();
  }

  async #createResumable(metadata, content) {
    var start = await this.#request(`${UPLOAD}?uploadType=resumable&fields=${FILE_FIELDS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    var sessionUrl = start.headers.get('Location');
    if (!sessionUrl) throw new CloudSyncError('API', 'نشست آپلود Google Drive ایجاد نشد.');

    var response = await fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
    if (!response.ok) throw await this.#toError(response);
    return response.json();
  }

  async #request(url, init = {}) {
    var headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.#auth.getToken()}`);
    var response = await fetch(url, { ...init, headers });
    if (!response.ok) throw await this.#toError(response);
    return response;
  }

  async #toError(response) {
    var reason = '';
    try {
      var body = await response.json();
      reason = body?.error?.errors?.[0]?.reason || body?.error?.status || '';
    } catch {
      reason = '';
    }

    if (response.status === 401) {
      this.#auth.clear();
      return new CloudSyncError('AUTH', 'نشست Google منقضی شده است؛ دوباره متصل شوید.');
    }
    if (reason === 'storageQuotaExceeded') {
      return new CloudSyncError('QUOTA', 'فضای Google Drive شما پر است.');
    }
    if (response.status === 429 || reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
      return new CloudSyncError('RATE_LIMIT', 'تعداد درخواست‌ها به Google Drive زیاد بود؛ کمی بعد دوباره تلاش می‌شود.');
    }
    if (response.status === 403) {
      return new CloudSyncError('AUTH', 'دسترسی به Google Drive مجاز نیست؛ اتصال را دوباره برقرار کنید.');
    }
    return new CloudSyncError('API', `خطای Google Drive (کد ${response.status}).`);
  }
}
