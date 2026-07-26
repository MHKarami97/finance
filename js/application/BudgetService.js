import { Budget } from '../domain/entities/Budget.js';

/**
 * Application Service: BudgetService
 * Handles budget CRUD and progress calculations against actual spending.
 */
export class BudgetService {
  #budgetRepo;

  constructor(budgetRepo) {
    this.#budgetRepo = budgetRepo;
  }

  setBudget(dto) {
    const budget = new Budget(dto);
    this.#budgetRepo.add(budget);
    return budget;
  }

  updateBudget(dto) {
    const budget = new Budget(dto);
    this.#budgetRepo.update(budget);
    return budget;
  }

  removeBudget(id) {
    this.#budgetRepo.remove(id);
  }

  getMonthBudgets(jy, jm) {
    return this.#budgetRepo.getByMonth(jy, jm);
  }

  computeProgress(budget, spentByCategory) {
    const spent = spentByCategory.get(budget.categoryId) || 0;
    const ratio = Math.min(spent / budget.limitAmount, 1);
    return { spent, limit: budget.limitAmount, ratio, exceeded: spent > budget.limitAmount };
  }
}
