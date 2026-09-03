const CACHE_NAME = 'travel-app-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/master_itinerary.json',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => caches.match('/index.html'));
    })
  );
});