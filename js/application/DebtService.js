import { DebtPerson } from '../domain/entities/DebtPerson.js';
import { DebtGroup } from '../domain/entities/DebtGroup.js';
import { DebtExpense } from '../domain/entities/DebtExpense.js';

/**
 * Application Service: DebtService ("دنگ")
 * Orchestrates the shared-group-expense ("Splitwise-like") use case: manages
 * a cached roster of people, debt groups (trips), the expenses recorded
 * inside them, and computes an optimal (minimum-transfer-count) settlement
 * plan via a greedy debt-simplification algorithm.
 */
export class DebtService {
  #personRepo;
  #groupRepo;
  #expenseRepo;

  constructor(personRepo, groupRepo, expenseRepo) {
    this.#personRepo = personRepo;
    this.#groupRepo = groupRepo;
    this.#expenseRepo = expenseRepo;
  }

  // ---------------- Cached people roster ----------------
  listPeople() {
    return this.#personRepo.getAll();
  }

  getOrCreatePerson(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('نام نمی‌تواند خالی باشد');
    const existing = this.#personRepo.findByName(trimmed);
    if (existing) return existing;
    return this.#personRepo.add(new DebtPerson({ name: trimmed }));
  }

  // ---------------- Groups (trips) ----------------
  listGroups() {
    return this.#groupRepo.getAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  getGroup(id) {
    return this.#groupRepo.getById(id);
  }

  createGroup(title) {
    const group = new DebtGroup({ title });
    this.#groupRepo.add(group);
    return group;
  }

  renameGroup(id, title) {
    const group = this.getGroup(id);
    if (!group) throw new Error('گروه یافت نشد');
    group.title = title;
    this.#groupRepo.update(group);
    return group;
  }

  removeGroup(id) {
    this.#groupRepo.remove(id);
    this.#expenseRepo.getByGroup(id).forEach((e) => this.#expenseRepo.remove(e.id));
  }

  addMember(groupId, personId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('گروه یافت نشد');
    if (!group.memberIds.includes(personId)) {
      group.memberIds = [...group.memberIds, personId];
      this.#groupRepo.update(group);
    }
    return group;
  }

  removeMember(groupId, personId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('گروه یافت نشد');
    group.memberIds = group.memberIds.filter((id) => id !== personId);
    this.#groupRepo.update(group);
    return group;
  }

  getMembers(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return [];
    return group.memberIds.map((id) => this.#personRepo.getById(id)).filter(Boolean);
  }

  // ---------------- Expenses ----------------
  listExpenses(groupId) {
    return this.#expenseRepo.getByGroup(groupId).sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  addExpense(dto) {
    const expense = new DebtExpense(dto);
    this.#expenseRepo.add(expense);
    return expense;
  }

  updateExpense(id, dto) {
    const expense = new DebtExpense({ id, ...dto });
    this.#expenseRepo.update(expense);
    return expense;
  }

  removeExpense(id) {
    this.#expenseRepo.remove(id);
  }

  // ---------------- Balances & optimal settlement ----------------
  /** Positive balance = طلبکار (creditor), negative = بدهکار (debtor). */
  computeBalances(groupId) {
    const members = this.getMembers(groupId);
    const balances = new Map(members.map((m) => [m.id, 0]));
    this.listExpenses(groupId).forEach((expense) => {
      const share = expense.amount / expense.participantIds.length;
      expense.participantIds.forEach((pid) => {
        balances.set(pid, (balances.get(pid) || 0) - share);
      });
      balances.set(expense.payerId, (balances.get(expense.payerId) || 0) + expense.amount);
    });
    return balances;
  }

  /**
   * Greedy debt-simplification: repeatedly matches the largest creditor with
   * the largest debtor so the number of required transfers stays minimal,
   * instead of every debtor paying every creditor individually.
   */
  computeSettlements(groupId) {
    const balances = this.computeBalances(groupId);
    const creditors = [];
    const debtors = [];
    balances.forEach((amount, personId) => {
      const rounded = Math.round(amount);
      if (rounded > 500) creditors.push({ personId, amount: rounded });
      else if (rounded < -500) debtors.push({ personId, amount: -rounded });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      if (pay > 500) {
        settlements.push({ fromId: debtors[i].personId, toId: creditors[j].personId, amount: Math.round(pay) });
      }
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount <= 500) i += 1;
      if (creditors[j].amount <= 500) j += 1;
    }
    return settlements;
  }
}
