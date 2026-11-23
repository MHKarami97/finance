import { ThemeManager } from '../../infrastructure/ThemeManager.js';

/**
 * Component: TopBar
 * Displays the page title on the right (RTL) and, on the left, an optional
 * contextual action button, quick dark/light theme toggle, and settings icon.
 */
export class TopBar {
  static #SETTINGS_PATH = '/settings';

  static render(title, { actionIcon, onAction } = {}) {
    const bar = document.createElement('header');
    bar.className = 'topbar';

    const onSettingsPage = window.location.hash.replace('#', '') === TopBar.#SETTINGS_PATH;
    const isDark = ThemeManager.current() === 'dark';

    bar.innerHTML = `
      <h1 class="topbar__title">${title}</h1>
      <div class="topbar__actions">
        ${actionIcon ? `<button type="button" class="topbar__action" data-role="page-action" aria-label="عملیات"><i class="fa-solid ${actionIcon}"></i></button>` : ''}
        <button type="button" class="topbar__action" data-role="theme-toggle" aria-label="تغییر تم" title="تغییر تم">
          <i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}"></i>
        </button>
        ${onSettingsPage ? '' : `<a class="topbar__action" href="#${TopBar.#SETTINGS_PATH}" aria-label="تنظیمات"><i class="fa-solid fa-gear"></i></a>`}
      </div>
    `;

    if (actionIcon && onAction) {
      bar.querySelector('[data-role="page-action"]').addEventListener('click', onAction);
    }

    const themeBtn = bar.querySelector('[data-role="theme-toggle"]');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = ThemeManager.toggle();
        const icon = themeBtn.querySelector('i');
        icon.className = `fa-solid ${next === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        // If on settings page, also sync the settings switch
        const settingsSwitch = document.querySelector('#theme-switch');
        if (settingsSwitch) {
          settingsSwitch.classList.toggle('theme-switch--on', next === 'dark');
          const settingsLabel = document.querySelector('.theme-toggle-row span');
          if (settingsLabel) {
            settingsLabel.innerHTML = `<i class="fa-solid ${next === 'dark' ? 'fa-moon' : 'fa-sun'}"></i> حالت ${next === 'dark' ? 'تیره' : 'روشن'}`;
          }
        }
      });
    }

    return bar;
  }
}
