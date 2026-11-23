import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Component: TransactionListItem
 * Renders a single transaction row with category icon, amount, and date.
 */
export class TransactionListItem {
  static render(transaction, category, onClick) {
    const isExpense = transaction.type === 'expense';
    const el = document.createElement('div');
    el.className = 'txn-item';
    el.innerHTML = `
      <div class="txn-item__icon" style="background:${category?.color || '#64748b'}20;color:${category?.color || '#64748b'};border:1px solid ${category?.color || '#64748b'}35;">
        <i class="fa-solid fa-${category?.icon || 'tag'}"></i>
      </div>
      <div class="txn-item__body">
        <span class="txn-item__title">${category?.name || 'بدون دسته'}</span>
        <span class="txn-item__date">${JalaliCalendar.formatISOToJalali(transaction.date)}${transaction.note ? ' · ' + transaction.note : ''}</span>
      </div>
      <span class="txn-item__amount ${isExpense ? 'txn-item__amount--negative' : 'txn-item__amount--positive'}">
        ${isExpense ? '-' : '+'}${new Intl.NumberFormat('fa-IR').format(transaction.money.amount)}
        <small class="txn-item__unit">تومان</small>
      </span>
    `;
    el.addEventListener('click', () => onClick?.(transaction));
    return el;
  }
}
