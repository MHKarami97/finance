import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Category } from '../../domain/entities/Category.js';

export class CategoryRepository extends BaseRepository {
  constructor() {
    super('categories');
    this.#seedDefaultsIfEmpty();
  }

  #seedDefaultsIfEmpty() {
    const existing = StorageGateway.read(this.storageKey, []);
    if (existing.length === 0) {
      const defaults = [
        ...Category.defaultExpenseCategories(),
        ...Category.defaultIncomeCategories(),
      ];
      StorageGateway.write(this.storageKey, defaults);
    }
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((c) => new Category(c));
  }

  getById(id) {
    return this.getAll().find((c) => c.id === id) || null;
  }

  getByType(type) {
    return this.getAll().filter((c) => c.type === type);
  }

  add(category) {
    const all = this.getAll();
    all.push(category);
    StorageGateway.write(this.storageKey, all);
    return category;
  }

  update(category) {
    const all = this.getAll().map((c) => (c.id === category.id ? category : c));
    StorageGateway.write(this.storageKey, all);
    return category;
  }

  remove(id) {
    const all = this.getAll().filter((c) => c.id !== id);
    StorageGateway.write(this.storageKey, all);
  }
}
