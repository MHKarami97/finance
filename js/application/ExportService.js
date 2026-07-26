/**
 * Application Service: ExportService
 * Produces downloadable exports of user financial data (Strategy Pattern:
 * each export format is a swappable strategy implementing #toCsv / #toJson).
 */
export class ExportService {
  #transactionRepo;
  #categoryRepo;
  #walletRepo;

  constructor(transactionRepo, categoryRepo, walletRepo) {
    this.#transactionRepo = transactionRepo;
    this.#categoryRepo = categoryRepo;
    this.#walletRepo = walletRepo;
  }

  exportToJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      transactions: this.#transactionRepo.getAll().map((t) => t.toJSON()),
      categories: this.#categoryRepo.getAll(),
      wallets: this.#walletRepo.getAll(),
    };
    this.#download(JSON.stringify(payload, null, 2), 'application/json', 'financial-backup.json');
  }

  exportToCsv(JalaliCalendar) {
    const categories = this.#categoryRepo.getAll();
    const wallets = this.#walletRepo.getAll();
    const catName = (id) => categories.find((c) => c.id === id)?.name || 'نامشخص';
    const walletName = (id) => wallets.find((w) => w.id === id)?.name || 'نامشخص';

    const header = ['تاریخ شمسی', 'نوع', 'دسته‌بندی', 'کیف پول', 'مقدار (تومان)', 'توضیحات'];
    const rows = this.#transactionRepo.getAll().map((t) => [
      JalaliCalendar.formatISOToJalali(t.date),
      t.type === 'income' ? 'درآمد' : 'هزینه',
      catName(t.categoryId),
      walletName(t.walletId),
      t.money.amount,
      (t.note || '').replace(/,/g, '،'),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    this.#download('\ufeff' + csv, 'text/csv;charset=utf-8', 'financial-report.csv');
  }

  importFromJson(jsonText) {
    const data = JSON.parse(jsonText);
    return data;
  }

  #download(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
