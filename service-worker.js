/**
 * Service Worker — Offline-first Cache Strategy
 * Precaches the application shell on install, then serves cached assets
 * first with network fallback (Cache-First for static assets), enabling
 * the app to run fully offline once installed — a core PWA requirement.
 */
const CACHE_NAME = 'finance-app-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/theme.css',
  './css/reset.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/main.js',
  './js/infrastructure/ThemeManager.js',
  './js/infrastructure/Router.js',
  './js/infrastructure/EventBus.js',
  './js/infrastructure/StorageGateway.js',
  './js/infrastructure/BaseRepository.js',
  './js/infrastructure/calendar/JalaliCalendar.js',
  './js/infrastructure/repositories/TransactionRepository.js',
  './js/infrastructure/repositories/CategoryRepository.js',
  './js/infrastructure/repositories/WalletRepository.js',
  './js/infrastructure/repositories/BudgetRepository.js',
  './js/domain/valueobjects/Money.js',
  './js/domain/entities/Transaction.js',
  './js/domain/entities/Category.js',
  './js/domain/entities/Wallet.js',
  './js/domain/entities/Budget.js',
  './js/application/TransactionService.js',
  './js/application/BudgetService.js',
  './js/application/ExportService.js',
  './js/presentation/components/BottomNav.js',
  './js/presentation/components/TopBar.js',
  './js/presentation/components/TransactionListItem.js',
  './js/presentation/components/ShamsiDatePicker.js',
  './js/presentation/pages/DashboardPage.js',
  './js/presentation/pages/TransactionsPage.js',
  './js/presentation/pages/AddTransactionPage.js',
  './js/presentation/pages/ReportsPage.js',
  './js/presentation/pages/SettingsPage.js',
  './js/presentation/pages/AboutPage.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});
