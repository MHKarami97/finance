import { TopBar } from '../components/TopBar.js';
import { AssetFormModal } from '../components/AssetFormModal.js';
import { ASSET_OPTIONS } from '../../application/AssetService.js';

export class AssetsPage {
  constructor({ assetService }) {
    this.assetService = assetService;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="asset-total-card">
        <span class="asset-total-card__label">مجموع دارایی</span>
        <span class="asset-total-card__amount" id="asset-total-amount">در حال محاسبه...</span>
      </div>
      <a href="#/market" class="btn btn--outline btn--full asset-prices-link">
        <i class="fa-solid fa-chart-line"></i> مشاهده قیمت‌های لحظه‌ای
      </a>
      <div class="asset-list" id="asset-list"></div>
    `;

    page.appendChild(TopBar.render('دارایی‌های من', {
      actionIcon: 'fa-plus',
      onAction: () => this.#openForm(null, content),
    }));
    page.appendChild(content);

    this.#refresh(content);
    return page;
  }

  async #refresh(content) {
    const listEl = content.querySelector('#asset-list');
    const totalAmountEl = content.querySelector('#asset-total-amount');
    const valuations = await this.assetService.computeValuations();

    if (valuations.length === 0) {
      listEl.innerHTML = '<p class="empty-state">هنوز دارایی‌ای ثبت نشده. با زدن + یک مورد اضافه کنید.</p>';
      totalAmountEl.textContent = new Intl.NumberFormat('fa-IR').format(0) + ' تومان';
      return;
    }

    let total = 0;
    listEl.innerHTML = valuations.map(({ asset, tomanValue, isManual, unavailable }) => {
      if (tomanValue) total += tomanValue;
      const opt = ASSET_OPTIONS[asset.category];
      const valueLabel = unavailable
        ? 'قیمت در دسترس نیست — دستی وارد کنید'
        : new Intl.NumberFormat('fa-IR').format(tomanValue) + ' تومان';
      return `
        <div class="asset-item" data-id="${asset.id}">
          <div class="asset-item__body">
            <span class="asset-item__title">${asset.title}</span>
            <span class="asset-item__meta">${opt.label}${asset.quantity ? ' · ' + asset.quantity + ' ' + (opt.unit || '') : ''}</span>
          </div>
          <div class="asset-item__value${unavailable ? ' asset-item__value--warning' : ''}${isManual && !unavailable ? ' asset-item__value--manual' : ''}">
            ${valueLabel}
          </div>
          <div class="asset-item__actions">
            <button type="button" class="icon-btn" data-action="edit"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="icon-btn icon-btn--danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');

    totalAmountEl.textContent = new Intl.NumberFormat('fa-IR').format(total) + ' تومان';

    listEl.querySelectorAll('.asset-item').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-action="edit"]').addEventListener('click', () => {
        const asset = valuations.find((v) => v.asset.id === id)?.asset;
        this.#openForm(asset, content);
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm('این دارایی حذف شود؟')) {
          this.assetService.remove(id);
          this.#refresh(content);
        }
      });
    });
  }

  #openForm(initial, content) {
    AssetFormModal.open({
      initial,
      onSubmit: (dto) => {
        if (initial) this.assetService.update(initial.id, dto);
        else this.assetService.create(dto);
        this.#refresh(content);
      },
    });
  }
}
