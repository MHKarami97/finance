/**
 * Domain constant: INSTALLMENT_KINDS
 * Defines the three supported record types for the "اقساط" feature and the
 * visual metadata (label/icon/color) used across the presentation layer.
 */
export const INSTALLMENT_KINDS = {
  installment: { label: 'قسط', icon: 'money-check-dollar', color: '#539df5' },
  loan: { label: 'قرض', icon: 'hand-holding-dollar', color: '#ffa42b' },
  bill: { label: 'قبض', icon: 'file-invoice', color: '#f3727f' },
};

/**
 * Domain constant: INSTALLMENT_FIELD_MAP
 * Declares which optional fields are relevant for each kind (Strategy-like
 * lookup table). Consumed by both the entity (defensive normalization) and
 * the presentation form (dynamic field visibility) so the two layers never
 * drift out of sync.
 */
export const INSTALLMENT_FIELD_MAP = {
  installment: { receivedDate: true, endDate: true, installmentDate: true, interestRate: true, cardNumber: true },
  loan: { receivedDate: true, endDate: true, installmentDate: false, interestRate: true, cardNumber: true },
  bill: { receivedDate: false, endDate: true, installmentDate: false, interestRate: false, cardNumber: true },
};

/**
 * Entity: Installment (Aggregate Root)
 * Represents a single financial obligation the user must track: an
 * installment plan ("قسط"), a personal loan ("قرض"), or a recurring bill
 * ("قبض"). Enforces its own invariants and normalizes fields that are not
 * applicable to the given `kind` to null, so the rest of the app never has
 * to re-check "is this field meaningful for this kind?" itself.
 */
export class Installment {
  constructor({
    id, kind, title, description, receivedDate, endDate, installmentDate,
    amount, interestRate, cardNumber, createdAt,
  }) {
    if (!Object.keys(INSTALLMENT_KINDS).includes(kind)) {
      throw new Error(`Invalid installment kind: ${kind}`);
    }
    if (!title || !title.trim()) throw new Error('Installment requires a title');
    if (!amount || amount <= 0) throw new Error('Installment requires a positive amount');

    const fields = INSTALLMENT_FIELD_MAP[kind];

    this.id = id || crypto.randomUUID();
    this.kind = kind;
    this.title = title.trim();
    this.description = (description || '').trim();
    this.amount = Math.round(amount);
    this.receivedDate = fields.receivedDate ? (receivedDate || null) : null;
    this.endDate = fields.endDate ? (endDate || null) : null;
    this.installmentDate = fields.installmentDate ? (installmentDate || null) : null;
    this.interestRate = fields.interestRate ? (interestRate ?? null) : null;
    this.cardNumber = fields.cardNumber ? (cardNumber || null) : null;
    this.createdAt = createdAt || new Date().toISOString();
  }

  get kindLabel() {
    return INSTALLMENT_KINDS[this.kind]?.label || this.kind;
  }

  get kindIcon() {
    return INSTALLMENT_KINDS[this.kind]?.icon || 'file';
  }

  get kindColor() {
    return INSTALLMENT_KINDS[this.kind]?.color || '#7c7c7c';
  }

  /** The date most relevant for "when is the next payment due" purposes. */
  get dueDate() {
    return this.installmentDate || this.endDate || null;
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(raw) {
    return new Installment(raw);
  }
}
