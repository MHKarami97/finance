import { TopBar } from '../components/TopBar.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Page: ReportsPage
 * Visualizes spending distribution per category for the selected Jalali month
 * using a pure-CSS donut chart (conic-gradient) — no chart library dependency,
 * keeping the bundle small and the offline PWA fully self-contained.
 */
export class ReportsPage {
  constructor({ transactionService, categoryRepo, exportService }) {
    this.transactionService = transactionService;
    this.categoryRepo = categoryRepo;
    this.exportService = exportService;
    const now = JalaliCalendar.nowJalali();
    this.jy = now.jy;
    this.jm = now.jm;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('گزارش‌ها', {
      actionIcon: 'fa-download',
      onAction: () => this.#showExportMenu(),
    }));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="month-nav">
        <button type="button" id="prev-month"><i class="fa-solid fa-chevron-right"></i></button>
        <span id="month-label"></span>
        <button type="button" id="next-month"><i class="fa-solid fa-chevron-left"></i></button>
      </div>
      <div id="report-body"></div>
    `;
    page.appendChild(content);

    const renderBody = () => {
      content.querySelector('#month-label').textContent = `${JalaliCalendar.monthNames()[this.jm - 1]} ${this.jy}`;
      const summary = this.transactionService.computeMonthSummary(this.jy, this.jm, JalaliCalendar);
      const grouped = this.transactionService.groupExpensesByCategory(summary.transactions);
      const categories = this.categoryRepo.getAll();
      const total = [...grouped.values()].reduce((a, b) => a + b, 0);

      let gradientParts = [];
      let accum = 0;
      const rows = [...grouped.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([catId, amount]) => {
          const cat = categories.find((c) => c.id === catId);
          const pct = total > 0 ? (amount / total) * 100 : 0;
          gradientParts.push(`${cat?.color || '#7c7c7c'} ${accum}% ${accum + pct}%`);
          accum += pct;
          return `
            <div class="report-row">
              <span class="report-row__dot" style="background:${cat?.color || '#7c7c7c'}"></span>
              <span class="report-row__name">${cat?.name || 'سایر'}</span>
              <span class="report-row__pct">${pct.toFixed(1)}٪</span>
              <span class="report-row__amount">${new Intl.NumberFormat('fa-IR').format(amount)}</span>
            </div>`;
        }).join('');

      const body = content.querySelector('#report-body');
      body.innerHTML = `
        <div class="donut-wrapper">
          <div class="donut-chart" style="background:${gradientParts.length ? `conic-gradient(${gradientParts.join(',')})` : '#252525'}">
            <div class="donut-chart__hole">
              <span>${summary.expense.toFormattedString()}</span>
              <small>هزینه کل</small>
            </div>
          </div>
        </div>
        <div class="report-list">${rows || '<p class="empty-state">داده‌ای برای این ماه ثبت نشده</p>'}</div>
      `;
    };

    content.querySelector('#prev-month').addEventListener('click', () => {
      this.jm -= 1;
      if (this.jm < 1) { this.jm = 12; this.jy -= 1; }
      renderBody();
    });
    content.querySelector('#next-month').addEventListener('click', () => {
      this.jm += 1;
      if (this.jm > 12) { this.jm = 1; this.jy += 1; }
      renderBody();
    });

    renderBody();
    return page;
  }

  #showExportMenu() {
    if (confirm('برای خروجی CSV تأیید کنید، برای خروجی JSON لغو کنید و از منوی تنظیمات استفاده کنید.')) {
      this.exportService.exportToCsv(JalaliCalendar);
    }
  }
}
