import { DebtModal } from './DebtModal.js';
import { DateBoxField } from './DateBoxField.js';
import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';

/**
 * Component: LotteryPaymentModal
 * Records a dated cash event for one person: an installment payment
 * (default wording) or the receipt of the loan by a winner (custom wording).
 */
export class LotteryPaymentModal {
  static open({
    personName,
    amount,
    title,
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
