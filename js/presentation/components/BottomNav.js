export class BottomNav {
  static render(activePath) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    const items = [
      { path: '/dashboard', icon: 'fa-chart-pie', label: 'داشبورد' },
      { path: '/transactions', icon: 'fa-list', label: 'تراکنش' },
      { path:'/debts', icon: 'fa-people-arrows',  label: 'دنگ' },
      { path: '/installments', icon: 'fa-money-check-dollar', label: 'اقساط' },
      { path: '/add', icon: 'fa-circle-plus', label: 'افزودن', isCentral: true },
      { path: '/assets', icon: 'fa-coins', label: 'دارایی' },
      { path: '/market', icon: 'fa-money-bill-trend-up', label: 'قیمت' },
      { path: '/reports', icon: 'fa-chart-column', label: 'گزارش‌ها' },
      { path: '/lottery', icon: 'fa-dice', label: 'قرعه‌کشی' },
    ];
    items.forEach((item) => {
      const a = document.createElement('a');
      a.href = `#${item.path}`;
      a.className = `bottom-nav__item${activePath === item.path ? ' bottom-nav__item--active' : ''}${item.isCentral ? ' bottom-nav__item--central' : ''}`;
      a.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.label}</span>`;
      nav.appendChild(a);
    });
    return nav;
  }
}