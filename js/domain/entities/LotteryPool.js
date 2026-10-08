import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

export const LOTTERY_STATUS = Object.freeze({ DRAFT: 'draft', ACTIVE: 'active' });

const MAX_MONTHS = 120;

/**
 * Entity (Aggregate Root): LotteryPool
 * A zero-interest rotating savings pool ("قرعه‌کشی قرض‌الحسنه").
 *
 * Invariants:
 *  - totalShares === totalMonths * winnersPerMonth
 *    (every share wins exactly once over the life of the pool)
 *  - every share pays `perShareAmount = totalAmount / totalMonths` each month,
 *    so one month's collection equals `winnersPerMonth * totalAmount`.
 *
 * Two kinds of cash events are tracked once the pool is active:
 *  - payments: a participant paid their monthly installment (month + personId)
 *  - payouts:  a winner received the loan (month + winner slot). The slot index
 *              keeps things unambiguous when one person wins twice in a month.
 *
 * Amounts are whole Toman, consistent with the rest of the app.
 */
export class LotteryPool {
  constructor({
    id,
    title,
    totalMonths,
    startDate,
    totalAmount,
    winnersPerMonth = 1,
    keepWinnerConsecutive = false,
    participants,
    status = LOTTERY_STATUS.DRAFT,
    assignments = [],
    payments = [],
    payouts = [],
    createdAt,
    finalizedAt = null,
  }) {
    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) throw new Error('عنوان قرعه‌کشی الزامی است');
    if (!Number.isInteger(totalMonths) || totalMonths < 1 || totalMonths > MAX_MONTHS) {
      throw new Error(`تعداد ماه‌ها باید عددی بین ۱ تا ${MAX_MONTHS} باشد`);
    }
    if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
      throw new Error('مبلغ وام باید یک عدد مثبت باشد');
    }
    if (!Number.isInteger(winnersPerMonth) || winnersPerMonth < 1) {
      throw new Error('تعداد برنده در هر ماه باید حداقل ۱ باشد');
    }
    if (!startDate || Number.isNaN(new Date(startDate).getTime())) {
      throw new Error('تاریخ شروع معتبر نیست');
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('حداقل یک شرکت‌کننده لازم است');
    }

    const seen = new Set();
    let shareSum = 0;
    participants.forEach((p) => {
      if (!p.personId) throw new Error('شرکت‌کننده نامعتبر است');
      if (!Number.isInteger(p.shares) || p.shares < 1) throw new Error('تعداد سهم هر نفر باید حداقل ۱ باشد');
      if (seen.has(p.personId)) throw new Error('یک نفر نباید چند بار در فهرست تکرار شود (تعداد سهم او را بیشتر کنید)');
      seen.add(p.personId);
      shareSum += p.shares;
    });

    const requiredShares = totalMonths * winnersPerMonth;
    if (shareSum !== requiredShares) {
      throw new Error(`مجموع سهم‌ها (${shareSum}) باید برابر «تعداد ماه × برنده در هر ماه» (${requiredShares}) باشد`);
    }

    this.id = id || crypto.randomUUID();
    this.title = cleanTitle;
    this.totalMonths = totalMonths;
    this.startDate = new Date(startDate).toISOString();
    this.totalAmount = totalAmount;
    this.winnersPerMonth = winnersPerMonth;
    this.keepWinnerConsecutive = Boolean(keepWinnerConsecutive);
    this.participants = participants.map((p) => ({ personId: p.personId, shares: p.shares }));
    this.status = status;
    this.assignments = assignments.map((month) => [...month]);
    this.payments = payments.map((p) => ({ ...p }));
    this.payouts = payouts.map((p) => ({ ...p }));
    this.createdAt = createdAt || new Date().toISOString();
    this.finalizedAt = finalizedAt;
  }

  get totalShares() {
    return this.participants.reduce((sum, p) => sum + p.shares, 0);
  }

  get totalPayoutSlots() {
    return this.totalMonths * this.winnersPerMonth;
  }

  get perShareAmount() {
    return Math.round(this.totalAmount / this.totalMonths);
  }

  get expectedMonthlyCollection() {
    return this.totalShares * this.perShareAmount;
  }

  get hasDraw() {
    return this.assignments.length === this.totalMonths;
  }

  get isActive() {
    return this.status === LOTTERY_STATUS.ACTIVE;
  }

  get isCompleted() {
    return this.isActive
      && this.payments.length >= this.totalMonths * this.participants.length
      && this.payouts.length >= this.totalPayoutSlots;
  }

  sharesOf(personId) {
    return this.participants.find((p) => p.personId === personId)?.shares ?? 0;
  }

  dueAmountOf(personId) {
    return this.sharesOf(personId) * this.perShareAmount;
  }

  winnersOf(month) {
    return this.assignments[month - 1] ?? [];
  }

  /** ISO date of the given month's due date (same Jalali day-of-month as the start date, clamped). */
  dueDateOf(month) {
    const { jy, jm, jd } = JalaliCalendar.toJalali(new Date(this.startDate));
    const monthIndex = jm - 1 + (month - 1);
    const year = jy + Math.floor(monthIndex / 12);
    const monthNumber = (monthIndex % 12) + 1;
    const day = Math.min(jd, JalaliCalendar.daysInMonth(year, monthNumber));
    return JalaliCalendar.toGregorian(year, monthNumber, day).toISOString();
  }

  /** Returns the first rule violation as { type, ... } or null when the assignment is valid. */
  validateAssignments(assignments) {
    if (!Array.isArray(assignments) || assignments.length !== this.totalMonths) {
      return { type: 'months' };
    }
    const known = new Set(this.participants.map((p) => p.personId));
    const used = new Map();

    for (let i = 0; i < assignments.length; i += 1) {
      const winners = assignments[i];
      if (!Array.isArray(winners) || winners.length !== this.winnersPerMonth) {
        return { type: 'winners', month: i + 1, expected: this.winnersPerMonth };
      }
      for (const personId of winners) {
        if (!known.has(personId)) return { type: 'unknown', month: i + 1 };
        used.set(personId, (used.get(personId) ?? 0) + 1);
      }
    }
    for (const p of this.participants) {
      const actual = used.get(p.personId) ?? 0;
      if (actual !== p.shares) return { type: 'shares', personId: p.personId, expected: p.shares, actual };
    }
    return null;
  }

  applyAssignments(assignments) {
    if (this.isActive) throw new Error('قرعه‌کشی شروع شده و ترتیب آن قابل تغییر نیست');
    const issue = this.validateAssignments(assignments);
    if (issue) throw new Error('ترتیب برندگان معتبر نیست');
    this.assignments = assignments.map((month) => [...month]);
  }

  clearAssignments() {
    if (this.isActive) throw new Error('قرعه‌کشی شروع شده و ترتیب آن قابل تغییر نیست');
    this.assignments = [];
  }

  activate() {
    if (!this.hasDraw) throw new Error('ابتدا ترتیب برندگان را مشخص کنید');
    this.status = LOTTERY_STATUS.ACTIVE;
    this.finalizedAt = new Date().toISOString();
  }

  // ---------------- Installment payments ----------------
  findPayment(month, personId) {
    return this.payments.find((p) => p.month === month && p.personId === personId) ?? null;
  }

  recordPayment(month, personId, paidAtISO) {
    this.#assertActiveMonth(month);
    if (this.sharesOf(personId) === 0) throw new Error('این فرد عضو قرعه‌کشی نیست');
    LotteryPool.#assertDate(paidAtISO, 'تاریخ پرداخت معتبر نیست');

    this.payments = this.payments.filter((p) => !(p.month === month && p.personId === personId));
    this.payments.push({ month, personId, paidAt: new Date(paidAtISO).toISOString() });
  }

  cancelPayment(month, personId) {
    this.payments = this.payments.filter((p) => !(p.month === month && p.personId === personId));
  }

  // ---------------- Loan payouts (winner receives the money) ----------------
  findPayout(month, slot) {
    return this.payouts.find((p) => p.month === month && p.slot === slot) ?? null;
  }

  recordPayout(month, slot, receivedAtISO) {
    this.#assertActiveMonth(month);
    const personId = this.winnersOf(month)[slot];
    if (!personId) throw new Error('برنده‌ای برای این نوبت وجود ندارد');
    LotteryPool.#assertDate(receivedAtISO, 'تاریخ دریافت معتبر نیست');

    this.payouts = this.payouts.filter((p) => !(p.month === month && p.slot === slot));
    this.payouts.push({ month, slot, personId, receivedAt: new Date(receivedAtISO).toISOString() });
  }

  cancelPayout(month, slot) {
    this.payouts = this.payouts.filter((p) => !(p.month === month && p.slot === slot));
  }

  #assertActiveMonth(month) {
    if (!this.isActive) throw new Error('وام هنوز شروع نشده است');
    if (!Number.isInteger(month) || month < 1 || month > this.totalMonths) throw new Error('ماه نامعتبر است');
  }

  static #assertDate(iso, message) {
    if (Number.isNaN(new Date(iso).getTime())) throw new Error(message);
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(raw) {
    return new LotteryPool(raw);
  }
}
