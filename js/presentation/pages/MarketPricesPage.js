import { TopBar } from '../components/TopBar.js';
import { MarketPriceService } from '../../application/MarketPriceService.js';

export class MarketPricesPage {
  #isRial = false;
  #showAll = false;
  #searchTerm = '';
  #allItemsCache = [];
  #timerId = null;

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('قیمت‌های لحظه‌ای'));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="market-toolbar">
        <span class="market-toolbar__updated" id="market-updated">در حال بارگذاری...</span>
        <button type="button" class="unit-switch" id="unit-switch">
          <span class="unit-switch__opt unit-switch__opt--active" data-unit="toman">تومان</span>
          <span class="unit-switch__opt" data-unit="rial">ریال</span>
        </button>
      </div>
      <div class="price-grid" id="price-grid"></div>
      <button type="button" class="btn btn--outline btn--full" id="toggle-all-btn">نمایش بیشتر</button>
      <div class="price-table-wrap" id="price-all-wrap" hidden>
        <input type="search" class="input" id="price-search" placeholder="جستجو ..." />
        <div class="price-table" id="price-all-table"></div>
      </div>
    `;
    page.appendChild(content);

    const grid = content.querySelector('#price-grid');
    const updatedLabel = content.querySelector('#market-updated');
    const allWrap = content.querySelector('#price-all-wrap');
    const allTable = content.querySelector('#price-all-table');
    const toggleAllBtn = content.querySelector('#toggle-all-btn');
    const unitSwitch = content.querySelector('#unit-switch');
    const searchInput = content.querySelector('#price-search');

    const formatValue = (rial) => {
      if (rial == null) return 'نامشخص';
      const value = this.#isRial ? rial : MarketPriceService.rialToToman(rial);
      return new Intl.NumberFormat('fa-IR').format(value) + (this.#isRial ? ' ریال' : ' تومان');
    };

    const renderHighlighted = async () => {
      const { items, fetchedAt } = await MarketPriceService.getHighlighted();
      updatedLabel.textContent = 'آخرین بروزرسانی: ' + new Date(fetchedAt).toLocaleTimeString('fa-IR');
      grid.innerHTML = items.map((item) => `
        <div class="price-card${item.available ? '' : ' price-card--unavailable'}">
          <span class="price-card__label">${item.label}</span>
          <span class="price-card__value">${item.available ? formatValue(item.rial) : 'در دسترس نیست'}</span>
        </div>
      `).join('');
    };

    const renderFilteredTable = () => {
      const term = this.#searchTerm.trim().toLowerCase();
      const filtered = term
        ? this.#allItemsCache.filter((item) => (
          item.label.toLowerCase().includes(term) || item.id.toLowerCase().includes(term)
        ))
        : this.#allItemsCache;

      allTable.innerHTML = filtered.map((item) => `
        <div class="price-table__row">
          <span class="price-table__key">${item.label}</span>
          <span class="price-table__value">${formatValue(item.rial)}</span>
        </div>
      `).join('') || '<p class="empty-state">موردی با این عبارت پیدا نشد.</p>';
    };

    const fetchAllAndRender = async () => {
      const { items } = await MarketPriceService.getAll();
      this.#allItemsCache = items;
      renderFilteredTable();
    };

    unitSwitch.addEventListener('click', (e) => {
      const opt = e.target.closest('.unit-switch__opt');
      if (!opt) return;
      this.#isRial = opt.dataset.unit === 'rial';
      unitSwitch.querySelectorAll('.unit-switch__opt').forEach((o) => {
        o.classList.toggle('unit-switch__opt--active', o.dataset.unit === opt.dataset.unit);
      });
      renderHighlighted();
      if (this.#showAll) renderFilteredTable();
    });

    toggleAllBtn.addEventListener('click', () => {
      this.#showAll = !this.#showAll;
      allWrap.hidden = !this.#showAll;
      toggleAllBtn.textContent = this.#showAll ? 'بستن لیست کامل' : 'نمایش بیشتر';
      if (this.#showAll) fetchAllAndRender();
    });

    searchInput.addEventListener('input', (e) => {
      this.#searchTerm = e.target.value;
      renderFilteredTable();
    });

    renderHighlighted();
    this.#timerId = window.setInterval(() => {
      renderHighlighted();
      if (this.#showAll) fetchAllAndRender();
    }, 60 * 1000);
    window.addEventListener('hashchange', () => window.clearInterval(this.#timerId), { once: true });

    return page;
  }
}