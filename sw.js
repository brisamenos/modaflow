const CACHE_NAME = 'modaflow-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './pdv.js',
  './dashboard.js',
  './whatsapp.js',
  './effects.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache aberto');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    // Estratégia Network First (Sempre tenta pegar o arquivo novo da rede primeiro)
    fetch(event.request).catch(() => {
      // Se falhar (offline), aí sim usa o cache
      return caches.match(event.request);
    })
  );
});
