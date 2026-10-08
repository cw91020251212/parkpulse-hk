const CACHE_NAME = 'parkpulse-hk-shell-v1';
const APP_SHELL = ['./', './manifest.webmanifest', './parkpulse-hk-icon-192.png', './parkpulse-hk-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) ?? caches.match('./');
  }
}

async function cacheFirst(request) {
  return (await caches.match(request)) ?? fetch(request).then(async (response) => {
    if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
    return response;
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const staticData = url.pathname.includes('/pages-data/');
  event.respondWith(request.mode === 'navigate' || staticData ? networkFirst(request) : cacheFirst(request));
});
