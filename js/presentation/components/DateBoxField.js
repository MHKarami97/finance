import { ShamsiDatePicker } from './ShamsiDatePicker.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Component: DateBoxField
 * Collapsible Jalali date box (same look as the installment form): shows the
 * selected date and expands a ShamsiDatePicker when tapped.
 */
export class DateBoxField {
  #iso;

  static html(id, label) {
    return `
      <div class="form__field">
        <label class="form__label">${label}</label>
        <button type="button" class="date-box" id="${id}">
          <i class="fa-solid fa-calendar-days"></i>
          <span class="date-box__value"></span>
        </button>
        <div class="date-box__picker" id="${id}-picker" hidden></div>
      </div>
    `;
  }

  constructor(bodyEl, id, initialISO = new Date().toISOString()) {
    this.#iso = initialISO;
    const box = bodyEl.querySelector(`#${id}`);
    const slot = bodyEl.querySelector(`#${id}-picker`);
    const valueEl = box.querySelector('.date-box__value');
    const refresh = () => { valueEl.textContent = JalaliCalendar.formatFull(this.#iso); };
    refresh();

    const picker = new ShamsiDatePicker((iso) => {
      this.#iso = iso;
      refresh();
      slot.hidden = true;
    }, initialISO);
    slot.appendChild(picker.element);

    box.addEventListener('click', () => { slot.hidden = !slot.hidden; });
  }

  get value() {
    return this.#iso;
  }
}
