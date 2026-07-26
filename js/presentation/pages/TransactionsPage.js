import { TopBar } from '../components/TopBar.js';
import { TransactionListItem } from '../components/TransactionListItem.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Page: TransactionsPage
 * Full list of transactions with search + type filter, grouped by Jalali date.
 */
export class TransactionsPage {
  constructor({ transactionService, categoryRepo }) {
    this.transactionService = transactionService;
    this.categoryRepo = categoryRepo;
    this.filter = 'all';
    this.searchTerm = '';
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('تراکنش‌ها'));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="filter-bar">
        <input type="search" class="input" id="search-input" placeholder="جستجو در توضیحات..." />
        <div class="chip-group">
          <button class="chip chip--active" data-filter="all">همه</button>
          <button class="chip" data-filter="income">درآمد</button>
          <button class="chip" data-filter="expense">هزینه</button>
        </div>
      </div>
      <div class="txn-list" id="txn-list-container"></div>
    `;
    page.appendChild(content);

    const listContainer = content.querySelector('#txn-list-container');
    const renderList = () => {
      const categories = this.categoryRepo.getAll();
      let txns = this.transactionService.listAll();
      if (this.filter !== 'all') txns = txns.filter((t) => t.type === this.filter);
      if (this.searchTerm) {
        txns = txns.filter((t) => (t.note || '').toLowerCase().includes(this.searchTerm.toLowerCase()));
      }
      listContainer.innerHTML = '';
      if (txns.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">تراکنشی یافت نشد.</p>';
        return;
      }
      let lastDateGroup = '';
      txns.forEach((t) => {
        const dateGroup = JalaliCalendar.formatISOToJalali(t.date);
        if (dateGroup !== lastDateGroup) {
          const groupHeader = document.createElement('div');
          groupHeader.className = 'txn-list__group-header';
          groupHeader.textContent = dateGroup;
          listContainer.appendChild(groupHeader);
          lastDateGroup = dateGroup;
        }
        const category = categories.find((c) => c.id === t.categoryId);
        listContainer.appendChild(TransactionListItem.render(t, category, (txn) => {
          if (confirm('این تراکنش حذف شود؟')) {
            this.transactionService.deleteTransaction(txn.id);
            renderList();
          }
        }));
      });
    };

    content.querySelector('#search-input').addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      renderList();
    });
    content.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        content.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
        chip.classList.add('chip--active');
        this.filter = chip.dataset.filter;
        renderList();
      });
    });

    renderList();
    return page;
  }
}
