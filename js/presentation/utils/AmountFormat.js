const GROUP_FORMATTER = new Intl.NumberFormat('en-US');
const DISPLAY_FORMATTER = new Intl.NumberFormat('fa-IR');
const DECIMAL_FORMATTER = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const DIGIT_PATTERN = /[0-9۰-۹]/;

/**
 * Presentation helper: Toman amounts.
 *  - display: Persian digits with a "," every three digits (e.g. ۱۰,۰۰۰,۰۰۰ تومان)
 *  - input:   live "10,000,000" grouping while typing, caret position preserved
 *  - decimal: one fraction digit for share counts such as ۱٫۵
 */
export class AmountFormat {
  static parseDigits(value) {
    const normalized = String(value ?? '')
      .replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d))
      .replace(/[^\d]/g, '');
    return normalized ? Number(normalized) : null;
  }

  static group(value) {
    const number = AmountFormat.parseDigits(value);
    return number === null ? '' : GROUP_FORMATTER.format(number);
  }

  static number(value) {
    return DISPLAY_FORMATTER.format(Math.round(value || 0)).replace(/٬/g, ',');
  }

  /** Keeps up to one decimal digit (share counts: ۰٫۵ / ۱ / ۱٫۵). */
  static decimal(value) {
    return DECIMAL_FORMATTER.format(value || 0).replace(/٬/g, ',');
  }

  static toman(value) {
    return `${AmountFormat.number(value)} تومان`;
  }

  static bindGroupedInput(input) {
    input.addEventListener('input', () => {
      const caret = input.selectionStart ?? input.value.length;
      let digitsBeforeCaret = 0;
      for (const char of input.value.slice(0, caret)) {
        if (DIGIT_PATTERN.test(char)) digitsBeforeCaret += 1;
      }

      input.value = AmountFormat.group(input.value);

      let position = 0;
      let seen = 0;
      while (position < input.value.length && seen < digitsBeforeCaret) {
        if (DIGIT_PATTERN.test(input.value[position])) seen += 1;
        position += 1;
      }
      input.setSelectionRange(position, position);
    });
  }
}
