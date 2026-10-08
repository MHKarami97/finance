import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { LotteryPool } from '../../domain/entities/LotteryPool.js';

/**
 * LotteryRepository
 * Persists interest-free lottery pools ("قرعه‌کشی قرض‌الحسنه") in their own
 * localStorage bucket, isolated from every other aggregate.
 */
export class LotteryRepository extends BaseRepository {
  constructor() {
    super('lottery-pools');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map(LotteryPool.fromJSON);
  }

  getById(id) {
    return this.getAll().find((pool) => pool.id === id) || null;
  }

  add(pool) {
    const all = this.getAll();
    all.push(pool);
    this.#save(all);
    return pool;
  }

  update(pool) {
    this.#save(this.getAll().map((p) => (p.id === pool.id ? pool : p)));
    return pool;
  }

  remove(id) {
    this.#save(this.getAll().filter((p) => p.id !== id));
  }

  #save(pools) {
    StorageGateway.write(this.storageKey, pools.map((p) => p.toJSON()));
  }
}
