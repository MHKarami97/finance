import { Money } from '../valueobjects/Money.js';

/**
 * Entity: Transaction (Aggregate Root)
 * Represents a single financial movement (income or expense).
 * Enforces its own invariants — cannot exist in an invalid state.
 */
export class Transaction {
  constructor({ id, type, amount, categoryId, walletId, note, date, tags = [] }) {
    if (!['income', 'expense', 'transfer'].includes(type)) {
      throw new Error(`Invalid transaction type: ${type}`);
    }
    if (!categoryId) throw new Error('Transaction requires a categoryId');
    if (!walletId) throw new Error('Transaction requires a walletId');
    if (!date) throw new Error('Transaction requires a date (ISO string)');

    this.id = id || crypto.randomUUID();
    this.type = type;
    this.money = amount instanceof Money ? amount : new Money(amount);
    this.categoryId = categoryId;
    this.walletId = walletId;
    this.note = note || '';
    this.date = date; // ISO 8601 string (gregorian, converted for display only)
    this.tags = tags;
    this.createdAt = new Date().toISOString();
  }

  get signedAmount() {
    return this.type === 'expense' ? -Math.abs(this.money.amount) : Math.abs(this.money.amount);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      amount: this.money.amount,
      categoryId: this.categoryId,
      walletId: this.walletId,
      note: this.note,
      date: this.date,
      tags: this.tags,
      createdAt: this.createdAt,
    };
  }

  static fromJSON(raw) {
    const t = new Transaction({
      id: raw.id,
      type: raw.type,
      amount: raw.amount,
      categoryId: raw.categoryId,
      walletId: raw.walletId,
      note: raw.note,
      date: raw.date,
      tags: raw.tags,
    });
    t.createdAt = raw.createdAt || t.createdAt;
    return t;
  }
}
