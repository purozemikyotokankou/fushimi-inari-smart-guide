/* Fushimi Inari Smart Guide — offline support (v129) */
'use strict';

const CACHE_NAME = 'fushimi-smart-guide-v129';
const CACHE_PREFIX = 'fushimi-smart-guide-';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet/dist/leaflet.css'
];

self.addEventListener('install', (event) => {
  // The index page performs the measured pre-cache while the visitor sees
  // the language screen. Keep installation itself quick and reliable.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function matchCached(request) {
  return caches.match(request, { ignoreSearch: true });
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    try { await cache.put(request, response.clone()); } catch (_) { /* quota or opaque restrictions */ }
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const cachePromise = caches.open(CACHE_NAME);

  // Only the Leaflet library is cached cross-origin. CARTO/OSM map tiles and
  // live weather endpoints are deliberately left to their providers.
  if (!sameOrigin) {
    if (!CDN_ASSETS.includes(url.href)) return;
    event.respondWith((async () => {
      const cached = await matchCached(request);
      if (cached) return cached;
      try {
        const cache = await cachePromise;
        return await fetchAndCache(request, cache);
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  // App pages: try the network briefly, then fall back to the saved page.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await matchCached(request);
      const cache = await cachePromise;
      let timer;
      try {
        const network = fetch(request).then(async (response) => {
          if (response && response.ok) {
            try { await cache.put(request, response.clone()); } catch (_) {}
            return response;
          }
          return cached || response;
        });
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('navigation timeout')), 3500);
        });
        const response = await Promise.race([network, timeout]);
        clearTimeout(timer);
        return response;
      } catch (_) {
        clearTimeout(timer);
        return cached || await matchCached(new URL('./index.html', self.registration.scope).href) || Response.error();
      }
    })());
    return;
  }

  // JSON should be fresh when online, but remain usable without a connection.
  if (url.pathname.endsWith('.json')) {
    event.respondWith((async () => {
      const cached = await matchCached(request);
      const cache = await cachePromise;
      try {
        const network = fetch(request).then(async (response) => {
          if (response && response.ok) {
            try { await cache.put(request, response.clone()); } catch (_) {}
            return response;
          }
          return cached || response;
        });
        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('data timeout')), 3000);
        });
        const response = await Promise.race([network, timeout]);
        clearTimeout(timer);
        return response;
      } catch (_) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Local styles, scripts, icons and images: serve saved files immediately.
  // The app's next version changes CACHE_NAME, so this cache-first strategy
  // does not leave an older app shell stuck after an update.
  event.respondWith((async () => {
    const cached = await matchCached(request);
    if (cached) return cached;
    try {
      const cache = await cachePromise;
      return await fetchAndCache(request, cache);
    } catch (_) {
      return Response.error();
    }
  })());
});
