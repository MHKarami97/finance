import { DebtModal } from './DebtModal.js';
import { ShamsiDatePicker } from './ShamsiDatePicker.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';
import { INSTALLMENT_KINDS, INSTALLMENT_FIELD_MAP } from '../../domain/entities/Installment.js';

const GROUP_FORMATTER = new Intl.NumberFormat('en-US');

/**
 * Strips everything but digits (handles Persian digits too) and returns a
 * plain integer, or null if empty. Accepts numbers, strings, null/undefined
 * — callers may pass either a raw entity field (number) or live input.value
 * (string), so this always normalizes to a string first.
 */
function parseDigits(value) {
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : null;
}

/** Formats a raw digit value (number or string) into a "1,500,000"-style grouped display value. */
function formatGrouped(rawValue) {
  const num = parseDigits(rawValue);
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
 * default and only expands when the box is clicked.
 *
 * Both money fields (total amount, and — for kind === 'installment' — the
 * per-month amount) are plain text inputs that live-format every keystroke
 * into thousand-separated groups; the grouping is stripped again right
 * before the value is handed to onSubmit.
 *
 * On edit, `paidInstallments` / `completed` / `completedAt` are carried
 * over unchanged from `initial` so re-saving the form never wipes out the
 * user's payment checklist or "اتمام" status.
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

        <label class="form__label">مبلغ کل (تومان)</label>
        <input type="text" inputmode="numeric" required class="input input--amount"
          id="installment-amount" value="${formatGrouped(initial?.amount)}" placeholder="۰" />

        <div class="form__field" data-field="perInstallmentAmount">
          <label class="form__label">مبلغ هر قسط (تومان)</label>
          <input type="text" inputmode="numeric" class="input input--amount"
            id="installment-per-amount" value="${formatGrouped(initial?.perInstallmentAmount)}" placeholder="۰" />
        </div>

        <div class="form__field" data-field="installmentCount">
          <label class="form__label">تعداد اقساط (ماه)</label>
          <input type="number" min="1" step="1" class="input"
            id="installment-count" value="${initial?.installmentCount ?? ''}" placeholder="مثلاً ۱۲" />
        </div>

        ${dateFieldHtml('receivedDate', 'تاریخ دریافت', 'installment-received-box', 'installment-received-picker')}
        ${dateFieldHtml('endDate', 'تاریخ پایان / سررسید', 'installment-end-box', 'installment-end-picker')}
        ${dateFieldHtml('installmentDate', 'تاریخ اقساط (سررسید قسط اول)', 'installment-due-box', 'installment-due-picker')}

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

    /** Live thousand-grouping while typing for every money input in the form. */
    const setupAmountFormatting = (bodyEl) => {
      ['#installment-amount', '#installment-per-amount'].forEach((selector) => {
        const input = bodyEl.querySelector(selector);
        input.addEventListener('input', () => {
          input.value = formatGrouped(input.value);
        });
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
        const selectedKind = bodyEl.querySelector('#installment-kind').value;

        if (!title) {
          alert('لطفاً عنوان را وارد کنید');
          return false;
        }
        if (!amount || amount <= 0) {
          alert('مبلغ کل وارد شده صحیح نیست');
          return false;
        }

        let perInstallmentAmount = null;
        let installmentCount = null;
        if (selectedKind === 'installment') {
          perInstallmentAmount = parseDigits(bodyEl.querySelector('#installment-per-amount').value);
          installmentCount = Number(bodyEl.querySelector('#installment-count').value) || null;
          if (!perInstallmentAmount || perInstallmentAmount <= 0) {
            alert('مبلغ هر قسط را وارد کنید');
            return false;
          }
          if (!installmentCount || installmentCount <= 0) {
            alert('تعداد اقساط را وارد کنید');
            return false;
          }
        }

        const interestValue = bodyEl.querySelector('#installment-interest').value;
        const cardValue = bodyEl.querySelector('#installment-card').value.trim();

        onSubmit({
          id: initial?.id,
          kind: selectedKind,
          title,
          description: bodyEl.querySelector('#installment-description').value.trim(),
          amount,
          perInstallmentAmount,
          installmentCount,
          receivedDate: api.dates.receivedDate,
          endDate: api.dates.endDate,
          installmentDate: api.dates.installmentDate,
          interestRate: interestValue ? Number(interestValue) : null,
          cardNumber: cardValue || null,
          // Preserve progress/finish state across edits — the form never manages these.
          paidInstallments: initial?.paidInstallments || [],
          completed: initial?.completed || false,
          completedAt: initial?.completedAt || null,
        });
        return true;
      },
    });
  }
}