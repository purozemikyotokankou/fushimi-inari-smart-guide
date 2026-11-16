/* Fushimi Inari Smart Guide — offline support (v140) */
'use strict';

const CACHE_NAME = 'fushimi-smart-guide-v140';
const CACHE_PREFIX = 'fushimi-smart-guide-';
const WORKER_VERSION = 140;
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
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'FUSHIMI_SW_ACTIVE', version: WORKER_VERSION }));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FUSHIMI_GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: WORKER_VERSION });
  }
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

  // Browsers commonly request MP4 video in byte ranges. Return a valid 206
  // response from the complete cached file so the home hero can seek/play offline.
  if (sameOrigin && url.pathname.endsWith('.mp4') && request.headers.has('range')) {
    event.respondWith((async () => {
      const cached = await caches.match(new URL(request.url).href, { ignoreSearch: true });
      if (!cached) {
        try { return await fetch(request); } catch (_) { return Response.error(); }
      }
      const blob = await cached.blob();
      const rangeHeader = request.headers.get('range') || '';
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
      if (!match) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
      }
      let start = match[1] ? Number(match[1]) : NaN;
      let end = match[2] ? Number(match[2]) : NaN;
      if (Number.isNaN(start)) {
        const suffixLength = end;
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
        }
        start = Math.max(0, blob.size - suffixLength);
        end = blob.size - 1;
      } else if (Number.isNaN(end)) {
        end = blob.size - 1;
      }
      if (start < 0 || start >= blob.size || end < start) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
      }
      end = Math.min(end, blob.size - 1);
      const part = blob.slice(start, end + 1);
      return new Response(part, {
        status: 206,
        headers: {
          'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
          'Content-Length': String(part.size),
          'Content-Range': `bytes ${start}-${end}/${blob.size}`,
          'Accept-Ranges': 'bytes'
        }
      });
    })());
    return;
  }

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
          timer = setTimeout(() => reject(new Error('navigation timeout')), 1200);
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

  // Cached JSON is returned immediately so a weak connection cannot stall the map.
  // The cache is refreshed in the background for the next visit.
  if (url.pathname.endsWith('.json')) {
    const cachedPromise = matchCached(request);
    const backgroundRefresh = cachedPromise.then(async (cached) => {
      if (!cached) return;
      const cache = await cachePromise;
      const response = await fetch(request);
      if (response && response.ok) {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
    }).catch(() => {});
    event.waitUntil(backgroundRefresh);
    event.respondWith((async () => {
      const cached = await cachedPromise;
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await cachePromise;
          try { await cache.put(request, response.clone()); } catch (_) {}
        }
        return response;
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  // For the language-screen photo preloader, let app-boot inspect the image
  // size before deciding whether to cache it. This avoids silently downloading
  // and caching multi-megabyte originals during the first launch.
  const isPreloadImage = url.searchParams.get('__fushimi_preload') === 'v140'
    && /\.(?:jpe?g|png|webp|avif)$/i.test(url.pathname);
  if (sameOrigin && isPreloadImage) {
    event.respondWith((async () => {
      const cached = await matchCached(request);
      if (cached) return cached;
      try { return await fetch(request); } catch (_) { return Response.error(); }
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
