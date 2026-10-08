import { DebtModal } from './DebtModal.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';

/**
 * Component: LotteryManualDrawModal
 * Lets the user pick the winner(s) of every month by hand. A live counter per
 * person shows how many of their shares are already placed.
 */
export class LotteryManualDrawModal {
  static open({ pool, names, onSubmit }) {
    const people = pool.participants.map((p) => ({ id: p.personId, name: names.get(p.personId) ?? '—', shares: p.shares }));
    const optionsHtml = (selected) => `
      <option value="">— انتخاب —</option>
      ${people.map((p) => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${HtmlSanitizer.escape(p.name)}</option>`).join('')}
    `;

    const rowsHtml = Array.from({ length: pool.totalMonths }, (_, i) => {
      const month = i + 1;
      const existing = pool.winnersOf(month);
      const selects = Array.from({ length: pool.winnersPerMonth }, (_unused, slot) => `
        <select class="input" data-month="${month}" aria-label="برنده ماه ${month}">${optionsHtml(existing[slot])}</select>
      `).join('');
      return `
        <div class="lottery-manual-row">
          <span class="lottery-manual-row__label">${month} · ${JalaliCalendar.formatISOToJalali(pool.dueDateOf(month))}</span>
          <div class="lottery-manual-row__selects">${selects}</div>
        </div>
      `;
    }).join('');

    return DebtModal.open({
      title: 'انتخاب دستی برندگان',
      bodyHtml: `
        <div class="lottery-manual-counters" id="lottery-manual-counters"></div>
        <div class="lottery-manual-list">${rowsHtml}</div>
      `,
      submitLabel: 'ذخیره ترتیب',
      onMount: (bodyEl) => {
        const counters = bodyEl.querySelector('#lottery-manual-counters');
        const collect = () => Array.from({ length: pool.totalMonths }, (_, i) => (
          [...bodyEl.querySelectorAll(`select[data-month="${i + 1}"]`)].map((s) => s.value)
        ));

        const refresh = () => {
          const used = new Map();
          collect().flat().filter(Boolean).forEach((id) => used.set(id, (used.get(id) ?? 0) + 1));
          counters.innerHTML = people.map((p) => {
            const count = used.get(p.id) ?? 0;
            const state = count === p.shares ? 'ok' : (count > p.shares ? 'over' : 'pending');
            return `<span class="lottery-counter lottery-counter--${state}">${HtmlSanitizer.escape(p.name)}: ${count}/${p.shares}</span>`;
          }).join('');
        };
        bodyEl.addEventListener('change', refresh);
        refresh();
        return { collect };
      },
      onSubmit: (_bodyEl, api) => {
        try {
          onSubmit(api.collect());
          return true;
        } catch (error) {
          alert(error.message);
          return false;
        }
      },
    });
  }
}
