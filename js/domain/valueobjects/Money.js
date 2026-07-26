/**
 * Value Object: Money
 * Immutable representation of a monetary amount in Iranian Rial (IRR).
 * Encapsulates arithmetic to avoid floating point bugs and enforce invariants.
 */
export class Money {
  #amount;

  constructor(amount) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new TypeError('Money amount must be a valid number');
    }
    this.#amount = Math.round(amount);
    Object.freeze(this);
  }

  static zero() {
    return new Money(0);
  }

  get amount() {
    return this.#amount;
  }

  add(other) {
    return new Money(this.#amount + other.amount);
  }

  subtract(other) {
    return new Money(this.#amount - other.amount);
  }

  isNegative() {
    return this.#amount < 0;
  }

  toFormattedString() {
    return new Intl.NumberFormat('fa-IR').format(this.#amount) + ' تومان';
  }

  toJSON() {
    return this.#amount;
  }
}
