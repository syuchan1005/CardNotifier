/// <reference lib="WebWorker" />

import { PushManager } from '@remix-pwa/push/client';

export { };

declare let self: ServiceWorkerGlobalScope;

new PushManager({
  handlePushEvent: (event) => {
    // Handle incoming push event
    console.log('Push event received:', event);
    const notification = event.data?.json();
    event.waitUntil(self.registration.showNotification(notification.title, notification.options));
  },
});

self.addEventListener('install', event => {
  console.log('Service worker installed');

  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('Service worker activated');

  event.waitUntil(self.clients.claim());
});
