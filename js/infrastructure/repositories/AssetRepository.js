import { BaseRepository } from '../BaseRepository.js';
import { StorageGateway } from '../StorageGateway.js';
import { Asset } from '../../domain/entities/Asset.js';

export class AssetRepository extends BaseRepository {
  constructor() {
    super('assets');
  }

  getAll() {
    return StorageGateway.read(this.storageKey, []).map((a) => new Asset(a));
  }

  getById(id) {
    return this.getAll().find((a) => a.id === id) || null;
  }

  add(asset) {
    const all = this.getAll();
    all.push(asset);
    StorageGateway.write(this.storageKey, all.map((a) => a.toJSON()));
    return asset;
  }

  update(asset) {
    const all = this.getAll().map((a) => (a.id === asset.id ? asset : a));
    StorageGateway.write(this.storageKey, all.map((a) => a.toJSON()));
    return asset;
  }

  remove(id) {
    const all = this.getAll().filter((a) => a.id !== id);
    StorageGateway.write(this.storageKey, all.map((a) => a.toJSON()));
  }
}