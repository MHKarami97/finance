import { TopBar } from '../components/TopBar.js';
import { TransactionListItem } from '../components/TransactionListItem.js';
import { JalaliCalendar } from '../../infrastructure/calendar/JalaliCalendar.js';

/**
 * Page: DashboardPage
 * Landing screen — shows total balance, current month income/expense summary,
 * and the five most recent transactions.
 */
export class DashboardPage {
  constructor({ transactionService, categoryRepo, walletRepo }) {
    this.transactionService = transactionService;
    this.categoryRepo = categoryRepo;
    this.walletRepo = walletRepo;
  }

  render() {
    const wallets = this.walletRepo.getAll();
    const balance = this.transactionService.computeBalance(wallets);
    const { jy, jm } = JalaliCalendar.nowJalali();
    const summary = this.transactionService.computeMonthSummary(jy, jm, JalaliCalendar);
    const categories = this.categoryRepo.getAll();
    const recent = this.transactionService.listAll().slice(0, 5);

    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('داشبورد مالی'));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <section class="balance-card">
        <span class="balance-card__label">موجودی کل</span>
        <span class="balance-card__amount ${balance.isNegative() ? 'balance-card__amount--negative' : ''}">${balance.toFormattedString()}</span>
        <div class="balance-card__row">
          <div class="balance-card__stat">
            <i class="fa-solid fa-arrow-down income-icon"></i>
            <div><span>درآمد ${JalaliCalendar.monthNames()[jm - 1]}</span><strong>${summary.income.toFormattedString()}</strong></div>
          </div>
          <div class="balance-card__stat">
            <i class="fa-solid fa-arrow-up expense-icon"></i>
            <div><span>هزینه ${JalaliCalendar.monthNames()[jm - 1]}</span><strong>${summary.expense.toFormattedString()}</strong></div>
          </div>
        </div>
      </section>
      <section class="section-header">
        <h2>تراکنش‌های اخیر</h2>
        <a href="#/transactions" class="link">مشاهده همه</a>
      </section>
    `;

    const list = document.createElement('div');
    list.className = 'txn-list';
    if (recent.length === 0) {
      list.innerHTML = '<p class="empty-state">هنوز تراکنشی ثبت نشده است. با زدن دکمه + شروع کنید.</p>';
    } else {
      recent.forEach((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        list.appendChild(TransactionListItem.render(t, category, () => {}));
      });
    }
    content.appendChild(list);
    page.appendChild(content);
    return page;
  }
}
