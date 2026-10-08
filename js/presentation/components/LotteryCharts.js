import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';

/**
 * Component: LotteryCharts
 * Dependency-free charts (CSS conic-gradient, flex bars, inline SVG) so the
 * offline PWA stays self-contained — same approach as the existing ReportsPage.
 * Every method takes the plain object produced by LotteryService.buildReport.
 */
export class LotteryCharts {
  static render(report) {
    return `
      ${LotteryCharts.#summary(report)}
      ${LotteryCharts.#payoutSummary(report)}
      <div class="lottery-charts">
        ${LotteryCharts.#donut(report)}
        ${LotteryCharts.#payoutProgress(report)}
        ${LotteryCharts.#monthlyBars(report)}
        ${LotteryCharts.#cumulativeLine(report)}
        ${LotteryCharts.#peopleBars(report)}
      </div>
    `;
  }

  static #statCard(label, value, cls = '') {
    return `
      <div class="lottery-stat ${cls}">
        <span class="lottery-stat__label">${label}</span>
        <span class="lottery-stat__value">${AmountFormat.number(value)}</span>
      </div>`;
  }

  static #summary(r) {
    const card = LotteryCharts.#statCard;
    return `
      <div class="lottery-stats">
        ${card('کل مبلغ قابل دریافت', r.totalExpected)}
        ${card('پرداخت‌شده', r.totalCollected, 'lottery-stat--good')}
        ${card('باقی‌مانده', r.totalRemaining)}
        ${card('معوق', r.totalOverdue, r.totalOverdue > 0 ? 'lottery-stat--bad' : '')}
      </div>`;
  }

  static #payoutSummary(r) {
    const card = LotteryCharts.#statCard;
    return `
      <div class="lottery-stats lottery-stats--3">
        ${card('وام تحویل‌داده‌شده', r.totalPaidOut, 'lottery-stat--good')}
        ${card('وام تحویل‌نشده', r.totalPayoutRemaining)}
        ${card('موجودی صندوق', r.cashOnHand, r.cashOnHand < 0 ? 'lottery-stat--bad' : '')}
      </div>`;
  }

  static #donut(r) {
    const paid = r.percent;
    const overdueShare = r.totalExpected ? Math.round((r.totalOverdue / r.totalExpected) * 100) : 0;
    const gradient = `conic-gradient(var(--accent) 0 ${paid}%, var(--negative) ${paid}% ${Math.min(paid + overdueShare, 100)}%, var(--bg-surface-2) 0)`;
    return `
      <section class="lottery-chart-card">
        <h3 class="lottery-chart-card__title">پیشرفت اقساط</h3>
        <div class="lottery-donut" style="background:${gradient}">
          <div class="lottery-donut__hole">
            <strong>${AmountFormat.number(paid)}٪</strong>
            <small>پرداخت‌شده</small>
          </div>
        </div>
        <div class="lottery-legend">
          <span><i class="lottery-dot lottery-dot--paid"></i>پرداخت‌شده</span>
          <span><i class="lottery-dot lottery-dot--overdue"></i>معوق</span>
          <span><i class="lottery-dot lottery-dot--rest"></i>آینده</span>
        </div>
      </section>`;
  }

  static #payoutProgress(r) {
    const gradient = `conic-gradient(var(--warning) 0 ${r.payoutPercent}%, var(--bg-surface-2) 0)`;
    return `
      <section class="lottery-chart-card">
        <h3 class="lottery-chart-card__title">دریافت وام توسط برندگان</h3>
        <div class="lottery-donut" style="background:${gradient}">
          <div class="lottery-donut__hole">
            <strong>${AmountFormat.number(r.payoutPercent)}٪</strong>
            <small>${AmountFormat.number(r.payoutsDone)} از ${AmountFormat.number(r.payoutSlots)} نوبت</small>
          </div>
        </div>
        <div class="lottery-legend">
          <span><i class="lottery-dot lottery-dot--payout"></i>تحویل‌شده</span>
          <span><i class="lottery-dot lottery-dot--rest"></i>در انتظار</span>
        </div>
      </section>`;
  }

  static #monthlyBars(r) {
    const bars = r.months.map((m) => {
      const pct = m.expected ? Math.round((m.collected / m.expected) * 100) : 0;
      const cls = m.isOverdue ? 'lottery-bar--overdue' : (m.month === r.currentMonth ? 'lottery-bar--current' : '');
      return `
        <div class="lottery-bar ${cls}" title="ماه ${m.month}: ${AmountFormat.toman(m.collected)} از ${AmountFormat.toman(m.expected)}">
          <span class="lottery-bar__pct">${AmountFormat.number(pct)}٪</span>
          <div class="lottery-bar__track"><div class="lottery-bar__fill" style="height:${pct}%"></div></div>
          <span class="lottery-bar__label">${AmountFormat.number(m.month)}</span>
        </div>`;
    }).join('');
    return `
      <section class="lottery-chart-card lottery-chart-card--wide">
        <h3 class="lottery-chart-card__title">درصد پرداخت در هر ماه</h3>
        <div class="lottery-bars">${bars}</div>
      </section>`;
  }

  static #cumulativeLine(r) {
    const width = 300;
    const height = 140;
    const pad = 12;
    const max = Math.max(r.totalExpected, r.months.at(-1)?.cumulativePaidOut ?? 0, 1);
    const stepX = r.months.length > 1 ? (width - pad * 2) / (r.months.length - 1) : 0;
    const point = (i, value) => `${(pad + stepX * i).toFixed(1)},${(height - pad - ((height - pad * 2) * value) / max).toFixed(1)}`;
    const series = (key) => r.months.map((m, i) => point(i, m[key])).join(' ');
    return `
      <section class="lottery-chart-card lottery-chart-card--wide">
        <h3 class="lottery-chart-card__title">جریان نقدی تجمیعی</h3>
        <svg class="lottery-line" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="نمودار تجمیعی دریافتی‌ها و پرداختی‌ها">
          <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="lottery-line__axis" />
          <polyline points="${series('cumulativeExpected')}" class="lottery-line__expected" />
          <polyline points="${series('cumulativeCollected')}" class="lottery-line__collected" />
          <polyline points="${series('cumulativePaidOut')}" class="lottery-line__payout" />
        </svg>
        <div class="lottery-legend">
          <span><i class="lottery-dot lottery-dot--rest"></i>برنامه</span>
          <span><i class="lottery-dot lottery-dot--paid"></i>اقساط دریافت‌شده</span>
          <span><i class="lottery-dot lottery-dot--payout"></i>وام تحویل‌شده</span>
        </div>
      </section>`;
  }

  static #peopleBars(r) {
    const rows = r.people.map((p) => {
      const total = Math.max(p.due, 1);
      const paidPct = (p.paid / total) * 100;
      const overduePct = (p.overdue / total) * 100;
      return `
        <div class="lottery-person-bar">
          <div class="lottery-person-bar__head">
            <strong>${HtmlSanitizer.escape(p.name)}${p.shares !== 1 ? ` (${AmountFormat.decimal(p.shares)} سهم)` : ''}</strong>
            <span>${AmountFormat.number(p.paidCount)} از ${AmountFormat.number(p.totalCount)} قسط</span>
          </div>
          <div class="lottery-stack">
            <span class="lottery-stack__paid" style="width:${paidPct}%"></span>
            <span class="lottery-stack__overdue" style="width:${overduePct}%"></span>
          </div>
          <div class="lottery-person-bar__foot">
            <span>پرداخت: ${AmountFormat.number(p.paid)} · مانده: ${AmountFormat.number(p.remaining)}</span>
            <span><i class="fa-solid fa-trophy"></i> وام دریافتی: ${AmountFormat.number(p.receivedCount)} از ${AmountFormat.number(p.slotCount)}</span>
          </div>
        </div>`;
    }).join('');
    return `
      <section class="lottery-chart-card lottery-chart-card--wide">
        <h3 class="lottery-chart-card__title">وضعیت هر نفر</h3>
        ${rows}
      </section>`;
  }
}
