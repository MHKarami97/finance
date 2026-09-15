import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Installment } from '../../domain/entities/Installment.js';

/**
 * InstallmentRepository
 * Persists installment / loan / bill records ("اقساط") under their own
 * dedicated localStorage bucket ("installments"), fully isolated from
 * Transaction and Debt data — same Repository Pattern used by every other
 * aggregate in this app (see AssetRepository, TransactionRepository).
 */
export class InstallmentRepository extends BaseRepository {
  constructor() {
    super('installments');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map(Installment.fromJSON);
  }

  getById(id) {
    return this.getAll().find((i) => i.id === id) || null;
  }

  getByKind(kind) {
    return this.getAll().filter((i) => i.kind === kind);
  }

  add(installment) {
    const all = this.getAll();
    all.push(installment);
    StorageGateway.write(this.storageKey, all.map((i) => i.toJSON()));
    return installment;
  }

  update(installment) {
    const all = this.getAll().map((i) => (i.id === installment.id ? installment : i));
    StorageGateway.write(this.storageKey, all.map((i) => i.toJSON()));
    return installment;
  }

  remove(id) {
    const all = this.getAll().filter((i) => i.id !== id);
    StorageGateway.write(this.storageKey, all.map((i) => i.toJSON()));
  }
}
