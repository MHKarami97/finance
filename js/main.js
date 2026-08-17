import { ThemeManager } from "./infrastructure/ThemeManager.js";
import { Router } from "./infrastructure/Router.js";
import { EventBus } from "./infrastructure/EventBus.js";
import { TransactionRepository } from "./infrastructure/repositories/TransactionRepository.js";
import { CategoryRepository } from "./infrastructure/repositories/CategoryRepository.js";
import { WalletRepository } from "./infrastructure/repositories/WalletRepository.js";
import { BudgetRepository } from "./infrastructure/repositories/BudgetRepository.js";
import { TransactionService } from "./application/TransactionService.js";
import { BudgetService } from "./application/BudgetService.js";
import { ExportService } from "./application/ExportService.js";
import { BottomNav } from "./presentation/components/BottomNav.js";
import { DashboardPage } from "./presentation/pages/DashboardPage.js";
import { TransactionsPage } from "./presentation/pages/TransactionsPage.js";
import { AddTransactionPage } from "./presentation/pages/AddTransactionPage.js";
import { ReportsPage } from "./presentation/pages/ReportsPage.js";
import { SettingsPage } from "./presentation/pages/SettingsPage.js";
import { AboutPage } from "./presentation/pages/AboutPage.js";
import { AssetRepository } from "./infrastructure/repositories/AssetRepository.js";
import { AssetService } from "./application/AssetService.js";
import { MarketPricesPage } from "./presentation/pages/MarketPricesPage.js";
import { AssetsPage } from "./presentation/pages/AssetsPage.js";

// --- "دنگ" (Debt-splitting) feature ---
import { DebtPersonRepository } from "./infrastructure/repositories/DebtPersonRepository.js";
import { DebtGroupRepository } from "./infrastructure/repositories/DebtGroupRepository.js";
import { DebtExpenseRepository } from "./infrastructure/repositories/DebtExpenseRepository.js";
import { DebtService } from "./application/DebtService.js";
import { DebtsPage } from "./presentation/pages/DebtsPage.js";

/**
 * Composition Root (main.js)
 * The single place where concrete implementations are instantiated and
 * wired together via constructor injection (Dependency Injection). Nothing
 * else in the codebase should call `new *Repository()` directly — this keeps
 * the dependency graph explicit and testable.
 */
class App {
  router;
  outlet;
  bottomNavSlot;

  constructor() {
    ThemeManager.init();

    this.eventBus = new EventBus();

    this.transactionRepo = new TransactionRepository();
    this.categoryRepo = new CategoryRepository();
    this.walletRepo = new WalletRepository();
    this.budgetRepo = new BudgetRepository();
    this.assetRepo = new AssetRepository();

    // "دنگ" repositories
    this.debtPersonRepo = new DebtPersonRepository();
    this.debtGroupRepo = new DebtGroupRepository();
    this.debtExpenseRepo = new DebtExpenseRepository();

    this.transactionService = new TransactionService(
      this.transactionRepo,
      this.eventBus,
    );
    this.budgetService = new BudgetService(this.budgetRepo);
    this.exportService = new ExportService(
      this.transactionRepo,
      this.categoryRepo,
      this.walletRepo,
    );
    this.assetService = new AssetService(this.assetRepo);
    this.debtService = new DebtService(
      this.debtPersonRepo,
      this.debtGroupRepo,
      this.debtExpenseRepo,
    );

    this.outlet = document.getElementById("view-outlet");
    this.bottomNavSlot = document.getElementById("bottom-nav-slot");

    this.router = new Router(this.outlet);
    this.registerRoutes();
    this.router.onNavigate((path) => this.renderBottomNav(path));
  }

  registerRoutes() {
    this.router
      .register("/dashboard", () =>
        new DashboardPage({
          transactionService: this.transactionService,
          categoryRepo: this.categoryRepo,
          walletRepo: this.walletRepo,
        }).render(),
      )
      .register("/transactions", () =>
        new TransactionsPage({
          transactionService: this.transactionService,
          categoryRepo: this.categoryRepo,
        }).render(),
      )
      .register("/add", () =>
        new AddTransactionPage({
          transactionService: this.transactionService,
          categoryRepo: this.categoryRepo,
          walletRepo: this.walletRepo,
          router: this.router,
        }).render(),
      )
      .register("/reports", () =>
        new ReportsPage({
          transactionService: this.transactionService,
          categoryRepo: this.categoryRepo,
          exportService: this.exportService,
        }).render(),
      )
      .register("/settings", () =>
        new SettingsPage({
          exportService: this.exportService,
          walletRepo: this.walletRepo,
          router: this.router,
        }).render(),
      )
      .register("/market", () => new MarketPricesPage().render())
      .register("/assets", () =>
        new AssetsPage({ assetService: this.assetService }).render(),
      )
      .register("/debts", () =>
        new DebtsPage({ debtService: this.debtService }).render(),
      )
      .register("/about", () => new AboutPage().render());
  }

  renderBottomNav(path) {
    this.bottomNavSlot.innerHTML = "";
    this.bottomNavSlot.appendChild(BottomNav.render(path));
  }

  start() {
    this.router.start();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.start();
});

// ---------------------------------------------------------------------
// PWA install prompt
// ---------------------------------------------------------------------
let deferredPrompt;
const installPromptDismissed = localStorage.getItem("installPromptDismissed");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!installPromptDismissed) {
    showInstallPrompt();
  }
});

function showInstallPrompt() {
  const prompt = document.createElement("div");
  prompt.className = "install-prompt";
  prompt.innerHTML = `
    <div class="install-prompt-text">
      <div class="install-prompt-title">نصب اپلیکیشن</div>
      <div class="install-prompt-desc">برای دسترسی سریع‌تر، اپ را نصب کنید</div>
    </div>
    <button class="install-btn" id="installBtn">نصب</button>
    <button class="close-install" id="closeInstall">×</button>
  `;
  document.body.appendChild(prompt);

  document.getElementById("installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    deferredPrompt = null;
    prompt.remove();
  });

  document.getElementById("closeInstall").addEventListener("click", () => {
    localStorage.setItem("installPromptDismissed", "true");
    prompt.remove();
  });
}

// ---------------------------------------------------------------------
// Service Worker registration + update flow (FIXED)
// ---------------------------------------------------------------------
let newWorker;
let updateNotificationShown = false;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((registration) => {
        console.log("SW registered", registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Check if there's already a waiting worker from a previous session
        if (registration.waiting) {
          newWorker = registration.waiting;
          showUpdateNotification();
        }

        // Listen for a new worker being installed
        registration.addEventListener("updatefound", () => {
          newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // A new service worker is ready and waiting
              showUpdateNotification();
            }
          });
        });
      })
      .catch((err) => {
        console.log("SW registration failed", err);
      });
  });

  // Listen for messages from the service worker (e.g. after activate)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      showUpdateNotification();
    }
  });

  // Reload once the new worker takes control
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function showUpdateNotification() {
  if (updateNotificationShown) return; // Prevent duplicate notifications
  updateNotificationShown = true;

  const notification = document.getElementById("updateNotification");
  if (notification) {
    notification.classList.remove("hidden");
    notification.classList.add("show");
  }
}

const updateButton = document.getElementById("updateButton");
const dismissButton = document.getElementById("dismissUpdate");
const updateNotificationEl = document.getElementById("updateNotification");

if (updateButton) {
  updateButton.addEventListener("click", () => {
    // Clear all caches, then hand control to the new worker and reload
    if ("caches" in window) {
      caches
        .keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .then(() => {
          if (newWorker) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          } else {
            window.location.reload();
          }
        });
    } else {
      window.location.reload();
    }
  });
}

if (dismissButton) {
  dismissButton.addEventListener("click", () => {
    updateNotificationEl.classList.remove("show");
    updateNotificationEl.classList.add("hidden");
    updateNotificationShown = false; // Allow showing again if another update arrives
  });
}

// Handle app installation
window.addEventListener("appinstalled", () => {
  console.log("App installed successfully");
  deferredPrompt = null;
});
