/**
 * Entity: Wallet
 * Represents an account/cash source (e.g., cash, bank card, savings).
 */
export class Wallet {
  constructor({ id, name, initialBalance = 0, icon = 'wallet', color = '#1ed760' }) {
    if (!name) throw new Error('Wallet requires a name');
    this.id = id || crypto.randomUUID();
    this.name = name;
    this.initialBalance = initialBalance;
    this.icon = icon;
    this.color = color;
  }
}
