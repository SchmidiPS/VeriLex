const CACHE_VERSION = 'verilex-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './dashboard.html',
  './compliance-checklist.html',
  './risk-monitor.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/auth-utils.js',
  './assets/js/dashboard.js',
  './assets/js/compliance-checklist.js',
  './assets/js/risk-monitor.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clonedResponse));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
