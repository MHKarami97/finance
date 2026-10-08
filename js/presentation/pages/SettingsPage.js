import { TopBar } from '../components/TopBar.js';
import { StorageGateway } from '../../infrastructure/StorageGateway.js';
import { ThemeManager } from '../../infrastructure/ThemeManager.js';
import { BackupService } from '../../application/BackupService.js';

/**
 * Page: SettingsPage
 * Data management (export/import/reset), wallet management entry point,
 * dark/light theme toggle, and app metadata. All data lives in localStorage —
 * this page is the user's control panel for their own data sovereignty.
 */
export class SettingsPage {
  constructor({ exportService, walletRepo, router, backupService = new BackupService() }) {
    this.exportService = exportService;
    this.backupService = backupService;
    this.walletRepo = walletRepo;
    this.router = router;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('تنظیمات'));

    const content = document.createElement('div');
    content.className = 'page__content';
    const isDark = ThemeManager.current() === 'dark';
    content.innerHTML = `
      <section class="settings-group">
        <h3 class="settings-group__title">ظاهر برنامه</h3>
        <div class="theme-toggle-row">
          <span><i class="fa-solid ${isDark ? 'fa-moon' : 'fa-sun'}"></i> حالت ${isDark ? 'تیره' : 'روشن'}</span>
          <button type="button" class="theme-switch ${isDark ? 'theme-switch--on' : ''}" id="theme-switch" aria-label="تغییر تم"></button>
        </div>
      </section>
      <section class="settings-group">
        <h3 class="settings-group__title">مدیریت داده</h3>
        <button class="settings-row" id="export-json"><i class="fa-solid fa-file-export"></i><span>خروجی کامل (JSON)</span></button>
        <button class="settings-row" id="export-csv"><i class="fa-solid fa-file-csv"></i><span>خروجی گزارش (CSV)</span></button>
        <label class="settings-row" for="import-file"><i class="fa-solid fa-file-import"></i><span>بازیابی از فایل JSON</span></label>
        <input type="file" id="import-file" accept="application/json" hidden />
        <button class="settings-row settings-row--danger" id="reset-data"><i class="fa-solid fa-trash"></i><span>حذف کامل اطلاعات</span></button>
      </section>
      <section class="settings-group">
        <h3 class="settings-group__title">کیف‌های پول</h3>
        <div id="wallet-list"></div>
        <button class="settings-row" id="add-wallet"><i class="fa-solid fa-plus"></i><span>افزودن کیف پول</span></button>
      </section>
      <section class="settings-group">
        <h3 class="settings-group__title">درباره</h3>
        <a class="settings-row" href="#/about"><i class="fa-solid fa-circle-info"></i><span>درباره برنامه و سازنده</span></a>
      </section>
    `;
    page.appendChild(content);

    content.querySelector('#theme-switch').addEventListener('click', () => {
      const next = ThemeManager.toggle();
      const label = content.querySelector('.theme-toggle-row span');
      const switchEl = content.querySelector('#theme-switch');
      label.innerHTML = `<i class="fa-solid ${next === 'dark' ? 'fa-moon' : 'fa-sun'}"></i> حالت ${next === 'dark' ? 'تیره' : 'روشن'}`;
      switchEl.classList.toggle('theme-switch--on', next === 'dark');
    });

    const walletList = content.querySelector('#wallet-list');
    const renderWallets = () => {
      walletList.innerHTML = '';
      this.walletRepo.getAll().forEach((w) => {
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML = `<i class="fa-solid fa-${w.icon}" style="color:${w.color}"></i><span>${w.name}</span>`;
        walletList.appendChild(row);
      });
    };
    renderWallets();

    content.querySelector('#add-wallet').addEventListener('click', () => {
      const name = prompt('نام کیف پول جدید:');
      if (name) {
        this.walletRepo.add({ id: crypto.randomUUID(), name, initialBalance: 0, icon: 'wallet', color: '#539df5' });
        renderWallets();
      }
    });

    content.querySelector('#export-json').addEventListener('click', () => this.exportService.exportToJson());
    content.querySelector('#export-csv').addEventListener('click', async () => {
      const { JalaliCalendar } = await import('../../infrastructure/calendar/JalaliCalendar.js');
      this.exportService.exportToCsv(JalaliCalendar);
    });

    content.querySelector('#import-file').addEventListener('change', (e) => {
      const input = e.target;
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const { data, mode } = this.backupService.parse(reader.result);
          const lines = this.backupService.summarize(data)
            .map((item) => `• ${item.label}${item.count === null ? '' : `: ${item.count}`}`)
            .join('\n');
          const warning = mode === 'replace'
            ? 'همه اطلاعات فعلی با محتوای این فایل جایگزین می‌شود.'
            : 'این فایل پشتیبان قدیمی است و فقط بخش‌های زیر را جایگزین می‌کند.';
          if (!confirm(`${warning}\n\n${lines}\n\nادامه می‌دهید؟`)) return;

          this.backupService.restore(data, mode);
          alert('اطلاعات با موفقیت بازیابی شد. صفحه مجدداً بارگذاری می‌شود.');
          window.location.reload();
        } catch (err) {
          alert(`بازیابی انجام نشد: ${err.message}`);
        } finally {
          input.value = '';
        }
      };
      reader.readAsText(file);
    });

    content.querySelector('#reset-data').addEventListener('click', () => {
      if (confirm('آیا مطمئن هستید؟ تمام اطلاعات مالی شما برای همیشه حذف خواهد شد.')) {
        StorageGateway.clearAll();
        window.location.reload();
      }
    });

    return page;
  }
}