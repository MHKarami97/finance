import { DebtModal } from './DebtModal.js';
import { DateBoxField } from './DateBoxField.js';
import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';
import { LotteryPool } from '../../domain/entities/LotteryPool.js';

/**
 * Component: LotteryFormModal
 * Creates a lottery pool. Participant names are typed into an input backed by
 * a <datalist> of the saved people roster: picking a saved name reuses that
 * person, a new name is added to the roster on save. Share counts accept
 * halves (0.5, 1, 1.5 ...). One participant can be chosen as the organizer
 * (always wins month 1, receives all installments) with an optional card number.
 */
export class LotteryFormModal {
  static open({ knownNames, onSubmit }) {
    const bodyHtml = `
      <form class="form" id="lottery-form" onsubmit="return false">
        <label class="form__label">عنوان</label>
        <input type="text" class="input" id="lottery-title" placeholder="مثلاً قرعه‌کشی همسایه‌ها" />

        <label class="form__label">مبلغ وام در هر نوبت (تومان)</label>
        <input type="text" inputmode="numeric" class="input input--amount" id="lottery-amount" placeholder="۰" />

        <label class="form__label">تعداد کل ماه‌ها</label>
        <input type="number" inputmode="numeric" min="1" max="120" step="1" class="input" id="lottery-months" placeholder="مثلاً ۱۰" />

        <label class="form__label">تعداد برنده (سهم کامل) در هر ماه</label>
        <input type="number" inputmode="numeric" min="1" step="1" class="input" id="lottery-winners" value="1" />

        ${DateBoxField.html('lottery-start', 'تاریخ شروع (شمسی)')}

        <label class="form__label">اگر کسی چند سهم دارد</label>
        <select class="input" id="lottery-consecutive">
          <option value="spread">پخش و تصادفی (نوبت‌ها پشت‌سرهم نباشد)</option>
          <option value="consecutive">پشت‌سرهم (سهم‌های او ماه‌های متوالی باشد)</option>
        </select>

        <div class="section-header lottery-form__people-header">
          <h2>شرکت‌کنندگان</h2>
          <button type="button" class="link" id="lottery-add-person">+ افزودن نفر</button>
        </div>
        <p class="lottery-form__note">
          تعداد سهم می‌تواند نیمی هم باشد (۰٫۵ ، ۱ ، ۱٫۵ ، ۲٫۵ ...). نیم‌سهم‌ها دو به دو (دو نفر مختلف) در یک نوبت برنده می‌شوند و هر کدام نصف وام را می‌گیرند؛ پس تعداد افراد دارای نیم‌سهم باید زوج باشد.
        </p>
        <datalist id="lottery-people-list">
          ${knownNames.map((n) => `<option value="${HtmlSanitizer.escape(n)}"></option>`).join('')}
        </datalist>
        <div class="lottery-people" id="lottery-people"></div>
        <div class="lottery-hint" id="lottery-hint"></div>

        <div class="section-header lottery-form__people-header"><h2>برگزارکننده (اختیاری)</h2></div>
        <p class="lottery-form__note">
          برگزارکننده همیشه نوبت اول وام را می‌گیرد. اقساط به حساب او واریز می‌شود و او هر ماه وام را به برنده می‌دهد.
        </p>
        <select class="input" id="lottery-organizer"></select>
        <div class="form__field" id="lottery-card-field" hidden>
          <label class="form__label">شماره کارت برگزارکننده (اختیاری)</label>
          <input type="text" inputmode="numeric" dir="ltr" maxlength="19" class="input lottery-card-input"
            id="lottery-card" placeholder="6037-xxxx-xxxx-xxxx" autocomplete="off" />
        </div>
      </form>
    `;

    return DebtModal.open({
      title: 'قرعه‌کشی قرض‌الحسنه جدید',
      bodyHtml,
      submitLabel: 'ذخیره',
      onMount: (bodyEl) => {
        const startField = new DateBoxField(bodyEl, 'lottery-start');
        AmountFormat.bindGroupedInput(bodyEl.querySelector('#lottery-amount'));

        const peopleEl = bodyEl.querySelector('#lottery-people');
        const hintEl = bodyEl.querySelector('#lottery-hint');
        const monthsEl = bodyEl.querySelector('#lottery-months');
        const winnersEl = bodyEl.querySelector('#lottery-winners');
        const amountEl = bodyEl.querySelector('#lottery-amount');
        const organizerEl = bodyEl.querySelector('#lottery-organizer');
        const cardField = bodyEl.querySelector('#lottery-card-field');
        const cardEl = bodyEl.querySelector('#lottery-card');

        const addRow = (name = '', shares = 1) => {
          const row = document.createElement('div');
          row.className = 'lottery-person-row';
          row.innerHTML = `
            <input type="text" class="input" list="lottery-people-list" placeholder="نام (از لیست یا جدید)" value="${HtmlSanitizer.escape(name)}" data-field="name" />
            <input type="number" inputmode="decimal" min="0.5" step="0.5" class="input lottery-person-row__shares" value="${shares}" data-field="shares" aria-label="تعداد سهم" />
            <button type="button" class="icon-btn icon-btn--danger" data-action="remove"><i class="fa-solid fa-xmark"></i></button>
          `;
          peopleEl.appendChild(row);
        };

        const readParticipants = () => [...peopleEl.querySelectorAll('.lottery-person-row')].map((row) => ({
          name: row.querySelector('[data-field="name"]').value.trim(),
          shares: Number(row.querySelector('[data-field="shares"]').value),
        }));

        /** Rebuilds the organizer list from the typed names, keeping the current choice when still present. */
        const refreshOrganizer = () => {
          const names = [...new Set(readParticipants().map((p) => p.name).filter(Boolean))];
          const selected = names.includes(organizerEl.value) ? organizerEl.value : '';
          organizerEl.innerHTML = `
            <option value="">— بدون برگزارکننده —</option>
            ${names.map((n) => `<option value="${HtmlSanitizer.escape(n)}" ${n === selected ? 'selected' : ''}>${HtmlSanitizer.escape(n)}</option>`).join('')}
          `;
          organizerEl.value = selected;
          cardField.hidden = !selected;
        };

        const refreshHint = () => {
          const months = Number(monthsEl.value) || 0;
          const winners = Number(winnersEl.value) || 0;
          const amount = AmountFormat.parseDigits(amountEl.value) || 0;
          const people = readParticipants();
          const shares = people.reduce((sum, p) => sum + (Number.isFinite(p.shares) ? p.shares : 0), 0);
          const halfHolders = people.filter((p) => Number.isFinite(p.shares) && !Number.isInteger(p.shares)).length;
          const required = months * winners;
          const perShare = months ? Math.round(amount / months) : 0;
          const evenHalves = halfHolders % 2 === 0;
          const ok = required > 0 && shares === required && evenHalves;
          hintEl.className = `lottery-hint ${ok ? 'lottery-hint--ok' : 'lottery-hint--warn'}`;
          hintEl.innerHTML = `
            <span>مجموع سهم‌ها: <strong>${AmountFormat.decimal(shares)}</strong> از <strong>${AmountFormat.number(required)}</strong> (ماه × برنده)</span>
            <span>قسط ماهانه هر سهم کامل: <strong>${AmountFormat.toman(perShare)}</strong></span>
            ${halfHolders > 0 ? `<span>افراد دارای نیم‌سهم: <strong>${AmountFormat.number(halfHolders)}</strong>${evenHalves ? '' : ' — باید زوج باشد'}</span>` : ''}
          `;
        };

        const refreshAll = () => { refreshHint(); refreshOrganizer(); };

        addRow();
        addRow();
        refreshAll();

        bodyEl.querySelector('#lottery-add-person').addEventListener('click', () => { addRow(); refreshAll(); });
        peopleEl.addEventListener('click', (e) => {
          const remove = e.target.closest('[data-action="remove"]');
          if (!remove) return;
          remove.closest('.lottery-person-row').remove();
          refreshAll();
        });
        bodyEl.addEventListener('input', (e) => {
          if (e.target === cardEl) {
            cardEl.value = LotteryPool.formatCardNumber(cardEl.value);
            return;
          }
          refreshAll();
        });
        organizerEl.addEventListener('change', () => { cardField.hidden = !organizerEl.value; });

        return { startField, readParticipants };
      },
      onSubmit: (bodyEl, api) => {
        const participants = api.readParticipants().filter((p) => p.name);
        const organizerName = bodyEl.querySelector('#lottery-organizer').value;
        const dto = {
          title: bodyEl.querySelector('#lottery-title').value,
          totalAmount: AmountFormat.parseDigits(bodyEl.querySelector('#lottery-amount').value),
          totalMonths: Number(bodyEl.querySelector('#lottery-months').value),
          winnersPerMonth: Number(bodyEl.querySelector('#lottery-winners').value),
          startDate: api.startField.value,
          keepWinnerConsecutive: bodyEl.querySelector('#lottery-consecutive').value === 'consecutive',
          participants,
          organizerName,
          organizerCardNumber: organizerName ? bodyEl.querySelector('#lottery-card').value : null,
        };
        try {
          onSubmit(dto);
          return true;
        } catch (error) {
          alert(error.message);
          return false;
        }
      },
    });
  }
}
