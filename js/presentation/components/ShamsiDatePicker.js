import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Component: ShamsiDatePicker
 * A lightweight Jalali (Shamsi) calendar month-grid picker built without
 * any external calendar library, using the JalaliCalendar adapter for all
 * date math.
 */
export class ShamsiDatePicker {
  #container;
  #selected;
  #onSelect;
  #viewYear;
  #viewMonth;

  constructor(onSelect, initialISO = new Date().toISOString()) {
    this.#onSelect = onSelect;
    this.#selected = JalaliCalendar.toJalali(new Date(initialISO));
    this.#viewYear = this.#selected.jy;
    this.#viewMonth = this.#selected.jm;
    this.#container = document.createElement('div');
    this.#container.className = 'shamsi-picker';
    this.#renderGrid();
  }

  get element() {
    return this.#container;
  }

  #renderGrid() {
    const days = JalaliCalendar.daysInMonth(this.#viewYear, this.#viewMonth);
    const monthName = JalaliCalendar.monthNames()[this.#viewMonth - 1];
    const weekDays = JalaliCalendar.weekDayNames();

    this.#container.innerHTML = `
      <div class="shamsi-picker__header">
        <button type="button" class="shamsi-picker__nav" data-dir="next"><i class="fa-solid fa-chevron-right"></i></button>
        <span class="shamsi-picker__title">${monthName} ${this.#viewYear}</span>
        <button type="button" class="shamsi-picker__nav" data-dir="prev"><i class="fa-solid fa-chevron-left"></i></button>
      </div>
      <div class="shamsi-picker__weekdays">
        ${weekDays.map((w) => `<span>${w[0]}</span>`).join('')}
      </div>
      <div class="shamsi-picker__grid"></div>
    `;

    const gregorianFirst = JalaliCalendar.toGregorian(this.#viewYear, this.#viewMonth, 1);
    const offset = (gregorianFirst.getDay() + 1) % 7;
    const grid = this.#container.querySelector('.shamsi-picker__grid');

    for (let i = 0; i < offset; i += 1) {
      grid.appendChild(document.createElement('span'));
    }
    for (let day = 1; day <= days; day += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = day;
      const isSelected = this.#selected.jy === this.#viewYear
        && this.#selected.jm === this.#viewMonth
        && this.#selected.jd === day;
      btn.className = `shamsi-picker__day${isSelected ? ' shamsi-picker__day--selected' : ''}`;
      btn.addEventListener('click', () => {
        this.#selected = { jy: this.#viewYear, jm: this.#viewMonth, jd: day };
        const gDate = JalaliCalendar.toGregorian(this.#viewYear, this.#viewMonth, day);
        this.#onSelect(gDate.toISOString());
        this.#renderGrid();
      });
      grid.appendChild(btn);
    }

    this.#container.querySelectorAll('.shamsi-picker__nav').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.dir === 'next' ? 1 : -1;
        this.#viewMonth += dir;
        if (this.#viewMonth > 12) { this.#viewMonth = 1; this.#viewYear += 1; }
        if (this.#viewMonth < 1) { this.#viewMonth = 12; this.#viewYear -= 1; }
        this.#renderGrid();
      });
    });
  }
}
