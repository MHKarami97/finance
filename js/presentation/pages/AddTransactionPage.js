import { TopBar } from '../components/TopBar.js';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker.js';

/**
 * Page: AddTransactionPage
 * Form to record a new income or expense transaction, including category
 * selection, wallet selection, amount, note, and a Jalali date picker.
 */
export class AddTransactionPage {
  constructor({ transactionService, categoryRepo, walletRepo, router }) {
    this.transactionService = transactionService;
    this.categoryRepo = categoryRepo;
    this.walletRepo = walletRepo;
    this.router = router;
    this.type = 'expense';
    this.selectedDateISO = new Date().toISOString();
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('افزودن تراکنش'));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="type-toggle">
        <button type="button" class="type-toggle__btn type-toggle__btn--active" data-type="expense">هزینه</button>
        <button type="button" class="type-toggle__btn" data-type="income">درآمد</button>
      </div>
      <form id="txn-form" class="form">
        <label class="form__label">مقدار (تومان)</label>
        <input type="number" inputmode="numeric" min="1" required class="input input--amount" id="amount-input" placeholder="۰" />

        <label class="form__label">دسته‌بندی</label>
        <div class="category-grid" id="category-grid"></div>

        <label class="form__label">کیف پول</label>
        <select class="input" id="wallet-select"></select>

        <label class="form__label">تاریخ</label>
        <div id="date-picker-slot"></div>

        <label class="form__label">توضیحات (اختیاری)</label>
        <textarea class="input" id="note-input" rows="2" placeholder="مثلاً خرید هفتگی..."></textarea>

        <button type="submit" class="btn btn--primary btn--full">ثبت تراکنش</button>
      </form>
    `;
    page.appendChild(content);

    let selectedCategoryId = null;

    const renderCategories = () => {
      const grid = content.querySelector('#category-grid');
      grid.innerHTML = '';
      const cats = this.categoryRepo.getByType(this.type);
      cats.forEach((cat, idx) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `category-pill${idx === 0 ? ' category-pill--active' : ''}`;
        el.style.setProperty('--cat-color', cat.color);
        el.innerHTML = `<i class="fa-solid fa-${cat.icon}"></i><span>${cat.name}</span>`;
        el.addEventListener('click', () => {
          grid.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('category-pill--active'));
          el.classList.add('category-pill--active');
          selectedCategoryId = cat.id;
        });
        grid.appendChild(el);
        if (idx === 0) selectedCategoryId = cat.id;
      });
    };

    const walletSelect = content.querySelector('#wallet-select');
    this.walletRepo.getAll().forEach((w) => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.name;
      walletSelect.appendChild(opt);
    });

    const datePickerSlot = content.querySelector('#date-picker-slot');
    const picker = new ShamsiDatePicker((iso) => { this.selectedDateISO = iso; }, this.selectedDateISO);
    datePickerSlot.appendChild(picker.element);

    content.querySelectorAll('.type-toggle__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.type-toggle__btn').forEach((b) => b.classList.remove('type-toggle__btn--active'));
        btn.classList.add('type-toggle__btn--active');
        this.type = btn.dataset.type;
        renderCategories();
      });
    });

    content.querySelector('#txn-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Number(content.querySelector('#amount-input').value);
      if (!amount || amount <= 0) {
        alert('مقدار وارد شده صحیح نیست');
        return;
      }
      if (!selectedCategoryId) {
        alert('لطفاً یک دسته‌بندی انتخاب کنید');
        return;
      }
      this.transactionService.createTransaction({
        type: this.type,
        amount,
        categoryId: selectedCategoryId,
        walletId: walletSelect.value,
        note: content.querySelector('#note-input').value,
        date: this.selectedDateISO,
      });
      this.router.navigate('/dashboard');
    });

    renderCategories();
    return page;
  }
}
