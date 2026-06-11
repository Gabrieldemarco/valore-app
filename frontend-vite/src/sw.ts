/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          const cache = await caches.open('navigations');
          cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return cached || fetch(event.request);
        }
      })()
    );
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  /^https?:\/\/.*\/api\/.*/i,
  new NetworkOnly()
);

registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|woff2|ico)$/,
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'Velsoie', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'velsoie-notification',
      data: { url: data.url || '/' },
    });
  } catch { /* ignore malformed push */ }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const matchingClient = clients.find(c => c.url === url && 'focus' in c);
      if (matchingClient) {
        matchingClient.focus();
      } else if (clients.length > 0) {
        clients[0].navigate(url);
        clients[0].focus();
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== 'navigations' && name !== 'api-cache' && name !== 'static-assets')
          .map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});
