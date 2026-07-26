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
      { name: 'خوراک و رستوران', icon: 'utensils', color: '#f3727f' },
      { name: 'حمل و نقل', icon: 'car', color: '#539df5' },
      { name: 'خرید و پوشاک', icon: 'shopping-bag', color: '#ffa42b' },
      { name: 'قبوض و اجاره', icon: 'file-invoice', color: '#b3b3b3' },
      { name: 'سلامت و درمان', icon: 'heart-pulse', color: '#1ed760' },
      { name: 'سرگرمی', icon: 'gamepad', color: '#a06cd5' },
      { name: 'آموزش', icon: 'book', color: '#4dd0e1' },
      { name: 'سایر', icon: 'ellipsis', color: '#7c7c7c' },
    ].map((c) => new Category({ ...c, id: crypto.randomUUID(), type: 'expense', isDefault: true }));
  }

  static defaultIncomeCategories() {
    return [
      { name: 'حقوق', icon: 'money-bill', color: '#1ed760' },
      { name: 'فریلنسری', icon: 'laptop', color: '#539df5' },
      { name: 'سرمایه‌گذاری', icon: 'chart-line', color: '#ffa42b' },
      { name: 'هدیه', icon: 'gift', color: '#f3727f' },
      { name: 'سایر', icon: 'ellipsis', color: '#7c7c7c' },
    ].map((c) => new Category({ ...c, id: crypto.randomUUID(), type: 'income', isDefault: true }));
  }
}
