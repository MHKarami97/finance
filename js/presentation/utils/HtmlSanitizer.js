const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes user-provided text (names, titles) before it is interpolated into innerHTML. */
export class HtmlSanitizer {
  static escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);
  }
}
