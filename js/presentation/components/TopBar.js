/**
 * Component: TopBar
 * Displays page title and contextual action button (e.g., export, filter).
 */
export class TopBar {
  static render(title, { actionIcon, onAction } = {}) {
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML = `
      <h1 class="topbar__title">${title}</h1>
      ${actionIcon ? `<button class="topbar__action" aria-label="عملیات"><i class="fa-solid ${actionIcon}"></i></button>` : ''}
    `;
    if (actionIcon && onAction) {
      bar.querySelector('.topbar__action').addEventListener('click', onAction);
    }
    return bar;
  }
}
