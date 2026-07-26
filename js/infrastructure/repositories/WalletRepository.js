import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Wallet } from '../../domain/entities/Wallet.js';

export class WalletRepository extends BaseRepository {
  constructor() {
    super('wallets');
    this.#seedDefaultIfEmpty();
  }

  #seedDefaultIfEmpty() {
    const existing = StorageGateway.read(this.storageKey, []);
    if (existing.length === 0) {
      const cash = new Wallet({ name: 'نقدی', initialBalance: 0, icon: 'money-bill-wave', color: '#1ed760' });
      const card = new Wallet({ name: 'کارت بانکی', initialBalance: 0, icon: 'credit-card', color: '#539df5' });
      StorageGateway.write(this.storageKey, [cash, card]);
    }
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((w) => new Wallet(w));
  }

  getById(id) {
    return this.getAll().find((w) => w.id === id) || null;
  }

  add(wallet) {
    const all = this.getAll();
    all.push(wallet);
    StorageGateway.write(this.storageKey, all);
    return wallet;
  }

  update(wallet) {
    const all = this.getAll().map((w) => (w.id === wallet.id ? wallet : w));
    StorageGateway.write(this.storageKey, all);
    return wallet;
  }

  remove(id) {
    const all = this.getAll().filter((w) => w.id !== id);
    StorageGateway.write(this.storageKey, all);
  }
}
