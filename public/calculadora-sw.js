// Service Worker Dedicado para a Calculadora CAST 1 - Manupackaging
const CACHE_NAME = 'calculadora-cast1-v1';
const ASSETS_TO_CACHE = [
  '/calculadora.html',
  '/calculadora/',
  '/calculadora-manifest.json',
  '/calculadora-192.png',
  '/calculadora-512.png',
  '/calculadora-maskable-512.png',
  '/apple-touch-icon-calculadora.png',
  '/calculadora-icon.svg',
  'https://cdn.tailwindcss.com',
  'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Falha ao armazenar alguns assets em cache na instalação:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna do cache e atualiza em background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback para calculadora offline se navegar
        if (event.request.mode === 'navigate') {
          return caches.match('/calculadora.html');
        }
      });
    })
  );
});
