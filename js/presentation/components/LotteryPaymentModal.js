import { DebtModal } from './DebtModal.js';
import { DateBoxField } from './DateBoxField.js';
import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';

/**
 * Component: LotteryPaymentModal
 * Records a dated cash event for one person: an installment payment
 * (default wording) or the receipt of the loan by a winner (custom wording).
 * An optional `note` (plain text) is shown under the amount, e.g. the
 * organizer's card number to transfer to.
 */
export class LotteryPaymentModal {
  static open({
    personName,
    amount,
    title,
    note = '',
    dateLabel = 'تاریخ پرداخت',
    submitLabel = 'ثبت پرداخت',
    onSubmit,
  }) {
    return DebtModal.open({
      title,
      bodyHtml: `
        <div class="lottery-payment-summary">
          <strong>${HtmlSanitizer.escape(personName)}</strong>
          <span>${AmountFormat.toman(amount)}</span>
        </div>
        ${note ? `<p class="lottery-payment-note"><i class="fa-solid fa-circle-info"></i> <span>${HtmlSanitizer.escape(note)}</span></p>` : ''}
        ${DateBoxField.html('lottery-paid-date', dateLabel)}
      `,
      submitLabel,
      onMount: (bodyEl) => ({ dateField: new DateBoxField(bodyEl, 'lottery-paid-date') }),
      onSubmit: (_bodyEl, api) => {
        onSubmit(api.dateField.value);
        return true;
      },
    });
  }
}
