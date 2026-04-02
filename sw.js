const CACHE_NAME = 'modaflow-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './pdv.js',
  './dashboard.js',
  './whatsapp.js',
  './effects.js'
  // icon-192.png e icon-512.png devem ser incluídos aqui quando existirem
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache aberto');
      return cache.addAll(ASSETS);
    })
  );
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
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Retorna do cache, senão busca na rede
      return response || fetch(event.request);
    }).catch(() => {
      // Aqui pode-se retornar uma página offline fallback
    })
  );
});
