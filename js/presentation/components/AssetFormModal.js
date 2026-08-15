import { ASSET_OPTIONS } from '../../application/AssetService.js';

export class AssetFormModal {
  static open({ initial = null, onSubmit }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const categoryKeys = Object.keys(ASSET_OPTIONS);
    const category = initial?.category || categoryKeys[0];

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">${initial ? 'ویرایش دارایی' : 'افزودن دارایی'}</h3>
        <form class="form" id="asset-form">
          <label class="form__label">نوع دارایی</label>
          <select class="input" id="asset-category">
            ${categoryKeys.map((k) => `<option value="${k}" ${k === category ? 'selected' : ''}>${ASSET_OPTIONS[k].label}</option>`).join('')}
          </select>
          <div id="asset-dynamic-fields"></div>
          <label class="form__label">توضیحات (اختیاری)</label>
          <input class="input" id="asset-note" value="${initial?.note || ''}" />
          <div class="modal__actions">
            <button type="button" class="btn btn--outline" id="asset-cancel">انصراف</button>
            <button type="submit" class="btn btn--primary">ذخیره</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const categorySelect = overlay.querySelector('#asset-category');
    const dynamicFields = overlay.querySelector('#asset-dynamic-fields');

    const renderDynamicFields = (cat) => {
      const opt = ASSET_OPTIONS[cat];
      let html = '';
      const list = opt.karats || opt.types;
      if (list) {
        html += `
          <label class="form__label">نوع</label>
          <select class="input" id="asset-symbol">
            ${list.map((t) => `<option value="${t.value}" ${initial?.symbolKey === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        `;
      }
      if (cat === 'real_estate') {
        html += `
          <label class="form__label">متراژ (متر مربع)</label>
          <input type="number" min="1" class="input" id="asset-area" value="${initial?.area ?? 100}" />
          <label class="form__label">قیمت هر متر (تومان)</label>
          <input type="number" min="0" class="input" id="asset-price-sqm" value="${initial?.pricePerSqm ?? 25000000}" />
          <p class="form-hint">قیمت مسکن به‌صورت خودکار از API قابل محاسبه نیست؛ این مقدار را خودتان بروزرسانی کنید.</p>
        `;
      } else if (cat === 'car') {
        html += `
          <label class="form__label">ارزش فعلی خودرو (تومان)</label>
          <input type="number" min="0" class="input" id="asset-manual-price" value="${initial?.manualPrice ?? ''}" />
          <p class="form-hint">قیمت خودرو به‌صورت خودکار از API قابل محاسبه نیست؛ این مقدار را خودتان بروزرسانی کنید.</p>
        `;
      } else if (cat === 'stock') {
        html += `
          <label class="form__label">نام نماد</label>
          <input class="input" id="asset-title" value="${initial?.title ?? ''}" placeholder="مثلاً فولاد" />
          <label class="form__label">تعداد سهم</label>
          <input type="number" min="1" class="input" id="asset-quantity" value="${initial?.quantity ?? 1}" />
          <label class="form__label">قیمت هر سهم (تومان)</label>
          <input type="number" min="0" class="input" id="asset-manual-price" value="${initial?.manualPrice ?? ''}" />
          <p class="form-hint">قیمت سهام بورس از API رایگان در دسترس نبود؛ این مقدار را خودتان بروزرسانی کنید.</p>
        `;
      } else if (cat === 'metal') {
        html += `
          <label class="form__label">مقدار / تعداد</label>
          <input type="number" min="0" step="0.001" class="input" id="asset-quantity" value="${initial?.quantity ?? 1}" />
          <label class="form__label">قیمت دستی (اگر در سیستم نبود)</label>
          <input type="number" min="0" class="input" id="asset-manual-price" value="${initial?.manualPrice ?? ''}" />
          <p class="form-hint">اگر این آیتم در سرویس قیمت پیدا نشود، از مقدار دستی بالا استفاده می‌شود.</p>
        `;
      } else {
        html += `
          <label class="form__label">مقدار (${opt.unit})</label>
          <input type="number" min="0" step="0.001" class="input" id="asset-quantity" value="${initial?.quantity ?? 1}" />
        `;
      }
      dynamicFields.innerHTML = html;
    };

    renderDynamicFields(category);
    categorySelect.addEventListener('change', () => renderDynamicFields(categorySelect.value));
    overlay.querySelector('#asset-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#asset-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const cat = categorySelect.value;
      const opt = ASSET_OPTIONS[cat];
      const symbolSelect = overlay.querySelector('#asset-symbol');
      const symbolKey = symbolSelect ? symbolSelect.value : null;
      const list = opt.karats || opt.types || [];
      const symbolDef = symbolKey ? list.find((t) => t.value === symbolKey) : null;

      const dto = {
        category: cat,
        symbolKey,
        note: overlay.querySelector('#asset-note').value,
        title: overlay.querySelector('#asset-title')?.value || symbolDef?.label || opt.label,
        quantity: Number(overlay.querySelector('#asset-quantity')?.value ?? 1) || 1,
        manualPrice: overlay.querySelector('#asset-manual-price')?.value
          ? Number(overlay.querySelector('#asset-manual-price').value) : null,
        area: overlay.querySelector('#asset-area')?.value
          ? Number(overlay.querySelector('#asset-area').value) : null,
        pricePerSqm: overlay.querySelector('#asset-price-sqm')?.value
          ? Number(overlay.querySelector('#asset-price-sqm').value) : null,
      };
      if (cat === 'car' || cat === 'real_estate') dto.quantity = 1;

      onSubmit(dto);
      overlay.remove();
    });
  }
}