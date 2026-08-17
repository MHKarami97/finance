import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { DebtPerson } from '../../domain/entities/DebtPerson.js';

/**
 * DebtPersonRepository
 * Persists the shared/cached roster of people usable across all debt groups.
 */
export class DebtPersonRepository extends BaseRepository {
  constructor() {
    super('debt-people');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((p) => new DebtPerson(p));
  }

  getById(id) {
    return this.getAll().find((p) => p.id === id) || null;
  }

  findByName(name) {
    const normalized = name.trim().toLowerCase();
    return this.getAll().find((p) => p.name.trim().toLowerCase() === normalized) || null;
  }

  add(person) {
    const all = this.getAll();
    all.push(person);
    StorageGateway.write(this.storageKey, all);
    return person;
  }

  update(person) {
    const all = this.getAll().map((p) => (p.id === person.id ? person : p));
    StorageGateway.write(this.storageKey, all);
    return person;
  }

  remove(id) {
    const all = this.getAll().filter((p) => p.id !== id);
    StorageGateway.write(this.storageKey, all);
  }
}
