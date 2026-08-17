import { TopBar } from '../components/TopBar.js';
import { DebtModal } from '../components/DebtModal.js';

/**
 * Page: DebtsPage ("دنگ")
 * Splits shared group expenses (e.g. "سفر هرمز") among people drawn from a
 * shared/cached roster, tracks who paid what, lets entries be edited or
 * deleted, and computes an optimal settlement plan (minimum transfers) in
 * Toman. Manages its own list/detail sub-views internally since the app's
 * Router only supports flat, parameter-less routes.
 */
export class DebtsPage {
  #debtService;
  #view = 'list';
  #activeGroupId = null;
  #topbarSlot;
  #content;

  constructor({ debtService }) {
    this.#debtService = debtService;
  }

  render() {
    const page = document.createElement('div');
    page.className = 'page';

    this.#topbarSlot = document.createElement('div');
    page.appendChild(this.#topbarSlot);

    const content = document.createElement('div');
    content.className = 'page__content debts-page';
    page.appendChild(content);
    this.#content = content;

    this.#renderCurrentView();
    return page;
  }

  #renderCurrentView() {
    this.#topbarSlot.innerHTML = '';
    if (this.#view === 'list') {
      this.#topbarSlot.appendChild(TopBar.render('دنگ (خرج‌های گروهی)', {
        actionIcon: 'fa-plus',
        onAction: () => this.#openCreateGroupModal(),
      }));
      this.#renderGroupList();
    } else {
      const group = this.#debtService.getGroup(this.#activeGroupId);
      this.#topbarSlot.appendChild(TopBar.render(group?.title || 'گروه', {
        actionIcon: 'fa-plus',
        onAction: () => this.#openExpenseModal(),
      }));
      this.#renderGroupDetail();
    }
  }

  #fmt(n) {
    return new Intl.NumberFormat('fa-IR').format(Math.round(n || 0)) + ' تومان';
  }

  // ---------------- Groups list ----------------
  #renderGroupList() {
    const groups = this.#debtService.listGroups();

    if (groups.length === 0) {
      this.#content.innerHTML = '<p class="empty-state">هنوز سفر/گروهی ثبت نشده. با زدن + یک مورد اضافه کنید (مثلاً «سفر هرمز»).</p>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'debt-group-list';
    groups.forEach((g) => {
      const members = this.#debtService.getMembers(g.id);
      const row = document.createElement('div');
      row.className = 'debt-group-item';
      row.innerHTML = `
        <div class="debt-group-item__body">
          <span class="debt-group-item__title">${g.title}</span>
          <span class="debt-group-item__meta">${members.length} نفر</span>
        </div>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete"]')) return;
        this.#activeGroupId = g.id;
        this.#view = 'detail';
        this.#renderCurrentView();
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm(`گروه «${g.title}» حذف شود؟ همه خرج‌های آن نیز حذف می‌شوند.`)) {
          this.#debtService.removeGroup(g.id);
          this.#renderGroupList();
        }
      });
      list.appendChild(row);
    });
    this.#content.innerHTML = '';
    this.#content.appendChild(list);
  }

  #openCreateGroupModal() {
    DebtModal.open({
      title: 'سفر/گروه جدید',
      bodyHtml: `
        <label class="form__label">عنوان (مثلاً سفر هرمز)</label>
        <input type="text" class="input" id="debt-group-title" placeholder="سفر هرمز" />
      `,
      submitLabel: 'ایجاد',
      onSubmit: (body) => {
        const title = body.querySelector('#debt-group-title').value.trim();
        if (!title) { alert('عنوان را وارد کنید'); return false; }
        const group = this.#debtService.createGroup(title);
        this.#activeGroupId = group.id;
        this.#view = 'detail';
        this.#renderCurrentView();
        return true;
      },
    });
  }

  // ---------------- Group detail ----------------
  #renderGroupDetail() {
    const groupId = this.#activeGroupId;
    const members = this.#debtService.getMembers(groupId);
    const expenses = this.#debtService.listExpenses(groupId);
    const balances = this.#debtService.computeBalances(groupId);

    this.#content.innerHTML = `
      <a href="#" id="debt-back" class="link debt-back-link"><i class="fa-solid fa-arrow-right"></i> بازگشت به لیست</a>

      <section class="section-header">
        <h2>افراد</h2>
        <button type="button" class="link" id="debt-add-member">+ افزودن عضو</button>
      </section>
      <div class="debt-member-chips" id="debt-member-chips"></div>

      <section class="section-header">
        <h2>خرج‌ها</h2>
      </section>
      <div class="debt-expense-list" id="debt-expense-list"></div>

      <button type="button" class="btn btn--primary btn--full" id="debt-calculate">محاسبه بدهی‌ها</button>
      <div id="debt-settlement-result"></div>
    `;

    this.#content.querySelector('#debt-back').addEventListener('click', (e) => {
      e.preventDefault();
      this.#view = 'list';
      this.#activeGroupId = null;
      this.#renderCurrentView();
    });

    // ---- Members ----
    const chipsEl = this.#content.querySelector('#debt-member-chips');
    if (members.length === 0) {
      chipsEl.innerHTML = '<p class="empty-state">عضوی اضافه نشده.</p>';
    } else {
      chipsEl.innerHTML = members.map((m) => {
        const bal = Math.round(balances.get(m.id) || 0);
        const balClass = bal > 0 ? 'debt-chip__balance--credit' : bal < 0 ? 'debt-chip__balance--debit' : '';
        return `
          <div class="debt-chip" data-id="${m.id}">
            <span class="debt-chip__name">${m.name}</span>
            <span class="debt-chip__balance ${balClass}">${this.#fmt(bal)}</span>
            <button type="button" class="debt-chip__remove" data-action="remove-member" data-id="${m.id}"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `;
      }).join('');
      chipsEl.querySelectorAll('[data-action="remove-member"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.#debtService.removeMember(groupId, btn.dataset.id);
          this.#renderGroupDetail();
        });
      });
    }
    this.#content.querySelector('#debt-add-member').addEventListener('click', () => this.#openAddMemberModal());

    // ---- Expenses ----
    const expenseListEl = this.#content.querySelector('#debt-expense-list');
    const nameOf = (id) => members.find((m) => m.id === id)?.name || '—';
    expenseListEl.innerHTML = expenses.length === 0
      ? '<p class="empty-state">هنوز خرجی ثبت نشده.</p>'
      : expenses.map((ex) => `
        <div class="debt-expense-item" data-id="${ex.id}">
          <div class="debt-expense-item__body">
            <span class="debt-expense-item__title">${ex.title || 'بدون عنوان'}</span>
            <span class="debt-expense-item__meta">پرداخت‌کننده: ${nameOf(ex.payerId)} · ${ex.participantIds.length} نفر شریک</span>
          </div>
          <div class="debt-expense-item__amount">${this.#fmt(ex.amount)}</div>
          <div class="debt-expense-item__actions">
            <button type="button" class="icon-btn" data-action="edit"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="icon-btn icon-btn--danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('');

    expenseListEl.querySelectorAll('.debt-expense-item').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-action="edit"]').addEventListener('click', () => {
        const expense = expenses.find((e) => e.id === id);
        this.#openExpenseModal(expense);
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm('این خرج حذف شود؟')) {
          this.#debtService.removeExpense(id);
          this.#renderGroupDetail();
        }
      });
    });

    this.#content.querySelector('#debt-calculate').addEventListener('click', () => this.#renderSettlements());
  }

  #openAddMemberModal() {
    const allPeople = this.#debtService.listPeople();
    const group = this.#debtService.getGroup(this.#activeGroupId);
    const available = allPeople.filter((p) => !group.memberIds.includes(p.id));

    DebtModal.open({
      title: 'افزودن عضو',
      bodyHtml: `
        ${available.length ? `
          <label class="form__label">انتخاب از لیست کش‌شده</label>
          <select class="input" id="debt-existing-person">
            <option value="">— انتخاب کنید —</option>
            ${available.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        ` : '<p class="empty-state">فردی در لیست کش‌شده باقی نمانده.</p>'}
        <label class="form__label">یا افزودن فرد جدید</label>
        <input type="text" class="input" id="debt-new-person" placeholder="نام فرد جدید" />
      `,
      submitLabel: 'افزودن',
      onSubmit: (body) => {
        const selectEl = body.querySelector('#debt-existing-person');
        const newNameEl = body.querySelector('#debt-new-person');
        const newName = newNameEl.value.trim();
        let personId = selectEl?.value || '';
        if (newName) {
          personId = this.#debtService.getOrCreatePerson(newName).id;
        }
        if (!personId) { alert('یک نفر را انتخاب یا اضافه کنید'); return false; }
        this.#debtService.addMember(this.#activeGroupId, personId);
        this.#renderGroupDetail();
        return true;
      },
    });
  }

  #openExpenseModal(existing = null) {
    const members = this.#debtService.getMembers(this.#activeGroupId);
    if (members.length === 0) {
      alert('اول حداقل یک عضو اضافه کنید');
      return;
    }
    const selectedParticipants = existing ? existing.participantIds : members.map((m) => m.id);

    DebtModal.open({
      title: existing ? 'ویرایش خرج' : 'خرج جدید',
      bodyHtml: `
        <label class="form__label">عنوان</label>
        <input type="text" class="input" id="debt-exp-title" value="${existing?.title || ''}" placeholder="مثلاً شام، اسکان..." />

        <label class="form__label">مبلغ (تومان)</label>
        <input type="number" inputmode="numeric" min="1" class="input input--amount" id="debt-exp-amount" value="${existing?.amount || ''}" placeholder="۰" />

        <label class="form__label">پرداخت‌کننده</label>
        <select class="input" id="debt-exp-payer">
          ${members.map((m) => `<option value="${m.id}" ${existing?.payerId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>

        <label class="form__label">افرادی که در این خرج شریک‌اند</label>
        <div class="debt-participant-list">
          ${members.map((m) => `
            <label class="debt-participant-row">
              <input type="checkbox" value="${m.id}" ${selectedParticipants.includes(m.id) ? 'checked' : ''} />
              <span>${m.name}</span>
            </label>
          `).join('')}
        </div>
      `,
      submitLabel: existing ? 'ذخیره' : 'ثبت',
      onSubmit: (body) => {
        const title = body.querySelector('#debt-exp-title').value.trim();
        const amount = Number(body.querySelector('#debt-exp-amount').value);
        const payerId = body.querySelector('#debt-exp-payer').value;
        const participantIds = [...body.querySelectorAll('.debt-participant-list input:checked')].map((i) => i.value);

        if (!amount || amount <= 0) { alert('مبلغ صحیح وارد کنید'); return false; }
        if (participantIds.length === 0) { alert('حداقل یک نفر شریک را انتخاب کنید'); return false; }

        const dto = { groupId: this.#activeGroupId, payerId, amount, title, participantIds, date: existing?.date };
        if (existing) this.#debtService.updateExpense(existing.id, dto);
        else this.#debtService.addExpense(dto);
        this.#renderGroupDetail();
        return true;
      },
    });
  }

  #renderSettlements() {
    const settlements = this.#debtService.computeSettlements(this.#activeGroupId);
    const members = this.#debtService.getMembers(this.#activeGroupId);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || '—';

    const resultEl = this.#content.querySelector('#debt-settlement-result');
    resultEl.innerHTML = settlements.length === 0
      ? '<p class="empty-state">حساب همه با هم صاف است 🎉</p>'
      : `<div class="debt-settlement-list">${settlements.map((s) => `
          <div class="debt-settlement-row">
            <span><strong>${nameOf(s.fromId)}</strong> باید به <strong>${nameOf(s.toId)}</strong> بدهد</span>
            <span class="debt-settlement-row__amount">${this.#fmt(s.amount)}</span>
          </div>
        `).join('')}</div>`;
  }
}
