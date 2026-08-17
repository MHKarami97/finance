/**
 * Entity: DebtGroup
 * Represents a shared-expense context (e.g. "سفر هرمز"). Holds references
 * (ids) to members drawn from the shared DebtPerson roster.
 */
export class DebtGroup {
  constructor({ id, title, memberIds = [], createdAt }) {
    if (!title || !title.trim()) throw new Error('DebtGroup requires a title');
    this.id = id || crypto.randomUUID();
    this.title = title.trim();
    this.memberIds = memberIds;
    this.createdAt = createdAt || new Date().toISOString();
  }
}
