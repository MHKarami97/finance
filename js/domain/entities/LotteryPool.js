import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

export const LOTTERY_STATUS = Object.freeze({ DRAFT: 'draft', ACTIVE: 'active' });

const MAX_MONTHS = 120;
const FULL = 1;
const HALF = 0.5;

/**
 * Entity (Aggregate Root): LotteryPool
 * A zero-interest rotating savings pool ("قرعه‌کشی قرض‌الحسنه").
 *
 * Shares: a participant holds a multiple of 0.5 shares (0.5, 1, 1.5, 2.5 ...).
 * A holding is split into whole slots plus, for a fractional holding, exactly
 * one half slot: 1.5 = one full slot + one half slot. Two half slots (always of
 * two different people) share one winner unit in the same month and each
 * receives half of the loan.
 *
 * Invariants:
 *  - sum(shares) === totalMonths * winnersPerMonth (one winner unit per share)
 *  - the number of people with a half slot is even (so every half has a partner)
 *  - a share pays `perShareAmount = totalAmount / totalMonths` every month
 *
 * assignments[m] = winner entries of month m + 1: [{ personId, portion }] where
 * portion is 1 or 0.5 and the portions of a month add up to winnersPerMonth.
 * Legacy data stored plain personId strings; they are normalized on load.
 *
 * Cash events once active:
 *  - payments: a participant paid a monthly installment (month + personId)
 *  - payouts:  a winner entry received its part of the loan (month + entry index)
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
      if (!LotteryPool.#isValidShare(p.shares)) {
        throw new Error('تعداد سهم هر نفر باید مضربی از ۰٫۵ و حداقل ۰٫۵ باشد (مثلاً ۰٫۵ یا ۱ یا ۱٫۵)');
      }
      if (seen.has(p.personId)) throw new Error('یک نفر نباید چند بار در فهرست تکرار شود (تعداد سهم او را بیشتر کنید)');
      seen.add(p.personId);
      shareSum += p.shares;
    });

    const halfHolders = participants.filter((p) => !Number.isInteger(p.shares)).length;
    if (halfHolders % 2 !== 0) {
      throw new Error('تعداد افراد دارای نیم‌سهم (مثل ۰٫۵ یا ۱٫۵) باید زوج باشد تا هر نیم‌سهم یک هم‌نوبتی داشته باشد');
    }

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
    this.assignments = assignments.map((month) => month.map(LotteryPool.normalizeEntry));
    this.payments = payments.map((p) => ({ ...p }));
    this.payouts = payouts.map((p) => ({ ...p }));
    this.createdAt = createdAt || new Date().toISOString();
    this.finalizedAt = finalizedAt;
  }

  static #isValidShare(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= HALF && Number.isInteger(value * 2);
  }

  /** Accepts a legacy personId string or an entry object and returns { personId, portion }. */
  static normalizeEntry(entry) {
    if (typeof entry === 'string') return { personId: entry, portion: FULL };
    return { personId: entry?.personId, portion: entry?.portion ?? FULL };
  }

  get totalShares() {
    return this.participants.reduce((sum, p) => sum + p.shares, 0);
  }

  get hasHalfShares() {
    return this.participants.some((p) => !Number.isInteger(p.shares));
  }

  /** Number of winner entries over the whole pool (a half slot counts as one entry). */
  get totalPayoutSlots() {
    return this.participants.reduce((sum, p) => sum + Math.ceil(p.shares), 0);
  }

  get perShareAmount() {
    return Math.round(this.totalAmount / this.totalMonths);
  }

  get expectedMonthlyCollection() {
    return this.participants.reduce((sum, p) => sum + this.dueAmountOf(p.personId), 0);
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
    return Math.round(this.sharesOf(personId) * this.perShareAmount);
  }

  /** Winner entries ([{ personId, portion }]) of the given month. */
  winnersOf(month) {
    return this.assignments[month - 1] ?? [];
  }

  /** Loan amount the given winner entry receives (half slots receive half). */
  payoutAmountOf(month, slot) {
    const portion = this.winnersOf(month)[slot]?.portion ?? FULL;
    return Math.round(this.totalAmount * portion);
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
    const usage = new Map(this.participants.map((p) => [p.personId, { full: 0, half: 0 }]));

    for (let i = 0; i < assignments.length; i += 1) {
      const month = i + 1;
      if (!Array.isArray(assignments[i])) return { type: 'winners', month, expected: this.winnersPerMonth };

      let portions = 0;
      const halfIds = [];
      for (const raw of assignments[i]) {
        const { personId, portion } = LotteryPool.normalizeEntry(raw);
        if (!known.has(personId)) return { type: 'unknown', month };
        if (portion !== FULL && portion !== HALF) return { type: 'unknown', month };
        portions += portion;
        if (portion === HALF) {
          halfIds.push(personId);
          usage.get(personId).half += 1;
        } else {
          usage.get(personId).full += 1;
        }
      }
      if (portions !== this.winnersPerMonth) return { type: 'winners', month, expected: this.winnersPerMonth };
      if (new Set(halfIds).size !== halfIds.length) return { type: 'pair', month };
    }

    for (const p of this.participants) {
      const used = usage.get(p.personId);
      const expectedHalf = Number.isInteger(p.shares) ? 0 : 1;
      if (used.full !== Math.floor(p.shares) || used.half !== expectedHalf) {
        return { type: 'shares', personId: p.personId, expected: p.shares, actual: used.full + used.half * HALF };
      }
    }
    return null;
  }

  applyAssignments(assignments) {
    if (this.isActive) throw new Error('قرعه‌کشی شروع شده و ترتیب آن قابل تغییر نیست');
    if (this.validateAssignments(assignments)) throw new Error('ترتیب برندگان معتبر نیست');
    this.assignments = assignments.map((month) => month.map(LotteryPool.normalizeEntry));
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

  // ---------------- Loan payouts (a winner receives the money) ----------------
  findPayout(month, slot) {
    return this.payouts.find((p) => p.month === month && p.slot === slot) ?? null;
  }

  recordPayout(month, slot, receivedAtISO) {
    this.#assertActiveMonth(month);
    const entry = this.winnersOf(month)[slot];
    if (!entry) throw new Error('برنده‌ای برای این نوبت وجود ندارد');
    LotteryPool.#assertDate(receivedAtISO, 'تاریخ دریافت معتبر نیست');

    this.payouts = this.payouts.filter((p) => !(p.month === month && p.slot === slot));
    this.payouts.push({
      month,
      slot,
      personId: entry.personId,
      portion: entry.portion,
      receivedAt: new Date(receivedAtISO).toISOString(),
    });
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
