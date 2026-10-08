import { LotteryPool } from '../domain/entities/LotteryPool.js';
import { LotteryDrawStrategyFactory } from '../domain/services/LotteryDrawStrategies.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Application Service: LotteryService
 * Use cases of the interest-free lottery ("قرعه‌کشی قرض‌الحسنه"): create a
 * pool, draw (random / manual), start it, record installment payments and
 * loan payouts, and build the numbers behind the report charts. Participants
 * come from the shared people roster owned by DebtService.
 */
export class LotteryService {
  #repo;
  #debtService;

  constructor(lotteryRepo, debtService) {
    this.#repo = lotteryRepo;
    this.#debtService = debtService;
  }

  // ---------------- People ----------------
  listPeopleNames() {
    return this.#debtService.listPeople().map((p) => p.name);
  }

  peopleNames() {
    return new Map(this.#debtService.listPeople().map((p) => [p.id, p.name]));
  }

  // ---------------- CRUD ----------------
  list() {
    return this.#repo.getAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  get(id) {
    return this.#repo.getById(id);
  }

  /** dto.participants: [{ name, shares }] — names are resolved against / added to the roster. */
  create({ participants, ...rest }) {
    const normalized = participants.map((p) => ({
      personId: String(p.name ?? '').trim().toLowerCase(),
      shares: p.shares,
    }));
    new LotteryPool({ ...rest, participants: normalized }); // dry run: validate before touching the roster

    const resolved = participants.map((p) => ({
      personId: this.#debtService.getOrCreatePerson(p.name).id,
      shares: p.shares,
    }));
    return this.#repo.add(new LotteryPool({ ...rest, participants: resolved }));
  }

  remove(id) {
    this.#repo.remove(id);
  }

  // ---------------- Draw ----------------
  drawRandom(id) {
    const pool = this.#require(id);
    const { assignments, conflicts } = LotteryDrawStrategyFactory.forPool(pool).draw(pool);
    pool.applyAssignments(assignments);
    this.#repo.update(pool);
    return { conflicts };
  }

  assignManual(id, assignments) {
    const pool = this.#require(id);
    const issue = pool.validateAssignments(assignments);
    if (issue) throw new Error(this.describeIssue(issue));
    pool.applyAssignments(assignments);
    this.#repo.update(pool);
  }

  clearDraw(id) {
    const pool = this.#require(id);
    pool.clearAssignments();
    this.#repo.update(pool);
  }

  start(id) {
    const pool = this.#require(id);
    pool.activate();
    this.#repo.update(pool);
  }

  describeIssue(issue) {
    const names = this.peopleNames();
    switch (issue.type) {
      case 'winners': return `مجموع سهم برندگان ماه ${issue.month} باید دقیقاً ${issue.expected} باشد (هر نیم‌سهم ۰٫۵ حساب می‌شود)`;
      case 'pair': return `در ماه ${issue.month} یک نفر دو بار به‌عنوان نیم‌سهم انتخاب شده است`;
      case 'shares': return `«${names.get(issue.personId) ?? '—'}» با ${issue.actual} سهم انتخاب شده ولی ${issue.expected} سهم دارد (سهم کامل‌ها و نیم‌سهم او باید جدا رعایت شود)`;
      case 'unknown': return `در ماه ${issue.month} فرد یا مقدار نامعتبر انتخاب شده است`;
      default: return 'ترتیب برندگان معتبر نیست';
    }
  }

  // ---------------- Installment payments ----------------
  recordPayment(id, month, personId, paidAtISO) {
    this.#mutate(id, (pool) => pool.recordPayment(month, personId, paidAtISO));
  }

  cancelPayment(id, month, personId) {
    this.#mutate(id, (pool) => pool.cancelPayment(month, personId));
  }

  // ---------------- Loan payouts ----------------
  recordPayout(id, month, slot, receivedAtISO) {
    this.#mutate(id, (pool) => pool.recordPayout(month, slot, receivedAtISO));
  }

  cancelPayout(id, month, slot) {
    this.#mutate(id, (pool) => pool.cancelPayout(month, slot));
  }

  // ---------------- Reporting ----------------
  buildSummary(pool, now = new Date()) {
    const report = this.buildReport(pool, now);
    return {
      percent: report.percent,
      collected: report.totalCollected,
      expected: report.totalExpected,
      payoutsDone: report.payoutsDone,
      payoutSlots: report.payoutSlots,
    };
  }

  buildReport(pool, now = new Date()) {
    const names = this.peopleNames();
    const nowMs = now.getTime();
    let runningExpected = 0;
    let runningCollected = 0;
    let runningPaidOut = 0;
    let currentMonth = 0;

    const months = Array.from({ length: pool.totalMonths }, (_, index) => {
      const month = index + 1;
      const dueISO = pool.dueDateOf(month);
      const dueStart = new Date(dueISO).getTime();
      const dueEnd = dueStart + DAY_MS - 1;
      if (dueStart <= nowMs) currentMonth = month;

      const payers = pool.participants.map((p) => ({
        personId: p.personId,
        name: names.get(p.personId) ?? '—',
        shares: p.shares,
        amount: pool.dueAmountOf(p.personId),
        payment: pool.findPayment(month, p.personId),
      }));

      const winnerSlots = pool.winnersOf(month).map((entry, slot) => ({
        slot,
        personId: entry.personId,
        portion: entry.portion,
        name: names.get(entry.personId) ?? '—',
        amount: pool.payoutAmountOf(month, slot),
        payout: pool.findPayout(month, slot),
      }));

      const expected = payers.reduce((sum, p) => sum + p.amount, 0);
      const collected = payers.reduce((sum, p) => sum + (p.payment ? p.amount : 0), 0);
      const paidCount = payers.filter((p) => p.payment).length;
      const payoutsDone = winnerSlots.filter((s) => s.payout).length;
      runningExpected += expected;
      runningCollected += collected;
      runningPaidOut += winnerSlots.reduce((sum, s) => sum + (s.payout ? s.amount : 0), 0);

      return {
        month,
        dueISO,
        winnerSlots,
        payers,
        expected,
        collected,
        paidCount,
        payoutsDone,
        isOverdue: nowMs > dueEnd && collected < expected,
        overdueAmount: nowMs > dueEnd ? expected - collected : 0,
        cumulativeExpected: runningExpected,
        cumulativeCollected: runningCollected,
        cumulativePaidOut: runningPaidOut,
      };
    });

    const people = pool.participants.map((p) => {
      const rows = months.map((m) => m.payers.find((x) => x.personId === p.personId));
      const due = rows.reduce((sum, r) => sum + r.amount, 0);
      const paid = rows.reduce((sum, r) => sum + (r.payment ? r.amount : 0), 0);
      const overdue = months.reduce((sum, m, i) => {
        const late = nowMs > new Date(m.dueISO).getTime() + DAY_MS - 1;
        return sum + (late && !rows[i].payment ? rows[i].amount : 0);
      }, 0);
      return {
        personId: p.personId,
        name: names.get(p.personId) ?? '—',
        shares: p.shares,
        due,
        paid,
        overdue,
        remaining: due - paid,
        paidCount: rows.filter((r) => r.payment).length,
        totalCount: rows.length,
        receivedCount: pool.payouts.filter((x) => x.personId === p.personId).length,
        slotCount: Math.ceil(p.shares),
      };
    });

    const totalExpected = months.reduce((sum, m) => sum + m.expected, 0);
    const totalCollected = months.reduce((sum, m) => sum + m.collected, 0);
    const totalOverdue = months.reduce((sum, m) => sum + m.overdueAmount, 0);
    const payoutsDone = months.reduce((sum, m) => sum + m.payoutsDone, 0);
    const totalPaidOut = months.at(-1)?.cumulativePaidOut ?? 0;
    const totalPayoutExpected = pool.totalAmount * pool.totalMonths * pool.winnersPerMonth;

    return {
      months,
      people,
      currentMonth,
      totalExpected,
      totalCollected,
      totalRemaining: totalExpected - totalCollected,
      totalOverdue,
      percent: totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0,
      payoutSlots: pool.totalPayoutSlots,
      payoutsDone,
      totalPaidOut,
      totalPayoutRemaining: totalPayoutExpected - totalPaidOut,
      payoutPercent: totalPayoutExpected ? Math.round((totalPaidOut / totalPayoutExpected) * 100) : 0,
      cashOnHand: totalCollected - totalPaidOut,
    };
  }

  #mutate(id, action) {
    const pool = this.#require(id);
    action(pool);
    this.#repo.update(pool);
  }

  #require(id) {
    const pool = this.#repo.getById(id);
    if (!pool) throw new Error('قرعه‌کشی پیدا نشد');
    return pool;
  }
}
