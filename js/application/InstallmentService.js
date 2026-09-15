import { Installment } from '../domain/entities/Installment.js';

/**
 * Application Service: InstallmentService
 * Orchestrates CRUD use cases for the "اقساط" feature (installments, loans,
 * bills), the monthly payment checklist for the "قسط" kind, the "اتمام"
 * (mark-as-finished) workflow, and the top-of-page summary totals. Centralizes
 * all date/amount arithmetic so presentation code never touches raw Date or
 * sum logic directly — Single Responsibility, consistent with
 * TransactionService and DebtService in this codebase.
 */
export class InstallmentService {
  #repo;

  constructor(installmentRepo) {
    this.#repo = installmentRepo;
  }

  create(dto) {
    const installment = new Installment(dto);
    this.#repo.add(installment);
    return installment;
  }

  update(id, dto) {
    const installment = new Installment({ id, ...dto });
    this.#repo.update(installment);
    return installment;
  }

  remove(id) {
    this.#repo.remove(id);
  }

  listAll() {
    return this.#repo.getAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  listByKind(kind) {
    return this.listAll().filter((i) => i.kind === kind);
  }

  /** Items still being paid off — everything shown in the main list and counted in the live totals. */
  listActive() {
    return this.listAll().filter((i) => !i.completed);
  }

  /** Items the user explicitly marked as finished ("اتمام") — shown in the bottom "تمام‌شده" section. */
  listCompleted() {
    return this.listAll().filter((i) => i.completed);
  }

  /** Toggles a single month's paid checkbox for an installment-kind item. */
  togglePaid(id, index) {
    const installment = this.#repo.getById(id);
    if (!installment || installment.kind !== 'installment') return null;
    const paid = [...installment.paidInstallments];
    paid[index] = !paid[index];
    const updated = new Installment({ ...installment, paidInstallments: paid });
    this.#repo.update(updated);
    return updated;
  }

  /** Marks the whole item as finished/paid-off; removes it from active totals. */
  complete(id) {
    const installment = this.#repo.getById(id);
    if (!installment) return null;
    const updated = new Installment({
      ...installment,
      completed: true,
      completedAt: new Date().toISOString(),
    });
    this.#repo.update(updated);
    return updated;
  }

  /** Reverses an accidental "اتمام" — moves the item back to the active list. */
  reopen(id) {
    const installment = this.#repo.getById(id);
    if (!installment) return null;
    const updated = new Installment({ ...installment, completed: false, completedAt: null });
    this.#repo.update(updated);
    return updated;
  }

  /**
   * Builds the per-month payment schedule for an installment-kind item:
   * one row per installment, starting at `installmentDate` and stepping one
   * calendar month at a time. Only meaningful when `installmentCount` and
   * `perInstallmentAmount` are set (kind === 'installment').
   */
  static buildSchedule(installment) {
    if (installment.kind !== 'installment' || !installment.installmentCount) return [];
    const startISO = installment.installmentDate || installment.receivedDate || new Date().toISOString();
    const start = new Date(startISO);

    return Array.from({ length: installment.installmentCount }, (_, index) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + index);
      const paid = Boolean(installment.paidInstallments[index]);
      return {
        index,
        dueDate: due.toISOString(),
        amount: installment.perInstallmentAmount || 0,
        paid,
        overdue: !paid && InstallmentService.daysUntil(due.toISOString()) < 0,
      };
    });
  }

  /**
   * Top-of-page totals:
   * - monthlyTotal: sum of per-month installment amounts across active "قسط" items.
   * - totalPaid: everything paid so far — checked-off installment months (active
   *   items) plus the full amount of every finished item, regardless of kind.
   * - totalRemaining: outstanding balance across active items only (unchecked
   *   installment months, or the full amount for active loans/bills).
   * - totalPaidCompleted: the portion of totalPaid that came from finished items,
   *   shown separately in the "تمام‌شده" section.
   */
  computeSummary() {
    const active = this.listActive();
    const completed = this.listCompleted();

    const monthlyTotal = active
      .filter((i) => i.kind === 'installment')
      .reduce((sum, i) => sum + (i.perInstallmentAmount || 0), 0);

    const paidFromActive = active.reduce((sum, i) => (
      i.kind === 'installment' ? sum + (i.perInstallmentAmount || 0) * i.paidCount : sum
    ), 0);

    const totalPaidCompleted = completed.reduce((sum, i) => (
      i.kind === 'installment'
        ? sum + (i.perInstallmentAmount || 0) * (i.installmentCount || 0)
        : sum + i.amount
    ), 0);

    const totalRemaining = active.reduce((sum, i) => (
      i.kind === 'installment' ? sum + (i.perInstallmentAmount || 0) * i.remainingCount : sum + i.amount
    ), 0);

    return {
      monthlyTotal,
      totalPaid: paidFromActive + totalPaidCompleted,
      totalRemaining,
      totalPaidCompleted,
    };
  }

  static daysUntil(isoDate) {
    if (!isoDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(isoDate);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  static isOverdue(installment) {
    const days = InstallmentService.daysUntil(installment.dueDate);
    return days !== null && days < 0;
  }
}