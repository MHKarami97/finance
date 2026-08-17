/**
 * Entity: DebtExpense (Aggregate Root)
 * A single purchase made inside a DebtGroup by one payer, shared equally
 * among a chosen subset of the group's members (participantIds). Amounts are
 * stored in Toman, consistent with the rest of the app.
 */
export class DebtExpense {
  constructor({ id, groupId, payerId, amount, title, participantIds = [], date, createdAt }) {
    if (!groupId) throw new Error('DebtExpense requires a groupId');
    if (!payerId) throw new Error('DebtExpense requires a payerId');
    if (!amount || amount <= 0) throw new Error('DebtExpense requires a positive amount');
    if (!participantIds.length) throw new Error('DebtExpense requires at least one participant');

    this.id = id || crypto.randomUUID();
    this.groupId = groupId;
    this.payerId = payerId;
    this.amount = Math.round(amount);
    this.title = title || '';
    this.participantIds = participantIds;
    this.date = date || new Date().toISOString();
    this.createdAt = createdAt || new Date().toISOString();
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(raw) {
    return new DebtExpense(raw);
  }
}
