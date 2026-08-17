import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { DebtExpense } from '../../domain/entities/DebtExpense.js';

/**
 * DebtExpenseRepository
 * Persists individual shared purchases recorded inside a debt group.
 */
export class DebtExpenseRepository extends BaseRepository {
  constructor() {
    super('debt-expenses');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map(DebtExpense.fromJSON);
  }

  getById(id) {
    return this.getAll().find((e) => e.id === id) || null;
  }

  getByGroup(groupId) {
    return this.getAll().filter((e) => e.groupId === groupId);
  }

  add(expense) {
    const all = this.getAll();
    all.push(expense);
    StorageGateway.write(this.storageKey, all.map((e) => e.toJSON()));
    return expense;
  }

  update(expense) {
    const all = this.getAll().map((e) => (e.id === expense.id ? expense : e));
    StorageGateway.write(this.storageKey, all.map((e) => e.toJSON()));
    return expense;
  }

  remove(id) {
    const all = this.getAll().filter((e) => e.id !== id);
    StorageGateway.write(this.storageKey, all.map((e) => e.toJSON()));
  }
}
