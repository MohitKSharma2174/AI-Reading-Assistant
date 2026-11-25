const CACHE_NAME = 'aarc-cache-v2';
const ASSETS_TO_CACHE = ['/', '/icon.svg'];

function isCacheableResponse(response) {
  return Boolean(
    response &&
      response.ok &&
      response.status === 200 &&
      !response.redirected &&
      response.type === 'basic'
  );
}

// Install Event - Pre-cache safe shell assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS_TO_CACHE.map((assetUrl) =>
          fetch(assetUrl, { credentials: 'same-origin' })
            .then((response) => {
              if (isCacheableResponse(response)) {
                return cache.put(assetUrl, response);
              }
              return undefined;
            })
            .catch(() => undefined)
        )
      )
    )
  );
});

// Activate Event - Remove old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Safe Network-First for navigations; bypass non-GET, API, manifest, and cross-origin
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore all non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Ignore non-HTTP(S) schemes and all cross-origin / external backend requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  if (url.origin !== self.location.origin) {
    return;
  }

  // Bypass Next.js internals, HMR, RSC payloads, /api/ routes, and /manifest.json
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/__next') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/api' ||
    url.pathname === '/manifest.json' ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('webpack-hmr') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1'
  ) {
    return;
  }

  // Safe Network-First strategy for page navigations (/dashboard, /login, /article/*, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (isCacheableResponse(networkResponse)) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const cachedRoot = await caches.match('/');
          if (cachedRoot) {
            return cachedRoot;
          }
          return new Response('Offline — please reconnect to load this page.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for remaining same-origin static assets (e.g. /icon.svg, /favicon.ico)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (isCacheableResponse(networkResponse)) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || networkFetch;
    })
  );
});
