const CACHE_NAME = 'batida-ponto-v15';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/fonts/Lalezar-Regular.ttf',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/icon-reload.png',
  './assets/icon-install.png',
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

// ==========================================
// Notificações Push & Ações Interativas
// ==========================================

self.addEventListener('push', (event) => {
  let data = {
    title: 'Hora de Bater o Ponto! ⏰',
    body: 'Lembrete automático para registrar seu ponto.',
    url: './index.html?punch=1'
  };

  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: 'ponto-push-alert',
    renotify: true,
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'punch', title: '⚡ Bater Ponto' },
      { action: 'open', title: 'Abrir App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  let targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : './index.html';

  if (action === 'punch' && !targetUrl.includes('punch=')) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'punch=1';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (action === 'punch') {
            client.postMessage({ action: 'quickPunch' });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

