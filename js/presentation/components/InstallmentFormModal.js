import { DebtModal } from './DebtModal.js';
import { ShamsiDatePicker } from './ShamsiDatePicker.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { INSTALLMENT_KINDS, INSTALLMENT_FIELD_MAP } from '../../domain/entities/Installment.js';

const GROUP_FORMATTER = new Intl.NumberFormat('en-US');

/** Strips everything but digits (handles Persian digits too) and returns a plain integer, or null if empty. */
function parseDigits(value) {
  const normalized = (value || '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : null;
}

/** Formats a raw digit string into a "1,500,000"-style grouped display value. */
function formatGrouped(rawDigits) {
  const num = parseDigits(rawDigits);
  return num === null ? '' : GROUP_FORMATTER.format(num);
}

/**
 * Component: InstallmentFormModal
 * Reuses the generic DebtModal overlay (Composition over Inheritance) to
 * create/edit an Installment ("قسط" | "قرض" | "قبض"). Only the fields
 * relevant to the selected kind are shown, driven by INSTALLMENT_FIELD_MAP
 * so the visibility rules live in exactly one place (domain layer).
 *
 * Each date field renders as a closed "date box" showing the currently
 * selected Jalali date; the ShamsiDatePicker calendar grid is collapsed by
 * default and only expands when the box is clicked (collapsible picker).
 *
 * The amount field is a plain text input (not type="number", which cannot
 * render digit grouping) that live-formats every keystroke into
 * thousand-separated groups (e.g. 1,500,000) so large Toman amounts stay
 * readable while typing; the grouping characters are stripped again right
 * before the value is handed to onSubmit.
 */
export class InstallmentFormModal {
  static open({ initial = null, onSubmit }) {
    const kind = initial?.kind || 'installment';
    const nowISO = new Date().toISOString();
    const dates = {
      receivedDate: initial?.receivedDate || nowISO,
      endDate: initial?.endDate || nowISO,
      installmentDate: initial?.installmentDate || nowISO,
    };

    const kindOptionsHtml = Object.entries(INSTALLMENT_KINDS)
      .map(([key, def]) => `<option value="${key}" ${key === kind ? 'selected' : ''}>${def.label}</option>`)
      .join('');

    const dateFieldHtml = (field, label, boxId, pickerId) => `
      <div class="form__field" data-field="${field}">
        <label class="form__label">${label}</label>
        <button type="button" class="date-box" id="${boxId}">
          <i class="fa-solid fa-calendar-days"></i>
          <span class="date-box__value"></span>
        </button>
        <div class="date-box__picker" id="${pickerId}" hidden></div>
      </div>
    `;

    const bodyHtml = `
      <form id="installment-form" class="form">
        <label class="form__label">نوع</label>
        <select class="input" id="installment-kind">${kindOptionsHtml}</select>

        <label class="form__label">عنوان</label>
        <input type="text" required class="input" id="installment-title"
          value="${initial?.title ?? ''}" placeholder="مثلاً وام خودرو، قبض برق آبان" />

        <label class="form__label">توضیح (اختیاری)</label>
        <textarea class="input" id="installment-description" rows="2">${initial?.description ?? ''}</textarea>

        <label class="form__label">مبلغ (تومان)</label>
        <input type="text" inputmode="numeric" required class="input input--amount"
          id="installment-amount" value="${formatGrouped(initial?.amount)}" placeholder="۰" />

        ${dateFieldHtml('receivedDate', 'تاریخ دریافت', 'installment-received-box', 'installment-received-picker')}
        ${dateFieldHtml('endDate', 'تاریخ پایان / سررسید', 'installment-end-box', 'installment-end-picker')}
        ${dateFieldHtml('installmentDate', 'تاریخ اقساط (سررسید قسط بعدی)', 'installment-due-box', 'installment-due-picker')}

        <div class="form__field" data-field="interestRate">
          <label class="form__label">درصد سود (اختیاری)</label>
          <input type="number" min="0" step="0.1" class="input"
            id="installment-interest" value="${initial?.interestRate ?? ''}" placeholder="مثلاً ۱۸" />
        </div>

        <div class="form__field" data-field="cardNumber">
          <label class="form__label">شماره کارت واریزی (اختیاری)</label>
          <input type="text" inputmode="numeric" maxlength="19" class="input"
            id="installment-card" value="${initial?.cardNumber ?? ''}" placeholder="۶۰۳۷XXXXXXXXXXXX" />
        </div>
      </form>
    `;

    /**
     * Wires a single collapsible date field: clicking the closed "box"
     * toggles the ShamsiDatePicker grid; picking a day updates the box
     * label and auto-collapses the grid again.
     */
    const setupDateField = (bodyEl, boxId, pickerId, dateKey) => {
      const box = bodyEl.querySelector(`#${boxId}`);
      const pickerSlot = bodyEl.querySelector(`#${pickerId}`);
      const valueEl = box.querySelector('.date-box__value');

      const updateLabel = () => {
        valueEl.textContent = JalaliCalendar.formatISOToJalali(dates[dateKey]);
      };
      updateLabel();

      const picker = new ShamsiDatePicker((iso) => {
        dates[dateKey] = iso;
        updateLabel();
        pickerSlot.hidden = true;
      }, dates[dateKey]);
      pickerSlot.appendChild(picker.element);

      box.addEventListener('click', () => {
        const opening = pickerSlot.hidden;
        bodyEl.querySelectorAll('.date-box__picker').forEach((el) => { el.hidden = true; });
        pickerSlot.hidden = !opening;
      });
    };

    /** Live thousand-grouping while typing, with cursor kept at the end (simple & robust for this field). */
    const setupAmountFormatting = (bodyEl) => {
      const amountInput = bodyEl.querySelector('#installment-amount');
      amountInput.addEventListener('input', () => {
        const formatted = formatGrouped(amountInput.value);
        amountInput.value = formatted;
      });
    };

    return DebtModal.open({
      title: initial ? 'ویرایش مورد مالی' : 'افزودن قسط / قرض / قبض',
      bodyHtml,
      submitLabel: initial ? 'ذخیره تغییرات' : 'ثبت',

      onMount: (bodyEl) => {
        setupDateField(bodyEl, 'installment-received-box', 'installment-received-picker', 'receivedDate');
        setupDateField(bodyEl, 'installment-end-box', 'installment-end-picker', 'endDate');
        setupDateField(bodyEl, 'installment-due-box', 'installment-due-picker', 'installmentDate');
        setupAmountFormatting(bodyEl);

        const kindSelect = bodyEl.querySelector('#installment-kind');
        const applyVisibility = (selectedKind) => {
          const fields = INSTALLMENT_FIELD_MAP[selectedKind];
          bodyEl.querySelectorAll('.form__field').forEach((el) => {
            el.style.display = fields[el.dataset.field] ? '' : 'none';
          });
        };
        applyVisibility(kindSelect.value);
        kindSelect.addEventListener('change', () => applyVisibility(kindSelect.value));

        return { dates };
      },

      onSubmit: (bodyEl, api) => {
        const title = bodyEl.querySelector('#installment-title').value.trim();
        const amount = parseDigits(bodyEl.querySelector('#installment-amount').value);
        if (!title) {
          alert('لطفاً عنوان را وارد کنید');
          return false;
        }
        if (!amount || amount <= 0) {
          alert('مبلغ وارد شده صحیح نیست');
          return false;
        }

        const selectedKind = bodyEl.querySelector('#installment-kind').value;
        const interestValue = bodyEl.querySelector('#installment-interest').value;
        const cardValue = bodyEl.querySelector('#installment-card').value.trim();

        onSubmit({
          id: initial?.id,
          kind: selectedKind,
          title,
          description: bodyEl.querySelector('#installment-description').value.trim(),
          amount,
          receivedDate: api.dates.receivedDate,
          endDate: api.dates.endDate,
          installmentDate: api.dates.installmentDate,
          interestRate: interestValue ? Number(interestValue) : null,
          cardNumber: cardValue || null,
        });
        return true;
      },
    });
  }
}