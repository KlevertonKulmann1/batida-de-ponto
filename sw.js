const CACHE_NAME = 'batida-ponto-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/quadro.png',
  './assets/batida-aberta.png',
  './assets/batida-correta.png',
  './assets/batida-faltando.png',
  './assets/marcado.png',
  './assets/nao-marcado.png',
  './assets/box-btn.png',
  './assets/clock-icon.png',
  './assets/icon-sound.png',
  './assets/icon-log.png',
  './assets/icon-settings.png',
  './assets/icon-save.png',
  './assets/icon-download.png',
  './assets/icon-copy.png',
  './assets/icon-folder.png',
  './assets/icon-trash.png',
  './assets/btn-x.png',
  './assets/btn-x-ativo.png',
  './assets/label-left.png',
  './assets/label-center.png',
  './assets/label-right.png',
  './assets/btn-fourthiary-left.png',
  './assets/btn-fourthiary-center.png',
  './assets/btn-fourthiary-right.png',
  './assets/btn-fourthiary-left-active.png',
  './assets/btn-fourthiary-center-active.png',
  './assets/btn-fourthiary-right-active.png',
  './assets/btn-tertiary-left.png',
  './assets/btn-tertiary-center.png',
  './assets/btn-tertiary-right.png',
  './assets/btn-tertiary-left-active.png',
  './assets/btn-tertiary-center-active.png',
  './assets/btn-tertiary-right-active.png',
  './assets/btn-secondary-left.png',
  './assets/btn-secondary-center.png',
  './assets/btn-secondary-right.png',
  './assets/btn-secondary-left-active.png',
  './assets/btn-secondary-center-active.png',
  './assets/btn-secondary-right-active.png',
  './assets/btn-primary-left.png',
  './assets/btn-primary-center.png',
  './assets/btn-primary-right.png',
  './assets/btn-primary-left-active.png',
  './assets/btn-primary-center-active.png',
  './assets/btn-primary-right-active.png',
  './assets/btn-disabled-left.png',
  './assets/btn-disabled-center.png',
  './assets/btn-disabled-right.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Fallback para cache quando offline
        return caches.match('./index.html');
      });
    })
  );
});

