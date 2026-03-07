const CACHE_NAME = 'ptt-english-v2'; // Mudei para v2 para limpar o erro antigo
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles.css',
  '/app.js',
  '/icones/icon-192.png',
  '/icones/icon-512.png'
];

// Install - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cacheando assets locais...');
      // Usamos o catch aqui para garantir que não trava o processo
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.error('⚠️ Aviso ao fazer cache inicial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Ignora chamadas de API ou extensões do Chrome
  if (!event.request.url.startsWith('http') || event.request.url.includes('/api/')) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Cacheia novas requisições em background
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return fetchResponse;
      });
    }).catch(() => {
      // Se estiver offline e pedir uma página html, devolve o index
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});