const CACHE_NAME = 'ai-reader-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

// Install Event - Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
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
// Fetch Event - Handle Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass Next.js internal files, hot-reloads, and dev server sockets
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/__next') || 
    url.pathname.includes('hot-update') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return;
  }

  // Apply Network-First strategy to FastAPI backend API endpoints
  if (url.port === '8000' && url.pathname.includes('/api/v1/articles')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful response, save to cache
          if (response.status === 200 || response.status === 201) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, fall back to cached response
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback JSON for offline details
            return new Response(
              JSON.stringify({
                detail: "You are offline, and this article content is not cached yet."
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
  } else {
    // Apply Stale-While-Revalidate to static resources (CSS, JS, Fonts, Images)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update the cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {}); // Ignore background updates failure
          
          return cachedResponse;
        }
        return fetch(request);
      })
    );
  }
});
