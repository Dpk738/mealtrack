const CACHE_NAME = 'nutritrack-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Service worker caching failed on install:', err);
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Do not intercept external API requests to Google Gemini
  if (e.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Network-First Strategy to ensure users always see the latest hosted version when online
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Cache new local static assets dynamically on request
        if (
          e.request.method === 'GET' &&
          networkResponse.status === 200 &&
          (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.googleapis.com'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
