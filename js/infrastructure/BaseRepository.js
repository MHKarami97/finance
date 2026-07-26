/**
 * Abstract Repository (Template Method / Repository Pattern)
 * Defines the contract every concrete repository must implement.
 * Depending on this abstraction (not concretions) keeps the Application
 * layer decoupled from persistence details — Dependency Inversion Principle.
 */
export class BaseRepository {
  constructor(storageKey) {
    if (this.constructor === BaseRepository) {
      throw new TypeError('BaseRepository is abstract and cannot be instantiated directly');
    }
    this.storageKey = storageKey;
  }

  getAll() { throw new Error('Not implemented'); }
  getById(_id) { throw new Error('Not implemented'); }
  add(_entity) { throw new Error('Not implemented'); }
  update(_entity) { throw new Error('Not implemented'); }
  remove(_id) { throw new Error('Not implemented'); }
}
