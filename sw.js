const CACHE_NAME = 'finance-v1.0.0';
const OFFLINE_PAGE = '/offline.html';

const urlsToCache = [
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
  './icons/favicon.png',
    '/fonts/Vazirmatn-font-face.css',
    '/fonts/webfonts/Vazirmatn-Black.woff2',
    '/fonts/webfonts/Vazirmatn-Bold.woff2',
    '/fonts/webfonts/Vazirmatn-ExtraBold.woff2',
    '/fonts/webfonts/Vazirmatn-ExtraLight.woff2',
    '/fonts/webfonts/Vazirmatn-Light.woff2',
    '/fonts/webfonts/Vazirmatn-Medium.woff2',
    '/fonts/webfonts/Vazirmatn-Regular.woff2',
    '/fonts/webfonts/Vazirmatn-SemiBold.woff2',
    '/fonts/webfonts/Vazirmatn-Thin.woff2',
    '/fonts/webfonts/Vazirmatn[wght].woff2'
];

// Helper function to determine if a URL should be cached
function shouldCache(url) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Cache static assets
    if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        return true;
    }
    
    // Cache HTML pages from the same origin
    if (urlObj.origin === self.location.origin && 
        (pathname.endsWith('/') || pathname.endsWith('.html'))) {
        return true;
    }
    
    return false;
}

// Installation of caching patterns
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Send message to all clients when new version is ready
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Notify all clients about the update
            return self.clients.matchAll().then((clients) => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        message: 'نسخه جدید در دسترس است'
                    });
                });
            });
        })
    );

    return self.clients.claim();
});

// Listen for skip waiting message from page
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch and cache strategy with offline fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }

                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Don't cache if response is not valid
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Check if this URL should be cached
                    if (shouldCache(event.request.url)) {
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }

                    return response;
                }).catch((error) => {
                    console.log('Fetch failed:', error);
                    
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_PAGE);
                    }
                    
                    // For other requests, try to return cached version or reject
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        throw error;
                    });
                });
            })
    );
});

// Background sync event
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

// Example function to sync data
async function syncData() {
    console.log('Syncing data...');
}

// Push notification event
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'اعلان جدید',
        icon: '/assets/icons/favicon.png',
        badge: '/assets/icons/favicon.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('بدن ساز', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

