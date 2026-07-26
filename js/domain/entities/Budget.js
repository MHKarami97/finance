/**
 * Entity: Budget
 * Represents a spending limit for a category within a given Jalali month.
 */
export class Budget {
  constructor({ id, categoryId, limitAmount, jalaliYear, jalaliMonth }) {
    if (!categoryId) throw new Error('Budget requires a categoryId');
    if (limitAmount <= 0) throw new Error('Budget limit must be positive');
    this.id = id || crypto.randomUUID();
    this.categoryId = categoryId;
    this.limitAmount = limitAmount;
    this.jalaliYear = jalaliYear;
    this.jalaliMonth = jalaliMonth; // 1-12
  }
}
