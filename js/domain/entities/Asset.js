export class Asset {
  constructor({
    id, category, title, symbolKey, quantity, unit,
    manualPrice, area, pricePerSqm, note, createdAt,
  }) {
    if (!category) throw new Error('Asset requires a category');
    if (!title) throw new Error('Asset requires a title');
    this.id = id || crypto.randomUUID();
    this.category = category;
    this.title = title;
    this.symbolKey = symbolKey || null;
    this.quantity = quantity ?? 1;
    this.unit = unit || null;
    this.manualPrice = manualPrice ?? null;
    this.area = area ?? null;
    this.pricePerSqm = pricePerSqm ?? null;
    this.note = note || '';
    this.createdAt = createdAt || new Date().toISOString();
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(raw) {
    return new Asset(raw);
  }
}