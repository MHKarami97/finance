import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Budget } from '../../domain/entities/Budget.js';

export class BudgetRepository extends BaseRepository {
  constructor() {
    super('budgets');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((b) => new Budget(b));
  }

  getByMonth(jalaliYear, jalaliMonth) {
    return this.getAll().filter((b) => b.jalaliYear === jalaliYear && b.jalaliMonth === jalaliMonth);
  }

  add(budget) {
    const all = this.getAll();
    all.push(budget);
    StorageGateway.write(this.storageKey, all);
    return budget;
  }

  update(budget) {
    const all = this.getAll().map((b) => (b.id === budget.id ? budget : b));
    StorageGateway.write(this.storageKey, all);
    return budget;
  }

  remove(id) {
    const all = this.getAll().filter((b) => b.id !== id);
    StorageGateway.write(this.storageKey, all);
  }
}
