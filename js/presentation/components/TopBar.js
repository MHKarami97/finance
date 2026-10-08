/**
 * Component: TopBar
 * Displays the page title on the right (RTL) and, on the left, an optional
 * contextual action button (add, export, ...) followed by a settings icon
 * that links to the settings page. The settings icon is hidden on the
 * settings page itself.
 */
export class TopBar {
  static #SETTINGS_PATH = '/settings';

  static render(title, { actionIcon, onAction } = {}) {
    const bar = document.createElement('header');
    bar.className = 'topbar';

    const onSettingsPage = window.location.hash.replace('#', '') === TopBar.#SETTINGS_PATH;

    bar.innerHTML = `
      <h1 class="topbar__title">${title}</h1>
      <div class="topbar__actions">
        ${actionIcon ? `<button type="button" class="topbar__action" data-role="page-action" aria-label="عملیات"><i class="fa-solid ${actionIcon}"></i></button>` : ''}
        ${onSettingsPage ? '' : `<a class="topbar__action" href="#${TopBar.#SETTINGS_PATH}" aria-label="تنظیمات"><i class="fa-solid fa-gear"></i></a>`}
      </div>
    `;

    if (actionIcon && onAction) {
      bar.querySelector('[data-role="page-action"]').addEventListener('click', onAction);
    }
    return bar;
  }
}
