import { DebtModal } from './DebtModal.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';

/**
 * Component: LotteryManualDrawModal
 * Lets the user pick the winner(s) of every month by hand. Each month has W
 * winner units; when the pool has half shares, a unit can be switched to
 * "نیم‌سهمی" and then takes two different people who each get half. A live
 * counter per person shows how many of their shares are already placed.
 * With an organizer, the first unit of month 1 is pre-filled with him.
 */
export class LotteryManualDrawModal {
  static open({ pool, names, onSubmit }) {
    const people = pool.participants.map((p) => ({
      id: p.personId,
      name: names.get(p.personId) ?? '—',
      shares: p.shares,
      isOrganizer: p.personId === pool.organizerId,
    }));
    const optionsHtml = (selected, role) => `
      <select class="input" data-role="${role}">
        <option value="">— انتخاب —</option>
        ${people.map((p) => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${HtmlSanitizer.escape(p.name)}${p.isOrganizer ? ' (برگزارکننده)' : ''}</option>`).join('')}
      </select>`;

    /** Splits a month's saved entries into units: single full entries and pairs of half entries. */
    const toUnits = (entries) => {
      const fulls = entries.filter((e) => e.portion === 1).map((e) => ({ split: false, a: e.personId, b: '' }));
      const halves = entries.filter((e) => e.portion === 0.5);
      const pairs = [];
      for (let i = 0; i < halves.length; i += 2) pairs.push({ split: true, a: halves[i].personId, b: halves[i + 1]?.personId ?? '' });
      return [...fulls, ...pairs];
    };

    /** Default for month 1 / unit 1 when nothing is drawn yet: the organizer (as a half pair if he only has a half share). */
    const organizerDefault = () => {
      const organizer = people.find((p) => p.isOrganizer);
      if (!organizer) return undefined;
      return { split: organizer.shares < 1, a: organizer.id, b: '' };
    };

    const unitHtml = (month, unit = { split: false, a: '', b: '' }) => `
      <div class="lottery-unit" data-month="${month}">
        ${pool.hasHalfShares ? `
          <label class="lottery-unit__split-toggle">
            <input type="checkbox" data-role="split" ${unit.split ? 'checked' : ''} />
            نیم‌سهمی (دو نفر، هر کدام نصف وام)
          </label>` : ''}
        <div class="lottery-unit__halves">
          ${optionsHtml(unit.a, 'a')}
          <span data-role="b-wrap" ${unit.split ? '' : 'hidden'}>${optionsHtml(unit.b, 'b')}</span>
        </div>
      </div>`;

    const rowsHtml = Array.from({ length: pool.totalMonths }, (_, i) => {
      const month = i + 1;
      const units = toUnits(pool.winnersOf(month));
      if (month === 1 && units.length === 0) {
        const preset = organizerDefault();
        if (preset) units.push(preset);
      }
      const unitsHtml = Array.from({ length: pool.winnersPerMonth }, (_unused, u) => unitHtml(month, units[u])).join('');
      return `
        <div class="lottery-manual-row">
          <span class="lottery-manual-row__label">${AmountFormat.number(month)} · ${JalaliCalendar.formatISOToJalali(pool.dueDateOf(month))}${month === 1 && pool.organizerId ? ' · نوبت برگزارکننده' : ''}</span>
          <div class="lottery-manual-row__selects">${unitsHtml}</div>
        </div>`;
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

        /** Entries per month: [{ personId, portion }], empty selections are skipped. */
        const collect = () => Array.from({ length: pool.totalMonths }, (_, i) => (
          [...bodyEl.querySelectorAll(`.lottery-unit[data-month="${i + 1}"]`)].flatMap((unit) => {
            const split = unit.querySelector('[data-role="split"]')?.checked ?? false;
            const a = unit.querySelector('[data-role="a"]').value;
            const b = unit.querySelector('[data-role="b"]').value;
            const portion = split ? 0.5 : 1;
            return [a, ...(split ? [b] : [])].filter(Boolean).map((personId) => ({ personId, portion }));
          })
        ));

        const refresh = () => {
          const used = new Map();
          collect().flat().forEach((e) => used.set(e.personId, (used.get(e.personId) ?? 0) + e.portion));
          counters.innerHTML = people.map((p) => {
            const count = used.get(p.id) ?? 0;
            const state = count === p.shares ? 'ok' : (count > p.shares ? 'over' : 'pending');
            return `<span class="lottery-counter lottery-counter--${state}">${HtmlSanitizer.escape(p.name)}: ${AmountFormat.decimal(count)}/${AmountFormat.decimal(p.shares)}</span>`;
          }).join('');
        };

        bodyEl.addEventListener('change', (e) => {
          if (e.target.matches('[data-role="split"]')) {
            e.target.closest('.lottery-unit').querySelector('[data-role="b-wrap"]').hidden = !e.target.checked;
          }
          refresh();
        });
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
