import { TopBar } from '../components/TopBar.js';
import { LotteryFormModal } from '../components/LotteryFormModal.js';
import { LotteryManualDrawModal } from '../components/LotteryManualDrawModal.js';
import { LotteryPaymentModal } from '../components/LotteryPaymentModal.js';
import { LotteryCharts } from '../components/LotteryCharts.js';
import { AmountFormat } from '../utils/AmountFormat.js';
import { HtmlSanitizer } from '../utils/HtmlSanitizer.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

const TAB = Object.freeze({ SCHEDULE: 'schedule', REPORT: 'report' });

/**
 * Page: LotteryPage ("قرعه‌کشی قرض‌الحسنه")
 * list view  → all pools with progress
 * detail view → draft: participants + draw (random / manual) + start
 *               active: month-by-month schedule (installment payments and
 *               loan receipt by the winner) and the report tab
 * Sub-views are handled internally because the Router has flat routes only
 * (same approach as DebtsPage). All clicks go through one delegated handler.
 */
export class LotteryPage {
  #service;
  #view = 'list';
  #tab = TAB.SCHEDULE;
  #activeId = null;
  #openMonths = new Set();
  #topbarSlot;
  #content;

  constructor({ lotteryService }) {
    this.#service = lotteryService;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';

    this.#topbarSlot = document.createElement('div');
    page.appendChild(this.#topbarSlot);

    this.#content = document.createElement('div');
    this.#content.className = 'page__content lottery-page';
    this.#content.addEventListener('click', (e) => this.#onClick(e));
    this.#content.addEventListener('toggle', (e) => this.#onToggle(e), true);
    page.appendChild(this.#content);

    this.#renderCurrentView();
    return page;
  }

  // ---------------- Routing between sub-views ----------------
  #renderCurrentView() {
    this.#topbarSlot.innerHTML = '';
    if (this.#view === 'list') {
      this.#topbarSlot.appendChild(TopBar.render('قرعه‌کشی قرض‌الحسنه', {
        actionIcon: 'fa-plus',
        onAction: () => this.#openCreateModal(),
      }));
      this.#renderList();
      return;
    }
    const pool = this.#service.get(this.#activeId);
    if (!pool) {
      this.#view = 'list';
      this.#renderCurrentView();
      return;
    }
    this.#topbarSlot.appendChild(TopBar.render(HtmlSanitizer.escape(pool.title)));
    this.#renderDetail(pool);
  }

  // ---------------- List ----------------
  #renderList() {
    const pools = this.#service.list();
    if (pools.length === 0) {
      this.#content.innerHTML = '<p class="empty-state">هنوز قرعه‌کشی‌ای ثبت نشده. با زدن + یک قرعه‌کشی قرض‌الحسنه بسازید.</p>';
      return;
    }
    this.#content.innerHTML = `<div class="lottery-list">${pools.map((pool) => this.#poolCardHtml(pool)).join('')}</div>`;
  }

  #poolCardHtml(pool) {
    const summary = pool.isActive ? this.#service.buildSummary(pool) : null;
    const badge = !pool.isActive
      ? '<span class="lottery-badge lottery-badge--draft">در انتظار قرعه</span>'
      : (pool.isCompleted
        ? '<span class="lottery-badge lottery-badge--done">تمام‌شده</span>'
        : '<span class="lottery-badge lottery-badge--active">فعال</span>');
    return `
      <div class="lottery-card" data-action="open" data-id="${pool.id}">
        <div class="lottery-card__body">
          <div class="lottery-card__title-row">
            <span class="lottery-card__title">${HtmlSanitizer.escape(pool.title)}</span>${badge}
          </div>
          <span class="lottery-card__meta">
            ${AmountFormat.number(pool.totalMonths)} ماه · ${AmountFormat.number(pool.totalShares)} سهم · شروع ${JalaliCalendar.formatISOToJalali(pool.startDate)}
          </span>
          <span class="lottery-card__amount">${AmountFormat.toman(pool.totalAmount)}</span>
          ${summary ? `
            <div class="installment-item__progress-bar"><span style="width:${summary.percent}%"></span></div>
            <span class="lottery-card__meta">
              ${AmountFormat.number(summary.percent)}٪ اقساط · ${AmountFormat.number(summary.payoutsDone)} از ${AmountFormat.number(summary.payoutSlots)} وام تحویل شد
            </span>` : ''}
        </div>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="${pool.id}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }

  // ---------------- Detail ----------------
  #renderDetail(pool) {
    const names = this.#service.peopleNames();
    const tabs = pool.isActive ? `
      <div class="chip-group lottery-tabs">
        <button type="button" class="chip ${this.#tab === TAB.SCHEDULE ? 'chip--active' : ''}" data-action="tab" data-tab="${TAB.SCHEDULE}">اقساط و وام</button>
        <button type="button" class="chip ${this.#tab === TAB.REPORT ? 'chip--active' : ''}" data-action="tab" data-tab="${TAB.REPORT}">گزارش</button>
      </div>` : '';

    let body;
    if (!pool.isActive) body = this.#draftHtml(pool, names);
    else if (this.#tab === TAB.REPORT) body = LotteryCharts.render(this.#service.buildReport(pool));
    else body = this.#scheduleHtml(pool);

    this.#content.innerHTML = `
      <a href="#" class="link debt-back-link" data-action="back"><i class="fa-solid fa-arrow-right"></i> بازگشت به لیست</a>
      ${this.#summaryHtml(pool)}
      ${tabs}
      ${body}
    `;
  }

  #summaryHtml(pool) {
    const stat = (label, value) => `<div class="lottery-stat"><span class="lottery-stat__label">${label}</span><span class="lottery-stat__value">${value}</span></div>`;
    return `
      <div class="lottery-stats">
        ${stat('مبلغ وام هر نوبت', AmountFormat.toman(pool.totalAmount))}
        ${stat('قسط ماهانه هر سهم', AmountFormat.toman(pool.perShareAmount))}
        ${stat('تعداد ماه / سهم', `${AmountFormat.number(pool.totalMonths)} / ${AmountFormat.number(pool.totalShares)}`)}
        ${stat('برنده در هر ماه', AmountFormat.number(pool.winnersPerMonth))}
      </div>`;
  }

  #draftHtml(pool, names) {
    const nameOf = (id) => HtmlSanitizer.escape(names.get(id) ?? '—');
    const people = pool.participants.map((p) => `
      <div class="lottery-person-line">
        <span>${nameOf(p.personId)}</span>
        <span class="lottery-person-line__meta">${AmountFormat.number(p.shares)} سهم · ${AmountFormat.toman(pool.dueAmountOf(p.personId))} در ماه</span>
      </div>`).join('');

    const preview = pool.hasDraw ? `
      <section class="section-header"><h2>ترتیب دریافت وام</h2></section>
      <div class="lottery-order">
        ${pool.assignments.map((winners, i) => `
          <div class="lottery-order__row">
            <span class="lottery-order__month">${AmountFormat.number(i + 1)}</span>
            <span class="lottery-order__date">${JalaliCalendar.formatISOToJalali(pool.dueDateOf(i + 1))}</span>
            <span class="lottery-order__names">${winners.map(nameOf).join('، ')}</span>
          </div>`).join('')}
      </div>
      <button type="button" class="btn btn--primary btn--full" data-action="start">نهایی‌کردن و شروع وام</button>
    ` : '<p class="empty-state">هنوز ترتیب دریافت مشخص نشده است.</p>';

    return `
      <section class="section-header"><h2>شرکت‌کنندگان</h2></section>
      <div class="lottery-people-list">${people}</div>
      <p class="lottery-hint lottery-hint--info">
        <i class="fa-solid fa-circle-info"></i>
        ${pool.keepWinnerConsecutive ? 'سهم‌های هر فرد پشت‌سرهم قرعه می‌خورد.' : 'سهم‌های هر فرد تا حد امکان در ماه‌های غیرمتوالی پخش می‌شود.'}
      </p>
      <div class="lottery-actions">
        <button type="button" class="btn btn--primary" data-action="draw-random"><i class="fa-solid fa-shuffle"></i> قرعه‌کشی تصادفی</button>
        <button type="button" class="btn btn--outline" data-action="draw-manual"><i class="fa-solid fa-hand-pointer"></i> انتخاب دستی</button>
        ${pool.hasDraw ? '<button type="button" class="btn btn--outline" data-action="clear-draw"><i class="fa-solid fa-eraser"></i> پاک‌کردن ترتیب</button>' : ''}
      </div>
      ${preview}`;
  }

  #scheduleHtml(pool) {
    const report = this.#service.buildReport(pool);
    const firstOpen = report.months.find((m) => m.paidCount < m.payers.length || m.payoutsDone < m.winnerSlots.length)?.month;

    return `<div class="lottery-months">${report.months.map((m) => {
      const isOpen = this.#openMonths.has(m.month) || (this.#openMonths.size === 0 && m.month === firstOpen);
      const winnerNames = m.winnerSlots.map((s) => HtmlSanitizer.escape(s.name)).join('، ');
      const allDone = m.paidCount === m.payers.length && m.payoutsDone === m.winnerSlots.length;
      const state = allDone ? 'done' : (m.isOverdue ? 'overdue' : '');
      return `
        <details class="lottery-month ${state ? `lottery-month--${state}` : ''}" data-month="${m.month}" ${isOpen ? 'open' : ''}>
          <summary class="lottery-month__summary">
            <span class="lottery-month__badge">${AmountFormat.number(m.month)}</span>
            <div class="lottery-month__info">
              <strong><i class="fa-solid fa-trophy"></i> ${winnerNames}</strong>
              <small>${JalaliCalendar.formatISOToJalali(m.dueISO)} · ${AmountFormat.number(m.paidCount)} از ${AmountFormat.number(m.payers.length)} قسط</small>
              <small class="lottery-month__progress">وام: ${AmountFormat.number(m.payoutsDone)} از ${AmountFormat.number(m.winnerSlots.length)} تحویل شد</small>
            </div>
            <span class="lottery-month__amount">${AmountFormat.number(pool.totalAmount * m.winnerSlots.length)}</span>
          </summary>
          <div class="lottery-month__payers">
            <div class="lottery-month__section-title"><i class="fa-solid fa-trophy"></i> دریافت وام</div>
            ${m.winnerSlots.map((s) => this.#winnerRowHtml(m, s)).join('')}
            <div class="lottery-month__section-title"><i class="fa-solid fa-coins"></i> اقساط این ماه</div>
            ${m.payers.map((p) => this.#payerRowHtml(m, p)).join('')}
          </div>
        </details>`;
    }).join('')}</div>`;
  }

  #winnerRowHtml(month, slot) {
    const received = Boolean(slot.payout);
    const status = received
      ? `دریافت: ${JalaliCalendar.formatISOToJalali(slot.payout.receivedAt)}`
      : 'هنوز دریافت نکرده';
    return `
      <div class="lottery-payer ${received ? 'lottery-payer--received' : ''}">
        <div class="lottery-payer__info">
          <span>${HtmlSanitizer.escape(slot.name)} <i class="fa-solid fa-trophy"></i></span>
          <small>${status}</small>
        </div>
        <span class="lottery-payer__amount">${AmountFormat.number(slot.amount)}</span>
        <button type="button" class="btn btn--small ${received ? 'btn--outline' : 'btn--primary'}"
          data-action="${received ? 'unpayout' : 'payout'}" data-month="${month.month}" data-slot="${slot.slot}">
          ${received ? 'لغو' : 'ثبت دریافت'}
        </button>
      </div>`;
  }

  #payerRowHtml(month, payer) {
    const status = payer.payment
      ? `پرداخت: ${JalaliCalendar.formatISOToJalali(payer.payment.paidAt)}`
      : (month.isOverdue ? '<span class="lottery-late">معوق</span>' : 'پرداخت‌نشده');
    return `
      <div class="lottery-payer ${payer.payment ? 'lottery-payer--paid' : ''}">
        <div class="lottery-payer__info">
          <span>${HtmlSanitizer.escape(payer.name)}${payer.shares > 1 ? ` (${AmountFormat.number(payer.shares)} سهم)` : ''}</span>
          <small>${status}</small>
        </div>
        <span class="lottery-payer__amount">${AmountFormat.number(payer.amount)}</span>
        <button type="button" class="btn btn--small ${payer.payment ? 'btn--outline' : 'btn--primary'}"
          data-action="${payer.payment ? 'unpay' : 'pay'}" data-month="${month.month}" data-person="${payer.personId}">
          ${payer.payment ? 'لغو' : 'ثبت پرداخت'}
        </button>
      </div>`;
  }

  // ---------------- Events ----------------
  #onToggle(event) {
    const details = event.target.closest?.('.lottery-month');
    if (!details) return;
    const month = Number(details.dataset.month);
    if (details.open) this.#openMonths.add(month);
    else this.#openMonths.delete(month);
  }

  #onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const { action } = target.dataset;
    if (action === 'back') event.preventDefault();
    const month = Number(target.dataset.month);

    const handlers = {
      back: () => this.#goList(),
      open: () => this.#openDetail(target.dataset.id),
      delete: () => this.#deletePool(target.dataset.id),
      tab: () => { this.#tab = target.dataset.tab; this.#renderCurrentView(); },
      'draw-random': () => this.#drawRandom(),
      'draw-manual': () => this.#openManualDraw(),
      'clear-draw': () => this.#run(() => this.#service.clearDraw(this.#activeId)),
      start: () => this.#startPool(),
      pay: () => this.#openPayment(month, target.dataset.person),
      unpay: () => this.#confirmThenRun('این پرداخت لغو شود؟', () => this.#service.cancelPayment(this.#activeId, month, target.dataset.person)),
      payout: () => this.#openPayout(month, Number(target.dataset.slot)),
      unpayout: () => this.#confirmThenRun('ثبت دریافت وام لغو شود؟', () => this.#service.cancelPayout(this.#activeId, month, Number(target.dataset.slot))),
    };
    handlers[action]?.();
  }

  #goList() {
    this.#view = 'list';
    this.#activeId = null;
    this.#openMonths.clear();
    this.#tab = TAB.SCHEDULE;
    this.#renderCurrentView();
  }

  #openDetail(id) {
    this.#activeId = id;
    this.#view = 'detail';
    this.#openMonths.clear();
    this.#renderCurrentView();
  }

  #deletePool(id) {
    const pool = this.#service.get(id);
    if (!pool || !confirm(`قرعه‌کشی «${pool.title}» با همه اطلاعاتش حذف شود؟`)) return;
    this.#service.remove(id);
    this.#renderCurrentView();
  }

  /** Runs a mutation and re-renders; surfaces domain errors to the user. */
  #run(action) {
    try {
      action();
      this.#renderCurrentView();
    } catch (error) {
      alert(error.message);
    }
  }

  #confirmThenRun(message, action) {
    if (confirm(message)) this.#run(action);
  }

  #drawRandom() {
    const pool = this.#service.get(this.#activeId);
    if (pool.hasDraw && !confirm('ترتیب فعلی با قرعه‌کشی جدید جایگزین شود؟')) return;
    this.#run(() => {
      const { conflicts } = this.#service.drawRandom(this.#activeId);
      if (conflicts > 0) {
        alert('با این تعداد سهم، پخش کامل نوبت‌ها ممکن نبود؛ نزدیک‌ترین حالت ممکن انتخاب شد. در صورت نیاز دوباره قرعه بزنید یا دستی تنظیم کنید.');
      }
    });
  }

  #openManualDraw() {
    const pool = this.#service.get(this.#activeId);
    LotteryManualDrawModal.open({
      pool,
      names: this.#service.peopleNames(),
      onSubmit: (assignments) => {
        this.#service.assignManual(this.#activeId, assignments);
        this.#renderCurrentView();
      },
    });
  }

  #startPool() {
    if (!confirm('بعد از شروع، ترتیب برندگان قابل تغییر نیست. ادامه می‌دهید؟')) return;
    this.#run(() => this.#service.start(this.#activeId));
  }

  #openPayment(month, personId) {
    const pool = this.#service.get(this.#activeId);
    const names = this.#service.peopleNames();
    LotteryPaymentModal.open({
      title: `ثبت پرداخت قسط ماه ${month}`,
      personName: names.get(personId) ?? '—',
      amount: pool.dueAmountOf(personId),
      onSubmit: (iso) => this.#run(() => this.#service.recordPayment(this.#activeId, month, personId, iso)),
    });
  }

  #openPayout(month, slot) {
    const pool = this.#service.get(this.#activeId);
    const names = this.#service.peopleNames();
    const personId = pool.winnersOf(month)[slot];
    LotteryPaymentModal.open({
      title: `ثبت دریافت وام ماه ${month}`,
      personName: names.get(personId) ?? '—',
      amount: pool.totalAmount,
      dateLabel: 'تاریخ دریافت وام',
      submitLabel: 'ثبت دریافت',
      onSubmit: (iso) => this.#run(() => this.#service.recordPayout(this.#activeId, month, slot, iso)),
    });
  }

  #openCreateModal() {
    LotteryFormModal.open({
      knownNames: this.#service.listPeopleNames(),
      onSubmit: (dto) => {
        const pool = this.#service.create(dto);
        this.#openDetail(pool.id);
      },
    });
  }
}
