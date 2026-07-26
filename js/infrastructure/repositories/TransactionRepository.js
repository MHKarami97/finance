import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Transaction } from '../../domain/entities/Transaction.js';

/**
 * TransactionRepository
 * Concrete persistence adapter for Transaction aggregate, backed by localStorage.
 */
export class TransactionRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map(Transaction.fromJSON);
  }

  getById(id) {
    return this.getAll().find((t) => t.id === id) || null;
  }

  add(transaction) {
    const all = this.getAll();
    all.push(transaction);
    StorageGateway.write(this.storageKey, all.map((t) => t.toJSON()));
    return transaction;
  }

  update(transaction) {
    const all = this.getAll().map((t) => (t.id === transaction.id ? transaction : t));
    StorageGateway.write(this.storageKey, all.map((t) => t.toJSON()));
    return transaction;
  }

  remove(id) {
    const all = this.getAll().filter((t) => t.id !== id);
    StorageGateway.write(this.storageKey, all.map((t) => t.toJSON()));
  }

  getByDateRange(startISO, endISO) {
    return this.getAll().filter((t) => t.date >= startISO && t.date <= endISO);
  }
}
