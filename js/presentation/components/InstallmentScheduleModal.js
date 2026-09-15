import { DebtModal } from './DebtModal.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { InstallmentService } from '../../application/InstallmentService.js';

const fmt = (n) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));

/** Human-readable status for a single schedule row: paid / overdue / days-remaining. */
function statusLabel(row) {
  if (row.paid) return 'پرداخت‌شده';
  if (row.overdue) return 'گذشته از موعد';
  const days = InstallmentService.daysUntil(row.dueDate);
  if (days === 0) return 'سررسید امروز';
  return `${days} روز مانده`;
}

function statusClass(row) {
  if (row.paid) return 'installment-schedule__status--paid';
  if (row.overdue) return 'installment-schedule__status--overdue';
  return '';
}

/**
 * Component: InstallmentScheduleModal
 * Reuses the generic DebtModal overlay to show the monthly payment
 * checklist ("نمایش اقساط") for a single installment-kind item: a summary
 * header (paid count / remaining amount) followed by one row per month —
 * sequence badge, Jalali due date, a clear status tag (پرداخت‌شده /
 * گذشته از موعد / X روز مانده), and the per-installment amount — with a
 * checkbox to mark it paid. Paid rows are dimmed with a strike-through;
 * overdue-and-unpaid rows get a red accent so late months stand out.
 */
export class InstallmentScheduleModal {
  static open({ installment, installmentService, onChange }) {
    const schedule = InstallmentService.buildSchedule(installment);
    const perAmount = installment.perInstallmentAmount || 0;
    const paidCount = schedule.filter((row) => row.paid).length;
    const remainingAmount = (schedule.length - paidCount) * perAmount;

    const rowHtml = (row) => `
      <label class="installment-schedule__row${row.paid ? ' installment-schedule__row--paid' : ''}${row.overdue ? ' installment-schedule__row--overdue' : ''}" data-index="${row.index}">
        <input type="checkbox" class="installment-schedule__checkbox" data-index="${row.index}" ${row.paid ? 'checked' : ''} />
        <span class="installment-schedule__badge">${row.index + 1}</span>
        <span class="installment-schedule__info">
          <span class="installment-schedule__date">${JalaliCalendar.formatISOToJalali(row.dueDate)}</span>
          <span class="installment-schedule__status ${statusClass(row)}">${statusLabel(row)}</span>
        </span>
        <span class="installment-schedule__amount">${fmt(row.amount)}</span>
      </label>
    `;

    const bodyHtml = `
      <div class="installment-schedule__summary">
        <span id="schedule-summary-paid">${paidCount} از ${schedule.length} قسط پرداخت‌شده</span>
        <span class="installment-schedule__summary-remaining" id="schedule-summary-remaining">مانده: ${fmt(remainingAmount)} تومان</span>
      </div>
      <div class="installment-schedule">
        ${schedule.length ? schedule.map(rowHtml).join('') : '<p class="empty-state">برای این مورد تعداد اقساط ثبت نشده است.</p>'}
      </div>
    `;

    return DebtModal.open({
      title: `جدول اقساط: ${installment.title}`,
      bodyHtml,
      showFooter: false,
      onMount: (bodyEl) => {
        bodyEl.querySelectorAll('.installment-schedule__checkbox').forEach((checkbox) => {
          checkbox.addEventListener('change', () => {
            const index = Number(checkbox.dataset.index);
            installmentService.togglePaid(installment.id, index);

            const refreshed = installmentService.listAll().find((i) => i.id === installment.id);
            const updatedSchedule = InstallmentService.buildSchedule(refreshed);
            const updatedRow = updatedSchedule[index];

            const rowEl = checkbox.closest('.installment-schedule__row');
            rowEl.classList.toggle('installment-schedule__row--paid', Boolean(updatedRow?.paid));
            rowEl.classList.toggle('installment-schedule__row--overdue', Boolean(updatedRow?.overdue));

            const statusEl = rowEl.querySelector('.installment-schedule__status');
            statusEl.textContent = statusLabel(updatedRow);
            statusEl.className = `installment-schedule__status ${statusClass(updatedRow)}`;

            const newPaidCount = updatedSchedule.filter((row) => row.paid).length;
            const newRemaining = (updatedSchedule.length - newPaidCount) * (refreshed.perInstallmentAmount || 0);
            bodyEl.querySelector('#schedule-summary-paid').textContent = `${newPaidCount} از ${updatedSchedule.length} قسط پرداخت‌شده`;
            bodyEl.querySelector('#schedule-summary-remaining').textContent = `مانده: ${fmt(newRemaining)} تومان`;

            onChange?.();
          });
        });
      },
    });
  }
}