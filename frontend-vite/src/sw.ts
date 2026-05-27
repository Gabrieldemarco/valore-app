/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  /^https?:\/\/.*\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
    ],
    networkTimeoutSeconds: 5,
  })
);

registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|woff2)$/,
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
    self.registration.showNotification(data.title || 'Veloré', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'velore-notification',
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
  event.waitUntil(self.clients.claim());
});
