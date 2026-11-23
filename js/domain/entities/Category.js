/**
 * Entity: Category
 * Represents a spending/income classification (Aggregate Root for category management).
 */
export class Category {
  constructor({ id, name, type, icon, color, isDefault = false }) {
    if (!name || !type) {
      throw new Error('Category requires a name and a type (income|expense)');
    }
    this.id = id;
    this.name = name;
    this.type = type; // 'income' | 'expense'
    this.icon = icon || 'tag';
    this.color = color || '#1ed760';
    this.isDefault = isDefault;
  }

  static defaultExpenseCategories() {
    return [
      { name: 'خوراک و رستوران', icon: 'utensils', color: '#f43f5e' },
      { name: 'حمل و نقل', icon: 'car', color: '#3b82f6' },
      { name: 'خرید و پوشاک', icon: 'bag-shopping', color: '#f59e0b' },
      { name: 'قبوض و اجاره', icon: 'receipt', color: '#8b5cf6' },
      { name: 'سلامت و درمان', icon: 'heart-pulse', color: '#10b981' },
      { name: 'سرگرمی', icon: 'gamepad', color: '#ec4899' },
      { name: 'آموزش', icon: 'graduation-cap', color: '#06b6d4' },
      { name: 'سایر', icon: 'ellipsis', color: '#64748b' },
    ].map((c) => new Category({ ...c, id: crypto.randomUUID(), type: 'expense', isDefault: true }));
  }

  static defaultIncomeCategories() {
    return [
      { name: 'حقوق', icon: 'money-bill-wave', color: '#10b981' },
      { name: 'فریلنسری', icon: 'laptop-code', color: '#3b82f6' },
      { name: 'سرمایه‌گذاری', icon: 'arrow-trend-up', color: '#f59e0b' },
      { name: 'هدیه', icon: 'gift', color: '#f43f5e' },
      { name: 'سایر', icon: 'ellipsis', color: '#64748b' },
    ].map((c) => new Category({ ...c, id: crypto.randomUUID(), type: 'income', isDefault: true }));
  }
}
