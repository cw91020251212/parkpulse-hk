const CACHE_NAME = 'parkpulse-hk-shell-v3';
const OFFLINE_DATA_CACHE_NAME = 'parkpulse-hk-offline-data-v1';
const APP_SHELL = ['./', './manifest.webmanifest', './parkpulse-hk-icon-192.png', './parkpulse-hk-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Cache the hashed assets referenced by this exact release of the app.
    const html = await (await cache.match('./')).text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
      .map((match) => new URL(match[1], self.registration.scope))
      .filter((url) => url.origin === self.location.origin && url.href.startsWith(self.registration.scope))
      .map((url) => url.href);
    if (!assets.length) throw new Error('App shell assets missing');
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== OFFLINE_DATA_CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
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
  // Explicit downloads must reach the network, not return an older cache hit.
  if (request.cache === 'no-store') {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(request.mode === 'navigate' || staticData ? networkFirst(request) : cacheFirst(request));
});
