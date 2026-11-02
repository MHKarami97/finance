/**
 * Date/Time formatter in Persian locale (fa-IR)
 */
export function formatDateTimeFa(iso) {
  if (!iso) return '';
  var date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
