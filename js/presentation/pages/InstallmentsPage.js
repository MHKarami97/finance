import { TopBar } from '../components/TopBar.js';
import { InstallmentFormModal } from '../components/InstallmentFormModal.js';
import { InstallmentScheduleModal } from '../components/InstallmentScheduleModal.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { InstallmentService } from '../../application/InstallmentService.js';

/**
 * Page: InstallmentsPage ("اقساط")
 * Shows a live summary (monthly total / paid / remaining), the list of
 * active installments/loans/bills — each with an "نمایش اقساط" checklist
 * button for installment-kind items and an "اتمام" button that moves any
 * item into the "تمام‌شده" section at the bottom — and that finished
 * section itself, with its own paid total.
 *
 * The card's primary figure is always the item's total `amount` (never the
 * per-month amount) so it stays meaningful regardless of kind; for
 * installment-kind items the per-month amount and payment progress are
 * shown as secondary details instead of replacing the total.
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

  fmt(n) {
    return new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));
  }

  renderList() {
    const active = this.installmentService.listActive();
    const completed = this.installmentService.listCompleted();
    const summary = this.installmentService.computeSummary();

    this.content.innerHTML = `
      <div class="installment-summary-grid">
        <div class="installment-summary-card">
          <span class="installment-summary-card__label">جمع اقساط ماهانه</span>
          <span class="installment-summary-card__amount">${this.fmt(summary.monthlyTotal)}</span>
        </div>
        <div class="installment-summary-card">
          <span class="installment-summary-card__label">جمع پرداختی</span>
          <span class="installment-summary-card__amount installment-summary-card__amount--positive">${this.fmt(summary.totalPaid)}</span>
        </div>
        <div class="installment-summary-card">
          <span class="installment-summary-card__label">جمع مانده</span>
          <span class="installment-summary-card__amount installment-summary-card__amount--negative">${this.fmt(summary.totalRemaining)}</span>
        </div>
      </div>
    `;

    if (active.length === 0) {
      this.content.insertAdjacentHTML('beforeend', '<p class="empty-state">هنوز هیچ قسط، قرض یا قبضی ثبت نشده است.</p>');
    } else {
      this.content.insertAdjacentHTML('beforeend', '<div class="installment-list" id="installment-list"></div>');
      this.renderItems(active, this.content.querySelector('#installment-list'), false);
    }

    if (completed.length > 0) {
      this.content.insertAdjacentHTML('beforeend', `
        <div class="installment-completed">
          <div class="section-header">
            <h2>تمام‌شده</h2>
            <span class="installment-completed__total">${this.fmt(summary.totalPaidCompleted)} تومان پرداخت‌شده</span>
          </div>
          <div class="installment-list" id="installment-completed-list"></div>
        </div>
      `);
      this.renderItems(completed, this.content.querySelector('#installment-completed-list'), true);
    }
  }

  renderItems(items, listEl, isCompleted) {
    items.forEach((item) => {
      const due = item.dueDate;
      const overdue = !isCompleted && InstallmentService.isOverdue(item);
      const days = InstallmentService.daysUntil(due);
      const isInstallment = item.kind === 'installment';

      let metaText = '';
      if (isCompleted) {
        metaText = item.completedAt ? `تکمیل‌شده در ${JalaliCalendar.formatISOToJalali(item.completedAt)}` : 'تکمیل‌شده';
      } else if (due) {
        metaText = `سررسید ${JalaliCalendar.formatISOToJalali(due)}`;
        metaText += overdue
          ? ' <span class="installment-item__overdue">(گذشته از موعد)</span>'
          : (days !== null ? ` · ${days} روز مانده` : '');
      }

      let progressHtml = '';
      if (isInstallment && item.installmentCount) {
        const pct = Math.min(Math.round((item.paidCount / item.installmentCount) * 100), 100);
        progressHtml = `
          <div class="installment-item__progress">
            <div class="installment-item__progress-bar"><span style="width:${pct}%"></span></div>
            <span class="installment-item__progress-label">${item.paidCount} از ${item.installmentCount} قسط پرداخت‌شده (${pct}٪)</span>
          </div>
        `;
      }

      const subAmountHtml = isInstallment && item.perInstallmentAmount
        ? `<span class="installment-item__sub-amount">هر قسط: ${this.fmt(item.perInstallmentAmount)}</span>`
        : '';

      const row = document.createElement('div');
      row.className = `installment-item${overdue ? ' installment-item--overdue' : ''}`;
      row.innerHTML = `
        <div class="installment-item__icon" style="background:${item.kindColor}22;color:${item.kindColor}">
          <i class="fa-solid fa-${item.kindIcon}"></i>
        </div>
        <div class="installment-item__body">
          <div class="installment-item__title-row">
            <span class="installment-item__title">${item.title}</span>
            <span class="installment-item__badge" style="background:${item.kindColor}22;color:${item.kindColor}">${item.kindLabel}</span>
          </div>
          ${metaText ? `<span class="installment-item__meta">${metaText}</span>` : ''}
          ${item.cardNumber ? `<span class="installment-item__card"><i class="fa-solid fa-credit-card"></i> ${item.cardNumber}</span>` : ''}
          ${progressHtml}
          ${isInstallment ? '<div class="installment-item__row-actions"><button type="button" class="btn btn--outline btn--small" data-action="schedule">نمایش اقساط</button></div>' : ''}
        </div>
        <div class="installment-item__amount-col">
          <span class="installment-item__amount">${this.fmt(item.amount)}</span>
          ${subAmountHtml}
        </div>
        <div class="installment-item__actions">
          ${isCompleted
            ? '<button type="button" class="icon-btn" data-action="reopen" title="بازگردانی به فعال‌ها"><i class="fa-solid fa-rotate-left"></i></button>'
            : `
              <button type="button" class="icon-btn" data-action="edit"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="icon-btn icon-btn--success" data-action="complete" title="اتمام"><i class="fa-solid fa-flag-checkered"></i></button>
            `}
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(row);

      row.querySelector('[data-action="schedule"]')?.addEventListener('click', () => {
        InstallmentScheduleModal.open({
          installment: item,
          installmentService: this.installmentService,
          onChange: () => this.renderList(),
        });
      });

      row.querySelector('[data-action="edit"]')?.addEventListener('click', () => this.openFormModal(item));

      row.querySelector('[data-action="complete"]')?.addEventListener('click', () => {
        if (confirm(`«${item.title}» به‌عنوان تمام‌شده علامت بخورد و از جمع بدهی حذف شود؟`)) {
          this.installmentService.complete(item.id);
          this.renderList();
        }
      });

      row.querySelector('[data-action="reopen"]')?.addEventListener('click', () => {
        this.installmentService.reopen(item.id);
        this.renderList();
      });

      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm('این مورد کاملاً حذف شود؟')) {
          this.installmentService.remove(item.id);
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