import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { DebtGroup } from '../../domain/entities/DebtGroup.js';

/**
 * DebtGroupRepository
 * Persists debt groups (e.g. "سفر هرمز") and their member references.
 */
export class DebtGroupRepository extends BaseRepository {
  constructor() {
    super('debt-groups');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((g) => new DebtGroup(g));
  }

  getById(id) {
    return this.getAll().find((g) => g.id === id) || null;
  }

  add(group) {
    const all = this.getAll();
    all.push(group);
    StorageGateway.write(this.storageKey, all);
    return group;
  }

  update(group) {
    const all = this.getAll().map((g) => (g.id === group.id ? group : g));
    StorageGateway.write(this.storageKey, all);
    return group;
  }

  remove(id) {
    const all = this.getAll().filter((g) => g.id !== id);
    StorageGateway.write(this.storageKey, all);
  }
}
