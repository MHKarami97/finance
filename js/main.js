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

    this.#outlet = document.getElementById("view-outlet");
    this.#bottomNavSlot = document.getElementById("bottom-nav-slot");
    this.#router = new Router(this.#outlet);
    this.#registerRoutes();
    this.#router.onNavigate((path) => this.#renderBottomNav(path));
  }

  #registerRoutes() {
    this.#router
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
          router: this.#router,
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
          router: this.#router,
        }).render(),
      )
      .register("/about", () => new AboutPage().render());
  }

  #renderBottomNav(path) {
    this.#bottomNavSlot.innerHTML = "";
    this.#bottomNavSlot.appendChild(BottomNav.render(path));
  }

  start() {
    this.#router.start();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.start();

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
            <div class="install-prompt-title">📱 نصب اپلیکیشن</div>
        </div>
        <button class="install-btn" id="installBtn">نصب</button>
        <button class="close-install" id="closeInstall">✕</button>
    `;
    document.body.appendChild(prompt);

    document
      .getElementById("installBtn")
      .addEventListener("click", async () => {
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

  // Register Service Worker
  if ("serviceWorker" in navigator) {
    let newWorker;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Listen for waiting worker
          registration.addEventListener("updatefound", () => {
            newWorker = registration.installing;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New service worker is ready
                showUpdateNotification();
              }
            });
          });
        })
        .catch((err) => {
          console.log("SW registration failed:", err);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SW_UPDATED") {
          showUpdateNotification();
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    });

    // Show update notification
    function showUpdateNotification() {
      const notification = document.getElementById("updateNotification");
      if (notification) {
        notification.classList.remove("hidden");
        notification.classList.add("show");
      }
    }

    // Handle update button click
    document.addEventListener("DOMContentLoaded", () => {
      const updateButton = document.getElementById("updateButton");
      const dismissButton = document.getElementById("dismissUpdate");
      const notification = document.getElementById("updateNotification");

      if (updateButton) {
        updateButton.addEventListener("click", () => {
          // Clear all caches and reload
          if ("caches" in window) {
            caches
              .keys()
              .then((names) => {
                names.forEach((name) => {
                  caches.delete(name);
                });
              })
              .then(() => {
                // Tell the service worker to skip waiting
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
          notification.classList.remove("show");
          notification.classList.add("hidden");
        });
      }
    });
  }

  // Handle app installation
  window.addEventListener("appinstalled", () => {
    console.log("App installed successfully");
    deferredPrompt = null;
  });
});
