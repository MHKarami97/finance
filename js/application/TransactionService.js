import { Transaction } from '../domain/entities/Transaction.js';
import { Money } from '../domain/valueobjects/Money.js';

/**
 * Application Service: TransactionService
 * Orchestrates use cases around transactions. Depends only on repository
 * abstractions injected via constructor (Dependency Injection / Inversion of Control),
 * making this class fully unit-testable and decoupled from persistence details.
 */
export class TransactionService {
  #transactionRepo;
  #eventBus;

  constructor(transactionRepo, eventBus) {
    this.#transactionRepo = transactionRepo;
    this.#eventBus = eventBus;
  }

  createTransaction(dto) {
    const transaction = new Transaction({
      type: dto.type,
      amount: dto.amount,
      categoryId: dto.categoryId,
      walletId: dto.walletId,
      note: dto.note,
      date: dto.date,
      tags: dto.tags,
    });
    this.#transactionRepo.add(transaction);
    this.#eventBus?.publish('transaction:created', transaction);
    return transaction;
  }

  updateTransaction(id, dto) {
    const existing = this.#transactionRepo.getById(id);
    if (!existing) throw new Error('Transaction not found: ' + id);
    const updated = new Transaction({ id, ...dto });
    this.#transactionRepo.update(updated);
    this.#eventBus?.publish('transaction:updated', updated);
    return updated;
  }

  deleteTransaction(id) {
    this.#transactionRepo.remove(id);
    this.#eventBus?.publish('transaction:deleted', { id });
  }

  listAll() {
    return this.#transactionRepo.getAll().sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  listByDateRange(startISO, endISO) {
    return this.#transactionRepo.getByDateRange(startISO, endISO);
  }

  computeBalance(wallets) {
    const txns = this.#transactionRepo.getAll();
    const walletInitial = wallets.reduce((sum, w) => sum + w.initialBalance, 0);
    const net = txns.reduce((sum, t) => sum + t.signedAmount, 0);
    return new Money(walletInitial + net);
  }

  computeMonthSummary(jy, jm, JalaliCalendar) {
    const txns = this.#transactionRepo.getAll().filter((t) => {
      const { jy: ty, jm: tm } = JalaliCalendar.toJalali(new Date(t.date));
      return ty === jy && tm === jm;
    });
    const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.money.amount, 0);
    const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.money.amount, 0);
    return { income: new Money(income), expense: new Money(expense), net: new Money(income - expense), transactions: txns };
  }

  groupExpensesByCategory(txns) {
    const map = new Map();
    txns.filter((t) => t.type === 'expense').forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.money.amount);
    });
    return map;
  }
}
