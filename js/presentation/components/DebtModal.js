/**
 * Component: DebtModal
 * Small reusable overlay-modal builder used across the "دنگ" (Debt) feature
 * for the create-group / add-member / add-expense forms. Self-contained
 * (own CSS classes in css/debts.css) so it can't collide with other modals.
 */
export class DebtModal {
  static open({ title, bodyHtml, onMount, onSubmit, submitLabel = 'ثبت', showFooter = true }) {
    const overlay = document.createElement('div');
    overlay.className = 'debt-modal-overlay';
    overlay.innerHTML = `
      <div class="debt-modal">
        <div class="debt-modal__header">
          <h3 class="debt-modal__title">${title}</h3>
          <button type="button" class="icon-btn" data-action="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="debt-modal__body"></div>
        ${showFooter ? `
        <div class="debt-modal__footer">
          <button type="button" class="btn btn--outline" data-action="cancel">انصراف</button>
          <button type="button" class="btn btn--primary" data-action="submit">${submitLabel}</button>
        </div>` : ''}
      </div>
    `;
    overlay.querySelector('.debt-modal__body').innerHTML = bodyHtml;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-action="close"]').addEventListener('click', close);
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', close);

    const bodyEl = overlay.querySelector('.debt-modal__body');
    const api = onMount?.(bodyEl, close) || {};

    overlay.querySelector('[data-action="submit"]')?.addEventListener('click', () => {
      const result = onSubmit?.(bodyEl, api);
      if (result !== false) close();
    });

    return { close, element: overlay };
  }
}
