/**
 * Entity: DebtPerson
 * A person in the shared/cached roster that can be added as a member to any
 * debt group (e.g. "سفر هرمز"). Kept separate from groups so the same person
 * can be reused across multiple trips/groups without retyping their name.
 */
export class DebtPerson {
  constructor({ id, name }) {
    if (!name || !name.trim()) throw new Error('DebtPerson requires a name');
    this.id = id || crypto.randomUUID();
    this.name = name.trim();
  }
}
