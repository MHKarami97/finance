/**
 * Error hierarchy and user-facing Persian message translator for Cloud Sync
 */
export class CloudSyncError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CloudSyncError';
    this.code = code;
  }
}

export function toUserMessage(error) {
  if (error instanceof CloudSyncError) return error.message;
  if (error instanceof TypeError) return 'ارتباط با Google Drive برقرار نشد.';
  if (error instanceof Error && error.message) return error.message;
  return 'خطای ناشناخته در همگام‌سازی.';
}
