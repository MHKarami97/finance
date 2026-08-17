const CACHE_NAME = "finance-v1.0.11";
const OFFLINE_PAGE = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/icons/favicon.png",
  "/fonts/Vazirmatn-font-face.css",
  "/fonts/webfonts/Vazirmatn-Black.woff2",
  "/fonts/webfonts/Vazirmatn-Bold.woff2",
  "/fonts/webfonts/Vazirmatn-ExtraBold.woff2",
  "/fonts/webfonts/Vazirmatn-ExtraLight.woff2",
  "/fonts/webfonts/Vazirmatn-Light.woff2",
  "/fonts/webfonts/Vazirmatn-Medium.woff2",
  "/fonts/webfonts/Vazirmatn-Regular.woff2",
  "/fonts/webfonts/Vazirmatn-SemiBold.woff2",
  "/fonts/webfonts/Vazirmatn-Thin.woff2",
  "/fonts/webfonts/Vazirmatn[wght].woff2",
];

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(
    url.pathname,
  );
}

function isHtmlRequest(request) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html")
  );
}

async function getCurrentCache() {
  return caches.open(CACHE_NAME);
}

async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  const staleCaches = cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);

  await Promise.all(staleCaches.map((cacheName) => caches.delete(cacheName)));
}

async function notifyClients(message) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    client.postMessage(message);
  }
}

async function networkFirstForHtml(request) {
  const cache = await getCurrentCache();

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const indexResponse = await cache.match("/index.html");
    if (indexResponse) {
      return indexResponse;
    }

    const offlineResponse = await cache.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }

    return Response.error();
  }
}

async function cacheFirstCurrentVersionOnly(request) {
  const cache = await getCurrentCache();
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (
    networkResponse &&
    networkResponse.status === 200 &&
    networkResponse.type !== "error"
  ) {
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    if (isHtmlRequest(request)) {
      const cache = await getCurrentCache();
      const offlineResponse = await cache.match(OFFLINE_PAGE);
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await getCurrentCache();
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await deleteOldCaches();
      await self.clients.claim();

      await notifyClients({
        type: "SW_UPDATED",
        version: CACHE_NAME,
        message: "نسخه جدید برنامه فعال شد",
      });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "GET_VERSION") {
    event.source?.postMessage({
      type: "SW_VERSION",
      version: CACHE_NAME,
    });
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!isSameOrigin(request.url)) {
    event.respondWith(networkOnlyWithOfflineFallback(request));
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirstForHtml(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstCurrentVersionOnly(request));
    return;
  }

  event.respondWith(networkOnlyWithOfflineFallback(request));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  return Promise.resolve();
}

self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "اعلان جدید",
    icon: "/icons/favicon.png",
    badge: "/icons/favicon.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("بدن ساز", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
