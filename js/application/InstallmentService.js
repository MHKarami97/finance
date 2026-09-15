import { Installment } from '../domain/entities/Installment.js';

/**
 * Application Service: InstallmentService
 * Orchestrates CRUD use cases for the "اقساط" feature (installments, loans,
 * bills) and centralizes the derived date math (days remaining / overdue
 * flag) so presentation code never touches raw Date arithmetic — Single
 * Responsibility + Dependency Inversion, consistent with TransactionService
 * and DebtService in this codebase.
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

  /** Sum of amounts across all recorded items, optionally filtered by kind. */
  computeTotal(kind = null) {
    const items = kind ? this.listByKind(kind) : this.listAll();
    return items.reduce((sum, i) => sum + i.amount, 0);
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
