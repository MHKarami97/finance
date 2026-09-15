import { TopBar } from '../components/TopBar.js';
import { InstallmentFormModal } from '../components/InstallmentFormModal.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { InstallmentService } from '../../application/InstallmentService.js';

/**
 * Page: InstallmentsPage ("اقساط")
 * Lists every installment / loan / bill the user has recorded and lets
 * them add, edit or remove entries via InstallmentFormModal. Amounts
 * follow the app-wide convention of Toman (تومان); dates are rendered in
 * Jalali via the shared JalaliCalendar adapter.
 */
export class InstallmentsPage {
  constructor({ installmentService }) {
    this.installmentService = installmentService;
    this.content = null;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('اقساط', {
      actionIcon: 'fa-plus',
      onAction: () => this.openFormModal(),
    }));

    const content = document.createElement('div');
    content.className = 'page__content installments-page';
    page.appendChild(content);
    this.content = content;

    this.renderList();
    return page;
  }

  #fmt(n) {
    return new Intl.NumberFormat('fa-IR').format(Math.round(n));
  }

  renderList() {
    const items = this.installmentService.listAll();

    if (items.length === 0) {
      this.content.innerHTML = '<p class="empty-state">هنوز هیچ قسط، قرض یا قبضی ثبت نشده است.</p>';
      return;
    }

    const total = this.installmentService.computeTotal();
    this.content.innerHTML = `
      <div class="installment-summary">
        <span class="installment-summary__label">مجموع بدهی‌های ثبت‌شده</span>
        <span class="installment-summary__amount">${this.#fmt(total)} تومان</span>
      </div>
      <div class="installment-list" id="installment-list"></div>
    `;
    const list = this.content.querySelector('#installment-list');

    items.forEach((item) => {
      const due = item.dueDate;
      const overdue = InstallmentService.isOverdue(item);
      const days = InstallmentService.daysUntil(due);

      let metaExtra = '';
      if (due) {
        metaExtra = ` · سررسید ${JalaliCalendar.formatISOToJalali(due)}`;
        metaExtra += overdue
          ? ' <span class="installment-item__overdue">(گذشته از موعد)</span>'
          : (days !== null ? ` (${days} روز مانده)` : '');
      }

      const row = document.createElement('div');
      row.className = `installment-item${overdue ? ' installment-item--overdue' : ''}`;
      row.innerHTML = `
        <div class="installment-item__icon" style="background:${item.kindColor}22;color:${item.kindColor}">
          <i class="fa-solid fa-${item.kindIcon}"></i>
        </div>
        <div class="installment-item__body">
          <span class="installment-item__title">${item.title}</span>
          <span class="installment-item__meta">${item.kindLabel}${metaExtra}</span>
          ${item.cardNumber ? `<span class="installment-item__card"><i class="fa-solid fa-credit-card"></i> ${item.cardNumber}</span>` : ''}
        </div>
        <div class="installment-item__amount">${this.#fmt(item.amount)}</div>
        <div class="installment-item__actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${item.id}"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((i) => i.id === btn.dataset.id);
        this.openFormModal(item);
      });
    });

    list.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('این مورد حذف شود؟')) {
          this.installmentService.remove(btn.dataset.id);
          this.renderList();
        }
      });
    });
  }

  openFormModal(initial = null) {
    InstallmentFormModal.open({
      initial,
      onSubmit: (dto) => {
        if (initial) this.installmentService.update(initial.id, dto);
        else this.installmentService.create(dto);
        this.renderList();
      },
    });
  }
}
