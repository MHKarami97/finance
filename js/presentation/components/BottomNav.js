/**
 * Component: BottomNav
 * Modern floating bottom navigation bar with responsive layout:
 * - Mobile (< 768px): 5 ergonomic slots (Dashboard, Transactions, [+] Add FAB, Reports, More)
 *   where "More" triggers a sleek glassmorphic Bottom Sheet for secondary tools.
 * - Desktop (>= 768px): All tools displayed directly in an expansive, comfortable floating dock.
 */
export class BottomNav {
  static #moreSheetBackdrop = null;
  static #moreSheetEl = null;

  static render(activePath) {
    // Ensure any open sheet is closed on route navigation
    BottomNav.closeMoreSheet(true);

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';

    const morePaths = ['/debts', '/installments', '/assets', '/market', '/lottery', '/settings', '/about'];
    const isMoreActive = morePaths.includes(activePath);

    const items = [
      { path: '/dashboard', icon: 'fa-house', label: 'داشبورد', desktopOnly: false },
      { path: '/transactions', icon: 'fa-receipt', label: 'تراکنش', desktopOnly: false },
      { path: '/debts', icon: 'fa-users-between-lines', label: 'دنگ', desktopOnly: true },
      { path: '/installments', icon: 'fa-calendar-check', label: 'اقساط', desktopOnly: true },
      { path: '/add', icon: 'fa-plus', label: 'افزودن', isCentral: true, desktopOnly: false },
      { path: '/assets', icon: 'fa-vault', label: 'دارایی', desktopOnly: true },
      { path: '/market', icon: 'fa-arrow-trend-up', label: 'قیمت', desktopOnly: true },
      { path: '/reports', icon: 'fa-chart-pie', label: 'گزارش‌ها', desktopOnly: false },
      { path: '/lottery', icon: 'fa-clover', label: 'قرعه‌کشی', desktopOnly: true },
    ];

    items.forEach((item) => {
      const a = document.createElement('a');
      a.href = `#${item.path}`;
      const activeClass = activePath === item.path ? ' bottom-nav__item--active' : '';
      const centralClass = item.isCentral ? ' bottom-nav__item--central' : '';
      const desktopClass = item.desktopOnly ? ' bottom-nav__item--desktop-only' : '';
      a.className = `bottom-nav__item${activeClass}${centralClass}${desktopClass}`;

      if (item.isCentral) {
        a.setAttribute('aria-label', item.label);
        a.innerHTML = `<div class="bottom-nav__central-btn"><i class="fa-solid ${item.icon}"></i></div><span>${item.label}</span>`;
      } else {
        a.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.label}</span>`;
      }
      nav.appendChild(a);
    });

    // Mobile-only "More" button (opens Bottom Sheet)
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = `bottom-nav__item bottom-nav__item--mobile-only${isMoreActive ? ' bottom-nav__item--active' : ''}`;
    moreBtn.setAttribute('aria-label', 'سایر بخش‌ها');
    moreBtn.innerHTML = `<i class="fa-solid fa-table-cells-large"></i><span>سایر</span>`;
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      BottomNav.toggleMoreSheet(activePath);
    });
    nav.appendChild(moreBtn);

    return nav;
  }

  static toggleMoreSheet(activePath) {
    if (BottomNav.#moreSheetEl) {
      BottomNav.closeMoreSheet();
    } else {
      BottomNav.openMoreSheet(activePath);
    }
  }

  static openMoreSheet(activePath) {
    BottomNav.closeMoreSheet(true);

    const backdrop = document.createElement('div');
    backdrop.className = 'more-sheet-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'more-sheet';

    const moreItems = [
      { path: '/debts', icon: 'fa-users-between-lines', title: 'دنگ و تسویه', desc: 'محاسبه دنگ و خرج مشترک', color: 'announce' },
      { path: '/installments', icon: 'fa-calendar-check', title: 'اقساط و چک', desc: 'یادآور و سررسید وام و بدهی', color: 'warning' },
      { path: '/assets', icon: 'fa-vault', title: 'سبد دارایی‌ها', desc: 'طلا، ارز، رمزارز و خودرو', color: 'accent' },
      { path: '/market', icon: 'fa-arrow-trend-up', title: 'قیمت روز', desc: 'نرخ لحظه‌ای طلا، سکه و ارز', color: 'purple' },
      { path: '/lottery', icon: 'fa-clover', title: 'قرعه‌کشی خانگی', desc: 'مدیریت صندوق و وام خانگی', color: 'negative' },
      { path: '/settings', icon: 'fa-gear', title: 'تنظیمات برنامه', desc: 'پشتیبان‌گیری، تم و کیف‌ها', color: 'slate' },
      { path: '/about', icon: 'fa-circle-info', title: 'درباره برنامه', desc: 'امکانات و اطلاعات سازنده', color: 'teal' },
    ];

    sheet.innerHTML = `
      <div class="more-sheet__handle"></div>
      <div class="more-sheet__header">
        <div>
          <h3 class="more-sheet__title">سایر امکانات و بخش‌ها</h3>
          <span class="more-sheet__subtitle">دسترسی سریع به ابزارهای مالی</span>
        </div>
        <button type="button" class="more-sheet__close" aria-label="بستن"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="more-sheet__grid">
        ${moreItems.map((item) => `
          <a href="#${item.path}" class="more-sheet__card${activePath === item.path ? ' more-sheet__card--active' : ''}">
            <div class="more-sheet__icon-wrap more-sheet__icon-wrap--${item.color}">
              <i class="fa-solid ${item.icon}"></i>
            </div>
            <div class="more-sheet__card-info">
              <strong class="more-sheet__card-title">${item.title}</strong>
              <span class="more-sheet__card-desc">${item.desc}</span>
            </div>
          </a>
        `).join('')}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    BottomNav.#moreSheetBackdrop = backdrop;
    BottomNav.#moreSheetEl = sheet;

    requestAnimationFrame(() => {
      backdrop.classList.add('more-sheet-backdrop--open');
      sheet.classList.add('more-sheet--open');
    });

    const close = () => BottomNav.closeMoreSheet();

    backdrop.addEventListener('click', close);
    sheet.querySelector('.more-sheet__close').addEventListener('click', close);
    sheet.querySelectorAll('.more-sheet__card').forEach((card) => {
      card.addEventListener('click', close);
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  }

  static closeMoreSheet(immediate = false) {
    const backdrop = BottomNav.#moreSheetBackdrop;
    const sheet = BottomNav.#moreSheetEl;

    if (!backdrop && !sheet) return;

    BottomNav.#moreSheetBackdrop = null;
    BottomNav.#moreSheetEl = null;

    if (immediate) {
      backdrop?.remove();
      sheet?.remove();
      return;
    }

    if (backdrop) backdrop.classList.remove('more-sheet-backdrop--open');
    if (sheet) sheet.classList.remove('more-sheet--open');

    setTimeout(() => {
      backdrop?.remove();
      sheet?.remove();
    }, 280);
  }
}
