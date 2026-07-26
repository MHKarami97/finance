/**
 * Component: BottomNav (Factory Pattern)
 * Renders the fixed bottom navigation bar used across all mobile views.
 */
export class BottomNav {
  static render(activePath) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    const items = [
      { path: '/dashboard', icon: 'fa-chart-pie', label: 'داشبورد' },
      { path: '/transactions', icon: 'fa-list', label: 'تراکنش‌ها' },
      { path: '/add', icon: 'fa-circle-plus', label: 'افزودن', isCentral: true },
      { path: '/reports', icon: 'fa-chart-column', label: 'گزارش‌ها' },
      { path: '/settings', icon: 'fa-gear', label: 'تنظیمات' },
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
