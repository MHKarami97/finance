import { ThemeManager } from './infrastructure/ThemeManager.js';
import { Router } from './infrastructure/Router.js';
import { EventBus } from './infrastructure/EventBus.js';
import { TransactionRepository } from './infrastructure/repositories/TransactionRepository.js';
import { CategoryRepository } from './infrastructure/repositories/CategoryRepository.js';
import { WalletRepository } from './infrastructure/repositories/WalletRepository.js';
import { BudgetRepository } from './infrastructure/repositories/BudgetRepository.js';
import { TransactionService } from './application/TransactionService.js';
import { BudgetService } from './application/BudgetService.js';
import { ExportService } from './application/ExportService.js';
import { BottomNav } from './presentation/components/BottomNav.js';
import { DashboardPage } from './presentation/pages/DashboardPage.js';
import { TransactionsPage } from './presentation/pages/TransactionsPage.js';
import { AddTransactionPage } from './presentation/pages/AddTransactionPage.js';
import { ReportsPage } from './presentation/pages/ReportsPage.js';
import { SettingsPage } from './presentation/pages/SettingsPage.js';
import { AboutPage } from './presentation/pages/AboutPage.js';

/**
 * Composition Root: main.js
 * The single place where concrete implementations are instantiated and wired
 * together via constructor injection (Dependency Injection). Nothing else in
 * the codebase should call `new Repository()` directly — this keeps the
 * dependency graph explicit and testable.
 */
class App {
  #router;
  #outlet;
  #bottomNavSlot;

  constructor() {
    ThemeManager.init();

    this.eventBus = new EventBus();
    this.transactionRepo = new TransactionRepository();
    this.categoryRepo = new CategoryRepository();
    this.walletRepo = new WalletRepository();
    this.budgetRepo = new BudgetRepository();

    this.transactionService = new TransactionService(this.transactionRepo, this.eventBus);
    this.budgetService = new BudgetService(this.budgetRepo);
    this.exportService = new ExportService(this.transactionRepo, this.categoryRepo, this.walletRepo);

    this.#outlet = document.getElementById('view-outlet');
    this.#bottomNavSlot = document.getElementById('bottom-nav-slot');
    this.#router = new Router(this.#outlet);
    this.#registerRoutes();
    this.#router.onNavigate((path) => this.#renderBottomNav(path));
  }

  #registerRoutes() {
    this.#router
      .register('/dashboard', () => new DashboardPage({
        transactionService: this.transactionService,
        categoryRepo: this.categoryRepo,
        walletRepo: this.walletRepo,
      }).render())
      .register('/transactions', () => new TransactionsPage({
        transactionService: this.transactionService,
        categoryRepo: this.categoryRepo,
      }).render())
      .register('/add', () => new AddTransactionPage({
        transactionService: this.transactionService,
        categoryRepo: this.categoryRepo,
        walletRepo: this.walletRepo,
        router: this.#router,
      }).render())
      .register('/reports', () => new ReportsPage({
        transactionService: this.transactionService,
        categoryRepo: this.categoryRepo,
        exportService: this.exportService,
      }).render())
      .register('/settings', () => new SettingsPage({
        exportService: this.exportService,
        walletRepo: this.walletRepo,
        router: this.#router,
      }).render())
      .register('/about', () => new AboutPage().render());
  }

  #renderBottomNav(path) {
    this.#bottomNavSlot.innerHTML = '';
    this.#bottomNavSlot.appendChild(BottomNav.render(path));
  }

  start() {
    this.#router.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }
});
